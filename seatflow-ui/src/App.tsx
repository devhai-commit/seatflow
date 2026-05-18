import { useState, useCallback, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type {
  Student, SeatingChart, ViewMode, GroupSettings, Group,
  ArrangementMode, Row, Table, ActiveTab, SeatingHistoryEntry, Classroom,
} from './types';
import LoginPage from './components/LoginPage';
import NavBar from './components/NavBar';
import SeatingChartPage from './components/SeatingChartPage';
import PriorityStudentsPage from './components/PriorityStudentsPage';
import StudentManagerPage from './components/StudentManagerPage';
import HelpModal from './components/HelpModal';
import { api, setClassroomId } from './apiClient';
import type { StudentRow } from './apiClient';

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const calculateShortNames = (students: Student[]): Student[] => {
  const shortNameCounts = new Map<string, number>();
  students.forEach(s => {
    const nameParts = s.fullName.trim().split(' ');
    const base = nameParts[nameParts.length - 1];
    shortNameCounts.set(base, (shortNameCounts.get(base) || 0) + 1);
  });

  const assignedCounts = new Map<string, number>();
  return students.map(student => {
    const nameParts = student.fullName.trim().split(' ');
    const base = nameParts[nameParts.length - 1];
    const total = shortNameCounts.get(base) || 0;
    if (total > 1) {
      const assigned = assignedCounts.get(base) || 0;
      assignedCounts.set(base, assigned + 1);
      return { ...student, shortName: `${base} ${String.fromCharCode(64 + assigned + 1)}` };
    }
    return { ...student, shortName: base };
  });
};

function mapStudentRow(s: StudentRow): Student {
  return {
    id: s.id,
    fullName: s.full_name,
    shortName: s.short_name || '',
    studentCode: s.student_code ?? undefined,
    currentSeatAssignedTimestamp: s.current_seat_assigned_timestamp !== null
      ? Number(s.current_seat_assigned_timestamp) : null,
    parentPhone: s.parent_phone ?? undefined,
    address: s.address ?? undefined,
    weight: s.weight ?? undefined,
    height: s.height ?? undefined,
    isNearsighted: s.is_nearsighted ?? undefined,
    isSpecialNeeds: s.is_special_needs ?? undefined,
    avatarUrl: s.avatar_url ?? undefined,
    behaviorRecords: (s.behavior_records || []).map(br => ({
      ...br,
      timestamp: Number(br.timestamp),
    })) as Student['behaviorRecords'],
  };
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('seatflow_isLoggedIn') === 'true';
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('chart');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Classrooms
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<number>(() => {
    return parseInt(localStorage.getItem('seatflow_classroomId') || '1');
  });

  // Settings & Data
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(5);
  const [seatsPerTable, setSeatsPerTable] = useState(2);
  const [students, setStudents] = useState<Student[]>([]);
  const [seatingChart, setSeatingChart] = useState<SeatingChart>([]);

  // UI
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [rotation, setRotation] = useState({ x: 55, y: 0 });

  // Grouping
  const [groupSettings, setGroupSettings] = useState<GroupSettings>({
    enabled: false,
    groupSizes: [4, 4, 4],
    arrangement: 'horizontal',
  });
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupLeaders, setGroupLeaders] = useState<Map<number, string>>(new Map());

  // Class name
  const [className, setClassName] = useState('');

  // Arrangement mode
  const [arrangementMode, setArrangementMode] = useState<ArrangementMode>('automatic');

  // Seating history
  const [seatingHistory, setSeatingHistory] = useState<SeatingHistoryEntry[]>([]);

  // Active drag id for overlay
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // --- Auth ---
  const handleLogin = (remembered: boolean) => {
    setIsLoggedIn(true);
    if (remembered) {
      localStorage.setItem('seatflow_isLoggedIn', 'true');
    } else {
      localStorage.removeItem('seatflow_isLoggedIn');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('seatflow_isLoggedIn');
  };

  const saveAppSettings = useCallback(async (updates: Record<string, unknown>) => {
    try {
      await api.saveSettings(updates);
    } catch (err) {
      console.error('Exception saving settings:', err);
    }
  }, []);

  // --- Load classrooms ---
  useEffect(() => {
    if (!isLoggedIn) return;
    api.getClassrooms().then(rows => {
      const mapped: Classroom[] = rows.map(r => ({
        id: r.id,
        name: r.name,
        grade: r.grade,
        school_year: r.school_year,
        created_at: r.created_at,
      }));
      setClassrooms(mapped);
      // If saved classroom no longer exists, fall back to first
      if (mapped.length > 0 && !mapped.find(c => c.id === selectedClassroomId)) {
        setSelectedClassroomId(mapped[0].id);
      }
    }).catch(err => console.error('Error loading classrooms:', err));
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Load classroom data when selection changes ---
  useEffect(() => {
    if (!isLoggedIn || !selectedClassroomId) return;

    setClassroomId(selectedClassroomId);
    localStorage.setItem('seatflow_classroomId', String(selectedClassroomId));

    const fetchData = async () => {
      setIsLoading(true);
      // Reset current data before loading new classroom
      setSeatingChart([]);
      setStudents([]);
      setGroups([]);
      setGroupLeaders(new Map());
      setClassName('');
      setSeatingHistory([]);

      try {
        const settings = await api.getSettings();
        if (settings && Object.keys(settings).length > 0) {
          if (settings.rows) setRows(settings.rows as number);
          if (settings.cols) setCols(settings.cols as number);
          if (settings.seats_per_table) setSeatsPerTable(settings.seats_per_table as number);

          if (settings.seating_chart) setSeatingChart(settings.seating_chart as SeatingChart);
          if (settings.group_settings) setGroupSettings(settings.group_settings as GroupSettings);
          if (settings.groups_data) setGroups(settings.groups_data as Group[]);
          if (settings.group_leaders) {
            try {
              const entries = Array.isArray(settings.group_leaders)
                ? settings.group_leaders
                : Object.entries(settings.group_leaders as object);
              setGroupLeaders(new Map((entries as unknown[][]).map(e => [Number(e[0]), e[1] as string])));
            } catch (e) {
              console.error('Error parsing group leaders', e);
            }
          }
          if (settings.arrangement_mode) setArrangementMode(settings.arrangement_mode as ArrangementMode);
          if (settings.class_name) setClassName(settings.class_name as string);
        }

        try {
          const historyData = await api.getSeatingHistory();
          setSeatingHistory(historyData);
        } catch { /* non-critical */ }

        const studentsData = await api.getStudents();
        if (studentsData) {
          setStudents(calculateShortNames(studentsData.map(mapStudentRow)));
        }
      } catch (error) {
        console.error('Unexpected error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isLoggedIn, selectedClassroomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Auto-save settings ---
  useEffect(() => {
    if (isLoading || !isLoggedIn) return;
    const timer = setTimeout(() => {
      saveAppSettings({ rows, cols, seats_per_table: seatsPerTable, group_settings: groupSettings });
    }, 1000);
    return () => clearTimeout(timer);
  }, [rows, cols, seatsPerTable, groupSettings, isLoading, saveAppSettings, isLoggedIn]);

  // --- Classroom management ---
  const handleSelectClassroom = useCallback((id: number) => {
    setSelectedClassroomId(id);
  }, []);

  const handleCreateClassroom = useCallback(async (name: string, grade?: string, schoolYear?: string) => {
    try {
      const row = await api.createClassroom({ name, grade, school_year: schoolYear });
      const newClassroom: Classroom = {
        id: row.id,
        name: row.name,
        grade: row.grade,
        school_year: row.school_year,
        created_at: row.created_at,
      };
      setClassrooms(prev => [...prev, newClassroom]);
      setSelectedClassroomId(row.id);
    } catch (err) {
      console.error('Error creating classroom:', err);
      alert('Không thể tạo lớp học mới.');
    }
  }, []);

  const handleUpdateClassroom = useCallback(async (id: number, name: string, grade?: string, schoolYear?: string) => {
    try {
      await api.updateClassroom(id, { name, grade, school_year: schoolYear });
      setClassrooms(prev => prev.map(c =>
        c.id === id ? { ...c, name, grade: grade ?? null, school_year: schoolYear ?? null } : c
      ));
      if (id === selectedClassroomId) setClassName(name);
    } catch (err) {
      console.error('Error updating classroom:', err);
      alert('Không thể cập nhật lớp học.');
    }
  }, [selectedClassroomId]);

  const handleDeleteClassroom = useCallback(async (id: number) => {
    try {
      await api.deleteClassroom(id);
      const remaining = classrooms.filter(c => c.id !== id);
      setClassrooms(remaining);
      if (id === selectedClassroomId && remaining.length > 0) {
        setSelectedClassroomId(remaining[0].id);
      }
    } catch (err) {
      console.error('Error deleting classroom:', err);
      alert('Không thể xóa lớp học.');
    }
  }, [classrooms, selectedClassroomId]);

  // --- Rows/cols auto-adjust ---
  const handleRowsChange = useCallback((newRows: number) => {
    if (newRows < 1) return;
    const target = students.length > 0 ? students.length : rows * cols * seatsPerTable;
    const newCols = seatsPerTable > 0 ? Math.max(1, Math.ceil(target / (newRows * seatsPerTable))) : cols;
    setRows(newRows);
    setCols(newCols);
  }, [students.length, rows, cols, seatsPerTable]);

  const handleColsChange = useCallback((newCols: number) => {
    if (newCols < 1) return;
    const target = students.length > 0 ? students.length : rows * cols * seatsPerTable;
    const newRows = seatsPerTable > 0 ? Math.max(1, Math.ceil(target / (newCols * seatsPerTable))) : rows;
    setCols(newCols);
    setRows(newRows);
  }, [students.length, rows, cols, seatsPerTable]);

  // --- Single student update ---
  const handleUpdateSingleStudent = useCallback(async (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    setSeatingChart(prev =>
      prev.map(row =>
        row.map(table =>
          table.map(s => s.id === updatedStudent.id ? updatedStudent : s)
        )
      )
    );

    try {
      await api.updateStudent(updatedStudent.id, {
        student_code: updatedStudent.studentCode ?? null,
        parent_phone: updatedStudent.parentPhone,
        address: updatedStudent.address,
        weight: updatedStudent.weight,
        height: updatedStudent.height,
        is_nearsighted: updatedStudent.isNearsighted,
        is_special_needs: updatedStudent.isSpecialNeeds,
      });
    } catch (e) {
      console.error('Error saving student profile', e);
    }
  }, []);

  const handleSyncStudents = useCallback(async (names: string[]) => {
    try {
      const studentsData = await api.syncStudents(names);
      setStudents(calculateShortNames(studentsData.map(mapStudentRow)));
    } catch (err) {
      console.error('Lỗi đồng bộ danh sách:', err);
      throw err;
    }
  }, []);

  const handleDeleteStudentsBatch = useCallback(async (ids: string[]) => {
    await api.deleteStudentsBatch(ids);
    setStudents(prev => prev.filter(s => !ids.includes(s.id)));
    setSeatingChart(prev =>
      prev.map(row =>
        row.map(table => table.filter(s => !ids.includes(s.id)))
      )
    );
  }, []);

  const handleClassNameChange = useCallback(async (name: string) => {
    setClassName(name);
    await api.saveSettings({ class_name: name });
    // Sync local classroom list
    setClassrooms(prev => prev.map(c => c.id === selectedClassroomId ? { ...c, name } : c));
  }, [selectedClassroomId]);

  const handleRefreshStudents = useCallback(async () => {
    try {
      const studentsData = await api.getStudents();
      setStudents(calculateShortNames(studentsData.map(mapStudentRow)));
    } catch (err) {
      console.error('Lỗi tải danh sách học sinh:', err);
    }
  }, []);

  const saveToHistory = useCallback(async (chart: SeatingChart, note: string) => {
    const snapshot = chart.map(row => row.map(table => table.map(s => s.id)));
    const created_at = Date.now();
    try {
      const saved = await api.saveSeatingHistory({
        snapshot,
        rows_count: chart.length,
        cols_count: chart[0]?.length ?? 0,
        created_at,
        note,
      });
      setSeatingHistory(prev => [
        { id: saved.id, snapshot, rows_count: chart.length, cols_count: chart[0]?.length ?? 0, created_at, note },
        ...prev.slice(0, 29),
      ]);
    } catch { /* non-critical */ }
  }, []);

  const handleRestoreHistory = useCallback((entry: SeatingHistoryEntry) => {
    const studentMap = new Map(students.map(s => [s.id, s]));
    const restoredChart: SeatingChart = entry.snapshot.map(row =>
      row.map(table =>
        table.map(id => (id ? studentMap.get(id) : undefined)).filter((s): s is Student => s !== undefined)
      )
    );
    setSeatingChart(restoredChart);
    setArrangementMode('manual');
    saveAppSettings({ seating_chart: restoredChart, arrangement_mode: 'manual' });
  }, [students, saveAppSettings]);

  const handleSetArrangementMode = useCallback((mode: ArrangementMode) => {
    setArrangementMode(mode);
    saveAppSettings({ arrangement_mode: mode });
  }, [saveAppSettings]);

  // --- Grouping ---
  const handleApplyGrouping = useCallback((currentChart?: SeatingChart, force = false) => {
    if (!force && arrangementMode === 'manual') {
      alert('Không thể chia tổ ở chế độ sắp xếp thủ công. Vui lòng chuyển sang chế độ Tự động.');
      return;
    }
    const chartToUse = currentChart || seatingChart;
    if (chartToUse.length === 0) {
      alert('Vui lòng sắp xếp lớp học trước khi chia tổ.');
      return;
    }

    const { groupSizes, arrangement } = groupSettings;
    const newGroups: Group[] = [];
    const allTableCoords: { rowIndex: number; colIndex: number }[] = [];

    const chartRows = chartToUse.length;
    const chartCols = chartToUse[0]?.length ?? cols;

    for (let r = 0; r < chartRows; r++) {
      for (let c = 0; c < chartCols; c++) {
        allTableCoords.push({ rowIndex: r, colIndex: c });
      }
    }

    if (arrangement === 'cluster') {
      const isGrouped = Array(chartRows).fill(null).map(() => Array(chartCols).fill(false));
      for (let r = 0; r < chartRows - 1; r++) {
        for (let c = 0; c < chartCols - 1; c++) {
          if (!isGrouped[r][c] && !isGrouped[r][c + 1] && !isGrouped[r + 1][c] && !isGrouped[r + 1][c + 1]) {
            newGroups.push([
              { rowIndex: r, colIndex: c },
              { rowIndex: r, colIndex: c + 1 },
              { rowIndex: r + 1, colIndex: c },
              { rowIndex: r + 1, colIndex: c + 1 },
            ]);
            isGrouped[r][c] = true; isGrouped[r][c + 1] = true;
            isGrouped[r + 1][c] = true; isGrouped[r + 1][c + 1] = true;
          }
        }
      }
      const remainingTables: Group = [];
      for (let r = 0; r < chartRows; r++) {
        for (let c = 0; c < chartCols; c++) {
          if (!isGrouped[r][c]) remainingTables.push({ rowIndex: r, colIndex: c });
        }
      }
      if (remainingTables.length > 0) newGroups.push(remainingTables);
    } else {
      let orderedCoords: { rowIndex: number; colIndex: number }[] = [];
      if (arrangement === 'vertical') {
        for (let c = 0; c < chartCols; c++) {
          for (let r = 0; r < chartRows; r++) orderedCoords.push({ rowIndex: r, colIndex: c });
        }
      } else {
        orderedCoords = allTableCoords;
      }

      let currentIndex = 0;
      for (const size of groupSizes) {
        if (currentIndex >= orderedCoords.length || size <= 0) continue;
        const group = orderedCoords.slice(currentIndex, currentIndex + size);
        if (group.length > 0) newGroups.push(group);
        currentIndex += size;
      }
    }

    setGroups(newGroups);
    setGroupLeaders(new Map());
    // Save groups_data, group_leaders, AND group_settings together
    saveAppSettings({ groups_data: newGroups, group_leaders: {}, group_settings: groupSettings });
  }, [seatingChart, cols, groupSettings, arrangementMode, saveAppSettings]);

  // --- Initial arrangement ---
  const handleInitialArrangement = useCallback(async () => {
    if (students.length === 0) {
      alert('Vui lòng nhập danh sách học sinh trước.');
      return;
    }

    const timestamp = Date.now();

    const specialNeeds = students.filter(s => s.isSpecialNeeds);
    const priorityHealth = students.filter(s => {
      if (s.isSpecialNeeds) return false;
      const isShort = s.height && parseInt(s.height) < 135;
      return s.isNearsighted || isShort;
    });
    const normalStudents = students.filter(s => {
      if (s.isSpecialNeeds) return false;
      const isShort = s.height && parseInt(s.height) < 135;
      return !s.isNearsighted && !isShort;
    });

    const sortedStudents = [
      ...shuffleArray(specialNeeds),
      ...shuffleArray(priorityHealth),
      ...shuffleArray(normalStudents),
    ];

    const newChart: SeatingChart = [];
    let studentIndex = 0;

    const requiredRows = Math.ceil(sortedStudents.length / (cols * seatsPerTable));
    const actualRows = Math.max(rows, requiredRows);
    if (actualRows !== rows) setRows(actualRows);

    for (let i = 0; i < actualRows; i++) {
      const newRow: (Student[])[] = [];
      for (let j = 0; j < cols; j++) {
        const newTable: Student[] = [];
        for (let k = 0; k < seatsPerTable; k++) {
          if (studentIndex < sortedStudents.length) {
            newTable.push(sortedStudents[studentIndex++]);
          }
        }
        newRow.push(newTable);
      }
      newChart.push(newRow);
    }

    const flatStudents: Student[] = [];
    newChart.forEach(row => row.forEach(table => table.forEach(s => flatStudents.push(s))));
    const seatedIds = new Set(flatStudents.map(s => s.id));

    const updatedStudents = students.map(student =>
      seatedIds.has(student.id)
        ? { ...student, currentSeatAssignedTimestamp: timestamp }
        : { ...student, currentSeatAssignedTimestamp: null }
    );
    const updatedStudentMap = new Map(updatedStudents.map(s => [s.id, s]));

    const finalChart = newChart.map(row =>
      row.map(table => table.map(student => updatedStudentMap.get(student.id)!))
    );

    setStudents(updatedStudents);
    setSeatingChart(finalChart);
    setArrangementMode('automatic');

    await saveAppSettings({ seating_chart: finalChart, arrangement_mode: 'automatic' });
    await saveToHistory(finalChart, 'Sắp xếp ban đầu');

    if (groupSettings.enabled) handleApplyGrouping(finalChart, true);
  }, [students, rows, cols, seatsPerTable, groupSettings.enabled, handleApplyGrouping, saveAppSettings, saveToHistory]);

  // --- Rotate seats ---
  const handleRotateSeats = useCallback(async () => {
    if (seatingChart.length === 0) {
      alert('Sơ đồ lớp chưa có học sinh. Vui lòng sắp xếp ban đầu trước.');
      return;
    }

    const timestamp = Date.now();
    const placedIds = new Set<string>();
    const currentSeated: Student[] = [];
    seatingChart.forEach(row =>
      row.forEach(table =>
        table.forEach(s => {
          const latest = students.find(st => st.id === s.id) || s;
          currentSeated.push(latest);
          placedIds.add(s.id);
        })
      )
    );
    students.forEach(s => {
      if (!placedIds.has(s.id)) currentSeated.push(s);
    });

    const poolSpecial: Student[] = [];
    const poolPriority: Student[] = [];
    const poolNormal: Student[] = [];

    currentSeated.forEach(s => {
      if (s.isSpecialNeeds) {
        poolSpecial.push(s);
      } else {
        const isShort = s.height ? parseInt(s.height) < 135 : false;
        if (s.isNearsighted || isShort) {
          poolPriority.push(s);
        } else {
          poolNormal.push(s);
        }
      }
    });

    const rotateChunkSize = Math.max(1, cols * seatsPerTable);
    let rotatedNormal: Student[] = [];
    if (poolNormal.length > 0) {
      const actualShift = rotateChunkSize % poolNormal.length;
      rotatedNormal = [...poolNormal.slice(actualShift), ...poolNormal.slice(0, actualShift)];
    }

    const fillQueue = [...shuffleArray(poolSpecial), ...shuffleArray(poolPriority), ...rotatedNormal];

    const newChart: SeatingChart = [];
    let queueIndex = 0;

    const requiredRows = Math.ceil(fillQueue.length / (cols * seatsPerTable));
    const actualRows = Math.max(rows, requiredRows);
    if (actualRows !== rows) setRows(actualRows);

    for (let r = 0; r < actualRows; r++) {
      const newRow: Row = [];
      for (let c = 0; c < cols; c++) {
        const newTable: Table = [];
        for (let s = 0; s < seatsPerTable; s++) {
          if (queueIndex < fillQueue.length) newTable.push(fillQueue[queueIndex++]);
        }
        newRow.push(newTable);
      }
      newChart.push(newRow);
    }

    const flatFinal: Student[] = [];
    newChart.forEach(row => row.forEach(table => table.forEach(s => flatFinal.push(s))));
    const seatedIds = new Set(flatFinal.map(s => s.id));

    const updatedStudents = students.map(student =>
      seatedIds.has(student.id)
        ? { ...student, currentSeatAssignedTimestamp: timestamp }
        : student
    );
    const updatedMap = new Map(updatedStudents.map(s => [s.id, s]));
    const finalChart = newChart.map(row =>
      row.map(table => table.map(student => updatedMap.get(student.id)!))
    );

    setStudents(updatedStudents);
    setSeatingChart(finalChart);
    setArrangementMode('automatic');

    await saveAppSettings({ seating_chart: finalChart, arrangement_mode: 'automatic' });
    await saveToHistory(finalChart, 'Luân chuyển chỗ ngồi');

    if (groupSettings.enabled) handleApplyGrouping(finalChart, true);
  }, [seatingChart, students, groupSettings.enabled, handleApplyGrouping, saveAppSettings, rows, cols, seatsPerTable, saveToHistory]);

  // --- Group leader ---
  const handleSetGroupLeader = useCallback((groupIndex: number, studentId: string) => {
    setGroupLeaders(prev => {
      const newLeaders = new Map(prev);
      newLeaders.set(groupIndex, studentId);
      saveAppSettings({ group_leaders: Array.from(newLeaders.entries()) });
      return newLeaders;
    });
  }, [saveAppSettings]);

  // --- Drag and drop ---
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id.toString());
  }, []);

  const findStudentPosition = (studentId: string) => {
    for (let r = 0; r < seatingChart.length; r++) {
      for (let c = 0; c < seatingChart[r].length; c++) {
        for (let s = 0; s < seatingChart[r][c].length; s++) {
          if (`student-${seatingChart[r][c][s].id}` === studentId) {
            return { r, c, s, student: seatingChart[r][c][s] };
          }
        }
      }
    }
    return null;
  };

  const handleTableDragEnd = (activeId: string, overId: string) => {
    const [, startRow, startCol] = activeId.split('-').map(Number);
    const [, endRow, endCol] = overId.split('-').map(Number);
    const newChart: SeatingChart = JSON.parse(JSON.stringify(seatingChart));
    const temp = newChart[startRow][startCol];
    newChart[startRow][startCol] = newChart[endRow][endCol];
    newChart[endRow][endCol] = temp;
    setSeatingChart(newChart);
    saveAppSettings({ seating_chart: newChart });
  };

  const handleStudentSwap = (activeId: string, overId: string) => {
    const startPos = findStudentPosition(activeId);
    const endPos = findStudentPosition(overId);
    if (startPos && endPos) {
      const newChart: SeatingChart = JSON.parse(JSON.stringify(seatingChart));
      newChart[startPos.r][startPos.c][startPos.s] = endPos.student;
      newChart[endPos.r][endPos.c][endPos.s] = startPos.student;
      setSeatingChart(newChart);
      saveAppSettings({ seating_chart: newChart });
    }
  };

  const handleStudentMoveToTable = (activeId: string, overId: string) => {
    const startPos = findStudentPosition(activeId);
    const [, endRow, endCol] = overId.split('-').map(Number);
    if (startPos && seatingChart[endRow][endCol].length < seatsPerTable) {
      const newChart: SeatingChart = JSON.parse(JSON.stringify(seatingChart));
      newChart[startPos.r][startPos.c].splice(startPos.s, 1);
      newChart[endRow][endCol].push(startPos.student);
      setSeatingChart(newChart);
      saveAppSettings({ seating_chart: newChart });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setArrangementMode('manual');
    saveAppSettings({ arrangement_mode: 'manual' });

    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId.startsWith('table-') && overId.startsWith('table-')) {
      handleTableDragEnd(activeId, overId);
    } else if (activeId.startsWith('student-') && overId.startsWith('student-')) {
      handleStudentSwap(activeId, overId);
    } else if (activeId.startsWith('student-') && overId.startsWith('table-')) {
      handleStudentMoveToTable(activeId, overId);
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ backgroundColor: '#f9f9ff', color: '#777587' }}>
        Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9f9ff' }}>
      <NavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        onHelpClick={() => setIsHelpOpen(true)}
        classrooms={classrooms}
        selectedClassroomId={selectedClassroomId}
        onSelectClassroom={handleSelectClassroom}
        onCreateClassroom={handleCreateClassroom}
        onUpdateClassroom={handleUpdateClassroom}
        onDeleteClassroom={handleDeleteClassroom}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {activeTab === 'chart' && (
          <SeatingChartPage
            rows={rows} setRows={handleRowsChange}
            cols={cols} setCols={handleColsChange}
            seatsPerTable={seatsPerTable} setSeatsPerTable={setSeatsPerTable}
            students={students}
            onInitialArrangement={handleInitialArrangement}
            onRotateSeats={handleRotateSeats}
            groupSettings={groupSettings} setGroupSettings={setGroupSettings}
            onApplyGrouping={() => handleApplyGrouping()}
            arrangementMode={arrangementMode} setArrangementMode={handleSetArrangementMode}
            seatingChart={seatingChart}
            viewMode={viewMode} setViewMode={setViewMode}
            rotation={rotation} setRotation={setRotation}
            groups={groups} groupLeaders={groupLeaders}
            onSetGroupLeader={handleSetGroupLeader}
            seatingHistory={seatingHistory}
            onRestoreHistory={handleRestoreHistory}
          />
        )}
        {activeTab === 'priority' && (
          <PriorityStudentsPage
            students={students}
            onUpdateStudent={handleUpdateSingleStudent}
            onInitialArrangement={handleInitialArrangement}
          />
        )}
        {activeTab === 'manager' && (
          <StudentManagerPage
            students={students}
            onUpdateStudent={handleUpdateSingleStudent}
            onSyncStudents={handleSyncStudents}
            onRefreshStudents={handleRefreshStudents}
            onDeleteStudents={handleDeleteStudentsBatch}
            className={className}
            onClassNameChange={handleClassNameChange}
          />
        )}

        <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeDragId?.startsWith('student-') && (() => {
            const sid = activeDragId.replace('student-', '');
            const student = students.find(s => s.id === sid);
            if (!student) return null;
            return (
              <div style={{
                backgroundColor: '#dbe2fa',
                padding: '6px 12px',
                borderRadius: '8px',
                boxShadow: '0 20px 40px rgba(53,37,205,0.3), 0 6px 12px rgba(0,0,0,0.15)',
                transform: 'rotate(3deg) scale(1.08)',
                fontSize: '12px',
                fontWeight: '600',
                color: '#111c2d',
                cursor: 'grabbing',
                whiteSpace: 'nowrap',
              }}>
                {student.shortName}
              </div>
            );
          })()}
          {activeDragId?.startsWith('table-') && (() => {
            const parts = activeDragId.split('-');
            const row = Number(parts[1]);
            const col = Number(parts[2]);
            const table = seatingChart[row]?.[col] ?? [];
            return (
              <div style={{
                minWidth: '120px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '2px solid #c7c4d8',
                boxShadow: '0 24px 48px rgba(0,0,0,0.25), 0 8px 16px rgba(0,0,0,0.1)',
                padding: '10px 8px 8px',
                transform: 'rotate(-2deg) scale(1.05)',
                cursor: 'grabbing',
              }}>
                {table.length === 0
                  ? <div style={{ width: '80px', height: '36px', backgroundColor: '#f0f3ff', borderRadius: '6px' }} />
                  : table.map(s => (
                    <div key={s.id} style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      marginBottom: '4px',
                      backgroundColor: '#dbe2fa',
                      borderRadius: '6px',
                      color: '#111c2d',
                      fontWeight: '500',
                    }}>
                      {s.shortName}
                    </div>
                  ))
                }
              </div>
            );
          })()}
        </DragOverlay>
      </DndContext>

      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}
    </div>
  );
}

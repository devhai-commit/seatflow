import { useState, useEffect } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Student, SeatingChart, ViewMode, GroupSettings, Group, ArrangementMode, SeatingHistoryEntry } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

const GROUP_COLORS = [
  { border: '#4f46e5', bg: '#e0e7ff', text: '#3730a3', label: 'Tổ 1' },
  { border: '#16a34a', bg: '#dcfce7', text: '#15803d', label: 'Tổ 2' },
  { border: '#d97706', bg: '#fef3c7', text: '#b45309', label: 'Tổ 3' },
  { border: '#dc2626', bg: '#fee2e2', text: '#b91c1c', label: 'Tổ 4' },
  { border: '#7c3aed', bg: '#ede9fe', text: '#5b21b6', label: 'Tổ 5' },
  { border: '#0891b2', bg: '#cffafe', text: '#0e7490', label: 'Tổ 6' },
  { border: '#be185d', bg: '#fce7f3', text: '#9d174d', label: 'Tổ 7' },
  { border: '#065f46', bg: '#d1fae5', text: '#064e3b', label: 'Tổ 8' },
];

interface SeatingChartPageProps {
  rows: number;
  setRows: (v: number) => void;
  cols: number;
  setCols: (v: number) => void;
  seatsPerTable: number;
  setSeatsPerTable: (v: number) => void;
  students: Student[];
  onInitialArrangement: () => void;
  onRotateSeats: () => void;
  groupSettings: GroupSettings;
  setGroupSettings: (v: GroupSettings) => void;
  onApplyGrouping: () => void;
  arrangementMode: ArrangementMode;
  setArrangementMode: (v: ArrangementMode) => void;
  seatingChart: SeatingChart;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  rotation: { x: number; y: number };
  setRotation: (v: { x: number; y: number }) => void;
  groups: Group[];
  groupLeaders: Map<number, string>;
  onSetGroupLeader: (groupIndex: number, studentId: string) => void;
  seatingHistory: SeatingHistoryEntry[];
  onRestoreHistory: (entry: SeatingHistoryEntry) => void;
}

function getGroupIndex(rowIndex: number, colIndex: number, groups: Group[]): number {
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].some(cell => cell.rowIndex === rowIndex && cell.colIndex === colIndex)) {
      return i;
    }
  }
  return -1;
}

function DraggableStudent({
  student,
  groupColor,
  isLeader,
}: {
  student: Student;
  groupColor?: typeof GROUP_COLORS[0];
  isLeader?: boolean;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `student-${student.id}`,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `student-${student.id}`,
  });

  const setRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  return (
    <div
      ref={setRef}
      {...attributes}
      {...listeners}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-grab active:cursor-grabbing select-none transition-all"
      style={{
        opacity: isDragging ? 0.4 : 1,
        backgroundColor: isOver ? '#c7d2fe' : (groupColor?.bg ?? '#dbe2fa'),
        outline: isOver ? '2px solid #4f46e5' : '2px solid transparent',
        borderRadius: '8px',
      }}
    >
      {/* Avatar thumbnail */}
      <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-white/60">
        {student.avatarUrl ? (
          <img
            src={`${API_BASE}${student.avatarUrl}`}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[7px] font-bold text-[#3525cd]">
            {student.shortName?.slice(-1).toUpperCase()}
          </div>
        )}
      </div>
      {isLeader && (
        <span className="material-symbols-outlined text-amber-500 text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
      )}
      <span className="text-xs font-medium text-[#111c2d] leading-tight flex-1 min-w-0 truncate">{student.shortName}</span>
      <div className="flex gap-0.5 flex-shrink-0">
        {student.isSpecialNeeds && (
          <span className="px-1 py-0.5 bg-red-100 text-red-700 text-[8px] font-bold rounded">ĐB</span>
        )}
        {student.isNearsighted && (
          <span className="px-1 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-bold rounded">CẬN</span>
        )}
      </div>
    </div>
  );
}

function DroppableTable({
  rowIndex,
  colIndex,
  table,
  groupColor,
  groupLeaders,
  groupIndex,
  tableNumber,
}: {
  rowIndex: number;
  colIndex: number;
  table: Student[];
  groupColor?: typeof GROUP_COLORS[0];
  groupLeaders: Map<number, string>;
  groupIndex: number;
  tableNumber: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `table-${rowIndex}-${colIndex}` });
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `table-${rowIndex}-${colIndex}`,
  });

  const leaderId = groupIndex >= 0 ? groupLeaders.get(groupIndex) : undefined;

  return (
    <div
      ref={(node) => { setNodeRef(node); setDragRef(node); }}
      {...attributes}
      {...listeners}
      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all relative"
      style={{
        border: isOver
          ? '2px solid #3525cd'
          : groupColor
          ? `2px solid ${groupColor.border}`
          : '2px solid #c7c4d8',
        opacity: isDragging ? 0.4 : 1,
        minHeight: '90px',
        cursor: 'grab',
      }}
    >
      {/* Table number */}
      <div
        className="absolute -top-2 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full z-10"
        style={{ backgroundColor: groupColor ? groupColor.border : '#777587', color: '#fff' }}
      >
        Bàn {tableNumber}
      </div>

      {/* Group label */}
      {groupColor && (
        <div
          className="absolute -top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full z-10"
          style={{ backgroundColor: groupColor.bg, color: groupColor.text, border: `1px solid ${groupColor.border}` }}
        >
          {groupColor.label}
        </div>
      )}

      <div className="p-2 space-y-1.5 pt-3">
        {table.length === 0 ? (
          <div className="flex items-center justify-center h-12 text-[#c7c4d8]">
            <span className="material-symbols-outlined text-[24px]">chair</span>
          </div>
        ) : (
          table.map(student => (
            <DraggableStudent
              key={student.id}
              student={student}
              groupColor={groupColor}
              isLeader={leaderId === student.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function GroupSizesInput({ groupSizes, onChange }: { groupSizes: number[]; onChange: (sizes: number[]) => void }) {
  const [raw, setRaw] = useState(() => groupSizes.join(','));

  useEffect(() => {
    const joined = groupSizes.join(',');
    const parsedRaw = raw.split(',').map(v => parseInt(v.trim())).filter(n => !isNaN(n) && n > 0).join(',');
    if (parsedRaw !== joined) setRaw(joined);
  }, [groupSizes]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <input
      type="text"
      value={raw}
      onChange={e => {
        const val = e.target.value;
        setRaw(val);
        const sizes = val.split(',').map(v => parseInt(v.trim())).filter(n => !isNaN(n) && n > 0);
        if (sizes.length > 0) onChange(sizes);
      }}
      placeholder="VD: 4,4,4,4"
      className="w-full text-sm border border-[#c7c4d8] rounded-lg px-3 py-1.5 bg-white focus:outline-none"
    />
  );
}

export default function SeatingChartPage({
  rows,
  setRows,
  cols,
  setCols,
  seatsPerTable,
  setSeatsPerTable,
  students,
  onInitialArrangement,
  onRotateSeats,
  groupSettings,
  setGroupSettings,
  onApplyGrouping,
  arrangementMode,
  setArrangementMode,
  seatingChart,
  viewMode,
  setViewMode,
  rotation,
  setRotation,
  groups,
  groupLeaders,
  onSetGroupLeader,
  seatingHistory,
  onRestoreHistory,
}: SeatingChartPageProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const handleExportDocx = async () => {
    if (seatingChart.length === 0) { alert('Sơ đồ lớp học trống.'); return; }
    setIsExportingDocx(true);
    try {
      const {
        Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun,
        AlignmentType, WidthType, ShadingType, HeightRule, PageOrientation,
      } = await import('docx');

      const numCols = seatingChart[0]?.length ?? cols;
      const colPct = Math.floor(100 / numCols);
      let deskNum = 0;

      const podiumTable = new Table({
        width: { size: 30, type: WidthType.PERCENTAGE },
        rows: [new TableRow({
          children: [new TableCell({
            shading: { fill: '263143', type: ShadingType.CLEAR, color: 'auto' },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'BỤC GIẢNG', bold: true, size: 24, color: 'FFFFFF' })],
            })],
          })],
        })],
      });

      const mainTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: seatingChart.map(row =>
          new TableRow({
            height: { value: 1400, rule: HeightRule.ATLEAST },
            children: row.map(desk => {
              const n = ++deskNum;
              return new TableCell({
                width: { size: colPct, type: WidthType.PERCENTAGE },
                shading: { fill: 'F0F3FF', type: ShadingType.CLEAR, color: 'auto' },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `Bàn ${n}`, bold: true, size: 20, color: '3525CD' })],
                  }),
                  ...(desk.length === 0
                    ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(Trống)', size: 18, color: 'AAAAAA', italics: true })] })]
                    : desk.map(s => new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: s.fullName, size: 20 }),
                          ...(s.isSpecialNeeds ? [new TextRun({ text: ' ★', size: 18, bold: true, color: '3525CD' })] : []),
                        ],
                      }))
                  ),
                ],
              });
            }),
          })
        ),
      });

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size: { orientation: PageOrientation.LANDSCAPE },
              margin: { top: 720, right: 720, bottom: 720, left: 720 },
            },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [new TextRun({ text: 'SƠ ĐỒ LỚP HỌC', bold: true, size: 40 })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 360 },
              children: [new TextRun({ text: `Trường THCS Mường Thanh · Ngày ${new Date().toLocaleDateString('vi-VN')}`, size: 22, color: '464555' })],
            }),
            podiumTable,
            new Paragraph({ spacing: { after: 240 }, children: [] }),
            mainTable,
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'so-do-lop-hoc.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi xuất DOCX:', err);
      alert('Không thể xuất file DOCX.');
    } finally {
      setIsExportingDocx(false);
    }
  };

  let tableCounter = 0;

  return (
    <div className="flex" style={{ paddingTop: '64px', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        className="fixed left-0 flex flex-col justify-between py-4 bg-[#f0f3ff] border-r border-[#c7c4d8] overflow-y-auto z-40"
        style={{ top: '64px', width: '260px', height: 'calc(100vh - 64px)' }}
      >
        <div className="px-4 space-y-5 pb-8">
          {/* Room Setup */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#777587] mb-3">Cấu trúc lớp</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-[#777587] uppercase font-bold">Hàng</label>
                <input
                  type="number" min={1} max={10} value={rows}
                  onChange={e => setRows(Number(e.target.value))}
                  className="w-full text-sm border border-[#c7c4d8] rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd] bg-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[#777587] uppercase font-bold">Cột</label>
                <input
                  type="number" min={1} max={10} value={cols}
                  onChange={e => setCols(Number(e.target.value))}
                  className="w-full text-sm border border-[#c7c4d8] rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd] bg-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[#777587] uppercase font-bold">Ghế/bàn</label>
                <input
                  type="number" min={1} max={4} value={seatsPerTable}
                  onChange={e => setSeatsPerTable(Number(e.target.value))}
                  className="w-full text-sm border border-[#c7c4d8] rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd] bg-white focus:outline-none"
                />
              </div>
            </div>
            <p className="text-[10px] text-[#777587] mt-1.5">
              Tối đa {rows * cols * seatsPerTable} học sinh · Hiện có {students.length} HS
            </p>
          </div>

          {/* Arrangement Mode */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#777587] mb-3">Chế độ sắp xếp</h3>
            <div className="flex items-center justify-between mb-3 bg-[#e7eeff] rounded-lg p-2">
              <span className="text-sm font-medium text-[#111c2d]">Tự động</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={arrangementMode === 'automatic'}
                  onChange={e => setArrangementMode(e.target.checked ? 'automatic' : 'manual')}
                />
                <div className="w-11 h-6 bg-[#c7c4d8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3525cd]" />
              </label>
            </div>
            {arrangementMode === 'manual' && (
              <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg p-2 mb-2">
                Chế độ thủ công: Kéo thả để điều chỉnh chỗ ngồi.
              </p>
            )}
            <div className="space-y-2">
              <button
                onClick={onInitialArrangement}
                className="w-full py-2.5 bg-[#4f46e5] text-white rounded-lg text-sm font-medium hover:bg-[#3525cd] transition-all shadow-sm"
              >
                Sắp Xếp Ban Đầu
              </button>
              <button
                onClick={onRotateSeats}
                className="w-full py-2.5 border border-[#3525cd] text-[#3525cd] bg-white rounded-lg text-sm font-medium hover:bg-[#f0f3ff] transition-all"
              >
                Luân Chuyển Chỗ Ngồi
              </button>
            </div>
          </div>

          {/* Grouping */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#777587] mb-3">Phân tổ</h3>
            <div className="flex items-center justify-between mb-3 bg-[#e7eeff] rounded-lg p-2">
              <span className="text-sm font-medium text-[#111c2d]">Bật phân tổ</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={groupSettings.enabled}
                  onChange={e => setGroupSettings({ ...groupSettings, enabled: e.target.checked })}
                />
                <div className="w-11 h-6 bg-[#c7c4d8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3525cd]" />
              </label>
            </div>
            {groupSettings.enabled && (
              <div className="space-y-2">
                <select
                  value={groupSettings.arrangement}
                  onChange={e => setGroupSettings({ ...groupSettings, arrangement: e.target.value as GroupSettings['arrangement'] })}
                  className="w-full text-sm border border-[#c7c4d8] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd] bg-white focus:outline-none"
                >
                  <option value="horizontal">Theo tổ (Ngang)</option>
                  <option value="vertical">Theo tổ (Dọc)</option>
                  <option value="cluster">Theo nhóm (4 người)</option>
                </select>
                {groupSettings.arrangement !== 'cluster' && (
                  <div>
                    <label className="text-[10px] text-[#777587] uppercase font-bold block mb-1">Số bàn mỗi tổ (cách nhau dấu phẩy)</label>
                    <GroupSizesInput
                      groupSizes={groupSettings.groupSizes}
                      onChange={sizes => setGroupSettings({ ...groupSettings, groupSizes: sizes })}
                    />
                  </div>
                )}
                <button
                  onClick={onApplyGrouping}
                  className="w-full py-2 bg-[#16a34a] text-white rounded-lg text-sm font-medium hover:bg-[#15803d] transition-all"
                >
                  Áp dụng chia tổ
                </button>
              </div>
            )}
          </div>

          {/* Export DOCX */}
          <div className="pt-4 border-t border-[#c7c4d8]">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#777587] mb-3">Xuất sơ đồ</h3>
            <button
              onClick={handleExportDocx}
              disabled={isExportingDocx || seatingChart.length === 0}
              className="w-full py-2.5 bg-white border border-[#c7c4d8] rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#d8e3fb] transition-colors text-[#111c2d] disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
              {isExportingDocx ? 'Đang xuất...' : 'Xuất file Word (.docx)'}
            </button>
          </div>
        </div>

        {/* Seating history */}
        <div className="px-4 border-t border-[#c7c4d8] pt-4 pb-4">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#777587] mb-2"
          >
            <span>Lịch sử chỗ ngồi</span>
            <span className="material-symbols-outlined text-[16px]">
              {showHistory ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {showHistory && (
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {seatingHistory.length === 0 ? (
                <p className="text-[10px] text-[#777587] italic text-center py-2">Chưa có lịch sử.</p>
              ) : (
                seatingHistory.map(entry => (
                  <div
                    key={entry.id}
                    className="bg-white border border-[#c7c4d8] rounded-lg p-2 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-[#111c2d] truncate">{entry.note || 'Sắp xếp'}</p>
                      <p className="text-[9px] text-[#777587]">
                        {new Date(entry.created_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Khôi phục sơ đồ này? Sơ đồ hiện tại sẽ chuyển sang chế độ thủ công.')) {
                          onRestoreHistory(entry);
                        }
                      }}
                      title="Khôi phục"
                      className="flex-shrink-0 text-[#3525cd] hover:text-[#1a13a0] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">restore</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
          <div className="w-full py-2 text-center text-[10px] text-[#777587]">
            Tự động lưu khi thay đổi
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 relative" style={{ marginLeft: '260px' }}>
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          {/* Podium - top left corner */}
          <div className="flex justify-start">
            <div className="bg-[#263143] text-white px-10 py-3 rounded-br-3xl shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-xl font-bold tracking-[0.5em]">BỤC GIẢNG</span>
            </div>
          </div>

          {/* Seating grid or empty state */}
          {seatingChart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#777587]">
              <span className="material-symbols-outlined text-[64px] mb-4 text-[#c7c4d8]">chair</span>
              <p className="text-lg font-medium mb-2">Sơ đồ lớp học trống</p>
              <p className="text-sm text-center max-w-xs">Nhập danh sách học sinh và nhấn "Sắp Xếp Ban Đầu" để tạo sơ đồ</p>
            </div>
          ) : (
            <div style={viewMode === '3d' ? { perspective: '1000px' } : undefined}>
              <div
                style={viewMode === '3d' ? {
                  transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                  transformStyle: 'preserve-3d',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${seatingChart[0]?.length ?? cols}, 1fr)`,
                  gap: '1.5rem',
                } : {
                  display: 'grid',
                  gridTemplateColumns: `repeat(${seatingChart[0]?.length ?? cols}, 1fr)`,
                  gap: '1.5rem',
                }}
              >
                {seatingChart.map((row, rowIdx) =>
                  row.map((table, colIdx) => {
                    const groupIdx = getGroupIndex(rowIdx, colIdx, groups);
                    const groupColor = groupIdx >= 0 ? GROUP_COLORS[groupIdx % GROUP_COLORS.length] : undefined;
                    const currentTableNumber = ++tableCounter;
                    return (
                      <DroppableTable
                        key={`${rowIdx}-${colIdx}`}
                        rowIndex={rowIdx}
                        colIndex={colIdx}
                        table={table}
                        groupColor={groupColor}
                        groupLeaders={groupLeaders}
                        groupIndex={groupIdx}
                        tableNumber={currentTableNumber}
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Set group leader section */}
          {groups.length > 0 && (
            <div className="bg-white border border-[#c7c4d8] rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-[#111c2d] mb-3">Chọn tổ trưởng</h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {groups.map((group, groupIdx) => {
                  const groupColor = GROUP_COLORS[groupIdx % GROUP_COLORS.length];
                  const studentsInGroup: Student[] = [];
                  group.forEach(({ rowIndex, colIndex }) => {
                    if (seatingChart[rowIndex]?.[colIndex]) {
                      studentsInGroup.push(...seatingChart[rowIndex][colIndex]);
                    }
                  });
                  const currentLeaderId = groupLeaders.get(groupIdx);
                  return (
                    <div key={groupIdx}>
                      <label
                        className="text-[10px] font-bold uppercase block mb-1"
                        style={{ color: groupColor.text }}
                      >
                        {groupColor.label}
                      </label>
                      <select
                        value={currentLeaderId || ''}
                        onChange={e => { if (e.target.value) onSetGroupLeader(groupIdx, e.target.value); }}
                        className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                        style={{ borderColor: groupColor.border }}
                      >
                        <option value="">-- Chọn tổ trưởng --</option>
                        {studentsInGroup.map(s => (
                          <option key={s.id} value={s.id}>{s.fullName}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* View controls */}
        <div
          className="fixed bottom-8 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-[#c7c4d8] flex flex-col gap-4 z-30"
          style={{ left: '280px' }}
        >
          <div className="flex items-center justify-between gap-8">
            <span className="text-sm font-bold text-[#111c2d]">Chế độ xem</span>
            <div className="bg-[#e7eeff] p-1 rounded-lg flex gap-1">
              <button
                onClick={() => setViewMode('2d')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${viewMode === '2d' ? 'bg-white shadow-sm text-[#111c2d]' : 'text-[#464555]'}`}
              >
                2D
              </button>
              <button
                onClick={() => setViewMode('3d')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${viewMode === '3d' ? 'bg-white shadow-sm text-[#111c2d]' : 'text-[#464555]'}`}
              >
                3D
              </button>
            </div>
          </div>
          {viewMode === '3d' && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#777587] text-[20px]">3d_rotation</span>
                <input
                  type="range" min={0} max={60} value={rotation.x}
                  onChange={e => setRotation({ ...rotation, x: Number(e.target.value) })}
                  className="w-32 accent-[#3525cd]"
                />
              </div>
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#777587] text-[20px]">height</span>
                <input
                  type="range" min={-30} max={30} value={rotation.y}
                  onChange={e => setRotation({ ...rotation, y: Number(e.target.value) })}
                  className="w-32 accent-[#3525cd]"
                />
              </div>
            </div>
          )}
        </div>

        {/* FAB - quick arrange */}
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={onInitialArrangement}
            title="Sắp xếp nhanh"
            className="w-14 h-14 bg-[#3525cd] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
          >
            <span className="material-symbols-outlined text-[28px]">auto_fix_high</span>
          </button>
        </div>

        {/* Footer label */}
        <div className="fixed bottom-4 right-24 text-[#777587] text-xs">
          Trường THCS Mường Thanh • 2025
        </div>
      </main>
    </div>
  );
}

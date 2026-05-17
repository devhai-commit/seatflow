import { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { Student } from '../types';
import { api } from '../apiClient';

interface StudentManagerPageProps {
  students: Student[];
  onUpdateStudent: (updated: Student) => void;
  onSyncStudents: (names: string[]) => Promise<void>;
}

// ─── Preset violations / bonuses ──────────────────────────────────────────────
const PENALTY_PRESETS = [
  { label: 'Đi học muộn', points: 5 },
  { label: 'Không làm bài tập', points: 5 },
  { label: 'Không học bài cũ', points: 5 },
  { label: 'Không chuẩn bị nội dung giao về nhà', points: 5 },
  { label: 'Không trực nhật', points: 5 },
  { label: 'Trực nhật muộn', points: 5 },
  { label: 'Nói tục, chửi bậy', points: 5 },
  { label: 'Mất trật tự trong giờ', points: 5 },
  { label: 'Dùng điện thoại trong giờ', points: 5 },
  { label: 'Đánh nhau', points: 50 },
];

const BONUS_PRESETS = [
  { label: 'Phát biểu xây dựng bài', points: 5 },
  { label: 'Làm bài đầy đủ, đúng', points: 5 },
  { label: 'Học bài cũ đầy đủ', points: 5 },
  { label: 'Giúp đỡ bạn bè', points: 5 },
  { label: 'Trực nhật tốt', points: 5 },
  { label: 'Có tiến bộ rõ rệt', points: 10 },
];

// ─── Grading helpers ───────────────────────────────────────────────────────────
function getWeeklyRating(score: number) {
  if (score >= 90) return { label: 'Tốt', color: 'bg-green-100 text-green-700' };
  if (score >= 65) return { label: 'Khá', color: 'bg-blue-100 text-blue-700' };
  if (score >= 50) return { label: 'TB', color: 'bg-yellow-100 text-yellow-700' };
  if (score >= 40) return { label: 'Yếu', color: 'bg-orange-100 text-orange-700' };
  return { label: 'Kém', color: 'bg-red-100 text-red-700' };
}

function getMonthlyRating(score: number) {
  if (score >= 360) return { label: 'Tốt', color: 'bg-green-100 text-green-700' };
  if (score >= 260) return { label: 'Khá', color: 'bg-blue-100 text-blue-700' };
  if (score >= 200) return { label: 'TB', color: 'bg-yellow-100 text-yellow-700' };
  if (score >= 160) return { label: 'Yếu', color: 'bg-orange-100 text-orange-700' };
  return { label: 'Kém', color: 'bg-red-100 text-red-700' };
}

function getSem1Rating(score: number) {
  if (score >= 1620) return { label: 'Tốt', color: 'bg-green-100 text-green-700' };
  if (score >= 1170) return { label: 'Khá', color: 'bg-blue-100 text-blue-700' };
  if (score >= 900) return { label: 'TB', color: 'bg-yellow-100 text-yellow-700' };
  if (score >= 720) return { label: 'Yếu', color: 'bg-orange-100 text-orange-700' };
  return { label: 'Kém', color: 'bg-red-100 text-red-700' };
}

function getSem2Rating(score: number) {
  if (score >= 1530) return { label: 'Tốt', color: 'bg-green-100 text-green-700' };
  if (score >= 1105) return { label: 'Khá', color: 'bg-blue-100 text-blue-700' };
  if (score >= 850) return { label: 'TB', color: 'bg-yellow-100 text-yellow-700' };
  if (score >= 680) return { label: 'Yếu', color: 'bg-orange-100 text-orange-700' };
  return { label: 'Kém', color: 'bg-red-100 text-red-700' };
}

function getYearRating(score: number) {
  if (score >= 1575) return { label: 'Tốt', color: 'bg-green-100 text-green-700' };
  if (score >= 1138) return { label: 'Khá', color: 'bg-blue-100 text-blue-700' };
  if (score >= 875) return { label: 'TB', color: 'bg-yellow-100 text-yellow-700' };
  if (score >= 700) return { label: 'Yếu', color: 'bg-orange-100 text-orange-700' };
  return { label: 'Kém', color: 'bg-red-100 text-red-700' };
}

// ─── Week helpers ──────────────────────────────────────────────────────────────
function getWeekStart(ts: number): Date {
  const d = new Date(ts);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1; // days back to Monday
  const mon = new Date(d);
  mon.setDate(d.getDate() - diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function getWeekEnd(start: Date): Date {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function fmtDate(d: Date) {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ─── Misc helpers ──────────────────────────────────────────────────────────────
type TabId = 'info' | 'behavior' | 'semester';

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts[parts.length - 1].slice(0, 2).toUpperCase();
}

const avatarColors = [
  'bg-[#dbe2fa] text-[#3f4759]',
  'bg-[#e3dfff] text-[#372abf]',
  'bg-[#bfc6dd] text-[#141b2c]',
  'bg-slate-200 text-slate-600',
];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function StudentManagerPage({ students, onUpdateStudent, onSyncStudents }: StudentManagerPageProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [search, setSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Behavior form
  const [behaviorType, setBehaviorType] = useState<'bonus' | 'penalty'>('penalty');
  const [customReason, setCustomReason] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [pointAmount, setPointAmount] = useState(5);

  // Week navigation (Monday of viewed week)
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(Date.now()));

  // Semester tab: month picker for monthly breakdown
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const filtered = useMemo(
    () => students.filter(s => s.fullName.toLowerCase().includes(search.toLowerCase())),
    [students, search]
  );

  const selected = useMemo(
    () => students.find(s => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  // Records for the current week
  const weekEnd = useMemo(() => getWeekEnd(weekStart), [weekStart]);
  const weekRecords = useMemo(() => {
    if (!selected?.behaviorRecords) return [];
    return selected.behaviorRecords
      .filter(r => r.timestamp >= weekStart.getTime() && r.timestamp <= weekEnd.getTime())
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [selected, weekStart, weekEnd]);

  const weeklyScore = useMemo(
    () => 100 + weekRecords.reduce((acc, r) => acc + r.score, 0),
    [weekRecords]
  );

  // Monthly records for breakdown in semester tab
  const monthlyScore = useMemo(() => {
    if (!selected?.behaviorRecords) return 400;
    const recs = selected.behaviorRecords.filter(r => {
      const d = new Date(r.timestamp);
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });
    return 400 + recs.reduce((acc, r) => acc + r.score, 0);
  }, [selected, viewMonth, viewYear]);

  // Semester summary
  const semesterSummary = useMemo(() => {
    if (!selected) return null;
    const records = selected.behaviorRecords || [];
    // Sem1: months Aug(7)–Jan(0)
    const sem1Records = records.filter(r => [7, 8, 9, 10, 11, 0].includes(new Date(r.timestamp).getMonth()));
    // Sem2: months Feb(1)–Jul(6)
    const sem2Records = records.filter(r => [1, 2, 3, 4, 5, 6].includes(new Date(r.timestamp).getMonth()));
    const sem1Score = 1800 + sem1Records.reduce((acc, r) => acc + r.score, 0);
    const sem2Score = 1700 + sem2Records.reduce((acc, r) => acc + r.score, 0);
    const yearScore = (sem1Score + sem2Score) / 2;

    // Monthly breakdown
    const monthsMap = new Map<string, { score: number; month: number; year: number }>();
    records.forEach(r => {
      const d = new Date(r.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthsMap.has(key)) monthsMap.set(key, { score: 400, month: d.getMonth(), year: d.getFullYear() });
      monthsMap.get(key)!.score += r.score;
    });
    const monthlyStats = Array.from(monthsMap.values()).sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    );

    return { sem1Score, sem2Score, yearScore, monthlyStats };
  }, [selected]);

  const handleUpdateProfile = (field: keyof Student, value: unknown) => {
    if (!selected) return;
    onUpdateStudent({ ...selected, [field]: value });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setIsUploadingAvatar(true);
    try {
      const { avatarUrl } = await api.uploadAvatar(selected.id, file);
      onUpdateStudent({ ...selected, avatarUrl });
    } catch (err) {
      console.error('Lỗi upload ảnh:', err);
      alert('Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    if (!selected || !confirm('Xóa ảnh đại diện?')) return;
    setIsUploadingAvatar(true);
    try {
      await api.deleteAvatar(selected.id);
      onUpdateStudent({ ...selected, avatarUrl: undefined });
    } catch (err) {
      console.error('Lỗi xóa ảnh:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSelectPreset = (label: string, points: number) => {
    setSelectedPreset(label);
    setCustomReason('');
    setPointAmount(points);
  };

  const handleAddRecord = async () => {
    if (!selected || isProcessing) return;
    const reason = customReason.trim() || selectedPreset;
    if (!reason) { alert('Vui lòng nhập hoặc chọn lý do'); return; }

    setIsProcessing(true);
    const finalScore = behaviorType === 'bonus' ? Math.abs(pointAmount) : -Math.abs(pointAmount);
    const timestamp = Date.now();

    try {
      const newRecord = await api.addBehavior(selected.id, {
        type: behaviorType,
        description: reason,
        score: finalScore,
        timestamp,
      });
      onUpdateStudent({
        ...selected,
        behaviorRecords: [
          ...(selected.behaviorRecords || []),
          { ...newRecord, timestamp: Number(newRecord.timestamp) },
        ],
      });
      setCustomReason('');
      setSelectedPreset('');
      setPointAmount(5);
    } catch (err) {
      console.error('Lỗi thêm hạnh kiểm:', err);
      alert('Có lỗi xảy ra khi lưu dữ liệu.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!selected || isProcessing) return;
    if (!confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) return;
    setIsProcessing(true);
    try {
      await api.deleteBehavior(recordId);
      onUpdateStudent({
        ...selected,
        behaviorRecords: selected.behaviorRecords.filter(r => r.id !== recordId),
      });
    } catch (err) {
      console.error('Lỗi xóa hạnh kiểm:', err);
      alert('Không thể xóa bản ghi.');
    } finally {
      setIsProcessing(false);
    }
  };

  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = () => {
    const data = students.map((s, idx) => ({
      'STT': idx + 1,
      'Họ và tên': s.fullName,
      'Tên ngắn': s.shortName || '',
      'SĐT phụ huynh': s.parentPhone || '',
      'Địa chỉ': s.address || '',
      'Cân nặng (kg)': s.weight || '',
      'Chiều cao (cm)': s.height || '',
      'Cận thị': s.isNearsighted ? 'Có' : '',
      'Đặc biệt': s.isSpecialNeeds ? 'Có' : '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách lớp');
    XLSX.writeFile(wb, 'danh-sach-lop.xlsx');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      const names = rows
        .map(row => (row['Họ và tên'] ?? row['Ho va ten'] ?? Object.values(row)[1]) as string)
        .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
        .map(name => name.trim());
      if (names.length === 0) {
        alert('Không tìm thấy cột "Họ và tên" trong file. Vui lòng kiểm tra lại.');
        return;
      }
      await onSyncStudents(names);
    } catch (err) {
      console.error('Lỗi nhập Excel:', err);
      alert('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.');
    } finally {
      e.target.value = '';
    }
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goCurrentWeek = () => setWeekStart(getWeekStart(Date.now()));

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'info', label: 'Thông tin chi tiết', icon: 'person' },
    { id: 'behavior', label: 'Sổ theo dõi', icon: 'event_note' },
    { id: 'semester', label: 'Tổng kết học kỳ', icon: 'assessment' },
  ];

  const presets = behaviorType === 'penalty' ? PENALTY_PRESETS : BONUS_PRESETS;

  return (
    <div className="flex overflow-hidden" style={{ paddingTop: '64px', height: '100vh' }}>
      {/* Student list sidebar */}
      <aside className="flex flex-col bg-[#f0f3ff] border-r border-[#c7c4d8]" style={{ width: '320px', flexShrink: 0 }}>
        <div className="p-4 border-b border-[#c7c4d8] bg-white">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#464555] text-[20px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm học sinh..."
              className="w-full pl-10 pr-4 py-2 bg-[#d8e3fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#3525cd] focus:bg-white transition-all focus:outline-none"
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-[#464555]">Tổng số: {students.length} học sinh</span>
            <div className="flex gap-1">
              <button
                onClick={handleExportExcel}
                disabled={students.length === 0}
                title="Xuất danh sách ra Excel"
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[#3525cd] bg-[#e7eeff] hover:bg-[#dbe2fa] rounded-lg transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[15px]">download</span>
                Excel
              </button>
              <button
                onClick={() => excelInputRef.current?.click()}
                title="Nhập danh sách từ Excel"
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[#3525cd] bg-[#e7eeff] hover:bg-[#dbe2fa] rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">upload</span>
                Nhập
              </button>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportExcel}
              />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map((student, idx) => {
            const isActive = student.id === selectedStudentId;
            return (
              <button
                key={student.id}
                onClick={() => setSelectedStudentId(student.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                  isActive
                    ? 'bg-[#dbe2fa] text-[#5d6478] border-l-4 border-[#3525cd] rounded-r-xl'
                    : 'hover:bg-[#d8e3fb]'
                }`}
              >
                <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ${!student.avatarUrl ? (isActive ? 'bg-[#3525cd]' : avatarColors[idx % avatarColors.length].split(' ')[0]) : ''}`}>
                  {student.avatarUrl ? (
                    <img src={`http://localhost:3001${student.avatarUrl}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center font-bold text-sm ${isActive ? 'bg-[#3525cd] text-white' : avatarColors[idx % avatarColors.length]}`}>
                      {getInitials(student.fullName)}
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-semibold text-[#111c2d] truncate">{student.fullName}</p>
                  <p className="text-xs text-[#464555]">Mã HS: 2024{String(idx + 1).padStart(3, '0')}</p>
                </div>
                {(student.isSpecialNeeds || student.isNearsighted) && (
                  <span className="material-symbols-outlined text-[#3525cd] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    stars
                  </span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-[#777587] text-sm">
              {students.length === 0 ? 'Chưa có danh sách học sinh.' : 'Không tìm thấy.'}
            </div>
          )}
        </div>
      </aside>

      {/* Detail area */}
      <section className="flex-1 bg-[#f9f9ff] overflow-y-auto">
        {selected ? (
          <div className="max-w-5xl mx-auto p-8 space-y-4">
            {/* Header card */}
            <div className="bg-white border border-[#c7c4d8] rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-8">
              {/* Avatar with upload overlay */}
              <div className="relative flex-shrink-0 group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md">
                  {selected.avatarUrl ? (
                    <img
                      src={`http://localhost:3001${selected.avatarUrl}`}
                      alt={selected.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#e2dfff] flex items-center justify-center text-3xl font-bold text-[#3525cd]">
                      {getInitials(selected.fullName)}
                    </div>
                  )}
                </div>
                {/* Hover overlay */}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Thay đổi ảnh đại diện"
                >
                  {isUploadingAvatar ? (
                    <span className="material-symbols-outlined text-white text-[28px] animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-white text-[28px]">photo_camera</span>
                  )}
                </button>
                {selected.avatarUrl && (
                  <button
                    onClick={handleDeleteAvatar}
                    disabled={isUploadingAvatar}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition-colors"
                    title="Xóa ảnh"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <h1 className="text-3xl font-bold text-[#111c2d]">{selected.fullName}</h1>
                  <span className="px-3 py-1 bg-[#e2dfff] text-[#0f0069] text-sm rounded-full border border-[#4f46e5]">Lớp 9A1</span>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
                  {selected.isNearsighted && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg text-xs">
                      <span className="material-symbols-outlined text-[14px]">visibility</span> Cận thị
                    </span>
                  )}
                  {selected.isSpecialNeeds && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-xs">
                      <span className="material-symbols-outlined text-[14px]">priority_high</span> Đặc biệt
                    </span>
                  )}
                  {selected.height && parseInt(selected.height) < 135 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-lg text-xs">
                      <span className="material-symbols-outlined text-[14px]">straighten</span> Chiều cao &lt;135cm
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#c7c4d8] gap-8 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 px-2 flex items-center gap-2 whitespace-nowrap transition-colors text-sm ${
                    activeTab === tab.id
                      ? 'text-[#3525cd] font-bold border-b-2 border-[#3525cd]'
                      : 'text-[#464555] font-medium hover:text-[#3525cd]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Info Tab ── */}
            {activeTab === 'info' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-12">
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white border border-[#c7c4d8] rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-[#111c2d] mb-6 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#3525cd]">info</span>
                      Thông tin cá nhân
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[#464555]">Số điện thoại phụ huynh</label>
                        <input
                          type="tel"
                          value={selected.parentPhone || ''}
                          onChange={e => handleUpdateProfile('parentPhone', e.target.value)}
                          className="w-full border border-[#c7c4d8] rounded-lg px-3 py-2 bg-[#f0f3ff] text-sm focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[#464555]">Địa chỉ thường trú</label>
                        <input
                          type="text"
                          value={selected.address || ''}
                          onChange={e => handleUpdateProfile('address', e.target.value)}
                          className="w-full border border-[#c7c4d8] rounded-lg px-3 py-2 bg-[#f0f3ff] text-sm focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[#464555]">Cân nặng (kg)</label>
                        <input
                          type="number"
                          value={selected.weight || ''}
                          onChange={e => handleUpdateProfile('weight', e.target.value)}
                          className="w-full border border-[#c7c4d8] rounded-lg px-3 py-2 bg-[#f0f3ff] text-sm focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[#464555]">Chiều cao (cm)</label>
                        <div>
                          <input
                            type="number"
                            value={selected.height || ''}
                            onChange={e => handleUpdateProfile('height', e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                              selected.height && parseInt(selected.height) < 135
                                ? 'border-[#ffdad6] bg-[#ffdad6]/20 text-[#ba1a1a] font-bold focus:ring-[#ba1a1a]/20 focus:border-[#ba1a1a]'
                                : 'border-[#c7c4d8] bg-[#f0f3ff] focus:ring-[#3525cd]/20 focus:border-[#3525cd]'
                            }`}
                          />
                          {selected.height && parseInt(selected.height) < 135 && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-[#ba1a1a]">
                              <span className="material-symbols-outlined text-[14px]">warning</span>
                              Cảnh báo: Chiều cao dưới 135cm — Ưu tiên hàng ghế đầu
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border border-[#c7c4d8] rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-[#111c2d] mb-6 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#3a2cc1]">priority_high</span>
                      Đặc điểm ưu tiên
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-start gap-3 p-3 bg-[#e7eeff] rounded-xl cursor-pointer hover:bg-[#dee8ff] transition-colors">
                        <input
                          type="checkbox"
                          checked={selected.isNearsighted || false}
                          onChange={e => handleUpdateProfile('isNearsighted', e.target.checked)}
                          className="mt-1 w-5 h-5 rounded border-[#c7c4d8] accent-[#3525cd]"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#111c2d]">Cận thị / Loạn thị</p>
                          <p className="text-xs text-[#464555] leading-tight">Cần sắp xếp chỗ ngồi gần bảng</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 border border-[#c7c4d8] rounded-xl cursor-pointer hover:bg-[#f0f3ff] transition-colors">
                        <input
                          type="checkbox"
                          checked={selected.isSpecialNeeds || false}
                          onChange={e => handleUpdateProfile('isSpecialNeeds', e.target.checked)}
                          className="mt-1 w-5 h-5 rounded border-[#c7c4d8] accent-[#3525cd]"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#111c2d]">Trình độ tiếp thu đặc biệt</p>
                          <p className="text-xs text-[#464555] leading-tight">Học sinh cần kèm cặp đặc biệt — Luôn ưu tiên hàng 1</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Behavior Tab (weekly) ── */}
            {activeTab === 'behavior' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-12">
                {/* Left: score + form */}
                <div className="md:col-span-4 bg-white rounded-xl border border-[#c7c4d8] p-6 h-fit shadow-sm space-y-4">
                  {/* Week navigator */}
                  <div>
                    <p className="text-xs font-bold text-[#777587] uppercase tracking-wider mb-2">Tuần học</p>
                    <div className="flex items-center gap-1">
                      <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-[#e7eeff] transition-colors">
                        <span className="material-symbols-outlined text-[18px] text-[#3525cd]">chevron_left</span>
                      </button>
                      <span className="flex-1 text-center text-xs font-semibold text-[#111c2d]">
                        {fmtDate(weekStart)} – {fmtDate(weekEnd)}/{weekEnd.getMonth() + 1}
                      </span>
                      <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-[#e7eeff] transition-colors">
                        <span className="material-symbols-outlined text-[18px] text-[#3525cd]">chevron_right</span>
                      </button>
                    </div>
                    <button
                      onClick={goCurrentWeek}
                      className="w-full mt-1 text-[10px] text-[#3525cd] hover:underline"
                    >
                      Tuần hiện tại
                    </button>
                  </div>

                  {/* Weekly score */}
                  <div className="text-center p-5 bg-[#e2dfff] rounded-2xl">
                    <p className="text-xs text-[#3323cc] uppercase tracking-wider mb-1">Điểm tuần</p>
                    <p className="text-5xl font-bold text-[#3525cd]">
                      {weeklyScore}<span className="text-2xl">/100</span>
                    </p>
                    <span className={`inline-block mt-2 px-4 py-1 rounded-full font-bold text-sm ${getWeeklyRating(weeklyScore).color}`}>
                      {getWeeklyRating(weeklyScore).label}
                    </span>
                    <p className="text-[10px] text-[#777587] mt-1">
                      Xếp loại: ≥90 Tốt · ≥65 Khá · ≥50 TB · ≥40 Yếu · &lt;40 Kém
                    </p>
                  </div>

                  {/* Add record form */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setBehaviorType('penalty'); setSelectedPreset(''); setPointAmount(5); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 transition-all ${
                          behaviorType === 'penalty' ? 'border-red-500 bg-red-50 text-red-700' : 'border-[#c7c4d8] text-[#464555]'
                        }`}
                      >Vi phạm</button>
                      <button
                        onClick={() => { setBehaviorType('bonus'); setSelectedPreset(''); setPointAmount(5); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 transition-all ${
                          behaviorType === 'bonus' ? 'border-green-500 bg-green-50 text-green-700' : 'border-[#c7c4d8] text-[#464555]'
                        }`}
                      >Khen thưởng</button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {presets.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectPreset(p.label, p.points)}
                          className={`px-2 py-1 text-[10px] rounded-full border transition-colors ${
                            selectedPreset === p.label
                              ? 'bg-[#3525cd] text-white border-[#3525cd]'
                              : 'bg-white text-[#464555] border-[#c7c4d8] hover:border-[#3525cd]'
                          }`}
                        >
                          {p.label}{p.points !== 5 ? ` (${p.points}đ)` : ''}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={customReason || selectedPreset}
                      onChange={e => { setCustomReason(e.target.value); setSelectedPreset(''); }}
                      placeholder="Nội dung ghi chú..."
                      className="w-full text-xs border border-[#c7c4d8] rounded-lg px-3 py-2 focus:outline-none bg-[#f0f3ff]"
                    />

                    <div className="flex gap-2 items-center">
                      <label className="text-xs text-[#464555]">Điểm:</label>
                      <input
                        type="number" min="1" max="100" value={pointAmount}
                        onChange={e => setPointAmount(Number(e.target.value))}
                        className="w-16 text-sm border border-[#c7c4d8] rounded-lg px-2 py-1 focus:outline-none bg-[#f0f3ff] font-bold"
                      />
                    </div>

                    <button
                      onClick={handleAddRecord}
                      disabled={isProcessing}
                      className={`w-full flex items-center justify-center gap-2 py-3 font-bold rounded-xl transition-colors text-sm text-white ${
                        behaviorType === 'penalty' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                      } disabled:opacity-50`}
                    >
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                      {isProcessing ? 'Đang lưu...' : 'Lưu ghi nhận'}
                    </button>
                  </div>
                </div>

                {/* Right: weekly records table */}
                <div className="md:col-span-8 bg-white rounded-xl border border-[#c7c4d8] overflow-hidden shadow-sm">
                  <div className="bg-[#f0f3ff] border-b border-[#c7c4d8] px-4 py-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[#111c2d]">
                      Ghi nhận tuần {fmtDate(weekStart)} – {fmtDate(weekEnd)}/{weekEnd.getMonth() + 1}
                    </h4>
                    <span className="text-xs text-[#777587]">{weekRecords.length} ghi nhận</span>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-[#f9f9ff] border-b border-[#c7c4d8]">
                      <tr>
                        {['Ngày', 'Loại', 'Nội dung', 'Điểm', ''].map(h => (
                          <th key={h} className="p-4 text-sm font-medium text-[#464555]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c7c4d8]">
                      {weekRecords.length > 0 ? weekRecords.map(record => (
                        <tr key={record.id} className="hover:bg-[#f0f3ff] transition-colors">
                          <td className="p-4 text-sm text-[#111c2d] whitespace-nowrap">
                            {new Date(record.timestamp).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                              record.type === 'bonus' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {record.type === 'bonus' ? 'Thưởng' : 'Vi phạm'}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-[#111c2d]">{record.description}</td>
                          <td className={`p-4 font-bold ${record.score > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {record.score > 0 ? '+' : ''}{record.score}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className="text-[#c7c4d8] hover:text-red-600 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-sm text-[#777587] italic">
                            Tuần này chưa có vi phạm hay khen thưởng nào.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Semester Tab ── */}
            {activeTab === 'semester' && semesterSummary && (
              <div className="space-y-4 pb-12">
                {/* Semester cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-2xl text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #3525cd, #3a2cc1)' }}>
                    <p className="text-sm opacity-80 mb-1">Học kỳ 1 (18 tuần)</p>
                    <h2 className="text-3xl font-bold mb-1">{getSem1Rating(semesterSummary.sem1Score).label}</h2>
                    <div className="text-lg font-bold">{semesterSummary.sem1Score}<span className="text-sm opacity-70">/1800</span></div>
                  </div>
                  <div className="p-6 rounded-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, #dbe2fa, #575e72)', color: '#141b2c' }}>
                    <p className="text-sm opacity-80 mb-1">Học kỳ 2 (17 tuần)</p>
                    <h2 className="text-3xl font-bold mb-1">{getSem2Rating(semesterSummary.sem2Score).label}</h2>
                    <div className="text-lg font-bold">{semesterSummary.sem2Score}<span className="text-sm opacity-70">/1700</span></div>
                  </div>
                  <div className="p-6 rounded-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, #e3dfff, #c3c0ff)', color: '#100069' }}>
                    <p className="text-sm opacity-80 mb-1">Cả năm (TB kỳ I + II)</p>
                    <h2 className="text-3xl font-bold mb-1">{getYearRating(semesterSummary.yearScore).label}</h2>
                    <div className="text-lg font-bold">{semesterSummary.yearScore.toFixed(0)}<span className="text-sm opacity-70">/1750</span></div>
                  </div>
                </div>

                {/* Monthly breakdown with selector */}
                <div className="bg-white border border-[#c7c4d8] rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-[#f0f3ff] px-6 py-4 border-b border-[#c7c4d8] flex items-center gap-4">
                    <h3 className="text-sm font-bold text-[#464555] uppercase tracking-wide flex-1">Theo tháng</h3>
                    <select
                      value={viewMonth}
                      onChange={e => setViewMonth(Number(e.target.value))}
                      className="text-sm border border-[#c7c4d8] rounded-lg px-2 py-1 focus:outline-none bg-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>Tháng {i + 1}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={viewYear}
                      onChange={e => setViewYear(Number(e.target.value))}
                      className="w-20 text-sm border border-[#c7c4d8] rounded-lg px-2 py-1 focus:outline-none bg-white"
                    />
                  </div>
                  <div className="px-6 py-4 flex items-center gap-4 border-b border-[#c7c4d8]">
                    <div className="text-center">
                      <p className="text-xs text-[#777587]">Điểm tháng {viewMonth + 1}/{viewYear}</p>
                      <p className="text-2xl font-bold text-[#3525cd]">{monthlyScore}<span className="text-sm text-[#777587]">/400</span></p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getMonthlyRating(monthlyScore).color}`}>
                      {getMonthlyRating(monthlyScore).label}
                    </span>
                    <p className="text-[10px] text-[#777587] ml-auto">≥360 Tốt · ≥260 Khá · ≥200 TB · ≥160 Yếu</p>
                  </div>

                  {/* All months summary */}
                  <table className="w-full">
                    <thead>
                      <tr>
                        {['Tháng / Năm', 'Điểm', 'Xếp loại'].map(h => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-medium text-[#464555]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c7c4d8]">
                      {semesterSummary.monthlyStats.length > 0 ? semesterSummary.monthlyStats.map((stat, idx) => {
                        const rating = getMonthlyRating(stat.score);
                        return (
                          <tr key={idx} className="hover:bg-[#f0f3ff] transition-colors">
                            <td className="px-6 py-4 text-sm text-[#111c2d]">Tháng {stat.month + 1} / {stat.year}</td>
                            <td className="px-6 py-4 text-sm font-bold text-[#3525cd]">{stat.score}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${rating.color}`}>
                                {rating.label}
                              </span>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-[#777587] text-sm">Chưa có dữ liệu nào.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Grading reference */}
                <div className="bg-[#f0f3ff] border border-[#c7c4d8] rounded-xl p-4">
                  <p className="text-xs font-bold text-[#464555] uppercase mb-3">Bảng xếp loại tham chiếu</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                    <div>
                      <p className="font-bold text-[#111c2d] mb-1">Tuần (100)</p>
                      <p>≥90: Tốt</p><p>≥65: Khá</p><p>≥50: TB</p><p>≥40: Yếu</p><p>&lt;40: Kém</p>
                    </div>
                    <div>
                      <p className="font-bold text-[#111c2d] mb-1">Tháng (400)</p>
                      <p>≥360: Tốt</p><p>≥260: Khá</p><p>≥200: TB</p><p>≥160: Yếu</p><p>&lt;160: Kém</p>
                    </div>
                    <div>
                      <p className="font-bold text-[#111c2d] mb-1">Kỳ I (1800)</p>
                      <p>≥1620: Tốt</p><p>≥1170: Khá</p><p>≥900: TB</p><p>≥720: Yếu</p><p>&lt;720: Kém</p>
                    </div>
                    <div>
                      <p className="font-bold text-[#111c2d] mb-1">Kỳ II (1700)</p>
                      <p>≥1530: Tốt</p><p>≥1105: Khá</p><p>≥850: TB</p><p>≥680: Yếu</p><p>&lt;680: Kém</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#777587]">
            <span className="material-symbols-outlined text-[64px] mb-4 text-[#c7c4d8]">person</span>
            <p className="text-lg font-medium">Chưa có danh sách học sinh</p>
            <p className="text-sm">Vui lòng nhập danh sách trong tab Sơ Đồ Lớp</p>
          </div>
        )}
      </section>
    </div>
  );
}

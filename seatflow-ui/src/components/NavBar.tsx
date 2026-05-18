import { useState } from 'react';
import type { ActiveTab, Classroom } from '../types';

interface ClassroomModalProps {
  classroom?: Classroom;
  onSave: (name: string, grade?: string, schoolYear?: string) => void;
  onClose: () => void;
}

function ClassroomModal({ classroom, onSave, onClose }: ClassroomModalProps) {
  const [name, setName] = useState(classroom?.name || '');
  const [grade, setGrade] = useState(classroom?.grade || '');
  const [schoolYear, setSchoolYear] = useState(classroom?.school_year || '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), grade.trim() || undefined, schoolYear.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
        <h2 className="text-base font-bold text-[#111c2d] mb-4">
          {classroom ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-[#777587] uppercase block mb-1">Tên lớp *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="VD: 7A1, Lớp Toán..."
              className="w-full border border-[#c7c4d8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd]"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#777587] uppercase block mb-1">Khối / Cấp</label>
            <input
              type="text"
              value={grade}
              onChange={e => setGrade(e.target.value)}
              placeholder="VD: Khối 7, THCS..."
              className="w-full border border-[#c7c4d8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#777587] uppercase block mb-1">Năm học</label>
            <input
              type="text"
              value={schoolYear}
              onChange={e => setSchoolYear(e.target.value)}
              placeholder="VD: 2024-2025"
              className="w-full border border-[#c7c4d8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd]"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-[#c7c4d8] rounded-lg text-sm font-medium text-[#464555] hover:bg-[#f0f3ff] transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 py-2 bg-[#3525cd] text-white rounded-lg text-sm font-bold hover:bg-[#1a13a0] disabled:opacity-40 transition-colors"
          >
            {classroom ? 'Lưu' : 'Thêm lớp'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface NavBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onLogout: () => void;
  onHelpClick: () => void;
  classrooms: Classroom[];
  selectedClassroomId: number | null;
  onSelectClassroom: (id: number) => void;
  onCreateClassroom: (name: string, grade?: string, schoolYear?: string) => void;
  onUpdateClassroom: (id: number, name: string, grade?: string, schoolYear?: string) => void;
  onDeleteClassroom: (id: number) => void;
}

export default function NavBar({
  activeTab,
  onTabChange,
  onLogout,
  onHelpClick,
  classrooms,
  selectedClassroomId,
  onSelectClassroom,
  onCreateClassroom,
  onUpdateClassroom,
  onDeleteClassroom,
}: NavBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'chart', label: 'Sơ đồ lớp học' },
    { id: 'priority', label: 'Học sinh ưu tiên' },
    { id: 'manager', label: 'Quản lý học sinh' },
  ];

  const selectedClassroom = classrooms.find(c => c.id === selectedClassroomId);

  const handleEditClassroom = (classroom: Classroom, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClassroom(classroom);
    setModalMode('edit');
    setIsDropdownOpen(false);
  };

  const handleDeleteClassroom = (classroom: Classroom, e: React.MouseEvent) => {
    e.stopPropagation();
    if (classrooms.length <= 1) {
      alert('Không thể xóa lớp cuối cùng.');
      return;
    }
    if (confirm(`Xóa lớp "${classroom.name}"?\nTất cả học sinh và dữ liệu của lớp sẽ bị xóa vĩnh viễn.`)) {
      onDeleteClassroom(classroom.id);
      setIsDropdownOpen(false);
    }
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 bg-white border-b border-[#c7c4d8] shadow-sm"
        style={{ height: '64px' }}
      >
        {/* Left: Logo + Classroom selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src="/seatflow_logo.png" alt="SeatFlow Logo" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-xl font-bold text-[#3525cd]">SeatFlow</span>
          </div>

          {/* Classroom dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#c7c4d8] rounded-lg text-sm font-medium text-[#111c2d] hover:bg-[#f0f3ff] transition-colors max-w-[200px]"
            >
              <span className="material-symbols-outlined text-[#3525cd] text-[16px]">school</span>
              <span className="truncate">{selectedClassroom?.name || 'Chọn lớp'}</span>
              {selectedClassroom?.grade && (
                <span className="text-[10px] text-[#777587] flex-shrink-0">({selectedClassroom.grade})</span>
              )}
              <span className="material-symbols-outlined text-[14px] text-[#777587] flex-shrink-0">
                {isDropdownOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute top-full left-0 mt-1 bg-white border border-[#c7c4d8] rounded-xl shadow-xl min-w-56 z-50 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {classrooms.map(classroom => (
                      <div
                        key={classroom.id}
                        className={`flex items-center gap-2 px-3 py-2.5 hover:bg-[#f0f3ff] cursor-pointer group ${classroom.id === selectedClassroomId ? 'bg-[#e7eeff]' : ''}`}
                        onClick={() => { onSelectClassroom(classroom.id); setIsDropdownOpen(false); }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#111c2d] truncate">{classroom.name}</p>
                          {(classroom.grade || classroom.school_year) && (
                            <p className="text-[10px] text-[#777587]">
                              {[classroom.grade, classroom.school_year].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        {classroom.id === selectedClassroomId && (
                          <span className="material-symbols-outlined text-[#3525cd] text-[16px] flex-shrink-0">check</span>
                        )}
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={e => handleEditClassroom(classroom, e)}
                            className="p-1 text-[#777587] hover:text-[#3525cd] rounded hover:bg-[#e7eeff] transition-colors"
                            title="Chỉnh sửa"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                          </button>
                          <button
                            onClick={e => handleDeleteClassroom(classroom, e)}
                            className="p-1 text-[#777587] hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                            title="Xóa lớp"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[#c7c4d8] p-2">
                    <button
                      onClick={() => { setModalMode('create'); setEditingClassroom(null); setIsDropdownOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[#3525cd] hover:bg-[#e7eeff] rounded-lg text-sm font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      Thêm lớp mới
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Tab navigation */}
          <nav className="hidden md:flex items-center gap-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`text-sm font-medium py-1 transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'text-[#3525cd] font-bold border-b-2 border-[#3525cd]'
                    : 'text-[#464555] hover:text-[#3525cd]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Help + User + Logout */}
        <div className="flex items-center gap-3">
          <button
            onClick={onHelpClick}
            className="p-2 text-[#464555] hover:text-[#3525cd] transition-colors rounded-full hover:bg-[#f0f3ff]"
          >
            <span className="material-symbols-outlined">help</span>
          </button>
          <div className="flex items-center gap-3 pl-3 border-l border-[#c7c4d8]">
            <span
              className="material-symbols-outlined text-[32px] text-[#3525cd]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_circle
            </span>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-[#3525cd] text-white rounded-lg text-sm font-bold hover:bg-[#3a2cc1] transition-all"
          >
            Đăng xuất
          </button>
        </div>
      </nav>

      {/* Classroom modal */}
      {modalMode && (
        <ClassroomModal
          classroom={modalMode === 'edit' ? editingClassroom ?? undefined : undefined}
          onSave={(name, grade, schoolYear) => {
            if (modalMode === 'create') {
              onCreateClassroom(name, grade, schoolYear);
            } else if (editingClassroom) {
              onUpdateClassroom(editingClassroom.id, name, grade, schoolYear);
            }
          }}
          onClose={() => { setModalMode(null); setEditingClassroom(null); }}
        />
      )}
    </>
  );
}

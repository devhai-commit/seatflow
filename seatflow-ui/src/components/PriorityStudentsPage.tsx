import type { Student } from '../types';

interface PriorityStudentsPageProps {
  students: Student[];
  onUpdateStudent: (updated: Student) => void;
  onInitialArrangement: () => void;
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts[parts.length - 1].slice(0, 2).toUpperCase();
}

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

function AvatarCircle({ student, size }: { student: Student; size: string }) {
  return (
    <div className={`${size} rounded-full overflow-hidden flex-shrink-0 bg-[#dbe2fa] flex items-center justify-center font-bold text-sm`}>
      {student.avatarUrl ? (
        <img src={`${API_BASE}${student.avatarUrl}`} alt={student.fullName} className="w-full h-full object-cover" />
      ) : (
        <span className="text-[#3525cd]">{getInitials(student.fullName)}</span>
      )}
    </div>
  );
}

function PriorityBadge({ label, icon }: { label: string; icon: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e7eeff] text-[#3525cd] text-[10px] font-bold rounded border border-[#c7c4d8]">
      <span className="material-symbols-outlined text-[12px]">{icon}</span>
      {label}
    </span>
  );
}

function SpecialStudentCard({ student }: { student: Student }) {
  return (
    <div className="bg-white border border-[#c7c4d8] rounded-xl p-4 shadow-sm hover:shadow-md hover:border-[#3525cd]/40 transition-all flex items-start gap-3">
      <div className="relative flex-shrink-0">
        <AvatarCircle student={student} size="w-12 h-12" />
        <span
          className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#3525cd] rounded-full flex items-center justify-center"
          title="Học sinh đặc biệt"
        >
          <span className="material-symbols-outlined text-white text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-[#111c2d] truncate mb-1.5">{student.fullName}</h3>
        <div className="flex flex-wrap gap-1">
          <PriorityBadge label="Đặc biệt" icon="priority_high" />
          <PriorityBadge label="Ưu tiên hàng 1" icon="vertical_align_top" />
        </div>
        <p className="text-[11px] text-[#777587] mt-2 leading-relaxed">
          Cần được giáo viên kèm cặp, ưu tiên chỗ ngồi gần bảng.
        </p>
      </div>
    </div>
  );
}

function HealthStudentCard({ student }: { student: Student }) {
  const isShort = student.height && parseInt(student.height) < 135;
  return (
    <div className="bg-white border border-[#c7c4d8] rounded-xl p-4 shadow-sm hover:shadow-md hover:border-[#3525cd]/40 transition-all flex items-center gap-3">
      <AvatarCircle student={student} size="w-10 h-10" />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-[#111c2d] truncate mb-1">{student.fullName}</h3>
        <div className="flex flex-wrap gap-1">
          {student.isNearsighted && (
            <PriorityBadge label="Cận thị" icon="visibility" />
          )}
          {isShort && (
            <PriorityBadge label={`< 135cm (${student.height}cm)`} icon="straighten" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function PriorityStudentsPage({
  students,
  onInitialArrangement,
}: PriorityStudentsPageProps) {
  const specialStudents = students.filter(s => s.isSpecialNeeds);
  const healthStudents = students.filter(s =>
    !s.isSpecialNeeds && (s.isNearsighted || (s.height && parseInt(s.height) < 135))
  );
  const normalCount = students.length - specialStudents.length - healthStudents.length;

  return (
    <div className="flex" style={{ paddingTop: '64px', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        className="fixed left-0 flex flex-col justify-between py-4 bg-[#f0f3ff] border-r border-[#c7c4d8] overflow-y-auto z-40"
        style={{ top: '64px', width: '260px', height: 'calc(100vh - 64px)' }}
      >
        <div className="flex flex-col gap-1 px-2">
          <div className="mb-6 px-4 py-4 border-b border-[#c7c4d8]/30">
            <p className="text-lg font-bold text-[#3525cd]">Thiết lập lớp học</p>
            <p className="text-xs text-[#464555]">Trường THCS Mường Thanh</p>
          </div>

          <div className="px-4 space-y-2 mb-4">
            <div className="bg-white rounded-xl border border-[#c7c4d8] p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#777587] uppercase font-bold mb-0.5">Tổng học sinh</p>
                <p className="text-2xl font-bold text-[#111c2d]">{students.length}</p>
              </div>
              <span className="material-symbols-outlined text-[#c7c4d8] text-[32px]">group</span>
            </div>
            <div className="bg-[#e7eeff] rounded-xl border border-[#c7c4d8] p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#3525cd] uppercase font-bold mb-0.5">Đặc biệt</p>
                <p className="text-2xl font-bold text-[#3525cd]">{specialStudents.length}</p>
              </div>
              <span className="material-symbols-outlined text-[#3525cd]/40 text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            </div>
            <div className="bg-[#f0f3ff] rounded-xl border border-[#c7c4d8] p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#464555] uppercase font-bold mb-0.5">Sức khỏe</p>
                <p className="text-2xl font-bold text-[#464555]">{healthStudents.length}</p>
              </div>
              <span className="material-symbols-outlined text-[#c7c4d8] text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 px-2 mb-4">
          <div className="mt-4 px-2">
            <button
              onClick={onInitialArrangement}
              className="w-full py-3 bg-[#3525cd] text-white rounded-xl font-bold text-sm shadow-sm hover:shadow-lg transition-all active:scale-95"
            >
              Tự động sắp xếp sơ đồ
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-8" style={{ marginLeft: '260px' }}>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-[#111c2d] mb-1">Học sinh ưu tiên</h1>
            <p className="text-sm text-[#464555]">
              Quản lý và thiết lập các tiêu chí ưu tiên chỗ ngồi.
              {students.length > 0 && ` (${specialStudents.length + healthStudents.length}/${students.length} học sinh được ưu tiên)`}
            </p>
          </div>

          {/* Info Alert */}
          <div className="bg-[#e7eeff] border border-[#c7c4d8] p-4 rounded-xl flex gap-4 items-start">
            <span className="material-symbols-outlined text-[#3525cd]">info</span>
            <div>
              <p className="text-sm font-bold text-[#3525cd] mb-1">Thuật toán sắp xếp ưu tiên</p>
              <p className="text-sm text-[#5d6478] leading-relaxed">
                Nhóm <b>Đặc biệt</b> được xếp hàng 1 đầu tiên. Nhóm <b>Sức khỏe</b> (cận thị, chiều cao &lt;135cm) xếp kế tiếp.
                Cập nhật thông tin học sinh trong tab <b>Quản lý học sinh</b> để áp dụng.
              </p>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#777587]">
              <span className="material-symbols-outlined text-[64px] mb-4 text-[#c7c4d8]">group</span>
              <p className="text-lg font-medium mb-2">Chưa có danh sách học sinh</p>
              <p className="text-sm text-center max-w-xs">Nhập danh sách học sinh trong tab Sơ Đồ Lớp để bắt đầu.</p>
            </div>
          ) : (
            <>
              {/* Special students */}
              <section className="space-y-3">
                <div className="flex items-center gap-3 pb-2 border-b border-[#c7c4d8]">
                  <span className="material-symbols-outlined text-[#3525cd] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <h2 className="text-base font-bold text-[#111c2d]">Học sinh đặc biệt</h2>
                  <span className="ml-auto bg-[#e7eeff] text-[#3525cd] px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#c7c4d8]">
                    {specialStudents.length}
                  </span>
                </div>
                {specialStudents.length === 0 ? (
                  <p className="text-sm text-[#777587] italic py-2">Chưa có học sinh đặc biệt nào.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {specialStudents.map(s => <SpecialStudentCard key={s.id} student={s} />)}
                  </div>
                )}
              </section>

              {/* Health priority */}
              <section className="space-y-3">
                <div className="flex items-center gap-3 pb-2 border-b border-[#c7c4d8]">
                  <span className="material-symbols-outlined text-[#3525cd] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
                  <h2 className="text-base font-bold text-[#111c2d]">Ưu tiên sức khỏe</h2>
                  <span className="ml-auto bg-[#e7eeff] text-[#3525cd] px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#c7c4d8]">
                    {healthStudents.length}
                  </span>
                </div>
                {healthStudents.length === 0 ? (
                  <p className="text-sm text-[#777587] italic py-2">Chưa có học sinh thuộc nhóm ưu tiên sức khỏe.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {healthStudents.map(s => <HealthStudentCard key={s.id} student={s} />)}
                  </div>
                )}
              </section>

              {/* Normal students */}
              <section className="space-y-3">
                <div className="flex items-center gap-3 pb-2 border-b border-[#c7c4d8]">
                  <span className="material-symbols-outlined text-[#464555] text-[20px]">person</span>
                  <h2 className="text-base font-bold text-[#111c2d]">Học sinh thông thường</h2>
                  <span className="ml-auto bg-[#f0f3ff] text-[#464555] px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#c7c4d8]">
                    {normalCount}
                  </span>
                </div>
                <p className="text-sm text-[#464555]">
                  Những học sinh này sẽ được sắp xếp ngẫu nhiên vào các hàng còn lại sau khi đã ưu tiên các nhóm trên.
                </p>
              </section>
            </>
          )}
        </div>
      </main>

      {/* FAB */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={onInitialArrangement}
          className="flex items-center gap-3 bg-[#3a2cc1] text-white px-6 py-4 rounded-full shadow-2xl hover:scale-105 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_fix_high</span>
          <span className="text-sm font-bold">Tự động sắp xếp sơ đồ</span>
        </button>
      </div>
    </div>
  );
}

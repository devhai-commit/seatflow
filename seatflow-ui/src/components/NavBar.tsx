import type { ActiveTab } from '../types';

interface NavBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onLogout: () => void;
  onHelpClick: () => void;
}

export default function NavBar({ activeTab, onTabChange, onLogout, onHelpClick }: NavBarProps) {
  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'chart', label: 'Sơ đồ lớp học' },
    { id: 'priority', label: 'Học sinh ưu tiên' },
    { id: 'manager', label: 'Quản lý học sinh' },
  ];

  return (
    <nav
      className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 bg-white border-b border-[#c7c4d8] shadow-sm"
      style={{ height: '64px' }}
    >
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <img src="/seatflow_logo.png" alt="SeatFlow Logo" className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-2xl font-bold text-[#3525cd]">SeatFlow</span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
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

      <div className="flex items-center gap-4">
        <button
          onClick={onHelpClick}
          className="p-2 text-[#464555] hover:text-[#3525cd] transition-colors rounded-full hover:bg-[#f0f3ff]"
        >
          <span className="material-symbols-outlined">help</span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-[#c7c4d8]">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-[#111c2d]">Nguyễn Văn A</p>
            <p className="text-xs text-[#464555]">Giáo viên chủ nhiệm</p>
          </div>
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
  );
}

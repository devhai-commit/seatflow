
interface HelpModalProps {
  onClose: () => void;
}

export default function HelpModal({ onClose }: HelpModalProps) {
  const sections = [
    {
      icon: 'grid_view',
      title: 'Sơ đồ lớp học',
      content: 'Xem và chỉnh sửa sơ đồ chỗ ngồi. Sử dụng chế độ 2D/3D. Kéo thả để di chuyển học sinh giữa các bàn.',
    },
    {
      icon: 'auto_fix_high',
      title: 'Sắp xếp tự động',
      content: 'Bấm "Sắp Xếp Ban Đầu" để tạo sơ đồ mới. Hệ thống tự động ưu tiên học sinh đặc biệt và sức khỏe vào hàng đầu.',
    },
    {
      icon: 'star',
      title: 'Phân tổ',
      content: 'Bật "Phân tổ" để chia học sinh theo nhóm. Chọn cách sắp xếp: Ngang, Dọc hoặc Nhóm 4 người.',
    },
    {
      icon: 'priority_high',
      title: 'Học sinh ưu tiên',
      content: 'Quản lý danh sách học sinh cần ưu tiên chỗ ngồi: đặc biệt (sức khỏe, tâm lý) và sức khỏe (cận thị, chiều cao).',
    },
    {
      icon: 'person',
      title: 'Quản lý học sinh',
      content: 'Xem thông tin, theo dõi hành vi và tổng kết học kỳ của từng học sinh.',
    },
    {
      icon: 'download',
      title: 'Xuất dữ liệu',
      content: 'Xuất JSON để sao lưu toàn bộ dữ liệu. Xuất CSV để in sơ đồ chỗ ngồi.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#c7c4d8] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#3525cd] text-[28px]">help</span>
            <h2 className="text-xl font-bold text-[#111c2d]">Hướng dẫn sử dụng SeatFlow</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#464555] hover:text-[#111c2d] hover:bg-[#e7eeff] rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-[#e2dfff] border-l-4 border-[#3525cd] p-4 rounded-r-xl">
            <p className="text-sm text-[#0f0069]">
              <b>Đăng nhập:</b> Sử dụng tài khoản giáo viên được cấp. Tích "Ghi nhớ đăng nhập" để không phải đăng nhập lại.
            </p>
          </div>
          {sections.map(section => (
            <div key={section.title} className="flex items-start gap-4 p-4 bg-[#f0f3ff] rounded-xl">
              <div className="w-10 h-10 bg-[#3525cd] text-white rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">{section.icon}</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111c2d] mb-1">{section.title}</h3>
                <p className="text-sm text-[#464555]">{section.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-[#c7c4d8] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#3525cd] text-white rounded-lg font-medium text-sm hover:bg-[#3a2cc1] transition-colors"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}

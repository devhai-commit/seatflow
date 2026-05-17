import { useState } from 'react';

interface AddStudentModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (fullName: string) => Promise<void>;
}

export default function AddStudentModal({
  isOpen,
  isLoading,
  onClose,
  onSubmit,
}: AddStudentModalProps) {
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = fullName.trim();

    if (!trimmed) {
      setError('Vui lòng nhập tên học sinh');
      return;
    }

    try {
      setError('');
      await onSubmit(trimmed);
      setFullName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi thêm học sinh');
    }
  };

  const handleClose = () => {
    setFullName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-[#111c2d] mb-4">Thêm học sinh mới</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#464555] mb-2">
              Tên học sinh
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setError('');
              }}
              placeholder="Nhập tên học sinh"
              className="w-full px-3 py-2 border border-[#c7c4d8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3525cd] focus:border-transparent"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-[#c7c4d8] text-[#464555] hover:bg-[#f5f5f7] disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-[#3525cd] text-white hover:bg-[#2b1fa8] disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    loading
                  </span>
                  Đang thêm...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Thêm
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

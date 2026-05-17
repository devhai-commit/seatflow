import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (remembered: boolean) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      onLogin(remember);
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không đúng.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: '#f9f9ff' }}>
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full pointer-events-none" style={{ background: 'rgba(53,37,205,0.08)', filter: 'blur(120px)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full pointer-events-none" style={{ background: 'rgba(58,44,193,0.08)', filter: 'blur(150px)' }} />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full pointer-events-none" style={{ background: 'rgba(219,226,250,0.3)', filter: 'blur(100px)' }} />

      <main className="flex-grow flex items-center justify-center p-4 md:p-8 z-10">
        <div className="w-full max-w-[440px] bg-white rounded-xl shadow-2xl border border-[#c7c4d8] p-10 flex flex-col items-center">
          {/* Logo & Branding */}
          <div className="mb-8 text-center">
            <img src="/seatflow_logo.png" alt="SeatFlow Logo" className="h-20 w-auto mx-auto mb-6 object-contain" />
            <h1 className="text-2xl font-semibold text-[#3525cd] tracking-tight">Trường THCS Mường Thanh</h1>
            <p className="text-sm text-[#464555] mt-1">Điện Biên</p>
          </div>

          {/* Login Form */}
          <form className="w-full space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-center gap-2 p-3 bg-[#ffdad6] border border-[#ba1a1a]/30 rounded-lg text-[#93000a] text-sm">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#111c2d]" htmlFor="username">Tên đăng nhập</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777587] group-focus-within:text-[#3525cd] transition-colors">person</span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  className="w-full pl-10 pr-4 py-3 bg-[#f9f9ff] border border-[#c7c4d8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd] transition-all placeholder:text-[#c7c4d8]"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-[#111c2d]" htmlFor="password">Mật khẩu</label>
                <a href="#" className="text-xs text-[#3525cd] hover:underline">Quên mật khẩu?</a>
              </div>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777587] group-focus-within:text-[#3525cd] transition-colors">lock</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full pl-10 pr-12 py-3 bg-[#f9f9ff] border border-[#c7c4d8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd] transition-all placeholder:text-[#c7c4d8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777587] hover:text-[#111c2d] transition-colors"
                >
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-3">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-[#c7c4d8] accent-[#3525cd]"
              />
              <label htmlFor="remember" className="text-sm text-[#464555] cursor-pointer select-none">Ghi nhớ đăng nhập</label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-4 bg-[#3525cd] text-white rounded-lg text-lg font-semibold shadow-sm hover:bg-[#3a2cc1] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Đăng nhập
              <span className="material-symbols-outlined text-[20px]">login</span>
            </button>
          </form>

          {/* Footer divider */}
          <div className="mt-8 w-full">
            <div className="relative flex items-center mb-8">
              <div className="flex-grow border-t border-[#c7c4d8]"></div>
              <span className="flex-shrink mx-4 text-xs text-[#777587]">Hệ thống SeatFlow</span>
              <div className="flex-grow border-t border-[#c7c4d8]"></div>
            </div>
            <button className="flex items-center justify-center gap-3 w-full py-2.5 border border-[#c7c4d8] rounded-lg text-sm font-medium text-[#111c2d] hover:bg-[#d8e3fb] transition-colors">
              <span className="material-symbols-outlined">help</span>
              Hướng dẫn sử dụng
            </button>
          </div>
        </div>
      </main>

      <footer className="py-4 px-8 text-center z-10">
        <p className="text-xs text-[#464555]/60">
          © 2025 Bản quyền thuộc về Trường THCS Mường Thanh. Hệ thống quản lý chỗ ngồi SeatFlow.
        </p>
      </footer>

      {/* Decorative grid bottom-right */}
      <div className="fixed bottom-10 right-10 hidden lg:block opacity-10 select-none pointer-events-none">
        <div className="grid grid-cols-3 gap-4">
          {['bg-[#3525cd]','bg-[#575e72]','bg-[#3a2cc1]','bg-[#575e72]','bg-[#3525cd]','bg-[#575e72]','bg-[#3a2cc1]','bg-[#575e72]','bg-[#3525cd]'].map((c, i) => (
            <div key={i} className={`w-12 h-12 rounded-lg ${c}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

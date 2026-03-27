import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LayoutDashboard, Users, Clock, Settings, LogOut,
  FileText, CheckSquare, Banknote, MessageCircle, CalendarDays, Key, X, Loader2
} from 'lucide-react';
import { API_BASE } from '../apiConfig';
// Import các trang từ thư mục pages
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { ConfigPage } from './pages/Config';
import { Tasks } from './pages/Tasks';
import { Leaves } from './pages/Leaves';
import { Payroll } from './pages/Payroll';
import AttendanceMonthly from './pages/AttendanceMonthly';
import Chat from './pages/Chat';
import Login from './pages/Login';

// Import component chuông thông báo
import { NotificationBell } from './pages/NotificationBell';



function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCheckingLogin, setIsCheckingLogin] = useState(true);

  // Mặc định tab ban đầu
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('lastActiveTab') || 'dashboard';
  });
  const [data, setData] = useState<any[]>([]);

  // ==========================================
  // STATE CHO MODAL ĐỔI MẬT KHẨU
  // ==========================================
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);



  // 2. Cái useEffect sếp vừa gửi (Giữ nguyên để check Login)
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    // Đoạn check savedTab ở đây có cũng được, không có cũng không sao 
    // vì mình đã làm ở bước khởi tạo useState bên trên rồi.
    setIsCheckingLogin(false);
  }, []);

  // 3. THÊM CÁI NÀY VÀO (QUAN TRỌNG NHẤT)
  useEffect(() => {
    localStorage.setItem('lastActiveTab', activeTab);
  }, [activeTab]);

  const handleLogin = (userData: any) => {
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setCurrentUser(userData);
  };

  const handleLogout = () => {
    if (window.confirm("Sếp có chắc chắn muốn đăng xuất không?")) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('lastActiveTab');
      setCurrentUser(null);
      setActiveTab('dashboard');
    }
  };

  // ==========================================
  // HÀM XỬ LÝ ĐỔI MẬT KHẨU
  // ==========================================
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Vui lòng điền đầy đủ các trường!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu mới không khớp nhau!');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await axios.put(`${API_BASE}/api/admin/change-password`, {
        username: currentUser.username, // Lấy username từ state đăng nhập
        oldPassword,
        newPassword
      });

      setPasswordSuccess(response.data.message || 'Đổi mật khẩu thành công!');

      // Đợi 1.5s rồi tự động đóng form và clear data
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess('');
      }, 1500);

    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Lỗi khi đổi mật khẩu!');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // FETCH DATA DASHBOARD
  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_BASE}/attendance`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (Array.isArray(res.data)) {
          setData(res.data);
        } else {
          setData([]);
        }
      } catch (err) {
        setData([]);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  if (isCheckingLogin) return <div className="h-screen w-screen flex items-center justify-center bg-[#F1F5F9]">Đang tải...</div>;

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-screen bg-[#F8FAFC] font-sans text-slate-700 overflow-hidden relative">

      {/* SIDEBAR */}
      <aside className="w-64 h-full bg-[#1E293B] text-slate-300 flex flex-col shrink-0 shadow-2xl">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Settings size={18} color="white" />
            </div>
            <span className="font-bold text-white text-xl tracking-tight">HRM PRO</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Chính</p>
          <MenuBtn icon={<LayoutDashboard size={18} />} label="Tổng quan" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <MenuBtn icon={<Users size={18} />} label="Nhân viên" active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
          <MenuBtn icon={<CalendarDays size={18} />} label="Bảng công tháng" active={activeTab === 'monthly-attendance'} onClick={() => setActiveTab('monthly-attendance')} />

          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6">Quản lý nội bộ</p>
          <MenuBtn icon={<MessageCircle size={18} />} label="Chat Box" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
          <MenuBtn icon={<CheckSquare size={18} />} label="Nhiệm vụ" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
          <MenuBtn icon={<FileText size={18} />} label="Nghỉ phép" active={activeTab === 'leaves'} onClick={() => setActiveTab('leaves')} />
          <MenuBtn icon={<Banknote size={18} />} label="Bảng lương" active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} />

          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6">Hệ thống</p>
          <MenuBtn icon={<Clock size={18} />} label="Cấu hình" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
        </nav>

        {/* KHU VỰC USER TRONG SIDEBAR */}
        <div className="p-4 border-t border-slate-700/50 bg-[#0F172A]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-blue-400">
              {currentUser.username ? currentUser.username.substring(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-tight">{currentUser.name || 'Quản trị viên'}</span>
              <span className="text-[10px] text-slate-500">{currentUser.role || 'Administrator'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* NÚT MỞ POPUP ĐỔI MẬT KHẨU */}
            <button
              onClick={() => setIsChangePasswordOpen(true)}
              className="text-slate-500 hover:text-blue-400 transition-colors cursor-pointer p-1 rounded-md hover:bg-slate-800"
              title="Đổi mật khẩu"
            >
              <Key size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer p-1 rounded-md hover:bg-slate-800"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
          <h2 className="font-bold text-lg text-slate-800">
            {activeTab === 'dashboard' && "Bảng điều khiển tổng quan"}
            {activeTab === 'employees' && "Quản lý nhân sự"}
            {activeTab === 'monthly-attendance' && "Thống kê chuyên cần theo tháng"}
            {activeTab === 'chat' && "Trò chuyện & Hỗ trợ"}
            {activeTab === 'tasks' && "Theo dõi nhiệm vụ"}
            {activeTab === 'leaves' && "Phê duyệt nghỉ phép"}
            {activeTab === 'payroll' && "Quản lý lương & thưởng"}
            {activeTab === 'config' && "Thiết lập hệ thống"}
          </h2>

          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-[#F1F5F9]">
          <div className="max-w-[1600px] mx-auto">
            {activeTab === 'dashboard' && <Dashboard data={data} />}
            {activeTab === 'employees' && <Employees />}
            {activeTab === 'monthly-attendance' && <AttendanceMonthly />}
            {activeTab === 'chat' && <Chat />}
            {activeTab === 'config' && <ConfigPage />}
            {activeTab === 'tasks' && <Tasks />}
            {activeTab === 'leaves' && <Leaves />}
            {activeTab === 'payroll' && <Payroll />}
          </div>
        </main>
      </div>

      {/* ========================================== */}
      {/* POPUP (MODAL) ĐỔI MẬT KHẨU */}
      {/* ========================================== */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Key size={18} className="text-blue-600" />
                Đổi mật khẩu Admin
              </h3>
              <button
                onClick={() => setIsChangePasswordOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-green-50 text-green-600 text-sm rounded-xl border border-green-100 flex items-center">
                  {passwordSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  placeholder="Nhập mật khẩu đang sử dụng"
                  disabled={isChangingPassword}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  placeholder="Nhập mật khẩu mới"
                  disabled={isChangingPassword}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  placeholder="Nhập lại mật khẩu mới"
                  disabled={isChangingPassword}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  disabled={isChangingPassword}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isChangingPassword ? <Loader2 size={16} className="animate-spin" /> : null}
                  {isChangingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// MenuBtn component
const MenuBtn = ({ icon, label, active, onClick, disabled }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group cursor-pointer ${active
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
      : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
  >
    <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}>
      {icon}
    </span>
    <span className="text-sm font-medium flex-1 text-left">{label}</span>
  </button>
);

export default App;
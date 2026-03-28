import React, { useState } from 'react';
import axios from 'axios';
import { Settings, User, Lock, Loader2 } from 'lucide-react';
import { API_BASE } from '../../apiConfig';

export default function Login({ onLogin }: { onLogin: (userData: any) => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_BASE}/api/admin/login`, {
                username,
                password
            });

            if (response.data && response.data.data) {
                const userData = response.data.data;
                onLogin(userData);
            }
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || 'Tài khoản hoặc mật khẩu không chính xác!';
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="flex h-screen w-screen items-center justify-center font-sans relative overflow-hidden px-4 sm:px-0"
            style={{
                // Ảnh nền chủ đề nhân sự, văn phòng, làm việc nhóm
                backgroundImage: `url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            {/* Lớp phủ mờ màu tối giúp Form đăng nhập nổi bật lên */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[4px]"></div>

            {/* Form đăng nhập (Có hiệu ứng kính mờ glassmorphism) */}
            <div className="bg-white/95 p-6 sm:p-8 md:p-10 rounded-[24px] md:rounded-[32px] shadow-2xl w-full max-w-md border border-white/20 z-10 backdrop-blur-xl transform transition-all duration-300 md:hover:-translate-y-1">
                <div className="flex flex-col items-center mb-6 md:mb-8">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40 mb-3 md:mb-4">
                        <Settings size={24} className="md:w-7 md:h-7 text-white" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">HRM PRO</h1>
                    <p className="text-slate-500 text-xs md:text-sm mt-1 md:mt-1.5 font-medium uppercase tracking-widest">Hệ Thống Quản Lý</p>
                </div>

                {error && (
                    <div className="mb-5 p-3.5 md:p-4 bg-red-50 text-red-600 text-[13px] md:text-sm rounded-xl md:rounded-2xl border border-red-100 text-center animate-pulse font-bold shadow-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                    <div>
                        <label className="block text-[13px] md:text-sm font-bold text-slate-700 mb-1.5 ml-1">Tài khoản Quản trị</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-400">
                                <User size={18} className="md:w-5 md:h-5" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-11 pr-4 py-3.5 md:py-4 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-[14px] md:text-[15px] font-medium outline-none transition-all bg-slate-50 hover:bg-slate-100 focus:bg-white placeholder-slate-400"
                                placeholder="Nhập tên đăng nhập..."
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[13px] md:text-sm font-bold text-slate-700 mb-1.5 ml-1">Mật khẩu</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-400">
                                <Lock size={18} className="md:w-5 md:h-5" />
                            </div>
                            <input
                                type="password"
                                className="block w-full pl-11 pr-4 py-3.5 md:py-4 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-[14px] md:text-[15px] font-medium outline-none transition-all bg-slate-50 hover:bg-slate-100 focus:bg-white placeholder-slate-400"
                                placeholder="Nhập mật khẩu..."
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="pt-2 md:pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center gap-2 py-3.5 md:py-4 px-4 rounded-xl md:rounded-2xl shadow-lg shadow-blue-500/30 text-[14px] md:text-[15px] font-black text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Đang xác thực...</span>
                                </>
                            ) : (
                                <span>Đăng nhập hệ thống</span>
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-6 md:mt-8 text-center">
                    <p className="text-[11px] md:text-xs text-slate-400 font-medium">© {new Date().getFullYear()} HRM PRO. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
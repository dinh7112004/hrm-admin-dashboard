import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Bell, Clock, CalendarDays, Info,
    CheckSquare, MessageSquare, BellOff
} from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../apiConfig';

const formatRelativeTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMs = now.getTime() - past.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 1) return "Vừa xong";
    if (diffInMins < 60) return `${diffInMins} phút trước`;
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    if (diffInDays === 1) return "Hôm qua";
    return past.toLocaleDateString('vi-VN');
};

export const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    // Thêm left vào state để xử lý Responsive trên Mobile
    const [coords, setCoords] = useState<{ top: number; right: number | 'auto'; left: number | 'auto' }>({ top: 0, right: 0, left: 'auto' });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Tính toán vị trí thông minh hơn cho Mobile vs Desktop
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const isMobile = window.innerWidth < 640; // Điểm ngắt sm của Tailwind

            if (isMobile) {
                // Trên Mobile: Trải rộng gần hết màn hình, cách 2 bên 12px
                setCoords({
                    top: rect.bottom + window.scrollY + 8,
                    right: 12,
                    left: 12
                });
            } else {
                // Trên Desktop: Bám theo mép phải của cái chuông
                setCoords({
                    top: rect.bottom + window.scrollY + 12,
                    right: window.innerWidth - rect.right - window.scrollX,
                    left: 'auto'
                });
            }
        }
    }, [isOpen]);

    // Lắng nghe resize để cập nhật lại vị trí nếu xoay màn hình
    useEffect(() => {
        const handleResize = () => setIsOpen(false);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(`${API_BASE}/notifications/admin`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (Array.isArray(res.data)) {
                const sortedData = res.data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setNotifications(sortedData);
            }
        } catch (err) {
            console.error("Lỗi lấy thông báo Admin:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleReadNotification = async (id: string, isRead: boolean) => {
        if (isRead) return;
        try {
            await axios.patch(`${API_BASE}/notifications/${id}/read`, {}, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error("Lỗi đánh dấu đã đọc:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await axios.patch(`${API_BASE}/notifications/admin/read-all`, {}, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error("Lỗi đánh dấu tất cả:", error);
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const getNotificationStyle = (type: string) => {
        switch (type) {
            case 'ATTENDANCE':
                return { icon: <Clock size={16} />, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', label: 'ĐIỂM DANH' };
            case 'LEAVE':
                return { icon: <CalendarDays size={16} />, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', label: 'NGHỈ PHÉP' };
            case 'CHAT':
                return { icon: <MessageSquare size={16} />, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', label: 'TIN NHẮN' };
            case 'TASK':
                return { icon: <CheckSquare size={16} />, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', label: 'CÔNG VIỆC' };
            default:
                return { icon: <Info size={16} />, bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', label: 'HỆ THỐNG' };
        }
    };

    const NotificationContent = (
        <div
            ref={dropdownRef}
            style={{
                position: 'absolute',
                top: `${coords.top}px`,
                right: coords.right === 'auto' ? 'auto' : `${coords.right}px`,
                left: coords.left === 'auto' ? 'auto' : `${coords.left}px`,
                zIndex: 999999
            }}
            // Thay đổi w-[420px] thành responsive size
            className="sm:w-[420px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Header */}
            <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                    <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Thông báo</h4>
                    <p className="text-[11px] sm:text-xs font-bold text-slate-500 mt-0.5">Bạn có {unreadCount} tin mới chưa đọc</p>
                </div>
                {unreadCount > 0 && (
                    <button onClick={handleMarkAllAsRead} className="text-[11px] sm:text-xs font-black text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg active:scale-95 transition-all">
                        Đọc tất cả
                    </button>
                )}
            </div>

            {/* List */}
            {/* Chỉnh lại max-height cho mobile để không bị quá dài */}
            <div className="max-h-[60vh] sm:max-h-[480px] overflow-y-auto bg-white custom-scrollbar">
                {notifications.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {notifications.map((notif) => {
                            const style = getNotificationStyle(notif.type);
                            return (
                                <div
                                    key={notif._id}
                                    onClick={() => handleReadNotification(notif._id, notif.isRead)}
                                    className={`relative p-4 sm:p-5 transition-all flex gap-3 sm:gap-4 hover:bg-slate-50 cursor-pointer ${!notif.isRead ? 'bg-blue-50/60' : 'bg-white'}`}
                                >
                                    <div className={`mt-0.5 h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl ${style.bg} ${style.text} border ${style.border} flex items-center justify-center shadow-sm`}>
                                        {style.icon}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${style.text}`}>{style.label}</span>
                                            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold">{formatRelativeTime(notif.createdAt)}</span>
                                        </div>
                                        <p className={`text-[13px] sm:text-sm leading-snug ${!notif.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-600'}`}>{notif.title}</p>
                                        <p className={`text-[11px] sm:text-xs leading-relaxed line-clamp-2 ${!notif.isRead ? 'text-slate-700' : 'text-slate-500'}`}>{notif.message}</p>
                                    </div>
                                    {!notif.isRead && (
                                        <div className="absolute top-5 sm:top-6 right-2 sm:right-3 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="py-16 sm:py-20 text-center px-4">
                        <BellOff size={36} className="mx-auto text-slate-300 mb-3 sm:mb-4 sm:w-10 sm:h-10" />
                        <h5 className="font-bold text-slate-600 text-sm">Chưa có thông báo nào</h5>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-2.5 sm:p-3 border-t border-slate-100 bg-slate-50/50 text-center">
                <button className="text-[10px] sm:text-[11px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest active:scale-95 transition-all p-1">
                    Xem tất cả báo cáo
                </button>
            </div>
        </div>
    );

    return (
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 md:p-2.5 rounded-xl transition-all focus:outline-none active:scale-95 ${isOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
                <Bell className={`w-5 h-5 md:w-6 md:h-6 ${unreadCount > 0 ? "animate-wiggle" : ""}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 md:top-2 md:right-2 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full bg-rose-500 text-[9px] md:text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Đây là nơi phép màu xảy ra: Bắn popup ra ngoài body */}
            {isOpen && createPortal(NotificationContent, document.body)}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                @media (min-width: 640px) {
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
                @keyframes wiggle {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(8deg); }
                    75% { transform: rotate(-8deg); }
                }
                .animate-wiggle { animation: wiggle 0.6s ease-in-out infinite; }
            `}</style>
        </div>
    );
};
// src/pages/Leaves.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../../apiConfig';
import { CalendarDays, CheckCircle2, FileText, XCircle, Clock, Calendar, User, FileImage } from 'lucide-react';

interface UserData { name: string; }
interface Leave {
    _id: string;
    userId: UserData;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    evidence?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export const Leaves = () => {
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Hàm xử lý link ảnh thông minh
    const getFullImageUrl = (path: string | undefined) => {
        if (!path) return "";
        if (path.startsWith('http')) return path;

        // Loại bỏ dấu / ở cuối API_BASE nếu có
        const baseUrl = API_BASE.replace(/\/$/, "");

        // Đảm bảo path bắt đầu bằng dấu /
        const cleanPath = path.startsWith('/') ? path : `/${path}`;

        return `${baseUrl}${cleanPath}`;
    };

    const fetchLeaves = async () => {
        try {
            const res = await axios.get(`${API_BASE}/leaves`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'Accept': 'application/json'
                }
            });
            setLeaves(res.data);
        } catch (error) {
            console.error("Lỗi tải danh sách:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, []);

    const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        if (!window.confirm(`Bạn có chắc muốn ${status === 'APPROVED' ? 'DUYỆT' : 'TỪ CHỐI'} đơn này?`)) return;
        try {
            await axios.patch(`${API_BASE}/leaves/${id}/status`,
                { status },
                { headers: { 'ngrok-skip-browser-warning': 'true' } }
            );
            alert("Đã cập nhật trạng thái!");
            fetchLeaves();
        } catch (error) {
            alert("Lỗi cập nhật. Hãy kiểm tra lại server.");
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-slate-500 font-bold text-sm uppercase tracking-widest animate-pulse">Đang tải danh sách...</div>
        </div>
    );

    return (
        <div className="p-3 md:p-8 space-y-4 md:space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 bg-[#F9FAFB] min-h-screen">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2 md:gap-3">
                        <div className="p-2 md:p-3 bg-indigo-600 rounded-xl md:rounded-2xl text-white shadow-lg shrink-0">
                            <CalendarDays size={20} className="md:w-6 md:h-6" />
                        </div>
                        Quản lý nghỉ phép
                    </h1>
                    <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-2">
                        Tổng cộng: {leaves.length} đơn yêu cầu
                    </p>
                </div>
            </div>

            {/* CONTAINER CHÍNH */}
            <div className="bg-white rounded-[20px] md:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                {/* 1. GIAO DIỆN MOBILE (Dạng Card - Ẩn trên màn hình vừa/lớn) */}
                <div className="block md:hidden divide-y divide-slate-100">
                    {leaves.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-medium">Không có đơn nghỉ phép nào</div>
                    ) : (
                        leaves.map((item) => (
                            <div key={item._id} className="p-4 space-y-4 hover:bg-slate-50/50 transition-colors">
                                {/* Dòng 1: Header (Tên & Trạng thái) */}
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xs shrink-0">
                                            {(item.userId?.name || "U").charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm leading-tight">
                                                {item.userId?.name || <span className="text-slate-400 italic">Ẩn danh</span>}
                                            </p>
                                            <span className="inline-block mt-1 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                {item.leaveType}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                        item.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                        {item.status === 'APPROVED' ? 'Đã duyệt' : item.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                                    </span>
                                </div>

                                {/* Dòng 2: Thời gian & Lý do */}
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                                        <Calendar size={12} className="text-indigo-400 shrink-0" />
                                        <span>{item.startDate} <span className="text-slate-400 font-normal px-1">đến</span> {item.endDate}</span>
                                    </div>
                                    <div className="flex items-start gap-2 text-[11px] text-slate-600">
                                        <FileText size={12} className="text-indigo-400 shrink-0 mt-0.5" />
                                        <p className="line-clamp-2 leading-relaxed">{item.reason}</p>
                                    </div>
                                </div>

                                {/* Dòng 3: Minh chứng & Hành động */}
                                <div className="flex justify-between items-center pt-1">
                                    <div className="shrink-0">
                                        {item.evidence ? (
                                            <a href={getFullImageUrl(item.evidence)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100">
                                                <FileImage size={12} /> Xem minh chứng
                                            </a>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">Không có ảnh</span>
                                        )}
                                    </div>

                                    {item.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleUpdateStatus(item._id, 'REJECTED')} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 active:scale-95 transition-all">
                                                <XCircle size={16} />
                                            </button>
                                            <button onClick={() => handleUpdateStatus(item._id, 'APPROVED')} className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500 text-white shadow-md hover:bg-emerald-600 active:scale-95 transition-all">
                                                <CheckCircle2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* 2. GIAO DIỆN DESKTOP/TABLET (Dạng Table - Ẩn trên Mobile) */}
                <table className="w-full border-collapse text-left hidden md:table">
                    <thead className="bg-slate-50/50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Nhân viên</th>
                            <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Loại nghỉ</th>
                            <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Thời gian</th>
                            <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Lý do</th>
                            <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">Minh chứng</th>
                            <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Trạng thái</th>
                            <th className="p-4 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {leaves.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-slate-400 font-medium">Không có đơn nghỉ phép nào</td>
                            </tr>
                        ) : (
                            leaves.map((item) => (
                                <tr key={item._id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                                                {(item.userId?.name || "U").charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">
                                                {item.userId?.name || <span className="text-slate-400 italic font-normal">Ẩn danh</span>}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        <span className="bg-slate-100 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-600">
                                            {item.leaveType}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs text-slate-500">
                                        <div className="font-bold text-slate-700 flex items-center gap-1.5"><Calendar size={12} /> {item.startDate}</div>
                                        <div className="text-slate-400 italic text-[10px] my-0.5 ml-4">đến</div>
                                        <div className="font-bold text-slate-700 flex items-center gap-1.5"><Clock size={12} /> {item.endDate}</div>
                                    </td>
                                    <td className="p-4 text-xs font-medium text-slate-600 max-w-[200px]">
                                        <p className="truncate" title={item.reason}>{item.reason}</p>
                                    </td>
                                    <td className="p-4 flex justify-center">
                                        {item.evidence ? (
                                            <a
                                                href={getFullImageUrl(item.evidence)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block w-10 h-10 rounded-lg border border-slate-200 overflow-hidden hover:ring-2 ring-indigo-500 transition-all shadow-sm bg-slate-50"
                                            >
                                                <img
                                                    src={getFullImageUrl(item.evidence)}
                                                    className="w-full h-full object-cover"
                                                    alt="evidence"
                                                    onError={(e) => {
                                                        const target = e.currentTarget;
                                                        target.onerror = null;
                                                        target.src = "https://placehold.co/100x100/f1f5f9/94a3b8?text=Loi";
                                                    }}
                                                />
                                            </a>
                                        ) : (
                                            <span className="text-[10px] text-slate-300 italic font-medium">Trống</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                            item.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                'bg-amber-50 text-amber-600 border border-amber-100'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {item.status === 'PENDING' ? (
                                            <div className="flex gap-2 justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleUpdateStatus(item._id, 'APPROVED')}
                                                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-sm flex items-center gap-1"
                                                >
                                                    <CheckCircle2 size={14} /> Duyệt
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(item._id, 'REJECTED')}
                                                    className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all active:scale-95 flex items-center gap-1"
                                                >
                                                    <XCircle size={14} /> Từ chối
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">Đã xử lý</div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
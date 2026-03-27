// src/pages/Leaves.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../../apiConfig';
interface User { name: string; }
interface Leave {
    _id: string;
    userId: User;
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

    if (loading) return <div className="p-8 text-slate-500 font-medium text-center italic">Đang tải danh sách nghỉ phép...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full border-collapse text-left">
                <thead className="bg-slate-50/50 border-b border-slate-200">
                    <tr>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Nhân viên</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Loại nghỉ</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Thời gian</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Lý do</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Minh chứng</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Trạng thái</th>
                        <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase">Hành động</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {leaves.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="p-12 text-center text-slate-400">Không có đơn nghỉ phép nào</td>
                        </tr>
                    ) : (
                        leaves.map((item) => (
                            <tr key={item._id} className="hover:bg-slate-50/30 transition-colors">
                                <td className="p-4 text-sm font-semibold text-slate-700">
                                    {item.userId?.name || <span className="text-slate-400 italic">Ẩn danh</span>}
                                </td>
                                <td className="p-4 text-sm text-slate-600">
                                    <span className="bg-slate-100 px-2 py-1 rounded text-[11px] font-medium">
                                        {item.leaveType}
                                    </span>
                                </td>
                                <td className="p-4 text-[11px] text-slate-500">
                                    <div className="font-medium text-slate-700">{item.startDate}</div>
                                    <div className="text-slate-400 italic">đến</div>
                                    <div className="font-medium text-slate-700">{item.endDate}</div>
                                </td>
                                <td className="p-4 text-sm text-slate-600 max-w-[180px] truncate" title={item.reason}>
                                    {item.reason}
                                </td>
                                <td className="p-4 flex justify-center">
                                    {item.evidence ? (
                                        <a
                                            href={getFullImageUrl(item.evidence)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block w-12 h-12 rounded-lg border border-slate-200 overflow-hidden hover:ring-2 ring-blue-500 transition-all shadow-sm bg-slate-50"
                                        >
                                            <img
                                                src={getFullImageUrl(item.evidence)}
                                                className="w-full h-full object-cover"
                                                alt="evidence"
                                                // Đã bỏ crossOrigin để tránh lỗi Ngrok chặn
                                                onError={(e) => {
                                                    const target = e.currentTarget;
                                                    console.error("Lỗi tải ảnh tại:", target.src);
                                                    target.onerror = null; // Ngăn lặp vô tận
                                                    target.src = "https://placehold.co/100x100/f1f5f9/94a3b8?text=Error";
                                                }}
                                            />
                                        </a>
                                    ) : (
                                        <span className="text-[10px] text-slate-300 italic">Trống</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                        item.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {item.status === 'PENDING' ? (
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={() => handleUpdateStatus(item._id, 'APPROVED')}
                                                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-sm shadow-blue-200"
                                            >
                                                Duyệt
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(item._id, 'REJECTED')}
                                                className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all active:scale-95"
                                            >
                                                Từ chối
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
    );
};
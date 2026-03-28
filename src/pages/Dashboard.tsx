import React, { useState, useEffect } from 'react';
import { Users, Clock, Bell, CalendarDays, ShieldCheck, MoreVertical, MapPin, Info, X, CheckCircle, MessageSquare, UserX, CalendarOff, ChevronRight, Sparkles, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../apiConfig';

// Hàm xử lý link ảnh thông minh
const getFullImageUrl = (path: string | undefined) => {
    if (!path) return "";
    if (path.startsWith('http')) return path;
    const baseUrl = API_BASE.replace(/\/$/, "");
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
};

// --- COMPONENT THẺ THỐNG KÊ ---
const StatCard = ({ title, value, sub, icon, color, onClick }: any) => {
    const theme: any = {
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'group-hover:border-blue-300', shadow: 'group-hover:shadow-blue-500/20', glow: 'from-blue-600/5' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'group-hover:border-emerald-300', shadow: 'group-hover:shadow-emerald-500/20', glow: 'from-emerald-600/5' },
        rose: { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'group-hover:border-rose-300', shadow: 'group-hover:shadow-rose-500/20', glow: 'from-rose-600/5' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'group-hover:border-amber-300', shadow: 'group-hover:shadow-amber-500/20', glow: 'from-amber-600/5' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'group-hover:border-purple-300', shadow: 'group-hover:shadow-purple-500/20', glow: 'from-purple-600/5' }
    };

    const current = theme[color];

    return (
        <div
            onClick={onClick}
            className={`group relative overflow-hidden bg-white p-6 rounded-[24px] border border-slate-100 flex items-center gap-5 transition-all duration-500 ease-out shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] ${onClick ? `cursor-pointer hover:-translate-y-1.5 hover:shadow-xl ${current.border} ${current.shadow}` : ''}`}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${current.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            <div className={`relative z-10 p-4 rounded-2xl ${current.bg} ${current.text} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                {icon}
            </div>
            <div className="relative z-10 flex-1">
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h4 className="text-3xl font-black text-slate-800 tracking-tight">
                        {value < 10 && value > 0 ? `0${value}` : value}
                    </h4>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">{sub}</p>
            </div>

            {onClick && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all duration-300 text-slate-300">
                    <ChevronRight size={20} />
                </div>
            )}
        </div>
    );
}

export const Dashboard = ({ data, refreshData }: { data: any[], refreshData?: () => void }) => {
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [adminReplyText, setAdminReplyText] = useState("");

    const [filterDate, setFilterDate] = useState(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [leavesData, setLeavesData] = useState<any[]>([]);
    const [activeListType, setActiveListType] = useState<string | null>(null);

    // 1. STATE LƯU CẤU HÌNH GIỜ GIẤC TỪ DB
    const [sysConfig, setSysConfig] = useState({ startTime: '08:00', endTime: '17:00' });

    const fetchExtraData = async () => {
        try {
            const [usersRes, leavesRes, configRes] = await Promise.all([
                axios.get(`${API_BASE}/users`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                axios.get(`${API_BASE}/leaves`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                // 2. GỌI API LẤY CẤU HÌNH
                axios.get(`${API_BASE}/config`, { headers: { 'ngrok-skip-browser-warning': 'true' } }).catch(() => null)
            ]);

            setAllUsers(usersRes.data || []);
            setLeavesData(leavesRes.data || []);

            // 3. CẬP NHẬT GIỜ THEO CẤU HÌNH NESTJS
            if (configRes && configRes.data) {
                setSysConfig({
                    startTime: configRes.data.startTime || '08:00',
                    endTime: configRes.data.endTime || '17:00'
                });
            }
        } catch (err) { console.error("Lỗi lấy dữ liệu phụ trợ", err); }
    };

    useEffect(() => {
        fetchExtraData();
    }, []);

    // ==========================================
    // XỬ LÝ LỌC DỮ LIỆU
    // ==========================================

    const filteredAttendance = data.filter((item: any) => {
        if (!filterDate) return true;
        const dateObj = new Date(item.createdAt);
        const itemDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        return itemDateStr === filterDate;
    });

    const parseDateSafe = (dateStr: string) => {
        if (!dateStr) return new Date(NaN);
        const cleanDateStr = dateStr.split('T')[0].split(' ')[0];
        if (cleanDateStr.includes('/')) {
            const [day, month, year] = cleanDateStr.split('/');
            return new Date(Number(year), Number(month) - 1, Number(day));
        }
        const parts = cleanDateStr.split('-');
        if (parts.length === 3 && parts[0].length <= 2) {
            return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
        return new Date(cleanDateStr);
    };

    const leaveRecords = leavesData.filter((leave: any) => {
        if (!filterDate) return true;
        const target = new Date(filterDate);
        target.setHours(0, 0, 0, 0);
        const start = parseDateSafe(leave.startDate);
        const end = parseDateSafe(leave.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
        return target.getTime() >= start.getTime() && target.getTime() <= end.getTime();
    });

    const displayTableData = [...filteredAttendance].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const workingRecords = filteredAttendance.filter((item: any) => item.type !== 'LEAVE' && item.status !== 'LEAVE');

    // 4. LOGIC ĐI MUỘN ĐỘNG THEO SYSCONFIG
    const [configHour, configMinute] = sysConfig.startTime.split(':').map(Number);
    const lateRecords = workingRecords.filter((item: any) => {
        if (!item.checkInTime) return false;
        const checkInDate = new Date(item.checkInTime);
        const h = checkInDate.getHours();
        const m = checkInDate.getMinutes();

        return h > configHour || (h === configHour && m > configMinute);
    });

    const userIdsWithAttendance = new Set(filteredAttendance.map(item => item.userId?._id || item.userId));
    const absentUsersList = allUsers.filter(user => !userIdsWithAttendance.has(user._id));

    const pendingAttendanceCount = data.filter(item => item.status === 'PENDING').length;
    const pendingLeavesCount = leavesData.filter(item => item.status === 'PENDING').length;
    const totalPending = pendingAttendanceCount + pendingLeavesCount;

    // ==========================================
    // XỬ LÝ API PHÊ DUYỆT
    // ==========================================

    const handleApproveAll = async () => {
        if (!window.confirm("Duyệt toàn bộ các yêu cầu đang chờ?")) return;
        try {
            await axios.put(`${API_BASE}/attendance/approve-all`);
            alert("Đã duyệt toàn bộ thành công!");
            if (refreshData) refreshData();
            fetchExtraData();
        } catch (err) { alert("Lỗi khi duyệt yêu cầu!"); }
    };

    const handleApproveSingle = async (record: any, statusToUpdate: 'APPROVED' | 'REJECTED' = 'APPROVED') => {
        try {
            await axios.put(`${API_BASE}/attendance/${record._id}/approve`, { reply: adminReplyText });
            alert("Đã duyệt điểm danh và gửi lời nhắn!");
            if (refreshData) refreshData();
            setSelectedRecord(null);
            setAdminReplyText("");
        } catch (err) { alert("Lỗi khi xử lý duyệt!"); }
    }

    const getModalConfig = () => {
        switch (activeListType) {
            case 'TOTAL': return { title: 'Tổng nhân sự', data: allUsers, color: 'blue', icon: <Users size={22} />, isUserOnly: true };
            case 'WORKING': return { title: 'Đang đi làm', data: workingRecords, color: 'emerald', icon: <Clock size={22} />, isUserOnly: false };
            case 'LATE': return { title: 'Danh sách đi muộn', data: lateRecords, color: 'rose', icon: <Bell size={22} />, isUserOnly: false };
            case 'LEAVE': return { title: 'Nghỉ phép (Có đơn)', data: leaveRecords, color: 'purple', icon: <CalendarDays size={22} />, isUserOnly: false };
            case 'ABSENT': return { title: 'Chưa điểm danh', data: absentUsersList, color: 'amber', icon: <UserX size={22} />, isUserOnly: true };
            default: return null;
        }
    };

    const modalConfig = getModalConfig();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 relative max-w-[1600px] mx-auto pb-10">

            {/* Header Banner */}
            <div className={`relative overflow-hidden rounded-[24px] p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-500 ${totalPending > 0 ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 shadow-2xl shadow-blue-500/20' : 'bg-white border border-slate-200 shadow-sm'}`}>
                {totalPending > 0 && (
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
                )}
                <div className="relative z-10">
                    <h3 className={`text-xl md:text-2xl font-black flex items-center gap-3 tracking-tight ${totalPending > 0 ? 'text-white' : 'text-slate-800'}`}>
                        {totalPending > 0 ? (
                            <><Sparkles className="text-yellow-300 animate-bounce" size={28} /> Việc cần xử lý</>
                        ) : (
                            <><ShieldCheck className="text-emerald-500" size={28} /> Hệ thống ổn định</>
                        )}
                    </h3>
                    <p className={`mt-2 text-sm font-medium ${totalPending > 0 ? 'text-blue-100' : 'text-slate-500'}`}>
                        {totalPending > 0
                            ? `Bạn đang có ${pendingAttendanceCount} đơn check-in và ${pendingLeavesCount} đơn xin nghỉ phép chờ duyệt.`
                            : "Tuyệt vời! Không có đơn từ nào cần bạn phải phê duyệt lúc này."}
                    </p>
                </div>
                {totalPending > 0 && (
                    <button onClick={handleApproveAll} className="relative z-10 bg-white text-blue-700 text-sm px-8 py-3.5 rounded-2xl font-black shadow-xl hover:shadow-2xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all duration-300 w-full md:w-auto flex justify-center items-center gap-2 mt-4 md:mt-0">
                        <CheckCircle size={18} /> Duyệt tất cả
                    </button>
                )}
            </div>

            {/* Grid Thông số */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
                <StatCard title="Tổng nhân sự" value={allUsers.length} sub="Click xem danh sách" icon={<Users size={28} />} color="blue" onClick={() => setActiveListType('TOTAL')} />
                <StatCard title="Đi làm" value={workingRecords.length} sub="Nhân sự đang làm việc" icon={<Clock size={28} />} color="emerald" onClick={() => filterDate ? setActiveListType('WORKING') : alert("Chọn ngày để xem chi tiết!")} />
                {/* 5. CẬP NHẬT SUB TRÊN THẺ "ĐI MUỘN" LẤY TỪ SYSCONFIG */}
                <StatCard title="Đi muộn" value={lateRecords.length} sub={`Check-in sau ${sysConfig.startTime}`} icon={<Bell size={28} />} color="rose" onClick={() => filterDate ? setActiveListType('LATE') : alert("Chọn ngày để xem chi tiết!")} />
                <StatCard title="Nghỉ phép" value={filterDate ? leaveRecords.length : '--'} sub="Đã tính từ bảng Nghỉ" icon={<CalendarDays size={28} />} color="purple" onClick={() => filterDate ? setActiveListType('LEAVE') : alert("Chọn ngày để xem chi tiết!")} />
                <StatCard title="Chưa check-in" value={filterDate ? absentUsersList.length : '--'} sub="Chưa có dữ liệu vào" icon={<UserX size={28} />} color="amber" onClick={() => filterDate ? setActiveListType('ABSENT') : alert("Chọn ngày để xem chi tiết!")} />
            </div>

            {/* Bảng Nhật ký điểm danh */}
            <div className="bg-white border border-slate-200 rounded-[24px] md:rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
                <div className="px-5 md:px-8 py-5 md:py-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 backdrop-blur-xl z-10">
                    <h3 className="font-black text-slate-800 text-lg md:text-xl tracking-tight flex items-center gap-3 uppercase">
                        <MapPin className="text-blue-500" />
                        Nhật ký Điểm danh
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner w-full md:w-auto">
                        <div className="bg-white px-3 md:px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-2 flex-1 md:flex-none">
                            <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Ngày:</label>
                            <input
                                type="date"
                                className="bg-transparent text-sm font-black text-slate-700 outline-none cursor-pointer w-full"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>
                        {filterDate && (
                            <button
                                onClick={() => setFilterDate("")}
                                className="text-[10px] md:text-xs font-bold text-rose-500 hover:text-white hover:bg-rose-500 px-3 md:px-4 py-2 md:py-2.5 rounded-xl transition-all duration-300 uppercase tracking-wider whitespace-nowrap"
                            >
                                Bỏ lọc
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto p-4 md:p-8 pt-4">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="text-[10px] md:text-[11px] uppercase text-slate-400 font-black tracking-widest border-b border-slate-100">
                                <th className="px-4 md:px-6 py-4">Nhân viên</th>
                                <th className="px-4 md:px-6 py-4">Thời gian</th>
                                <th className="px-4 md:px-6 py-4">Vị trí</th>
                                <th className="px-4 md:px-6 py-4">Trạng thái</th>
                                <th className="px-4 md:px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayTableData.length > 0 ? (
                                displayTableData.map((item: any, idx: number) => (
                                    <tr key={item._id || idx} className="group hover:bg-slate-50/80 transition-colors duration-200">
                                        <td className="px-4 md:px-6 py-4 md:py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 min-w-[40px] rounded-full bg-gradient-to-tr from-blue-100 to-indigo-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-sm shadow-sm group-hover:scale-110 transition-transform">
                                                    {(item.userId?.name || item.userId?.phone || "N").charAt(0).toUpperCase()}
                                                </div>
                                                <p className="font-bold text-slate-800 text-sm">{item.userId?.name || item.userId?.phone || "Nhân viên"}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 md:py-5">
                                            <div className="space-y-1.5">
                                                {/* Giờ vào */}
                                                <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                                                    <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center border border-emerald-100">
                                                        <ChevronRight size={12} className="rotate-[-90deg]" />
                                                    </div>
                                                    <span className="text-[10px] uppercase text-slate-400 font-bold w-8">Vào:</span>
                                                    {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                                                </div>

                                                {/* Giờ ra */}
                                                <div className={`flex items-center gap-2 font-black text-sm ${item.checkOutTime ? 'text-blue-600' : 'text-slate-300'}`}>
                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${item.checkOutTime ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                                                        <ChevronRight size={12} className="rotate-[90deg]" />
                                                    </div>
                                                    <span className="text-[10px] uppercase text-slate-400 font-bold w-8">Ra:</span>
                                                    {item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Chưa ra'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 md:py-5">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border whitespace-nowrap ${item.type === 'REMOTE' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                <MapPin size={12} />
                                                {item.type === 'REMOTE' ? 'Làm Online' : 'Tại Công Ty'}
                                            </span>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 md:py-5">
                                            <span className={`inline-flex items-center gap-1 text-[10px] md:text-[11px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap 
                                                ${item.status === 'APPROVED' ? 'text-emerald-600 bg-emerald-50 border border-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.1)]' :
                                                    item.status === 'REJECTED' ? 'text-rose-600 bg-rose-50 border border-rose-200' :
                                                        'text-amber-600 bg-amber-50 border border-amber-200 animate-pulse'}`}>
                                                {item.status === 'APPROVED' ? <><CheckCircle size={12} /> Đã duyệt</> :
                                                    item.status === 'REJECTED' ? <><X size={12} /> Từ chối</> :
                                                        <><Clock size={12} /> Chờ duyệt</>}
                                            </span>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 md:py-5 text-right">
                                            <button
                                                onClick={() => { setSelectedRecord(item); setAdminReplyText(""); }}
                                                className="inline-flex p-2 md:p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 hover:shadow-sm"
                                            >
                                                <MoreVertical size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-12 md:py-16">
                                        <div className="flex flex-col items-center justify-center text-slate-400 animate-in fade-in zoom-in-95 duration-500">
                                            <div className="bg-slate-50 p-5 md:p-6 rounded-full mb-4 border border-slate-100">
                                                <CalendarDays size={40} className="text-slate-300 md:w-12 md:h-12" />
                                            </div>
                                            <p className="font-bold text-slate-600 text-base md:text-lg">Chưa có dữ liệu</p>
                                            <p className="text-xs md:text-sm mt-1 text-slate-400 text-center px-4">Không có ai điểm danh {filterDate ? `trong ngày ${filterDate.split('-').reverse().join('/')}` : 'nào'}.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL 1: CHI TIẾT ĐIỂM DANH */}
            {selectedRecord && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[24px] md:rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-400">
                        <div className="bg-gradient-to-b from-slate-50 to-white p-5 md:p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-black text-slate-800 text-lg md:text-xl flex items-center gap-3 tracking-tight">
                                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                                    <Info size={20} />
                                </div>
                                Chi tiết điểm danh
                            </h3>
                            <button onClick={() => setSelectedRecord(null)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                                <X size={20} className="md:w-6 md:h-6" />
                            </button>
                        </div>

                        <div className="p-5 md:p-8 space-y-5 md:space-y-6">
                            <div className="flex items-center gap-4 border-b border-slate-100 pb-5 md:pb-6">
                                <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-black text-lg md:text-xl shadow-inner shrink-0">
                                    {(selectedRecord.userId?.name || selectedRecord.userId?.phone || "N").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">Nhân viên</p>
                                    <p className="font-black text-slate-800 text-base md:text-lg break-all">{selectedRecord.userId?.name || selectedRecord.userId?.phone}</p>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-amber-100"></div>
                                <div className="relative pl-10">
                                    <div className="absolute left-2.5 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-amber-100 border-2 border-amber-500 z-10"></div>
                                    <span className="text-amber-600 text-[10px] md:text-[11px] font-black uppercase tracking-widest block mb-1">Ghi chú lúc Check-in</span>
                                    <div className="bg-amber-50/50 border border-amber-100 p-3 md:p-4 rounded-2xl text-amber-900 text-xs md:text-sm font-medium leading-relaxed">
                                        {selectedRecord.note || <span className="italic opacity-50">Không có ghi chú đính kèm...</span>}
                                    </div>
                                </div>
                            </div>

                            {selectedRecord.status === 'APPROVED' ? (
                                <div className="bg-emerald-50/50 border border-emerald-100 p-3 md:p-4 rounded-2xl text-emerald-900 text-xs md:text-sm font-bold text-center">
                                    <CheckCircle size={16} className="inline mr-2 text-emerald-500" />
                                    Đã được duyệt.
                                </div>
                            ) : selectedRecord.status === 'REJECTED' ? (
                                <div className="bg-rose-50/50 border border-rose-100 p-3 md:p-4 rounded-2xl text-rose-900 text-xs md:text-sm font-bold text-center">
                                    <X size={16} className="inline mr-2 text-rose-500" />
                                    Đã bị từ chối.
                                </div>
                            ) : (
                                <div className="pt-2">
                                    <label className="text-slate-500 text-[10px] md:text-[11px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <MessageSquare size={14} /> Phản hồi cho nhân viên
                                    </label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 md:p-4 text-xs md:text-sm font-medium text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none shadow-inner"
                                        placeholder="Nhập lời nhắn..."
                                        value={adminReplyText}
                                        onChange={(e) => setAdminReplyText(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-5 md:p-6 pt-0 flex gap-3 bg-white">
                            <button onClick={() => setSelectedRecord(null)} className="flex-1 py-3 md:py-4 rounded-2xl text-sm md:text-base font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all">
                                Đóng
                            </button>

                            {selectedRecord.status === 'PENDING' && (
                                <button
                                    onClick={() => handleApproveSingle(selectedRecord, 'APPROVED')}
                                    className="flex-[1.5] py-3 md:py-4 rounded-2xl text-sm md:text-base font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 transition-all hover:-translate-y-0.5"
                                >
                                    <CheckCircle size={18} className="md:w-5 md:h-5" /> Duyệt ngay
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: HIỂN THỊ DANH SÁCH CHI TIẾT */}
            {activeListType && modalConfig && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[24px] md:rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-400">
                        <div className={`p-5 md:p-8 md:pb-6 border-b flex justify-between items-center bg-gradient-to-br from-${modalConfig.color}-50/50 to-white border-${modalConfig.color}-100`}>
                            <div>
                                <h3 className={`font-black text-${modalConfig.color}-800 text-xl md:text-2xl flex items-center gap-3 tracking-tight`}>
                                    <div className={`p-2.5 md:p-3 bg-${modalConfig.color}-100 text-${modalConfig.color}-600 rounded-xl md:rounded-2xl shadow-sm`}>
                                        {modalConfig.icon}
                                    </div>
                                    {modalConfig.title}
                                </h3>
                                {activeListType !== 'TOTAL' && filterDate && (
                                    <p className={`mt-1.5 md:mt-2 text-xs md:text-sm font-medium text-${modalConfig.color}-600/70`}>
                                        Dữ liệu ngày: <span className="font-bold">{filterDate.split('-').reverse().join('/')}</span>
                                    </p>
                                )}
                            </div>
                            <button onClick={() => setActiveListType(null)} className={`p-2 text-${modalConfig.color}-400 hover:text-${modalConfig.color}-600 hover:bg-${modalConfig.color}-50 rounded-full transition-all self-start`}>
                                <X size={20} className="md:w-6 md:h-6" />
                            </button>
                        </div>

                        <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar">
                            {modalConfig.data.length > 0 ? (
                                <ul className="space-y-3">
                                    {modalConfig.data.map((item: any, idx: number) => {
                                        const userObj = modalConfig.isUserOnly ? item : (item.userId || {});
                                        const name = userObj.name || 'Chưa cập nhật tên';
                                        const phone = userObj.phone || 'Chưa có SĐT';

                                        return (
                                            <li key={item._id || idx} className="flex items-center justify-between p-3 md:p-4 bg-white border border-slate-100 rounded-[16px] md:rounded-[20px] shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 group">
                                                <div className="flex items-center gap-3 md:gap-4">
                                                    <div className={`h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-full bg-${modalConfig.color}-50 border border-${modalConfig.color}-100 flex items-center justify-center text-${modalConfig.color}-600 font-black text-base md:text-lg group-hover:scale-110 transition-transform`}>
                                                        {name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm md:text-base line-clamp-1">{name}</p>
                                                        {activeListType === 'LEAVE' ? (
                                                            <p className="text-purple-600 text-[10px] md:text-[11px] font-bold mt-0.5">{item.leaveType} | {item.startDate}</p>
                                                        ) : (
                                                            <p className="text-slate-400 text-[10px] md:text-xs font-medium mt-0.5">{phone}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {activeListType === 'LEAVE' && (
                                                    <div className="text-right shrink-0 ml-2">
                                                        <span className={`inline-flex items-center text-[9px] md:text-[10px] font-black px-2 md:px-2.5 py-1 rounded-lg uppercase tracking-wider border whitespace-nowrap ${item.status === 'APPROVED' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : item.status === 'REJECTED' ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-amber-600 bg-amber-50 border-amber-200'}`}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                )}

                                                {!modalConfig.isUserOnly && activeListType !== 'LEAVE' && item.checkInTime && (
                                                    <div className="text-right bg-slate-50 px-2.5 md:px-3 py-1.5 rounded-xl border border-slate-100 shrink-0 ml-2">
                                                        <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 whitespace-nowrap">Giờ vào</span>
                                                        <p className={`text-xs md:text-sm font-black whitespace-nowrap ${activeListType === 'LATE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                            {new Date(item.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                )}
                                            </li>
                                        )
                                    })}
                                </ul>
                            ) : (
                                <div className="text-center py-10 md:py-12 flex flex-col items-center">
                                    <div className="bg-slate-50 p-5 md:p-6 rounded-full mb-4">
                                        <CheckCircle size={40} className="text-slate-300 md:w-12 md:h-12" />
                                    </div>
                                    <p className="font-bold text-slate-600 text-base md:text-lg">Danh sách trống</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 md:p-6 bg-white border-t border-slate-100">
                            <button
                                onClick={() => setActiveListType(null)}
                                className={`w-full py-3 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-${modalConfig.color}-700 bg-${modalConfig.color}-50 hover:bg-${modalConfig.color}-100 transition-all`}
                            >
                                Đóng lại
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                @media (min-width: 768px) {
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
            `}</style>
        </div>
    );
}
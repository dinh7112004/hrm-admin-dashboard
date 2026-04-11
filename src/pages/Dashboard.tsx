import React, { useState, useEffect } from 'react';
import {
    Users, Clock, Bell, CalendarDays, ShieldCheck, MoreVertical,
    MapPin, Info, X, CheckCircle, MessageSquare, UserX,
    CalendarOff, ChevronRight, Sparkles, Image as ImageIcon,
    Eye, Check, Trash2, AlertCircle, Filter, Search, RefreshCw,
    ArrowUpRight, ArrowDownRight, LayoutDashboard, Calendar, Clock9
} from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../apiConfig';

const axiosConfig = {
    headers: { 'ngrok-skip-browser-warning': 'true' }
};

// --- COMPONENT THẺ THỐNG KÊ ---
const StatCard = ({ title, value, sub, icon, color, onClick }: any) => {
    const theme: any = {
        blue: { bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'group-hover:border-indigo-300', shadow: 'group-hover:shadow-indigo-500/20', glow: 'from-indigo-600/5' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'group-hover:border-emerald-300', shadow: 'group-hover:shadow-emerald-500/20', glow: 'from-emerald-600/5' },
        rose: { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'group-hover:border-rose-300', shadow: 'group-hover:shadow-rose-500/20', glow: 'from-rose-600/5' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'group-hover:border-amber-300', shadow: 'group-hover:shadow-amber-500/20', glow: 'from-amber-600/5' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'group-hover:border-purple-300', shadow: 'group-hover:shadow-purple-500/20', glow: 'from-purple-600/5' }
    };
    const current = theme[color] || theme.blue;
    return (
        <div onClick={onClick} className={`group relative overflow-hidden bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col gap-4 transition-all duration-500 ease-out shadow-sm ${onClick ? `cursor-pointer hover:-translate-y-2 hover:shadow-2xl ${current.border} ${current.shadow}` : ''}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${current.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="flex justify-between items-start relative z-10">
                <div className={`p-4 rounded-2xl ${current.bg} ${current.text} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>{icon}</div>
                {onClick && <div className="p-2 bg-slate-50 rounded-full text-slate-300 group-hover:text-slate-600 group-hover:bg-white transition-all"><ChevronRight size={16} strokeWidth={3} /></div>}
            </div>
            <div className="relative z-10">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</p>
                <h4 className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">{value}</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-2 flex items-center gap-1.5 uppercase tracking-wider">{sub}</p>
            </div>
        </div>
    );
}

export const Dashboard = ({ data, refreshData }: { data: any[], refreshData?: () => void }) => {
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [activeListType, setActiveListType] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDate, setFilterDate] = useState(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    });

    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [leavesData, setLeavesData] = useState<any[]>([]);
    const [sysConfig, setSysConfig] = useState({ startTime: '08:00', endTime: '17:00' });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, leavesRes, configRes] = await Promise.all([
                axios.get(`${API_BASE}/users`, axiosConfig),
                axios.get(`${API_BASE}/leaves`, axiosConfig),
                axios.get(`${API_BASE}/config`, axiosConfig).catch(() => null)
            ]);
            setAllUsers(usersRes.data || []);
            setLeavesData(leavesRes.data || []);
            if (configRes?.data) setSysConfig({ startTime: configRes.data.startTime || '08:00', endTime: configRes.data.endTime || '17:00' });
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, []);

    const filteredAttendance = data.filter((item: any) => {
        const d = new Date(item.createdAt);
        const itemDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const matchDate = filterDate ? itemDate === filterDate : true;
        const matchSearch = searchTerm ? item.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        return matchDate && matchSearch;
    });

    const displayTableData = [...filteredAttendance].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const workingRecords = filteredAttendance.filter((v, i, s) => i === s.findIndex(t => (t.userId?._id || t.userId) === (v.userId?._id || v.userId)));
    const [configH, configM] = sysConfig.startTime.split(':').map(Number);
    const lateRecords = filteredAttendance.filter(item => {
        if (!item.checkInTime) return false;
        const d = new Date(item.checkInTime);
        return d.getHours() > configH || (d.getHours() === configH && d.getMinutes() > configM);
    });

    const leaveRecords = leavesData.filter(l => {
        if (!filterDate) return true;
        const target = new Date(filterDate).setHours(0, 0, 0, 0);
        const start = new Date(l.startDate).setHours(0, 0, 0, 0);
        const end = new Date(l.endDate).setHours(0, 0, 0, 0);
        return target >= start && target <= end;
    });

    const userIdsWithAttendance = new Set(filteredAttendance.map(item => item.userId?._id || item.userId));
    const absentUsersList = allUsers.filter(user => !userIdsWithAttendance.has(user._id));
    const totalPending = data.filter(i => i.status === 'PENDING').length + leavesData.filter(i => i.status === 'PENDING').length;

    const getListModalConfig = () => {
        switch (activeListType) {
            case 'TOTAL': return { title: 'Tổng nhân sự', data: allUsers, color: 'indigo', icon: <Users size={22} />, isUserOnly: true };
            case 'WORKING': return { title: 'Nhân sự đi làm', data: workingRecords, color: 'emerald', icon: <Clock size={22} />, isUserOnly: false };
            case 'LATE': return { title: 'Danh sách đi muộn', data: lateRecords, color: 'rose', icon: <Bell size={22} />, isUserOnly: false };
            case 'LEAVE': return { title: 'Nghỉ phép hôm nay', data: leaveRecords, color: 'purple', icon: <CalendarOff size={22} />, isUserOnly: false };
            case 'ABSENT': return { title: 'Chưa điểm danh', data: absentUsersList, color: 'amber', icon: <UserX size={22} />, isUserOnly: true };
            default: return null;
        }
    };
    const listModal = getListModalConfig();

    const handleDeleteAttendance = async (id: string) => {
        if (!window.confirm("Xếp có chắc muốn XÓA điểm danh này không?")) return;
        try {
            await axios.delete(`${API_BASE}/attendance/${id}`, axiosConfig);
            if (refreshData) refreshData();
            fetchData();
        } catch (err) { alert("Lỗi khi xóa!"); }
    };

    const handleApproveSingle = async (id: string, isApprove: boolean, type: 'ATT' | 'LEAVE') => {
        try {
            if (type === 'ATT') await axios.put(`${API_BASE}/attendance/${id}/approve`, { reply: isApprove ? "Đã duyệt" : "Từ chối" }, axiosConfig);
            else await axios.patch(`${API_BASE}/leaves/${id}/status`, { status: isApprove ? 'APPROVED' : 'REJECTED' }, axiosConfig);
            if (refreshData) refreshData();
            fetchData();
        } catch (err) { alert("Lỗi!"); }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 space-y-8 max-w-[1600px] mx-auto pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* --- SLIM HEADER BANNER --- */}
                <div className="lg:col-span-9 relative overflow-hidden rounded-[40px] p-8 min-h-[160px] flex items-center justify-between transition-all duration-500 bg-slate-900 shadow-xl overflow-hidden group">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 w-[500px] h-full bg-gradient-to-l from-indigo-500/20 to-transparent blur-3xl opacity-50" />
                        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8 w-full justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
                                <Sparkles size={12} className="text-amber-400" />
                                <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">HRM PRO SYSTEM</span>
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight">
                                {(() => {
                                    const h = currentTime.getHours();
                                    if (h >= 5 && h < 11) return "Chào buổi sáng";
                                    if (h >= 11 && h < 14) return "Chào buổi trưa";
                                    if (h >= 14 && h < 18) return "Chào buổi chiều";
                                    return "Chào buổi tối";
                                })()}, <span className="text-indigo-400">Sếp! ⚡️</span>
                            </h1>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Hệ thống đã sẵn sàng hỗ trợ sếp</p>
                        </div>

                        <div className={`flex items-center gap-4 p-3 pr-4 rounded-[28px] border transition-all duration-500 backdrop-blur-xl ${totalPending > 0 ? 'bg-white/5 border-white/10 shadow-lg shadow-black/20' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                             <div className={`p-4 rounded-2xl transition-all duration-500 ${totalPending > 0 ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/30 group-hover:scale-105' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                {totalPending > 0 ? <Bell size={24} className="animate-pulse" /> : <ShieldCheck size={24} />}
                             </div>
                             <div>
                                <h3 className="text-white font-black text-sm tracking-tight mb-0.5 uppercase">
                                    {totalPending > 0 ? "Việc cần xử lý" : "Hệ thống ổn định"}
                                </h3>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${totalPending > 0 ? 'text-indigo-300' : 'text-slate-500'}`}>
                                    {totalPending > 0 ? `${totalPending} yêu cầu chờ duyệt` : "Tất cả yêu cầu đã xong"}
                                </p>
                             </div>
                             {totalPending > 0 && (
                                <button
                                    onClick={() => setIsPendingModalOpen(true)}
                                    className="ml-2 bg-white hover:bg-indigo-50 text-indigo-700 px-6 py-3.5 rounded-2xl font-black text-[10px] transition-all shadow-xl hover:scale-105 active:scale-95 uppercase tracking-widest"
                                >
                                    Duyệt ngay
                                </button>
                             )}
                        </div>
                    </div>
                </div>

                {/* --- SLIM CLOCK SECTION --- */}
                <div className="lg:col-span-3 bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm flex flex-col items-center justify-center relative overflow-hidden group min-h-[160px]">
                    <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-700">
                        <Clock size={120} strokeWidth={1} />
                    </div>

                    <div className="text-center relative z-10 w-full">
                        <span className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                            {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex items-center justify-center gap-2 mt-3 bg-slate-50 py-1.5 px-3 rounded-full w-fit mx-auto border border-slate-100">
                             <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                {currentTime.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: 'short' })}
                             </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard title="Nhân sự" value={allUsers.length} sub="Tổng số nhân viên" color="blue" onClick={() => setActiveListType('TOTAL')} icon={<Users size={24} strokeWidth={2.5} />} />
                <StatCard title="Có mặt" value={workingRecords.length} sub="Có mặt hôm nay" color="emerald" onClick={() => setActiveListType('WORKING')} icon={<Clock size={24} strokeWidth={2.5} />} />
                <StatCard title="Đi muộn" value={lateRecords.length} sub={`Sau ${sysConfig.startTime}`} color="rose" onClick={() => setActiveListType('LATE')} icon={<Bell size={24} strokeWidth={2.5} />} />
                <StatCard title="Nghỉ phép" value={leaveRecords.length} sub="Nghỉ có đơn" color="purple" onClick={() => setActiveListType('LEAVE')} icon={<CalendarDays size={24} strokeWidth={2.5} />} />
                <StatCard title="Vắng mặt" value={absentUsersList.length} sub="Chưa check-in" color="amber" onClick={() => setActiveListType('ABSENT')} icon={<UserX size={24} strokeWidth={2.5} />} />
            </div>

            <div className="bg-white rounded-[48px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-10 border-b border-slate-50 flex flex-col xl:flex-row justify-between items-center gap-8 bg-white/80 backdrop-blur-md sticky top-0 z-30">
                    <div className="flex items-center gap-4"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm"><LayoutDashboard size={24} strokeWidth={2.5} /></div><h3 className="font-black text-slate-900 text-xl tracking-tight uppercase">Nhật Ký Hệ Thống</h3></div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative group"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} strokeWidth={3} /><input type="text" placeholder="Tìm tên nhân viên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-bold text-sm text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all w-[300px]" /></div>
                        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-3xl border border-slate-100 shadow-inner"><Calendar size={18} className="text-slate-400 ml-3" strokeWidth={3} /><input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent font-black text-sm outline-none p-2 cursor-pointer text-slate-700" /></div>
                    </div>
                </div>
                <div className="overflow-x-auto p-10 pt-4 custom-scrollbar">
                    <table className="w-full border-separate border-spacing-0">
                        <thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><th className="px-6 py-6 text-left border-b border-slate-50">Nhân viên</th><th className="px-6 py-6 text-center border-b border-slate-50">Vào ca</th><th className="px-6 py-6 text-center border-b border-slate-50">Ra ca</th><th className="px-6 py-6 text-center border-b border-slate-50">Loại hình</th><th className="px-6 py-6 text-center border-b border-slate-50">Trạng thái</th><th className="px-6 py-6 text-right border-b border-slate-50">Thao tác</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayTableData.length > 0 ? displayTableData.map((item) => (
                                <tr key={item._id} className="group hover:bg-slate-50/50 transition-all duration-300">
                                    <td className="px-6 py-5"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm shadow-inner transition-all">{item.userId?.name?.charAt(0)}</div><p className="font-black text-slate-800 text-sm">{item.userId?.name || "N/A"}</p></div></td>
                                    <td className="px-6 py-5 text-center"><span className="font-black text-emerald-600 text-sm tabular-nums bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">{item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span></td>
                                    <td className="px-6 py-5 text-center"><span className={`font-black text-sm tabular-nums px-3 py-1.5 rounded-xl border ${item.checkOutTime ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'text-slate-300 bg-slate-50 border-slate-100'}`}>{item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Chưa ra'}</span></td>
                                    <td className="px-6 py-5 text-center"><span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${item.type === 'REMOTE' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{item.type}</span></td>
                                    <td className="px-6 py-5 text-center"><StatusBadge status={item.status} /></td>
                                    <td className="px-6 py-5 text-right"><div className="flex justify-end gap-2">{item.status === 'PENDING' && <button onClick={() => handleApproveSingle(item._id, true, 'ATT')} className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"><Check size={18} strokeWidth={3} /></button>}<button onClick={() => handleDeleteAttendance(item._id)} className="p-3 bg-rose-50 text-rose-400 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={18} strokeWidth={3} /></button></div></td>
                                </tr>
                            )) : (<tr><td colSpan={6} className="py-20 text-center text-slate-300 uppercase font-black text-[10px] tracking-widest">Không có dữ liệu</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>

            {activeListType && listModal && (
                <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-500">
                        <div className={`p-10 flex justify-between items-center border-b border-slate-50 bg-${listModal.color}-50/30`}><div className="flex items-center gap-4"><div className={`p-3 bg-${listModal.color}-100 text-${listModal.color}-600 rounded-2xl`}>{listModal.icon}</div><h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{listModal.title}</h2></div><button onClick={() => setActiveListType(null)} className="p-4 bg-slate-50 rounded-full text-slate-400 hover:text-rose-500 transition-all"><X size={24} strokeWidth={3} /></button></div>
                        <div className="p-10 overflow-y-auto flex-1 custom-scrollbar space-y-4">{listModal.data.length > 0 ? listModal.data.map((item: any, idx: number) => { const user = listModal.isUserOnly ? item : item.userId; return (<div key={item._id || idx} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all duration-300 group"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm">{user?.name?.charAt(0)}</div><div><p className="font-black text-slate-800 text-sm">{user?.name || "N/A"}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user?.phone || user?.userId}</p></div></div>{!listModal.isUserOnly && item.checkInTime && (<div className="text-right"><div className="flex items-center gap-2 justify-end text-emerald-600 font-black text-xs tabular-nums bg-emerald-50 px-3 py-1 rounded-xl"><Clock9 size={12} /> {new Date(item.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>{item.checkOutTime && <div className="mt-1 flex items-center gap-2 justify-end text-indigo-600 font-black text-[10px] tabular-nums"><RefreshCw size={10} /> {new Date(item.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>}</div>)}</div>); }) : <div className="text-center py-10 font-black text-slate-300 uppercase text-xs tracking-widest">Danh sách trống</div>}</div>
                    </div>
                </div>
            )}

            {isPendingModalOpen && (
                <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-[#F8FAFC] w-full max-w-6xl rounded-[56px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                        <div className="p-12 flex justify-between items-center bg-white border-b border-slate-100"><div><h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4"><Sparkles className="text-indigo-600" size={32} /> PHÊ DUYỆT ĐƠN TỪ</h2><p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2 ml-1">Kiểm tra và xác nhận yêu cầu của nhân sự</p></div><button onClick={() => setIsPendingModalOpen(false)} className="p-5 bg-slate-50 rounded-full text-slate-400 hover:text-rose-500 transition-all hover:rotate-90 duration-300"><X size={28} strokeWidth={3} /></button></div>
                        <div className="p-12 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-12 bg-slate-50/50">
                            <div className="space-y-8"><h4 className="font-black text-slate-900 text-sm uppercase tracking-widest ml-2 border-l-4 border-indigo-500 pl-4">Điểm danh ngoại lệ</h4>{data.filter(i => i.status === 'PENDING').map(item => (<div key={item._id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500"><div className="flex justify-between items-start mb-6"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl shadow-inner">{item.userId?.name?.charAt(0)}</div><div><p className="font-black text-slate-900 text-base">{item.userId?.name}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">{new Date(item.checkInTime).toLocaleString('vi-VN')}</p></div></div><span className="text-[9px] font-black px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 uppercase tracking-widest">{item.type}</span></div>{item.note && <div className="bg-slate-50/80 p-5 rounded-3xl text-xs text-slate-600 font-bold italic mb-6 border border-slate-100">"{item.note}"</div>}<div className="flex gap-3"><button onClick={() => handleApproveSingle(item._id, true, 'ATT')} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"><Check size={16} strokeWidth={3} /> DUYỆT</button><button onClick={() => handleApproveSingle(item._id, false, 'ATT')} className="px-6 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs hover:bg-rose-50 hover:text-rose-500 transition-all">TỪ CHỐI</button><button onClick={() => handleDeleteAttendance(item._id)} className="px-6 py-4 bg-rose-50 text-rose-400 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} strokeWidth={2.5} /></button></div></div>))}</div>
                            <div className="space-y-8"><h4 className="font-black text-slate-900 text-sm uppercase tracking-widest ml-2 border-l-4 border-purple-500 pl-4">Đơn xin nghỉ phép</h4>{leavesData.filter(i => i.status === 'PENDING').map(item => (<div key={item._id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500"><div className="flex justify-between items-start mb-6"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-xl shadow-inner">{item.userId?.name?.charAt(0)}</div><div><p className="font-black text-slate-900 text-base">{item.userId?.name}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">{item.startDate} → {item.endDate}</p></div></div><span className="text-[9px] font-black px-3 py-1.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 uppercase tracking-widest">{item.leaveType}</span></div>{item.reason && <div className="bg-slate-50/80 p-5 rounded-3xl text-xs text-slate-600 font-bold italic mb-6 border border-slate-100">"{item.reason}"</div>}<div className="flex gap-3"><button onClick={() => handleApproveSingle(item._id, true, 'LEAVE')} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"><Check size={16} strokeWidth={3} /> CHO NGHỈ</button><button onClick={() => handleApproveSingle(item._id, false, 'LEAVE')} className="px-6 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs hover:bg-rose-50 hover:text-rose-500 transition-all">KHÔNG DUYỆT</button></div></div>))}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const StatusBadge = ({ status }: { status: string }) => {
    const config: any = {
        APPROVED: { label: "Đã duyệt", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
        REJECTED: { label: "Từ chối", color: "text-rose-600", bg: "bg-rose-50", icon: X },
        PENDING: { label: "Chờ duyệt", color: "text-amber-600", bg: "bg-amber-50", icon: Clock }
    };
    const s = config[status] || config.PENDING;
    const Icon = s.icon;
    return (<span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-current/10 ${s.bg} ${s.color}`}><Icon size={12} strokeWidth={3} /> {s.label}</span>);
};
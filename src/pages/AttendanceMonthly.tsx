import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ChevronLeft, ChevronRight, FileSpreadsheet, Search,
    Users, AlertCircle, CheckCircle2, X, Clock, Calendar, Info, 
    ChevronRightCircle, TrendingUp, UserCheck, UserX, Clock9
} from 'lucide-react';

import { API_BASE } from '../../apiConfig';

export default function AttendanceMonthly() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState("");

    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'late' | 'absent' | 'on-time'>('late');
    const [kpiModal, setKpiModal] = useState<{ type: 'total' | 'late' | 'absent', subTab: string } | null>(null);

    const daysInMonth = new Date(year, month, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const todayNum = new Date().getDate();
    const yesterdayNum = todayNum > 1 ? todayNum - 1 : 1;
    const isThisMonth = month === (new Date().getMonth() + 1) && year === new Date().getFullYear();

    const getDayOfWeek = (day: number) => {
        const date = new Date(year, month - 1, day);
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        return days[date.getDay()];
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [empRes, attRes] = await Promise.all([
                    axios.get(`${API_BASE}/users`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                    axios.get(`${API_BASE}/attendance/report/monthly?month=${month}&year=${year}`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
                ]);

                const allUsers = Array.isArray(empRes.data) ? empRes.data : (empRes.data.data || []);
                const attLog = Array.isArray(attRes.data) ? attRes.data : (attRes.data.data || []);

                const finalReport = allUsers.map((u: any) => {
                    const log = attLog.find((a: any) => String(a.userId) === String(u.userId) || a.name === u.name);
                    const days = log?.days || {};

                    let userAbsentDates: number[] = [];
                    let userOnTimeDates: number[] = [];
                    let userLateDates: number[] = [];
                    let calculatedTotalWorkDays = 0;

                    daysArray.forEach(d => {
                        const dayData = days[d];
                        if (dayData?.status === 'APPROVED' || dayData?.status === 'PENDING') {
                            calculatedTotalWorkDays++;
                        }
                        const isPast = isThisMonth ? d <= todayNum : true;
                        if (isPast) {
                            if (!dayData || dayData.status === 'REJECTED') {
                                userAbsentDates.push(d);
                            }
                            else if (dayData.status === 'APPROVED' || dayData.status === 'PENDING') {
                                if (dayData.isLate) userLateDates.push(d);
                                else userOnTimeDates.push(d);
                            }
                        }
                    });

                    return {
                        ...u, days, totalWorkDays: calculatedTotalWorkDays,
                        totalLate: userLateDates.length, absentDates: userAbsentDates,
                        onTimeDates: userOnTimeDates, lateDates: userLateDates
                    };
                });
                setEmployees(finalReport);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchData();
    }, [month, year]);

    const absentTodayCount = isThisMonth ? employees.filter(e => e.absentDates.includes(todayNum)).length : 0;
    const lateTodayCount = isThisMonth ? employees.filter(e => e.lateDates.includes(todayNum)).length : 0;
    const filteredData = employees.filter(e => e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || e.userId?.toLowerCase().includes(searchTerm.toLowerCase()));

    const renderKpiList = () => {
        if (!kpiModal) return null;
        let list: any[] = [];
        let emptyMsg = "Không có dữ liệu.";

        if (kpiModal.type === 'total') {
            list = employees; emptyMsg = "Chưa có nhân sự nào.";
        } else if (kpiModal.type === 'late') {
            if (kpiModal.subTab === 'today') { list = employees.filter(e => e.lateDates.includes(todayNum)); emptyMsg = "Hôm nay không ai đi muộn."; }
            else if (kpiModal.subTab === 'yesterday') { list = employees.filter(e => e.lateDates.includes(yesterdayNum)); emptyMsg = "Hôm qua không ai đi muộn."; }
            else { list = employees.filter(e => e.totalLate > 0); emptyMsg = "Tháng này không có ai đi muộn."; }
        } else if (kpiModal.type === 'absent') {
            if (kpiModal.subTab === 'today') { list = employees.filter(e => e.absentDates.includes(todayNum)); emptyMsg = "Hôm nay đi làm đầy đủ."; }
            else if (kpiModal.subTab === 'yesterday') { list = employees.filter(e => e.absentDates.includes(yesterdayNum)); emptyMsg = "Hôm qua đi làm đầy đủ."; }
            else { list = employees.filter(e => e.absentDates.length > 0); emptyMsg = "Tháng này không ai vắng mặt."; }
        }

        if (list.length === 0) return <EmptyState msg={emptyMsg} />;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {list.map((u, i) => {
                    let extraInfo = "";
                    if (kpiModal.type === 'late') {
                        extraInfo = kpiModal.subTab === 'today' ? `Vào: ${u.days[todayNum]?.checkIn}` : kpiModal.subTab === 'yesterday' ? `Vào: ${u.days[yesterdayNum]?.checkIn}` : `Tổng muộn: ${u.totalLate}`;
                    } else if (kpiModal.type === 'absent') {
                        extraInfo = kpiModal.subTab === 'month' ? `Tổng vắng: ${u.absentDates.length}` : "Chưa check-in";
                    }

                    return (
                        <div key={i} onClick={() => { setKpiModal(null); setSelectedUser(u); setActiveTab(kpiModal.type === 'absent' ? 'absent' : 'late'); }}
                            className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-indigo-200 cursor-pointer transition-all duration-300 group">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-lg ${kpiModal.type === 'late' ? 'bg-rose-500 shadow-rose-100' : kpiModal.type === 'absent' ? 'bg-slate-400 shadow-slate-100' : 'bg-indigo-500 shadow-indigo-100'}`}>
                                    {u.name?.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{u.name}</p>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{u.userId}</p>
                                </div>
                            </div>
                            {extraInfo && <span className={`text-[11px] font-black px-4 py-2 rounded-2xl ${kpiModal.type === 'late' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>{extraInfo}</span>}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-[#F8FAFC] min-h-screen p-4 md:p-10 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* HEADER */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-indigo-500 rounded-[24px] text-white shadow-xl shadow-indigo-100">
                            <Calendar size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Bảng Công Tổng Hợp</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Tháng {month}/{year} • <span className="text-slate-600">Dữ liệu thời gian thực</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="flex items-center bg-slate-50 rounded-3xl p-2 border border-slate-100 shadow-inner">
                            <button onClick={() => setMonth(m => m === 1 ? 12 : m - 1)} className="p-3 bg-white shadow-sm rounded-2xl text-slate-600 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95"><ChevronLeft size={20} strokeWidth={3} /></button>
                            <div className="px-8 text-center min-w-[160px]">
                                <p className="text-base font-black text-slate-900">Tháng {month < 10 ? `0${month}` : month} • {year}</p>
                            </div>
                            <button onClick={() => setMonth(m => m === 12 ? 1 : m + 1)} className="p-3 bg-white shadow-sm rounded-2xl text-slate-600 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95"><ChevronRight size={20} strokeWidth={3} /></button>
                        </div>
                    </div>
                </div>

                {/* THỐNG KÊ (KPI CARDS) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
                    <div onClick={() => setKpiModal({ type: 'total', subTab: 'all' })} className="cursor-pointer">
                        <MetricCard label="Tổng Nhân Sự" value={employees.length} sub="Danh sách" type="primary" icon={Users} />
                    </div>
                    <div onClick={() => setKpiModal({ type: 'late', subTab: 'today' })} className="cursor-pointer">
                        <MetricCard label="Đi Muộn Hôm Nay" value={lateTodayCount} sub="Chi tiết" type="danger" icon={Clock9} />
                    </div>
                    <div onClick={() => setKpiModal({ type: 'absent', subTab: 'today' })} className="cursor-pointer">
                        <MetricCard label="Vắng Hôm Nay" value={absentTodayCount} sub="Chi tiết" type="neutral" icon={UserX} />
                    </div>
                </div>

                {/* BẢNG CHẤM CÔNG */}
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                    {/* BỘ LỌC VÀ CHÚ THÍCH */}
                    <div className="p-8 border-b border-slate-50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 sticky top-0 bg-white/95 backdrop-blur-md z-40">
                        <div className="relative w-full xl:w-[400px] group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} strokeWidth={2.5} />
                            <input 
                                type="text" 
                                placeholder="Tìm tên hoặc mã nhân viên..." 
                                className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-bold text-sm text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-200 transition-all placeholder:text-slate-400" 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <Legend label="Có mặt" color="bg-indigo-500" description="Đúng giờ" />
                            <Legend label="Đi muộn" color="bg-rose-500" description="Trễ > 5p" />
                            <Legend label="Vắng mặt" color="bg-slate-200" description="Nghỉ/Không log" />
                        </div>
                    </div>

                    {/* VÙNG BẢNG VUỐT NGANG */}
                    <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar relative">
                        <table className="w-full border-separate border-spacing-0">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 z-40 bg-slate-50/80 backdrop-blur-md px-10 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 min-w-[300px]">Thông tin nhân viên</th>
                                    {daysArray.map(d => {
                                        const dayName = getDayOfWeek(d);
                                        const isWeekend = dayName === 'CN' || dayName === 'T7';
                                        return (
                                            <th key={d} className={`p-3 text-center bg-white border-b border-slate-50 min-w-[50px] ${isWeekend ? 'bg-slate-50/30' : ''}`}>
                                                <div className={`text-[10px] font-black mb-1 ${dayName === 'CN' ? 'text-rose-500' : 'text-slate-300'}`}>{dayName}</div>
                                                <div className="text-sm font-black text-slate-900 tabular-nums">{d}</div>
                                            </th>
                                        );
                                    })}
                                    <th className="sticky right-0 z-40 bg-slate-50/80 backdrop-blur-md px-8 py-6 text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Ngày công</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan={daysInMonth + 2} className="py-40 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Đang xử lý dữ liệu...</p>
                                        </div>
                                    </td></tr>
                                ) : filteredData.map((user, idx) => (
                                    <tr key={user._id || idx} className="hover:bg-indigo-50/30 transition-all group">
                                        <td className="px-10 py-5 sticky left-0 bg-white group-hover:bg-indigo-50/30 z-30 border-r border-slate-50 cursor-pointer transition-colors" onClick={() => { setSelectedUser(user); setActiveTab('late'); }}>
                                            <div className="flex items-center gap-5">
                                                <div className="flex w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 group-hover:bg-indigo-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-100 items-center justify-center font-black text-base transition-all duration-300 shrink-0">{user.name?.charAt(0)}</div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-sm text-slate-900 group-hover:text-indigo-600 truncate transition-colors">{user.name}</p>
                                                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest truncate">{user.userId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {daysArray.map(day => {
                                            const dayData = user.days?.[day];
                                            const isPast = (month === (new Date().getMonth() + 1)) ? day <= todayNum : true;
                                            const isWeekend = getDayOfWeek(day) === 'CN' || getDayOfWeek(day) === 'T7';
                                            const bgClass = isWeekend ? 'bg-slate-50/30' : '';

                                            if (dayData?.status === 'APPROVED' || dayData?.status === 'PENDING') {
                                                return <td key={day} className={`p-1 text-center ${bgClass}`}><div className={`w-3 h-3 rounded-full mx-auto shadow-sm ${dayData.isLate ? "bg-rose-500 shadow-rose-100" : "bg-indigo-500 shadow-indigo-100"}`} /></td>;
                                            }
                                            else if (isPast) {
                                                return <td key={day} className={`p-1 text-center ${bgClass}`}><div className="w-3 h-3 rounded-full mx-auto bg-slate-200" /></td>;
                                            }
                                            return <td key={day} className={`p-1 text-center ${bgClass}`}></td>;
                                        })}
                                        <td className="sticky right-0 z-30 bg-white group-hover:bg-indigo-50/30 px-8 py-5 text-center border-l border-slate-50 transition-colors">
                                            <span className="bg-slate-900 text-white px-5 py-2 rounded-2xl font-black text-xs tabular-nums shadow-lg shadow-slate-200">
                                                {user.totalWorkDays || 0}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL DANH SÁCH NHANH (KPI MODAL) */}
            {kpiModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-10 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh] border border-white/20">

                        <div className="p-10 flex justify-between items-center border-b border-slate-50 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-900 text-white rounded-2xl">
                                    <TrendingUp size={24} strokeWidth={2.5} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                    {kpiModal.type === 'total' ? 'Danh Sách Nhân Sự' : kpiModal.type === 'late' ? 'Báo Cáo Đi Muộn' : 'Báo Cáo Vắng Mặt'}
                                </h2>
                            </div>
                            <button onClick={() => setKpiModal(null)} className="p-4 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900 hover:rotate-90 duration-300"><X size={24} strokeWidth={3} /></button>
                        </div>

                        {kpiModal.type !== 'total' && (
                            <div className="flex px-10 py-6 gap-4 bg-slate-50/50 border-b border-slate-50 overflow-x-auto custom-scrollbar shrink-0">
                                <TabBtn active={kpiModal.subTab === 'today'} onClick={() => setKpiModal({ ...kpiModal, subTab: 'today' })} label="Hôm nay" count={kpiModal.type === 'late' ? lateTodayCount : absentTodayCount} />
                                <TabBtn active={kpiModal.subTab === 'yesterday'} onClick={() => setKpiModal({ ...kpiModal, subTab: 'yesterday' })} label="Hôm qua" />
                                <TabBtn active={kpiModal.subTab === 'month'} onClick={() => setKpiModal({ ...kpiModal, subTab: 'month' })} label="Toàn bộ tháng" />
                            </div>
                        )}

                        <div className="p-10 overflow-y-auto bg-white flex-1 custom-scrollbar">
                            {renderKpiList()}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CHI TIẾT 1 NHÂN VIÊN */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh] border border-white/20">

                        <div className="p-10 flex justify-between items-center bg-white border-b border-slate-50 shrink-0">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-[32px] bg-indigo-500 text-white flex items-center justify-center font-black text-3xl shadow-2xl shadow-indigo-200 ring-4 ring-indigo-50">{selectedUser.name?.charAt(0)}</div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedUser.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-indigo-500 font-black text-[11px] uppercase tracking-[0.2em]">{selectedUser.userId}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                        <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Nhân viên chính thức</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="p-4 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900 duration-300"><X size={24} strokeWidth={3} /></button>
                        </div>

                        <div className="flex justify-start sm:justify-center p-6 gap-4 bg-slate-50/50 border-b border-slate-50 overflow-x-auto custom-scrollbar shrink-0">
                            <TabBtn active={activeTab === 'late'} onClick={() => setActiveTab('late')} label="Đi Muộn" count={selectedUser.lateDates?.length || 0} />
                            <TabBtn active={activeTab === 'absent'} onClick={() => setActiveTab('absent')} label="Vắng Mặt" count={selectedUser.absentDates?.length || 0} />
                            <TabBtn active={activeTab === 'on-time'} onClick={() => setActiveTab('on-time')} label="Đúng Giờ" count={selectedUser.onTimeDates?.length || 0} />
                        </div>

                        <div className="p-10 overflow-y-auto bg-white flex-1 custom-scrollbar">
                            {activeTab === 'late' && (
                                <div className="space-y-4">
                                    {selectedUser.lateDates?.length > 0 ? selectedUser.lateDates.sort((a: number, b: number) => a - b).map((d: number) => <DetailItem key={d} day={d} info={selectedUser.days[d]?.checkIn || '--:--'} type="late" month={month} year={year} />) : <EmptyState msg="Thật tuyệt vời! Không có ngày nào đi muộn." icon={<CheckCircle2 size={32} className="text-emerald-500" />} />}
                                </div>
                            )}
                            {activeTab === 'absent' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {selectedUser.absentDates?.length > 0 ? selectedUser.absentDates.sort((a: number, b: number) => a - b).map((d: number) => <DetailItem key={d} day={d} info="Nghỉ" type="absent" month={month} year={year} />) : <EmptyState msg="Đi làm đầy đủ không sót ngày nào!" icon={<UserCheck size={32} className="text-indigo-500" />} />}
                                </div>
                            )}
                            {activeTab === 'on-time' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {selectedUser.onTimeDates?.length > 0 ? selectedUser.onTimeDates.sort((a: number, b: number) => a - b).map((d: number) => <DetailItem key={d} day={d} info={selectedUser.days[d]?.checkIn || '--:--'} type="on-time" month={month} year={year} />) : <EmptyState msg="Chưa có dữ liệu." />}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CSS Scrollbar */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #E2E8F0; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #CBD5E1; }
            `}</style>
        </div>
    );
}

// CÁC COMPONENT GIAO DIỆN ĐƯỢC LÀM LẠI CHO ĐẸP VÀ CHUYÊN NGHIỆP
const MetricCard = ({ label, value, sub, type, icon: Icon }: any) => {
    const config: any = {
        primary: {
            bg: "bg-indigo-50/50",
            iconBg: "bg-indigo-500",
            border: "hover:border-indigo-200",
            text: "text-indigo-600",
            accent: "indigo"
        },
        danger: {
            bg: "bg-rose-50/50",
            iconBg: "bg-rose-500",
            border: "hover:border-rose-200",
            text: "text-rose-600",
            accent: "rose"
        },
        neutral: {
            bg: "bg-slate-50/50",
            iconBg: "bg-slate-500",
            border: "hover:border-slate-200",
            text: "text-slate-600",
            accent: "slate"
        }
    };

    const s = config[type];

    return (
        <div className={`group relative p-8 rounded-[40px] bg-white border border-slate-100 ${s.border} shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden`}>
            <div className={`absolute -top-10 -right-10 w-40 h-40 ${s.bg} rounded-full -z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl`} />
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-3xl ${s.iconBg} text-white shadow-xl shadow-${s.accent}-100 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                        <Icon size={24} strokeWidth={2.5} />
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300 group-hover:text-slate-500 transition-colors">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{sub}</span>
                        <ChevronRightCircle size={14} strokeWidth={2.5} />
                    </div>
                </div>
                
                <div>
                    <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">{label}</h3>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">{value}</span>
                        <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest">Người</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Legend = ({ label, color, description }: any) => (
    <div className="flex items-center gap-4 px-6 py-3 bg-slate-50/50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-md cursor-default">
        <div className={`w-3.5 h-3.5 rounded-full ${color} shadow-lg shadow-current/20 animate-pulse`} />
        <div className="flex flex-col">
            <span className="text-[13px] font-black text-slate-800 leading-none">{label}</span>
            {description && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1.5">{description}</span>}
        </div>
    </div>
);

const TabBtn = ({ active, onClick, label, count }: any) => {
    return (
        <button 
            onClick={onClick} 
            className={`flex items-center gap-3 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all duration-300 whitespace-nowrap
                ${active 
                    ? 'bg-slate-900 text-white shadow-2xl shadow-slate-200 translate-y-[-4px]' 
                    : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100 hover:text-slate-600'}`}
        >
            {label}
            {count !== undefined && (
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-colors ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                    {count}
                </span>
            )}
        </button>
    );
};

const DetailItem = ({ day, info, type, month, year }: any) => {
    const config: any = { 
        'late': { color: "text-rose-600", bg: "bg-rose-50", label: "Đi muộn", icon: Clock },
        'absent': { color: "text-slate-400", bg: "bg-slate-50", label: "Vắng mặt", icon: X },
        'on-time': { color: "text-emerald-600", bg: "bg-emerald-50", label: "Đúng giờ", icon: CheckCircle2 }
    };
    const s = config[type];
    const Icon = s.icon;

    // Helper for date
    const date = new Date(year, month - 1, day);
    const dayName = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][date.getDay()];

    return (
        <div className="group flex justify-between items-center p-5 rounded-[32px] bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-500">
            <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl ${s.bg} ${s.color} flex flex-col items-center justify-center font-black shadow-inner`}>
                    <span className="text-xs leading-none mb-1 opacity-60 uppercase">{dayName.split(' ')[0]}</span>
                    <span className="text-xl leading-none">{day < 10 ? `0${day}` : day}</span>
                </div>
                <div>
                    <p className="font-black text-slate-900 text-sm tracking-tight">{dayName}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <Icon size={12} strokeWidth={3} className={s.color} />
                        <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${s.color}`}>{s.label}</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                    {type !== 'absent' && <Clock size={12} className="text-slate-400" />}
                    <span className="block text-sm font-black text-slate-900 tabular-nums">{info}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5 block">Tháng {month}/{year}</span>
            </div>
        </div>
    );
};

const EmptyState = ({ msg, icon }: any) => (
    <div className="flex flex-col items-center justify-center py-24 px-10 bg-slate-50/50 rounded-[48px] border-4 border-dashed border-slate-100 text-center w-full">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl shadow-slate-100">
            {icon || <Info size={40} className="text-slate-200" strokeWidth={2.5} />}
        </div>
        <h3 className="text-slate-900 font-black text-xl mb-3 tracking-tight">Thông báo hệ thống</h3>
        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest max-w-[280px] leading-relaxed">{msg}</p>
    </div>
);
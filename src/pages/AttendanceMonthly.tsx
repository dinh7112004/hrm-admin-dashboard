import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ChevronLeft, ChevronRight, FileSpreadsheet, Search,
    Users, AlertCircle, CheckCircle2, X, Clock, Calendar, Info, ChevronRightCircle
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
                            className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-[#7C3AED] cursor-pointer transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white ${kpiModal.type === 'late' ? 'bg-[#EF4444]' : kpiModal.type === 'absent' ? 'bg-gray-400' : 'bg-[#7C3AED]'}`}>
                                    {u.name?.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-[#1E1E2D] group-hover:text-[#7C3AED] transition-colors">{u.name}</p>
                                    <p className="text-[11px] font-medium text-[#A0A0B0] mt-0.5 uppercase tracking-wide">{u.userId}</p>
                                </div>
                            </div>
                            {extraInfo && <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl ${kpiModal.type === 'late' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{extraInfo}</span>}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-[#F4F5F9] min-h-screen p-8 font-sans text-[#1E1E2D]">
            <div className="max-w-[1650px] mx-auto space-y-8">

                {/* HEADER */}
                <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-6 rounded-[32px] shadow-sm border border-gray-50">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-[#F3EFFF] rounded-2xl text-[#7C3AED]">
                            <Calendar size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-[#1E1E2D]">Bảng Công Tổng Hợp</h1>
                            <p className="text-[13px] font-medium text-[#A0A0B0] mt-1">Báo cáo dữ liệu tháng {month}/{year}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-6 lg:mt-0">
                        <div className="flex items-center bg-[#F4F5F9] rounded-2xl p-1.5">
                            <button onClick={() => setMonth(m => m === 1 ? 12 : m - 1)} className="p-2.5 bg-white shadow-sm rounded-xl text-gray-600 hover:text-[#7C3AED] transition-all"><ChevronLeft size={20} /></button>
                            <div className="px-6 text-center min-w-[140px]">
                                <p className="text-[15px] font-bold text-[#1E1E2D]">Tháng {month < 10 ? `0${month}` : month} / {year}</p>
                            </div>
                            <button onClick={() => setMonth(m => m === 12 ? 1 : m + 1)} className="p-2.5 bg-white shadow-sm rounded-xl text-gray-600 hover:text-[#7C3AED] transition-all"><ChevronRight size={20} /></button>
                        </div>
                    </div>
                </div>

                {/* THỐNG KÊ (KPI CARDS) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div onClick={() => setKpiModal({ type: 'total', subTab: 'all' })} className="cursor-pointer">
                        <MetricCard label="Tổng Nhân Sự" value={employees.length} sub="Xem danh sách" type="primary" />
                    </div>
                    <div onClick={() => setKpiModal({ type: 'late', subTab: 'today' })} className="cursor-pointer">
                        <MetricCard label="Đi Muộn Hôm Nay" value={lateTodayCount} sub="Bấm để xem chi tiết" type="danger" />
                    </div>
                    <div onClick={() => setKpiModal({ type: 'absent', subTab: 'today' })} className="cursor-pointer">
                        <MetricCard label="Vắng Hôm Nay" value={absentTodayCount} sub="Bấm để xem chi tiết" type="neutral" />
                    </div>
                </div>

                {/* BẢNG CHẤM CÔNG */}
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-40">
                        <div className="relative w-[350px]">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#A0A0B0]" size={18} />
                            <input type="text" placeholder="Tìm kiếm nhân viên..." className="w-full pl-12 pr-6 py-3.5 bg-[#F4F5F9] rounded-2xl outline-none font-medium text-[14px] text-[#1E1E2D] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all" onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex gap-6">
                            <Legend label="Có mặt" color="bg-[#7C3AED]" />
                            <Legend label="Đi muộn" color="bg-[#EF4444]" />
                            <Legend label="Vắng mặt" color="bg-gray-200" />
                        </div>
                    </div>

                    <div className="overflow-auto max-h-[600px] custom-scrollbar">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 z-40 bg-[#F4F5F9] px-8 py-5 text-left text-[12px] font-bold text-[#A0A0B0] uppercase tracking-wider min-w-[280px]">Nhân viên</th>
                                    {daysArray.map(d => {
                                        const dayName = getDayOfWeek(d);
                                        const isWeekend = dayName === 'CN' || dayName === 'T7';
                                        return (
                                            <th key={d} className={`p-2 text-center bg-white border-b border-gray-50 min-w-[45px] ${isWeekend ? 'bg-gray-50/50' : ''}`}>
                                                <div className={`text-[11px] font-bold mb-1 ${dayName === 'CN' ? 'text-[#EF4444]' : 'text-[#A0A0B0]'}`}>{dayName}</div>
                                                <div className="text-[13px] font-bold text-[#1E1E2D]">{d}</div>
                                            </th>
                                        );
                                    })}
                                    <th className="sticky right-0 z-40 bg-[#F4F5F9] px-8 py-5 text-center text-[12px] font-bold text-[#A0A0B0] uppercase tracking-wider">Tổng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={daysInMonth + 2} className="py-32 text-center font-medium text-[#A0A0B0] text-lg">Đang tải dữ liệu chấm công...</td></tr>
                                ) : filteredData.map((user, idx) => (
                                    <tr key={user._id || idx} className="hover:bg-[#F9F8FF] transition-all group">
                                        <td className="px-8 py-4 sticky left-0 bg-white group-hover:bg-[#F9F8FF] z-30 border-r border-gray-50 cursor-pointer" onClick={() => { setSelectedUser(user); setActiveTab('late'); }}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-[#F3EFFF] text-[#7C3AED] flex items-center justify-center font-bold text-sm">{user.name?.charAt(0)}</div>
                                                <div>
                                                    <p className="font-bold text-[14px] text-[#1E1E2D] group-hover:text-[#7C3AED]">{user.name}</p>
                                                    <p className="text-[11px] font-medium text-[#A0A0B0] mt-0.5">{user.userId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {daysArray.map(day => {
                                            const dayData = user.days?.[day];
                                            const isPast = (month === (new Date().getMonth() + 1)) ? day <= todayNum : true;
                                            const isWeekend = getDayOfWeek(day) === 'CN' || getDayOfWeek(day) === 'T7';
                                            const bgClass = isWeekend ? 'bg-gray-50/50' : '';

                                            if (dayData?.status === 'APPROVED' || dayData?.status === 'PENDING') {
                                                return <td key={day} className={`p-1 text-center ${bgClass}`}><div className={`w-2.5 h-2.5 rounded-full mx-auto ${dayData.isLate ? "bg-[#EF4444]" : "bg-[#7C3AED]"}`} /></td>;
                                            }
                                            else if (isPast) {
                                                return <td key={day} className={`p-1 text-center ${bgClass}`}><div className="w-2.5 h-2.5 rounded-full mx-auto bg-gray-200" /></td>;
                                            }
                                            return <td key={day} className={`p-1 text-center ${bgClass}`}></td>;
                                        })}
                                        <td className="sticky right-0 z-30 bg-white group-hover:bg-[#F9F8FF] px-8 py-4 text-center border-l border-gray-50">
                                            <span className="bg-[#F4F5F9] px-4 py-1.5 rounded-lg font-bold text-[14px] text-[#7C3AED]">
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

            {/* MODAL DANH SÁCH NHANH */}
            {kpiModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-[#1E1E2D]/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-8 flex justify-between items-center border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-bold text-[#1E1E2D]">
                                    {kpiModal.type === 'total' ? 'Danh Sách Nhân Sự' : kpiModal.type === 'late' ? 'Báo Cáo Đi Muộn' : 'Báo Cáo Vắng Mặt'}
                                </h2>
                            </div>
                            <button onClick={() => setKpiModal(null)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-all text-gray-500"><X size={20} /></button>
                        </div>

                        {kpiModal.type !== 'total' && (
                            <div className="flex px-8 py-4 gap-3 bg-white border-b border-gray-50">
                                <TabBtn active={kpiModal.subTab === 'today'} onClick={() => setKpiModal({ ...kpiModal, subTab: 'today' })} label={`Hôm nay (${todayNum})`} />
                                <TabBtn active={kpiModal.subTab === 'yesterday'} onClick={() => setKpiModal({ ...kpiModal, subTab: 'yesterday' })} label={`Hôm qua (${yesterdayNum})`} />
                                <TabBtn active={kpiModal.subTab === 'month'} onClick={() => setKpiModal({ ...kpiModal, subTab: 'month' })} label="Cả tháng" />
                            </div>
                        )}
                        <div className="p-8 h-[400px] overflow-y-auto bg-[#F4F5F9]/50">
                            {renderKpiList()}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CHI TIẾT 1 NHÂN VIÊN */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1E1E2D]/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-8 flex justify-between items-center bg-white border-b border-gray-50">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-[#F3EFFF] text-[#7C3AED] flex items-center justify-center font-bold text-2xl">{selectedUser.name?.charAt(0)}</div>
                                <div>
                                    <h2 className="text-xl font-bold text-[#1E1E2D]">{selectedUser.name}</h2>
                                    <p className="text-[#A0A0B0] font-medium mt-1 text-[13px]">Mã NV: {selectedUser.userId}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-all text-gray-500"><X size={20} /></button>
                        </div>

                        <div className="flex justify-center p-4 gap-2 bg-white border-b border-gray-50">
                            <TabBtn active={activeTab === 'late'} onClick={() => setActiveTab('late')} label={`Đi Muộn (${selectedUser.lateDates?.length || 0})`} />
                            <TabBtn active={activeTab === 'absent'} onClick={() => setActiveTab('absent')} label={`Vắng Mặt (${selectedUser.absentDates?.length || 0})`} />
                            <TabBtn active={activeTab === 'on-time'} onClick={() => setActiveTab('on-time')} label={`Đúng Giờ (${selectedUser.onTimeDates?.length || 0})`} />
                        </div>

                        <div className="p-8 h-[350px] overflow-y-auto bg-[#F4F5F9]/50">
                            {activeTab === 'late' && (
                                <div className="space-y-3">
                                    {selectedUser.lateDates?.length > 0 ? selectedUser.lateDates.sort((a: number, b: number) => a - b).map((d: number) => <DetailItem key={d} day={d} info={`Vào lúc: ${selectedUser.days[d]?.checkIn || '--:--'}`} type="late" />) : <EmptyState msg="Không có ngày đi muộn nào!" icon={<CheckCircle2 size={32} className="text-[#7C3AED] mb-3 mx-auto" />} />}
                                </div>
                            )}
                            {activeTab === 'absent' && (
                                <div className="grid grid-cols-2 gap-3">
                                    {selectedUser.absentDates?.length > 0 ? selectedUser.absentDates.sort((a: number, b: number) => a - b).map((d: number) => <DetailItem key={d} day={d} info="Không có dữ liệu" type="absent" />) : <EmptyState msg="Đi làm đầy đủ." icon={<CheckCircle2 size={32} className="text-[#7C3AED] mb-3 mx-auto" />} />}
                                </div>
                            )}
                            {activeTab === 'on-time' && (
                                <div className="grid grid-cols-2 gap-3">
                                    {selectedUser.onTimeDates?.length > 0 ? selectedUser.onTimeDates.sort((a: number, b: number) => a - b).map((d: number) => <DetailItem key={d} day={d} info={`Vào lúc: ${selectedUser.days[d]?.checkIn || '--:--'}`} type="on-time" />) : <EmptyState msg="Chưa có dữ liệu." icon={<AlertCircle size={32} className="text-gray-400 mb-3 mx-auto" />} />}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// CÁC COMPONENT GIAO DIỆN ĐƯỢC LÀM LẠI CHO ĐẸP
const MetricCard = ({ label, value, sub, type }: any) => {
    const styles: any = {
        primary: "text-[#7C3AED] bg-white hover:border-[#7C3AED]/30",
        danger: "text-[#EF4444] bg-white hover:border-[#EF4444]/30",
        neutral: "text-[#1E1E2D] bg-white hover:border-gray-300"
    };
    return (
        <div className={`p-6 rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition-all group ${styles[type]}`}>
            <p className="text-[13px] font-bold text-[#A0A0B0] mb-3 group-hover:text-current transition-colors">{label}</p>
            <div className="flex justify-between items-end">
                <span className="text-4xl font-black">{value}</span>
                <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-current transition-colors opacity-70">
                    <span className="text-[12px] font-medium">{sub}</span>
                    <ChevronRightCircle size={14} />
                </div>
            </div>
        </div>
    );
};

const Legend = ({ label, color }: any) => (
    <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-[13px] font-medium text-[#1E1E2D]">{label}</span>
    </div>
);

// Tab chuyển sang dạng Pill (Viên thuốc) bo tròn 100% giống App
const TabBtn = ({ active, onClick, label }: any) => {
    return (
        <button onClick={onClick} className={`px-5 py-2.5 rounded-full font-bold text-[13px] transition-all ${active ? 'bg-[#F3EFFF] text-[#7C3AED]' : 'text-[#A0A0B0] hover:bg-gray-100'}`}>
            {label}
        </button>
    );
};

const DetailItem = ({ day, info, type }: any) => {
    const indicatorColor: any = { 'late': "bg-[#EF4444]", 'absent': "bg-gray-300", 'on-time': "bg-[#7C3AED]" };
    return (
        <div className="flex justify-between items-center p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${indicatorColor[type]}`} />
                <span className="font-bold text-[14px] text-[#1E1E2D]">Ngày {day < 10 ? `0${day}` : day}</span>
            </div>
            <span className="bg-[#F4F5F9] text-[#A0A0B0] text-[12px] font-bold px-3 py-1.5 rounded-xl">{info}</span>
        </div>
    );
};

const EmptyState = ({ msg, icon }: any) => (
    <div className="text-center py-12 bg-white rounded-[24px] border border-dashed border-gray-200 col-span-full">
        {icon || <Info size={32} className="text-gray-300 mb-3 mx-auto" />}
        <p className="text-[14px] font-medium text-[#A0A0B0]">{msg}</p>
    </div>
);
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

    // State cho Modal chi tiết 1 Nhân viên
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'late' | 'absent' | 'on-time'>('late');

    // State cho Modal xem nhanh KPI (Tổng, Muộn, Vắng)
    const [kpiModal, setKpiModal] = useState<{ type: 'total' | 'late' | 'absent', subTab: string } | null>(null);

    const daysInMonth = new Date(year, month, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const todayNum = new Date().getDate();
    const yesterdayNum = todayNum > 1 ? todayNum - 1 : 1; // Xử lý tạm hôm qua nếu là mùng 1
    const isThisMonth = month === (new Date().getMonth() + 1) && year === new Date().getFullYear();

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

                    // Biến đếm TỔNG CÔNG chuẩn xác nhất
                    let calculatedTotalWorkDays = 0;

                    daysArray.forEach(d => {
                        const dayData = days[d];

                        // ĐẾM TỔNG CÔNG: Đếm y hệt logic vẽ dấu chấm (Có APPROVED hoặc PENDING là auto cộng 1 ngày)
                        if (dayData?.status === 'APPROVED' || dayData?.status === 'PENDING') {
                            calculatedTotalWorkDays++;
                        }

                        // LOGIC KIỂM TRA ĐI MUỘN/VẮNG: Vẫn giữ lại để phục vụ Dashboard & Modal Chi Tiết
                        const isPast = isThisMonth ? d <= todayNum : true;
                        if (isPast) {
                            if (!dayData || dayData.status === 'REJECTED') {
                                userAbsentDates.push(d);
                            }
                            else if (dayData.status === 'APPROVED' || dayData.status === 'PENDING') {
                                if (dayData.isLate) {
                                    userLateDates.push(d);
                                } else {
                                    userOnTimeDates.push(d);
                                }
                            }
                        }
                    });

                    return {
                        ...u,
                        days,
                        totalWorkDays: calculatedTotalWorkDays, // Dùng biến đếm chuẩn
                        totalLate: userLateDates.length,
                        absentDates: userAbsentDates,
                        onTimeDates: userOnTimeDates,
                        lateDates: userLateDates
                    };
                });
                setEmployees(finalReport);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchData();
    }, [month, year]);

    // Lọc số liệu KPI trên Header
    const absentTodayCount = isThisMonth ? employees.filter(e => e.absentDates.includes(todayNum)).length : 0;
    const lateTodayCount = isThisMonth ? employees.filter(e => e.lateDates.includes(todayNum)).length : 0;

    const filteredData = employees.filter(e => e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || e.userId?.toLowerCase().includes(searchTerm.toLowerCase()));

    // Hàm render danh sách User trong KPI Modal
    const renderKpiList = () => {
        if (!kpiModal) return null;
        let list: any[] = [];
        let emptyMsg = "Không có dữ liệu.";

        if (kpiModal.type === 'total') {
            list = employees;
            emptyMsg = "Chưa có nhân sự nào.";
        } else if (kpiModal.type === 'late') {
            if (kpiModal.subTab === 'today') {
                list = employees.filter(e => e.lateDates.includes(todayNum));
                emptyMsg = "Hôm nay không ai đi muộn.";
            } else if (kpiModal.subTab === 'yesterday') {
                list = employees.filter(e => e.lateDates.includes(yesterdayNum));
                emptyMsg = "Hôm qua không ai đi muộn.";
            } else {
                list = employees.filter(e => e.totalLate > 0);
                emptyMsg = "Tháng này không có ai đi muộn.";
            }
        } else if (kpiModal.type === 'absent') {
            if (kpiModal.subTab === 'today') {
                list = employees.filter(e => e.absentDates.includes(todayNum));
                emptyMsg = "Hôm nay đi làm đầy đủ.";
            } else if (kpiModal.subTab === 'yesterday') {
                list = employees.filter(e => e.absentDates.includes(yesterdayNum));
                emptyMsg = "Hôm qua đi làm đầy đủ.";
            } else {
                list = employees.filter(e => e.absentDates.length > 0);
                emptyMsg = "Tháng này không ai vắng mặt.";
            }
        }

        if (list.length === 0) return <EmptyState msg={emptyMsg} />;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {list.map((u, i) => {
                    let extraInfo = "";
                    if (kpiModal.type === 'late') {
                        if (kpiModal.subTab === 'today') extraInfo = `Vào lúc: ${u.days[todayNum]?.checkIn}`;
                        else if (kpiModal.subTab === 'yesterday') extraInfo = `Vào lúc: ${u.days[yesterdayNum]?.checkIn}`;
                        else extraInfo = `Tổng muộn: ${u.totalLate} lần`;
                    } else if (kpiModal.type === 'absent') {
                        if (kpiModal.subTab === 'month') extraInfo = `Tổng vắng: ${u.absentDates.length} ngày`;
                        else extraInfo = "Chưa check-in";
                    }

                    return (
                        <div key={i} onClick={() => { setKpiModal(null); setSelectedUser(u); setActiveTab(kpiModal.type === 'absent' ? 'absent' : 'late'); }} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white ${kpiModal.type === 'late' ? 'bg-rose-500' : kpiModal.type === 'absent' ? 'bg-gray-400' : 'bg-[#111C44]'}`}>
                                    {u.name?.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-black text-sm uppercase group-hover:text-blue-600 transition-colors">{u.name}</p>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{u.userId}</p>
                                </div>
                            </div>
                            {extraInfo && <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg border ${kpiModal.type === 'late' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>{extraInfo}</span>}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-[#F4F7FE] min-h-screen p-8 font-sans text-[#1B2559]">
            <div className="max-w-[1650px] mx-auto space-y-8">

                {/* HEADER */}
                <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-8 rounded-[40px] shadow-xl border border-white">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-[#111C44] rounded-3xl text-white shadow-lg shadow-indigo-200">
                            <Calendar size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight uppercase italic">Bảng Công Tổng Hợp</h1>
                            <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mt-1 italic">Dữ liệu tháng {month}/{year}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 mt-6 lg:mt-0">
                        <div className="flex items-center bg-gray-50 rounded-2xl p-2 border border-gray-100 shadow-inner">
                            <button onClick={() => setMonth(m => m === 1 ? 12 : m - 1)} className="p-3 hover:bg-white rounded-xl transition-all"><ChevronLeft size={24} /></button>
                            <div className="px-10 text-center min-w-[160px]">
                                <p className="text-lg font-black text-[#111C44]">{month < 10 ? `0${month}` : month} / {year}</p>
                            </div>
                            <button onClick={() => setMonth(m => m === 12 ? 1 : m + 1)} className="p-3 hover:bg-white rounded-xl transition-all"><ChevronRight size={24} /></button>
                        </div>
                    </div>
                </div>

                {/* METRICS - BẤM VÀO ĐƯỢC */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div onClick={() => setKpiModal({ type: 'total', subTab: 'all' })} className="cursor-pointer">
                        <MetricCard label="Tổng Nhân Sự" value={employees.length} sub="Xem danh sách" color="indigo" />
                    </div>

                    <div onClick={() => setKpiModal({ type: 'late', subTab: 'today' })} className="cursor-pointer">
                        <MetricCard label="Đi Muộn Hôm Nay" value={lateTodayCount} sub="Bấm để xem chi tiết" color="rose" />
                    </div>

                    <div onClick={() => setKpiModal({ type: 'absent', subTab: 'today' })} className="cursor-pointer">
                        <MetricCard label="Vắng Hôm Nay" value={absentTodayCount} sub="Bấm để xem chi tiết" color="slate" />
                    </div>
                </div>

                {/* BẢNG CHÍNH */}
                <div className="bg-white rounded-[48px] shadow-2xl border border-white overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-40">
                        <div className="relative w-1/3">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                            <input type="text" placeholder="Tìm tên hoặc mã nhân viên..." className="w-full pl-16 pr-8 py-5 bg-gray-50 rounded-3xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-100" onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex gap-4">
                            <Legend label="Đúng giờ" color="bg-emerald-500" />
                            <Legend label="Đi muộn" color="bg-rose-500" />
                            <Legend label="Nghỉ/Vắng" color="text-rose-200" symbol="✖" />
                        </div>
                    </div>

                    <div className="overflow-auto max-h-[600px]">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="sticky left-0 z-40 bg-white px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase border-b border-gray-100 min-w-[300px]">Họ và Tên</th>
                                    {daysArray.map(d => <th key={d} className="p-3 text-center text-[11px] font-black text-gray-300 border-b border-gray-100">{d < 10 ? `0${d}` : d}</th>)}
                                    <th className="sticky right-0 z-40 bg-[#111C44] px-10 py-6 text-center text-[11px] font-black text-white uppercase border-b border-slate-900 shadow-[-10px_0_30px_rgba(0,0,0,0.1)]">Tổng Công</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={daysInMonth + 2} className="py-40 text-center font-black text-gray-200 animate-pulse text-2xl uppercase">Đang tải dữ liệu...</td></tr>
                                ) : filteredData.map((user, idx) => (
                                    <tr key={user._id || idx} className="hover:bg-blue-50/40 transition-all group">
                                        <td className="px-10 py-6 sticky left-0 bg-white group-hover:bg-[#F4F7FE] z-30 border-r border-gray-100 cursor-pointer" onClick={() => { setSelectedUser(user); setActiveTab('late'); }}>
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-[#111C44] flex items-center justify-center font-black text-white text-xs shadow-lg group-hover:scale-110 transition-transform">{user.name?.charAt(0)}</div>
                                                <div>
                                                    <p className="font-black text-sm uppercase group-hover:text-blue-600 transition-colors">{user.name}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{user.userId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {daysArray.map(day => {
                                            const dayData = user.days?.[day];
                                            const isPast = (month === (new Date().getMonth() + 1)) ? day <= todayNum : true;

                                            // Chờ duyệt và Đã duyệt đều được lên mảng màu
                                            if (dayData?.status === 'APPROVED' || dayData?.status === 'PENDING') return <td key={day} className="p-1 text-center"><div className={`w-3 h-3 rounded-full mx-auto ${dayData.isLate ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-emerald-500"}`} /></td>;
                                            else if (isPast) return <td key={day} className="p-1 text-center"><span className="text-[11px] font-black text-rose-200 uppercase">✖</span></td>;
                                            return <td key={day} className="p-1 text-center"></td>;
                                        })}
                                        {/* Hiển thị Total chuẩn xác 100% khớp với số lượng chấm trên bảng */}
                                        <td className="sticky right-0 z-30 bg-white group-hover:bg-[#F4F7FE] px-10 py-6 text-center border-l border-gray-100">
                                            <span className="bg-gray-100 px-4 py-2 rounded-xl font-black text-lg text-[#111C44]">
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

            {/* KBI GLOBAL MODAL */}
            {kpiModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-[#111C44]/80 backdrop-blur-xl">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden border border-white">
                        <div className="p-8 flex justify-between items-center border-b border-gray-100 bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter">
                                    {kpiModal.type === 'total' ? 'Danh Sách Tổng Nhân Sự' : kpiModal.type === 'late' ? 'Báo Cáo Đi Muộn' : 'Báo Cáo Vắng Mặt'}
                                </h2>
                                <p className="text-blue-600 font-bold mt-1 uppercase tracking-[0.2em] text-[10px]">Cập nhật thời gian thực</p>
                            </div>
                            <button onClick={() => setKpiModal(null)} className="p-3 bg-white hover:bg-rose-500 hover:text-white rounded-full transition-all text-gray-400 shadow-sm"><X size={24} /></button>
                        </div>

                        {kpiModal.type !== 'total' && (
                            <div className="flex px-8 pt-6 gap-3 bg-white border-b border-gray-50">
                                <TabBtn active={kpiModal.subTab === 'today'} onClick={() => setKpiModal({ ...kpiModal, subTab: 'today' })} label={`Hôm nay (Ngày ${todayNum})`} color={kpiModal.type === 'late' ? 'rose' : 'slate'} />
                                <TabBtn active={kpiModal.subTab === 'yesterday'} onClick={() => setKpiModal({ ...kpiModal, subTab: 'yesterday' })} label={`Hôm qua (Ngày ${yesterdayNum})`} color={kpiModal.type === 'late' ? 'rose' : 'slate'} />
                                <TabBtn active={kpiModal.subTab === 'month'} onClick={() => setKpiModal({ ...kpiModal, subTab: 'month' })} label="Tổng cả tháng" color={kpiModal.type === 'late' ? 'rose' : 'slate'} />
                            </div>
                        )}

                        <div className="p-8 h-[400px] overflow-y-auto bg-gray-50/30">
                            {renderKpiList()}
                        </div>
                    </div>
                </div>
            )}

            {/* DETAIL USER MODAL */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#111C44]/80 backdrop-blur-xl">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-white transition-all">
                        <div className="p-8 flex justify-between items-center border-b border-gray-100 bg-[#F4F7FE]/50">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-[#111C44] flex items-center justify-center text-white font-black text-xl shadow-xl">{selectedUser.name?.charAt(0)}</div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{selectedUser.name}</h2>
                                    <p className="text-blue-600 font-bold mt-2 uppercase tracking-[0.2em] text-[10px]">Mã NV: {selectedUser.userId}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="p-3 bg-white hover:bg-rose-500 hover:text-white rounded-full transition-all text-gray-400 shadow-sm"><X size={24} /></button>
                        </div>

                        <div className="flex px-8 pt-6 gap-3 bg-white border-b border-gray-50">
                            <TabBtn active={activeTab === 'late'} onClick={() => setActiveTab('late')} label={`Đi Muộn (${selectedUser.lateDates.length})`} color="rose" />
                            <TabBtn active={activeTab === 'absent'} onClick={() => setActiveTab('absent')} label={`Vắng Mặt (${selectedUser.absentDates.length})`} color="slate" />
                            <TabBtn active={activeTab === 'on-time'} onClick={() => setActiveTab('on-time')} label={`Đúng Giờ (${selectedUser.onTimeDates.length})`} color="emerald" />
                        </div>

                        <div className="p-8 h-[350px] overflow-y-auto bg-gray-50/30">
                            {activeTab === 'late' && (
                                <div className="space-y-3">
                                    {selectedUser.lateDates.length > 0 ? selectedUser.lateDates.sort((a: number, b: number) => a - b).map((d: number) => <DetailItem key={d} day={d} info={`Check-in: ${selectedUser.days[d].checkIn}`} type="late" />) : <EmptyState msg="Tuyệt vời! Không có ngày đi muộn nào." icon={<CheckCircle2 size={32} className="text-emerald-400 mb-2 mx-auto" />} />}
                                </div>
                            )}
                            {activeTab === 'absent' && (
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedUser.absentDates.length > 0 ? selectedUser.absentDates.sort((a: number, b: number) => a - b).map((d: number) => <DetailItem key={d} day={d} info="Không có dữ liệu" type="absent" />) : <EmptyState msg="Gương mẫu! Đi làm đầy đủ." icon={<CheckCircle2 size={32} className="text-emerald-400 mb-2 mx-auto" />} />}
                                </div>
                            )}
                            {activeTab === 'on-time' && (
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedUser.onTimeDates.length > 0 ? selectedUser.onTimeDates.sort((a: number, b: number) => a - b).map((d: number) => <DetailItem key={d} day={d} info={`Check-in: ${selectedUser.days[d].checkIn}`} type="on-time" />) : <EmptyState msg="Chưa có dữ liệu đi làm đúng giờ." icon={<AlertCircle size={32} className="text-gray-300 mb-2 mx-auto" />} />}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* COMPONENTS */
const MetricCard = ({ label, value, sub, color }: any) => {
    const colors: any = { indigo: "text-blue-600", rose: "text-rose-600", slate: "text-[#111C44]" };
    return (
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 transition-all group">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 group-hover:text-blue-500">{label}</p>
            <div className="flex justify-between items-end">
                <div className="flex items-end gap-3">
                    <span className={`text-5xl font-black tracking-tighter ${colors[color]}`}>{value}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-300 group-hover:text-blue-500 transition-colors">
                    <span className="text-[10px] font-bold uppercase italic">{sub}</span>
                    <ChevronRightCircle size={14} />
                </div>
            </div>
        </div>
    );
};

const Legend = ({ label, color, symbol }: any) => (
    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
        {symbol ? <span className={`text-xs font-black ${color}`}>{symbol}</span> : <div className={`w-3 h-3 rounded-full ${color}`} />}
        <span className="text-[10px] font-black text-[#1B2559] uppercase tracking-widest">{label}</span>
    </div>
);

const TabBtn = ({ active, onClick, label, color }: any) => {
    const colors: any = {
        rose: active ? "bg-rose-50 text-rose-600 border-rose-200" : "text-gray-400 hover:bg-gray-50 border-transparent",
        slate: active ? "bg-gray-100 text-[#111C44] border-gray-300" : "text-gray-400 hover:bg-gray-50 border-transparent",
        emerald: active ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "text-gray-400 hover:bg-gray-50 border-transparent",
    };
    return (
        <button onClick={onClick} className={`px-6 py-3 rounded-t-2xl font-black text-[11px] uppercase tracking-widest border-b-2 transition-all ${colors[color]}`}>
            {label}
        </button>
    );
};

const DetailItem = ({ day, info, type }: any) => {
    const styles: any = { 'late': "border-l-rose-500 bg-white", 'absent': "border-l-gray-400 bg-white opacity-70", 'on-time': "border-l-emerald-500 bg-white" };
    const textColors: any = { 'late': 'text-rose-600', 'absent': 'text-gray-500', 'on-time': 'text-emerald-600' };
    return (
        <div className={`flex justify-between items-center p-4 rounded-2xl border border-gray-100 border-l-4 shadow-sm hover:scale-[1.02] transition-transform ${styles[type]}`}>
            <span className={`font-black text-sm uppercase ${textColors[type]}`}>Ngày {day < 10 ? `0${day}` : day}</span>
            <span className="bg-gray-50 text-[#111C44] text-[10px] font-black px-3 py-1.5 rounded-lg border border-gray-100">{info}</span>
        </div>
    );
};

const EmptyState = ({ msg, icon }: any) => (
    <div className="text-center py-16 bg-white rounded-[32px] border-2 border-dashed border-gray-100 col-span-full">
        {icon || <Info size={32} className="text-gray-300 mb-2 mx-auto" />}
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{msg}</p>
    </div>
);
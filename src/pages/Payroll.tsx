import React, { useEffect, useState } from 'react';
import {
    DollarSign, ChevronLeft, ChevronRight, X,
    CalendarX2, Briefcase,
    Search, MoreHorizontal, Lock, Unlock,
    ArrowUpRight, ArrowDownRight, Wallet, History, CheckCircle, Clock9,
    AlertTriangle, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { API_BASE } from '../../apiConfig';

const axiosConfig = {
    headers: { 'ngrok-skip-browser-warning': 'true' }
};

interface IPayroll {
    _id: string;
    userId: {
        _id: string;
        name: string;
        phone: string;
        email?: string;
        baseSalary?: number;
    } | null;
    baseSalary: number;
    bonus: number;
    bonusDetails?: { reason: string, amount: number, date: string }[];
    fine: number;
    fineDetails?: { reason: string, amount: number, date: string }[];
    netSalary: number;
    netSalaryFull: number;
    actualWorkDays?: number;
    actualWorkHours?: number;
    rawWorkHours?: number;      // Giờ chấm công thực tế
    paidLeaveHours?: number;    // Giờ nghỉ phép có lương
    standardWorkDays?: number;
    status: 'PENDING' | 'CHECKED' | 'PAID';
}

export const Payroll = () => {
    const [employees, setEmployees] = useState<IPayroll[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState<Date | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [leaveLogs, setLeaveLogs] = useState<any[]>([]);
    const [expandedSection, setExpandedSection] = useState<'hours' | 'days' | 'leaves' | null>(null);

    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState<IPayroll | null>(null);
    const [adjData, setAdjData] = useState({
        bonusAmount: 0,
        bonusReason: '',
        fineAmount: 0,
        fineReason: ''
    });

    const getApiMonth = () => {
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        const y = currentDate.getFullYear();
        return `${m}-${y}`;
    };

    const getDisplayMonth = () => {
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        const y = currentDate.getFullYear();
        return `Tháng ${m}/${y}`;
    };

    const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    // Tính toán real-time: gọi calculate cho từng NV rồi cập nhật bảng
    const fetchData = async (silent = false) => {
        const apiMonth = getApiMonth();
        if (!silent) setLoading(true);
        else setSyncing(true);
        try {
            // Bước 1: Lấy danh sách nhân viên
            const usersRes = await axios.get(`${API_BASE}/users`, axiosConfig);
            const allUsers = usersRes.data.filter((u: any) => u.isActive !== false);

            // Bước 2: Tính toán lại lương real-time cho từng nhân viên song song
            const calcResults = await Promise.allSettled(
                allUsers.map((user: any) =>
                    axios.post(`${API_BASE}/payroll/calculate`,
                        { userId: user._id, month: apiMonth },
                        axiosConfig
                    )
                )
            );

            // Bước 3: Ghép kết quả
            const mergedData: IPayroll[] = allUsers.map((user: any, idx: number) => {
                const result = calcResults[idx];
                const base = user.baseSalary || 0;

                if (result.status === 'fulfilled') {
                    return result.value.data as IPayroll;
                }

                // Fallback nếu tính thất bại
                return {
                    _id: `temp-${user._id}`,
                    userId: user,
                    baseSalary: base,
                    bonus: 0,
                    fine: 0,
                    netSalary: base,
                    netSalaryFull: base,
                    status: 'PENDING',
                    actualWorkDays: 0,
                    actualWorkHours: 0,
                    rawWorkHours: 0,
                    paidLeaveHours: 0,
                    bonusDetails: [],
                    fineDetails: []
                } as IPayroll;
            });

            setEmployees(mergedData);
            // Nếu modal đang mở, cập nhật selectedPayroll luôn
            setSelectedPayroll(prev => {
                if (!prev) return prev;
                const updated = mergedData.find(e => {
                    const eId = (e.userId as any)?._id || e.userId;
                    const pId = (prev.userId as any)?._id || prev.userId;
                    return eId === pId;
                });
                return updated ? { ...updated, status: prev.status } : prev;
            });
            setLastSynced(new Date());
        } catch (error) {
            console.error("Lỗi fetch:", error);
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    };

    // Load khi đổi tháng
    useEffect(() => { fetchData(); }, [currentDate]);

    // Auto-refresh mỗi 30 giây (silent - không hiện loading toàn trang)
    useEffect(() => {
        const interval = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(interval);
    }, [currentDate]);

    const updatePayrollStatus = async (id: string, newStatus: string) => {
        try {
            const res = await axios.patch(`${API_BASE}/payroll/status/${id}`, { status: newStatus }, axiosConfig);
            fetchData();
            if (selectedPayroll?._id === id) {
                setSelectedPayroll(res.data);
            }
        } catch (error) {
            alert("Lỗi khi cập nhật trạng thái!");
        }
    };

    const saveAdjustment = async () => {
        if (!selectedPayroll?.userId) return;

        const isBonus = adjData.bonusAmount > 0;
        const isFine = adjData.fineAmount > 0;
        if (!isBonus && !isFine) return alert("Vui lòng nhập số tiền!");

        setLoading(true);
        const apiMonth = getApiMonth();
        try {
            if (isBonus) {
                await axios.post(`${API_BASE}/payroll/adjustment`, {
                    userId: selectedPayroll.userId._id,
                    type: 'BONUS',
                    amount: adjData.bonusAmount,
                    reason: adjData.bonusReason || 'Thưởng thêm',
                    date: new Date().toISOString()
                }, axiosConfig);
            }
            if (isFine) {
                await axios.post(`${API_BASE}/payroll/adjustment`, {
                    userId: selectedPayroll.userId._id,
                    type: 'FINE',
                    amount: adjData.fineAmount,
                    reason: adjData.fineReason || 'Khấu trừ/Phạt',
                    date: new Date().toISOString()
                }, axiosConfig);
            }

            const res = await axios.post(`${API_BASE}/payroll/calculate`, { userId: selectedPayroll.userId._id, month: apiMonth }, axiosConfig);
            // Cập nhật lại state của nhân viên đang chọn với dữ liệu vừa tính toán xong
            setSelectedPayroll(res.data);
            setAdjData({ bonusAmount: 0, bonusReason: '', fineAmount: 0, fineReason: '' });
            
            // Ép bảng tổng bên ngoài cũng phải cập nhật theo
            await fetchData(true);
            toast.success("Đã cập nhật thưởng phạt và tính lại lương!");
        } catch (error) {
            alert("Lỗi hệ thống!");
        } finally {
            setLoading(false);
        }
    };

    const totalCompanySalary = employees.reduce((sum, e) => sum + e.netSalary, 0);
    const totalCompanyBaseSalary = employees.reduce((sum, e) => sum + e.baseSalary, 0);
    const totalCompanyBonus = employees.reduce((sum, e) => sum + e.bonus, 0);
    const totalCompanyFine = employees.reduce((sum, e) => sum + e.fine, 0);

    const filteredEmployees = employees.filter(e => e.userId?.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="bg-[#F8FAFC] min-h-screen p-4 md:p-10 font-sans text-slate-900">
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* HEADER */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-indigo-600 rounded-[24px] text-white shadow-xl shadow-indigo-100">
                            <Wallet size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Quản Lý Bảng Lương</h1>
                            <div className="flex items-center gap-3 mt-2">
                                {syncing ? (
                                    <>
                                        <RefreshCw size={12} className="text-indigo-400 animate-spin" />
                                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Đang cập nhật...</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Real-time • {lastSynced ? `Cập nhật ${lastSynced.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Đang tải...'}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        {/* Nút refresh thủ công */}
                        <button
                            onClick={() => fetchData()}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all disabled:opacity-50 border border-indigo-100"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Đang tính...' : 'Làm mới'}
                        </button>

                        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-3xl border border-slate-100 shadow-inner">
                            <button onClick={handlePrevMonth} className="p-3 bg-white shadow-sm rounded-2xl text-slate-600 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95"><ChevronLeft size={20} strokeWidth={3} /></button>
                            <div className="px-8 text-center min-w-[160px]">
                                <p className="text-base font-black text-slate-900">{getDisplayMonth()}</p>
                            </div>
                            <button onClick={handleNextMonth} className="p-3 bg-white shadow-sm rounded-2xl text-slate-600 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95"><ChevronRight size={20} strokeWidth={3} /></button>
                        </div>
                    </div>
                </div>

                {/* METRICS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    <MetricCard label="Quỹ Lương Cơ Bản" value={totalCompanyBaseSalary} sub="Tổng lương hợp đồng" type="primary" icon={Wallet} />
                    <MetricCard label="Quỹ Lương Theo Giờ Làm Việc" value={totalCompanySalary} sub="Thực nhận dựa trên số giờ làm" type="primary" icon={DollarSign} />
                    <MetricCard label="Tổng Thưởng" value={totalCompanyBonus} sub="Đã cộng vào lương" type="success" icon={ArrowUpRight} />
                    <MetricCard label="Tổng Phạt" value={totalCompanyFine} sub="Đã trừ vào lương" type="danger" icon={ArrowDownRight} />
                </div>

                {/* TABLE */}
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 sticky top-0 bg-white/95 backdrop-blur-md z-40">
                        <div className="relative w-full xl:w-[400px] group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} strokeWidth={2.5} />
                            <input
                                type="text"
                                placeholder="Tìm tên nhân viên..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-bold text-sm text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-200 transition-all"
                            />
                        </div>
                        <div className="flex gap-4 flex-wrap">
                            <LegendDot label="Lương hợp đồng" color="bg-emerald-500" />
                            <LegendDot label="Lương theo giờ" color="bg-indigo-500" />
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    <th className="px-10 py-6 text-left border-b border-slate-100">Nhân viên</th>
                                    <th className="px-6 py-6 text-center border-b border-slate-100">Lương cơ bản</th>
                                    <th className="px-6 py-6 text-center border-b border-slate-100">Ngày công</th>
                                    <th className="px-6 py-6 text-center border-b border-slate-100">Thưởng/Phạt</th>
                                    <th className="px-6 py-6 text-center border-b border-slate-100 text-emerald-600">Lương HĐ</th>
                                    <th className="px-6 py-6 text-center border-b border-slate-100 text-indigo-600">Lương Thực</th>
                                    <th className="px-6 py-6 text-center border-b border-slate-100">Trạng thái</th>
                                    <th className="px-10 py-6 text-right border-b border-slate-100">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan={8} className="py-20 text-center font-black text-slate-300 uppercase tracking-widest">
                                        <div className="flex flex-col items-center gap-3">
                                            <RefreshCw size={28} className="animate-spin text-indigo-300" />
                                            <span>Đang tính toán lương theo thời gian thực...</span>
                                        </div>
                                    </td></tr>
                                ) : filteredEmployees.map((p) => {
                                    const hasGap = p.netSalaryFull > p.netSalary;
                                    return (
                                        <tr
                                            key={p._id}
                                            className="hover:bg-indigo-50/50 transition-all group cursor-pointer"
                                            onClick={async () => {
                                                setSelectedPayroll(p);
                                                setExpandedSection(null);
                                                setLeaveLogs([]);
                                                setShowDetailModal(true);
                                                try {
                                                    const uid = (p.userId as any)?._id || p.userId;
                                                    const res = await axios.get(`${API_BASE}/leaves/user/${uid}/month/${getApiMonth()}`, axiosConfig);
                                                    setLeaveLogs(res.data);
                                                } catch (e) { console.log('Lỗi fetch leaves:', e); }
                                            }}
                                        >
                                            {/* 1. Nhân viên */}
                                            <td className="px-10 py-5">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                        {p.userId?.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-sm text-slate-900 group-hover:text-indigo-600 truncate">{p.userId?.name}</p>
                                                        <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">{p.userId?.phone}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 2. Lương cơ bản */}
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-sm font-black text-slate-600 tabular-nums">{p.baseSalary.toLocaleString()}đ</span>
                                            </td>

                                            {/* 3. Ngày công */}
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className={`px-5 py-2 rounded-2xl font-black text-[12px] tabular-nums ${hasGap && (p.actualWorkHours ?? 0) < (p.standardWorkDays ?? 26) * 8
                                                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                        }`}>
                                                        {parseFloat(((p.actualWorkHours ?? 0) / 8).toFixed(2))} công
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {parseFloat((p.actualWorkHours ?? 0).toFixed(2))}h / {p.standardWorkDays ?? 26} ng
                                                    </span>
                                                </div>
                                            </td>

                                            {/* 4. Thưởng / Phạt */}
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-emerald-500 font-black text-xs">+{p.bonus.toLocaleString()}đ</span>
                                                    <span className="text-rose-500 font-black text-xs">-{p.fine.toLocaleString()}đ</span>
                                                </div>
                                            </td>

                                            {/* 5. Lương hợp đồng (LHĐ) */}
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-sm font-black text-emerald-600 tabular-nums">{p.netSalaryFull.toLocaleString()}đ</span>
                                            </td>

                                            {/* 6. Lương thực (LT) */}
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`px-5 py-2 rounded-2xl font-black text-sm tabular-nums border transition-all ${hasGap && (p.rawWorkHours ?? p.actualWorkHours ?? 0) < (p.standardWorkDays ?? 26) * 8
                                                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                        : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                        }`}>
                                                        {p.netSalary.toLocaleString()}đ
                                                    </span>
                                                    {hasGap && (p.rawWorkHours ?? p.actualWorkHours ?? 0) < (p.standardWorkDays ?? 26) * 8 && !(p.paidLeaveHours && p.paidLeaveHours > 0) && (
                                                        <span className="text-[9px] font-black text-rose-500 flex items-center gap-1 uppercase">Thiếu công</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 7. Trạng thái */}
                                            <td className="px-6 py-5 text-center">
                                                <StatusBadge status={p.status} />
                                            </td>

                                            {/* 8. Hành động */}
                                            <td className="px-10 py-5 text-right">
                                                <div className={`p-3 rounded-2xl transition-all shadow-sm flex items-center justify-center w-10 h-10 ml-auto ${p.status === 'CHECKED' ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                                    {p.status === 'CHECKED' ? <Unlock size={18} strokeWidth={3} /> : <MoreHorizontal size={20} strokeWidth={3} />}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {showDetailModal && selectedPayroll && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-900/60 backdrop-blur-xl">
                    <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-6xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">
                        <div className="p-10 flex justify-between items-center border-b border-slate-50 bg-white shrink-0">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-[32px] bg-indigo-600 text-white flex items-center justify-center font-black text-3xl shadow-2xl shadow-indigo-200 ring-4 ring-indigo-50">
                                    {selectedPayroll.userId?.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedPayroll.userId?.name}</h2>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-indigo-600 font-black text-[11px] uppercase tracking-widest">{getApiMonth()}</span>
                                        <StatusBadge status={selectedPayroll.status} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedPayroll.status === 'PENDING' && (
                                    <button onClick={() => updatePayrollStatus(selectedPayroll._id, 'CHECKED')} className="flex items-center gap-2 px-6 py-4 bg-emerald-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100">
                                        <CheckCircle size={16} /> Chốt bảng lương
                                    </button>
                                )}
                                {selectedPayroll.status === 'CHECKED' && (
                                    <button onClick={() => updatePayrollStatus(selectedPayroll._id, 'PENDING')} className="flex items-center gap-2 px-6 py-4 bg-amber-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-100">
                                        <Unlock size={16} /> Mở lại để sửa
                                    </button>
                                )}
                                <button onClick={() => setShowDetailModal(false)} className="p-4 bg-slate-50 hover:bg-rose-50 rounded-full transition-all text-slate-400 hover:text-rose-500"><X size={24} strokeWidth={3} /></button>
                            </div>
                        </div>

                        <div className="p-10 overflow-y-auto bg-slate-50/30 flex-1 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                <div className="lg:col-span-4 space-y-6">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">TỔNG KẾT CÔNG THÁNG</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        {/* Giờ làm việc */}
                                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-[24px] p-5">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm"><Clock9 size={16} strokeWidth={3} /></div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1">Giờ làm việc</p>
                                            </div>
                                            <p className="text-xl font-black text-indigo-700 tabular-nums">{parseFloat((selectedPayroll.actualWorkHours ?? 0).toFixed(2))}h</p>
                                        </div>

                                        {/* Ngày công (Tính từ giờ) */}
                                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-[24px] p-5">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-white text-emerald-600 rounded-xl shadow-sm"><Briefcase size={16} strokeWidth={3} /></div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1">Ngày công</p>
                                            </div>
                                            <p className="text-xl font-black text-emerald-700 tabular-nums">
                                                {parseFloat(((selectedPayroll.actualWorkHours ?? 0) / 8).toFixed(2))} <span className="text-sm font-bold text-emerald-400">công</span>
                                            </p>
                                            <p className="text-[9px] text-emerald-400 font-bold mt-1 italic">* Quy đổi: 8 giờ làm việc = 1 công</p>
                                        </div>

                                        {/* CHI TIẾT NGHỈ PHÉP - Không còn xem chi tiết list nữa */}
                                        <div className="bg-teal-50/50 border border-teal-100 rounded-[24px] p-5 font-black">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-white text-teal-600 rounded-xl shadow-sm"><CalendarX2 size={16} strokeWidth={3} /></div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1">Nghỉ phép có lương</p>
                                            </div>
                                            <p className="text-xl font-black text-teal-700 tabular-nums">
                                                {parseFloat((selectedPayroll.paidLeaveHours ?? 0).toFixed(2))}h <span className="text-sm font-bold text-teal-400">đã duyệt</span>
                                            </p>
                                        </div>

                                        <MiniStatCard icon={Wallet} label="Lương gốc" value={`${selectedPayroll.baseSalary.toLocaleString()}đ`} color="slate" />
                                    </div>

                                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Cập nhật Thưởng / Phạt</h4>
                                        <div className="space-y-4">
                                            <input type="number" value={adjData.bonusAmount || adjData.fineAmount || ''} onChange={(e) => {
                                                const v = Number(e.target.value);
                                                if (adjData.fineAmount > 0) setAdjData({ ...adjData, fineAmount: v });
                                                else setAdjData({ ...adjData, bonusAmount: v });
                                            }} placeholder="Nhập số tiền..." className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-4 focus:ring-indigo-100 transition-all" />
                                            <div className="flex gap-2">
                                                <button onClick={() => setAdjData({ ...adjData, bonusAmount: Math.max(adjData.bonusAmount, adjData.fineAmount), fineAmount: 0, bonusReason: 'Thưởng KPI' })} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${adjData.bonusAmount > 0 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-400'}`}>Thưởng (+)</button>
                                                <button onClick={() => setAdjData({ ...adjData, fineAmount: Math.max(adjData.bonusAmount, adjData.fineAmount), bonusAmount: 0, fineReason: 'Phạt vi phạm' })} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${adjData.fineAmount > 0 ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-slate-100 text-slate-400'}`}>Phạt (-)</button>
                                            </div>
                                            <input type="text" value={adjData.bonusAmount > 0 ? adjData.bonusReason : adjData.fineReason} onChange={(e) => adjData.bonusAmount > 0 ? setAdjData({ ...adjData, bonusReason: e.target.value }) : setAdjData({ ...adjData, fineReason: e.target.value })} placeholder="Lý do..." className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-4 focus:ring-indigo-100 transition-all" />
                                            <button onClick={saveAdjustment} disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-50">{loading ? "Đang xử lý..." : "Cập nhật ngay"}</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm border-l-4 border-l-emerald-500">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lương hợp đồng</p>
                                            <p className="text-3xl font-black text-emerald-600 tabular-nums">{(selectedPayroll.netSalaryFull || 0).toLocaleString()}đ</p>
                                            <p className="text-[9px] text-slate-400 font-bold mt-2 italic">* Lương gốc + Thưởng - Phạt (không tính công)</p>
                                        </div>
                                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm border-l-4 border-l-indigo-500">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lương thực nhận (theo giờ)</p>
                                            <p className="text-3xl font-black text-indigo-600 tabular-nums">{(selectedPayroll.netSalary || 0).toLocaleString()}đ</p>
                                            <p className="text-[9px] text-slate-400 font-bold mt-2 italic">
                                                * Tính: {parseFloat((selectedPayroll.actualWorkHours ?? 0).toFixed(2))}h thực tế
                                                {(selectedPayroll.paidLeaveHours ?? 0) > 0 && (
                                                    <span className="text-teal-500">{` + ${parseFloat((selectedPayroll.paidLeaveHours ?? 0).toFixed(2))}h nghỉ phép`}</span>
                                                )}
                                                {` + Thưởng ${(selectedPayroll.bonus || 0).toLocaleString()}đ - Phạt ${(selectedPayroll.fine || 0).toLocaleString()}đ`}
                                            </p>
                                        </div>
                                    </div>



                                    <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm min-h-[300px]">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><History size={20} strokeWidth={3} /></div>
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">BIẾN ĐỘNG LƯƠNG THÁNG</h4>
                                        </div>
                                        <div className="space-y-4">
                                            {selectedPayroll.bonusDetails?.map((b, i) => <LogItem key={`b-${i}`} type="bonus" reason={b.reason} amount={b.amount} date={b.date} />)}
                                            {selectedPayroll.fineDetails?.map((f, i) => <LogItem key={`f-${i}`} type="fine" reason={f.reason} amount={f.amount} date={f.date} />)}
                                            {(!selectedPayroll.bonusDetails?.length && !selectedPayroll.fineDetails?.length) && <div className="text-center py-16 text-slate-300 font-black uppercase text-[10px] tracking-widest">Không có thưởng/phạt</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// HELPERS
const MetricCard = ({ label, value, sub, type, icon: Icon }: any) => {
    const config: any = {
        primary: { bg: "bg-indigo-50/50", iconBg: "bg-indigo-600", accent: "indigo" },
        success: { bg: "bg-emerald-50/50", iconBg: "bg-emerald-500", accent: "emerald" },
        danger: { bg: "bg-rose-50/50", iconBg: "bg-rose-500", accent: "rose" }
    };
    const s = config[type];
    return (
        <div className="group relative p-8 rounded-[40px] bg-white border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden">
            <div className={`absolute -top-10 -right-10 w-40 h-40 ${s.bg} rounded-full -z-0 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl`} />
            <div className="relative z-10">
                <div className={`p-4 rounded-3xl ${s.iconBg} text-white shadow-xl shadow-${s.accent}-100 w-fit mb-6 transition-transform group-hover:rotate-6`}><Icon size={24} strokeWidth={2.5} /></div>
                <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">{label}</h3>
                <span className="text-3xl font-black text-slate-900 tabular-nums">{value.toLocaleString()}đ</span>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">{sub}</p>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const config: any = {
        PENDING: { label: "Chờ duyệt", bg: "bg-amber-50", text: "text-amber-600" },
        CHECKED: { label: "Đã chốt", bg: "bg-emerald-50", text: "text-emerald-600" },
        PAID: { label: "Đã chi", bg: "bg-indigo-50", text: "text-indigo-600" }
    };
    const s = config[status] || config.PENDING;
    return <span className={`${s.bg} ${s.text} px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest border border-current/10 whitespace-nowrap`}>{s.label}</span>;
};

const MiniStatCard = ({ icon: Icon, label, value, color }: any) => {
    // Tailwind safelist workaround: handle teal separately
    const colorStyles: Record<string, { bg: string; text: string; icon: string; border: string }> = {
        indigo: { bg: 'bg-indigo-50/50', text: 'text-indigo-700', icon: 'text-indigo-600', border: 'border-indigo-100' },
        emerald: { bg: 'bg-emerald-50/50', text: 'text-emerald-700', icon: 'text-emerald-600', border: 'border-emerald-100' },
        teal: { bg: 'bg-teal-50/50', text: 'text-teal-700', icon: 'text-teal-600', border: 'border-teal-100' },
        slate: { bg: 'bg-slate-50/50', text: 'text-slate-700', icon: 'text-slate-600', border: 'border-slate-100' },
    };
    const s = colorStyles[color] || colorStyles.slate;
    return (
        <div className={`${s.bg} border ${s.border} rounded-[24px] p-5 flex items-center gap-4`}>
            <div className={`p-3 bg-white ${s.icon} rounded-xl shadow-sm`}><Icon size={18} strokeWidth={3} /></div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <p className={`text-lg font-black ${s.text} tabular-nums`}>{value}</p>
            </div>
        </div>
    );
};

const LogItem = ({ type, reason, amount, date }: any) => (
    <div className={`flex justify-between items-center p-5 rounded-3xl ${type === 'bonus' ? 'bg-emerald-50/30' : 'bg-rose-50/30'} border border-slate-50 hover:bg-white hover:shadow-lg transition-all`}>
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === 'bonus' ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>{type === 'bonus' ? <ArrowUpRight size={18} strokeWidth={3} /> : <ArrowDownRight size={18} strokeWidth={3} />}</div>
            <div>
                <p className="font-black text-slate-800 text-sm">{reason}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{new Date(date).toLocaleDateString('vi-VN')}</p>
            </div>
        </div>
        <p className={`font-black text-sm tabular-nums ${type === 'bonus' ? 'text-emerald-600' : 'text-rose-600'}`}>{type === 'bonus' ? '+' : '-'}{amount.toLocaleString()}đ</p>
    </div>
);

const LegendDot = ({ label, color }: any) => (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
        <div className={`w-3 h-3 rounded-full ${color}`}></div>
        <span className="text-[10px] font-black uppercase text-slate-500">{label}</span>
    </div>
);
import React, { useEffect, useState } from 'react';
import { 
    DollarSign, PlusCircle, ChevronLeft, ChevronRight, X, 
    Loader2, Clock, CalendarX2, Briefcase, CheckCircle2, 
    AlertCircle, TrendingUp, Filter, Search, MoreHorizontal,
    ArrowUpRight, ArrowDownRight, Wallet, History, CheckCircle, Clock9,
    AlertTriangle
} from 'lucide-react';
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
    standardWorkDays?: number;
    status: 'PENDING' | 'CHECKED' | 'PAID';
}

export const Payroll = () => {
    const [employees, setEmployees] = useState<IPayroll[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

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

    const fetchData = async () => {
        const apiMonth = getApiMonth();
        setLoading(true);
        try {
            const [usersRes, payrollRes] = await Promise.all([
                axios.get(`${API_BASE}/users`, axiosConfig),
                axios.get(`${API_BASE}/payroll/report?month=${apiMonth}`, axiosConfig)
            ]);

            const allUsers = usersRes.data;
            const payrolls = payrollRes.data;

            const mergedData = allUsers.map((user: any) => {
                const userPayroll = payrolls.find((p: any) => (p.userId?._id || p.userId) === user._id);
                const base = user.baseSalary || 0;
                
                if (userPayroll) {
                    // Đảm bảo tính toán lại netSalaryFull nếu DB cũ chưa có
                    const bonus = userPayroll.bonus || 0;
                    const fine = userPayroll.fine || 0;
                    return {
                        ...userPayroll,
                        netSalaryFull: userPayroll.netSalaryFull || (base + bonus - fine)
                    };
                }

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
                    bonusDetails: [],
                    fineDetails: []
                };
            });
            setEmployees(mergedData);
        } catch (error) {
            console.error("Lỗi fetch:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [currentDate]);

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
            setSelectedPayroll(res.data);
            setAdjData({ bonusAmount: 0, bonusReason: '', fineAmount: 0, fineReason: '' });
            fetchData();
        } catch (error) {
            alert("Lỗi hệ thống!");
        } finally {
            setLoading(false);
        }
    };

    const totalCompanySalary = employees.reduce((sum, e) => sum + e.netSalary, 0);
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
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{getDisplayMonth()} • Dữ liệu tài chính</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full lg:w-auto bg-slate-50 p-2 rounded-3xl border border-slate-100 shadow-inner">
                        <button onClick={handlePrevMonth} className="p-3 bg-white shadow-sm rounded-2xl text-slate-600 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95"><ChevronLeft size={20} strokeWidth={3} /></button>
                        <div className="px-8 text-center min-w-[160px]">
                            <p className="text-base font-black text-slate-900">{getDisplayMonth()}</p>
                        </div>
                        <button onClick={handleNextMonth} className="p-3 bg-white shadow-sm rounded-2xl text-slate-600 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95"><ChevronRight size={20} strokeWidth={3} /></button>
                    </div>
                </div>

                {/* METRICS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
                    <MetricCard label="Tổng Quỹ Lương" value={totalCompanySalary} sub="Thực nhận tháng này" type="primary" icon={DollarSign} />
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
                        <div className="flex gap-4">
                            <LegendDot label="Thực nhận (Hợp đồng)" color="bg-emerald-500" />
                            <LegendDot label="Thực nhận (Giờ làm)" color="bg-indigo-500" />
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    <th className="px-10 py-6 text-left border-b border-slate-100">Nhân viên</th>
                                    <th className="px-6 py-6 text-center border-b border-slate-100">Lương cơ bản</th>
                                    <th className="px-6 py-6 text-center border-b border-slate-100">Thưởng/Phạt</th>
                                    <th className="px-6 py-6 text-center border-b border-slate-100 text-emerald-600">Thực nhận (Hợp đồng)</th>
                                    <th className="px-6 py-6 text-center border-b border-slate-100 text-indigo-600">Thực nhận (Giờ làm)</th>
                                    <th className="px-6 py-6 text-center border-b border-slate-100">Trạng thái</th>
                                    <th className="px-10 py-6 text-right border-b border-slate-100">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan={7} className="py-20 text-center font-black text-slate-300 uppercase tracking-widest">Đang cập nhật...</td></tr>
                                ) : filteredEmployees.map((p) => {
                                    const hasGap = p.netSalaryFull > p.netSalary;
                                    return (
                                        <tr key={p._id} className="hover:bg-indigo-50/30 transition-all group">
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
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-sm font-black text-slate-600 tabular-nums">{p.baseSalary.toLocaleString()}đ</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-emerald-500 font-black text-xs">+{p.bonus.toLocaleString()}đ</span>
                                                    <span className="text-rose-500 font-black text-xs">-{p.fine.toLocaleString()}đ</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-sm font-black text-emerald-600 tabular-nums">{p.netSalaryFull.toLocaleString()}đ</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`px-5 py-2 rounded-2xl font-black text-sm tabular-nums border transition-all ${hasGap ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                                        {p.netSalary.toLocaleString()}đ
                                                    </span>
                                                    {hasGap && <span className="text-[9px] font-black text-rose-500 flex items-center gap-1 uppercase"><AlertTriangle size={10} /> Thiếu công</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <StatusBadge status={p.status} />
                                            </td>
                                            <td className="px-10 py-5 text-right">
                                                <button onClick={() => { setSelectedPayroll(p); setShowDetailModal(true); }} className="p-3 bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm">
                                                    <MoreHorizontal size={20} strokeWidth={3} />
                                                </button>
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
                                <button onClick={() => setShowDetailModal(false)} className="p-4 bg-slate-50 hover:bg-rose-50 rounded-full transition-all text-slate-400 hover:text-rose-500"><X size={24} strokeWidth={3} /></button>
                            </div>
                        </div>

                        <div className="p-10 overflow-y-auto bg-slate-50/30 flex-1 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                <div className="lg:col-span-4 space-y-6">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Thống kê công</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <MiniStatCard icon={Clock9} label="Tổng giờ làm" value={`${selectedPayroll.actualWorkHours || 0}h`} color="indigo" />
                                        <MiniStatCard icon={Briefcase} label="Ngày công" value={`${selectedPayroll.actualWorkDays || 0}/${selectedPayroll.standardWorkDays || 26}`} color="emerald" />
                                        <MiniStatCard icon={Wallet} label="Lương gốc" value={`${selectedPayroll.baseSalary.toLocaleString()}đ`} color="slate" />
                                    </div>

                                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Cập nhật Thưởng / Phạt</h4>
                                        <div className="space-y-4">
                                            <input type="number" value={adjData.bonusAmount || adjData.fineAmount || ''} onChange={(e) => {
                                                const v = Number(e.target.value);
                                                if (adjData.fineAmount > 0) setAdjData({...adjData, fineAmount: v});
                                                else setAdjData({...adjData, bonusAmount: v});
                                            }} placeholder="Nhập số tiền..." className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-4 focus:ring-indigo-100 transition-all" />
                                            <div className="flex gap-2">
                                                <button onClick={() => setAdjData({...adjData, bonusAmount: Math.max(adjData.bonusAmount, adjData.fineAmount), fineAmount: 0, bonusReason: 'Thưởng KPI'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${adjData.bonusAmount > 0 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-400'}`}>Thưởng (+)</button>
                                                <button onClick={() => setAdjData({...adjData, fineAmount: Math.max(adjData.bonusAmount, adjData.fineAmount), bonusAmount: 0, fineReason: 'Phạt vi phạm'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${adjData.fineAmount > 0 ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-slate-100 text-slate-400'}`}>Phạt (-)</button>
                                            </div>
                                            <input type="text" value={adjData.bonusAmount > 0 ? adjData.bonusReason : adjData.fineReason} onChange={(e) => adjData.bonusAmount > 0 ? setAdjData({...adjData, bonusReason: e.target.value}) : setAdjData({...adjData, fineReason: e.target.value})} placeholder="Lý do..." className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-4 focus:ring-indigo-100 transition-all" />
                                            <button onClick={saveAdjustment} disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-50">{loading ? "Đang xử lý..." : "Cập nhật ngay"}</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm border-l-4 border-l-emerald-500">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Thực nhận (Theo Hợp đồng)</p>
                                            <p className="text-3xl font-black text-emerald-600 tabular-nums">{(selectedPayroll.netSalaryFull || 0).toLocaleString()}đ</p>
                                            <p className="text-[9px] text-slate-400 font-bold mt-2 italic">* Lương gốc + Thưởng - Phạt</p>
                                        </div>
                                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm border-l-4 border-l-indigo-500">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Thực nhận (Theo Giờ làm)</p>
                                            <p className="text-3xl font-black text-indigo-600 tabular-nums">{(selectedPayroll.netSalary || 0).toLocaleString()}đ</p>
                                            <p className="text-[9px] text-slate-400 font-bold mt-2 italic">* Tính dựa trên công thực tế</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm min-h-[400px]">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><History size={20} strokeWidth={3} /></div>
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Biến động lương tháng</h4>
                                        </div>
                                        <div className="space-y-4">
                                            {selectedPayroll.bonusDetails?.map((b, i) => <LogItem key={`b-${i}`} type="bonus" reason={b.reason} amount={b.amount} date={b.date} />)}
                                            {selectedPayroll.fineDetails?.map((f, i) => <LogItem key={`f-${i}`} type="fine" reason={f.reason} amount={f.amount} date={f.date} />)}
                                            {(!selectedPayroll.bonusDetails?.length && !selectedPayroll.fineDetails?.length) && <div className="text-center py-20 text-slate-300 font-black uppercase text-[10px] tracking-widest">Không có dữ liệu</div>}
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

const MiniStatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className={`bg-${color}-50/50 border border-${color}-100 rounded-[24px] p-5 flex items-center gap-4`}>
        <div className={`p-3 bg-white text-${color}-600 rounded-xl shadow-sm`}><Icon size={18} strokeWidth={3} /></div>
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className={`text-lg font-black text-${color}-700 tabular-nums`}>{value}</p>
        </div>
    </div>
);

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
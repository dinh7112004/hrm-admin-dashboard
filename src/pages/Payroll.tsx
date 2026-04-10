import React, { useEffect, useState } from 'react';
import { DollarSign, PlusCircle, ChevronLeft, ChevronRight, X, Loader2, Clock, CalendarX2, Briefcase } from 'lucide-react';
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
    fine: number;
    netSalary: number;
    actualWorkDays?: number;  // <-- MỚI THÊM
    actualWorkHours?: number;
}

export const Payroll = () => {
    const [employees, setEmployees] = useState<IPayroll[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedRecord, setSelectedRecord] = useState<IPayroll | null>(null);
    const [adjData, setAdjData] = useState({
        bonusAmount: 0,
        bonusReason: '',
        fineAmount: 0,
        fineReason: ''
    });

    // State lưu dữ liệu chuyên cần
    const [attendanceStats, setAttendanceStats] = useState({ workDays: 0, lateDays: 0, absentDays: 0 });
    const [loadingStats, setLoadingStats] = useState(false);

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

    // 1. FETCH DỮ LIỆU BẢNG LƯƠNG
    const fetchData = async () => {
        const apiMonth = getApiMonth();
        setLoading(true);
        try {
            const [usersRes, payrollRes] = await Promise.all([
                axios.get(`${API_BASE}/users`, axiosConfig),
                axios.get(`${API_BASE}/payroll/report?month=${apiMonth}`, axiosConfig)
            ]);

            const users = usersRes.data;
            const payrolls = payrollRes.data;

            const mergedData = users.map((user: any) => {
                const userPayroll = payrolls.find((p: any) => p.userId?._id === user._id || p.userId === user._id);
                const base = user.baseSalary || 0;
                const bonus = userPayroll?.bonus || 0;
                const fine = userPayroll?.fine || 0;
                const netSalary = base + bonus - fine;

                return {
                    _id: userPayroll?._id || `temp-${user._id}`,
                    userId: user,
                    baseSalary: base,
                    bonus: bonus,
                    fine: fine,
                    netSalary: netSalary,
                    actualWorkDays: userPayroll?.actualWorkDays || 0,   // <-- MỚI THÊM
                    actualWorkHours: userPayroll?.actualWorkHours || 0
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

    // 2. MỞ MODAL & LẤY THÔNG TIN TỪ API THẬT (Chuyên cần + Nghỉ phép)
    const openAdjustmentModal = async (p: IPayroll) => {
        const user = p.userId;
        if (!user) return;
        setSelectedUser(user);
        setSelectedRecord(p); // <-- MỚI THÊM: Lưu lại record để lấy số giờ
        setShowModal(true);
        setLoadingStats(true);
        // Reset form nhập
        setAdjData({ bonusAmount: 0, bonusReason: '', fineAmount: 0, fineReason: '' });

        // Tách tháng và năm từ format "MM-YYYY"
        const apiMonth = getApiMonth();
        const [mStr, yStr] = apiMonth.split('-');
        const monthNum = parseInt(mStr);
        const yearNum = parseInt(yStr);

        try {
            // Gọi SONG SONG 2 API: Báo cáo chuyên cần tháng & Lịch sử nghỉ phép của nhân viên
            const [attRes, leavesRes] = await Promise.all([
                axios.get(`${API_BASE}/attendance/report/monthly?month=${monthNum}&year=${yearNum}`, axiosConfig),
                axios.get(`${API_BASE}/leaves/user/${user._id}`, axiosConfig)
            ]);

            // --- 1. TÍNH NGÀY CÔNG VÀ ĐI MUỘN ---
            const allStats = attRes.data;
            const userStat = allStats.find((u: any) => u.userId === user._id);

            let totalWorkDays = 0;
            let totalLate = 0;

            if (userStat) {
                totalWorkDays = Object.keys(userStat.days || {}).length;
                totalLate = userStat.totalLate || 0;
            }

            // --- 2. TÍNH SỐ NGÀY NGHỈ PHÉP TRONG THÁNG ---
            const userLeaves = leavesRes.data;
            const absentCount = userLeaves.filter((leave: any) => {
                if (leave.status !== 'APPROVED') return false; // Chỉ đếm đơn ĐÃ DUYỆT

                const leaveDate = new Date(leave.startDate);
                return (leaveDate.getMonth() + 1) === monthNum && leaveDate.getFullYear() === yearNum;
            }).length;

            // --- 3. CẬP NHẬT LÊN GIAO DIỆN ---
            setAttendanceStats({
                workDays: totalWorkDays,
                lateDays: totalLate,
                absentDays: absentCount
            });

        } catch (error) {
            console.error("Lỗi lấy dữ liệu thống kê từ API:", error);
            // Nếu có lỗi, để mặc định 0 cho an toàn
            setAttendanceStats({ workDays: 0, lateDays: 0, absentDays: 0 });
        } finally {
            setLoadingStats(false);
        }
    };

    // 3. LƯU ĐIỀU CHỈNH
    const saveAdjustment = async () => {
        if (!selectedUser) return;
        if (adjData.bonusAmount <= 0 && adjData.fineAmount <= 0) {
            return alert("Sếp phải nhập ít nhất một khoản tiền Thưởng hoặc Phạt chứ!");
        }

        setLoading(true);
        const apiMonth = getApiMonth();
        try {
            const requests = [];

            if (adjData.bonusAmount > 0) {
                requests.push(axios.post(`${API_BASE}/payroll/adjustment`, {
                    userId: selectedUser._id,
                    type: 'BONUS',
                    amount: adjData.bonusAmount,
                    reason: adjData.bonusReason || 'Thưởng',
                    date: new Date().toISOString()
                }, axiosConfig));
            }

            if (adjData.fineAmount > 0) {
                requests.push(axios.post(`${API_BASE}/payroll/adjustment`, {
                    userId: selectedUser._id,
                    type: 'FINE',
                    amount: adjData.fineAmount,
                    reason: adjData.fineReason || 'Phạt',
                    date: new Date().toISOString()
                }, axiosConfig));
            }

            await Promise.all(requests);
            await axios.post(`${API_BASE}/payroll/calculate`, { userId: selectedUser._id, month: apiMonth }, axiosConfig);

            setShowModal(false);
            fetchData();
        } catch (error) {
            alert("Lỗi hệ thống khi lưu điều chỉnh!");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-3 md:p-6 bg-gray-50 min-h-screen relative max-w-[1600px] mx-auto">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-4 md:mb-6 bg-white p-4 md:p-6 rounded-[20px] md:rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                    <div className="bg-teal-50 p-2.5 md:p-3 rounded-xl shrink-0">
                        <DollarSign className="text-teal-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Bảng Lương Nhân Sự</h1>
                        <p className="text-xs md:text-sm text-gray-500 font-medium">Quản lý và điều chỉnh lương từng cá nhân</p>
                    </div>
                </div>

                <div className="flex items-center justify-between md:justify-center gap-2 bg-gray-50 p-2 rounded-xl md:rounded-2xl border border-gray-200 shadow-inner w-full md:w-auto">
                    <button onClick={handlePrevMonth} disabled={loading} className="p-2 md:p-2.5 bg-white rounded-lg md:rounded-xl shadow-sm hover:bg-teal-50 hover:text-teal-600 text-gray-500 transition disabled:opacity-50">
                        <ChevronLeft size={18} className="md:w-5 md:h-5" />
                    </button>
                    <span className="font-black text-base md:text-lg text-teal-700 w-32 md:w-36 text-center select-none">{getDisplayMonth()}</span>
                    <button onClick={handleNextMonth} disabled={loading} className="p-2 md:p-2.5 bg-white rounded-lg md:rounded-xl shadow-sm hover:bg-teal-50 hover:text-teal-600 text-gray-500 transition disabled:opacity-50">
                        <ChevronRight size={18} className="md:w-5 md:h-5" />
                    </button>
                </div>
            </div>

            {/* --- BẢNG DỮ LIỆU --- */}
            <div className="bg-white rounded-[20px] md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading && <div className="h-1 w-full bg-teal-500 animate-pulse"></div>}

                {/* Bọc bảng trong thẻ overflow-x-auto để mobile vuốt ngang */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] md:text-xs uppercase font-black tracking-wider">
                            <tr>
                                <th className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-100">Nhân viên</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-100 text-center">Lương Cơ Bản</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-100 text-center">Thưởng/Phạt</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-100">Thực nhận ({getApiMonth()})</th>
                                <th className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-100 text-right">Điều chỉnh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {employees.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-12 md:py-16 text-gray-400 font-bold text-sm md:text-base">Không có nhân sự nào để hiển thị!</td></tr>
                            ) : (
                                employees.map((p) => (
                                    <tr key={p._id} className="hover:bg-teal-50/30 transition-colors group">
                                        <td className="px-4 md:px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-xl bg-teal-100 text-teal-700 font-black flex items-center justify-center text-sm md:text-base">
                                                    {(p.userId?.name || "U").charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-gray-800 text-sm md:text-base truncate">{p.userId?.name || 'Chưa xác định'}</div>
                                                    <div className="text-[10px] md:text-xs text-gray-500">{p.userId?.phone || 'Không có SĐT'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 text-center font-bold text-gray-600 text-sm md:text-base whitespace-nowrap">{p.baseSalary.toLocaleString()}đ</td>
                                        <td className="px-4 md:px-6 py-4 text-center whitespace-nowrap">
                                            <div className="text-emerald-500 font-bold text-xs md:text-sm">+{(p.bonus || 0).toLocaleString()}đ</div>
                                            <div className="text-rose-500 font-bold text-xs md:text-sm">-{(p.fine || 0).toLocaleString()}đ</div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 font-black text-teal-700 text-base md:text-lg whitespace-nowrap">{p.netSalary.toLocaleString()}đ</td>
                                        <td className="px-4 md:px-6 py-4 text-right">
                                            <button
                                                onClick={() => openAdjustmentModal(p)}
                                                className="bg-slate-50 text-slate-500 p-2 md:p-2.5 rounded-xl hover:bg-teal-600 hover:text-white transition-all shadow-sm">
                                                <PlusCircle size={18} className="md:w-5 md:h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODAL THƯỞNG PHẠT CHUẨN XỊN --- */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[24px] md:rounded-[32px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[95vh]">

                        {/* HEADER */}
                        <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h3 className="font-black text-lg md:text-xl text-gray-800">Điều chỉnh lương</h3>
                                <p className="text-[10px] md:text-xs text-gray-500 font-bold mt-1">
                                    Nhân viên: <span className="text-teal-600">{selectedUser?.name}</span> • Tháng {getApiMonth()}
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="bg-white text-gray-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-full shadow-sm shrink-0">
                                <X size={18} className="md:w-5 md:h-5" />
                            </button>
                        </div>

                        {/* BODY MODAL */}
                        <div className="p-4 md:p-6 overflow-y-auto space-y-5 md:space-y-6 flex-1 custom-scrollbar">

                            {/* KHU VỰC THỐNG KÊ CHUYÊN CẦN */}
                            <div>
                                <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider mb-2 md:mb-3">Tình hình chuyên cần tháng này</label>
                                {loadingStats ? (
                                    <div className="flex justify-center p-4"><Loader2 className="animate-spin text-teal-500" /></div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl md:rounded-2xl p-3 md:p-4 text-center">
                                            <Briefcase size={18} className="text-blue-500 mx-auto mb-1.5 md:mb-2 md:w-5 md:h-5" />
                                            <div className="text-[9px] md:text-[10px] font-black text-blue-800/60 uppercase">Công tính lương</div>
                                            <div className="text-lg md:text-xl font-black text-blue-700">{selectedRecord?.actualWorkDays || 0}</div>
                                        </div>
                                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl md:rounded-2xl p-3 md:p-4 text-center">
                                            <Clock size={18} className="text-indigo-500 mx-auto mb-1.5 md:mb-2 md:w-5 md:h-5" />
                                            <div className="text-[9px] md:text-[10px] font-black text-indigo-800/60 uppercase">Tổng giờ làm</div>
                                            <div className="text-lg md:text-xl font-black text-indigo-700">{selectedRecord?.actualWorkHours || 0} <span className="text-xs md:text-sm">h</span></div>
                                        </div>
                                        <div className="bg-orange-50/50 border border-orange-100 rounded-xl md:rounded-2xl p-3 md:p-4 text-center">
                                            <Clock size={18} className="text-orange-500 mx-auto mb-1.5 md:mb-2 md:w-5 md:h-5" />
                                            <div className="text-[9px] md:text-[10px] font-black text-orange-800/60 uppercase">Đi muộn</div>
                                            <div className="text-lg md:text-xl font-black text-orange-700">{attendanceStats.lateDays} <span className="text-xs md:text-sm">lần</span></div>
                                        </div>
                                        <div className="bg-rose-50/50 border border-rose-100 rounded-xl md:rounded-2xl p-3 md:p-4 text-center">
                                            <CalendarX2 size={18} className="text-rose-500 mx-auto mb-1.5 md:mb-2 md:w-5 md:h-5" />
                                            <div className="text-[9px] md:text-[10px] font-black text-rose-800/60 uppercase">Nghỉ phép</div>
                                            <div className="text-lg md:text-xl font-black text-rose-700">{attendanceStats.absentDays} <span className="text-xs md:text-sm">ngày</span></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <hr className="border-slate-100" />

                            {/* KHU VỰC NHẬP THƯỞNG */}
                            <div className="bg-emerald-50/50 p-4 md:p-5 rounded-[20px] md:rounded-2xl border border-emerald-100">
                                <h4 className="font-black text-emerald-600 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                                    <PlusCircle size={16} className="md:w-[18px] md:h-[18px]" /> Khoản Thưởng (+)
                                </h4>
                                <div className="space-y-3 md:space-y-4">
                                    <input
                                        type="number"
                                        className="w-full bg-white border border-emerald-200 rounded-xl p-3 focus:border-emerald-500 outline-none font-bold text-slate-800 text-sm md:text-base"
                                        placeholder="Nhập số tiền thưởng (VNĐ)"
                                        value={adjData.bonusAmount || ''}
                                        onChange={(e) => setAdjData({ ...adjData, bonusAmount: Number(e.target.value) })}
                                    />
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-emerald-200 rounded-xl p-3 focus:border-emerald-500 outline-none text-slate-700 text-sm md:text-base"
                                        placeholder="Lý do: Đạt KPI, Tăng ca..."
                                        value={adjData.bonusReason}
                                        onChange={(e) => setAdjData({ ...adjData, bonusReason: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* KHU VỰC NHẬP PHẠT */}
                            <div className="bg-rose-50/50 p-4 md:p-5 rounded-[20px] md:rounded-2xl border border-rose-100">
                                <h4 className="font-black text-rose-600 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                                    <X size={16} className="md:w-[18px] md:h-[18px]" /> Khoản Phạt (-)
                                </h4>
                                <div className="space-y-3 md:space-y-4">
                                    <input
                                        type="number"
                                        className="w-full bg-white border border-rose-200 rounded-xl p-3 focus:border-rose-500 outline-none font-bold text-slate-800 text-sm md:text-base"
                                        placeholder="Nhập số tiền phạt (VNĐ)"
                                        value={adjData.fineAmount || ''}
                                        onChange={(e) => setAdjData({ ...adjData, fineAmount: Number(e.target.value) })}
                                    />
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-rose-200 rounded-xl p-3 focus:border-rose-500 outline-none text-slate-700 text-sm md:text-base"
                                        placeholder="Lý do: Đi muộn, Sai quy trình..."
                                        value={adjData.fineReason}
                                        onChange={(e) => setAdjData({ ...adjData, fineReason: e.target.value })}
                                    />
                                </div>
                            </div>

                        </div>

                        {/* FOOTER */}
                        <div className="p-4 md:p-6 border-t border-gray-100 bg-white shrink-0">
                            <button
                                onClick={saveAdjustment}
                                disabled={loading}
                                className="w-full bg-slate-900 text-white py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black text-sm md:text-lg hover:bg-teal-600 hover:-translate-y-1 transition-all duration-300 shadow-xl disabled:opacity-50 flex justify-center items-center gap-2">
                                {loading ? <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5" /> : null}
                                {loading ? 'ĐANG LƯU DỮ LIỆU...' : 'LƯU LẠI'}
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
};
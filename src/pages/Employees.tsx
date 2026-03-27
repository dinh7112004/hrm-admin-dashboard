import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    UserPlus, Loader2, Pencil, Trash2, Phone, RotateCcw,
    Search, ShieldCheck, Smartphone, Building2, Briefcase, X, Users, DollarSign
} from 'lucide-react';
import { API_BASE } from '../../apiConfig';

const axiosConfig = {
    headers: { 'ngrok-skip-browser-warning': 'true' }
};

export const Employees = () => {
    const [employees, setEmployees] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedId, setSelectedId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // THÊM: baseSalary vào formData
    const [formData, setFormData] = useState({
        userId: '', name: '', phone: '', password: '', dept: '', position: '', baseSalary: 0
    });

    const fetchEmployees = async () => {
        try {
            const res = await axios.get(`${API_BASE}/users`, axiosConfig);
            setEmployees(res.data);
        } catch (err) { console.error("Lỗi lấy DS:", err); }
    };

    useEffect(() => { fetchEmployees(); }, []);

    const openAddModal = () => {
        setIsEdit(false);
        setFormData({ userId: '', name: '', phone: '', password: '', dept: '', position: '', baseSalary: 0 });
        setShowModal(true);
    };

    const openEditModal = (emp: any) => {
        setIsEdit(true);
        setSelectedId(emp._id);
        setFormData({
            userId: emp.userId,
            name: emp.name,
            phone: emp.phone,
            password: emp.password,
            dept: emp.dept || '',
            position: emp.position || '',
            baseSalary: emp.baseSalary || 0 // THÊM: Load lương cũ lên form
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Xoá nhân viên ${name}?`)) return;
        try {
            await axios.delete(`${API_BASE}/users/${id}`, axiosConfig);
            fetchEmployees();
        } catch (err) { alert("Xoá thất bại!"); }
    };

    const handleResetDevice = async (id: string, name: string) => {
        if (!window.confirm(`Gỡ liên kết máy cho ${name}?`)) return;
        try {
            await axios.put(`${API_BASE}/users/${id}/reset-device`, {}, axiosConfig);
            alert("Đã reset thiết bị thành công!");
            fetchEmployees();
        } catch (err: any) { alert("Lỗi reset!"); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit) {
                await axios.put(`${API_BASE}/users/${selectedId}`, formData, axiosConfig);
            } else {
                await axios.post(`${API_BASE}/users/create`, formData, axiosConfig);
            }
            setShowModal(false);
            fetchEmployees();
        } catch (err: any) {
            alert("Lỗi: " + (err.response?.data?.message || "Thao tác thất bại"));
        } finally { setLoading(false); }
    };

    const filteredEmployees = employees.filter((emp: any) =>
        (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.phone || "").includes(searchTerm)
    );

    return (
        <div className="p-2 md:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto">

            {/* TOP HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <Users size={180} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                            <ShieldCheck size={24} />
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Nhân sự</h3>
                    </div>
                    <p className="text-slate-400 font-bold ml-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Hệ thống đang quản lý {employees.length} tài khoản
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 relative z-10">
                    <div className="relative group/search">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm nhanh nhân viên..."
                            className="pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-bold w-full md:w-[320px] outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-inner"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={openAddModal}
                        className="bg-slate-900 text-white px-8 py-4 rounded-[20px] font-black flex items-center gap-3 shadow-xl shadow-slate-200 hover:bg-blue-600 hover:shadow-blue-500/30 active:scale-95 transition-all duration-300"
                    >
                        <UserPlus size={20} /> THÊM MỚI
                    </button>
                </div>
            </div>

            {/* MAIN TABLE SECTION */}
            <div className="bg-white border border-slate-100 rounded-[35px] shadow-[0_10px_40px_rgb(0,0,0,0.03)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[11px] uppercase text-slate-400 font-black tracking-widest border-b border-slate-50">
                                <th className="px-8 py-7">Nhân viên & Thông tin</th>
                                <th className="px-8 py-7 text-center">Bộ phận / Chức vụ</th>
                                {/* THÊM: Cột Lương Cơ Bản */}
                                <th className="px-8 py-7 text-right">Lương cơ bản</th>
                                <th className="px-8 py-7 text-center">Trạng thái thiết bị</th>
                                <th className="px-8 py-7 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredEmployees.map((emp: any) => (
                                <tr key={emp._id} className="group hover:bg-blue-50/20 transition-all duration-300">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 rounded-[20px] bg-gradient-to-br from-white to-slate-100 border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 font-black text-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                                {(emp.name || "U").charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 text-base uppercase tracking-tight group-hover:text-blue-600 transition-colors">{emp.name}</p>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 bg-slate-100/50 px-2 py-0.5 rounded-lg">
                                                        <Phone size={12} className="text-blue-500" /> {emp.phone}
                                                    </span>
                                                    <span className="text-[10px] px-2 py-0.5 bg-blue-50 rounded-lg font-black text-blue-600 uppercase">ID: {emp.userId}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                                            <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
                                                <Building2 size={14} className="text-blue-500" />
                                                <span className="text-xs font-black uppercase tracking-tight">{emp.dept || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Briefcase size={12} />
                                                <span className="text-[10px] font-bold uppercase">{emp.position || 'Nhân viên'}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* THÊM: Hiển thị tiền lương */}
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-1.5 font-black text-emerald-600 text-base">
                                            {(emp.baseSalary || 0).toLocaleString()} <span className="text-xs text-emerald-400">VNĐ</span>
                                        </div>
                                    </td>

                                    <td className="px-8 py-6 text-center">
                                        <div className="flex flex-col items-center">
                                            {emp.deviceId ? (
                                                <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl flex flex-col items-center gap-1 w-fit group-hover:shadow-md transition-shadow mx-auto">
                                                    <div className="flex items-center gap-2">
                                                        <Smartphone size={14} className="text-emerald-500 animate-bounce" />
                                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Đã liên kết</span>
                                                    </div>
                                                    <p className="text-[9px] text-emerald-400 font-mono font-bold truncate w-24 text-center">{emp.deviceId}</p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2 text-slate-300 px-4 py-2 border border-dashed border-slate-200 rounded-2xl mx-auto">
                                                    <Smartphone size={14} className="opacity-50" />
                                                    <span className="text-[10px] font-black uppercase">Chưa có máy</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex justify-end items-center gap-2 opacity-100 md:opacity-20 md:group-hover:opacity-100 transition-all duration-300 md:translate-x-4 md:group-hover:translate-x-0">
                                            {emp.deviceId && (
                                                <button
                                                    onClick={() => handleResetDevice(emp._id, emp.name)}
                                                    className="p-3 text-amber-500 hover:bg-amber-50 hover:text-amber-600 rounded-2xl transition-all hover:rotate-180 duration-500 shadow-sm hover:shadow-md"
                                                    title="Gỡ liên kết máy"
                                                >
                                                    <RotateCcw size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openEditModal(emp)}
                                                className="p-3 text-blue-500 hover:bg-blue-50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                                title="Chỉnh sửa"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(emp._id, emp.name)}
                                                className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                                title="Xóa tài khoản"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL FORM */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[8px] z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[45px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500 border border-white/20">
                        <div className="relative p-10 pb-6 flex justify-between items-center">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500"></div>
                            <div>
                                <h4 className="font-black text-2xl text-slate-800 tracking-tight uppercase">
                                    {isEdit ? "Cập nhật nhân sự" : "Tạo tài khoản mới"}
                                </h4>
                                <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">Quản lý hồ sơ & Lương</p>
                            </div>
                            <button type="button" onClick={() => setShowModal(false)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all active:scale-90">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 pt-4 space-y-6">

                            {/* Khối Thông tin đăng nhập */}
                            <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-[24px] space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Thông tin đăng nhập</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Mã định danh (ID)</label>
                                        <input type="text" placeholder="ID..." required className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl font-black text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm" value={formData.userId} onChange={(e) => setFormData({ ...formData, userId: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest text-blue-500">Mật khẩu</label>
                                        <input type="password" placeholder="••••••••" required className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl font-black text-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Khối Hồ sơ nhân sự */}
                            <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-[24px] space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Hồ sơ nhân sự</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Họ và tên</label>
                                        <input type="text" placeholder="Nhập họ tên..." required className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl font-black text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Số điện thoại</label>
                                        <input type="text" placeholder="SĐT..." required className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl font-black text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Phòng ban</label>
                                        <input type="text" placeholder="Bộ phận..." className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl font-bold text-slate-600 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm" value={formData.dept} onChange={(e) => setFormData({ ...formData, dept: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Chức vụ</label>
                                        <input type="text" placeholder="Vị trí..." className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl font-bold text-slate-600 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* THÊM: Khối Lương */}
                            <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-[24px]">
                                <div className="flex items-center gap-2 border-b border-emerald-200/50 pb-2 mb-4">
                                    <DollarSign size={14} className="text-emerald-500" />
                                    <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Chế độ đãi ngộ</h5>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-emerald-600 uppercase ml-2 tracking-widest">Mức lương cơ bản (VNĐ)</label>
                                    <input
                                        type="number"
                                        placeholder="Ví dụ: 10000000"
                                        className="w-full bg-white border-2 border-emerald-100 p-4 rounded-2xl font-black text-emerald-700 text-lg focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
                                        value={formData.baseSalary || ''}
                                        onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex gap-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all uppercase tracking-widest text-xs">
                                    Hủy
                                </button>
                                <button type="submit" disabled={loading} className="flex-[2.5] bg-slate-900 text-white py-4 rounded-2xl font-black shadow-2xl shadow-slate-300 hover:bg-blue-600 hover:-translate-y-1.5 active:scale-95 flex justify-center items-center gap-3 transition-all duration-300">
                                    {loading ? <Loader2 className="animate-spin" /> : (isEdit ? 'LƯU THÔNG TIN' : 'XÁC NHẬN TẠO')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
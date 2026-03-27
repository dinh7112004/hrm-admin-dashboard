import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Clock, CheckCircle2, AlertCircle, X,
    Calendar, Layout, ListTodo, MoreVertical, Flag,
    Loader2, Search, BarChart3, TrendingUp, AlertTriangle,
    CalendarDays, ArrowRight, Image as ImageIcon
} from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../apiConfig';

const axiosConfig = { headers: { 'ngrok-skip-browser-warning': 'true' } };

// Hàm tiện ích lấy chuỗi YYYY-MM-DD theo giờ địa phương
const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const Tasks = () => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingTask, setViewingTask] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // STATE LỌC NGÀY MỚI (Mặc định là TODAY)
    const [activeDateTab, setActiveDateTab] = useState('TODAY');

    // State cho tab "Tùy chỉnh"
    const [filterStartDate, setFilterStartDate] = useState(getLocalDateString(new Date()));
    const [filterEndDate, setFilterEndDate] = useState(getLocalDateString(new Date()));

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('MEDIUM');

    useEffect(() => {
        fetchTasks();
        fetchUsers();
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await axios.get(`${API_BASE}/tasks`, axiosConfig);
            setTasks(res.data);
        } catch (error) { console.error("Lỗi tải task:", error); }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${API_BASE}/users`, axiosConfig);
            setUsers(res.data);
        } catch (error) { console.error("Lỗi tải user:", error); }
    };

    const filteredTasks = useMemo(() => {
        const today = new Date();
        const todayStr = getLocalDateString(today);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = getLocalDateString(tomorrow);

        return tasks.filter(t => {
            const taskDate = t.dueDate?.split('T')[0];
            const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());

            let matchDate = true;
            if (activeDateTab === 'TODAY') {
                // Hiện task hôm nay HOẶC task quá hạn nhưng chưa hoàn thành
                matchDate = taskDate === todayStr || (taskDate < todayStr && t.status !== 'COMPLETED');
            } else if (activeDateTab === 'YESTERDAY') {
                matchDate = taskDate === yesterdayStr;
            } else if (activeDateTab === 'TOMORROW') {
                matchDate = taskDate === tomorrowStr;
            } else if (activeDateTab === 'ALL') {
                matchDate = true;
            } else if (activeDateTab === 'CUSTOM') {
                matchDate = taskDate >= filterStartDate && taskDate <= filterEndDate;
            }

            return matchSearch && matchDate;
        });
    }, [tasks, searchTerm, activeDateTab, filterStartDate, filterEndDate]);

    const stats = useMemo(() => {
        const completed = filteredTasks.filter(t => t.status === 'COMPLETED').length;
        const urgent = filteredTasks.filter(t => t.priority === 'HIGH' && t.status !== 'COMPLETED').length;
        return {
            total: filteredTasks.length,
            completed,
            urgent,
            percent: Math.round((completed / filteredTasks.length) * 100) || 0
        };
    }, [filteredTasks]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API_BASE}/tasks`, { title, description, assigneeId, dueDate, priority });
            setTitle(''); setDescription(''); setAssigneeId(''); setDueDate(''); setPriority('MEDIUM');
            setIsModalOpen(false);
            fetchTasks();
        } catch (error) { alert("Lỗi khi tạo task."); }
        finally { setLoading(false); }
    };

    const getImageUrl = (imagePath: string) => {
        if (!imagePath) return '';
        if (imagePath.startsWith('http')) return imagePath;
        return `${API_BASE}/${imagePath}`;
    };

    const DATE_TABS = [
        { id: 'ALL', label: 'Tất cả' },
        { id: 'YESTERDAY', label: 'Hôm qua' },
        { id: 'TODAY', label: 'Hôm nay' },
        { id: 'TOMORROW', label: 'Ngày mai' },
        { id: 'CUSTOM', label: 'Tùy chỉnh' }
    ];

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto bg-[#F9FAFB] min-h-screen">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-teal-600 rounded-2xl text-white shadow-lg">
                            <Layout size={24} />
                        </div>
                        Workspace Kanban
                    </h1>
                    <div className="flex items-center gap-4 mt-3">
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg">
                            Đang hiển thị: {stats.total} Nhiệm vụ
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text" placeholder="Tìm kiếm nhiệm vụ..."
                            className="pl-12 pr-6 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-bold w-[240px] outline-none focus:ring-4 focus:ring-teal-500/5 transition-all shadow-sm"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-teal-600 hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Plus size={20} /> Thêm việc
                    </button>
                </div>
            </div>

            {/* THANH LỌC NGÀY (THÊM MỚI Ở ĐÂY) */}
            <div className="flex flex-wrap items-center gap-2">
                {DATE_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveDateTab(tab.id)}
                        className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${activeDateTab === tab.id
                            ? 'bg-slate-800 text-white shadow-md'
                            : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-800 hover:text-slate-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}

                {/* Khung chọn ngày từ-đến chỉ hiện khi chọn tab "Tùy chỉnh" */}
                {activeDateTab === 'CUSTOM' && (
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm ml-2 animate-in fade-in slide-in-from-left-4">
                        <CalendarDays size={14} className="text-teal-500" />
                        <input
                            type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)}
                            className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none uppercase cursor-pointer"
                        />
                        <ArrowRight size={12} className="text-slate-300" />
                        <input
                            type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)}
                            className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none uppercase cursor-pointer"
                        />
                    </div>
                )}
            </div>

            {/* QUICK STATS BAR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center justify-between group hover:border-teal-500 transition-all shadow-sm">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ giai đoạn</p>
                        <p className="text-2xl font-black text-slate-800">{stats.percent}% Hoàn thành</p>
                    </div>
                    <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl"><TrendingUp size={24} /></div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center justify-between group hover:border-rose-500 transition-all shadow-sm">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ưu tiên khẩn cấp</p>
                        <p className="text-2xl font-black text-slate-800">{stats.urgent} Việc cần xử lý</p>
                    </div>
                    <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl"><AlertTriangle size={24} /></div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center justify-between group hover:border-indigo-500 transition-all shadow-sm">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng khối lượng</p>
                        <p className="text-2xl font-black text-slate-800">{stats.total} Task hiển thị</p>
                    </div>
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><BarChart3 size={24} /></div>
                </div>
            </div>

            {/* KANBAN BOARD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {['TODO', 'IN_PROGRESS', 'COMPLETED'].map((status) => {
                    const statusTasks = filteredTasks.filter(t => t.status === status);
                    const labels: any = { TODO: 'Cần thực hiện', IN_PROGRESS: 'Đang triển khai', COMPLETED: 'Đã hoàn thành' };
                    const colors: any = { TODO: 'indigo', IN_PROGRESS: 'amber', COMPLETED: 'emerald' };

                    return (
                        <div key={status} className="flex flex-col h-full min-h-[600px]">
                            <div className="flex items-center justify-between mb-5 px-2">
                                <div className="flex items-center gap-3">
                                    <h2 className={`font-black text-slate-700 uppercase tracking-widest text-sm`}>{labels[status]}</h2>
                                    <span className={`bg-${colors[status]}-100 text-${colors[status]}-600 text-[11px] font-black px-2.5 py-1 rounded-lg`}>
                                        {statusTasks.length}
                                    </span>
                                </div>
                                <button className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors"><MoreVertical size={18} /></button>
                            </div>

                            <div className={`flex-1 bg-slate-100/30 rounded-[32px] p-4 border-2 border-dashed border-slate-200/50 space-y-4 shadow-inner`}>
                                {statusTasks.map((task) => {
                                    const assignee = users.find(u => u._id === task.assigneeId);
                                    const progress = task.progress || (task.status === 'COMPLETED' ? 100 : task.status === 'IN_PROGRESS' ? 50 : 0);

                                    const todayStr = getLocalDateString(new Date());
                                    const taskDateStr = task.dueDate?.split('T')[0];
                                    const isOverdue = taskDateStr < todayStr && task.status !== 'COMPLETED';

                                    return (
                                        <div
                                            key={task._id}
                                            onClick={() => setViewingTask(task)}
                                            className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer relative overflow-hidden"
                                        >
                                            <div className="absolute bottom-0 left-0 h-1 bg-slate-100 w-full">
                                                <div className={`h-full bg-${colors[status]}-500`} style={{ width: `${progress}%` }}></div>
                                            </div>

                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex gap-2">
                                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${task.priority === 'HIGH' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                        task.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                                        }`}>
                                                        <Flag size={10} className="inline mr-1 mb-0.5" /> {task.priority}
                                                    </span>

                                                    {isOverdue && (
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-red-100 text-red-600 border border-red-200">
                                                            Quá hạn
                                                        </span>
                                                    )}
                                                </div>

                                                {task.proofImage && (
                                                    <div className="text-teal-500 bg-teal-50 p-1.5 rounded-lg">
                                                        <ImageIcon size={14} />
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="font-black text-slate-800 leading-tight mb-2 group-hover:text-teal-600 transition-colors">{task.title}</h3>

                                            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-50">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-black">
                                                        {(assignee?.name || "U").charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-600 truncate max-w-[80px]">{assignee?.name || "Member"}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-400 font-black text-[10px]">
                                                    <Calendar size={12} className={isOverdue ? 'text-red-500' : task.status === 'COMPLETED' ? 'text-emerald-400' : 'text-slate-400'} />
                                                    {task.dueDate?.split('T')[0]}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODAL GIAO VIỆC */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[8px] z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[45px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="h-2 w-full bg-gradient-to-r from-teal-500 to-blue-600"></div>

                        <div className="p-10 pb-6 flex justify-between items-center">
                            <div>
                                <h4 className="font-black text-2xl text-slate-800 tracking-tight italic">Giao việc mới</h4>
                                <p className="text-slate-400 text-[10px] font-black mt-1 uppercase tracking-widest">Tiến độ & Mục tiêu</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTask} className="p-10 pt-4 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-[2px]">Tiêu đề nhiệm vụ</label>
                                <input
                                    type="text" required value={title} onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:bg-white focus:border-teal-500 outline-none transition-all"
                                    placeholder="Ví dụ: Kiểm kê kho hàng..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-[2px]">Mô tả công việc</label>
                                <textarea
                                    rows={3} value={description} onChange={e => setDescription(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-600 outline-none focus:border-teal-500 transition-all resize-none"
                                    placeholder="Nội dung cần thực hiện chi tiết..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-[2px]">Nhân sự phụ trách</label>
                                <select
                                    required value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">Chọn nhân viên...</option>
                                    {users.map(u => (
                                        <option key={u._id} value={u._id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-[2px]">Hạn chót</label>
                                    <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-[2px]">Ưu tiên</label>
                                    <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 outline-none cursor-pointer">
                                        <option value="LOW">Thấp</option>
                                        <option value="MEDIUM">Trung bình</option>
                                        <option value="HIGH">Khẩn cấp</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-[22px] font-black shadow-2xl hover:bg-teal-600 hover:-translate-y-1 active:scale-95 transition-all flex justify-center items-center gap-3">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Xác nhận giao việc'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL XEM CHI TIẾT CÔNG VIỆC */}
            {viewingTask && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[8px] z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${viewingTask.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        viewingTask.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-indigo-50 text-indigo-600 border-indigo-100'
                                        }`}>
                                        {viewingTask.status === 'COMPLETED' ? 'Đã xong' : viewingTask.status === 'IN_PROGRESS' ? 'Đang làm' : 'Việc mới'}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${viewingTask.priority === 'HIGH' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                        viewingTask.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                        }`}>
                                        Ưu tiên: {viewingTask.priority}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 leading-tight">{viewingTask.title}</h3>
                            </div>
                            <button onClick={() => setViewingTask(null)} className="p-2 bg-white text-slate-400 hover:text-rose-500 rounded-full shadow-sm transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Người phụ trách</p>
                                    <p className="font-bold text-slate-700">
                                        {users.find(u => u._id === viewingTask.assigneeId)?.name || 'Không xác định'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hạn chót</p>
                                    <p className="font-bold text-slate-700 flex items-center gap-2">
                                        <Calendar size={14} className="text-rose-400" />
                                        {viewingTask.dueDate?.split('T')[0]}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-8">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mô tả công việc</p>
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                    <p className="text-sm font-medium text-slate-600 whitespace-pre-wrap leading-relaxed">
                                        {viewingTask.description || "Chưa có mô tả cho công việc này."}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-8">
                                <div className="flex justify-between items-end mb-2 ml-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ hiện tại</p>
                                    <p className="text-sm font-black text-teal-600">
                                        {viewingTask.progress || (viewingTask.status === 'COMPLETED' ? 100 : viewingTask.status === 'IN_PROGRESS' ? 50 : 0)}%
                                    </p>
                                </div>
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-teal-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${viewingTask.progress || (viewingTask.status === 'COMPLETED' ? 100 : viewingTask.status === 'IN_PROGRESS' ? 50 : 0)}%` }}
                                    />
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Ảnh minh chứng từ App</p>
                                {viewingTask.proofImage ? (
                                    <div className="rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50">
                                        <img
                                            src={getImageUrl(viewingTask.proofImage)}
                                            alt="Minh chứng công việc"
                                            className="w-full h-auto object-contain max-h-[300px]"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/f8fafc/94a3b8?text=Loi+Tai+Anh';
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-400 gap-3">
                                        <ImageIcon size={32} className="text-slate-300" />
                                        <p className="text-sm font-bold">Chưa có ảnh báo cáo</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
                            <button
                                onClick={() => setViewingTask(null)}
                                className="px-6 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-colors"
                            >
                                Đóng cửa sổ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
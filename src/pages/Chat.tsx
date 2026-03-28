import axios from 'axios';
import { Send, UserCircle, ChevronLeft } from 'lucide-react'; // THÊM: ChevronLeft cho nút Back trên mobile
import React, { useEffect, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import { API_BASE } from '../../apiConfig';

// 1. CẬP NHẬT INTERFACE ĐỂ LƯU TRỮ TIN NHẮN CUỐI VÀ THÔNG BÁO
interface Employee {
    _id: string;
    name: string;
    role?: string;
    lastMessage?: string;
    lastTime?: string;
    unreadCount?: number;
}

export default function Chat() {
    const [adminId, setAdminId] = useState<string | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedUser, setSelectedUser] = useState<Employee | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const selectedUserRef = useRef<Employee | null>(null);

    useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(() => scrollToBottom(), [messages]);

    const formatTime = (dateStr: any) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    // 0. LẤY ID QUẢN LÝ
    useEffect(() => {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setAdminId(String(parsedUser._id || parsedUser.id || ""));
        }
    }, []);

    // 1. LẤY DANH SÁCH NHÂN VIÊN + TIN NHẮN TÓM TẮT (SUMMARY)
    useEffect(() => {
        if (!adminId) return;
        const fetchData = async () => {
            try {
                // Bước A: Lấy danh sách users
                const resUsers = await axios.get(`${API_BASE}/users`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
                const filteredUsers = resUsers.data.filter((u: any) => String(u._id) !== adminId);

                // Bước B: Lấy tin nhắn cuối & số tin chưa đọc từ Backend
                const ids = filteredUsers.map((u: any) => u._id).join(',');
                const resSummary = await axios.get(`${API_BASE}/messages/admin/summary?ids=${ids}`, { headers: { 'ngrok-skip-browser-warning': 'true' } });

                // Bước C: Gộp dữ liệu
                const finalData = filteredUsers.map((u: any) => {
                    const summary = resSummary.data.find((s: any) => s.employeeId === u._id);
                    return {
                        ...u,
                        lastMessage: summary?.lastMessage || 'Chưa có tin nhắn',
                        lastTime: summary?.lastTime || '',
                        unreadCount: summary?.unreadCount || 0
                    };
                });

                // Sắp xếp: Ai có tin nhắn mới nhất lên đầu
                finalData.sort((a: any, b: any) => new Date(b.lastTime || 0).getTime() - new Date(a.lastTime || 0).getTime());

                setEmployees(finalData);
                // XÓA TẠM DÒNG: if (finalData.length > 0 && !selectedUser) setSelectedUser(finalData[0]); 
                // Lý do: Nếu tự động chọn user trên mobile, nó sẽ nhảy thẳng vào khung chat che mất danh sách. Mình chỉ tự động chọn trên màn hình lớn.
                if (window.innerWidth >= 768 && finalData.length > 0 && !selectedUser) {
                    setSelectedUser(finalData[0]);
                }
            } catch (error) {
                console.error("Lỗi tải dữ liệu:", error);
            }
        };
        fetchData();
    }, [adminId]);

    // 2. KẾT NỐI SOCKET & LẮNG NGHE REAL-TIME
    useEffect(() => {
        if (!adminId) return;
        if (!socketRef.current) {
            socketRef.current = io(API_BASE, {
                query: { userId: adminId, isAdmin: 'true' },
                transports: ['websocket']
            });
            socketRef.current.on('getOnlineUsers', (users: string[]) => setOnlineUsers(users.map(id => String(id))));
        }

        const handleReceiveMessage = (msg: any) => {
            const empId = String(msg.isAdmin ? msg.receiverId : msg.senderId);

            // A. Nếu đang mở khung chat của người đó -> Thêm tin nhắn vào màn hình
            if (selectedUserRef.current && String(selectedUserRef.current._id) === empId) {
                setMessages(prev => [...prev, { id: msg._id, text: msg.text, isAdmin: msg.isAdmin, time: formatTime(msg.createdAt) }]);
                // Tự động báo đã đọc nếu mình đang mở khung chat
                if (!msg.isAdmin) axios.post(`${API_BASE}/messages/read/${empId}`);
            }

            // B. Cập nhật danh sách bên trái (Đẩy lên đầu + Tăng số thông báo)
            setEmployees(prev => {
                const newArr = [...prev];
                const idx = newArr.findIndex(u => String(u._id) === empId);
                if (idx !== -1) {
                    const isOpening = selectedUserRef.current?._id === empId;
                    const updatedUser = {
                        ...newArr[idx],
                        lastMessage: msg.text,
                        lastTime: msg.createdAt,
                        unreadCount: (!isOpening && !msg.isAdmin) ? (newArr[idx].unreadCount || 0) + 1 : (isOpening ? 0 : newArr[idx].unreadCount)
                    };
                    newArr.splice(idx, 1);
                    newArr.unshift(updatedUser);
                }
                return [...newArr];
            });
        };

        socketRef.current.on('receiveMessage', handleReceiveMessage);
        return () => { socketRef.current?.off('receiveMessage'); };
    }, [adminId]);

    // 3. FETCH LỊCH SỬ CHAT KHI CHỌN USER
    useEffect(() => {
        if (!selectedUser?._id) return;
        axios.get(`${API_BASE}/messages/${selectedUser._id}`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then(res => setMessages(res.data.map((m: any) => ({ id: m._id, text: m.text, isAdmin: m.isAdmin, time: formatTime(m.createdAt) }))))
            .catch(() => setMessages([]));
    }, [selectedUser?._id]);

    // 4. XỬ LÝ KHI CLICK CHỌN NHÂN VIÊN
    const handleSelectUser = async (user: Employee) => {
        setSelectedUser(user);
        if (user.unreadCount && user.unreadCount > 0) {
            setEmployees(prev => prev.map(u => u._id === user._id ? { ...u, unreadCount: 0 } : u));
            await axios.post(`${API_BASE}/messages/read/${user._id}`);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !selectedUser || !adminId) return;
        const text = inputText.trim();
        setInputText('');
        try {
            await axios.post(`${API_BASE}/messages`, { senderId: adminId, receiverId: selectedUser._id, text, isAdmin: true });
        } catch (error) { console.error("Lỗi gửi:", error); }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] md:h-[calc(100vh-140px)] max-w-[1600px] mx-auto bg-white md:rounded-2xl shadow-xl border-x md:border border-gray-200 overflow-hidden font-sans">

            {/* CỘT TRÁI - DANH SÁCH NHÂN VIÊN */}
            <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] lg:w-1/3 border-r border-gray-200 flex-col bg-gray-50/50 shrink-0`}>
                <div className="p-4 md:p-5 border-b bg-white shrink-0">
                    <h2 className="text-lg md:text-xl font-bold text-blue-700">Hỗ trợ nhân sự</h2>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {employees.map((user) => {
                        const isOnline = onlineUsers.includes(String(user._id));
                        const isSelected = selectedUser?._id === user._id;
                        const hasUnread = (user.unreadCount || 0) > 0;

                        return (
                            <div key={user._id} onClick={() => handleSelectUser(user)}
                                className={`flex items-center p-3 md:p-4 cursor-pointer border-l-4 transition-all ${isSelected ? 'bg-blue-50 border-blue-600' : 'hover:bg-gray-100 border-transparent'}`}>
                                <div className="relative shrink-0">
                                    <UserCircle className={`w-10 h-10 md:w-12 md:h-12 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                                    {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 border-2 border-white rounded-full"></span>}
                                    {hasUnread && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] md:min-w-[18px] text-center border-2 border-white animate-pulse">
                                            {user.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="ml-3 flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <p className={`text-sm md:text-base truncate pr-2 ${hasUnread ? 'font-black text-black' : 'font-bold text-gray-700'}`}>{user.name}</p>
                                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{formatTime(user.lastTime)}</span>
                                    </div>
                                    <p className={`text-[11px] md:text-xs truncate ${hasUnread ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                                        {user.lastMessage}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CỘT PHẢI - KHUNG CHAT */}
            <div className={`${selectedUser ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white min-w-0`}>
                {selectedUser ? (
                    <>
                        {/* HEADER KHUNG CHAT */}
                        <div className="p-3 md:p-4 border-b flex items-center bg-white shadow-sm shrink-0 sticky top-0 z-10">
                            {/* NÚT BACK CHỈ HIỆN TRÊN MOBILE */}
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="md:hidden mr-2 p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
                            >
                                <ChevronLeft size={24} />
                            </button>

                            <UserCircle className="w-9 h-9 md:w-10 md:h-10 text-blue-600 mr-2 md:mr-3 shrink-0" />
                            <div className="min-w-0">
                                <h3 className="font-bold text-gray-800 text-sm md:text-base truncate">{selectedUser.name}</h3>
                                <p className={`text-[10px] md:text-xs font-bold ${onlineUsers.includes(String(selectedUser._id)) ? 'text-green-500' : 'text-gray-400'}`}>
                                    {onlineUsers.includes(String(selectedUser._id)) ? '● Đang hoạt động' : '○ Ngoại tuyến'}
                                </p>
                            </div>
                        </div>

                        {/* NỘI DUNG CHAT */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4 bg-[#f0f2f5] custom-scrollbar">
                            {messages.map((msg, index) => (
                                <div key={msg.id || index} className={`flex flex-col ${msg.isAdmin ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-3 py-2 md:px-4 md:py-2.5 max-w-[85%] md:max-w-[75%] shadow-sm text-sm break-words ${msg.isAdmin ? 'bg-blue-600 text-white rounded-[20px] rounded-tr-sm' : 'bg-white text-gray-800 border rounded-[20px] rounded-tl-sm'}`}>
                                        {msg.text}
                                    </div>
                                    <span className="text-[9px] md:text-[10px] text-gray-400 mt-1 font-medium px-1">{msg.time}</span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} className="h-1" />
                        </div>

                        {/* KHUNG NHẬP TIN NHẮN */}
                        <div className="p-3 md:p-4 border-t bg-white shrink-0">
                            <form onSubmit={handleSend} className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 md:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-w-0"
                                    placeholder="Nhập tin nhắn..."
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim()}
                                    className="p-2.5 md:p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:bg-gray-300 disabled:active:scale-100 shrink-0"
                                >
                                    <Send size={20} className="md:w-[22px] md:h-[22px]" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-[#f0f2f5]">
                        <UserCircle size={64} className="text-gray-300 mb-4" />
                        <p className="font-medium text-sm md:text-base">Chọn một nhân viên để bắt đầu hỗ trợ</p>
                    </div>
                )}
            </div>

            {/* CSS Scrollbar cho gọn gàng */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
}
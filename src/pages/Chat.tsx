import axios from 'axios';
import { Send, UserCircle } from 'lucide-react';
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
                if (finalData.length > 0 && !selectedUser) setSelectedUser(finalData[0]);
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
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden font-sans">
            {/* CỘT TRÁI - DANH SÁCH NHÂN VIÊN */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col bg-gray-50/50">
                <div className="p-5 border-b bg-white"><h2 className="text-xl font-bold text-blue-700">Hỗ trợ nhân sự</h2></div>
                <div className="flex-1 overflow-y-auto">
                    {employees.map((user) => {
                        const isOnline = onlineUsers.includes(String(user._id));
                        const isSelected = selectedUser?._id === user._id;
                        const hasUnread = (user.unreadCount || 0) > 0;

                        return (
                            <div key={user._id} onClick={() => handleSelectUser(user)}
                                className={`flex items-center p-4 cursor-pointer border-l-4 transition-all ${isSelected ? 'bg-blue-50 border-blue-600' : 'hover:bg-gray-100 border-transparent'}`}>
                                <div className="relative">
                                    <UserCircle className={`w-12 h-12 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                                    {isOnline && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>}
                                    {hasUnread && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white animate-pulse">
                                            {user.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="ml-3 flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <p className={`text-sm truncate ${hasUnread ? 'font-black text-black' : 'font-bold text-gray-700'}`}>{user.name}</p>
                                        <span className="text-[10px] text-gray-400 font-medium">{formatTime(user.lastTime)}</span>
                                    </div>
                                    <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                                        {user.lastMessage}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CỘT PHẢI - KHUNG CHAT */}
            <div className="flex-1 flex flex-col bg-white">
                {selectedUser ? (
                    <>
                        <div className="p-4 border-b flex items-center bg-white shadow-sm">
                            <UserCircle className="w-10 h-10 text-blue-600 mr-3" />
                            <div>
                                <h3 className="font-bold text-gray-800">{selectedUser.name}</h3>
                                <p className={`text-xs font-bold ${onlineUsers.includes(String(selectedUser._id)) ? 'text-green-500' : 'text-gray-400'}`}>
                                    {onlineUsers.includes(String(selectedUser._id)) ? '● Đang hoạt động' : '○ Ngoại tuyến'}
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f0f2f5]">
                            {messages.map((msg, index) => (
                                <div key={msg.id || index} className={`flex flex-col ${msg.isAdmin ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-4 py-2 rounded-2xl max-w-[75%] shadow-sm text-sm ${msg.isAdmin ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border rounded-tl-none'}`}>
                                        {msg.text}
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-1 font-medium">{msg.time}</span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 border-t bg-white">
                            <form onSubmit={handleSend} className="flex gap-2">
                                <input type="text" className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nhập tin nhắn..." value={inputText} onChange={(e) => setInputText(e.target.value)} />
                                <button type="submit" disabled={!inputText.trim()} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-300">
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 font-medium">Chọn một nhân viên để bắt đầu hỗ trợ</div>
                )}
            </div>
        </div>
    );
}
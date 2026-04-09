import axios from 'axios';
import { ChevronLeft, ImagePlus, Paperclip, Send, Sticker, UserCircle, X, Smile } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from '../../apiConfig';
import EmojiPicker from 'emoji-picker-react';

const SAMPLE_STICKERS = [
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2Z5OGwwcms3OXIyeHJjcmIwaDY3MW1jejB2NndibHMzcHJmaGg2ZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1D7ryE8SDYuq8kGGGQ/giphy.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMndycWdlYmFpdDVjaXkxdGt5b2xuemlrcDhsbWI5cXZsbTFvYmJqaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/cXblnKXr2BQOaYnTni/200.webp",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGlmenBvY25oZTU2OG5yNDd4NjBlaTdodWNsa2loOHFjdW9ma29rMyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/AAsj7jdrHjtp6/giphy.webp",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjh1cHhraXRwM2h5dThoMHY0enJkMDlvMDByMDBqZnhmemRyNW9neSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/nR4L10XlJcSeQ/200.webp",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjh1cHhraXRwM2h5dThoMHY0enJkMDlvMDByMDBqZnhmemRyNW9neSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xTiTnMhJTwNHChdTZS/giphy.webp",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXhxdzA0MG45MzNuaGwxdWw1emszOTdmcGcyZXJuYWg3dXo3ejlsayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/RILsqUte1MME7TzQJ9/giphy.webp",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExamtpMWo2MnAwYnlzeWdhcDFqb2N6ZHp6bWtkeDA4amN4OHgxcDg5NiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/tIeCLkB8geYtW/200.webp",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExamtpMWo2MnAwYnlzeWdhcDFqb2N6ZHp6bWtkeDA4amN4OHgxcDg5NiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/rMEJyjch7L1tlRlCl3/200.webp",
    "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif", "https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif",
    "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif", "https://media.giphy.com/media/l41YkxvU8c7J7Bba0/giphy.gif",
    "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif", "https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif"
];

interface Employee {
    _id: string;
    name: string;
    role?: string;
    lastMessage?: string;
    lastTime?: string;
    unreadCount?: number;
}

export default function Chat({
    openUserId, setOpenUserId,
    openMessageId, setOpenMessageId
}: {
    openUserId?: string | null, setOpenUserId?: any,
    openMessageId?: string | null, setOpenMessageId?: any
}) {
    const [previewingImage, setPreviewingImage] = useState<string | null>(null);
    const [adminId, setAdminId] = useState<string | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedUser, setSelectedUser] = useState<Employee | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showStickers, setShowStickers] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const selectedUserRef = useRef<Employee | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const stickerPanelRef = useRef<HTMLDivElement>(null);
    const emojiPanelRef = useRef<HTMLDivElement>(null);
    const prevMessagesLength = useRef(0);
    useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPreviewingImage(null);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
        }, 100);
    };

    // LUỒNG CUỘN TIN NHẮN (THƯỜNG HOẶC TỪ THÔNG BÁO)
    // LUỒNG CUỘN TIN NHẮN (PHIÊN BẢN KHÓA NGÀM, KHÔNG TỰ NHẢY)
    useEffect(() => {
        // Kiểm tra xem số lượng tin nhắn có THỰC SỰ thay đổi không (có tin mới hoặc mới load)
        const isNewMessage = messages.length !== prevMessagesLength.current;
        prevMessagesLength.current = messages.length;

        if (openMessageId && messages.length > 0) {
            console.log("🔥 ĐANG TÌM TIN NHẮN ID:", openMessageId);

            let attempts = 0;
            const findAndScroll = setInterval(() => {
                const targetElement = document.getElementById(`msg-${openMessageId}`);

                if (targetElement) {
                    console.log("✅ TÌM THẤY RỒI! ÉP Ở YÊN ĐÓ KHÔNG CUỘN NỮA!");
                    clearInterval(findAndScroll);

                    // Cuộn nhẹ nhàng tới tin nhắn
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Xóa ID ngay lập tức để không bị kẹt khi có tin nhắn mới
                    // Yên tâm là hàm dưới đã bị khóa nên nó sẽ KHÔNG cuộn xuống đáy
                    if (typeof setOpenMessageId === 'function') {
                        setOpenMessageId(null);
                    }
                } else {
                    attempts++;
                    if (attempts >= 15) {
                        clearInterval(findAndScroll);
                        scrollToBottom('auto');
                        if (typeof setOpenMessageId === 'function') setOpenMessageId(null);
                    }
                }
            }, 100);

            return () => clearInterval(findAndScroll);

        } else if (!openMessageId && isNewMessage) {
            // CHỈ CUỘN XUỐNG ĐÁY KHI: 
            // 1. Không bấm từ thông báo vào
            // 2. VÀ THỰC SỰ CÓ TIN NHẮN MỚI (hoặc vừa load xong màn hình)
            scrollToBottom(messages.length <= 10 ? 'auto' : 'smooth');
        }
    }, [messages, openMessageId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (stickerPanelRef.current && !stickerPanelRef.current.contains(event.target as Node)) {
                setShowStickers(false);
            }
            if (emojiPanelRef.current && !emojiPanelRef.current.contains(event.target as Node)) {
                setShowEmojis(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const formatTime = (dateStr: any) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setAdminId(String(parsedUser._id || parsedUser.id || ""));
        }
    }, []);

    // LUỒNG 1: FETCH DỮ LIỆU BAN ĐẦU
    useEffect(() => {
        if (!adminId) return;
        const fetchData = async () => {
            try {
                const resUsers = await axios.get(`${API_BASE}/users`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
                const filteredUsers = resUsers.data.filter((u: any) => String(u._id) !== adminId);

                const ids = filteredUsers.map((u: any) => u._id).join(',');
                const resSummary = await axios.get(`${API_BASE}/messages/admin/summary?ids=${ids}`, { headers: { 'ngrok-skip-browser-warning': 'true' } });

                const finalData = filteredUsers.map((u: any) => {
                    const summary = resSummary.data.find((s: any) => s.employeeId === u._id);
                    return {
                        ...u,
                        lastMessage: summary?.lastMessage || 'Chưa có tin nhắn',
                        lastTime: summary?.lastTime || '',
                        unreadCount: summary?.unreadCount || 0
                    };
                });

                finalData.sort((a: any, b: any) => new Date(b.lastTime || 0).getTime() - new Date(a.lastTime || 0).getTime());
                setEmployees(finalData);

                if (!openUserId && window.innerWidth >= 768 && finalData.length > 0 && !selectedUserRef.current) {
                    setSelectedUser(finalData[0]);
                }
            } catch (error) { console.error("Lỗi tải dữ liệu:", error); }
        };
        fetchData();
    }, [adminId]);

    // LUỒNG 2: XỬ LÝ NHẬN ID TỪ THÔNG BÁO
    useEffect(() => {
        console.log("ID cần mở:", openUserId);

        if (openUserId && employees.length > 0) {
            const targetEmployee = employees.find(emp => String(emp._id) === String(openUserId));

            if (targetEmployee) {
                console.log("Đã tìm thấy nhân viên! Đang mở khung chat...");
                // ĐÃ SỬA LỖI setSelectedEmployee thành setSelectedUser
                handleSelectUser(targetEmployee);

                if (typeof setOpenUserId === 'function') {
                    setOpenUserId(null);
                }
            } else {
                console.log("Không tìm thấy nhân viên nào có ID này trong danh sách!");
            }
        }
    }, [openUserId, employees]);

    // SOCKET: NHẬN TIN NHẮN
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
            const empId = String(msg.isAdmin ? msg.receiverId : msg.senderId).trim();
            const currentSelectedId = selectedUserRef.current ? String(selectedUserRef.current._id).trim() : null;
            const isOpening = (currentSelectedId === empId);

            let fileObj = null;
            if (msg.fileName && msg.fileUrl) {
                fileObj = { name: msg.fileName, url: msg.fileUrl };
            } else if (msg.file && typeof msg.file === 'object') {
                fileObj = { name: msg.file.name || 'image', url: msg.file.url || '' };
            } else if (msg.fileUrl) {
                fileObj = { name: 'image', url: msg.fileUrl };
            }

            if (isOpening) {
                setMessages(prev => {
                    if (msg._id && prev.some(m => m.id === msg._id)) return prev;

                    const localMsgIndex = prev.findIndex(m =>
                        m.isAdmin && msg.isAdmin &&
                        m.id.length < 24 &&
                        m.text === (msg.text || '')
                    );

                    if (localMsgIndex !== -1) {
                        const newMessages = [...prev];
                        newMessages[localMsgIndex] = {
                            ...newMessages[localMsgIndex],
                            id: msg._id || newMessages[localMsgIndex].id,
                            time: formatTime(msg.createdAt || new Date()),
                            file: fileObj || newMessages[localMsgIndex].file
                        };
                        return newMessages;
                    }

                    return [...prev, {
                        id: msg._id || `temp-${Date.now()}-${Math.random()}`,
                        text: msg.text || '',
                        isAdmin: msg.isAdmin || false,
                        time: formatTime(msg.createdAt || new Date()),
                        file: fileObj
                    }];
                });
                if (!msg.isAdmin) axios.post(`${API_BASE}/messages/read/${empId}`).catch(() => { });
            }

            setEmployees(prev => {
                const newArr = [...prev];
                const idx = newArr.findIndex(u => String(u._id).trim() === empId);

                if (idx !== -1) {
                    let previewText = msg.text || '';
                    if (!previewText && fileObj) previewText = '[Hình ảnh/Tệp]';
                    if (!previewText && msg.fileUrl) previewText = '[Hình ảnh/Tệp]';

                    const updatedUser = {
                        ...newArr[idx],
                        lastMessage: previewText,
                        lastTime: msg.createdAt || new Date(),
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

    // LOAD TIN NHẮN KHI ĐỔI USER
    useEffect(() => {
        if (!selectedUser?._id) return;

        axios.get(`${API_BASE}/messages/${selectedUser._id}`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then(res => setMessages(res.data.map((m: any) => ({
                id: m._id,
                text: m.text,
                isAdmin: m.isAdmin,
                time: formatTime(m.createdAt),
                file: m.fileName ? { name: m.fileName, url: m.fileUrl } : null
            }))))
            .catch(() => setMessages([]));
    }, [selectedUser?._id]);

    const handleSelectUser = async (user: Employee) => {
        if (selectedUserRef.current?._id === user._id) return;

        setSelectedUser(user);
        setMessages([]);

        if (user.unreadCount && user.unreadCount > 0) {
            setEmployees(prev => prev.map(u => u._id === user._id ? { ...u, unreadCount: 0 } : u));
            try {
                await axios.post(`${API_BASE}/messages/read/${user._id}`);
            } catch (e) { console.error("Lỗi báo đọc:", e); }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
            setShowStickers(false);
            setShowEmojis(false);
        }
    };

    const sendSticker = async (stickerUrl: string) => {
        if (!selectedUser || !adminId || isSending) return;
        const textToSend = `[STICKER]${stickerUrl}`;
        setShowStickers(false);

        setMessages(prev => [...prev, { id: Date.now().toString(), text: textToSend, isAdmin: true, time: formatTime(new Date()) }]);

        try {
            const formData = new FormData();
            formData.append('senderId', adminId);
            formData.append('receiverId', selectedUser._id);
            formData.append('text', textToSend);
            formData.append('isAdmin', 'true');
            await axios.post(`${API_BASE}/messages`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch (error) { console.error("Lỗi gửi sticker:", error); }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!inputText.trim() && !selectedFile) || !selectedUser || !adminId || isSending) return;

        setIsSending(true);
        const textToSend = inputText.trim();
        const fileToSend = selectedFile;
        const previewUrl = fileToSend ? URL.createObjectURL(fileToSend) : null;

        setInputText('');
        setSelectedFile(null);

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: textToSend || '',
            isAdmin: true,
            time: formatTime(new Date()),
            file: fileToSend ? { name: fileToSend.name, url: previewUrl } : null
        }]);

        try {
            const formData = new FormData();
            formData.append('senderId', adminId);
            formData.append('receiverId', selectedUser._id);
            formData.append('text', textToSend);
            formData.append('isAdmin', 'true');
            if (fileToSend) formData.append('file', fileToSend);

            await axios.post(`${API_BASE}/messages`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        } catch (error) {
            console.error("Lỗi gửi:", error);
        } finally {
            setIsSending(false);
        }
    };

    const insertEmoji = (emoji: string) => {
        setInputText(prev => prev + emoji);
    };

    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('blob:') || url.startsWith('http')) return url;
        return `${API_BASE}${url}`;
    };

    const renderMessage = (msg: any) => {
        const isSticker = msg.text?.startsWith('[STICKER]');
        const stickerUrl = isSticker ? msg.text.replace('[STICKER]', '') : null;
        const isImage = msg.file && (/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(msg.file.name) || msg.file.url?.match(/(firebasestorage|cloudinary|http).*(jpg|jpeg|png|gif|webp|heic|heif)/i));
        const isOnlyImage = isImage && !msg.text;

        // KIỂM TRA XEM CÓ PHẢI TIN NHẮN TỪ THÔNG BÁO KHÔNG
        const isTargetMessage = openMessageId === msg.id;

        return (
            <div
                key={msg.id}
                id={`msg-${msg.id}`}
                className={`flex flex-col mb-4 ${msg.isAdmin ? 'items-end' : 'items-start'} ${isTargetMessage ? 'bg-yellow-100 p-2 rounded-xl transition-colors duration-1000' : ''}`}
            >
                {isSticker ? (
                    <img src={stickerUrl} alt="sticker" className="w-24 h-24 object-contain drop-shadow-sm" />
                ) : (
                    <div className={`break-words relative ${isOnlyImage ? 'bg-transparent shadow-none' : 'shadow-sm text-sm overflow-hidden px-4 py-2.5 rounded-[20px]'} ${msg.isAdmin ? (isOnlyImage ? '' : 'bg-blue-600 text-white rounded-tr-sm') : (isOnlyImage ? '' : 'bg-white text-gray-800 border rounded-tl-sm')}`}>
                        {msg.file && (
                            <div className={`${msg.text ? 'mb-2' : ''}`}>
                                {isImage && msg.file.url ? (
                                    <div className="cursor-zoom-in transition-opacity hover:opacity-90 overflow-hidden">
                                        <img
                                            src={getImageUrl(msg.file.url)}
                                            alt="attachment"
                                            onClick={() => setPreviewingImage(getImageUrl(msg.file.url))}
                                            onLoad={() => {
                                                if (!openMessageId) scrollToBottom();
                                            }}
                                            className={`max-w-[250px] max-h-[300px] object-contain block ${isOnlyImage ? 'rounded-2xl' : 'rounded-xl'}`}
                                        />
                                    </div>
                                ) : (
                                    <a
                                        href={msg.file.url ? getImageUrl(msg.file.url) : '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 bg-black/10 px-3 py-2 rounded-lg hover:bg-black/20 transition-colors"
                                    >
                                        <Paperclip size={16} />
                                        <span className="underline truncate max-w-[150px]">{msg.file.name}</span>
                                    </a>
                                )}
                            </div>
                        )}
                        {msg.text && <span>{msg.text}</span>}
                    </div>
                )}
                <span className="text-[10px] text-gray-400 mt-1 font-medium px-1">{msg.time}</span>
            </div>
        );
    };

    return (
        <div className="flex h-[calc(100vh-100px)] md:h-[calc(100vh-140px)] max-w-[1600px] mx-auto bg-white md:rounded-2xl shadow-xl border-x md:border border-gray-200 overflow-hidden font-sans relative">

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
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white animate-pulse">
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
                                        {user.lastMessage?.startsWith('[STICKER]') ? '[Đã gửi nhãn dán]' : user.lastMessage}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className={`${selectedUser ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white min-w-0 relative`}>
                {selectedUser ? (
                    <>
                        <div className="p-3 md:p-4 border-b flex items-center bg-white shadow-sm shrink-0 sticky top-0 z-10">
                            <button onClick={() => setSelectedUser(null)} className="md:hidden mr-2 p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
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

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f0f2f5] custom-scrollbar">
                            {messages.map((msg) => renderMessage(msg))}
                            <div ref={messagesEndRef} className="h-1" />
                        </div>

                        {selectedFile && (
                            <div className="px-4 py-2 bg-blue-50 border-t flex justify-between items-center animate-in fade-in duration-300">
                                <div className="flex items-center gap-3">
                                    {selectedFile.type.startsWith('image/') ? (
                                        <img
                                            src={URL.createObjectURL(selectedFile)}
                                            alt="preview"
                                            className="w-12 h-12 object-cover rounded-md border-2 border-white shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                            <Paperclip size={18} className="text-gray-500" />
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-700 truncate max-w-[200px]">
                                            {selectedFile.name}
                                        </span>
                                        <span className="text-[11px] text-blue-500 font-medium">Đã chọn ảnh/tệp</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedFile(null)}
                                    className="p-1.5 hover:bg-red-100 rounded-full text-red-500 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        )}

                        <div className="p-3 md:p-4 border-t bg-white shrink-0 relative">

                            {showStickers && (
                                <div ref={stickerPanelRef} className="absolute bottom-[100%] right-4 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl w-[300px] h-[300px] z-50 flex flex-col">
                                    <div className="p-3 border-b text-center font-bold text-gray-600 text-sm">Nhãn dán nổi bật</div>
                                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar grid grid-cols-4 gap-2 content-start">
                                        {SAMPLE_STICKERS.map((url, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => sendSticker(url)}
                                                className="aspect-square bg-gray-50 rounded-lg hover:bg-gray-100 flex items-center justify-center p-1 transition-transform hover:scale-105 active:scale-95"
                                            >
                                                <img src={url} alt="sticker" className="w-12 h-12 object-contain" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {showEmojis && (
                                <div ref={emojiPanelRef} className="absolute bottom-[100%] right-12 mb-2 z-50 shadow-xl rounded-xl overflow-hidden">
                                    <EmojiPicker
                                        onEmojiClick={(emojiData) => insertEmoji(emojiData.emoji)}
                                        width={320}
                                        height={400}
                                    />
                                </div>
                            )}

                            <form onSubmit={handleSend} className="flex items-center gap-2">
                                <div className="flex items-center text-gray-500 gap-1 md:gap-2">
                                    <input type="file" ref={imageInputRef} accept="image/*,.heic,.heif" className="hidden" onChange={handleFileChange} />
                                    <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ImagePlus size={22} /></button>

                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Paperclip size={22} /></button>
                                </div>

                                <input
                                    type="text"
                                    className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
                                    placeholder="Nhập tin nhắn..."
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onFocus={() => { setShowStickers(false); setShowEmojis(false); }}
                                />

                                <button type="button" onClick={() => { setShowEmojis(!showEmojis); setShowStickers(false); }} className={`p-2 rounded-full transition-colors ${showEmojis ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-100'}`}>
                                    <Smile size={24} />
                                </button>

                                <button type="button" onClick={() => { setShowStickers(!showStickers); setShowEmojis(false); }} className={`p-2 rounded-full transition-colors ${showStickers ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-100'}`}>
                                    <Sticker size={24} />
                                </button>

                                <button
                                    type="submit"
                                    disabled={(!inputText.trim() && !selectedFile) || isSending}
                                    className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shrink-0"
                                >
                                    {isSending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Send size={20} />}
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

            {previewingImage && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setPreviewingImage(null)}
                >
                    <button
                        className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors p-2"
                        onClick={() => setPreviewingImage(null)}
                    >
                        <X size={40} />
                    </button>

                    <div className="relative max-w-[90%] max-h-[90%] flex items-center justify-center">
                        <img
                            src={previewingImage}
                            alt="zoom"
                            className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm animate-in zoom-in-95 duration-300"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
}
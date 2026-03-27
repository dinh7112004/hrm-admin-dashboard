import React, { useState, useEffect } from 'react';
import { Settings, Clock, MapPin, Navigation, Save, LocateFixed } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../apiConfig';

const axiosConfig = { headers: { 'ngrok-skip-browser-warning': 'true' } };

export const ConfigPage = () => {
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [radius, setRadius] = useState("100");
    const [startTime, setStartTime] = useState("08:00");
    const [endTime, setEndTime] = useState("17:00");
    const [loading, setLoading] = useState(false);

    // 1. Tải cấu hình hiện tại từ Server khi mở trang
    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await axios.get(`${API_BASE}/config`, axiosConfig);
            if (res.data) {
                setLat(res.data.latitude.toString());
                setLng(res.data.longitude.toString());
                setRadius(res.data.radius.toString());
                setStartTime(res.data.startTime || "08:00");
                setEndTime(res.data.endTime || "17:00");
            }
        } catch (error) {
            console.error("Lỗi tải cấu hình:", error);
        }
    };

    // 2. Hàm lấy tọa độ thực tế của Admin (Tiện lợi, không cần tra Google Maps)
    const handleGetLiveLocation = () => {
        if (!navigator.geolocation) {
            alert("Trình duyệt không hỗ trợ định vị.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLat(pos.coords.latitude.toFixed(6));
                setLng(pos.coords.longitude.toFixed(6));
                alert("Đã lấy tọa độ hiện tại thành công!");
            },
            (err) => alert("Không thể lấy vị trí: " + err.message)
        );
    };

    // 3. Hàm lưu cấu hình lên Server
    const handleSaveConfig = async () => {
        setLoading(true);
        try {
            const payload = {
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
                radius: parseInt(radius),
                startTime,
                endTime
            };
            await axios.patch(`${API_BASE}/config`, payload, axiosConfig);
            alert("Đã cập nhật cấu hình hệ thống thành công!");
        } catch (error) {
            alert("Lỗi khi lưu cấu hình.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">Cấu hình hệ thống</h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Quản lý định vị & Giờ giấc làm việc</p>
                </div>
                <button
                    onClick={handleSaveConfig}
                    disabled={loading}
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-teal-600 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                    {loading ? "Đang lưu..." : <><Save size={20} /> Lưu tất cả</>}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* CARD 1: ĐỊNH VỊ VĂN PHÒNG */}
                <div className="bg-white border border-slate-200 rounded-[35px] p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-lg flex items-center gap-2 text-slate-800">
                            <MapPin className="text-rose-500" size={22} /> Vị trí văn phòng
                        </h3>
                        <button
                            onClick={handleGetLiveLocation}
                            className="text-[10px] font-black bg-rose-50 text-rose-600 px-3 py-2 rounded-xl hover:bg-rose-100 transition-colors flex items-center gap-1"
                        >
                            <LocateFixed size={14} /> Lấy vị trí tôi
                        </button>
                    </div>

                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Vĩ độ (Latitude)</label>
                                <input
                                    type="number" value={lat} onChange={e => setLat(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                                    placeholder="21.0285..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Kinh độ (Longitude)</label>
                                <input
                                    type="number" value={lng} onChange={e => setLng(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                                    placeholder="105.8542..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Bán kính cho phép (Mét)</label>
                            <div className="relative">
                                <input
                                    type="number" value={radius} onChange={e => setRadius(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                                />
                                <Navigation className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 px-2 italic font-medium">
                                * Nhân viên phải đứng trong phạm vi {radius}m để được duyệt tự động.
                            </p>
                        </div>
                    </div>
                </div>

                {/* CARD 2: THỜI GIAN LÀM VIỆC */}
                <div className="bg-white border border-slate-200 rounded-[35px] p-8 shadow-sm h-fit">
                    <h3 className="font-black text-lg mb-6 flex items-center gap-2 text-slate-800">
                        <Clock className="text-teal-600" size={22} /> Quy định thời gian
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Giờ vào làm</label>
                            <input
                                type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-black text-slate-700 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Giờ tan sở</label>
                            <input
                                type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-black text-slate-700 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-inner"
                            />
                        </div>
                    </div>
                    <div className="mt-6 p-4 bg-teal-50 rounded-2xl border border-teal-100">
                        <p className="text-[11px] text-teal-700 font-bold leading-relaxed">
                            Lưu ý: Hệ thống sẽ dựa vào giờ này để tính toán tình trạng Đi muộn/Về sớm của nhân viên.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
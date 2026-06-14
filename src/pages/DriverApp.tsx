import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, MapPin, Package, Phone, CheckCircle2, ChevronRight, X, Clock, Navigation, FileText, Bell } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for customer location
const CustomerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapCenterUpdater = ({ coords }: { coords: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, 16);
  }, [coords, map]);
  return null;
};

const RINGTONES = [
  { id: 'voice1', name: 'Suara Google (Ada Orderan Baru)', url: '/orderan_baru.mp3' },
  { id: 'bell', name: 'Bell Ring', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  { id: 'beep', name: 'Short Beep', url: 'https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3' },
  { id: 'chime', name: 'Chime Notification', url: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3' },
];

export default function DriverApp() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverUser, setDriverUser] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newOrderPopup, setNewOrderPopup] = useState<any>(null);
  const [deliveryProofFile, setDeliveryProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const latestOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('adminUser');
    if (!userStr) {
      navigate('/admin/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'driver') {
      navigate('/admin/login');
      return;
    }
    setDriverUser(user);
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/orders');
      if (res.ok) {
        const data = await res.json();
        // Filter only dispatched deliveries
        const activeDeliveries = data.filter((o: any) => o.method === 'delivery' && o.status === 'dispatched');
        if (activeDeliveries.length > 0) {
          const newLatestId = activeDeliveries[0].id;
          if (latestOrderIdRef.current && latestOrderIdRef.current !== newLatestId) {
            const ringtoneUrl = localStorage.getItem('driverRingtone') || RINGTONES[0].url;
            const audio = new Audio(ringtoneUrl);
            audio.play().catch(e => console.error('Audio play failed:', e));
            setNewOrderPopup(activeDeliveries[0]);
            setTimeout(() => setNewOrderPopup(null), 10000);
          }
          latestOrderIdRef.current = newLatestId;
        }
        setOrders(activeDeliveries);
      }
    } catch (err) {
      console.error('Error fetching orders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadProofAndComplete = async (orderId: string) => {
    if (!deliveryProofFile) {
      const proceed = window.confirm('Anda belum melampirkan foto bukti pengiriman. Lanjutkan tanpa foto?');
      if (!proceed) return;
      handleCompleteOrder(orderId, null);
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('image', deliveryProofFile);

    try {
      const uploadRes = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (uploadData.success) {
        handleCompleteOrder(orderId, uploadData.url);
      } else {
        alert('Gagal upload foto bukti pengiriman');
        setUploading(false);
      }
    } catch (e) {
      alert('Terjadi kesalahan jaringan');
      setUploading(false);
    }
  };

  const handleCompleteOrder = async (orderId: string, deliveryProofUrl: string | null) => {
    setUploading(true);
    try {
      const payload: any = { status: 'completed' };
      if (deliveryProofUrl) payload.deliveryProof = deliveryProofUrl;

      const res = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSelectedOrder(null);
        setDeliveryProofFile(null);
        fetchOrders();
      } else {
        alert('Gagal menyelesaikan pesanan');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const formatIDR = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  if (loading && !driverUser) {
    return <div className="min-h-screen flex items-center justify-center bg-neutral-100">Memuat...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 font-sans">
      {/* Header */}
      <div className="bg-orange-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold">Portal Driver</h1>
            <p className="text-sm text-orange-200">Hi, {driverUser?.username}</p>
          </div>
          <button onClick={handleLogout} className="p-2 bg-orange-700/50 rounded-lg hover:bg-orange-700 transition">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 bg-orange-700/30 p-3 rounded-xl border border-orange-500/30">
          <Package className="w-5 h-5 text-orange-200" />
          <div>
            <p className="text-xs text-orange-200 font-medium">Pesanan Aktif</p>
            <p className="text-lg font-bold">{orders.length} Antaran</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <select 
            className="flex-1 bg-white border border-orange-200 rounded-xl px-3 py-2 text-sm outline-none cursor-pointer focus:ring-2 focus:ring-orange-500"
            value={localStorage.getItem('driverRingtone') || RINGTONES[0].url}
            onChange={(e) => {
              const url = e.target.value;
              localStorage.setItem('driverRingtone', url);
              const audio = new Audio(url);
              audio.play().catch(err => alert('Gagal memutar suara: ' + err.message));
              // Force re-render to update select value
              setLoading(true);
              setTimeout(() => setLoading(false), 10);
            }}
          >
            {RINGTONES.map(rt => (
              <option key={rt.id} value={rt.url}>{rt.name}</option>
            ))}
          </select>
          <button 
            onClick={() => {
              const ringtoneUrl = localStorage.getItem('driverRingtone') || RINGTONES[0].url;
              const audio = new Audio(ringtoneUrl);
              audio.play().catch(e => alert('Gagal memutar suara: ' + e.message));
              setNewOrderPopup({
                id: 'TEST-' + Math.floor(Math.random() * 10000),
                deliveryAddress: 'Jl. Tes Simulasi No. 123, Komplek Uji Coba',
                recipientName: 'Bapak Driver',
                method: 'delivery',
                status: 'dispatched'
              });
              setTimeout(() => setNewOrderPopup(null), 10000);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-700/50 hover:bg-orange-700 transition rounded-xl text-sm font-bold"
          >
            <Bell className="h-4 w-4" /> Test Suara & Popup Notifikasi
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4 space-y-4">
        {orders.length === 0 && !loading && (
          <div className="text-center py-16 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <CheckCircle2 className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
            <h3 className="text-neutral-500 font-bold">Belum ada antaran</h3>
            <p className="text-sm text-neutral-400 mt-1">Saat ini tidak ada pesanan yang perlu dikirim.</p>
          </div>
        )}

        {orders.map(order => (
          <div 
            key={order.id} 
            onClick={() => setSelectedOrder(order)}
            className="bg-white rounded-2xl p-4 border border-neutral-100 shadow-sm active:scale-[0.98] transition cursor-pointer"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-xs font-bold font-mono text-neutral-400 bg-neutral-100 px-2 py-1 rounded-md">{order.id}</span>
                <h3 className="font-bold text-neutral-800 mt-2">{order.recipientName}</h3>
              </div>
              <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded-md flex items-center gap-1">
                <Navigation className="w-3 h-3" /> Siap Kirim
              </span>
            </div>
            
            <div className="flex items-start gap-2 mb-3 bg-neutral-50 p-2 rounded-lg border border-neutral-100">
              <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">{order.deliveryAddress}</p>
            </div>

            <div className="flex justify-between items-center border-t border-neutral-100 pt-3 mt-1">
              <p className="text-sm font-bold text-neutral-800">{formatIDR(order.total)}</p>
              <div className="flex items-center gap-1 text-orange-600 text-xs font-bold">
                Lihat Peta <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Detail Modal with Map */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-neutral-900/80 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl w-full max-h-[90vh] flex flex-col shadow-2xl relative animate-in slide-in-from-bottom-full duration-300">
            <div className="p-4 flex justify-between items-center border-b border-neutral-100 shrink-0">
              <h2 className="text-lg font-bold">Detail Pengantaran</h2>
              <button onClick={() => { setSelectedOrder(null); setDeliveryProofFile(null); }} className="p-2 bg-neutral-100 rounded-full text-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Maps View */}
              {selectedOrder.deliveryCoords ? (
                <div className="h-64 w-full bg-neutral-200 relative z-0">
                  <MapContainer 
                    center={selectedOrder.deliveryCoords as [number, number]} 
                    zoom={16} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={selectedOrder.deliveryCoords as [number, number]} icon={CustomerIcon}>
                      <Popup>Lokasi Pelanggan</Popup>
                    </Marker>
                    <MapCenterUpdater coords={selectedOrder.deliveryCoords as [number, number]} />
                  </MapContainer>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.deliveryCoords[0]},${selectedOrder.deliveryCoords[1]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 z-[400] bg-white text-orange-600 font-bold px-4 py-2 rounded-xl shadow-lg border border-neutral-100 flex items-center gap-2 text-sm"
                  >
                    <Navigation className="w-4 h-4" /> Buka Google Maps
                  </a>
                </div>
              ) : (
                <div className="h-40 w-full bg-neutral-100 flex items-center justify-center border-b border-neutral-200">
                  <p className="text-neutral-500 text-sm font-medium">Koordinat peta tidak tersedia.</p>
                </div>
              )}

              {/* Customer Details */}
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-xs text-neutral-400 font-bold mb-1 uppercase tracking-wider">Penerima</p>
                  <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    <div>
                      <h3 className="font-bold text-neutral-800 text-lg">{selectedOrder.recipientName}</h3>
                      <p className="text-sm text-neutral-500 font-mono mt-0.5">{selectedOrder.recipientPhone}</p>
                    </div>
                    <a 
                      href={`https://wa.me/${selectedOrder.recipientPhone.replace(/^0/, '62')}?text=${encodeURIComponent('Halo kak, saya driver Lesehan Kriwil 354. Pesanan kakak sedang saya antar menuju lokasi ya. Mohon ditunggu!')}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-3 bg-green-100 text-green-600 rounded-full"
                      title="Chat Customer via WhatsApp"
                    >
                      <Phone className="w-5 h-5 fill-current" />
                    </a>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-neutral-400 font-bold mb-1 uppercase tracking-wider">Alamat Lengkap</p>
                  <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-neutral-700 leading-relaxed">
                      {selectedOrder.deliveryAddress}
                    </p>
                  </div>
                  {selectedOrder.addressNotes && (
                    <div className="mt-2 bg-yellow-50 border border-yellow-100 p-3 rounded-xl text-xs text-yellow-800 flex items-start gap-2">
                      <FileText className="w-4 h-4 shrink-0" />
                      <p><span className="font-bold">Patokan:</span> {selectedOrder.addressNotes}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-neutral-400 font-bold mb-1 uppercase tracking-wider">Informasi Pesanan</p>
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Tagihan</span>
                      <span className="font-bold text-neutral-800">{formatIDR(selectedOrder.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Metode Bayar</span>
                      <span className="font-bold text-neutral-800 capitalize">{selectedOrder.paymentMethod}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-neutral-100 bg-white shrink-0 space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Upload Bukti Foto Pengiriman (Kamera/Galeri)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDeliveryProofFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 outline-none"
                />
                {deliveryProofFile && (
                  <p className="text-xs text-emerald-600 mt-1 font-bold">✓ Foto siap diunggah</p>
                )}
              </div>

              <button 
                onClick={() => handleUploadProofAndComplete(selectedOrder.id)}
                disabled={uploading}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-neutral-300 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 active:scale-95 transition-all"
              >
                {uploading ? (
                  <span className="animate-pulse">Menyelesaikan...</span>
                ) : (
                  <><CheckCircle2 className="w-6 h-6" /> Selesaikan Pesanan</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Order Popup */}
      {newOrderPopup && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5 fade-in duration-300 w-[90%] max-w-sm">
          <div className="bg-white border-2 border-orange-500 p-4 rounded-2xl shadow-2xl flex gap-3 relative">
            <button onClick={() => setNewOrderPopup(null)} className="absolute top-2 right-2 text-neutral-400 hover:text-neutral-700">
              <X className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-orange-600 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-800">Tugas Antaran Baru!</h3>
              <p className="text-xs text-neutral-600 mt-1 line-clamp-2">
                Tujuan: {newOrderPopup.deliveryAddress}
              </p>
              <button 
                onClick={() => {
                  setNewOrderPopup(null);
                  setSelectedOrder(newOrderPopup);
                }}
                className="mt-2 text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                Lihat Rincian &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

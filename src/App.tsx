import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  MapPin, 
  Bike, 
  Store, 
  Clock, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  Star, 
  ArrowRight, 
  History, 
  User, 
  Phone, 
  Receipt, 
  Sparkles, 
  AlertCircle, 
  X, 
  CheckCircle2,
  UtensilsCrossed,
  Map,
  Smile,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MENU_ITEMS, RESTAURANT_BRANCHES, MenuItem, Branch } from './data';
import OSMMap from './components/OSMMap';

// Helper to format currency
const formatIDR = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
};

// Haversine formula to compute distance in km between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface Order {
  id: string;
  timestamp: string;
  items: CartItem[];
  method: 'pickup' | 'delivery';
  branch: Branch;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryCoords: [number, number] | null;
  distanceKm: number;
  pickupTime: string;
  addressNotes?: string;
  status: 'pending' | 'preparing' | 'dispatched' | 'completed';
}

export default function App() {
  // General UI States
  const [activeCategory, setActiveCategory] = useState<'semua' | 'makanan' | 'minuman' | 'camilan'>('semua');
  const [orderMethod, setOrderMethod] = useState<'pickup' | 'delivery'>('delivery');
  const [selectedBranch, setSelectedBranch] = useState<Branch>(RESTAURANT_BRANCHES[0]);
  
  // Cart States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  // Delivery Form States
  const [deliveryCoords, setDeliveryCoords] = useState<[number, number] | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  
  // Pickup Form States
  const [pickupTime, setPickupTime] = useState('Segera (15-20 menit)');

  // Active Order Live Tracking State
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orderLogs, setOrderLogs] = useState<Order[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Load order history & current order on startup
  useEffect(() => {
    const savedLogs = localStorage.getItem('nusantara_order_logs');
    if (savedLogs) {
      try {
        setOrderLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error(e);
      }
    }

    const savedActive = localStorage.getItem('nusantara_active_order');
    if (savedActive) {
      try {
        setActiveOrder(JSON.parse(savedActive));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save changes to localStorage
  const saveOrderLogsToStorage = (logs: Order[]) => {
    localStorage.setItem('nusantara_order_logs', JSON.stringify(logs));
  };

  // Trigger brief alert notifications
  const triggerToast = (message: string, type: 'success' | 'info' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => {
      setShowToast(null);
    }, 3000);
  };

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItem.id === item.id);
      if (existing) {
        return prev.map(i => i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
    triggerToast(`${item.name} berhasil ditambahkan ke keranjang`, 'success');
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.menuItem.id === itemId) {
          const newQty = i.quantity + delta;
          return newQty > 0 ? { ...i, quantity: newQty } : null;
        }
        return i;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (itemId: string, name: string) => {
    setCart(prev => prev.filter(i => i.menuItem.id !== itemId));
    triggerToast(`${name} dihapus dari keranjang`, 'info');
  };

  const clearCart = () => {
    setCart([]);
    triggerToast('Keranjang belanja berhasil dikosongkan', 'info');
  };

  // Distance & Delivery Fee Calculation
  const calculatedDistance = useMemo(() => {
    if (orderMethod !== 'delivery' || !deliveryCoords) return 0;
    return calculateDistance(
      selectedBranch.coords[0],
      selectedBranch.coords[1],
      deliveryCoords[0],
      deliveryCoords[1]
    );
  }, [orderMethod, selectedBranch, deliveryCoords]);

  const deliveryFee = useMemo(() => {
    if (orderMethod !== 'delivery' || !deliveryCoords) return 0;
    // Base rate Rp 5.000 + Rp 2.000 per km
    const baseRate = 5000;
    const perKmRate = 2000;
    const computed = baseRate + (calculatedDistance * perKmRate);
    return Math.round(computed / 100) * 100; // round to nearest Rp 100
  }, [orderMethod, deliveryCoords, calculatedDistance]);

  // Pricing calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  }, [cart]);

  const tax = useMemo(() => {
    // PB1 tax of 10%
    return Math.round((subtotal * 0.1) / 100) * 100;
  }, [subtotal]);

  const grandTotal = useMemo(() => {
    const fee = orderMethod === 'delivery' ? deliveryFee : 0;
    return subtotal + fee + tax;
  }, [subtotal, deliveryFee, tax, orderMethod]);

  // Filter products based on selected tab
  const filteredMenuItems = useMemo(() => {
    if (activeCategory === 'semua') return MENU_ITEMS;
    return MENU_ITEMS.filter(item => item.category === activeCategory);
  }, [activeCategory]);

  // Handle OSM location select callback
  const handleSelectCoordsOnMap = (coords: [number, number], IndonesianAddress: string) => {
    setDeliveryCoords(coords);
    setDeliveryAddress(IndonesianAddress);
    triggerToast('Titik antar terpilih pada peta', 'success');
  };

  // Submit Order formulation
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('Keranjang belanja masih kosong! Silakan pilih makanan lezat terlebih dahulu.');
      return;
    }

    if (orderMethod === 'delivery') {
      if (!deliveryCoords || !deliveryAddress.trim()) {
        alert('Harap tentukan lokasi pengantaran di peta OpenStreetMap terlebih dahulu.');
        return;
      }
      if (!recipientName.trim()) {
        alert('Harap isi Nama Penerima pengantaran.');
        return;
      }
      if (!recipientPhone.trim()) {
        alert('Harap isi Nomor Telepon Penerima.');
        return;
      }
    } else {
      if (!recipientName.trim()) {
        alert('Harap masukkan Nama Pengambil.');
        return;
      }
    }

    // Compose custom Order object
    const newOrder: Order = {
      id: `NUS-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      items: [...cart],
      method: orderMethod,
      branch: selectedBranch,
      subtotal,
      deliveryFee: orderMethod === 'delivery' ? deliveryFee : 0,
      tax,
      total: grandTotal,
      recipientName,
      recipientPhone: orderMethod === 'delivery' ? recipientPhone : '(Diambil)',
      deliveryAddress: orderMethod === 'delivery' ? deliveryAddress : selectedBranch.address,
      deliveryCoords: orderMethod === 'delivery' ? deliveryCoords : null,
      distanceKm: orderMethod === 'delivery' ? parseFloat(calculatedDistance.toFixed(2)) : 0,
      pickupTime: orderMethod === 'pickup' ? pickupTime : '',
      addressNotes: orderMethod === 'delivery' ? addressNotes : '',
      status: 'pending'
    };

    setActiveOrder(newOrder);
    localStorage.setItem('nusantara_active_order', JSON.stringify(newOrder));
    
    // Add to order log records list
    const updatedLogs = [newOrder, ...orderLogs];
    setOrderLogs(updatedLogs);
    saveOrderLogsToStorage(updatedLogs);

    // Empty state
    setCart([]);
    triggerToast('Pesanan berhasil dibuat! Membuka pelacakan langsung.', 'success');
  };

  // Simulated live delivery-status tracker state loop
  useEffect(() => {
    if (!activeOrder) return;

    // Simulate sequence status progression:
    // pending -> preparing (after 10s) -> dispatched (after 20s) -> completed (after 40s)
    let nextStatus: 'pending' | 'preparing' | 'dispatched' | 'completed' = activeOrder.status;
    let delay = 12000;

    if (activeOrder.status === 'pending') {
      nextStatus = 'preparing';
    } else if (activeOrder.status === 'preparing') {
      nextStatus = activeOrder.method === 'delivery' ? 'dispatched' : 'completed';
      delay = 15000;
    } else if (activeOrder.status === 'dispatched') {
      nextStatus = 'completed';
      delay = 18000;
    } else {
      return; // already completed
    }

    const timer = setTimeout(() => {
      const updatedOrder = { ...activeOrder, status: nextStatus };
      setActiveOrder(updatedOrder);
      localStorage.setItem('nusantara_active_order', JSON.stringify(updatedOrder));

      // Update in order log matching the ID as well
      const updatedLogs = orderLogs.map(o => o.id === activeOrder.id ? { ...o, status: nextStatus } : o);
      setOrderLogs(updatedLogs);
      saveOrderLogsToStorage(updatedLogs);

      if (nextStatus === 'preparing') {
        triggerToast('Dapur Nusantara sedang menyiapkan pesanan Anda 🍳', 'info');
      } else if (nextStatus === 'dispatched') {
        triggerToast('Pesanan diserahkan ke Driver dan dalam perjalanan kirim 🛵', 'success');
      } else if (nextStatus === 'completed') {
        triggerToast('Hore! Pesanan Anda telah selesai diproses 🎉', 'success');
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [activeOrder, orderLogs]);

  // Finish tracking action
  const handleClearActiveTracking = () => {
    setActiveOrder(null);
    localStorage.removeItem('nusantara_active_order');
    triggerToast('Kembali ke Menu Utama', 'info');
  };

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-neutral-900 font-sans selection:bg-[#FF6B00] selection:text-white">
      
      {/* Dynamic Popover Toast notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            id="toast-notification"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-medium backdrop-blur-md ${
              showToast.type === 'success' 
                ? 'bg-neutral-900 border-neutral-800 text-white' 
                : 'bg-white border-neutral-200 text-neutral-800'
            }`}
          >
            {showToast.type === 'success' ? (
              <div className="p-1 rounded-full bg-[#FF6B00] text-white">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </div>
            ) : (
              <div className="p-1 rounded-full bg-neutral-100 text-neutral-600">
                <Sparkles className="h-3.5 w-3.5 text-[#FF6B00]" />
              </div>
            )}
            <span>{showToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-[#FF6B00]/10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-[#FF6B00] to-[#FFA057] flex items-center justify-center text-white shadow-md shadow-[#FF6B00]/10">
              <UtensilsCrossed className="h-5.5 w-5.5" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-neutral-900 flex items-center gap-1.5 leading-none">
                Nusantara <span className="text-[#FF6B00] font-black">Bite</span>
              </h1>
              <p className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase mt-1">Citarasa Nusantara Asli</p>
            </div>
          </div>

          {/* Action Row buttons */}
          <div className="flex items-center gap-3">
            {/* Quick Active Order tracker trigger if there is one */}
            {activeOrder && (
              <button
                id="active-track-nav-btn"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#FF6B00]/10 text-[#FF6B00] hover:bg-[#FF6B00]/20 rounded-full text-xs font-black animate-pulse transition"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                <span>Pelacakan Aktif</span>
              </button>
            )}

            {/* Past orders list button */}
            <button
              id="history-modal-trigger"
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 rounded-xl text-sm font-medium transition shadow-xs"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Riwayat Pesanan</span>
              {orderLogs.length > 0 && (
                <span className="bg-neutral-100 text-neutral-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  {orderLogs.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* -------------------- ACTIVE LOG tracker SCREEN (IF ORDERED) -------------------- */}
        {activeOrder ? (
          <motion.div 
            id="order-progress-tracker-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-14"
          >
            {/* Left Box: Courier/Route Info Status */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
              
              {/* Header section */}
              <div className="p-6 sm:p-8 bg-gradient-to-r from-neutral-900 to-neutral-800 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF6B00]">Status Pesanan Langsung</span>
                  <p className="text-xl font-display font-extrabold mt-1">ID Pesanan: {activeOrder.id}</p>
                  <p className="text-neutral-400 text-xs mt-1">Metode: {activeOrder.method === 'delivery' ? 'Kirim Go-Rider' : 'Ambil di Toko'}</p>
                </div>
                
                {/* Visual Circle Pulse */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-[#FF6B00] animate-ping" />
                  <span className="text-xs font-semibold">Memantau Sistem</span>
                </div>
              </div>

              {/* Status Stepper Progression bar */}
              <div className="p-6 sm:p-8 border-b border-neutral-100">
                <div className="relative flex flex-col md:flex-row justify-between gap-6 md:gap-2">
                  
                  {/* Step 1: Created */}
                  <div className="flex md:flex-col items-start md:items-center md:text-center flex-1 gap-4 md:gap-2 relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B00]/10 text-[#FF6B00] z-10">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900 leading-tight">Diterima</h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">{activeOrder.timestamp.split(',')[0]}</p>
                    </div>
                    {/* Line connecter on desktop */}
                    <div className="hidden md:block absolute left-[60%] right-[-40%] top-5 h-0.5 bg-[#FF6B00]/20 z-0" />
                  </div>

                  {/* Step 2: Preparing */}
                  <div className={`flex md:flex-col items-start md:items-center md:text-center flex-1 gap-4 md:gap-2 relative`}>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full z-10 transition-colors duration-500 ${
                      activeOrder.status !== 'pending' 
                        ? 'bg-[#FF6B00]/10 text-[#FF6B00]' 
                        : 'bg-neutral-100 text-neutral-400'
                    }`}>
                      <UtensilsCrossed className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold leading-tight ${activeOrder.status !== 'pending' ? 'text-neutral-900' : 'text-neutral-400'}`}>
                        Diproses Dapur
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {activeOrder.status !== 'pending' ? 'Bumbu dimasak hangat' : 'Menunggu antrean'}
                      </p>
                    </div>
                    {/* Line connecter on desktop */}
                    <div className="hidden md:block absolute left-[60%] right-[-40%] top-5 h-0.5 bg-[#FF6B00]/20 z-0" />
                  </div>

                  {/* Step 3: Out for Delivery or Ready to pickup */}
                  <div className={`flex md:flex-col items-start md:items-center md:text-center flex-1 gap-4 md:gap-2 relative`}>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full z-10 transition-colors duration-500 ${
                      activeOrder.status === 'dispatched' || activeOrder.status === 'completed' 
                        ? 'bg-[#FF6B00]/10 text-[#FF6B00]' 
                        : 'bg-neutral-100 text-neutral-400'
                    }`}>
                      {activeOrder.method === 'delivery' ? <Bike className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold leading-tight ${
                        activeOrder.status === 'dispatched' || activeOrder.status === 'completed' ? 'text-neutral-900' : 'text-neutral-400'
                      }`}>
                        {activeOrder.method === 'delivery' ? 'Dalam Perjalanan' : 'Siap Diambil'}
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {activeOrder.status === 'dispatched' || activeOrder.status === 'completed'
                          ? (activeOrder.method === 'delivery' ? 'Dibawa oleh Driver' : 'Siap di kasir cabang')
                          : 'Sedang disiapkan cabang'
                        }
                      </p>
                    </div>
                    {/* Line connecter on desktop */}
                    <div className="hidden md:block absolute left-[60%] right-[-40%] top-5 h-0.5 bg-[#FF6B00]/20 z-0" />
                  </div>

                  {/* Step 4: Finished */}
                  <div className="flex md:flex-col items-start md:items-center md:text-center flex-1 gap-4 md:gap-2 relative">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full z-10 transition-colors duration-500 ${
                      activeOrder.status === 'completed' 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-neutral-100 text-neutral-400'
                    }`}>
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold leading-tight ${activeOrder.status === 'completed' ? 'text-emerald-700' : 'text-neutral-400'}`}>
                        Selesai
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {activeOrder.status === 'completed' ? 'Sudah diterima, makan kenyang!' : 'Menanti pengiriman'}
                      </p>
                    </div>
                  </div>

                </div>
                           {/* Map Illustration for Delivery / Pickup information */}
              <div className="p-6 sm:p-8 bg-neutral-50/50">
                <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-1.5">
                  <Map className="h-4 w-4 text-[#FF6B00]" />
                  Rincian Informasi Pengantaran / Pengambilan
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Store Detail */}
                  <div className="p-4 bg-white border border-neutral-150 rounded-xl shadow-xs">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400">Mitra Cabang Pengolahan</span>
                    <h5 className="font-bold text-xs text-neutral-800 mt-1">{activeOrder.branch.name}</h5>
                    <p className="text-[11px] text-neutral-500 mt-1">{activeOrder.branch.address}</p>
                    <p className="text-[11px] text-[#FF6B00] font-black mt-2">{activeOrder.branch.phone}</p>
                  </div>

                  {/* Customer Destination / Pickup Detail */}
                  <div className="p-4 bg-white border border-neutral-150 rounded-xl shadow-xs">
                    {activeOrder.method === 'delivery' ? (
                      <>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-[#FF6B00]">Alamat Kirim Rekanan</span>
                        <h5 className="font-bold text-xs text-neutral-800 mt-1">Nama: {activeOrder.recipientName}</h5>
                        <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">{activeOrder.deliveryAddress}</p>
                        {activeOrder.addressNotes && (
                          <p className="text-[10px] text-[#FF6B00] italic mt-1 font-medium">Catatan: "{activeOrder.addressNotes}"</p>
                        )}
                        <p className="text-[11px] text-neutral-600 font-semibold mt-1">Telp: {activeOrder.recipientPhone}</p>
                        <div className="inline-flex items-center gap-1 mt-2 text-[10px] bg-[#FF6B00]/10 text-[#FF6B00] px-2 py-0.5 rounded-md font-semibold">
                          <Bike className="w-3 h-3" />
                          <span>Jarak: {activeOrder.distanceKm} km</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400">Pengambil Mandiri</span>
                        <h5 className="font-bold text-xs text-neutral-800 mt-1">Nama: {activeOrder.recipientName}</h5>
                        <p className="text-[11px] text-neutral-500 mt-2">Daftar Waktu Pengambilan:</p>
                        <p className="text-xs font-bold text-[#FF6B00] bg-[#FF6B00]/10 px-2.5 py-1 rounded-md inline-block mt-1">
                          {activeOrder.pickupTime}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Animated status helper text */}
                <div className="mt-5 p-4 bg-[#FF6B00]/5 border border-[#FF6B00]/10 rounded-xl flex items-start gap-3">
                  <div className="p-1 rounded-full bg-[#FF6B00] text-white shrink-0">
                    <Smile className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-neutral-900">
                      {activeOrder.status === 'pending' && 'Pesanan Sedang Diproses Admin'}
                      {activeOrder.status === 'preparing' && 'Pesanan Sedang Diolah Koki Profesional'}
                      {activeOrder.status === 'dispatched' && 'Driver Sedang Meluncur ke Lokasi Pas Anda'}
                      {activeOrder.status === 'completed' && 'Sajian Selesai Diantar! Nikmati Hidangan Hangat'}
                    </h5>
                    <p className="text-[11px] text-neutral-600 mt-0.5">
                      {activeOrder.status === 'pending' && 'Kami berkomitmen mengirimkan pesanan segar dalam waktu tersingkat. Tunggu perubahan status beberapa detik lagi!'}
                      {activeOrder.status === 'preparing' && 'Koki kami sedang mengolah rempah-rempah pilihan terbaik Nusantara agar hangat melimpah pas sampai di meja makan Anda.'}
                      {activeOrder.status === 'dispatched' && 'Driver melaju mengenakan jas hujan higienis pembawa pelindung box makanan termal agar masakan tetap hangat mengepul.'}
                      {activeOrder.status === 'completed' && 'Terima kasih telah memesan melalui Nusantara Bite! Silakan beri nilai bintang 5 dan nikmati rasa autentik nusantara.'}
                    </p>
                  </div>
                </div>
              </div>   </div>

            </div>

            {/* Right Box: Receipt Details */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-neutral-100 shadow-sm p-6 sm:p-8">
              <h3 className="font-display font-extrabold text-lg text-neutral-900 mb-4 pb-2 border-b border-neutral-100 flex items-center justify-between">
                <span>Struk Tagihan</span>
                <span className="text-xs font-mono font-normal text-neutral-400">Metode Pembayaran CASH/COD</span>
              </h3>

              {/* Order List recap */}
              <div className="space-y-4 mb-6">
                {activeOrder.items.map((item, index) => (
                  <div key={index} className="flex gap-3 justify-between items-start">
                    <div className="flex-1">
                      <h5 className="text-xs font-bold text-neutral-800">{item.menuItem.name}</h5>
                      <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                        {item.quantity} x {formatIDR(item.menuItem.price)}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-neutral-700">
                      {formatIDR(item.menuItem.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

                <div className="border-t border-[#FF6B00]/10 pt-4 space-y-2 mb-6">
                  <div className="flex justify-between text-xs text-neutral-500 font-medium">
                    <span>Subtotal Makanan</span>
                    <span className="font-mono">{formatIDR(activeOrder.subtotal)}</span>
                  </div>
                  {activeOrder.method === 'delivery' && (
                    <div className="flex justify-between text-xs text-neutral-500 font-medium font-medium">
                      <span>Biaya Kirim ({activeOrder.distanceKm} km)</span>
                      <span className="font-mono">{formatIDR(activeOrder.deliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-neutral-500 font-medium">
                    <span>Pajak Restoran PB1 (10%)</span>
                    <span className="font-mono">{formatIDR(activeOrder.tax)}</span>
                  </div>
                  
                  <div className="border-t border-dashed border-[#FF6B00]/20 pt-3 flex justify-between items-center">
                    <span className="font-bold text-neutral-800 text-sm">Total Tagihan</span>
                    <span className="font-mono text-base font-black text-[#FF6B00]">
                      {formatIDR(activeOrder.total)}
                    </span>
                  </div>
                </div>

              {/* Action Finish Tracking */}
              {activeOrder.status === 'completed' ? (
                <button
                  id="finish-order-tracking-btn"
                  onClick={handleClearActiveTracking}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2"
                >
                  <Smile className="h-4 w-4" />
                  Selesai & Pesan Makanan Lain
                </button>
              ) : (
                <button
                  id="back-to-menu-keep-tracking-btn"
                  onClick={() => {
                    setActiveOrder(null); // Temporarily close live viewing of active order
                    triggerToast('Pelacakan disembunyikan. Anda dapat membukanya kembali via tombol atas');
                  }}
                  className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2"
                >
                  <span>Sembunyikan Pelacakan & Pesan Lagi</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              <div className="mt-5 text-center flex items-center justify-center gap-1.5 text-[10px] text-neutral-400 font-semibold uppercase">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                <span>Transaksi Terjamin Keamanan Higienis</span>
              </div>
            </div>
          </motion.div>
        ) : null}


        {/* -------------------- BANNER HERO / INTRO -------------------- */}
        {!activeOrder && (
          <div className="bg-gradient-to-r from-neutral-950 to-neutral-900 rounded-3xl p-6 sm:p-12 text-white relative overflow-hidden mb-10 border border-neutral-800 shadow-md">
            
            {/* Background design elements */}
            <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-15 hidden md:block select-none pointer-events-none">
              <img 
                src="https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=80" 
                alt="Nasi Goreng" 
                className="w-full h-full object-cover rounded-l-3xl"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="relative z-10 max-w-xl">
              <span className="text-[10px] sm:text-xs font-bold text-orange-400 tracking-widest uppercase bg-orange-950/60 px-3 py-1.5 rounded-full border border-orange-900/40 inline-flex items-center gap-1.5 mb-4">
                <Sparkles className="h-3 w-3" />
                Dapur Kelezatan Tradisional
              </span>
              <h2 className="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mt-1 text-white">
                Sajian Autentik <br />
                <span className="text-orange-500 bg-clip-text">Nusantara Indonesia</span>
              </h2>
              <p className="text-sm text-neutral-300 mt-4 leading-relaxed font-light">
                Pesan hidangan terbaik langsung diolah koki lokal berpengalaman. Nikmati layanan pengantaran kilat terintegrasi OpenStreetMap, atau ambil langsung di cabang andalan terdekat Anda.
              </p>

              <div className="flex flex-wrap gap-4 mt-6">
                <div className="flex items-center gap-2.5 bg-neutral-900/80 border border-neutral-800 px-4 py-2 rounded-2xl">
                  <Bike className="h-5 w-5 text-orange-500 shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold leading-none">Kami Antar</p>
                    <p className="text-xs font-bold text-white mt-1">Kilat & Higienis</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-neutral-900/80 border border-neutral-800 px-4 py-2 rounded-2xl">
                  <Store className="h-5 w-5 text-amber-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold leading-none">Ambil Sendiri</p>
                    <p className="text-xs font-bold text-white mt-1">Bebas Ongkir</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        
        {/* -------------------- CORE MENU & ORDERING INTERFACE -------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDE: Menu Catalog (8 Cols on Large Screens) */}
          <div className="lg:col-span-7">
            
            {/* Catalog header & tab selection filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-display font-extrabold text-xl text-neutral-900">Eksplorasi Katalog Menu</h3>
                <p className="text-xs text-neutral-500 mt-1">Rempah asli Nusantara berkualitas tinggi disajikan hangat</p>
              </div>

              {/* Categorization controls row */}
              <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-2xl border border-[#FF6B00]/10 shadow-3xs">
                {(['semua', 'makanan', 'minuman', 'camilan'] as const).map((cat) => (
                  <button
                    key={cat}
                    id={`category-tab-${cat}`}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all capitalize select-none cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/20'
                        : 'text-neutral-500 hover:text-[#FF6B00] hover:bg-[#FF6B00]/5'
                    }`}
                  >
                    {cat === 'semua' ? 'Semua' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMenuItems.map((item) => (
                <div 
                  key={item.id}
                  id={`menu-card-${item.id}`}
                  className="bg-white rounded-3xl border border-[#FF6B00]/5 shadow-xs hover:shadow-md hover:border-[#FF6B00]/20 transition duration-300 overflow-hidden flex flex-col group"
                >
                  {/* Thumbnail Cover */}
                  <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Floating rating badge */}
                    <div className="absolute top-3 left-3 bg-neutral-900/90 text-white px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span>{item.rating}</span>
                    </div>

                    {/* Popular Tag */}
                    {item.isPopular && (
                      <div className="absolute top-3 right-3 bg-[#FF6B00] text-white px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-sm">
                        Terlaris 🔥
                      </div>
                    )}
                  </div>

                  {/* Body textual information */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-display font-black text-sm text-neutral-900 leading-tight group-hover:text-[#FF6B00] transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-neutral-500 text-xs mt-1.5 line-clamp-2 leading-relaxed font-light">
                        {item.description}
                      </p>
                    </div>

                    {/* Price and Cart additions button list */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-50">
                      <span className="font-mono text-sm font-extrabold text-neutral-900">
                        {formatIDR(item.price)}
                      </span>

                      {/* Display quantity counters or standard "Add" */}
                      {cart.some(c => c.menuItem.id === item.id) ? (
                        <div className="flex items-center gap-2 bg-neutral-150 px-2 py-1 rounded-xl">
                          <button
                            id={`dec-qty-catalogue-${item.id}`}
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 text-neutral-600 hover:text-[#FF6B00] transition h-6 w-6 flex items-center justify-center cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold text-neutral-800 min-w-[12px] text-center">
                            {cart.find(c => c.menuItem.id === item.id)?.quantity || 0}
                          </span>
                          <button
                            id={`inc-qty-catalogue-${item.id}`}
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 text-neutral-600 hover:text-[#FF6B00] transition h-6 w-6 flex items-center justify-center cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`add-to-cart-btn-${item.id}`}
                          onClick={() => addToCart(item)}
                          className="px-3.5 py-1.5 bg-[#FF6B00]/10 text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Pesan</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>


          {/* RIGHT SIDE: Selected Cart Summary & Forms (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Shopping Cart Container */}
            <div className="bg-white rounded-3xl border border-[#FF6B00]/10 shadow-sm p-6">
              
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
                <h3 className="font-display font-extrabold text-base text-neutral-900 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-[#FF6B00]" />
                  <span>Keranjang Belanja</span>
                </h3>
                {cart.length > 0 && (
                  <button
                    id="clear-all-cart-btn"
                    onClick={clearCart}
                    className="text-xs text-neutral-400 hover:text-red-500 font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Kosongkan</span>
                  </button>
                )}
              </div>

              {/* Cart item elements */}
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-full bg-neutral-50 text-neutral-300 flex items-center justify-center mx-auto mb-3">
                    <ShoppingBag className="h-6 w-6 animate-bounce" />
                  </div>
                  <h5 className="font-bold text-sm text-neutral-800">Keranjang Masih Kosong</h5>
                  <p className="text-xs text-neutral-400 px-4 mt-2">Pilih menu masakan Nusantara harum di sebelah kiri untuk ditambahkan.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div 
                      key={item.menuItem.id} 
                      className="flex gap-3 justify-between items-center bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-100"
                    >
                      <img 
                        src={item.menuItem.image} 
                        alt={item.menuItem.name} 
                        className="h-11 w-11 rounded-lg object-cover shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-neutral-800 truncate">{item.menuItem.name}</h5>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{formatIDR(item.menuItem.price)}</p>
                      </div>
                      
                      {/* Control buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          id={`dec-qty-cart-${item.menuItem.id}`}
                          onClick={() => updateQuantity(item.menuItem.id, -1)}
                          className="h-7 w-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-orange-600 transition cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold text-neutral-800">{item.quantity}</span>
                        <button
                          id={`inc-qty-cart-${item.menuItem.id}`}
                          onClick={() => updateQuantity(item.menuItem.id, 1)}
                          className="h-7 w-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-orange-600 transition cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        
                        <button
                          id={`remove-item-cart-${item.menuItem.id}`}
                          onClick={() => removeFromCart(item.menuItem.id, item.menuItem.name)}
                          className="h-7 w-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition ml-1 shrink-0 cursor-pointer"
                          title="Hapus menu ini"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Delivery/Pickup Selection with OSM map integrations */}
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-6 overflow-hidden">
              <h3 className="font-display font-extrabold text-base text-neutral-900 pb-3 border-b border-neutral-100 mb-4">
                Metode Penerimaan Makanan
              </h3>

              {/* Delivery method toggle choice options */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-2xl mb-5">
                <button
                  id="delivery-method-btn"
                  type="button"
                  onClick={() => setOrderMethod('delivery')}
                  className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${
                    orderMethod === 'delivery'
                      ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/20'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Bike className="h-4 w-4" />
                  <span>Diantar ke Alamat</span>
                </button>
                
                <button
                  id="pickup-method-btn"
                  type="button"
                  onClick={() => {
                    setOrderMethod('pickup');
                    setDeliveryCoords(null);
                  }}
                  className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${
                    orderMethod === 'pickup'
                      ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/20'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Store className="h-4 w-4" />
                  <span>Ambil Di Tempat</span>
                </button>
              </div>

              {/* Store branch selection option */}
              <div className="mb-5">
                <label className="block text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-2">
                  Pilih Cabang Pengolahan Restoran
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {RESTAURANT_BRANCHES.map(branch => (
                    <button
                      key={branch.id}
                      id={`branch-selector-${branch.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedBranch(branch);
                        triggerToast(`Beralih ke Cabang: ${branch.name}`, 'info');
                      }}
                      className={`text-left p-3.5 rounded-2xl border text-xs transition duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer ${
                        selectedBranch.id === branch.id
                          ? 'bg-[#FF6B00]/5 border-[#FF6B00] text-neutral-900'
                          : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="font-semibold flex items-start gap-1.5 min-w-0">
                        <Store className={`h-4.5 w-4.5 mt-0.5 shrink-0 ${selectedBranch.id === branch.id ? 'text-[#FF6B00]' : 'text-neutral-400'}`} />
                        <div className="truncate">
                          <p className={`font-black ${selectedBranch.id === branch.id ? 'text-neutral-900' : 'text-neutral-800'}`}>{branch.name}</p>
                          <p className="font-light text-[11px] text-neutral-400 truncate mt-0.5">{branch.address}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md self-start sm:self-center shrink-0 ${
                        selectedBranch.id === branch.id 
                          ? 'bg-[#FF6B00] text-white' 
                          : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {selectedBranch.id === branch.id ? 'Terpilih Resto' : 'Pilih'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>


              {/* -------------------- DYNAMIC FORM SUBMISSIONS -------------------- */}
              <form onSubmit={handlePlaceOrder} className="space-y-4">
                
                {/* 1. Both Mode: Recipient Name */}
                <div>
                  <label className="block text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">
                    Nama Penerima / Pengambil
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                    <input
                      id="recipient-name-input"
                      type="text"
                      required
                      placeholder="Masukkan nama lengkap..."
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                {orderMethod === 'delivery' && (
                  <>
                    {/* Delivery Form: Phone Number */}
                    <div>
                      <label className="block text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">
                        Nomor WhatsApp / Telepon Penerima
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                        <input
                          id="recipient-phone-input"
                          type="tel"
                          required
                          placeholder="Contoh: 0812XXXXXXXX..."
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                        />
                      </div>
                    </div>

                    {/* Delivery Form: OpenStreetMap Section */}
                    <div>
                      <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                        Pilih Lokasi Diantar Pada Peta (OpenStreetMap)
                      </label>
                      <p className="text-[10px] text-neutral-400 mb-2 leading-relaxed">
                        Cari alamat atau ketuk pin lokasi Anda pada peta di bawah ini. Kami akan mengukur jarak pengiriman dari Cabang Nusantara terpilih secara akurat.
                      </p>

                      <div className="h-80 w-full mb-3" style={{ position: 'relative', zIndex: 10 }}>
                        <OSMMap
                          branchCoords={selectedBranch.coords}
                          branchName={selectedBranch.name}
                          deliveryCoords={deliveryCoords}
                          onSelectCoords={handleSelectCoordsOnMap}
                        />
                      </div>

                      {/* Display Resolved Geocoded Address Name */}
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-150 relative">
                        <div className="flex gap-2 items-start">
                          <MapPin className="h-4.5 w-4.5 text-[#FF6B00] mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wider">Hasil Geocode Peta</span>
                            {deliveryAddress ? (
                              <p className="text-xs text-neutral-800 font-medium leading-relaxed mt-0.5">
                                {deliveryAddress}
                              </p>
                            ) : (
                              <p className="text-xs text-neutral-400 italic mt-0.5">
                                Belum ada titik terpilih. Silakan ketuk peta / cari lokasi di box map di atas.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Form: Manual Detailed Address Notes */}
                    <div>
                      <label className="block text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">
                        Catatan Detail Alamat (Opsional)
                      </label>
                      <textarea
                        id="address-notes-textarea"
                        placeholder="Contoh: Gedung A Lantai 3, pagar hitam cat emas, samping Pos Satpam..."
                        value={addressNotes}
                        rows={2}
                        onChange={(e) => setAddressNotes(e.target.value)}
                        className="w-full px-4 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                      />
                    </div>

                    {/* Distance and Delivery rate stats display box */}
                    {deliveryCoords && (
                      <div className="p-4 bg-[#FF6B00]/5 border border-[#FF6B00]/15 rounded-2xl flex justify-between items-center text-xs">
                        <div>
                          <p className="text-neutral-500 font-medium">Estimasi Jarak Antar</p>
                          <p className="font-extrabold text-sm text-neutral-800 mt-0.5">{calculatedDistance.toFixed(2)} km</p>
                        </div>
                        <div className="text-right">
                          <p className="text-neutral-500 font-medium">Tarif Pengiriman</p>
                          <p className="font-mono font-black text-sm text-[#FF6B00] mt-0.5">{formatIDR(deliveryFee)}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {orderMethod === 'pickup' && (
                  <>
                    {/* Pickup Form: Estimated Time picker */}
                    <div>
                      <label className="block text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">
                        Waktu Pengambilan Pesanan
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                        <select
                          id="pickup-time-select"
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] cursor-pointer"
                        >
                          <option value="Segera (15-20 menit)">Segera (15-20 menit)</option>
                          <option value="30 menit ke depan">30 menit ke depan</option>
                          <option value="1 jam ke depan">1 jam ke depan</option>
                          <option value="2 jam ke depan (Simpan Dingin)">2 jam ke depan (Simpan Dingin)</option>
                        </select>
                      </div>
                    </div>

                    {/* Information alert box for Pickup method */}
                    <div className="p-4 bg-[#FF6B00]/5 rounded-2xl text-xs space-y-1.5 text-neutral-600 border border-[#FF6B00]/10">
                      <p className="font-extrabold text-neutral-800 flex items-center gap-1.5">
                        <Store className="h-4.5 w-4.5 text-[#FF6B00]" />
                        Lokasi Pengambilan Terpilih:
                      </p>
                      <p className="text-[11px] font-bold text-neutral-700 leading-relaxed">
                        {selectedBranch.name}
                      </p>
                      <p className="text-[10px] leading-relaxed text-neutral-400">
                        {selectedBranch.address}
                      </p>
                    </div>
                  </>
                )}


                {/* -------------------- FINANCIAL TOTAL BILL SUMMARY -------------------- */}
                <div className="border-t border-neutral-100 pt-4 space-y-2">
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Subtotal Makanan</span>
                    <span className="font-mono">{formatIDR(subtotal)}</span>
                  </div>
                  
                  {orderMethod === 'delivery' && (
                    <div className="flex justify-between text-xs text-neutral-500">
                      <span>Ongkos Kirim {deliveryCoords && `(${calculatedDistance.toFixed(1)} km)`}</span>
                      <span className="font-mono">
                        {deliveryCoords ? formatIDR(deliveryFee) : 'Rp 0 (Tentukan Peta)'}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Pajak PB1 (10%)</span>
                    <span className="font-mono">{formatIDR(tax)}</span>
                  </div>

                  <div className="border-t border-dashed border-neutral-200 pt-3 flex justify-between items-center">
                    <span className="font-bold text-neutral-800 text-sm">Total Pembayaran</span>
                    <span className="font-mono text-lg font-black text-[#FF6B00]">
                      {formatIDR(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Main Submit Place Order Button */}
                <button
                  id="submit-order-checkout-btn"
                  type="submit"
                  disabled={cart.length === 0 || (orderMethod === 'delivery' && !deliveryCoords)}
                  className={`w-full py-3.5 rounded-2xl text-xs font-black shadow-md transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                    cart.length > 0 && (orderMethod === 'pickup' || deliveryCoords) 
                      ? 'bg-[#FF6B00] hover:brightness-105 text-white shadow-[#FF6B00]/25' 
                      : 'bg-neutral-100 border border-neutral-250 text-neutral-400 shadow-none cursor-not-allowed'
                  }`}
                >
                  <ShoppingBag className="h-4.5 w-4.5" />
                  <span>PESAN SEKARANG ({formatIDR(grandTotal)})</span>
                </button>

              </form>

            </div>

          </div>

        </div>

      </main>

      {/* Footer copyright */}
      <footer className="bg-neutral-950 text-neutral-500 py-10 mt-20 border-t border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-white">
            <div className="h-6 w-6 rounded-lg bg-[#FF6B00] flex items-center justify-center text-white text-xs">
              <UtensilsCrossed className="h-3.5 w-3.5" />
            </div>
            <span className="font-display font-extrabold text-sm tracking-tight">Nusantara Bite</span>
          </div>
          <p className="text-xs font-light">
            © {new Date().getFullYear()} Nusantara Bite - Pemesanan Makanan Tradisional Indonesia. Hak Cipta Dilindungi Undang-Undang.
          </p>
          <p className="text-[10px] text-neutral-600 font-semibold uppercase tracking-wider">
            Integrasi OpenStreetMap & Leaflet Maps Terverifikasi
          </p>
        </div>
      </footer>


      {/* -------------------- POPUP MODAL: RIWAYAT PESANAN -------------------- */}
      <AnimatePresence>
        {showHistoryModal && (
          <div id="history-logs-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryModal(false)}
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs"
            />
            
            {/* Modal box */}
            <motion.div 
              id="history-logs-modal-box"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-neutral-100 shadow-2xl relative z-10 w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-orange-600" />
                  <h3 className="font-display font-extrabold text-base text-neutral-900">Riwayat Transaksi</h3>
                </div>
                <button
                  id="close-history-modal-btn"
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 divide-y divide-neutral-100">
                {orderLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="h-12 w-12 rounded-full bg-neutral-50 text-neutral-300 flex items-center justify-center mx-auto mb-3">
                      <History className="h-6 w-6" />
                    </div>
                    <h5 className="font-bold text-sm text-neutral-800">Tidak Ada Transaksi Lampau</h5>
                    <p className="text-xs text-neutral-400 mt-2 px-10">Belum ada pesanan terdaftar di peramban Anda saat ini.</p>
                  </div>
                ) : (
                  orderLogs.map((order, idx) => (
                    <div key={idx} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-extrabold bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-md">
                              {order.id}
                            </span>
                            <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              order.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-orange-50 text-orange-600 animate-pulse'
                            }`}>
                              {order.status === 'completed' ? 'Selesai ✓' : 'Sedang Diproses 🛵'}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-400 font-semibold mt-1.5">{order.timestamp}</p>
                        </div>
                        <span className="font-mono text-xs font-black text-orange-600">
                          {formatIDR(order.total)}
                        </span>
                      </div>

                      {/* Purchased Item recap */}
                      <div className="bg-neutral-50/50 p-2.5 rounded-xl text-xs space-y-1">
                        {order.items.map((it, iIdx) => (
                          <div key={iIdx} className="flex justify-between text-neutral-600">
                            <span>{it.menuItem.name}</span>
                            <span className="font-bold">x {it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Method destination */}
                      <div className="flex justify-between items-center text-[10px] text-neutral-400 font-medium">
                        <span className="capitalize">Metode: {order.method === 'delivery' ? 'Antar Kurir' : 'Ambil Sendiri'}</span>
                        <button
                          id={`track-past-order-btn-${order.id}`}
                          onClick={() => {
                            setActiveOrder(order);
                            setShowHistoryModal(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            triggerToast(`Membuka pelacak pesanan ${order.id}`);
                          }}
                          className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span>Lacak / Detail</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Footer */}
              <div className="p-5 border-t border-neutral-100 bg-neutral-50/50 text-center">
                <p className="text-[10px] text-neutral-400 font-medium">
                  Riwayat disimpan otomatis pada penyimpanan lokal (localStorage) browser Anda.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChevronRight,
  LogIn,
  CreditCard,
  QrCode,
  Wallet,
  Timer,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MENU_ITEMS, RESTAURANT_BRANCHES, MenuItem, Branch } from '../data';
import OSMMap from '../components/OSMMap';

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
  status: 'awaiting_payment' | 'pending' | 'preparing' | 'dispatched' | 'completed';
  items: CartItem[];
  method: 'pickup' | 'delivery';
  paymentMethod?: 'transfer' | 'qris' | 'cod';
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
  paymentProof?: string;
  deliveryProof?: string;
  customerId?: string;
}

export default function CustomerApp() {
  // General UI States
  const [activeCategory, setActiveCategory] = useState<'semua' | 'makanan' | 'minuman' | 'camilan'>('semua');
  const [orderMethod, setOrderMethod] = useState<'pickup' | 'delivery'>('delivery');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  
  const navigate = useNavigate();
  const [customerUser, setCustomerUser] = useState<any>(null);

  // Authentication Check
  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    const userStr = localStorage.getItem('customerData');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setCustomerUser(user);
        setRecipientName(user.name);
        setRecipientPhone(user.phone);
      } catch (e) {
        // failed to parse, leave as guest
      }
    }
  }, []);

  // Data States
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurantBranches, setRestaurantBranches] = useState<Branch[]>([]);
  // Banner State
  interface BannerData {
    id: string;
    title: string;
    subtitle: string;
    image: string;
    isActive: boolean;
  }
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Default fallback banner
  const fallbackBanner = {
    title: 'Sajian Autentik',
    subtitle: 'Lesehan Kriwil 354',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=80'
  };

  const activeBanner = banners.length > 0 ? banners[currentBannerIndex] : fallbackBanner;

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
      }, 5000); // 5 seconds sliding
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  // Fetch data from backend
  useEffect(() => {
    fetch('http://localhost:5000/api/menu')
      .then(res => res.json())
      .then(data => setMenuItems(data))
      .catch(err => console.error('Error fetching menu:', err));

    fetch('http://localhost:5000/api/branches')
      .then(res => res.json())
      .then(data => {
        setRestaurantBranches(data);
        if (data.length > 0) {
          setSelectedBranch(data[0]);
        }
      })
      .catch(err => console.error('Error fetching branches:', err));

    fetch('http://localhost:5000/api/banners')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const activeBanners = data.filter((b: any) => b.isActive);
          setBanners(activeBanners);
        }
      })
      .catch(err => console.error('Error fetching banners:', err));
  }, []);
  
  // Cart States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);

  // Delivery Form States
  const [deliveryCoords, setDeliveryCoords] = useState<[number, number] | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  
  // Pickup Form States
  const [pickupTime, setPickupTime] = useState<string>('Segera (15-20 menit)');

  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'qris' | 'cod'>('cod');
  const [selectedBank, setSelectedBank] = useState('');
  
  const transferMethods = [
    { id: 'BNI', name: 'Bank BNI', account: '1743484738', owner: 'Azhar Alfaini' },
    { id: 'BCA', name: 'Bank BCA', account: '(Nomor Rekening)', owner: 'Lesehan Kriwil 354' },
    { id: 'BRI', name: 'Bank BRI', account: '(Nomor Rekening)', owner: 'Lesehan Kriwil 354' },
    { id: 'MANDIRI', name: 'Bank Mandiri', account: '(Nomor Rekening)', owner: 'Lesehan Kriwil 354' },
    { id: 'SEABANK', name: 'SeaBank', account: '(Nomor Rekening)', owner: 'Lesehan Kriwil 354' },
    { id: 'BSI', name: 'Bank BSI', account: '(Nomor Rekening)', owner: 'Lesehan Kriwil 354' },
    { id: 'GOPAY', name: 'GoPay', account: '(Nomor HP)', owner: 'Lesehan Kriwil 354' },
    { id: 'DANA', name: 'DANA', account: '(Nomor HP)', owner: 'Lesehan Kriwil 354' },
    { id: 'OVO', name: 'OVO', account: '(Nomor HP)', owner: 'Lesehan Kriwil 354' }
  ];

  const isPaymentConfirmed = false;
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePaymentProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        triggerToast('Ukuran gambar maksimal 2MB', 'error');
        return;
      }
      
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      try {
        const res = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          // Check OCR results if available
          let isVerified = false;
          if (data.extractedNumbers && data.extractedNumbers.length > 0) {
            // Check if any extracted number matches grandTotal exactly
            isVerified = data.extractedNumbers.includes(grandTotal);
            if (!isVerified) {
              triggerToast(`Nominal tidak sesuai. Harap: ${formatIDR(grandTotal)}`, 'error');
              setIsUploading(false);
              return;
            }
          } else {
             // Strict check: if no numbers found, reject.
             triggerToast('Gagal mendeteksi angka pada struk, foto buram.', 'error');
             setIsUploading(false);
             return;
          }
          
          setPaymentProofUrl(data.url);
          triggerToast('Bukti berhasil diverifikasi & diunggah', 'success');
          
          // Automatically place order!
          setTimeout(() => {
             handlePlaceOrder(undefined, data.url);
          }, 500);
        } else {
          triggerToast('Gagal mengunggah foto', 'error');
        }
      } catch (err) {
        triggerToast('Terjadi kesalahan saat mengunggah', 'error');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [paymentTimeLeft, setPaymentTimeLeft] = useState<number>(300); // 5 minutes in seconds
  const [orderLogs, setOrderLogs] = useState<Order[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Review State
  const [reviewingItem, setReviewingItem] = useState<{menuId: string, menuName: string} | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // View Reviews State
  const [viewingReviewsFor, setViewingReviewsFor] = useState<{menuId: string, menuName: string} | null>(null);
  const [menuReviews, setMenuReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Payment Countdown Effect
  useEffect(() => {
    const isPaymentMethodSelected = paymentMethod === 'qris' || (paymentMethod === 'transfer' && selectedBank !== '');
    
    if (isPaymentMethodSelected && paymentTimeLeft > 0 && !paymentProofUrl) {
      const timer = setInterval(() => {
        setPaymentTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [paymentMethod, selectedBank, paymentTimeLeft, paymentProofUrl]);

  // Load order history from backend
  useEffect(() => {
    if (customerUser?.id) {
      fetch(`http://localhost:5000/api/orders/customer/${customerUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setOrderLogs(data);
          }
        })
        .catch(err => console.error('Error fetching order history:', err));
    }
  }, [customerUser?.id, activeOrder?.status]); // Re-fetch if active order status changes

  // Load reviews when modal opened
  useEffect(() => {
    if (viewingReviewsFor) {
      setIsLoadingReviews(true);
      fetch(`http://localhost:5000/api/reviews/menu/${viewingReviewsFor.menuId}`)
        .then(res => res.json())
        .then(data => {
          setMenuReviews(Array.isArray(data) ? data : []);
          setIsLoadingReviews(false);
        })
        .catch(err => {
          console.error(err);
          setIsLoadingReviews(false);
        });
    } else {
      setMenuReviews([]);
    }
  }, [viewingReviewsFor]);

  // Load active order on startup
  useEffect(() => {
    const savedActive = localStorage.getItem('nusantara_active_order');
    if (savedActive) {
      try {
        setActiveOrder(JSON.parse(savedActive));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save changes to localStorage (legacy helper, mostly removed)
  const saveOrderLogsToStorage = (logs: Order[]) => {
    // No longer save to local storage
  };

  // Trigger brief alert notifications
  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
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

  const submitReview = async () => {
    if (!reviewingItem || !customerUser) return;
    setIsSubmittingReview(true);
    try {
      const res = await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_item_id: reviewingItem.menuId,
          customer_id: customerUser.id,
          rating: reviewRating,
          comment: reviewComment
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('Terima kasih! Ulasan Anda telah tersimpan', 'success');
        setReviewingItem(null);
        setReviewRating(5);
        setReviewComment('');
        // Re-fetch menu items to update ratings
        fetch('http://localhost:5000/api/menu')
          .then(res => res.json())
          .then(data => setMenuItems(data));
      } else {
        triggerToast('Gagal mengirim ulasan', 'error');
      }
    } catch (err) {
      triggerToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Distance & Delivery Fee Calculation
  const calculatedDistance = useMemo(() => {
    if (orderMethod !== 'delivery' || !deliveryCoords || !selectedBranch) return 0;
    return calculateDistance(
      selectedBranch.coords[0],
      selectedBranch.coords[1],
      deliveryCoords[0],
      deliveryCoords[1]
    );
  }, [orderMethod, selectedBranch, deliveryCoords]);

  const deliveryFee = useMemo(() => {
    if (orderMethod !== 'delivery' || !deliveryCoords) return 0;
    
    // Gratis ongkos kirim untuk jarak 2 km pertama
    if (calculatedDistance <= 2) return 0;

    // Untuk jarak lebih dari 2 km: Tarif dasar Rp 2.000 + Rp 1.000 per sisa kilometer
    const baseRate = 2000;
    const excessDistance = calculatedDistance - 2;
    const perKmRate = 1000;
    const computed = baseRate + (excessDistance * perKmRate);
    return Math.round(computed / 100) * 100; // round to nearest Rp 100
  }, [orderMethod, deliveryCoords, calculatedDistance]);

  // Pricing calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  }, [cart]);

  const tax = 0; // Pajak PB1 dihilangkan sesuai permintaan

  const grandTotal = useMemo(() => {
    const fee = orderMethod === 'delivery' ? deliveryFee : 0;
    return subtotal + fee;
  }, [subtotal, deliveryFee, orderMethod]);

  // Filter products based on selected tab
  const filteredMenuItems = useMemo(() => {
    if (activeCategory === 'semua') return menuItems;
    return menuItems.filter(item => item.category === activeCategory);
  }, [activeCategory, menuItems]);

  // Handle OSM location select callback
  const handleSelectCoordsOnMap = (coords: [number, number], IndonesianAddress: string) => {
    setDeliveryCoords(coords);
    setDeliveryAddress(IndonesianAddress);
    triggerToast('Titik antar terpilih pada peta', 'success');
  };

  // Submit Order formulation
  const handlePlaceOrder = (e?: React.FormEvent, overrideProofUrl?: string) => {
    if (e) e.preventDefault();

    const finalProofUrl = overrideProofUrl || paymentProofUrl;

    if (paymentMethod !== 'cod' && !finalProofUrl) {
      triggerToast('Silakan unggah bukti pembayaran Anda.', 'error');
      return;
    }

    if (!selectedBranch) return;

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
      id: `ORD-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      status: 'pending', // Directly pending because they confirm payment upfront now
      method: orderMethod,
      paymentMethod: paymentMethod,
      paymentProof: finalProofUrl || undefined,
      branch: selectedBranch,
      customerId: customerUser?.id, // Added to link to customer account
      items: [...cart],
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
      addressNotes: orderMethod === 'delivery' ? addressNotes : ''
    };

    // Save to DB
    fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newOrder)
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error && data.message) {
        triggerToast('Pesanan berhasil dikirim ke restoran!');
        setCart([]);
        setAddressNotes('');
        setPaymentProofUrl(null);
        setActiveOrder(newOrder);
        setPaymentTimeLeft(300); // Reset timer to 5 mins
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        triggerToast('Gagal memproses pesanan, coba lagi nanti.');
      }
    })
    .catch(err => {
      console.error('Failed to submit order:', err);
      alert('Maaf, gagal membuat pesanan. Silakan coba lagi.');
    });
  };

  // Real live delivery-status tracker state loop
  useEffect(() => {
    if (!activeOrder) return;

    // Polling every 5 seconds
    const timer = setInterval(() => {
      fetch('http://localhost:5000/api/orders')
        .then(res => res.json())
        .then(data => {
          const serverOrder = data.find((o: any) => o.id === activeOrder.id);
          if (serverOrder && serverOrder.status !== activeOrder.status) {
            const nextStatus = serverOrder.status;
            const updatedOrder = { ...activeOrder, status: nextStatus };
            setActiveOrder(updatedOrder);
            localStorage.setItem('nusantara_active_order', JSON.stringify(updatedOrder));

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
          }
        })
        .catch(err => console.error('Error polling order status:', err));
    }, 5000);

    return () => clearInterval(timer);
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
                : showToast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-white border-neutral-200 text-neutral-800'
            }`}
          >
            {showToast.type === 'success' ? (
              <div className="p-1 rounded-full bg-[#FF6B00] text-white">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </div>
            ) : showToast.type === 'error' ? (
              <div className="p-1 rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-3.5 w-3.5" strokeWidth={3} />
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
                Lesehan <span className="text-[#FF6B00] font-black">Kriwil 354</span>
              </h1>
              <p className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase mt-1">Sajian Istimewa</p>
            </div>
          </div>

          {/* Action Row buttons */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Customer Profile Pill or Login Button */}
            {customerUser ? (
              <div className="hidden sm:flex items-center gap-3 bg-neutral-50 border border-neutral-200 pl-3 pr-1 py-1 rounded-full">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest leading-none">Pelanggan</span>
                  <span className="text-xs font-black text-neutral-800 leading-tight">{customerUser.name.split(' ')[0]}</span>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('customerToken');
                    localStorage.removeItem('customerData');
                    setCustomerUser(null);
                    setRecipientName('');
                    setRecipientPhone('');
                  }}
                  className="h-8 w-8 bg-white hover:bg-red-50 text-neutral-400 hover:text-red-500 border border-neutral-200 hover:border-red-200 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                  title="Keluar (Logout)"
                >
                  <LogIn className="w-4 h-4 rotate-180" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#FF8A00] text-white rounded-full text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                <User className="w-4 h-4" />
                Login / Daftar
              </button>
            )}

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
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full z-10 transition-colors ${
                      activeOrder.status === 'awaiting_payment' ? 'bg-red-100 text-red-500' : 'bg-[#FF6B00]/10 text-[#FF6B00]'
                    }`}>
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900 leading-tight">Diterima</h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {activeOrder.status === 'awaiting_payment' ? 'Menunggu Pembayaran' : activeOrder.timestamp.split(',')[0]}
                      </p>
                    </div>
                    {/* Line connecter on desktop */}
                    <div className="hidden md:block absolute left-[60%] right-[-40%] top-5 h-0.5 bg-[#FF6B00]/20 z-0" />
                  </div>

                  {/* Step 2: Preparing */}
                  <div className={`flex md:flex-col items-start md:items-center md:text-center flex-1 gap-4 md:gap-2 relative`}>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full z-10 transition-colors duration-500 ${
                      activeOrder.status !== 'pending' && activeOrder.status !== 'awaiting_payment'
                        ? 'bg-[#FF6B00]/10 text-[#FF6B00]' 
                        : 'bg-neutral-100 text-neutral-400'
                    }`}>
                      <UtensilsCrossed className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold leading-tight ${activeOrder.status !== 'pending' && activeOrder.status !== 'awaiting_payment' ? 'text-neutral-900' : 'text-neutral-400'}`}>
                        Diproses Dapur
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {activeOrder.status !== 'pending' && activeOrder.status !== 'awaiting_payment' ? 'Bumbu dimasak hangat' : 'Menunggu antrean'}
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
                      {activeOrder.status === 'awaiting_payment' && 'Menunggu Konfirmasi Pembayaran'}
                      {activeOrder.status === 'pending' && 'Pesanan Sedang Diproses Admin'}
                      {activeOrder.status === 'preparing' && 'Pesanan Sedang Diolah Koki Profesional'}
                      {activeOrder.status === 'dispatched' && 'Driver Sedang Meluncur ke Lokasi Pas Anda'}
                      {activeOrder.status === 'completed' && 'Sajian Selesai Diantar! Nikmati Hidangan Hangat'}
                    </h5>
                    <p className="text-[11px] text-neutral-600 mt-0.5">
                      {activeOrder.status === 'awaiting_payment' && 'Silakan selesaikan pembayaran dan tekan tombol konfirmasi agar pesanan segera dibuat.'}
                      {activeOrder.status === 'pending' && 'Kami berkomitmen mengirimkan pesanan segar dalam waktu tersingkat. Tunggu perubahan status beberapa detik lagi!'}
                      {activeOrder.status === 'preparing' && 'Koki kami sedang mengolah masakan terbaik agar hangat melimpah pas sampai di meja makan Anda.'}
                      {activeOrder.status === 'dispatched' && 'Driver melaju mengenakan jas hujan higienis pembawa pelindung box makanan termal agar masakan tetap hangat mengepul.'}
                      {activeOrder.status === 'completed' && 'Terima kasih telah memesan melalui Lesehan Kriwil 354! Silakan beri nilai bintang 5 dan nikmati sajian kami.'}
                    </p>
                  </div>
                  </div>
                </div>

                {/* Delivery Proof */}
                {activeOrder.status === 'completed' && activeOrder.deliveryProof && (
                  <div className="mt-5 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <h5 className="font-bold text-xs text-emerald-800 mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Bukti Pengiriman
                    </h5>
                    <div className="flex justify-center">
                      <img 
                        src={activeOrder.deliveryProof} 
                        alt="Bukti Pengiriman" 
                        className="w-full max-w-sm rounded-lg shadow-sm border border-emerald-200"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
              </div>

            {/* Right Box: Receipt Details */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-neutral-100 shadow-sm p-6 sm:p-8">
              <h3 className="font-display font-extrabold text-lg text-neutral-900 mb-4 pb-2 border-b border-neutral-100 flex items-center justify-between">
                <span>Struk Tagihan</span>
                <span className="text-xs font-mono font-normal text-neutral-400 uppercase">
                  Metode: {activeOrder.paymentMethod === 'qris' ? 'QRIS' : activeOrder.paymentMethod === 'transfer' ? 'Transfer Bank' : 'CASH/COD'}
                </span>
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
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 font-medium mb-3">
                    <span className="uppercase tracking-widest">Metode Pembayaran:</span>
                    <span className="font-bold text-neutral-800 uppercase px-2 py-0.5 bg-neutral-100 rounded-md">
                      {activeOrder.paymentMethod === 'qris' ? 'QRIS' : activeOrder.paymentMethod === 'cod' ? 'CASH/COD' : 'Transfer Bank'}
                    </span>
                  </div>

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
                  
                  <div className="border-t border-dashed border-[#FF6B00]/20 pt-3 flex justify-between items-center">
                    <span className="font-bold text-neutral-800 text-sm">Total Tagihan</span>
                    <span className="font-mono text-base font-black text-[#FF6B00]">
                      {formatIDR(activeOrder.total)}
                    </span>
                  </div>
                </div>

              {/* Action Finish Tracking */}
              {activeOrder.status === 'awaiting_payment' ? (
                <button
                  onClick={() => {
                    fetch(`http://localhost:5000/api/orders/${activeOrder.id}/status`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'pending' })
                    }).then(res => res.json()).then(data => {
                      if (data.message) {
                        setActiveOrder({ ...activeOrder, status: 'pending' });
                        triggerToast('Pembayaran berhasil dikonfirmasi. Menunggu admin...', 'success');
                      }
                    });
                  }}
                  className="w-full py-3.5 mt-2 bg-[#FF6B00] hover:bg-[#FF8A00] text-white rounded-xl text-xs font-black uppercase tracking-widest transition shadow-md shadow-[#FF6B00]/20 flex items-center justify-center gap-2"
                >
                  <Upload className="h-4.5 w-4.5" />
                  SAYA SUDAH BAYAR
                </button>
              ) : activeOrder.status === 'completed' ? (
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
            <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-15 hidden md:block select-none pointer-events-none transition-opacity duration-1000">
              <img 
                key={activeBanner.image}
                src={activeBanner.image} 
                alt="Banner" 
                className="w-full h-full object-cover rounded-l-3xl transition-all duration-1000 animate-in fade-in"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="relative z-10 max-w-xl transition-all duration-500">
              <span className="text-[10px] sm:text-xs font-bold text-orange-400 tracking-widest uppercase bg-orange-950/60 px-3 py-1.5 rounded-full border border-orange-900/40 inline-flex items-center gap-1.5 mb-4">
                <Sparkles className="h-3 w-3" />
                Dapur Kelezatan Tradisional
              </span>
              <h2 key={activeBanner.title} className="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mt-1 text-white whitespace-pre-line animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeBanner.title} <br />
                <span className="text-orange-500 bg-clip-text">{activeBanner.subtitle}</span>
              </h2>
              <p className="text-sm text-neutral-300 mt-4 leading-relaxed font-light">
                Pesan hidangan terbaik langsung diolah koki lokal berpengalaman. Nikmati layanan pengantaran kilat terintegrasi OpenStreetMap, atau ambil langsung di cabang andalan terdekat Anda.
              </p>

              {/* Carousel Indicators */}
              {banners.length > 1 && (
                <div className="flex gap-2 mt-6">
                  {banners.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setCurrentBannerIndex(idx)}
                      className={`h-1.5 rounded-full transition-all ${currentBannerIndex === idx ? 'w-8 bg-orange-500' : 'w-3 bg-neutral-600 hover:bg-neutral-500'}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}

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
                <p className="text-xs text-neutral-500 mt-1">Masakan lezat berkualitas disajikan hangat</p>
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
                      <span>{Number(item.rating).toFixed(1)}</span>
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
                        <div className="flex justify-between items-start">
                          <h4 className="font-display font-black text-sm text-neutral-900 leading-tight group-hover:text-[#FF6B00] transition-colors">
                            {item.name}
                          </h4>
                          <button 
                            onClick={() => setViewingReviewsFor({ menuId: item.id, menuName: item.name })}
                            className="text-[9px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 hover:bg-neutral-200 hover:text-neutral-800 shrink-0 ml-2"
                          >
                            Lihat Ulasan
                          </button>
                        </div>
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
                  <p className="text-xs text-neutral-400 px-4 mt-2">Pilih menu masakan lezat di sebelah kiri untuk ditambahkan.</p>
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


              {/* Store address display */}
              {selectedBranch && (
                <div className="mb-5 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3">
                  <div className="bg-orange-100 p-2 rounded-xl shrink-0">
                    <MapPin className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-1 block">Lokasi Restoran</span>
                    <h4 className="font-bold text-sm text-neutral-900">{selectedBranch.name}</h4>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed">{selectedBranch.address}</p>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedBranch.coords[0]},${selectedBranch.coords[1]}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] font-bold text-orange-600 hover:text-orange-700 mt-2 inline-flex items-center gap-1"
                    >
                      Buka di Google Maps
                    </a>
                  </div>
                </div>
              )}

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
                      readOnly={!!customerUser}
                      placeholder={customerUser ? '' : 'Silakan login untuk otomatis terisi'}
                      value={recipientName}
                      onChange={e => !customerUser && setRecipientName(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2 text-sm border rounded-xl focus:outline-none ${
                        customerUser 
                          ? 'bg-neutral-100 border-neutral-200 text-neutral-500 cursor-not-allowed' 
                          : 'bg-white border-neutral-200 focus:border-[#FF6B00]'
                      }`}
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
                          readOnly={!!customerUser}
                          placeholder={customerUser ? '' : 'Silakan login untuk otomatis terisi'}
                          value={recipientPhone}
                          onChange={e => !customerUser && setRecipientPhone(e.target.value)}
                          className={`w-full pl-9 pr-4 py-2 text-sm border rounded-xl focus:outline-none ${
                            customerUser 
                          ? 'bg-neutral-100 border-neutral-200 text-neutral-500 cursor-not-allowed' 
                          : 'bg-white border-neutral-200 focus:border-[#FF6B00]'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Delivery Form: OpenStreetMap Section */}
                    <div>
                      <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                        Pilih Lokasi Diantar Pada Peta (OpenStreetMap)
                      </label>
                      <p className="text-[10px] text-neutral-400 mb-2 leading-relaxed">
                        Cari alamat atau ketuk pin lokasi Anda pada peta di bawah ini. Kami akan mengukur jarak pengiriman dari Cabang terpilih secara akurat.
                      </p>

                      <div className="h-80 w-full mb-3" style={{ position: 'relative', zIndex: 10 }}>
                        {selectedBranch && (
                          <OSMMap
                            branchCoords={selectedBranch.coords}
                            branchName={selectedBranch.name}
                            deliveryCoords={deliveryCoords}
                            onSelectCoords={handleSelectCoordsOnMap}
                          />
                        )}
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
                      {selectedBranch && (
                        <>
                          <p className="text-[11px] font-bold text-neutral-700 leading-relaxed">
                            {selectedBranch.name}
                          </p>
                          <p className="text-[10px] leading-relaxed text-neutral-400">
                            {selectedBranch.address}
                          </p>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* -------------------- PAYMENT METHOD SELECTION -------------------- */}
                <div className="pt-2">
                  <label className="block text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-2">
                    Pilih Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transfer')}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                        paymentMethod === 'transfer' 
                          ? 'border-[#FF6B00] bg-[#FF6B00]/5' 
                          : 'border-neutral-200 bg-white hover:border-[#FF6B00]/50'
                      }`}
                    >
                      <CreditCard className={`h-6 w-6 mb-2 ${paymentMethod === 'transfer' ? 'text-[#FF6B00]' : 'text-neutral-400'}`} />
                      <span className={`text-[11px] font-bold ${paymentMethod === 'transfer' ? 'text-[#FF6B00]' : 'text-neutral-600'}`}>Transfer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('qris')}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                        paymentMethod === 'qris' 
                          ? 'border-[#FF6B00] bg-[#FF6B00]/5' 
                          : 'border-neutral-200 bg-white hover:border-[#FF6B00]/50'
                      }`}
                    >
                      <QrCode className={`h-6 w-6 mb-2 ${paymentMethod === 'qris' ? 'text-[#FF6B00]' : 'text-neutral-400'}`} />
                      <span className={`text-[11px] font-bold ${paymentMethod === 'qris' ? 'text-[#FF6B00]' : 'text-neutral-600'}`}>QRIS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                        paymentMethod === 'cod' 
                          ? 'border-[#FF6B00] bg-[#FF6B00]/5' 
                          : 'border-neutral-200 bg-white hover:border-[#FF6B00]/50'
                      }`}
                    >
                      <Wallet className={`h-6 w-6 mb-2 ${paymentMethod === 'cod' ? 'text-[#FF6B00]' : 'text-neutral-400'}`} />
                      <span className={`text-[11px] font-bold ${paymentMethod === 'cod' ? 'text-[#FF6B00]' : 'text-neutral-600'}`}>CASH / COD</span>
                    </button>
                  </div>

                  {/* Payment Instructions & Confirmation */}
                  {paymentMethod !== 'cod' && (
                    <div className="mt-4 p-4 border border-[#FF6B00]/20 bg-[#FF6B00]/5 rounded-2xl space-y-4">
                      
                      {(paymentMethod === 'qris' || (paymentMethod === 'transfer' && selectedBank !== '')) && !paymentProofUrl && (
                        <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-center shadow-sm">
                          <div className="flex items-center justify-center gap-2 text-red-600 font-bold mb-1">
                            <Timer className="w-5 h-5 animate-pulse" />
                            <span className="text-lg">
                              {Math.floor(paymentTimeLeft / 60)}:{(paymentTimeLeft % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                          <p className="text-[10px] text-red-500 uppercase tracking-widest font-black">Sisa Waktu Pembayaran</p>
                        </div>
                      )}

                      {paymentMethod === 'transfer' && (
                        <div className="text-center space-y-3 bg-white p-4 rounded-xl border border-orange-100">
                          <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest">Pilih Bank / E-Wallet Tujuan</p>
                          <select 
                            value={selectedBank} 
                            onChange={(e) => {
                              setSelectedBank(e.target.value);
                              setPaymentTimeLeft(300); // Reset timer when switching banks
                            }}
                            className="w-full max-w-xs mx-auto block p-2.5 text-sm border border-neutral-200 rounded-lg outline-none focus:border-orange-500 bg-neutral-50 font-semibold text-neutral-800"
                          >
                            <option value="" disabled>-- Pilih Bank / E-Wallet Tujuan --</option>
                            {transferMethods.map(method => (
                              <option key={method.id} value={method.id}>{method.name}</option>
                            ))}
                          </select>

                          {transferMethods.map(method => method.id === selectedBank && (
                            <div key={method.id} className="pt-2 animate-fade-in space-y-1">
                              <p className="font-mono text-lg font-black text-neutral-800">{method.account}</p>
                              <p className="text-[11px] text-neutral-600 font-semibold">a.n {method.owner}</p>
                            </div>
                          ))}

                          <p className="text-xs mt-2 pt-2 border-t border-dashed border-orange-100 font-medium text-neutral-500">
                            Total Tagihan: <span className="font-bold text-[#FF6B00]">{formatIDR(grandTotal)}</span>
                          </p>
                        </div>
                      )}

                      {paymentMethod === 'qris' && (
                        <div className="text-center space-y-3 bg-white p-4 rounded-xl border border-neutral-200">
                          <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest">Scan QRIS Berikut</p>
                          <div className="flex justify-center">
                            <img 
                              src="/qris.jpg" 
                              alt="QRIS Lesehan Kriwil 354" 
                              className="w-48 h-auto rounded-lg shadow-sm border border-neutral-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                e.currentTarget.parentElement?.querySelector('svg')?.classList.remove('hidden');
                              }}
                            />
                            <QrCode className="h-16 w-16 text-neutral-800 hidden" />
                          </div>
                          <p className="text-[11px] text-neutral-600 font-medium px-2">
                            Total Tagihan: <span className="font-bold text-[#FF6B00]">{formatIDR(grandTotal)}</span>
                          </p>
                        </div>
                      )}

                      {(paymentMethod === 'qris' || (paymentMethod === 'transfer' && selectedBank !== '')) && (
                        <div className="pt-2 animate-fade-in">
                          <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-widest mb-2">
                            Unggah Bukti Pembayaran
                          </label>
                          <div className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                            paymentProofUrl ? 'border-[#FF6B00] bg-white' : 'border-neutral-300 bg-white hover:border-[#FF6B00]/50 hover:bg-[#FF6B00]/5 cursor-pointer'
                          }`}>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handlePaymentProofUpload}
                              disabled={isUploading}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            {isUploading ? (
                              <div className="flex flex-col items-center gap-2 py-4">
                                <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs font-bold text-neutral-600">Mengunggah...</span>
                              </div>
                            ) : paymentProofUrl ? (
                              <div className="flex flex-col items-center gap-2">
                                <img src={paymentProofUrl} alt="Bukti Pembayaran" className="h-24 w-auto rounded-lg shadow-sm border border-neutral-200" />
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Bukti Berhasil Diunggah
                                </div>
                                <span className="text-[9px] text-neutral-400 underline">Ketuk untuk mengganti foto</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2 pointer-events-none">
                                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                  <Upload className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-neutral-700">Pilih Foto / Ambil Gambar</p>
                                <p className="text-[10px] text-neutral-400 max-w-[200px]">Format: JPG, PNG (Max 2MB)</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-dashed border-neutral-200">    </div>


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

                  <div className="border-t border-dashed border-neutral-200 pt-3 flex justify-between items-center">
                    <span className="font-bold text-neutral-800 text-sm">Total Pembayaran</span>
                    <span className="font-mono text-lg font-black text-[#FF6B00]">
                      {formatIDR(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Main Submit Place Order Button */}
                {!customerUser ? (
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full py-3.5 rounded-2xl text-xs font-black shadow-md transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer bg-neutral-900 text-white hover:bg-neutral-800"
                  >
                    <User className="h-4.5 w-4.5" />
                    <span>LOGIN UNTUK MEMESAN</span>
                  </button>
                ) : (
                  <button
                    id="submit-order-checkout-btn"
                    type="submit"
                    className={`w-full py-3.5 rounded-2xl text-xs font-black shadow-md transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                      cart.length > 0 && (orderMethod === 'pickup' || deliveryCoords) && (paymentMethod === 'cod' || paymentProofUrl) && !isUploading
                        ? 'bg-[#FF6B00] hover:brightness-105 text-white shadow-[#FF6B00]/25' 
                        : 'bg-neutral-100 border border-neutral-250 text-neutral-400 shadow-none cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag className="h-4.5 w-4.5" />
                    <span>{paymentMethod === 'cod' ? `PESAN SEKARANG (${formatIDR(grandTotal)})` : `KIRIM BUKTI & PESAN (${formatIDR(grandTotal)})`}</span>
                  </button>
                )}

              </form>

            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-neutral-950 text-neutral-400 mt-20 border-t border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white">
                <div className="h-7 w-7 rounded-lg bg-[#FF6B00] flex items-center justify-center text-white text-xs">
                  <UtensilsCrossed className="h-4 w-4" />
                </div>
                <span className="font-display font-extrabold text-base tracking-tight">Lesehan Kriwil 354</span>
              </div>
              <p className="text-xs font-light leading-relaxed max-w-xs">
                Nikmati lesehan nikmat dengan cita rasa khas Jawa. Pesan sekarang, santap dengan nyaman.
              </p>
            </div>

            {/* Navigasi */}
            <div className="space-y-3">
              <h4 className="text-white font-display font-bold text-xs uppercase tracking-wider">Navigasi</h4>
              <ul className="space-y-2 text-xs">
                <li className="hover:text-white transition cursor-pointer">Menu</li>
                <li className="hover:text-white transition cursor-pointer">Cabang</li>
                <li className="hover:text-white transition cursor-pointer">Pesanan Saya</li>
                <li className="hover:text-white transition cursor-pointer">Masuk / Daftar</li>
              </ul>
            </div>

            {/* Kontak */}
            <div className="space-y-3">
              <h4 className="text-white font-display font-bold text-xs uppercase tracking-wider">Kontak</h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-[#FF6B00]" />
                  <span>0812-3456-7890</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-[#FF6B00]" />
                  <span>Jl. Contoh No. 354, Yogyakarta</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-[#FF6B00]" />
                  <span>Setiap Hari, 16:00 - 23:00</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-neutral-900 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
            <p className="text-[11px] font-light">
              © {new Date().getFullYear()} Lesehan Kriwil 354. Hak Cipta Dilindungi.
            </p>
            <p className="text-[10px] text-neutral-600 font-semibold uppercase tracking-wider">
              OpenStreetMap & Leaflet Maps
            </p>
          </div>
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
                          <div key={iIdx} className="flex justify-between items-center text-neutral-600">
                            <div className="flex gap-2">
                              <span>{it.menuItem.name}</span>
                              <span className="font-bold">x {it.quantity}</span>
                            </div>
                            {order.status === 'completed' && customerUser && (
                              <button 
                                onClick={() => {
                                  setReviewingItem({ menuId: it.menuItem.id, menuName: it.menuItem.name });
                                  setShowHistoryModal(false);
                                }}
                                className="text-[9px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200 hover:bg-yellow-100"
                              >
                                Beri Ulasan
                              </button>
                            )}
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
                  {customerUser ? 'Seluruh riwayat pesanan Anda tersimpan dengan aman di akun ini.' : 'Masuk (Login) untuk menyimpan riwayat pesanan secara permanen.'}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- REVIEW MODAL -------------------- */}
      <AnimatePresence>
        {reviewingItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewingItem(null)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-neutral-100 shadow-2xl relative z-10 w-full max-w-sm p-6 space-y-5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-neutral-900 leading-tight">Ulas Makanan</h3>
                  <p className="text-sm font-medium text-neutral-500 mt-1">{reviewingItem.menuName}</p>
                </div>
                <button
                  onClick={() => setReviewingItem(null)}
                  className="p-1.5 bg-neutral-100 text-neutral-400 rounded-full hover:text-neutral-800 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star className={`h-10 w-10 transition-colors ${star <= reviewRating ? 'fill-yellow-400 text-yellow-400 drop-shadow-md' : 'text-neutral-200 fill-neutral-50'}`} />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-2">Komentar / Pengalaman (Opsional)</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Bagaimana rasanya? Bumbunya pas?"
                  rows={3}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm resize-none"
                />
              </div>

              <button
                onClick={submitReview}
                disabled={isSubmittingReview}
                className="w-full bg-[#FF6B00] text-white font-bold py-3.5 rounded-xl shadow-[0_8px_20px_-6px_rgba(255,107,0,0.5)] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {isSubmittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- VIEW REVIEWS MODAL -------------------- */}
      <AnimatePresence>
        {viewingReviewsFor && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingReviewsFor(null)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-neutral-100 shadow-2xl relative z-10 w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-extrabold text-base text-neutral-900">Ulasan Pelanggan</h3>
                  <p className="text-xs font-medium text-neutral-500 mt-0.5">{viewingReviewsFor.menuName}</p>
                </div>
                <button
                  onClick={() => setViewingReviewsFor(null)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 divide-y divide-neutral-100">
                {isLoadingReviews ? (
                  <div className="py-10 text-center text-sm font-bold text-neutral-400 animate-pulse">
                    Memuat ulasan...
                  </div>
                ) : menuReviews.length === 0 ? (
                  <div className="text-center py-10">
                    <Star className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
                    <p className="text-sm font-bold text-neutral-600">Belum Ada Ulasan</p>
                    <p className="text-xs text-neutral-400 mt-1">Jadilah yang pertama mencoba dan menilai menu ini!</p>
                  </div>
                ) : (
                  menuReviews.map((review, idx) => (
                    <div key={idx} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-sm text-neutral-800">{review.customer_name || 'Pelanggan anonim'}</h4>
                          <span className="text-[10px] text-neutral-400 font-medium">{new Date(review.created_at).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-100">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-bold text-yellow-700">{review.rating}</span>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-600 italic leading-relaxed">
                        {review.comment ? `"${review.comment}"` : <span className="text-neutral-400 font-light">(Hanya memberikan bintang tanpa komentar)</span>}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

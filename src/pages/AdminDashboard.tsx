import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, CheckCircle2, UtensilsCrossed, Bike, Clock, LogOut, Plus, Image, ListOrdered, Settings, Pencil, Trash2, BarChart3, Users, FileText, MessageSquare, Star, Bell, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface OrderItem {
  quantity: number;
  menuItem: {
    name: string;
    price: number;
  };
}

interface Order {
  id: string;
  timestamp: string;
  method: 'pickup' | 'delivery';
  subtotal: number;
  deliveryFee: number;
  total: number;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  distanceKm: number;
  pickupTime: string;
  status: 'awaiting_payment' | 'pending' | 'preparing' | 'dispatched' | 'completed';
  tax?: number;
  branch?: {
    name: string;
    phone: string;
    address: string;
  };
  items: OrderItem[];
  paymentProof?: string;
  deliveryProof?: string;
  paymentMethod?: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'makanan' | 'minuman' | 'camilan';
  rating: number;
  image: string;
  isPopular?: boolean;
}

const RINGTONES = [
  { id: 'voice1', name: 'Suara Google (Ada Orderan Baru)', url: '/orderan_baru.mp3' },
  { id: 'bell', name: 'Bell Ring', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  { id: 'beep', name: 'Short Beep', url: 'https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3' },
  { id: 'chime', name: 'Chime Notification', url: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3' },
];

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'banner' | 'reports' | 'charts' | 'users' | 'reviews'>('orders');
  
  const [adminUser, setAdminUser] = useState<{id: string, username: string, role: string} | null>(null);
  const latestOrderIdRef = useRef<string | null>(null);
  
  // Reports & Users State
  const [reportPeriod, setReportPeriod] = useState<'semua' | 'harian' | 'mingguan' | 'bulanan'>('semua');
  const [reportsData, setReportsData] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', role: 'admin' });
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [newOrderPopup, setNewOrderPopup] = useState<Order | null>(null);
  const navigate = useNavigate();

  // Menu State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);

  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'makanan',
    image: '',
    rating: '5.0',
    isPopular: false
  });

  // Banner State
  interface Banner {
    id: string;
    title: string;
    subtitle: string;
    image: string;
    isActive?: boolean;
  }
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    image: '',
    isActive: true
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setUploadingImage(false);
      if (data.success) return data.url;
      alert('Gagal upload gambar');
      return null;
    } catch (err) {
      console.error(err);
      setUploadingImage(false);
      alert('Error saat upload gambar');
      return null;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      });
      if (res.ok) {
        alert('User berhasil ditambahkan');
        setNewUserForm({ username: '', password: '', role: 'admin' });
        // Refresh users
        handleRefresh();
      } else {
        alert('Gagal menambahkan user');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan');
    }
  };

  const filteredReportOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(order => {
      if (reportPeriod === 'semua') return true;
      const orderDate = new Date(order.timestamp);
      if (reportPeriod === 'harian') {
        return orderDate.toDateString() === now.toDateString();
      }
      if (reportPeriod === 'mingguan') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return orderDate >= sevenDaysAgo;
      }
      if (reportPeriod === 'bulanan') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [orders, reportPeriod]);

  const totalReportRevenue = useMemo(() => {
    return filteredReportOrders.reduce((sum, order) => sum + order.total, 0);
  }, [filteredReportOrders]);

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus user ini?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsersList(prev => prev.filter(u => u.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus user');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const userStr = localStorage.getItem('adminUser');
    if (!token) {
      navigate('/admin/login');
    } else if (userStr) {
      try {
        setAdminUser(JSON.parse(userStr));
      } catch(e) {}
    } else {
      // fallback
      setAdminUser({ id: 'admin', username: 'admin', role: 'admin' });
    }
  }, [navigate]);

  const fetchBanners = () => {
    fetch('http://localhost:5000/api/banners')
      .then(res => res.json())
      .then(data => setBanners(data))
      .catch(console.error);
  };

  useEffect(() => {
    // We fetch banners when the tab is active instead of on mount
  }, []);

  const fetchOrders = () => {
    setLoading(true);
    fetch('http://localhost:5000/api/orders')
      .then(res => res.json())
      .then((data: Order[]) => {
        if (data && data.length > 0) {
          const newLatestId = data[0].id;
          if (latestOrderIdRef.current && latestOrderIdRef.current !== newLatestId) {
            const ringtoneUrl = localStorage.getItem('adminRingtone') || RINGTONES[0].url;
            const audio = new Audio(ringtoneUrl);
            audio.play().catch(e => console.error('Audio play failed:', e));
            setNewOrderPopup(data[0]);
            setTimeout(() => setNewOrderPopup(null), 10000);
          }
          latestOrderIdRef.current = newLatestId;
        }
        setOrders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const fetchMenu = () => {
    fetch('http://localhost:5000/api/menu')
      .then(res => res.json())
      .then(data => setMenuItems(data))
      .catch(console.error);
  };

  const handleRefresh = () => {
    if (activeTab === 'orders' || activeTab === 'reports') {
      fetchOrders();
    } else if (activeTab === 'menu') {
      fetchMenu();
    } else if (activeTab === 'banner') {
      fetchBanners();
    } else if (activeTab === 'charts') {
      fetch('http://localhost:5000/api/reports/sales')
        .then(res => res.json())
        .then(data => setReportsData(data))
        .catch(console.error);
    } else if (activeTab === 'users') {
      fetch('http://localhost:5000/api/users')
        .then(res => res.json())
        .then(data => setUsersList(data))
        .catch(console.error);
    } else if (activeTab === 'reviews') {
      fetch('http://localhost:5000/api/reviews')
        .then(res => res.json())
        .then(data => setReviewsList(data))
        .catch(console.error);
    }
  };

  useEffect(() => {
    handleRefresh();
    if (activeTab === 'orders' || activeTab === 'reports') {
      const interval = setInterval(fetchOrders, 10000); // refresh every 10s
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const updateStatus = (orderId: string, newStatus: string) => {
    fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
      .then(res => res.json())
      .then(() => fetchOrders())
      .catch(err => console.error(err));
  };

  const printReceipt = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      alert('Browser memblokir pop-up untuk cetak struk.');
      return;
    }
    
    const html = `
      <html>
        <head>
          <title>Struk Pesanan ${order.id}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: monospace; 
              padding: 10px; 
              width: 300px;
              margin: 0 auto;
              color: black;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
            .flex-between { display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; }
            td { vertical-align: top; padding-bottom: 3px; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 1.2em; margin-bottom: 5px;">LESEHAN KRIWIL 354</div>
          <div class="center" style="font-size: 0.9em; margin-bottom: 10px;">
            ${order.branch?.name || 'Cabang Utama'}<br>
            ${order.branch?.phone || ''}
          </div>
          
          <div class="divider"></div>
          
          <div style="font-size: 0.9em;">
            <div class="flex-between"><span>No:</span><span>${order.id}</span></div>
            <div class="flex-between"><span>Tgl:</span><span>${new Date(order.timestamp).toLocaleString('id-ID')}</span></div>
            <div class="flex-between"><span>Pelanggan:</span><span>${order.recipientName}</span></div>
            <div class="flex-between"><span>Tipe:</span><span style="text-transform: uppercase;">${order.method}</span></div>
          </div>
          
          <div class="divider"></div>
          
          <table style="font-size: 0.9em;">
            ${order.items.map(it => `
              <tr>
                <td colspan="2">${it.menuItem.name}</td>
              </tr>
              <tr>
                <td>${it.quantity}x ${new Intl.NumberFormat('id-ID').format(it.menuItem.price)}</td>
                <td class="right">${new Intl.NumberFormat('id-ID').format(it.quantity * it.menuItem.price)}</td>
              </tr>
            `).join('')}
          </table>
          
          <div class="divider"></div>
          
          <div style="font-size: 0.9em;">
            <div class="flex-between"><span>Subtotal:</span><span>${new Intl.NumberFormat('id-ID').format(order.subtotal)}</span></div>
            ${order.tax ? `<div class="flex-between"><span>Pajak:</span><span>${new Intl.NumberFormat('id-ID').format(order.tax)}</span></div>` : ''}
            ${order.method === 'delivery' ? `<div class="flex-between"><span>Ongkir:</span><span>${new Intl.NumberFormat('id-ID').format(order.deliveryFee)}</span></div>` : ''}
          </div>
          
          <div class="divider"></div>
          
          <div class="flex-between bold" style="font-size: 1.1em;">
            <span>TOTAL:</span>
            <span>Rp ${new Intl.NumberFormat('id-ID').format(order.total)}</span>
          </div>
          <div class="flex-between" style="font-size: 0.9em; margin-top: 5px;">
            <span>Pembayaran:</span>
            <span style="text-transform: uppercase;">${order.paymentMethod || '-'}</span>
          </div>
          
          <div class="divider"></div>
          
          <div class="center" style="font-size: 0.85em; margin-top: 15px;">
            Terima kasih atas pesanan Anda!<br>
            Mohon simpan struk ini sebagai bukti.
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleMenuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingMenuId ? `http://localhost:5000/api/menu/${editingMenuId}` : 'http://localhost:5000/api/menu';
    const method = editingMenuId ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingMenuId || 'menu-' + Date.now(),
        name: menuForm.name,
        description: menuForm.description,
        price: Number(menuForm.price),
        category: menuForm.category,
        rating: Number(menuForm.rating),
        image: menuForm.image,
        isPopular: menuForm.isPopular
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(editingMenuId ? 'Menu berhasil diupdate!' : 'Menu berhasil ditambahkan!');
        setMenuForm({ name: '', description: '', price: '', category: 'makanan', image: '', rating: '5.0', isPopular: false });
        setEditingMenuId(null);
        fetchMenu();
      } else {
        alert(data.error || 'Gagal menyimpan menu');
      }
    })
    .catch(err => alert('Gagal menyimpan menu'));
  };

  const handleEditMenu = (menu: MenuItem) => {
    setEditingMenuId(menu.id);
    setMenuForm({
      name: menu.name,
      description: menu.description,
      price: menu.price.toString(),
      category: menu.category,
      image: menu.image,
      rating: menu.rating.toString(),
      isPopular: menu.isPopular || false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteMenu = (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus menu ini? (Pesanan lama yang memuat menu ini mungkin akan terpengaruh)')) return;
    
    fetch(`http://localhost:5000/api/menu/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Menu berhasil dihapus!');
          fetchMenu();
        } else {
          alert('Gagal menghapus menu');
        }
      })
      .catch(err => alert('Gagal menghapus menu'));
  };

  const handleBannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingBannerId ? `http://localhost:5000/api/banners/${editingBannerId}` : 'http://localhost:5000/api/banners';
    const method = editingBannerId ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingBannerId || 'banner-' + Date.now(),
        ...bannerForm
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(editingBannerId ? 'Banner berhasil diupdate!' : 'Banner berhasil ditambahkan!');
        setBannerForm({ title: '', subtitle: '', image: '', isActive: true });
        setEditingBannerId(null);
        fetchBanners();
      } else {
        alert(data.error || 'Gagal menyimpan banner');
      }
    })
    .catch(err => alert('Gagal menyimpan banner'));
  };

  const handleEditBanner = (b: Banner) => {
    setEditingBannerId(b.id);
    setBannerForm({
      title: b.title,
      subtitle: b.subtitle,
      image: b.image,
      isActive: b.isActive !== undefined ? b.isActive : true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteBanner = (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus banner ini?')) return;
    
    fetch(`http://localhost:5000/api/banners/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Banner berhasil dihapus!');
          fetchBanners();
        } else {
          alert('Gagal menghapus banner');
        }
      })
      .catch(err => alert('Gagal menghapus banner'));
  };

  const formatIDR = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
          <div>
            <h1 className="text-3xl font-display font-extrabold flex items-center gap-2">
              <UtensilsCrossed className="text-orange-600" />
              <span>Admin Dashboard</span>
            </h1>
            <p className="text-neutral-500 mt-1">Kelola pesanan pelanggan Lesehan Kriwil 354</p>
          </div>
          <div className="flex gap-3 items-center">
            {activeTab === 'orders' && (
              <>
                <select 
                  className="bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer focus:ring-2 focus:ring-orange-500"
                  value={localStorage.getItem('adminRingtone') || RINGTONES[0].url}
                  onChange={(e) => {
                    const url = e.target.value;
                    localStorage.setItem('adminRingtone', url);
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
                    const ringtoneUrl = localStorage.getItem('adminRingtone') || RINGTONES[0].url;
                    const audio = new Audio(ringtoneUrl);
                    audio.play().catch(e => alert('Gagal memutar suara: ' + e.message));
                    setNewOrderPopup({
                      id: 'TEST-' + Math.floor(Math.random() * 10000),
                      recipientName: 'Pelanggan Uji Coba',
                      method: 'delivery',
                      status: 'pending',
                      timestamp: new Date().toISOString(),
                      subtotal: 0,
                      deliveryFee: 0,
                      total: 0,
                      recipientPhone: '081234567890',
                      deliveryAddress: 'Jl. Tes No. 1',
                      distanceKm: 1,
                      pickupTime: '',
                      items: []
                    } as Order);
                    setTimeout(() => setNewOrderPopup(null), 10000);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 border border-orange-100 rounded-lg shadow-sm hover:bg-orange-100 transition font-medium text-sm"
                  title="Klik ini untuk mengizinkan browser memutar suara otomatis dan melihat popup"
                >
                  <Bell className="h-4 w-4" />
                  Test Suara & Popup
                </button>
              </>
            )}
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg shadow-sm hover:bg-neutral-50 transition font-medium text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg shadow-sm hover:bg-red-100 transition font-medium text-sm"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        {/* TABS NAVIGATION */}
        <div className="flex gap-2 mb-8 bg-white p-2 rounded-2xl border border-neutral-100 shadow-sm w-fit flex-wrap print:hidden">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'orders' ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'}`}
          >
            <ListOrdered className="h-4 w-4" /> Pesanan
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'menu' ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'}`}
          >
            <UtensilsCrossed className="h-4 w-4" /> Kelola Menu
          </button>
          <button 
            onClick={() => setActiveTab('banner')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'banner' ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'}`}
          >
            <Image className="h-4 w-4" /> Kelola Banner
          </button>
          
          <button 
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'reports' ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'}`}
          >
            <FileText className="h-4 w-4" /> Laporan Keseluruhan
          </button>

          <button 
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'reviews' ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'}`}
          >
            <MessageSquare className="h-4 w-4" /> Ulasan Pelanggan
          </button>

          {adminUser?.role === 'owner' && (
            <>
              <button 
                onClick={() => setActiveTab('charts')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'charts' ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'}`}
              >
                <BarChart3 className="h-4 w-4" /> Grafik Penjualan
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'users' ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'}`}
              >
                <Users className="h-4 w-4" /> Manajemen Admin
              </button>
            </>
          )}
        </div>

        {/* CONTENT AREA */}
        
        {/* TAB 1: ORDERS */}
        {activeTab === 'orders' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map(order => (
              <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex flex-col">
                <div className="flex justify-between items-start mb-3 border-b border-neutral-50 pb-3">
                  <div>
                    <h3 className="font-bold text-lg">{order.id}</h3>
                    <span className="text-xs text-neutral-400">{new Date(order.timestamp).toLocaleString('id-ID')}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'preparing' ? 'bg-orange-100 text-orange-700' :
                    order.status === 'awaiting_payment' ? 'bg-red-100 text-red-600' :
                    'bg-neutral-100 text-neutral-600'
                  }`}>
                    {order.status === 'awaiting_payment' ? 'Menunggu Pembayaran' : order.status}
                  </span>
                </div>

                <div className="text-sm space-y-1 mb-4 flex-1">
                  <p><strong>Customer:</strong> {order.recipientName}</p>
                  <p><strong>Method:</strong> {order.method.toUpperCase()} {order.method === 'delivery' ? `(${order.distanceKm} km)` : `(${order.pickupTime})`}</p>
                  {order.method === 'delivery' && (
                    <p className="text-xs text-neutral-500 line-clamp-2"><strong>Address:</strong> {order.deliveryAddress}</p>
                  )}
                  
                  <div className="mt-3 bg-neutral-50 p-2 rounded-lg text-xs">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-neutral-600">
                        <span>{it.quantity}x {it.menuItem.name}</span>
                      </div>
                    ))}
                    <div className="border-t border-neutral-200 mt-2 pt-2 flex justify-between font-bold text-neutral-800">
                      <span>Total:</span>
                      <span>{formatIDR(order.total)}</span>
                    </div>
                  </div>

                  {order.paymentProof && (
                    <button 
                      onClick={() => setSelectedProof(order.paymentProof!)}
                      className="mt-3 flex items-center justify-center w-full gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition border border-emerald-200"
                    >
                      <Image className="w-4 h-4" /> Lihat Bukti Pembayaran
                    </button>
                  )}

                  {order.deliveryProof && (
                    <button 
                      onClick={() => setSelectedProof(order.deliveryProof!)}
                      className="mt-2 flex items-center justify-center w-full gap-2 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition border border-blue-200"
                    >
                      <Image className="w-4 h-4" /> Lihat Bukti Pengiriman
                    </button>
                  )}
                </div>

                {/* Status control buttons */}
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <button 
                    onClick={() => updateStatus(order.id, 'preparing')}
                    disabled={order.status === 'awaiting_payment' || order.status === 'preparing' || order.status === 'completed' || order.status === 'dispatched'}
                    className="px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold rounded-lg transition"
                  >
                    Proses Dapur
                  </button>
                  <button 
                    onClick={() => updateStatus(order.id, 'dispatched')}
                    disabled={order.status === 'awaiting_payment' || order.status === 'dispatched' || order.status === 'completed'}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold rounded-lg transition flex justify-center items-center gap-1"
                  >
                    <Bike className="w-3 h-3"/> Kirim/Siap
                  </button>
                  <button 
                    onClick={() => updateStatus(order.id, 'completed')}
                    disabled={order.status === 'awaiting_payment' || order.status === 'completed'}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold rounded-lg transition col-span-2 flex justify-center items-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4"/> Selesai
                  </button>
                  <button 
                    onClick={() => printReceipt(order)}
                    className="px-3 py-1.5 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 text-xs font-bold rounded-lg transition col-span-2 flex justify-center items-center gap-1 mt-1"
                  >
                    <FileText className="w-4 h-4"/> Cetak Struk
                  </button>
                </div>
              </div>
            ))}

            {orders.length === 0 && !loading && (
              <div className="col-span-full py-12 text-center text-neutral-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Belum ada pesanan masuk.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KELOLA MENU */}
        {activeTab === 'menu' && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm max-w-2xl">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <UtensilsCrossed className="text-orange-600" /> 
                {editingMenuId ? 'Edit Menu' : 'Tambah Menu Baru'}
              </h2>
              <form onSubmit={handleMenuSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Nama Menu</label>
                  <input required type="text" value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} className="w-full p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Cth: Nasi Goreng Spesial" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2">Deskripsi</label>
                  <textarea required value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})} className="w-full p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Cth: Menu dengan rempah pilihan..." rows={3}></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Harga (Rp)</label>
                    <input required type="number" value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})} className="w-full p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="35000" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Kategori</label>
                    <select required value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})} className="w-full p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                      <option value="makanan">Makanan</option>
                      <option value="minuman">Minuman</option>
                      <option value="camilan">Camilan</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Gambar Menu</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const url = await uploadImage(e.target.files[0]);
                        if (url) setMenuForm({...menuForm, image: url});
                      }
                    }} 
                    className="w-full p-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" 
                  />
                  {uploadingImage && <p className="text-xs text-orange-600 mt-2 font-bold animate-pulse">Mengupload gambar...</p>}
                  {menuForm.image && !uploadingImage && (
                    <div className="mt-3">
                      <img src={menuForm.image} alt="Preview" className="w-32 h-32 object-cover rounded-xl border border-neutral-200 shadow-sm" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <div>
                    <h4 className="font-bold text-orange-900 text-sm">Tandai Menu Spesial/Terlaris</h4>
                    <p className="text-xs text-orange-700 mt-1">Menu ini akan memiliki badge "Terlaris 🔥" di toko.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={menuForm.isPopular} onChange={e => setMenuForm({...menuForm, isPopular: e.target.checked})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                <button type="submit" className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition shadow-md">
                  {editingMenuId ? 'Update Menu' : 'Simpan Menu Baru'}
                </button>
                {editingMenuId && (
                  <button type="button" onClick={() => { setEditingMenuId(null); setMenuForm({ name: '', description: '', price: '', category: 'makanan', image: '', rating: '5.0', isPopular: false }); }} className="w-full py-3 mt-3 text-neutral-500 hover:bg-neutral-100 rounded-xl font-bold transition">Batal Edit</button>
                )}
              </form>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
              <h2 className="text-xl font-bold mb-6">Daftar Menu Saat Ini</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {menuItems.map(menu => (
                  <div key={menu.id} className="border border-neutral-100 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    <img src={menu.image} alt={menu.name} className="w-full h-32 object-cover" />
                    <div className="p-4 flex flex-col flex-1">
                      <h4 className="font-bold text-sm line-clamp-2 mb-1">{menu.name}</h4>
                      <p className="text-xs text-neutral-500 capitalize mb-2">{menu.category}</p>
                      <p className="text-sm font-bold text-orange-600 mb-4">{formatIDR(menu.price)}</p>
                      
                      <div className="mt-auto grid grid-cols-2 gap-2">
                        <button onClick={() => handleEditMenu(menu)} className="flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => handleDeleteMenu(menu.id)} className="flex items-center justify-center gap-1.5 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition">
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {menuItems.length === 0 && (
                  <p className="text-neutral-400 col-span-full py-8 text-center">Belum ada menu.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BANNER */}
        {activeTab === 'banner' && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm max-w-2xl">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Settings className="text-orange-600" /> {editingBannerId ? 'Edit Banner' : 'Tambah Banner Baru'}</h2>
              <form onSubmit={handleBannerSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Judul Banner (Teks Putih Besar)</label>
                  <input required type="text" value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} className="w-full p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Cth: Sajian Autentik" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2">Sub-Judul (Teks Orange)</label>
                  <input required type="text" value={bannerForm.subtitle} onChange={e => setBannerForm({...bannerForm, subtitle: e.target.value})} className="w-full p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Cth: Lesehan Kriwil 354" />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Gambar Latar Belakang</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const url = await uploadImage(e.target.files[0]);
                        if (url) setBannerForm({...bannerForm, image: url});
                      }
                    }} 
                    className="w-full p-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" 
                  />
                  {uploadingImage && <p className="text-xs text-orange-600 mt-2 font-bold animate-pulse">Mengupload gambar...</p>}
                </div>
                
                {bannerForm.image && (
                  <div className="mt-4 border border-neutral-200 rounded-xl overflow-hidden aspect-video relative">
                    <img src={bannerForm.image} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-neutral-900/60 flex flex-col justify-center items-center p-4">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-white text-center font-display">{bannerForm.title}</h2>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-orange-500 text-center font-display">{bannerForm.subtitle}</h2>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div>
                    <h4 className="font-bold text-emerald-900 text-sm">Status Banner</h4>
                    <p className="text-xs text-emerald-700 mt-1">Hanya banner aktif yang akan ditampilkan di halaman pelanggan.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={bannerForm.isActive} onChange={e => setBannerForm({...bannerForm, isActive: e.target.checked})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <button type="submit" className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition shadow-md">
                  {editingBannerId ? 'Update Banner' : 'Simpan Banner Baru'}
                </button>
                {editingBannerId && (
                  <button type="button" onClick={() => { setEditingBannerId(null); setBannerForm({ title: '', subtitle: '', image: '', isActive: true }); }} className="w-full py-3 mt-3 text-neutral-500 hover:bg-neutral-100 rounded-xl font-bold transition">Batal Edit</button>
                )}
              </form>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
              <h2 className="text-xl font-bold mb-6">Daftar Banner Saat Ini</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banners.map(b => (
                  <div key={b.id} className={`border ${b.isActive ? 'border-orange-200' : 'border-neutral-200 opacity-70'} rounded-2xl overflow-hidden shadow-sm flex flex-col relative`}>
                    <img src={b.image} alt={b.title} className="w-full aspect-video object-cover" />
                    <div className="absolute inset-0 top-0 bottom-auto bg-gradient-to-b from-black/60 to-transparent p-4 flex justify-between items-start">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${b.isActive ? 'bg-emerald-500 text-white' : 'bg-neutral-500 text-white'}`}>
                        {b.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className="p-4 flex flex-col flex-1 bg-white">
                      <h4 className="font-bold text-lg mb-1">{b.title}</h4>
                      <p className="text-sm font-medium text-orange-600 mb-4">{b.subtitle}</p>
                      
                      <div className="mt-auto grid grid-cols-2 gap-2">
                        <button onClick={() => handleEditBanner(b)} className="flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => handleDeleteBanner(b.id)} className="flex items-center justify-center gap-1.5 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition">
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {banners.length === 0 && (
                  <p className="text-neutral-400 col-span-full py-8 text-center">Belum ada banner.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- REPORTS TAB --- */}
        {activeTab === 'reports' && (
          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm space-y-6 print:shadow-none print:border-none print:p-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
              <h2 className="text-2xl font-bold flex items-center gap-2"><FileText className="text-orange-600" /> Laporan Keseluruhan Pesanan</h2>
              <div className="flex gap-3 items-center">
                <select 
                  value={reportPeriod} 
                  onChange={(e) => setReportPeriod(e.target.value as any)}
                  className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer focus:ring-2 focus:ring-orange-500"
                >
                  <option value="semua">Semua Waktu</option>
                  <option value="harian">Hari Ini</option>
                  <option value="mingguan">7 Hari Terakhir</option>
                  <option value="bulanan">Bulan Ini</option>
                </select>
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-orange-700 transition"
                >
                  Cetak Laporan
                </button>
              </div>
            </div>

            {/* Print Header only visible during printing */}
            <div className="hidden print:block mb-6">
              <h2 className="text-2xl font-bold text-center">Laporan Transaksi Lesehan Kriwil 354</h2>
              <p className="text-center text-sm text-neutral-600 mt-1">
                Periode: {reportPeriod === 'harian' ? 'Hari Ini' : reportPeriod === 'mingguan' ? '7 Hari Terakhir' : reportPeriod === 'bulanan' ? 'Bulan Ini' : 'Semua Waktu'}
              </p>
            </div>

            {/* Summary Box */}
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex justify-between items-center print:border-neutral-300 print:bg-white print:border-b-2 print:rounded-none">
              <span className="font-bold text-orange-800 print:text-black">Total Pemasukan:</span>
              <span className="text-2xl font-black text-orange-600 font-mono print:text-black">{formatIDR(totalReportRevenue)}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-200 print:bg-white print:text-black">
                    <th className="p-4 font-bold print:p-2 print:border-b">ID Pesanan</th>
                    <th className="p-4 font-bold print:p-2 print:border-b">Tanggal</th>
                    <th className="p-4 font-bold print:p-2 print:border-b">Pelanggan</th>
                    <th className="p-4 font-bold print:p-2 print:border-b">Total</th>
                    <th className="p-4 font-bold print:p-2 print:border-b">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredReportOrders.map(order => (
                    <tr key={order.id} className="hover:bg-neutral-50 transition text-sm text-neutral-800 print:border-b print:border-neutral-200">
                      <td className="p-4 font-mono font-bold text-xs print:p-2">{order.id}</td>
                      <td className="p-4 text-xs print:p-2">{new Date(order.timestamp).toLocaleString('id-ID')}</td>
                      <td className="p-4 print:p-2">{order.recipientName} ({order.recipientPhone})</td>
                      <td className="p-4 font-mono font-bold text-orange-600 print:text-black print:p-2">{formatIDR(order.total)}</td>
                      <td className="p-4 capitalize print:p-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded-md ${
                          order.status === 'completed' ? 'bg-emerald-100 text-emerald-700 print:bg-transparent print:p-0 print:text-black' : 
                          order.status === 'awaiting_payment' ? 'bg-yellow-100 text-yellow-700 print:bg-transparent print:p-0 print:text-black' :
                          'bg-blue-100 text-blue-700 print:bg-transparent print:p-0 print:text-black'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredReportOrders.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-neutral-400">Belum ada pesanan terdaftar pada periode ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- REVIEWS TAB --- */}
        {activeTab === 'reviews' && (
          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="text-orange-600" /> Semua Ulasan Pelanggan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviewsList.map(review => (
                <div key={review.id} className="p-5 border border-neutral-100 rounded-2xl bg-neutral-50/50 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-neutral-800">{review.customer_name || 'Pelanggan'}</h4>
                      <p className="text-[10px] text-neutral-400 mt-0.5">{new Date(review.created_at).toLocaleString('id-ID')}</p>
                    </div>
                    <div className="flex items-center bg-white px-2 py-1 rounded-lg border border-neutral-100 shadow-sm">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 mr-1" />
                      <span className="text-xs font-bold">{review.rating}</span>
                    </div>
                  </div>
                  <div className="mb-3 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md w-fit">
                    {review.menu_name}
                  </div>
                  <p className="text-sm text-neutral-600 italic">"{review.comment || 'Tidak ada komentar'}"</p>
                </div>
              ))}
              {reviewsList.length === 0 && (
                <div className="col-span-full py-10 text-center text-neutral-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Belum ada ulasan dari pelanggan.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- CHARTS TAB --- */}
        {activeTab === 'charts' && adminUser?.role === 'owner' && reportsData && (
          <div className="space-y-6">
            <div className="bg-orange-600 text-white p-8 rounded-3xl shadow-lg flex items-center justify-between">
              <div>
                <h3 className="text-orange-100 font-bold mb-1 uppercase tracking-widest text-sm">Total Omzet Keseluruhan</h3>
                <p className="text-4xl md:text-5xl font-black font-mono">{formatIDR(reportsData.totalRevenue)}</p>
              </div>
              <BarChart3 className="w-16 h-16 opacity-20" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm">
                <h3 className="text-lg font-bold mb-6 text-neutral-800">Penjualan 7 Hari Terakhir</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportsData.daily}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                      <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(value) => `Rp${value/1000}k`} tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => formatIDR(value)} labelStyle={{color: '#333'}} />
                      <Line type="monotone" dataKey="revenue" stroke="#FF6B00" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm">
                <h3 className="text-lg font-bold mb-6 text-neutral-800">Penjualan Bulanan (Tahun Ini)</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportsData.monthly}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                      <XAxis dataKey="month" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(value) => `Rp${value/1000}k`} tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => formatIDR(value)} cursor={{fill: '#f9f9f9'}} />
                      <Bar dataKey="revenue" fill="#FF6B00" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && adminUser?.role === 'owner' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm h-fit">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Users className="text-orange-600 w-5 h-5" /> Tambah User</h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Username</label>
                  <input required type="text" value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} className="w-full p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Username" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Password</label>
                  <input required type="password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} className="w-full p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Password" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Role Akses</label>
                  <select value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value})} className="w-full p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none">
                    <option value="admin">Admin Kasir</option>
                    <option value="driver">Kurir Pengantar (Driver)</option>
                    <option value="owner">Pemilik (Owner)</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition shadow-sm mt-2">Tambah Pengguna</button>
              </form>
            </div>

            <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm">
              <h2 className="text-xl font-bold mb-6 text-neutral-800">Daftar Admin & Owner</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-200">
                      <th className="p-4 font-bold">Username</th>
                      <th className="p-4 font-bold">Role</th>
                      <th className="p-4 font-bold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {usersList.map(user => (
                      <tr key={user.id} className="hover:bg-neutral-50 transition">
                        <td className="p-4 font-bold text-sm text-neutral-800">{user.username}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                            user.role === 'owner' ? 'bg-purple-100 text-purple-700' : 
                            user.role === 'driver' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4">
                          {user.username !== adminUser.username && (
                            <button onClick={() => handleDeleteUser(user.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition" title="Hapus User">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Payment Proof Modal */}
      {selectedProof && (
        <div className="fixed inset-0 bg-neutral-900/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full relative">
            <button 
              onClick={() => setSelectedProof(null)}
              className="absolute top-4 right-4 p-2 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-600 transition"
            >
              <Trash2 className="w-5 h-5 hidden" /> {/* Just placeholder to keep spacing */}
              <span className="font-bold text-lg leading-none">&times;</span>
            </button>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Image className="text-[#FF6B00]" /> Bukti Pembayaran
            </h3>
            <div className="rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 flex items-center justify-center p-2">
              <img src={selectedProof} alt="Bukti Transfer" className="max-h-[60vh] object-contain rounded-lg" />
            </div>
            <button 
              onClick={() => setSelectedProof(null)}
              className="w-full mt-6 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* New Order Popup */}
      {newOrderPopup && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-white border-2 border-orange-500 p-5 rounded-2xl shadow-2xl flex gap-4 max-w-sm relative">
            <button onClick={() => setNewOrderPopup(null)} className="absolute top-2 right-2 text-neutral-400 hover:text-neutral-700">
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6 text-orange-600 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-neutral-800">Pesanan Baru Masuk!</h3>
              <p className="text-sm text-neutral-600 mt-1">
                Order <span className="font-mono font-bold text-orange-600">{newOrderPopup.id}</span> dari {newOrderPopup.recipientName}.
              </p>
              <button 
                onClick={() => {
                  setNewOrderPopup(null);
                  setActiveTab('orders');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="mt-3 text-sm font-bold text-orange-600 hover:text-orange-700"
              >
                Lihat Pesanan &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

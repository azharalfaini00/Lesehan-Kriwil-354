import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Phone, UserPlus, LogIn, ArrowRight, UtensilsCrossed } from 'lucide-react';

export default function CustomerLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/customer/login' : '/api/auth/customer/register';

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('customerToken', data.token);
        localStorage.setItem('customerData', JSON.stringify(data.user));
        navigate('/');
      } else {
        setError(data.error || 'Terjadi kesalahan');
      }
    } catch (err) {
      setError('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-br from-[#FF6B00] to-[#FF8A00] rounded-b-[40px] shadow-lg overflow-hidden z-0">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4 border border-white/20">
            <UtensilsCrossed className="w-8 h-8 text-[#FF6B00]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Lesehan Kriwil 354</h1>
          <p className="text-orange-50 text-sm mt-1 font-medium">Masuk untuk mulai memesan</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-neutral-100">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${
                isLogin ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${
                !isLogin ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              Daftar Baru
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 text-center">
                  {error}
                </div>
              )}

              {!isLogin && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-neutral-500 uppercase tracking-widest">Nama Lengkap</label>
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                      <input
                        type="text"
                        required={!isLogin}
                        placeholder="Cth: Budi Santoso"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-neutral-500 uppercase tracking-widest">Nomor Telepon</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                      <input
                        type="tel"
                        required={!isLogin}
                        placeholder="Cth: 08123456789"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-black text-neutral-500 uppercase tracking-widest">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    placeholder="Masukkan username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-neutral-500 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 bg-neutral-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-neutral-900/20 hover:bg-neutral-800 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? 'Memproses...' : (
                  <>
                    {isLogin ? <><LogIn className="w-4 h-4" /> Masuk</> : <><UserPlus className="w-4 h-4" /> Daftar Akun</>}
                    {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
        
        <p className="text-center text-xs text-neutral-400 mt-6 font-medium">
          &copy; 2026 Lesehan Kriwil 354. All rights reserved.
        </p>
      </div>
    </div>
  );
}

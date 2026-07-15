import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Check, Zap, Crown, Loader2, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

// ==============================================================
// 💳 PADDLE ABONELİK YÖNETİM EKRANI
// - Mevcut planı Paddle API'den çeker (/paddle/subscription)
// - Plan yükseltme: Paddle Customer Portal'a yönlendirir
// - İptal: Paddle Customer Portal üzerinden yapılır
// ==============================================================

const PLAN_LABELS = {
  BASIC: { name: 'Basic', color: 'text-slate-700', limit: '10 Personel' },
  PRO:   { name: 'Pro',   color: 'text-cyan-600',  limit: '50 Personel' },
  ENTERPRISE: { name: 'Enterprise', color: 'text-indigo-600', limit: 'Sınırsız' },
};

const STATUS_BADGES = {
  ACTIVE:   { label: 'Aktif',     cls: 'bg-emerald-100 text-emerald-700' },
  TRIAL:    { label: 'Deneme',    cls: 'bg-amber-100 text-amber-700' },
  PAST_DUE: { label: 'Gecikmiş', cls: 'bg-rose-100 text-rose-700' },
  CANCELED: { label: 'İptal',    cls: 'bg-slate-100 text-slate-500' },
};

const Billing = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Paddle ödeme sonrası yönlendirme bildirimi
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      toast.success('Ödemeniz alındı! Aboneliğiniz güncelleniyor...', { duration: 6000 });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === 'failed') {
      toast.error('Ödeme sırasında bir sorun oluştu. Lütfen tekrar deneyin.', { duration: 6000 });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Abonelik bilgisini Paddle endpoint'inden çek
  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const res = await api.get('/paddle/subscription');
      setSubscription(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Abonelik bilgisi alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubscription(); }, []);

  const planInfo = PLAN_LABELS[subscription?.plan_code] || PLAN_LABELS.PRO;
  const statusInfo = STATUS_BADGES[subscription?.subscription_status] || STATUS_BADGES.ACTIVE;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center gap-6 overflow-y-auto custom-scrollbar pb-10 font-sans animate-in fade-in duration-500">
      <Toaster position="top-center" />

      <div className="w-full max-w-4xl">

        {/* Hata durumu */}
        {error && (
          <div className="mb-4 flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-5 py-4 rounded-[1.5rem] text-sm font-semibold">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* Mevcut Plan Kartı */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl shadow-slate-900/20 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden gap-6 mb-8">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />

          <div className="relative z-10 flex-1">
            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
              <Crown size={16} /> {t('lbl_current_subscription', 'MEVCUT ABONELİĞİNİZ')}
            </p>
            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter mb-3">
              {planInfo.name}
              <span className="ml-3 text-sm not-italic font-normal tracking-normal">
                <span className={`px-3 py-1 rounded-full text-[11px] font-black ${statusInfo.cls}`}>
                  {statusInfo.label}
                </span>
              </span>
            </h2>

            <div className="flex flex-wrap gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">
                {planInfo.limit}
              </span>
              {subscription?.subscription?.expiry_date && (
                <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">
                  Yenileme: {new Date(subscription.subscription.expiry_date).toLocaleDateString('tr-TR')}
                </span>
              )}
              {subscription?.paddle_subscription_id && (
                <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 font-mono">
                  ID: {subscription.paddle_subscription_id.slice(0, 20)}...
                </span>
              )}
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={fetchSubscription}
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
            >
              <RefreshCw size={14} /> Yenile
            </button>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center flex items-center justify-center gap-1">
              <ShieldCheck size={12} /> Paddle Güvenceli
            </p>
          </div>
        </div>

        {/* Plan Özeti */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* BASIC */}
          <div className={`rounded-[2rem] p-7 border-2 flex flex-col ${subscription?.plan_code === 'BASIC' ? 'border-cyan-300 bg-cyan-50 shadow-lg' : 'border-slate-100 bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-800 uppercase italic">Basic</h3>
              {subscription?.plan_code === 'BASIC' && (
                <span className="bg-cyan-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">Aktif</span>
              )}
            </div>
            <ul className="space-y-2 text-xs font-semibold text-slate-500 flex-1">
              <li className="flex gap-2"><Check size={14} className="text-cyan-500 shrink-0 mt-0.5" /> 10 Personele kadar</li>
              <li className="flex gap-2"><Check size={14} className="text-cyan-500 shrink-0 mt-0.5" /> Temel İK modülleri</li>
              <li className="flex gap-2"><Check size={14} className="text-cyan-500 shrink-0 mt-0.5" /> Puantaj ve İzin</li>
            </ul>
          </div>

          {/* PRO */}
          <div className={`rounded-[2rem] p-7 border-2 flex flex-col ${subscription?.plan_code === 'PRO' ? 'border-cyan-400 bg-slate-900 text-white shadow-xl' : 'border-slate-100 bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-black uppercase italic ${subscription?.plan_code === 'PRO' ? 'text-white' : 'text-slate-800'}`}>Pro</h3>
              {subscription?.plan_code === 'PRO' && (
                <span className="bg-cyan-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">Aktif</span>
              )}
            </div>
            <ul className={`space-y-2 text-xs font-semibold flex-1 ${subscription?.plan_code === 'PRO' ? 'text-slate-300' : 'text-slate-500'}`}>
              <li className="flex gap-2"><Check size={14} className="text-cyan-400 shrink-0 mt-0.5" /> 50 Personele kadar</li>
              <li className="flex gap-2"><Check size={14} className="text-cyan-400 shrink-0 mt-0.5" /> ATS + Bordro</li>
              <li className="flex gap-2"><Check size={14} className="text-cyan-400 shrink-0 mt-0.5" /> Masraf & Satın Alma</li>
              <li className="flex gap-2"><Check size={14} className="text-cyan-400 shrink-0 mt-0.5" /> Bilgi Bankası</li>
            </ul>
          </div>

          {/* ENTERPRISE */}
          <div className={`rounded-[2rem] p-7 border-2 flex flex-col ${subscription?.plan_code === 'ENTERPRISE' ? 'border-indigo-300 bg-indigo-50 shadow-lg' : 'border-slate-100 bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-800 uppercase italic">Enterprise</h3>
              {subscription?.plan_code === 'ENTERPRISE' && (
                <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">Aktif</span>
              )}
            </div>
            <ul className="space-y-2 text-xs font-semibold text-slate-500 flex-1">
              <li className="flex gap-2"><Check size={14} className="text-indigo-500 shrink-0 mt-0.5" /> Sınırsız personel</li>
              <li className="flex gap-2"><Check size={14} className="text-indigo-500 shrink-0 mt-0.5" /> Performans & Eğitim</li>
              <li className="flex gap-2"><Check size={14} className="text-indigo-500 shrink-0 mt-0.5" /> API Erişimi</li>
              <li className="flex gap-2"><Check size={14} className="text-indigo-500 shrink-0 mt-0.5" /> 7/24 VIP Destek</li>
            </ul>
          </div>

        </div>

        {/* Plan değişikliği notu */}
        <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm text-slate-500 text-center font-medium">
          Plan değişikliği veya iptal için{' '}
          <a
            href="https://cadro.io/#contact"
            className="text-cyan-600 font-bold hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            destek ekibimizle
          </a>{' '}
          iletişime geçin ya da Paddle müşteri portalını kullanın.
        </div>
      </div>
    </div>
  );
};

export default Billing;

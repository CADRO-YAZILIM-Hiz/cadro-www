import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/axios';
import { getDefaultAuthorizedRoute } from '../auth/permissions';
import {
  Lock, Mail, ArrowRight, Loader2, CheckCircle,
  Eye, EyeOff, Key, Building2, Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast, { Toaster } from 'react-hot-toast';

// ==============================================================
// 🔐 CADRO GİRİŞ EKRANI
// KURAL: Bu ekranda sadece mevcut üyeler giriş yapar.
// Yeni üyelik tamamen cadro.io üzerinden Paddle ödeme akışıyla gerçekleşir.
// Deneme sürümü, ücretsiz kayıt yoktur.
// ==============================================================

const Auth = ({ setIsAuthenticated }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlMode = searchParams.get('mode');
  const urlEmail = searchParams.get('email');
  const urlPayment = searchParams.get('payment');
  const [authMode, setAuthMode] = useState(urlMode || 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [pendingMfaEmail, setPendingMfaEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [setupCode, setSetupCode] = useState('');

  const isArabic = i18n.language === 'ar';
  const isResetVerificationStep = (authMode === 'reset' || authMode === 'force-reset') && resetCode !== '';

  const LANGUAGES = [
    { code: 'tr', label: 'Türkçe' },
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'ar', label: 'العربية' },
  ];

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  useEffect(() => {
    if (urlMode) {
      setAuthMode(urlMode);
    }
  }, [urlMode]);

  useEffect(() => {
    if (urlEmail) {
      setEmail(String(urlEmail).trim().toLowerCase());
    }
  }, [urlEmail]);

  useEffect(() => {
    if (urlMode === 'setup' && urlPayment === 'success') {
      setSuccessMsg(t('msg_payment_success', 'Ödemeniz başarıyla alındı! Aboneliğiniz güncellendi.'));
    }
  }, [urlMode, urlPayment, t]);


  const switchMode = (mode) => {
    setAuthMode(mode);
    setError('');
    setSuccessMsg('');
    setPassword('');
    setResetCode('');
    setMfaCode('');
    setSetupCode('');
  };

  const startForcedPasswordReset = async (targetEmail) => {
    const cleanEmail = String(targetEmail || '').trim().toLowerCase();
    setEmail(cleanEmail);
    setResetCode('PENDING');
    setAuthMode('force-reset');
    setPassword('');
    setMfaCode('');
    setSetupCode('');
    await authApi.forgotPassword(cleanEmail);
    setSuccessMsg(t('msg_force_password_reset_sent', 'İlk giriş güvenliği için şifre yenileme kodunuz e-postanıza gönderildi.'));
  };

  const getTitle = () => {
    if (authMode === 'login') return t('lbl_login', 'Giriş Yap');
    if (authMode === 'reset') return t('lbl_reset_password', 'Şifremi Unuttum');
    if (authMode === 'mfa') return t('lbl_mfa', 'Kimlik Doğrulama');
    if (authMode === 'setup') return t('lbl_setup_title', 'Hesabınızı Aktifleştirin');
    if (authMode === 'force-reset') return t('lbl_force_reset_title', 'Şifrenizi Yenileyin');
    return '';
  };

  const getSubTitle = () => {
    if (authMode === 'login') return t('lbl_login_desc', 'CADRO hesabınıza giriş yapın');
    if (authMode === 'reset') return t('lbl_reset_desc', 'E-posta adresinize sıfırlama kodu göndereceğiz');
    if (authMode === 'mfa') return t('lbl_mfa_desc', 'E-posta adresinize gelen 6 haneli kodu giriniz');
    if (authMode === 'setup') return t('lbl_setup_desc', 'Ödeme onaylandı! E-postanızdaki kod ile şifrenizi belirleyin.');
    if (authMode === 'force-reset') return t('lbl_force_reset_desc', 'İlk girişten önce yeni bir şifre belirlemeniz zorunludur.');
    return '';
  };

  const finishLogin = (data) => {
    localStorage.setItem('token', data.access_token);
    if (data.role) localStorage.setItem('user_role', data.role);
    if (data.name) localStorage.setItem('user_name', data.name);
    if (data.user_id) localStorage.setItem('user_id', String(data.user_id));
    if (data.company_plan) localStorage.setItem('company_plan', data.company_plan);

    setIsAuthenticated(true);
    toast.success(t('msg_login_success', 'Giriş başarılı!'));
    setTimeout(() => {
      navigate(getDefaultAuthorizedRoute(data.role, data.company_plan));
    }, 800);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // ── LOGIN ──────────────────────────────────────────────
      if (authMode === 'login') {
        const res = await authApi.login(email, password);
        const data = res.data || res;
        if (data.mfa_required || data.require_mfa) {
          setPendingMfaEmail(email);
          switchMode('mfa');
          setSuccessMsg(t('msg_mfa_sent', 'Güvenlik kodunuz e-postanıza gönderildi.'));
        } else if (data.require_password_change) {
          await startForcedPasswordReset(email);
        } else {
          finishLogin(data);
        }
      }

      // ── MFA DOĞRULAMA ──────────────────────────────────────
      else if (authMode === 'mfa') {
        const res = await authApi.verifyMfa(pendingMfaEmail, mfaCode);
        const data = res.data || res;
        if (data.require_password_change) {
          await startForcedPasswordReset(pendingMfaEmail);
        } else {
          finishLogin(data);
        }
      }

      // ── PADDLE SONRASI ŞİFRE BELİRLEME ───────────────────
      else if (authMode === 'setup') {
        const res = await authApi.setupPassword({ email, otp_code: setupCode, new_password: password });
        toast.success(t('msg_account_activated', 'Hesabınız aktifleştirildi!'));
        finishLogin(res.data || res);
      }

      // ── ŞİFRE SIFIRLAMA ───────────────────────────────────
      else if (authMode === 'reset') {
        if (!resetCode) {
          await authApi.forgotPassword(email);
          setSuccessMsg(t('msg_reset_code_sent', 'Kod e-postanıza gönderildi.'));
          setResetCode('PENDING');
        } else {
          await authApi.resetPasswordConfirm(email, resetCode === 'PENDING' ? '' : resetCode, password);
          setSuccessMsg(t('msg_password_changed', 'Şifre güncellendi!'));
          setTimeout(() => switchMode('login'), 2000);
        }
      }

      // ── ZORUNLU İLK ŞİFRE YENİLEME ────────────────────────
      else if (authMode === 'force-reset') {
        await authApi.resetPasswordConfirm(email, resetCode === 'PENDING' ? '' : resetCode, password);
        setSuccessMsg(t('msg_force_password_changed', 'Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.'));
        setTimeout(() => switchMode('login'), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || t('err_default', 'Bir hata oluştu.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex app-tech-background font-sans ${isArabic ? 'rtl' : 'ltr'}`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <Toaster position="top-center" />

      {/* SOL — Marka Alanı */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden bg-slate-900 items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/40 to-slate-900/90 z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay" />
        <div className="relative z-20 p-20 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center mb-8 border border-white/20 shadow-2xl">
            <Building2 size={48} className="text-cyan-400 drop-shadow-lg" />
          </div>
          <h1 className="text-5xl font-black text-white mb-6 tracking-tight drop-shadow-lg">
            CADRO <span className="text-cyan-400 font-light">Workspace</span>
          </h1>
          <p className="text-lg text-cyan-50/80 font-medium max-w-lg leading-relaxed">
            {t('lbl_hero_desc', 'Modern şirketler için tasarlanmış yeni nesil İK, Finans ve Operasyon yönetim platformu.')}
          </p>
        </div>
      </div>

      {/* SAĞ — Form Alanı */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 md:p-12 relative bg-white/80 backdrop-blur-3xl shadow-2xl">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">

            {/* Başlık */}
            <div className="p-10 pb-6 text-center">
              <div className="w-16 h-16 bg-cyan-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-cyan-600">
                {authMode === 'setup' ? <CheckCircle size={28} className="text-emerald-500" /> : <Lock size={28} />}
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2 uppercase">{getTitle()}</h2>
              <p className="text-sm font-bold text-slate-400">{getSubTitle()}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-10 pt-4 space-y-4">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold text-center">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl text-xs font-bold text-center">
                  {successMsg}
                </div>
              )}

              {/* E-posta (MFA hariç) */}
              {authMode !== 'mfa' && (
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isArabic ? 'right-4' : 'left-4'} flex items-center text-slate-400`}>
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder={t('ph_email', 'E-Posta Adresi')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isResetVerificationStep}
                    className={`w-full ${isArabic ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 transition-all`}
                    dir="ltr"
                  />
                </div>
              )}

              {/* MFA Kodu */}
              {authMode === 'mfa' && (
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isArabic ? 'right-4' : 'left-4'} flex items-center text-slate-400`}>
                    <Key size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder={t('ph_mfa_code', '6 Haneli Doğrulama Kodu')}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    className={`w-full ${isArabic ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-center tracking-[0.4em] outline-none focus:border-cyan-500 transition-all`}
                  />
                </div>
              )}

              {/* Setup: OTP Kodu */}
              {authMode === 'setup' && (
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isArabic ? 'right-4' : 'left-4'} flex items-center text-slate-400`}>
                    <Key size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder={t('ph_setup_code', 'E-postanızdaki 6 Haneli Kod')}
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                    className={`w-full ${isArabic ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-slate-50 border border-emerald-200 rounded-2xl text-sm font-black text-center tracking-[0.4em] outline-none focus:border-emerald-500 transition-all`}
                  />
                </div>
              )}

              {/* Reset: Sıfırlama kodu (PENDING aşamasında) */}
              {(authMode === 'reset' || authMode === 'force-reset') && isResetVerificationStep && (
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isArabic ? 'right-4' : 'left-4'} flex items-center text-slate-400`}>
                    <Key size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder={t('ph_reset_code', '6 Haneli Sıfırlama Kodu')}
                    value={resetCode === 'PENDING' ? '' : resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                    className={`w-full ${isArabic ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-center tracking-[0.4em] outline-none focus:border-cyan-500 transition-all`}
                  />
                </div>
              )}

              {/* Şifre (login, setup, reset-confirm) */}
              {(authMode === 'login' || authMode === 'setup' || isResetVerificationStep) && (
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isArabic ? 'right-4' : 'left-4'} flex items-center text-slate-400`}>
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={authMode === 'setup' ? t('ph_setup_password', 'Yeni Şifrenizi Belirleyin') : t('ph_password', 'Şifre')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full ${isArabic ? 'pr-12 pl-12' : 'pl-12 pr-12'} py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 transition-all`}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 ${isArabic ? 'left-4' : 'right-4'} flex items-center text-slate-400 hover:text-cyan-600 transition-colors`}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              {/* Ana Buton */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 ${authMode === 'setup' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-cyan-600'} text-white rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-70 shadow-xl shadow-slate-200 mt-2`}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    {authMode === 'login' && t('btn_login', 'SİSTEME GİRİŞ YAP')}
                    {authMode === 'mfa' && t('btn_verify', 'DOĞRULA VE GİRİŞ YAP')}
                    {authMode === 'setup' && t('btn_setup_start', 'ŞİFREMİ BELİRLE VE BAŞLA')}
                    {authMode === 'reset' && (resetCode ? t('btn_reset_save', 'YENİ ŞİFREYİ KAYDET') : t('btn_reset_send', 'KOD GÖNDER'))}
                    {authMode === 'force-reset' && t('btn_force_reset_save', 'YENİ ŞİFREYİ BELİRLE')}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Alt linkler */}
              <div className="flex justify-between items-center pt-2">
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="text-xs font-bold text-slate-400 hover:text-cyan-600 transition-colors"
                  >
                    {t('btn_forgot', 'Şifremi unuttum')}
                  </button>
                )}
                {(authMode === 'reset' || authMode === 'mfa' || authMode === 'setup') && (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-xs font-bold text-slate-400 hover:text-cyan-600 transition-colors"
                  >
                    {t('btn_back_to_login', 'Giriş sayfasına dön')}
                  </button>
                )}
              </div>
            </form>
          </div>


          {/* Dil Seçici */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <Globe size={14} className="text-slate-400" />
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                  i18n.language === lang.code
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-cyan-600'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Üyelik notu */}
          <p className="text-center text-xs text-slate-400 mt-6 font-medium">
            {t('lbl_membership_note', 'Henüz üye değilseniz')}{' '}
            <a href="https://cadro.io/#pricing" className="text-cyan-600 font-bold hover:underline" target="_blank" rel="noreferrer">
              cadro.io
            </a>
            {' '}{t('lbl_membership_note2', 'adresinden abonelik başlatabilirsiniz.')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

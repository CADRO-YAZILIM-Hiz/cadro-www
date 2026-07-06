import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, LogOut, CheckCircle } from 'lucide-react';
import { clearAuthStorage } from '../api/axios';

const SessionTimeout = ({ setIsAuthenticated }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // ⏱️ Süre Ayarları
  const IDLE_TIME_MS = 10 * 60 * 1000; // 10 Dakika (Hareketsizlik süresi)
  const COUNTDOWN_SECONDS = 120; // 2 Dakika (Geri sayım süresi)

  const [isIdle, setIsIdle] = useState(false);
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
  
  const idleTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // 🌍 RTL (Arapça) Desteği
  const isArabic = i18n.language === 'ar';

  // Çıkış Yapma Fonksiyonu
  const handleLogout = () => {
    clearAuthStorage();
    setIsAuthenticated(false);
    navigate('/login');
  };

  // Zamanlayıcıyı Başlat
  const startIdleTimer = () => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    idleTimeoutRef.current = setTimeout(() => {
      setIsIdle(true); // 10 dakika doldu, ekranı buzla!
      setTimeLeft(COUNTDOWN_SECONDS); // 120 saniyeden geri sayıma başla
    }, IDLE_TIME_MS);
  };

  // Kullanıcı hareket ettiğinde süreyi sıfırla (Eğer modal açık değilse)
  const resetTimer = () => {
    if (isIdle) return; // Uyarı ekranı çıktıysa fare hareketiyle kapanmasın, butona basması şart!
    startIdleTimer();
  };

  // "Buradayım" butonuna basıldığında
  const handleStayLoggedIn = () => {
    setIsIdle(false);
    startIdleTimer();
  };

  // Olay Dinleyicileri (Fare, Klavye, Dokunmatik ekran)
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    const handleActivity = () => resetTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));
    startIdleTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isIdle]);

  // Geri Sayım Motoru
  useEffect(() => {
    if (isIdle) {
      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            handleLogout(); // Süre bitti, sistemden at!
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isIdle]);

  // Ekran kilitli değilse hiçbir şey gösterme
  if (!isIdle) return null;

  // Dakika ve Saniye formatlama (Örn: 01:59)
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    // 🔥 BUZLU CAM EFEKTİ (backdrop-blur-md)
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md transition-all duration-300" dir={isArabic ? 'rtl' : 'ltr'}>
      
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 relative overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Arka plan süslemeleri */}
        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-rose-500/10 rounded-full blur-2xl"></div>
        
        <div className="flex flex-col items-center text-center relative z-10">
          
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
            <ShieldAlert size={40} />
          </div>

          <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
            {t('idle_warning_title', 'Burada mısınız?')}
          </h2>
          
          <p className="text-sm font-bold text-slate-500 leading-relaxed mb-6">
            {t('idle_warning_desc', 'Güvenliğiniz için hareketsiz kaldığınızdan dolayı oturumunuz birazdan kapatılacak.')}
          </p>

          <div className="text-5xl font-black text-rose-500 tracking-tighter mb-8 drop-shadow-sm">
            {formattedTime}
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button 
              onClick={handleStayLoggedIn}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/30"
            >
              <CheckCircle size={18} />
              {t('btn_stay_logged_in', 'Buradayım, Açık Tut')}
            </button>
            
            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <LogOut size={18} />
              {t('btn_logout_now', 'Şimdi Çıkış Yap')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SessionTimeout;

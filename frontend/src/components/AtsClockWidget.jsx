import React, { useState, useEffect, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Clock, CalendarDays, Sun, CloudRain, Cloud, MapPin,
  LayoutDashboard, Users, Calendar, Package, Settings, Network, 
  LifeBuoy, Briefcase, FolderOpen, Wallet, Target, GraduationCap, Home,
  Timer, Search, BookOpen, ClipboardList
  , BarChart3
} from 'lucide-react';
import api from '../api/axios';
import { useTranslation } from 'react-i18next'; 

// ==========================================
// 🎯 YARDIMCI BİLEŞEN: DİNAMİK SAYFA BAŞLIĞI
// ==========================================
const DynamicPageHeader = memo(({ pathname }) => {
  const { t, i18n } = useTranslation(); 
  const isTurkish = i18n.language?.startsWith('tr');

  const getPageInfo = (path) => {
    // Admin Rotaları
    if (path.includes('/dashboard')) return { title: isTurkish ? 'KOKPİT' : t('nav_dashboard', 'SİSTEM KOKPİTİ'), icon: <LayoutDashboard size={24} className="text-cyan-500" />, subtitle: t('nav_sub_dashboard', 'Genel İstatistikler') };
    if (path.includes('/employees')) return { title: t('nav_employees', 'PERSONEL YÖNETİMİ'), icon: <Users size={24} className="text-indigo-500" />, subtitle: t('nav_sub_employees', 'Kadro ve Çalışanlar') };
    if (path.includes('/onboarding')) return { title: t('lifecycle_header_title', 'İŞE BAŞLATMA & İŞTEN AYRILIŞ'), icon: <Briefcase size={24} className="text-indigo-500" />, subtitle: t('lifecycle_header_subtitle', 'İşe giriş, ayrılış ve belge süreçleri') };
    if (path.includes('/org-chart')) return { title: t('nav_org_chart', 'ORGANİZASYON ŞEMASI'), icon: <Network size={24} className="text-purple-500" />, subtitle: t('nav_sub_org_chart', 'Hiyerarşik Yapı') };
    if (path.includes('/ats')) return { title: t('nav_ats', 'ADAY TAKİP (ATS)'), icon: <Briefcase size={24} className="text-blue-500" />, subtitle: t('nav_sub_ats', 'İşe Alım Süreci') };
    if (path.includes('/attendance')) return { title: t('nav_attendance', 'ZAMAN & DEVAMLILIK'), icon: <Timer size={24} className="text-emerald-600" />, subtitle: t('nav_sub_attendance', 'PDKS ve Mesai Takibi') };
    if (path.includes('/locations')) return { title: t('nav_locations', 'KONUMLAR & ŞANTİYELER'), icon: <MapPin size={24} className="text-rose-500" />, subtitle: t('nav_sub_locations', 'Güvenlik Çemberi Yönetimi') };
    if (path.includes('/leaves') && !path.includes('my-')) return { title: t('nav_leaves', 'İZİN YÖNETİMİ'), icon: <Calendar size={24} className="text-emerald-500" />, subtitle: t('nav_sub_leaves', 'Onay Merkezi') };
    if (path.includes('/e-dossier')) return { title: t('nav_dossier', 'E-ÖZLÜK ARŞİVİ'), icon: <FolderOpen size={24} className="text-amber-600" />, subtitle: t('nav_sub_dossier', 'Dijital Belgeler') };
    if (path.includes('/performance') && !path.includes('my-')) return { title: t('nav_performance', 'PERFORMANS & YETENEK'), icon: <Target size={24} className="text-indigo-500" />, subtitle: t('nav_sub_performance', 'OKR ve 360° Değerlendirme') };
    if (path.includes('/training') && !path.includes('my-')) return { title: t('nav_training', 'KURUMSAL AKADEMİ'), icon: <GraduationCap size={24} className="text-purple-500" />, subtitle: t('nav_sub_training', 'Eğitim Yönetimi') };
    if (path.includes('/knowledge-base')) return { title: t('nav_knowledge_base', 'BİLGİ BANKASI & POLİTİKALAR'), icon: <BookOpen size={24} className="text-sky-500" />, subtitle: t('nav_sub_knowledge_base', 'Politika ve SOP okuma merkezi') };
    if (path.includes('/request-forms')) return { title: t('nav_request_forms', 'KURUMSAL TALEP FORMLARI'), icon: <ClipboardList size={24} className="text-cyan-500" />, subtitle: t('nav_sub_request_forms', 'Yapılandırılmış talep ve rota yönetimi') };
    if (path.includes('/kpi-statistics')) return { title: t('nav_kpi_statistics', 'KPI & İSTATİSTİKLER'), icon: <BarChart3 size={24} className="text-emerald-500" />, subtitle: t('nav_sub_kpi_statistics', 'Tarih aralığına göre metrik takibi') };
    if (path.includes('/expenses') && !path.includes('my-')) return { title: t('nav_expenses', 'MASRAF YÖNETİMİ'), icon: <Wallet size={24} className="text-amber-500" />, subtitle: t('nav_sub_expenses', 'Bütçe ve Fişler') };
    if (path.includes('/assets') && !path.includes('my-')) return { title: t('nav_assets', 'ZİMMET & ENVANTER'), icon: <Package size={24} className="text-rose-500" />, subtitle: t('nav_sub_assets', 'Stok Takibi') };
    if (path.includes('/helpdesk')) return { title: t('nav_helpdesk', 'DESTEK MASASI (IT/İK)'), icon: <LifeBuoy size={24} className="text-rose-500" />, subtitle: t('nav_sub_helpdesk', 'İç İletişim Talepleri') };
    if (path.includes('/settings')) return { title: t('nav_settings', 'SİSTEM & ŞİRKET AYARLARI'), icon: <Settings size={24} className="text-cyan-500" />, subtitle: t('nav_sub_settings', 'Kurumsal Kimlik Yönetimi') };
    if (path.includes('/billing')) return { title: t('nav_billing', 'ABONELİK & FATURANDIRMA'), icon: <Wallet size={24} className="text-slate-700" />, subtitle: t('nav_sub_billing', 'SaaS Paket Yönetimi') };
    if (path.includes('/executive-console')) return { title: t('nav_executive_console', 'YÖNETMEN KOLTUĞU'), icon: <BarChart3 size={24} className="text-cyan-500" />, subtitle: t('nav_sub_executive_console', 'Platform görünürlüğü ve abonelik merkezi') };
    if (path.includes('/account-security')) return { title: t('nav_account_security', 'HESAP GÜVENLİĞİ'), icon: <Settings size={24} className="text-indigo-500" />, subtitle: t('nav_sub_account_security', 'Şifre ve iki aşamalı doğrulama') };
    
    // Personel (Employee) Rotaları
    if (path.includes('/portal')) return { title: isTurkish ? 'KOKPİT' : t('nav_portal', 'ÇALIŞAN PORTALI'), icon: <Home size={24} className="text-indigo-500" />, subtitle: t('nav_sub_portal', 'Kişisel Kokpit') };
    
    // Fallback
    return { title: isTurkish ? 'KOKPİT' : t('nav_fallback', 'KOKPİT'), icon: <LayoutDashboard size={24} className="text-slate-400" />, subtitle: t('nav_sub_fallback', 'Kurumsal Yönetim') };
  };

  const pageInfo = getPageInfo(pathname);

  return (
    <div className="flex items-center justify-center gap-4 text-center w-full px-4 border-x border-slate-100/50">
      <div className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 shadow-sm shrink-0">
        {pageInfo.icon}
      </div>
      <div className="flex flex-col items-start truncate max-w-[200px] md:max-w-none">
        <h2 className="text-sm md:text-lg font-black text-slate-800 tracking-tighter uppercase italic leading-none truncate">
          {pageInfo.title}
        </h2>
        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1 truncate">
          {pageInfo.subtitle}
        </p>
      </div>
    </div>
  );
});

// ==========================================
// 🌦️ ANA WIDGET GÖVDESİ (SAAT VE HAVA DURUMU)
// ==========================================
const AtsClockWidget = () => {
  const { t, i18n } = useTranslation(); 
  const isArabic = i18n.language === 'ar';

  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: '-', condition: '...', city: 'İstanbul', icon_type: 'CLOUDY' });
  const [selectedCity, setSelectedCity] = useState(localStorage.getItem('user_city') || 'İstanbul');
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [tempCityInput, setTempCityInput] = useState('');
  
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await api.get(`/dashboard/weather?city=${selectedCity}`);
        setWeather(res.data);
        localStorage.setItem('user_city', res.data.city || selectedCity);
      } catch (err) {
        console.error("Hava durumu çekilemedi", err);
      }
    };
    fetchWeather();
  }, [selectedCity]);

  const handleCitySubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      if (tempCityInput.trim().length > 2) setSelectedCity(tempCityInput.trim());
      setIsEditingCity(false);
    }
  };

  const localeCode = isArabic ? 'ar-SA' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'en' ? 'en-US' : 'tr-TR'));
  const formattedTime = currentTime.toLocaleTimeString(localeCode, { hour: '2-digit', minute: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString(localeCode, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

  const renderWeatherIcon = () => {
    if (weather.icon_type === 'SUNNY') return <Sun className="text-amber-500 w-8 h-8 drop-shadow-sm" strokeWidth={1.5} />;
    if (weather.icon_type === 'RAINY') return <CloudRain className="text-cyan-500 w-8 h-8 drop-shadow-sm" strokeWidth={1.5} />;
    if (weather.icon_type === 'SNOWY') return <Cloud className="text-blue-400 w-8 h-8 drop-shadow-sm" strokeWidth={1.5} />;
    return <Cloud className="text-slate-400 w-8 h-8 drop-shadow-sm" strokeWidth={1.5} />;
  };

  return (
    <div className="bg-white border border-slate-100 shadow-sm p-3 md:p-4 rounded-[2rem] flex flex-col xl:flex-row items-center justify-between gap-4 w-full relative z-10 mb-6" dir={isArabic ? 'rtl' : 'ltr'}>
      
      {/* ================= SOL: HAVA DURUMU ================= */}
      <div className={`flex items-center gap-4 w-full xl:w-auto shrink-0 justify-center xl:justify-start px-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
        
        <div className={`flex items-center gap-3 ${isArabic ? 'border-l pl-4' : 'border-r pr-4'} border-slate-100`} dir="ltr">
          {renderWeatherIcon()}
          <span className="text-3xl font-black text-slate-800 tracking-tighter">
            {weather.temp}<span className="text-base font-bold text-slate-400">°C</span>
          </span>
        </div>

        <div className={`flex flex-col ${isArabic ? 'items-end pr-2' : 'items-start pl-2'}`}>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-0.5">
            <MapPin size={10} className="text-indigo-500"/> {t('lbl_city_weather', 'ŞEHİR / HAVA')}
          </span>
          <div className={`flex items-center gap-1.5 h-5 ${isArabic ? 'flex-row-reverse' : ''}`}>
            {isEditingCity ? (
              <div className="flex items-center border-b border-indigo-400 bg-indigo-50/50 rounded-sm px-1">
                 <input 
                   autoFocus type="text" placeholder={t('ph_type_city', 'Şehir...')} value={tempCityInput}
                   onChange={(e) => setTempCityInput(e.target.value)} onKeyDown={handleCitySubmit} onBlur={handleCitySubmit}
                   className="text-[11px] font-black text-indigo-600 bg-transparent outline-none w-20 uppercase placeholder:text-indigo-300"
                   dir="ltr"
                 />
                 <Search size={10} className="text-indigo-400"/>
              </div>
            ) : (
              <span 
                onClick={() => { setTempCityInput(''); setIsEditingCity(true); }}
                className="text-[11px] font-black text-indigo-600 uppercase cursor-pointer hover:text-indigo-800 transition-colors border-b border-transparent hover:border-indigo-200 truncate max-w-[100px]"
              >
                {weather.city || selectedCity}
              </span>
            )}
            {!isEditingCity && <span className="text-[10px] font-bold text-slate-500 capitalize max-w-[90px] truncate" title={weather.condition}>- {weather.condition}</span>}
          </div>
        </div>
      </div>

      {/* ================= ORTA: SAYFA BAŞLIĞI ================= */}
      <div className="w-full xl:w-1/3 py-3 xl:py-0 hidden md:block">
         <DynamicPageHeader pathname={location.pathname} />
      </div>

      {/* ================= SAĞ: SAAT VE TARİH ================= */}
      <div className={`flex items-center gap-4 w-full xl:w-auto shrink-0 justify-center xl:justify-end px-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
        
        <div className={`flex flex-col ${isArabic ? 'items-start border-l pl-4' : 'items-end border-r pr-4'} border-slate-100`}>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('lbl_today', 'BUGÜN')}</span>
          <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
            <CalendarDays size={14} className="text-emerald-500 shrink-0" />
            {formattedDate}
          </span>
        </div>

        <div className="flex items-center gap-2 pl-2" dir="ltr">
          <Clock className="text-indigo-500 w-7 h-7 shrink-0 drop-shadow-sm" strokeWidth={2} />
          <span className="text-3xl font-mono font-black text-slate-900 tracking-tight leading-none pt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formattedTime}
          </span>
        </div>

      </div>

    </div>
  );
};

export default AtsClockWidget;

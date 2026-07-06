import React, { useState, useEffect } from 'react';
import api, { leaveApi, profileApi } from '../api/axios'; 
import { useNavigate } from 'react-router-dom';
import { 
  User, Calendar, ShieldCheck, FileText, 
  GraduationCap, Clock, Activity, Briefcase, PlusCircle, XCircle, Send,
  Settings, Phone, MapPin, Lock, CheckCircle, Wallet, PartyPopper, Star,
  HeartHandshake, Award, MessageSquare, Smile
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast'; 
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi

const EmployeePortal = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası

  // 🌍 Dinamik toLocaleUpperCase ve RTL için dil tespiti
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';

  // 🌍 SABİTLERİ DİNAMİKLEŞTİR (Dil değiştiğinde anında güncellenir)
  const getMoods = () => [
    { id: 'HARIKA', emoji: '🤩', label: t('mood_great', 'HARİKA') },
    { id: 'IYI', emoji: '😊', label: t('mood_good', 'İYİ') },
    { id: 'NORMAL', emoji: '😐', label: t('mood_normal', 'NORMAL') },
    { id: 'KOTU', emoji: '😔', label: t('mood_bad', 'KÖTÜ') },
    { id: 'BERBAT', emoji: '😫', label: t('mood_awful', 'BERBAT') }
  ];

  const getKudosBadges = () => [
    { id: 'TAKIM_YILDIZI', label: t('badge_team_star', '🌟 Takım Yıldızı'), color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { id: 'HIZLI_COZUCU', label: t('badge_fast_solver', '🚀 Hızlı Çözücü'), color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { id: 'YARDIMSEVER', label: t('badge_helpful', '🦸‍♂️ Süper Yardımsever'), color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { id: 'YARATICI', label: t('badge_creative', '💡 İnovatif Fikir'), color: 'bg-cyan-100 text-cyan-700 border-cyan-200' }
  ];

  const MOODS = getMoods();
  const KUDOS_BADGES = getKudosBadges();

  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const userName = localStorage.getItem('user_name') || t('lbl_employee_fallback', 'Çalışan');
  const currentUserId = parseInt(localStorage.getItem('user_id') || '0', 10);

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveCatalog, setLeaveCatalog] = useState({ profiles: [], types_by_country: {} });
  const [leaveForm, setLeaveForm] = useState({ start_date: '', end_date: '', leave_country: '', leave_type: '', reason: '' });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('PROFILE'); 
  const [profileForm, setProfileForm] = useState({ phone: '', address: '' });
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });

  const [currentMood, setCurrentMood] = useState(null);
  const [kudosFeed, setKudosFeed] = useState([]);
  const [colleagues, setColleagues] = useState([]);
  const [isKudosModalOpen, setIsKudosModalOpen] = useState(false);
  const [kudosForm, setKudosForm] = useState({ receiver_id: '', badge: KUDOS_BADGES[0].id, message: '' });

  const fetchMyData = async () => {
    try {
      const res = await api.get('/employee/me/portal');
      setData(res.data);
      fetchSocialData();
    } catch (err) {
      toast.error(t('err_fetch_portal', "Portal verisi alınamadı, lütfen sayfayı yenileyin."));
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveCatalog = async () => {
    try {
      const res = await leaveApi.getCatalog();
      setLeaveCatalog(res.data || { profiles: [], types_by_country: {} });
    } catch (error) {
      console.error('Leave catalog could not be fetched:', error);
    }
  };

  const fetchSocialData = async () => {
    try {
      const [moodRes, feedRes, colRes] = await Promise.all([
        api.get('/social/mood/today'),
        api.get('/social/kudos/feed'),
        api.get('/social/colleagues')
      ]);
      setCurrentMood(moodRes.data.mood);
      setKudosFeed(feedRes.data || []);
      setColleagues(colRes.data || []);
    } catch (error) {
      console.error("Sosyal veriler çekilemedi:", error);
    }
  };

  useEffect(() => {
    fetchMyData();
    fetchLeaveCatalog();
  }, [i18n.language]);

  const handleLeaveRequest = async (e) => {
    e.preventDefault();
    const start = new Date(leaveForm.start_date);
    const end = new Date(leaveForm.end_date);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error(t('err_invalid_date', "Lütfen geçerli tarih aralığı seçin."));
      return;
    }

    if (start > end) {
      toast.error(t('err_date_order', "Bitiş tarihi başlangıç tarihinden önce olamaz!"));
      return;
    }

    if (!leaveForm.leave_country || !leaveForm.leave_type) {
      toast.error(t('err_leave_country_type_required', "Lütfen önce ülke / bölge ve izin türü seçin."));
      return;
    }

    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const payload = {
      ...leaveForm,
      employee_id: currentUserId,
      total_days: totalDays
    };

    const tLoading = toast.loading(t('msg_creating_leave', "İzin talebiniz oluşturuluyor..."));
    try {
      await leaveApi.requestLeave(payload);
      toast.success(t('msg_leave_success', "İzin talebiniz başarıyla yönetici onayına sunuldu!"), { id: tLoading });
      window.dispatchEvent(new Event('app:refresh-notifications'));
      setIsLeaveModalOpen(false);
      setLeaveForm({ start_date: '', end_date: '', leave_country: '', leave_type: '', reason: '' });
      fetchMyData(); 
    } catch (err) {
      toast.error(err.response?.data?.detail || t('err_leave_failed', "Talep oluşturulamadı."), { id: tLoading });
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if(profileForm.phone === data?.profile?.phone && profileForm.address === data?.profile?.address) {
       toast(t('msg_no_changes', "Bir değişiklik yapmadınız."), { icon: 'ℹ️' });
       return;
    }

    const tLoading = toast.loading(t('msg_sending_update', "Güncelleme talebiniz iletiliyor..."));
    try {
      await profileApi.requestUpdate(profileForm);
      toast.success(t('msg_update_success', "Değişiklik talebiniz onay için İK'ya gönderildi!"), { id: tLoading });
      setIsSettingsModalOpen(false); 
    } catch (err) { 
      toast.error(t('err_update_failed', "Talep iletilemedi. Lütfen tekrar deneyin."), { id: tLoading }); 
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) return toast.error(t('err_pwd_match', "Yeni şifreler eşleşmiyor!"));
    if (passwordForm.new_password.length < 6) return toast.error(t('err_pwd_length', "Şifre en az 6 karakter olmalıdır."));

    const tLoading = toast.loading(t('msg_changing_pwd', "Şifreniz değiştiriliyor..."));
    try {
      await api.put('/employee/me/change-password', { old_password: passwordForm.old_password, new_password: passwordForm.new_password });
      toast.success(t('msg_pwd_changed', "Şifreniz başarıyla değiştirildi!"), { id: tLoading });
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      setIsSettingsModalOpen(false);
    } catch (err) { 
      toast.error(err.response?.data?.detail || t('err_pwd_failed', "Şifre değiştirilemedi."), { id: tLoading }); 
    }
  };

  const handleMoodSelect = async (moodId) => {
    try {
      await api.post('/social/mood', { mood: moodId, note: '' });
      setCurrentMood(moodId);
      toast.success(t('msg_mood_success', "Ruh halin ekibe başarıyla iletildi!"));
    } catch (error) { 
      toast.error(t('err_mood_failed', "Ruh hali kaydedilemedi.")); 
    }
  };

  const availableLeaveTypes = leaveForm.leave_country
    ? (leaveCatalog.types_by_country?.[leaveForm.leave_country] || [])
    : [];

  const handleSendKudos = async (e) => {
    e.preventDefault();
    const tLoading = toast.loading(t('msg_sending_kudos', "Rozetiniz iletiliyor..."));
    try {
      await api.post('/social/kudos', kudosForm);
      toast.success(t('msg_kudos_success', "Teşekkür rozetiniz başarıyla gönderildi!"), { id: tLoading });
      setIsKudosModalOpen(false);
      setKudosForm({ receiver_id: '', badge: KUDOS_BADGES[0].id, message: '' });
      fetchSocialData(); 
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_kudos_failed', "Rozet gönderilemedi."), { id: tLoading });
    }
  };

  const openSettingsModal = () => {
    setProfileForm({ phone: data?.profile?.phone || '', address: data?.profile?.address || '' });
    setIsSettingsModalOpen(true);
  };

  const getActiveTrainings = () => {
    if (!data || !data.trainings) return [];
    const now = new Date().getTime();
    return data.trainings.filter(t => {
      if (t.status === 'CANCELLED') return false;
      const trainingDate = new Date(t.training_date);
      trainingDate.setHours(23, 59, 59, 999); 
      return trainingDate.getTime() >= now;
    });
  };

  if (loading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center font-sans">
        <Activity className="animate-pulse text-indigo-500 mb-4" size={56} />
        <p className="font-black text-slate-400 uppercase tracking-[0.2em] text-xs">{t('lbl_loading_portal', 'PORTALINIZ YÜKLENİYOR...')}</p>
      </div>
    );
  }

  const activeTrainings = getActiveTrainings();
  const currentDay = new Date().getDate();

  const getBadgeVisual = (badgeId) => {
    const b = KUDOS_BADGES.find(x => x.id === badgeId);
    return b ? <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${b.color}`}>{b.label}</span> : null;
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      
      <Toaster position={isArabic ? "top-left" : "top-right"} />

      {/* 🎯 KARŞILAMA ALANI */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-800 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shrink-0 group">
        <User className={`absolute -bottom-10 opacity-10 text-white group-hover:scale-110 transition-transform duration-700 pointer-events-none ${isArabic ? '-right-10' : '-left-10'}`} size={250} />
        
        <div className="relative z-10">
          <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase italic">{t('lbl_hello', 'MERHABA, {{name}} 👋').replace('{{name}}', userName.toLocaleUpperCase(locale))}</h1>
          <p className="text-indigo-200 font-bold flex items-center gap-2 uppercase tracking-[0.2em] text-xs bg-white/5 w-fit px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
            <Briefcase size={16} className="text-indigo-400"/> {data?.profile?.position?.toLocaleUpperCase(locale) || t('lbl_personnel', 'PERSONEL')} | {data?.profile?.department?.toLocaleUpperCase(locale) || t('lbl_general_dept', 'GENEL DEPARTMAN')}
          </p>
        </div>
        
        <button 
          onClick={openSettingsModal}
          className="relative z-10 bg-white/10 hover:bg-indigo-500 p-4 md:px-8 md:py-4 rounded-2xl backdrop-blur-md transition-all border border-white/10 flex items-center gap-3 shadow-lg active:scale-95 w-full sm:w-auto justify-center"
        >
          <Settings className="animate-[spin_4s_linear_infinite]" size={20}/>
          <span className="font-black text-xs uppercase tracking-[0.2em]">{t('btn_account_pwd', 'HESABIM / ŞİFRE')}</span>
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto custom-scrollbar pb-4 ${isArabic ? 'pl-2' : 'pr-2'}`}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 h-full">
          
          {/* ================= SOL SÜTUN ================= */}
          <div className="xl:col-span-2 space-y-8 flex flex-col">
            
            {/* HIZLI EYLEMLER */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 shrink-0">
               <button onClick={() => setIsLeaveModalOpen(true)} className={`bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-200 transition-all flex items-center gap-5 group ${isArabic ? 'text-right' : 'text-left'}`}>
                  <div className="bg-emerald-50 text-emerald-500 p-5 rounded-[1.5rem] group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0"><Calendar size={28}/></div>
                  <div>
                    <p className="font-black text-slate-800 uppercase text-sm mb-1 tracking-widest">{t('btn_req_new_leave', 'YENİ İZİN TALEP ET')}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg w-fit border border-slate-100">{t('lbl_used_this_year', 'BU YIL KULLANILAN: {{days}} GÜN').replace('{{days}}', data?.leave?.used_days || 0)}</p>
                  </div>
               </button>

               <button onClick={() => navigate('/expenses')} className={`bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-200 transition-all flex items-center gap-5 group ${isArabic ? 'text-right' : 'text-left'}`}>
                  <div className="bg-cyan-50 text-cyan-500 p-5 rounded-[1.5rem] group-hover:bg-cyan-500 group-hover:text-white transition-colors shrink-0"><Wallet size={28}/></div>
                  <div>
                    <p className="font-black text-slate-800 uppercase text-sm mb-1 tracking-widest">{t('btn_declare_expense', 'MASRAF BEYAN ET')}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg w-fit border border-slate-100">{t('lbl_receipt_invoice', 'FİŞ VE FATURA GİRİŞİ')}</p>
                  </div>
               </button>

               <button onClick={() => setIsKudosModalOpen(true)} className={`bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-rose-500/10 hover:border-rose-200 transition-all flex items-center gap-5 group ${isArabic ? 'text-right' : 'text-left'}`}>
                  <div className="bg-rose-50 text-rose-500 p-5 rounded-[1.5rem] group-hover:bg-rose-500 group-hover:text-white transition-colors shrink-0"><HeartHandshake size={28}/></div>
                  <div>
                    <p className="font-black text-slate-800 uppercase text-sm mb-1 tracking-widest">{t('btn_send_kudos_short', 'TEŞEKKÜR GÖNDER')}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg w-fit border border-slate-100">
                      {t('lbl_kudos_counts', 'ALINAN {{received}} • GÖNDERİLEN {{sent}}')
                        .replace('{{received}}', data?.social?.received_kudos_count || 0)
                        .replace('{{sent}}', data?.social?.sent_kudos_count || 0)}
                    </p>
                  </div>
               </button>
            </div>

            {/* MOOD TRACKER */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group shrink-0">
              <Smile className={`absolute -bottom-10 text-amber-50 w-48 h-48 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700 z-0 pointer-events-none ${isArabic ? '-right-10' : '-left-10'}`}/>
              
              <div className="relative z-10 text-center md:text-left">
                <h3 className="text-sm font-black text-slate-800 uppercase flex items-center justify-center md:justify-start gap-3 mb-2 tracking-[0.2em]">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><Smile size={18}/></div>
                  {t('lbl_how_do_you_feel', 'BUGÜN NASIL HİSSEDİYORSUN?')}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('lbl_share_mood', 'Ruh halini paylaş, ekibine enerji gönder!')}</p>
              </div>

              <div className="relative z-10 flex flex-wrap justify-center gap-3">
                {MOODS.map(m => (
                  <button 
                    key={m.id}
                    onClick={() => handleMoodSelect(m.id)}
                    className={`flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 ${currentMood === m.id ? 'bg-amber-50 border-amber-300 shadow-lg shadow-amber-200' : 'bg-white border-slate-100 hover:border-amber-200 hover:bg-slate-50'}`}
                    title={m.label}
                  >
                    <span className="text-2xl sm:text-3xl mb-1 drop-shadow-sm">{m.emoji}</span>
                    <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${currentMood === m.id ? 'text-amber-600' : 'text-slate-400'}`}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* EĞİTİM VE ZİMMET KARTLARI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col h-full">
                <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-3 mb-6 tracking-widest shrink-0">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><GraduationCap size={18}/></div>
                    {t('lbl_upcoming_trainings', 'YAKLAŞAN EĞİTİMLERİM')}
                </h3>
                <div className={`space-y-4 flex-1 overflow-y-auto custom-scrollbar ${isArabic ? 'pl-1' : 'pr-1'}`}>
                    {activeTrainings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50 text-slate-400 py-6">
                        <GraduationCap size={48} className="mb-3"/>
                        <p className="text-[10px] font-bold text-center uppercase tracking-widest">{t('lbl_no_trainings', 'PLANLANMIŞ VEYA YAKLAŞAN EĞİTİMİNİZ BULUNMUYOR.')}</p>
                    </div>
                    ) : (
                    activeTrainings.map(training => (
                        <div key={training.id} className={`flex justify-between items-center bg-indigo-50/50 border border-indigo-100 p-5 rounded-[1.5rem] hover:bg-indigo-50 transition-colors ${isArabic ? 'text-right' : 'text-left'}`}>
                        <div>
                            <p className="font-black text-slate-800 text-xs sm:text-sm mb-1 uppercase line-clamp-1" title={training.title}>{training.title}</p>
                            <p className={`text-[10px] font-bold text-slate-500 flex items-center gap-1.5 tracking-widest uppercase ${isArabic ? 'flex-row-reverse justify-end' : ''}`} dir="ltr">
                            <Clock size={12} className="text-indigo-400"/> {training.date} - {training.time}
                            </p>
                        </div>
                        <span className="bg-indigo-600 text-white text-[9px] px-3 py-1.5 rounded-lg font-black uppercase tracking-[0.2em] shadow-sm shrink-0">{t('lbl_participant', 'KATILIMCI')}</span>
                        </div>
                    ))
                    )}
                </div>
                </div>
                
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col h-full">
                <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-3 mb-6 tracking-widest shrink-0">
                    <div className="p-2 bg-rose-50 text-rose-500 rounded-xl"><ShieldCheck size={18}/></div>
                    {t('lbl_my_assets', 'ÜZERİMDEKİ ZİMMETLER')}
                </h3>
                <div className={`flex-1 overflow-y-auto custom-scrollbar ${isArabic ? 'pl-1' : 'pr-1'}`}>
                    {(!data?.assets || data.assets.length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50 text-slate-400 py-6">
                        <ShieldCheck size={48} className="mb-3"/>
                        <p className="text-[10px] font-bold text-center uppercase tracking-widest">{t('lbl_no_assets', 'ÜZERİNİZDE AKTİF ZİMMET YOK.')}</p>
                    </div>
                    ) : (
                    <div className="space-y-4">
                        {data.assets.map(a => (
                            <div key={a.id} className={`bg-rose-50/50 border border-rose-100 p-5 rounded-[1.5rem] flex items-center gap-4 hover:bg-rose-50 transition-colors ${isArabic ? 'text-right' : 'text-left'}`}>
                            <div className="p-3 bg-white rounded-xl shadow-sm text-rose-500 shrink-0"><ShieldCheck size={20}/></div>
                            <div className="min-w-0">
                                <p className="font-black text-xs sm:text-sm text-slate-800 uppercase truncate" title={a.asset_name}>{a.asset_name}</p>
                                <p className="text-[10px] font-bold text-rose-600 uppercase mt-1 tracking-[0.2em] truncate">{a.category}</p>
                            </div>
                            </div>
                        ))}
                    </div>
                    )}
                </div>
                </div>
            </div>

          </div>

          {/* ================= SAĞ SÜTUN ================= */}
          <div className="space-y-8 flex flex-col h-full">
            
            {/* KUTLAMALAR WIDGET'I */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 overflow-hidden relative group shrink-0 min-h-[250px] flex flex-col">
              <PartyPopper className={`absolute -bottom-10 text-emerald-50 w-48 h-48 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-700 pointer-events-none ${isArabic ? '-left-10' : '-right-10'}`} />
              
              <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-3 mb-6 tracking-widest relative z-10 shrink-0">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><PartyPopper size={18}/></div>
                {t('lbl_celebrations_this_month', 'BU AY KUTLUYORUZ!')}
              </h3>
              
              <div className={`space-y-4 relative z-10 flex-1 overflow-y-auto custom-scrollbar ${isArabic ? 'pl-2' : 'pr-2'}`}>
                {(!data?.celebrations || data.celebrations.length === 0) ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                    <PartyPopper size={40} className="mb-3"/>
                    <p className="text-[10px] font-bold text-center uppercase tracking-widest" dangerouslySetInnerHTML={{__html: t('lbl_no_celebrations', "BU AY KUTLANACAK BİR<br/>ETKİNLİK YOK.")}}></p>
                  </div>
                ) : (
                  data.celebrations.map((c, idx) => {
                    const isToday = c.day === currentDay;
                    const isPassed = c.day < currentDay;

                    return (
                      <div key={idx} className={`flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all ${isToday ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 border-emerald-500 scale-105 my-3' : isPassed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-emerald-200 hover:shadow-sm'}`}>
                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-inner ${isToday ? 'bg-white/20' : 'bg-emerald-50 text-emerald-600'}`}>
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1">{t('lbl_day', 'GÜN')}</span>
                          <span className="font-black text-xl leading-none">{c.day}</span>
                        </div>
                        <div className="min-w-0">
                          <p className={`font-black text-xs uppercase truncate ${isToday ? 'text-white' : 'text-slate-800'}`} title={c.name}>{c.name}</p>
                          <p className={`text-[9px] font-bold tracking-[0.2em] flex items-center gap-1.5 mt-1 uppercase ${isToday ? 'text-emerald-100' : 'text-slate-500'}`}>
                            {c.type === 'BIRTHDAY' ? <><PartyPopper size={12}/> {t('lbl_birthday', 'DOĞUM GÜNÜ')}</> : <><Star size={12}/> {t('lbl_anniversary', '{{years}}. YIL DÖNÜMÜ').replace('{{years}}', c.years)}</>}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* TAKDİR PANOSU WIDGET'I */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col h-[34rem] min-h-0 overflow-hidden">
              <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-100 pb-4">
                <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-3 tracking-widest">
                  <div className="p-2 bg-rose-50 text-rose-500 rounded-xl"><HeartHandshake size={18}/></div>
                  {t('lbl_kudos_board', 'TAKDİR PANOSU')}
                </h3>
                <button 
                  onClick={() => setIsKudosModalOpen(true)}
                  className="bg-rose-500 text-white hover:bg-rose-600 p-2 rounded-xl transition-all shadow-md active:scale-95 shrink-0"
                  title={t('tooltip_send_badge', "Rozet Gönder")}
                >
                  <PlusCircle size={20}/>
                </button>
              </div>
              
              <div className={`space-y-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar ${isArabic ? 'pl-2' : 'pr-2'}`}>
                {kudosFeed.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <Award size={48} className="mb-4"/>
                    <p className="text-[10px] font-bold text-center uppercase tracking-[0.2em]" dangerouslySetInnerHTML={{__html: t('lbl_no_kudos', "HENÜZ KİMSE ROZET GÖNDERMEDİ.<br/>İLK TEŞEKKÜR EDEN SEN OL!")}}></p>
                  </div>
                ) : (
                  kudosFeed.map(k => (
                    <div key={k.id} className="bg-slate-50/50 border border-slate-100 p-5 rounded-[1.5rem] relative group hover:shadow-md hover:bg-white hover:border-slate-200 transition-all">
                      <MessageSquare className={`absolute top-5 text-slate-200 group-hover:text-slate-300 transition-colors ${isArabic ? 'left-5' : 'right-5'}`} size={24}/>
                      <div className="mb-3">
                        {getBadgeVisual(k.badge)}
                      </div>
                      <p className={`text-xs font-bold text-slate-600 leading-relaxed mb-4 italic ${isArabic ? 'pl-8' : 'pr-8'}`}>"{k.message}"</p>
                      <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[8px] font-black">{k.sender[0]}</div>
                            <p className="text-[10px] font-black text-slate-800 uppercase">{k.sender}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-black text-rose-600 uppercase">{k.receiver}</p>
                            <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[8px] font-black">{k.receiver[0]}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* --- MODALLAR --- */}
      
      {/* KUDOS GÖNDERME MODALI */}
      {isKudosModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-rose-500 p-8 flex justify-between items-center text-white shrink-0">
              <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter italic">
                <div className="p-2 bg-rose-400 rounded-xl"><Award size={24}/></div>
                {t('modal_title_kudos', 'TEŞEKKÜR ROZETİ GÖNDER')}
              </h3>
              <button onClick={() => setIsKudosModalOpen(false)} className={`text-rose-200 hover:text-white transition-all ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={32}/></button>
            </div>
            
            <form onSubmit={handleSendKudos} className="p-10 space-y-8 bg-slate-50">
              <div>
                <label className={`text-[10px] font-black text-slate-500 uppercase block mb-3 tracking-[0.2em] ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_to_whom', 'KİME GÖNDERİYORSUNUZ?')} <span className="text-rose-500">*</span></label>
                <select required value={kudosForm.receiver_id} onChange={e => setKudosForm({...kudosForm, receiver_id: e.target.value})} className={`w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:border-rose-500 shadow-sm text-slate-700 transition-all appearance-none cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}>
                  <option value="" disabled>{t('opt_select_colleague', '-- Çalışma Arkadaşı Seçin --')}</option>
                  {colleagues.map(c => <option key={c.id} value={c.id}>{c.name.toLocaleUpperCase(locale)} ({c.department.toLocaleUpperCase(locale)})</option>)}
                </select>
              </div>

              <div>
                <label className={`text-[10px] font-black text-slate-500 uppercase block mb-3 tracking-[0.2em] ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_select_badge', 'ROZET SEÇİMİ')} <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 gap-4">
                  {KUDOS_BADGES.map(b => (
                    <button 
                      key={b.id} 
                      type="button" 
                      onClick={() => setKudosForm({...kudosForm, badge: b.id})}
                      className={`p-4 rounded-2xl border-2 text-[11px] font-black transition-all uppercase tracking-widest ${kudosForm.badge === b.id ? b.color + ' border-current shadow-md scale-105' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-100'}`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`text-[10px] font-black text-slate-500 uppercase block mb-3 tracking-[0.2em] ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_write_note', 'GÜZEL BİR NOT YAZIN')} <span className="text-rose-500">*</span></label>
                <textarea required rows="3" value={kudosForm.message} onChange={e => setKudosForm({...kudosForm, message: e.target.value})} placeholder={t('ph_kudos_note', "Yardımların için çok teşekkür ederim...")} className="w-full bg-white border-2 border-slate-200 p-5 rounded-[1.5rem] text-sm font-bold outline-none focus:border-rose-500 resize-none shadow-sm text-slate-700 transition-all"></textarea>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] hover:bg-rose-500 transition-all shadow-xl shadow-slate-900/20 flex justify-center items-center gap-3 active:scale-95">
                  <Send size={18} className={isArabic ? 'rotate-180' : ''}/> {t('btn_send_kudos', 'ROZETİ VE MESAJI GÖNDER')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* İZİN MODALI */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-500 p-8 flex justify-between items-center text-white shrink-0">
              <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter italic">
                <div className="p-2 bg-emerald-400 rounded-xl"><Calendar size={24}/></div>
                {t('modal_title_leave', 'İZİN TALEBİ OLUŞTUR')}
              </h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className={`text-emerald-200 hover:text-white transition-all ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={32}/></button>
            </div>
            
            <form onSubmit={handleLeaveRequest} className="p-10 space-y-8 bg-slate-50">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 text-center shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('lbl_used_leave', 'BU YIL KULLANILAN İZİN')}</p>
                <p className="text-4xl font-black text-emerald-500 tracking-tighter mt-1" dir="ltr">{data?.leave?.used_days || 0} <span className="text-lg">{t('lbl_days', 'GÜN')}</span></p>
              </div>

              <div>
                <label className={`text-[10px] font-black text-slate-500 uppercase block mb-3 tracking-[0.2em] ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_leave_country', 'ÜLKE / BÖLGE')} <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={leaveForm.leave_country}
                  onChange={e => setLeaveForm({...leaveForm, leave_country: e.target.value, leave_type: ''})}
                  className={`w-full bg-white border-2 border-slate-200 p-4 rounded-[1.5rem] text-sm font-black outline-none focus:border-emerald-500 shadow-sm text-slate-700 transition-all appearance-none cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}
                >
                  <option value="">{t('opt_select_country', 'Ülke / Bölge Seçin')}</option>
                  {(leaveCatalog.profiles || []).map(profile => (
                    <option key={profile.code} value={profile.code}>{profile.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`text-[10px] font-black text-slate-500 uppercase block mb-3 tracking-[0.2em] ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_leave_type', 'İZİN TÜRÜ')} <span className="text-rose-500">*</span></label>
                <select
                  required
                  disabled={!leaveForm.leave_country}
                  value={leaveForm.leave_type}
                  onChange={e => setLeaveForm({...leaveForm, leave_type: e.target.value})}
                  className={`w-full bg-white border-2 border-slate-200 p-4 rounded-[1.5rem] text-sm font-black outline-none focus:border-emerald-500 shadow-sm text-slate-700 transition-all appearance-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}
                >
                  <option value="">{t('opt_select_leave_type', 'Önce izin profili seçin')}</option>
                  {availableLeaveTypes.map(item => (
                    <option key={item.code} value={item.code}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={`text-[10px] font-black text-slate-500 uppercase block mb-3 tracking-[0.2em] ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_start', 'BAŞLANGIÇ')} <span className="text-rose-500">*</span></label>
                  <input required type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({...leaveForm, start_date: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-[1.5rem] text-sm font-black outline-none focus:border-emerald-500 shadow-sm text-slate-700 transition-all"/>
                </div>
                <div>
                  <label className={`text-[10px] font-black text-slate-500 uppercase block mb-3 tracking-[0.2em] ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_end', 'BİTİŞ')} <span className="text-rose-500">*</span></label>
                  <input required type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({...leaveForm, end_date: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-[1.5rem] text-sm font-black outline-none focus:border-emerald-500 shadow-sm text-slate-700 transition-all"/>
                </div>
              </div>

              <div>
                <label className={`text-[10px] font-black text-slate-500 uppercase block mb-3 tracking-[0.2em] ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_reason', 'AÇIKLAMA / SEBEP')}</label>
                <textarea rows="3" value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} placeholder={t('ph_reason', "Kısa bir açıklama yazabilirsiniz...")} className="w-full bg-white border-2 border-slate-200 p-5 rounded-[1.5rem] text-sm font-bold outline-none focus:border-emerald-500 resize-none shadow-sm text-slate-700 transition-all"></textarea>
              </div>

              <div className={`flex gap-4 pt-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                 <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-500 font-black py-5 rounded-[2rem] uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 transition-all shadow-sm">{t('btn_cancel', 'İPTAL')}</button>
                 <button type="submit" className={`flex-[2] bg-emerald-500 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/30 flex justify-center items-center gap-3 active:scale-95 ${isArabic ? 'flex-row-reverse' : ''}`}>
                   <Send size={18} className={isArabic ? 'rotate-180' : ''}/> {t('btn_submit_approval', 'TALEBİ ONAYA GÖNDER')}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AYARLAR MODALI */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white shrink-0">
              <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter italic">
                <div className="p-2 bg-indigo-500 rounded-xl"><Settings size={24}/></div>
                {t('modal_title_settings', 'HESAP AYARLARI')}
              </h3>
              <button onClick={() => setIsSettingsModalOpen(false)} className={`text-slate-500 hover:text-white transition-all ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={32}/></button>
            </div>
            
            <div className={`flex bg-slate-50 p-3 border-b border-slate-200 shrink-0 gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <button onClick={() => setActiveTab('PROFILE')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all ${activeTab === 'PROFILE' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>{t('tab_contact', 'İLETİŞİM BİLGİLERİ')}</button>
              <button onClick={() => setActiveTab('PASSWORD')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all ${activeTab === 'PASSWORD' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>{t('tab_password', 'ŞİFRE DEĞİŞTİR')}</button>
            </div>

            <div className="p-10 bg-slate-50 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {activeTab === 'PROFILE' && (
                <form onSubmit={handleProfileUpdate} className="space-y-8 animate-in fade-in">
                  <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex items-start gap-4 shadow-sm">
                    <User className="text-indigo-500 shrink-0" size={28} />
                    <div>
                      <p className="text-[11px] font-black text-indigo-800 uppercase tracking-[0.2em] mb-1">{t('lbl_update_req', 'GÜNCELLEME TALEBİ')}</p>
                      <p className="text-xs font-bold text-indigo-600/80 leading-relaxed italic">{t('desc_update_req', 'Burada yaptığınız değişiklikler "Taslak" olarak İnsan Kaynakları departmanına iletilir. Onaylandığında resmi dosyanıza işlenir.')}</p>
                    </div>
                  </div>
                  <div>
                    <label className={`text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-3 tracking-[0.2em] ${isArabic ? 'mr-1' : 'ml-1'}`}><Phone size={14} className="text-indigo-500"/> {t('lbl_phone', 'TELEFON NUMARASI')}</label>
                    <input type="text" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} placeholder={t('ph_phone', "05XX XXX XX XX")} className="w-full bg-white border-2 border-slate-200 p-5 rounded-[1.5rem] text-sm font-black outline-none focus:border-indigo-500 shadow-sm text-slate-700 transition-all" dir="ltr"/>
                  </div>
                  <div>
                    <label className={`text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-3 tracking-[0.2em] ${isArabic ? 'mr-1' : 'ml-1'}`}><MapPin size={14} className="text-indigo-500"/> {t('lbl_address', 'İKAMETGAH ADRESİ')}</label>
                    <textarea rows="4" value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} placeholder={t('ph_address', "Açık adresinizi giriniz...")} className="w-full bg-white border-2 border-slate-200 p-5 rounded-[1.5rem] text-sm font-bold outline-none focus:border-indigo-500 resize-none shadow-sm text-slate-700 transition-all"></textarea>
                  </div>
                  <div className="pt-2">
                    <button type="submit" className={`w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 flex justify-center items-center gap-3 active:scale-95 ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <Send size={18} className={isArabic ? 'rotate-180' : ''}/> {t('btn_submit_approval', 'TALEBİ ONAYA GÖNDER')}
                    </button>
                  </div>
                </form>
              )}
              {activeTab === 'PASSWORD' && (
                <form onSubmit={handlePasswordChange} className="space-y-8 animate-in fade-in">
                  <div>
                    <label className={`text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-3 tracking-[0.2em] ${isArabic ? 'mr-1' : 'ml-1'}`}><Lock size={14} className="text-slate-400"/> {t('lbl_old_pwd', 'MEVCUT ŞİFRENİZ')}</label>
                    <input required type="password" value={passwordForm.old_password} onChange={e => setPasswordForm({...passwordForm, old_password: e.target.value})} placeholder={t('ph_old_pwd', "Sisteme girerken kullandığınız şifre")} className="w-full bg-white border-2 border-slate-200 p-5 rounded-[1.5rem] text-sm font-black outline-none focus:border-rose-500 shadow-sm text-slate-700 transition-all" dir="ltr"/>
                  </div>
                  <div className="pt-6 border-t-2 border-dashed border-slate-200 space-y-6">
                    <div>
                        <label className={`text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-3 tracking-[0.2em] ${isArabic ? 'mr-1' : 'ml-1'}`}><Lock size={14} className="text-emerald-500"/> {t('lbl_new_pwd', 'YENİ ŞİFRENİZ')}</label>
                        <input required type="password" value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} placeholder={t('ph_new_pwd', "En az 6 karakter")} className="w-full bg-white border-2 border-slate-200 p-5 rounded-[1.5rem] text-sm font-black outline-none focus:border-emerald-500 shadow-sm text-slate-700 transition-all" dir="ltr"/>
                    </div>
                    <div>
                        <label className={`text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-3 tracking-[0.2em] ${isArabic ? 'mr-1' : 'ml-1'}`}><CheckCircle size={14} className="text-emerald-500"/> {t('lbl_confirm_pwd', 'YENİ ŞİFRE (TEKRAR)')}</label>
                        <input required type="password" value={passwordForm.confirm_password} onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} placeholder={t('ph_confirm_pwd', "Yeni şifrenizi doğrulayın")} className="w-full bg-white border-2 border-slate-200 p-5 rounded-[1.5rem] text-sm font-black outline-none focus:border-emerald-500 shadow-sm text-slate-700 transition-all" dir="ltr"/>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button type="submit" className={`w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-500 transition-all shadow-xl shadow-slate-900/20 flex justify-center items-center gap-3 active:scale-95 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <Lock size={18}/> {t('btn_change_pwd', 'ŞİFREMİ DEĞİŞTİR')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeePortal;

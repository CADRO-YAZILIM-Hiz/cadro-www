import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { kpiApi } from '../api/axios'; 
import {
  Briefcase, Users, Heart, Megaphone, ChevronRight, Inbox, Wind, LayoutDashboard, Target,
  Bell, ArrowRight, ChevronLeft, BarChart3, TrendingDown, TrendingUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi
import { localizeDigits } from '../utils/localizeNumber';
import { hasPermission } from '../auth/permissions';
import { getNotificationBadgeMap } from '../utils/notificationCounts';

const Dashboard = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası eklendi
  const navigate = useNavigate();

  // 🌍 Dinamik toLocaleUpperCase ve RTL için dil tespiti
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);
  const userRole = localStorage.getItem('user_role') || 'EMPLOYEE';
  const canViewRequestForms = hasPermission(userRole, 'generic_requests.view_workspace');
  
  const [atsJobs, setAtsJobs] = useState([]);
  const [kudosList, setKudosList] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [headcount, setHeadcount] = useState({ onSite: 0, onLeave: 0 });
  const [kpiSummary, setKpiSummary] = useState({
    current_range: { total_metrics: 0, total_value: 0 },
    previous_range: { total_metrics: 0, total_value: 0 },
    delta_value: 0,
    system_metrics: {},
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [systemNotifications, setSystemNotifications] = useState([
    t('notif_loading', "📢 Kokpit yükleniyor, lütfen bekleyin...") // 🌍 Çeviri Eklendi
  ]);
  const [notifIndex, setNotifIndex] = useState(0);

  const kpiPulseCards = useMemo(() => {
    if (userRole === 'MANAGER') {
      return [
        {
          key: 'absence_rate_today',
          label: t('lbl_system_absence_rate_today', 'Bugün Devamsızlık'),
          value: `%${localizedNumber(kpiSummary.system_metrics?.absence_rate_today || 0, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
          tone: 'rose',
        },
        {
          key: 'leave_coverage_rate_today',
          label: t('lbl_system_leave_coverage_rate_today', 'Bugün İzin Oranı'),
          value: `%${localizedNumber(kpiSummary.system_metrics?.leave_coverage_rate_today || 0, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
          tone: 'amber',
        },
      ];
    }

    return [
      {
        key: 'leave_usage_rate',
        label: t('lbl_system_leave_usage_rate', 'Dönem İzin Kullanımı'),
        value: `%${localizedNumber(kpiSummary.system_metrics?.leave_usage_rate || 0, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
        tone: 'amber',
      },
      {
        key: 'turnover_rate',
        label: t('lbl_system_turnover_rate', 'Dönem Devir Oranı'),
        value: `%${localizedNumber(kpiSummary.system_metrics?.turnover_rate || 0, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
        tone: 'indigo',
      },
    ];
  }, [kpiSummary.system_metrics, localizedNumber, t, userRole]);

  const navigateToFilteredKpi = (cardKey) => {
    const dateToday = new Date().toISOString().slice(0, 10);
    const params = new URLSearchParams();

    if (cardKey === 'absence_rate_today' || cardKey === 'leave_coverage_rate_today') {
      params.set('category', 'ABSENCE');
      params.set('start_date', dateToday);
      params.set('end_date', dateToday);
    } else if (cardKey === 'leave_usage_rate') {
      params.set('category', 'ABSENCE');
    } else if (cardKey === 'turnover_rate') {
      params.set('category', 'HEADCOUNT');
    }

    navigate(`/kpi-statistics${params.toString() ? `?${params.toString()}` : ''}`);
  };

  useEffect(() => {
    if (systemNotifications.length <= 1) return; 
    const interval = setInterval(() => {
      setNotifIndex((prev) => (prev + 1) % systemNotifications.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [systemNotifications]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setErrorMsg(null); 
      
      try {
        const resSummary = await api.get('/dashboard/summary'); 
        const summaryData = resSummary.data;

        const totalEmps = summaryData?.cards?.total_employees || 0;
        const onLeave = summaryData?.cards?.on_leave_today || 0;

        setHeadcount({
          onSite: totalEmps > onLeave ? totalEmps - onLeave : 0,
          onLeave: onLeave
        });

        const fetchedAnnouncements = summaryData?.social?.announcements;
        setAnnouncements(Array.isArray(fetchedAnnouncements) ? fetchedAnnouncements : []);

        try {
          const resAts = await api.get('/ats/jobs');
          const safeJobs = Array.isArray(resAts.data)
            ? resAts.data.map((job) => ({
                ...job,
                candidates: (job.candidates || []).filter((candidate) => candidate.stage !== 'ISE_ALINDI'),
              }))
            : [];
          setAtsJobs(safeJobs);
        } catch (atsError) {
          console.error(t('err_fetch_ats', "ATS verisi çekilemedi:"), atsError);
        }

        try {
          const resKudos = await api.get('/social/kudos/feed');
          if (Array.isArray(resKudos.data)) {
            const formattedKudos = resKudos.data.map(k => {
              const senderName = k.sender || t('unknown_user', 'Bilinmeyen Kullanıcı');
              const initials = senderName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
              return {
                id: k.id,
                initials: initials,
                from: senderName.toLocaleUpperCase(locale),
                to: k.receiver?.toLocaleUpperCase(locale),
                message: k.message,
                badge: k.badge
              };
            });
            setKudosList(formattedKudos);
          }
        } catch (kudosError) {
          console.error(t('err_fetch_kudos', "Kudos akışı çekilemedi:"), kudosError);
        }

        try {
          const resNotif = await api.get('/notification/unread-count');
          const notifDetails = resNotif.data?.details || {};
          const dynamicNotifs = [];
          const badges = getNotificationBadgeMap(notifDetails, canViewRequestForms);

          if (badges.leaves > 0) {
            dynamicNotifs.push(`🔔 ${t('notif_pending_leaves', "{{count}} adet yıllık izin talebi onayınızı bekliyor.").replace('{{count}}', localizedNumber(badges.leaves))}`);
          }
          if (badges.expenses > 0) {
            dynamicNotifs.push(`💳 ${t('notif_pending_expenses', "{{count}} adet masraf beyanı onayınızı bekliyor.").replace('{{count}}', localizedNumber(badges.expenses))}`);
          }
          if (badges.dossier > 0) {
            dynamicNotifs.push(`📂 ${t('notif_pending_documents', "{{count}} adet evrak onayınızı bekliyor.").replace('{{count}}', localizedNumber(badges.dossier))}`);
          }
          if (badges.purchaseRequests > 0) {
            dynamicNotifs.push(`🛒 ${t('notif_pending_purchase_requests', "{{count}} adet satın alma talebi işlem bekliyor.").replace('{{count}}', localizedNumber(badges.purchaseRequests))}`);
          }
          if (canViewRequestForms && badges.requestForms > 0) {
            dynamicNotifs.push(`🧾 ${t('notif_open_generic_requests', "{{count}} adet kurumsal talep işlem bekliyor.").replace('{{count}}', localizedNumber(badges.requestForms))}`);
          }
          if (badges.helpdesk > 0) {
            dynamicNotifs.push(`⚠️ ${t('notif_open_tickets', "IT/Destek departmanında {{count}} adet açık talep (ticket) var.").replace('{{count}}', localizedNumber(badges.helpdesk))}`);
          }
          if (badges.knowledgeBase > 0) {
            dynamicNotifs.push(`📘 ${t('notif_pending_policy_acknowledgements', "{{count}} adet politika içeriği okuma veya onay bekliyor.").replace('{{count}}', localizedNumber(badges.knowledgeBase))}`);
          }

          if (notifDetails.dossier_missing_required_documents > 0) {
            dynamicNotifs.push(`🧩 ${t('notif_dossier_missing_required_documents', "{{count}} adet zorunlu evrak eksiği gözden geçirilmeyi bekliyor.").replace('{{count}}', localizedNumber(notifDetails.dossier_missing_required_documents))}`);
          }
          if (notifDetails.dossier_expired_documents > 0) {
            dynamicNotifs.push(`📛 ${t('notif_dossier_expired_documents', "{{count}} adet evrakın süresi dolmuş görünüyor.").replace('{{count}}', localizedNumber(notifDetails.dossier_expired_documents))}`);
          }
          if (notifDetails.dossier_expiring_documents > 0) {
            dynamicNotifs.push(`⏳ ${t('notif_dossier_expiring_documents', "{{count}} adet evrak yakında sona erecek.").replace('{{count}}', localizedNumber(notifDetails.dossier_expiring_documents))}`);
          }

          if (dynamicNotifs.length === 0) {
            dynamicNotifs.push(`🎉 ${t('notif_all_clear', "Şu anda beklemede olan onay işleminiz bulunmuyor. Harika bir gün!")}`);
            if (fetchedAnnouncements && fetchedAnnouncements.length > 0) {
              dynamicNotifs.push(`📢 ${t('notif_last_announcement', "Son Duyuru: {{title}}").replace('{{title}}', fetchedAnnouncements[0].title)}`);
            }
          }

          setSystemNotifications(dynamicNotifs);

        } catch (notifError) {
          console.error("Bildirimler çekilemedi:", notifError);
          setSystemNotifications([`📢 ${t('notif_welcome', "Sisteme hoş geldiniz, iyi çalışmalar dileriz.")}`]);
        }

        try {
          const resKpi = await kpiApi.getSummary();
          setKpiSummary(resKpi.data || {
            current_range: { total_metrics: 0, total_value: 0 },
            previous_range: { total_metrics: 0, total_value: 0 },
            delta_value: 0,
            system_metrics: {},
          });
        } catch (kpiError) {
          console.error("KPI özeti çekilemedi:", kpiError);
        }

      } catch (error) {
        console.error("Dashboard verileri çekilemedi", error);
        setErrorMsg(t('err_server_unreachable', "Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin."));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    window.addEventListener('app:refresh-notifications', fetchDashboardData);
    return () => {
      window.removeEventListener('app:refresh-notifications', fetchDashboardData);
    };
  }, [t, locale, canViewRequestForms]);

  // 🎯 YENİ: Akıllı Yönlendirme Motoru (Dile göre kelime yakalama)
  const handleSmartNavigation = () => {
    const currentText = systemNotifications[notifIndex]?.toLowerCase() || "";
    
    // TR, EN, DE, AR dillerindeki anahtar kelimeleri kontrol et
    if (currentText.includes("sağlık kaydı") || currentText.includes("health record") || currentText.includes("gesundheitsdaten") || currentText.includes("السجل الصحي")) {
      navigate('/request-forms?request_type=HEALTH_RECORD_CORRECTION');
    } else if (currentText.includes("satın alma") || currentText.includes("purchase request") || currentText.includes("beschaffungs") || currentText.includes("الشراء")) {
      navigate('/purchase-requests');
    } else if (currentText.includes("politika") || currentText.includes("policy") || currentText.includes("richtlinien") || currentText.includes("سياسة")) {
      navigate('/knowledge-base');
    } else if (currentText.includes("kurumsal talep") || currentText.includes("corporate request") || currentText.includes("unternehmens") || currentText.includes("الطلبات المؤسسية")) {
      navigate('/request-forms');
    } else if (currentText.includes("izin") || currentText.includes("leave") || currentText.includes("urlaub") || currentText.includes("إجازة")) {
      navigate('/leaves');
    } else if (currentText.includes("masraf") || currentText.includes("expense") || currentText.includes("ausgaben") || currentText.includes("نفقة")) {
      navigate('/expenses');
    } else if (currentText.includes("evrak") || currentText.includes("document") || currentText.includes("dokument") || currentText.includes("مستند")) {
      navigate('/e-dossier');
    } else if (currentText.includes("talep") || currentText.includes("ticket") || currentText.includes("anfrage") || currentText.includes("طلب")) {
      navigate('/helpdesk');
    } else {
      navigate('/leaves');
    }
  };

  return (
    <div className="h-full flex flex-col relative font-sans animate-in fade-in duration-500" dir={isArabic ? 'rtl' : 'ltr'}>
      
      {errorMsg && (
        <div className={`bg-rose-50 border-rose-500 text-rose-700 p-4 mb-6 shadow-sm shrink-0 ${isArabic ? 'border-r-4 rounded-l-xl' : 'border-l-4 rounded-r-xl'}`}>
          <p className="font-bold text-sm">{t('lbl_dashboard_warning', 'Kokpit Yükleme Uyarısı')}</p>
          <p className="text-xs">{errorMsg}</p>
        </div>
      )}

      {/* ================= 1. HIZLI İŞLEMLER VE BİLDİRİM ÇUBUĞU ================= */}
      <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 mb-8 shrink-0 w-full">
        
        {/* SOL: MODERN BİLDİRİM ÇUBUĞU */}
        <div className="flex-1 w-full bg-slate-900 rounded-[2rem] p-2 flex items-center shadow-xl shadow-slate-900/10 border border-slate-800">
          <div className="bg-cyan-500/20 text-cyan-400 p-2.5 md:p-3 rounded-2xl shrink-0">
            <Bell size={18} className="animate-pulse" />
          </div>
          <div className="flex-1 overflow-hidden px-4 relative h-6 flex items-center">
             <p 
               key={notifIndex} 
               className="text-slate-200 font-semibold text-[11px] tracking-wide absolute animate-in slide-in-from-bottom-4 fade-in duration-500 truncate w-full uppercase"
             >
               {systemNotifications[notifIndex]?.toLocaleUpperCase(locale)}
             </p>
          </div>
          
          {/* 🎯 GÜNCELLEME: Yönlendirme fonksiyonu bağlandı! */}
          <button 
            onClick={handleSmartNavigation}
            className="text-cyan-400 hover:text-cyan-300 font-bold text-[10px] tracking-widest uppercase px-4 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
          >
            {t('btn_view_all', 'TÜMÜNÜ GÖR')} {isArabic ? <ChevronLeft size={14}/> : <ArrowRight size={14}/>}
          </button>
        </div>

        {/* SAĞ: AKSİYON BUTONLARI */}
        <div className="flex gap-3 shrink-0 w-full xl:w-auto h-full">
          <button 
            onClick={() => navigate('/ats')}
            className="flex-1 xl:flex-none bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3.5 md:py-4 rounded-[1.5rem] font-bold transition-all shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase active:scale-95"
          >
            <Briefcase size={16} /> {t('btn_new_job_posting', 'YENİ İLAN AÇ')}
          </button>
          <button 
            onClick={() => navigate('/employees')}
            className="flex-1 xl:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 md:py-4 rounded-[1.5rem] font-bold transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase active:scale-95"
          >
            <Users size={16} /> {t('btn_go_to_roster', 'KADROYA GİT')}
          </button>
        </div>
      </div>

      {/* ================= 2. HİBRİT PANO (İÇERİK ALANI) 🎯 GRID YAPI ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4 flex-1 h-[calc(100vh-250px)]">
        
        {/* === SOL KOLON === */}
        <div className="flex flex-col gap-6 h-full">
          
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col h-[28rem] max-h-[28rem] min-h-0 overflow-hidden">
            <div className="flex justify-between items-center mb-4 shrink-0 border-b border-slate-100 pb-4">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <div className="p-2 bg-indigo-50 rounded-xl"><Briefcase size={16} className="text-indigo-600"/></div>
                {t('lbl_ats_summary', 'İŞE ALIM (ATS) ÖZETİ')}
              </h3>
              <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase tracking-widest shadow-inner">
                {t('lbl_active_jobs', '{{count}} AKTİF İLAN').replace('{{count}}', localizedNumber(atsJobs.length))}
              </span>
            </div>
            
            <div className={`space-y-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar ${isArabic ? 'pl-2' : 'pr-2'}`}>
              {loading ? (
                 <div className="flex items-center justify-center h-full text-slate-400 font-semibold text-xs uppercase tracking-widest">{t('lbl_loading', 'Yükleniyor...')}</div>
              ) : atsJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-60">
                  <Wind size={48} className="mb-3" />
                  <p className="text-[10px] font-bold tracking-widest text-center uppercase leading-relaxed" dangerouslySetInnerHTML={{__html: t('msg_no_active_jobs_html', "ŞU AN AKTİF BİR İŞ İLANI<br/>BULUNMUYOR")}}></p>
                </div>
              ) : (
                atsJobs.map((job, idx) => (
                  <div 
                    key={job.id || `job-${idx}`} 
                    onClick={() => navigate('/ats')}
                    className="p-4 rounded-[1.25rem] border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all group cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 uppercase mb-1">{job.title?.toLocaleUpperCase(locale) || t('lbl_unnamed_job', "İSİMSİZ İLAN")}</h4>
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-fit uppercase tracking-wider border border-emerald-100 shadow-sm">
                        <Users size={10}/> {t('lbl_candidates_waiting', '{{count}} Aday Bekliyor').replace('{{count}}', localizedNumber(Array.isArray(job.candidates) ? job.candidates.length : 0))}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                      {isArabic ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 shrink-0 h-48">
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden flex flex-col justify-center">
              <h3 className="text-[10px] font-bold flex items-center gap-2 text-indigo-300 mb-6 relative z-10 uppercase tracking-widest">
                <div className="p-2 bg-indigo-800 rounded-lg"><Users size={14} className="text-indigo-200"/></div>
                {t('lbl_daily_roster', 'GÜNÜN KADRO DURUMU')}
              </h3>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
                  <p className="text-[9px] font-bold text-indigo-300 mb-1 tracking-widest uppercase flex items-center gap-1.5"><Target size={12}/> {t('lbl_on_site', 'ŞU AN SAHADA')}</p>
                  <p className="text-3xl font-black">{localizedNumber(headcount.onSite)} <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">{t('lbl_person', 'Kişi')}</span></p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
                  <p className="text-[9px] font-bold text-amber-300 mb-1 tracking-widest uppercase flex items-center gap-1.5"><Wind size={12}/> {t('lbl_on_leave', 'İZİNLİ / RAPORLU')}</p>
                  <p className="text-3xl font-black text-amber-400">{localizedNumber(headcount.onLeave)} <span className="text-xs font-semibold text-amber-200 uppercase tracking-wide">{t('lbl_person', 'Kişi')}</span></p>
                </div>
              </div>
              <LayoutDashboard className={`absolute -bottom-10 w-48 h-48 text-indigo-500 opacity-10 pointer-events-none rotate-12 ${isArabic ? '-left-10' : '-right-10'}`} />
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/kpi-statistics')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate('/kpi-statistics');
                }
              }}
              className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 text-left flex flex-col justify-between hover:border-emerald-200 hover:shadow-emerald-100/40 transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-600">
                  <div className="p-2 bg-emerald-50 rounded-xl"><BarChart3 size={16} className="text-emerald-600" /></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.22em]">{t('lbl_kpi_pulse', 'KPI Nabzı')}</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {localizedNumber(kpiSummary.current_range?.total_metrics || 0)} {t('lbl_record', 'Kayıt')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{t('lbl_selected_period_total', 'Seçili Dönem Toplam')}</p>
                  <p className="mt-2 text-xl font-black text-slate-800 leading-tight break-words" dir="ltr">
                    {localizedNumber(kpiSummary.current_range?.total_value || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{t('lbl_period_delta', 'Önceki Dönem Farkı')}</p>
                  <div className={`mt-2 flex items-center gap-2 ${kpiSummary.delta_value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {kpiSummary.delta_value >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <p className="text-xl font-black leading-tight break-words" dir="ltr">
                      {kpiSummary.delta_value >= 0 ? '+' : ''}{localizedNumber(kpiSummary.delta_value || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {kpiPulseCards.map((card) => (
                  <button
                    key={card.key}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigateToFilteredKpi(card.key);
                    }}
                    className={`rounded-2xl px-4 py-3 border ${
                      card.tone === 'rose'
                        ? 'bg-rose-50 border-rose-100'
                        : card.tone === 'amber'
                          ? 'bg-amber-50 border-amber-100'
                          : 'bg-indigo-50 border-indigo-100'
                    } text-left hover:shadow-md transition-all`}
                  >
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${
                      card.tone === 'rose'
                        ? 'text-rose-500'
                        : card.tone === 'amber'
                          ? 'text-amber-500'
                          : 'text-indigo-500'
                    }`}>
                      {card.label}
                    </p>
                    <p
                      className={`mt-2 text-lg font-black ${
                        card.tone === 'rose'
                          ? 'text-rose-700'
                          : card.tone === 'amber'
                            ? 'text-amber-700'
                            : 'text-indigo-700'
                      }`}
                      dir="ltr"
                    >
                      {card.value}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <span>{t('lbl_open_statistics_screen', 'Detay için KPI ekranını aç')}</span>
                {isArabic ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>
          </div>

        </div>

        {/* === SAĞ KOLON === */}
        <div className="flex flex-col gap-6 h-full">
          
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col h-[28rem] min-h-0 overflow-hidden">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-4 shrink-0 border-b border-slate-100 pb-4 uppercase tracking-wide">
              <div className="p-2 bg-rose-50 rounded-xl"><Heart size={16} className="text-rose-500 fill-rose-500"/></div>
              {t('lbl_kudos_title', 'TEŞEKKÜR & TAKDİR (KUDOS)')}
            </h3>
            
            <div className={`space-y-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar ${isArabic ? 'pl-2' : 'pr-2'}`}>
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400 font-semibold text-xs uppercase tracking-widest">{t('lbl_loading', 'Yükleniyor...')}</div>
              ) : kudosList.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-rose-200 opacity-60">
                 <Heart size={48} className="mb-3" />
                 <p className="text-[10px] font-bold tracking-widest text-center uppercase leading-relaxed" dangerouslySetInnerHTML={{__html: t('msg_no_kudos_html', "HENÜZ BİR TEŞEKKÜR YOK.<br/>İLK TAKDİRİ SEN GÖNDER!")}}></p>
               </div>
              ) : (
                kudosList.map((kudo, idx) => (
                  <div key={kudo.id || `kudo-${idx}`} className="bg-rose-50/50 p-4 rounded-[1.25rem] border border-rose-100 flex gap-3 hover:bg-rose-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-rose-200 text-rose-600 flex items-center justify-center font-black text-sm shrink-0 shadow-inner border border-rose-300">{kudo.initials}</div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                        {t('lbl_kudos_sentence', {
                          from: kudo.from,
                          to: kudo.to,
                          defaultValue: '{{from}}, {{to}}\'ya teşekkür etti.',
                        })}
                      </p>
                      <p className="text-xs font-medium text-slate-700 italic">"{kudo.message}"</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-slate-900/20 flex flex-col shrink-0 relative overflow-hidden h-48">
            <h3 className="text-[10px] font-bold flex items-center gap-2 text-cyan-400 mb-4 shrink-0 relative z-10 uppercase tracking-widest">
              <div className="p-2 bg-cyan-500/20 rounded-lg"><Megaphone size={14} className="text-cyan-400"/></div>
              {t('lbl_company_news', 'ŞİRKET HABERLERİ & DUYURULAR')}
            </h3>
            
            <div className={`space-y-3 flex-1 overflow-y-auto custom-scrollbar relative z-10 ${isArabic ? 'pl-2' : 'pr-2'}`}>
              {loading ? (
                  <div className="flex items-center justify-center h-full text-slate-500 font-semibold text-xs uppercase tracking-widest">{t('lbl_loading', 'Yükleniyor...')}</div>
              ) : announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 mt-1">
                  <Inbox size={32} className="mb-2" />
                  <p className="text-[10px] font-bold tracking-widest text-center uppercase" dangerouslySetInnerHTML={{__html: t('msg_no_announcement_html', "GÜNCEL BİR DUYURU<br/>BULUNMUYOR")}}></p>
                </div>
              ) : (
                announcements.map((ann, idx) => (
                   <div key={ann.id || `ann-${idx}`} className={`bg-white/10 border-y border-white/10 p-4 hover:bg-white/15 transition-colors cursor-default ${isArabic ? 'border-r-4 border-r-cyan-400 border-l rounded-l-xl' : 'border-l-4 border-l-cyan-400 border-r rounded-r-xl'}`}>
                    <h4 className="font-bold text-xs text-slate-50 mb-1.5 uppercase tracking-wide">{ann.title?.toLocaleUpperCase(locale)}</h4>
                    <p className="text-[11px] font-semibold text-slate-100 leading-relaxed">{ann.content}</p>
                  </div>
                ))
              )}
            </div>
            <Megaphone className={`absolute -bottom-4 w-32 h-32 text-slate-800 opacity-50 pointer-events-none ${isArabic ? '-left-4 rotate-12' : '-right-4 -rotate-12'}`} />
          </div>

        </div>
      </div>

    </div>
  );
};

export default Dashboard;

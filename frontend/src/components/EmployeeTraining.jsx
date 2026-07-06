import React, { useState, useEffect } from 'react';
import { GraduationCap, Calendar, Clock, MapPin, Activity, CheckCircle2, User, AlertTriangle, BookOpen } from 'lucide-react';
import { trainingApi } from '../api/axios';
import toast, { Toaster } from 'react-hot-toast'; 
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi

const EmployeeTraining = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası eklendi

  // 🌍 Dinamik toLocaleUpperCase ve RTL için dil tespiti
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';

  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const employeeId = parseInt(localStorage.getItem('user_id'), 10); 

  useEffect(() => {
    if (employeeId) {
      fetchMyTrainings();
    } else {
      toast.error(t('err_session_expired', "Oturum süreniz dolmuş olabilir, lütfen tekrar giriş yapın."));
      setLoading(false);
    }
  }, [employeeId]);

  const fetchMyTrainings = async () => {
    setLoading(true);
    try {
      const res = await trainingApi.getTrainings();
      const allTrainings = res.data || [];
      setTrainings(Array.isArray(allTrainings) ? allTrainings : []); 
    } catch (error) {
      toast.error(t('err_fetch_trainings', "Eğitim takviminiz çekilemedi."));
      console.error("Eğitim hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🌍 Tarih Formatlayıcı
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(locale);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-in fade-in duration-500 font-sans">
        <Activity className="animate-pulse text-indigo-500 mb-4" size={56} />
        <p className="font-black text-slate-400 uppercase tracking-[0.2em] text-xs">{t('lbl_loading_trainings', 'EĞİTİM TAKVİMİ YÜKLENİYOR...')}</p>
      </div>
    );
  }

  // 🎯 GÜVENLİ TARİH FİLTRESİ
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTrainings = trainings.filter(t => {
      const tDate = new Date(t.training_date);
      tDate.setHours(0,0,0,0);
      return t.status === 'SCHEDULED' && tDate >= today;
  });

  const pastTrainings = trainings.filter(t => {
      const tDate = new Date(t.training_date);
      tDate.setHours(0,0,0,0);
      return t.status === 'SCHEDULED' && tDate < today;
  });
  
  const cancelledTrainings = trainings.filter(t => t.status === 'CANCELLED');

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? "top-left" : "top-right"} reverseOrder={false} />

      {/* 🎯 İNCE AKSİYON ÇUBUĞU */}
      <div className={`flex shrink-0 w-full mb-2 ${isArabic ? 'justify-start' : 'justify-end'}`}>
        <div className={`bg-indigo-50 text-indigo-600 px-6 py-4 rounded-2xl text-[10px] font-black tracking-[0.2em] flex items-center justify-center gap-3 shadow-sm uppercase border border-indigo-100 w-full md:w-auto ${isArabic ? 'flex-row-reverse' : ''}`}>
          <BookOpen size={16}/> {t('lbl_assigned_training', 'SİZE ATANAN EĞİTİM:')} <span className="text-sm" dir="ltr">{trainings.length} {t('lbl_count', 'ADET')}</span>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto custom-scrollbar pb-4 space-y-10 ${isArabic ? 'pl-2' : 'pr-2'}`}>
        
        {/* ================= YAKLAŞAN EĞİTİMLER ================= */}
        <section>
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
             <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl"><Calendar size={20}/></div>
             <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
               {t('lbl_upcoming_trainings', 'YAKLAŞAN EĞİTİMLERİM')}
             </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingTrainings.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-[3rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center opacity-70">
                <GraduationCap size={64} className="text-slate-300 mb-6 opacity-50"/>
                <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] leading-relaxed" dangerouslySetInnerHTML={{__html: t('msg_no_upcoming_html', "YAKIN ZAMANDA KATILMANIZ GEREKEN<br/>BİR EĞİTİM BULUNMUYOR.")}}></p>
              </div>
            ) : (
              upcomingTrainings.map(training => (
                <div key={training.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:border-indigo-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 relative overflow-hidden group flex flex-col">
                  
                  {/* Dekoratif Arka Plan */}
                  <div className={`absolute top-0 w-40 h-40 bg-gradient-to-br from-indigo-50 to-transparent -z-0 opacity-50 group-hover:scale-125 transition-transform duration-700 pointer-events-none ${isArabic ? 'left-0 rounded-br-full' : 'right-0 rounded-bl-full'}`}></div>
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <span className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100">
                      {t('badge_approaching', 'YAKLAŞIYOR')}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-800 mb-3 relative z-10 line-clamp-2 uppercase italic tracking-tighter leading-tight">{training.title?.toLocaleUpperCase(locale)}</h3>
                  <p className="text-[11px] font-bold text-slate-500 mb-8 line-clamp-3 relative z-10 flex-1 leading-relaxed">"{training.description}"</p>
                  
                  <div className="space-y-4 bg-slate-50/80 p-6 rounded-[2rem] border border-slate-100 relative z-10 mt-auto group-hover:bg-white transition-colors">
                    <div className="flex items-center justify-between border-b border-slate-200/50 pb-3 mb-3">
                        <span className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest"><Calendar size={14} className="text-indigo-500 shrink-0"/> {t('lbl_date', 'TARİH')}</span>
                        <span className="text-[11px] font-black text-slate-700" dir="ltr">{formatDate(training.training_date)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200/50 pb-3 mb-3">
                        <span className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest"><Clock size={14} className="text-indigo-500 shrink-0"/> {t('lbl_time', 'SAAT')}</span>
                        <span className="text-[11px] font-black text-slate-700" dir="ltr">{training.training_time}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 text-[10px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">
                        <span className="flex items-center gap-2"><User size={14} className="text-indigo-500 shrink-0 mt-0.5"/> {t('lbl_instructor', 'EĞİTMEN:')}</span>
                        <span className={`text-slate-800 line-clamp-1 ${isArabic ? 'text-left' : 'text-right'}`}>{training.instructor}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 text-[10px] font-black text-slate-600 uppercase tracking-widest leading-relaxed mt-2 pt-2 border-t border-slate-200/50">
                        <span className="flex items-center gap-2"><MapPin size={14} className="text-indigo-500 shrink-0 mt-0.5"/> {t('lbl_location', 'LOKASYON:')}</span>
                        <span className={`text-slate-800 line-clamp-2 ${isArabic ? 'text-left' : 'text-right'}`}>{training.location}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ================= GEÇMİŞ / TAMAMLANAN EĞİTİMLER ================= */}
        {(pastTrainings.length > 0 || cancelledTrainings.length > 0) && (
          <section className="pt-4">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl"><CheckCircle2 size={20}/></div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                {t('lbl_past_cancelled_trainings', 'GEÇMİŞ & İPTAL EDİLEN EĞİTİMLER')}
                </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              
              {/* GEÇMİŞ EĞİTİMLER */}
              {pastTrainings.map(training => (
                <div key={training.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 opacity-80 hover:opacity-100 hover:shadow-md hover:border-emerald-200 transition-all group shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <h3 className={`text-[11px] font-black text-slate-700 line-clamp-2 uppercase group-hover:text-emerald-600 transition-colors leading-relaxed ${isArabic ? 'pl-2' : 'pr-2'}`}>{training.title?.toLocaleUpperCase(locale)}</h3>
                    <CheckCircle2 size={24} className="text-emerald-500 shrink-0 bg-emerald-50 rounded-full p-1"/>
                  </div>
                  <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                    <div className="text-[9px] font-black text-slate-500 flex items-center justify-between uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400"/> {t('lbl_date', 'TARİH')}</span>
                        <span className="text-slate-700" dir="ltr">{formatDate(training.training_date)}</span>
                    </div>
                    <div className="text-[9px] font-black text-slate-500 flex items-center justify-between uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><User size={12} className="text-slate-400"/> {t('lbl_instructor', 'EĞİTMEN')}</span>
                        <span className={`text-slate-700 truncate max-w-[100px] ${isArabic ? 'text-left' : 'text-right'}`} title={training.instructor}>{training.instructor}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* İPTAL EDİLEN EĞİTİMLER */}
              {cancelledTrainings.map(training => (
                <div key={training.id} className="bg-rose-50/50 rounded-[2rem] p-6 border border-rose-100 opacity-70 hover:opacity-100 transition-all flex flex-col">
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <h3 className={`text-[11px] font-black text-slate-700 line-clamp-2 line-through uppercase leading-relaxed ${isArabic ? 'pl-2' : 'pr-2'}`}>{training.title?.toLocaleUpperCase(locale)}</h3>
                    <AlertTriangle size={24} className="text-rose-400 shrink-0 bg-rose-100 rounded-lg p-1"/>
                  </div>
                  <div className="mt-auto pt-4 border-t border-rose-100 text-[8px] font-black tracking-[0.2em] uppercase text-rose-600 flex items-start gap-2 bg-rose-50 p-3 rounded-xl leading-relaxed shadow-inner">
                     <AlertTriangle size={14} className="shrink-0"/> {t('badge_cancelled_by_admin', 'YÖNETİM TARAFINDAN İPTAL EDİLDİ')}
                  </div>
                </div>
              ))}
              
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default EmployeeTraining;
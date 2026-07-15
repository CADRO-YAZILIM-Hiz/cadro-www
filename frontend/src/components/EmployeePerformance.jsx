import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Award, BrainCircuit, Activity, CheckCircle2 } from 'lucide-react';
import { performanceApi } from '../api/axios';
import toast, { Toaster } from 'react-hot-toast'; 
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi

const EmployeePerformance = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası eklendi
  
  // 🌍 RTL Desteği için kontrol
  const isArabic = i18n.language === 'ar';
  const translateDemoPerformanceText = (text) => {
    if (!text) return text;
    const goalMatch = text.match(/^(.*)\s+hedefi\s+(\d+)$/i);
    if (goalMatch) return `${goalMatch[1]} ${t('lbl_goal_title', 'Hedef')} ${goalMatch[2]}`;
    if (text.includes('demo OKR hedefi')) return t('demo_goal_description', 'Bu personel için örnek OKR hedefi');
    if (text.includes('Demo yonetici degerlendirmesi')) return t('demo_manager_review', 'Örnek yönetici değerlendirmesi: hedef takibi ve ekip içi iletişim olumlu.');
    if (text.includes('Demo ekip arkadasi geri bildirimi')) return t('demo_peer_review', 'Örnek ekip arkadaşı geri bildirimi: destekleyici ve sorumluluk sahibi.');
    return text;
  };
  const translateReviewPeriodLabel = (period) => {
    if (!period) return period;
    const q1Match = period.match(/^(\d{4})\sQ1$/i);
    if (q1Match) return `${q1Match[1]} ${t('opt_q1', 'Q1').replace(/^(\d{4}\s)?/, '')}`;
    return period;
  };

  const [goals, setGoals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const employeeId = parseInt(localStorage.getItem('user_id'), 10); 

  useEffect(() => {
    if (employeeId) {
      fetchData();
    } else {
      toast.error(t('err_session_expired', "Oturum süreniz dolmuş olabilir, lütfen tekrar giriş yapın."));
      setLoading(false);
    }
  }, [employeeId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [goalsRes, reviewsRes, aiRes] = await Promise.all([
        performanceApi.getGoals(employeeId),
        performanceApi.getReviews(employeeId),
        performanceApi.getAIAnalysis(employeeId).catch(() => ({ data: null })) 
      ]);
      
      setGoals(goalsRes.data || []);
      setReviews(reviewsRes.data || []);
      setAiAnalysis(aiRes.data || null);
    } catch (error) {
      toast.error(t('err_fetch_performance', "Performans verileri çekilemedi."));
    } finally {
      setLoading(false);
    }
  };

  // 🎯 PERFORMANS İYİLEŞTİRMESİ 1: Sadece ekranda (Görsel) güncelleme yapar
  const handleVisualProgressChange = (goalId, newProgress) => {
    setGoals(prevGoals => 
      prevGoals.map(g => 
        g.id === goalId ? { ...g, progress: newProgress } : g
      )
    );
  };

  // 🎯 PERFORMANS İYİLEŞTİRMESİ 2: Fareyi bırakınca (veya ekrandan parmağını çekince) API'ye yollar
  const handleUpdateProgressAPI = async (goalId, newProgress) => {
    try {
      await performanceApi.updateGoalProgress(goalId, newProgress);
      toast.success(t('msg_progress_saved', "İlerleme durumu kaydedildi."));
    } catch (error) {
      toast.error(t('err_progress_update', "İlerleme güncellenemedi."));
      fetchData(); 
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center font-sans">
        <Activity className="animate-pulse text-rose-500 mb-4" size={56} />
        <p className="font-black text-slate-400 uppercase tracking-[0.2em] text-xs">{t('lbl_loading_performance', 'PERFORMANS VERİLERİ YÜKLENİYOR...')}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? "top-left" : "top-right"} reverseOrder={false} />

      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        
        {/* YAPAY ZEKA ANALİZİ (HER ZAMAN EN ÜSTTE) */}
        {aiAnalysis && (
          <div className="bg-gradient-to-r from-rose-600 to-orange-500 p-8 md:p-10 rounded-[3rem] shadow-2xl shadow-rose-500/20 text-white relative overflow-hidden shrink-0 group">
            <BrainCircuit className={`absolute -bottom-10 w-48 h-48 text-white opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none ${isArabic ? '-left-10 -rotate-12' : '-right-10 rotate-12'}`} />
            <div className="relative z-10">
              <h3 className="text-xs font-black flex items-center gap-3 mb-4 text-rose-100 uppercase tracking-[0.2em]">
                <div className="p-2.5 bg-rose-500 rounded-xl"><BrainCircuit size={20} className="text-white"/></div> 
                {t('lbl_ai_career_assistant', 'YAPAY ZEKA (AI) KARİYER ASİSTANI')}
              </h3>
              <p className="text-lg md:text-xl text-white leading-relaxed max-w-4xl font-bold italic tracking-tight">
                "{aiAnalysis.ai_executive_summary || t('msg_default_ai_summary', "Geçmiş değerlendirmelerine ve hedeflerine göre harika bir ivme yakaladın. Aynen böyle devam!")}"
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
          
          {/* ================= SOL KOLON: AKTİF HEDEFLER (OKRs) ================= */}
          <div className="lg:col-span-2 bg-white rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col overflow-hidden h-full">
            <div className="p-8 border-b border-slate-100 bg-slate-50 shrink-0">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-3 uppercase tracking-widest">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Target size={18}/></div>
                {t('lbl_active_goals', 'AKTİF HEDEFLERİM (OKRS)')}
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
                {goals.length === 0 ? (
                <div className="text-center flex flex-col items-center justify-center py-20 text-slate-400 opacity-60 h-full">
                    <Target size={64} className="mb-4"/>
                    <p className="font-black uppercase tracking-widest text-[10px]">{t('msg_no_assigned_goals', 'HENÜZ ATANMIŞ BİR HEDEFİN BULUNMUYOR.')}</p>
                </div>
                ) : (
                <div className="space-y-6">
                    {goals.map((goal) => (
                    <div key={goal.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 transition-all hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 group">
                        <div className="flex justify-between items-start mb-6">
                        <div className={isArabic ? 'pl-4' : 'pr-4'}>
                            {/* Başlık için dil tespiti ve çeviriye gerek yok çünkü dinamik geliyor ancak toLocaleUpperCase eklenebilir */}
                            <h4 className="font-black text-slate-800 text-lg uppercase italic tracking-tighter leading-tight">{translateDemoPerformanceText(goal.title)}</h4>
                            <p className="text-xs font-bold text-slate-500 mt-2 leading-relaxed">"{translateDemoPerformanceText(goal.description)}"</p>
                        </div>
                        {goal.progress === 100 ? (
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm"><CheckCircle2 size={24} /></div>
                        ) : (
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center shrink-0 border border-slate-100 shadow-sm"><Target size={24} /></div>
                        )}
                        </div>

                        <div className="bg-slate-50/80 p-6 rounded-[2rem] border border-slate-100">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">{t('lbl_progress_status', 'İLERLEME DURUMU')}</span>
                                <span className="text-3xl font-black text-indigo-600 tracking-tighter" dir="ltr">%{goal.progress}</span>
                            </div>
                            
                            {/* 🎯 GÜNCELLENMİŞ SLIDER: Yönlendirme (dir) desteği eklendi */}
                            <input 
                                type="range" 
                                min="0" max="100" step="5"
                                value={goal.progress}
                                onChange={(e) => handleVisualProgressChange(goal.id, parseInt(e.target.value))}
                                onMouseUp={(e) => handleUpdateProgressAPI(goal.id, parseInt(e.target.value))}
                                onTouchEnd={(e) => handleUpdateProgressAPI(goal.id, parseInt(e.target.value))}
                                className={`w-full h-4 bg-slate-200 rounded-xl appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all shadow-inner ${isArabic ? 'direction-rtl' : ''}`}
                            />
                            <p className="text-[9px] font-bold text-slate-400 mt-3 text-center tracking-widest uppercase">{t('lbl_drag_to_save', 'Kaydetmek için çubuğu sürükleyip bırakın')}</p>
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </div>
          </div>

          {/* ================= SAĞ KOLON: GEÇMİŞ DEĞERLENDİRMELER ================= */}
          <div className="lg:col-span-1 bg-white rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col overflow-hidden h-full">
            <div className="p-8 border-b border-slate-100 bg-slate-50 shrink-0">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-3 uppercase tracking-widest">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><Award size={18}/></div>
                {t('lbl_my_reviews', 'DEĞERLENDİRMELERİM')}
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
                {reviews.length === 0 ? (
                <div className="text-center flex flex-col items-center justify-center py-20 text-slate-400 opacity-60 h-full">
                    <Award size={64} className="mb-4"/>
                    <p className="font-black uppercase tracking-widest text-[10px]">{t('msg_no_past_reviews', 'GEÇMİŞ DEĞERLENDİRMEN YOK.')}</p>
                </div>
                ) : (
                <div className="space-y-6">
                    {reviews.map((review) => (
                    <div key={review.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-amber-200 hover:shadow-xl hover:shadow-amber-500/10 transition-all flex flex-col">
                        
                        <div className={`flex justify-between items-center mb-6 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl tracking-[0.2em] uppercase border border-slate-200 shadow-sm truncate max-w-[120px]">
                            {translateReviewPeriodLabel(review.review_period)}
                        </span>
                        <div className={`flex items-baseline gap-1 text-amber-500 font-black text-3xl tracking-tighter shrink-0 ${isArabic ? 'flex-row-reverse' : ''}`} dir="ltr">
                            {review.rating} <span className="text-slate-300 text-xs mb-1 tracking-widest">/ 5</span>
                        </div>
                        </div>
                        
                        <div className="bg-amber-50/50 p-5 rounded-[2rem] border border-amber-100 flex-1">
                        <p className="text-[9px] font-black text-amber-600 mb-2 uppercase tracking-[0.2em] flex items-center gap-2"><Award size={12}/> {t('lbl_manager_note', 'YÖNETİCİ NOTU')}</p>
                        <p className="text-xs font-bold text-slate-600 leading-relaxed italic line-clamp-3" title={review.comments}>
                            "{translateDemoPerformanceText(review.comments)}"
                        </p>
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EmployeePerformance;

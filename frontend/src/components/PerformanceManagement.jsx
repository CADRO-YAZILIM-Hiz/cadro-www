import React, { useState, useEffect } from 'react';
import { Star, BrainCircuit, Plus, TrendingUp, Target, Award, Edit3, Trash2, Sparkles, Activity, CheckCircle2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast'; 
import api, { performanceApi, getEmployees } from '../api/axios';
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi
import { localizeDigits } from '../utils/localizeNumber';

const PerformanceManagement = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası

  // 🌍 Dinamik toLocaleUpperCase ve RTL için dil tespiti
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);
  const currentYear = new Date().getFullYear();
  const quarterEndDates = [
    `${currentYear}-03-31`,
    `${currentYear}-06-30`,
    `${currentYear}-09-30`,
    `${currentYear}-12-31`,
  ];
  const getQuarterReviewLabel = (quarter) => {
    if (i18n.language === 'tr') return `${currentYear} Q${quarter} (${quarter}. Çeyrek)`;
    if (i18n.language === 'ar') {
      const arabicQuarterMap = { 1: 'الربع الأول', 2: 'الربع الثاني', 3: 'الربع الثالث', 4: 'الربع الرابع' };
      return `${arabicQuarterMap[quarter]} ${localizedNumber(currentYear)}`;
    }
    return `${currentYear} Q${quarter}`;
  };
  const getQuarterEndLabel = (quarter) => {
    if (i18n.language === 'tr') return `${currentYear}-Q${quarter} Sonu`;
    if (i18n.language === 'de') return `Ende ${currentYear}-Q${quarter}`;
    if (i18n.language === 'ar') {
      const arabicQuarterMap = { 1: 'نهاية الربع الأول', 2: 'نهاية الربع الثاني', 3: 'نهاية الربع الثالث', 4: 'نهاية الربع الرابع' };
      return `${arabicQuarterMap[quarter]} ${localizedNumber(currentYear)}`;
    }
    return `End of ${currentYear}-Q${quarter}`;
  };

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [activeTab, setActiveTab] = useState('okr'); 

  const [goals, setGoals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const [newGoal, setNewGoal] = useState({ title: '', description: '' });
  const [goalPeriodType, setGoalPeriodType] = useState(`${currentYear}-03-31`); 
  const [isCustomGoalDate, setIsCustomGoalDate] = useState(false);
  const [customGoalDate, setCustomGoalDate] = useState('');
  const [editingGoalId, setEditingGoalId] = useState(null); 

  // 🌍 İlk değere de çeviri uyguladık
  const [newReview, setNewReview] = useState({ review_period: getQuarterReviewLabel(1), rating: 5, comments: '', review_type: 'MANAGER' });
  const [isCustomPeriod, setIsCustomPeriod] = useState(false); 
  const [customPeriodText, setCustomPeriodText] = useState('');
  const [editingReviewId, setEditingReviewId] = useState(null); 

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const translateDemoPerformanceText = (text) => {
    if (!text) return text;
    const goalMatch = text.match(/^(.*)\s+hedefi\s+(\d+)$/i);
    if (goalMatch) return `${goalMatch[1]} ${t('lbl_goal_title', 'Hedef')} ${localizedNumber(goalMatch[2])}`;
    if (text.includes('demo OKR hedefi')) return t('demo_goal_description', 'Bu personel için örnek OKR hedefi');
    if (text.includes('Demo yonetici degerlendirmesi')) return t('demo_manager_review', 'Örnek yönetici değerlendirmesi: hedef takibi ve ekip içi iletişim olumlu.');
    if (text.includes('Demo ekip arkadasi geri bildirimi')) return t('demo_peer_review', 'Örnek ekip arkadaşı geri bildirimi: destekleyici ve sorumluluk sahibi.');
    return text;
  };
  const translateReviewPeriodLabel = (period) => {
    if (!period) return period;
    const q1Match = period.match(/^(\d{4})\sQ1$/i);
    if (q1Match) return `${localizedNumber(q1Match[1])} ${t('opt_q1', 'Q1').replace(/^(\d{4}\s)?/, '')}`;
    const q2Match = period.match(/^(\d{4})\sQ2$/i);
    if (q2Match) return `${localizedNumber(q2Match[1])} ${t('opt_q2', 'Q2').replace(/^(\d{4}\s)?/, '')}`;
    const q3Match = period.match(/^(\d{4})\sQ3$/i);
    if (q3Match) return `${localizedNumber(q3Match[1])} ${t('opt_q3', 'Q3').replace(/^(\d{4}\s)?/, '')}`;
    const q4Match = period.match(/^(\d{4})\sQ4$/i);
    if (q4Match) return `${localizedNumber(q4Match[1])} ${t('opt_q4', 'Q4').replace(/^(\d{4}\s)?/, '')}`;
    return period;
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchGoals(selectedEmployee);
      fetchReviews(selectedEmployee);
      setAiAnalysis(null); 
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      const res = await getEmployees();
      setEmployees(res.data || []); 
    } catch (err) { console.error("Personeller çekilemedi", err); }
  };

  const fetchGoals = async (empId) => {
    try {
      const res = await performanceApi.getGoals(empId);
      setGoals(res.data || []); 
    } catch (err) { console.error("Hedefler çekilemedi", err); }
  };

  const fetchReviews = async (empId) => {
    try {
      const res = await performanceApi.getReviews(empId);
      setReviews(res.data || []); 
    } catch (err) { console.error("Değerlendirmeler çekilemedi", err); }
  };

  const fetchAIAnalysis = async () => {
    if (!selectedEmployee) {
      toast.error(t('err_select_personnel', "Lütfen önce bir personel seçin!")); 
      return;
    }
    setIsLoadingAI(true);
    try {
      const res = await performanceApi.getAIAnalysis(selectedEmployee);
      setAiAnalysis(res.data);
      toast.success(t('msg_ai_success', "AI 9-Box analizi tamamlandı."));
    } catch (err) { toast.error(t('err_ai_failed', "Yapay Zeka analizi şu an oluşturulamadı.")); } 
    finally { setIsLoadingAI(false); }
  };

  const handleOpenGoalModal = (goal = null) => {
    if (goal) {
      setEditingGoalId(goal.id);
      setNewGoal({ title: goal.title || '', description: goal.description || '' });
      const standardDates = quarterEndDates;
      if (standardDates.includes(goal.due_date)) {
        setGoalPeriodType(goal.due_date);
        setIsCustomGoalDate(false);
      } else {
        setGoalPeriodType('CUSTOM');
        setIsCustomGoalDate(true);
        setCustomGoalDate(goal.due_date || '');
      }
    } else {
      setEditingGoalId(null);
      setNewGoal({ title: '', description: '' });
      setGoalPeriodType(`${currentYear}-03-31`);
      setIsCustomGoalDate(false);
    }
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    try {
      const finalDueDate = isCustomGoalDate ? customGoalDate : goalPeriodType;
      const payload = { ...newGoal, due_date: finalDueDate, employee_id: selectedEmployee };
      if (editingGoalId) {
        await api.put(`/performance/goals/${editingGoalId}`, payload);
        toast.success(t('msg_goal_updated', "Hedef güncellendi."));
      } else {
        await performanceApi.createGoal(payload); 
        toast.success(t('msg_goal_added', "Yeni hedef atandı."));
      }
      setIsGoalModalOpen(false);
      fetchGoals(selectedEmployee);
    } catch (err) { toast.error(t('err_goal_saved', "Hedef kaydedilemedi!")); }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm(t('confirm_delete_goal', "Bu hedefi silmek istediğinize emin misiniz?"))) return;
    try {
      await api.delete(`/performance/goals/${goalId}`); 
      toast.success(t('msg_goal_deleted', "Hedef silindi."));
      fetchGoals(selectedEmployee);
    } catch (err) { toast.error(t('err_goal_deleted', "Hedef silinemedi!")); }
  };

  const handleVisualProgressChange = (goalId, newProgress) => {
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, progress: newProgress } : g));
  };

  const handleUpdateProgress = async (goalId, newProgress) => {
    try {
      await performanceApi.updateGoalProgress(goalId, newProgress);
      toast.success(t('msg_progress_saved', "İlerleme kaydedildi."));
      fetchGoals(selectedEmployee);
    } catch (err) { toast.error(t('err_progress_update', "İlerleme güncellenemedi!")); }
  };

  const handleOpenReviewModal = (review = null) => {
    if (review) {
      setEditingReviewId(review.id);
      setNewReview({ ...review });
    } else {
       setEditingReviewId(null);
       setNewReview({ review_period: getQuarterReviewLabel(1), rating: 5, comments: '', review_type: 'MANAGER' });
    }
    setIsReviewModalOpen(true);
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    try {
      const finalPeriod = isCustomPeriod ? customPeriodText : newReview.review_period;
      
      const currentUserId = parseInt(localStorage.getItem('user_id') || 0, 10);

      const payload = { 
          ...newReview, 
          review_period: finalPeriod, 
          employee_id: parseInt(selectedEmployee, 10),
          reviewer_id: currentUserId 
      };

      if (editingReviewId) {
        await api.put(`/performance/reviews/${editingReviewId}`, payload);
        toast.success(t('msg_review_updated', "Değerlendirme güncellendi."));
      } else {
        await performanceApi.createReview(payload); 
        toast.success(t('msg_review_saved', "Değerlendirme kaydedildi."));
      }
      setIsReviewModalOpen(false);
      fetchReviews(selectedEmployee);
    } catch (err) { 
        toast.error(t('err_review_failed', "Değerlendirme hatası!")); 
        console.error(err.response?.data);
    }
  };

  const handleDeleteReview = async (reviewId) => {
     if (!window.confirm(t('confirm_delete_review', "Bu değerlendirmeyi silmek istediğinize emin misiniz?"))) return;
     try {
       await api.delete(`/performance/reviews/${reviewId}`);
       toast.success(t('msg_review_deleted', "Değerlendirme silindi."));
       fetchReviews(selectedEmployee);
     } catch(err) { toast.error(t('err_review_deleted', "Değerlendirme silinemedi.")); }
  }

  const handleGoalPeriodChange = (e) => {
    const val = e.target.value;
    if (val === 'CUSTOM') setIsCustomGoalDate(true);
    else { setIsCustomGoalDate(false); setGoalPeriodType(val); }
  };

  return (
    <div className="h-full flex flex-col gap-6 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? "top-left" : "top-right"} />
      
      {/* ================= ÜST KONTROL ÇUBUĞU ================= */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 w-full">
        <div className={`flex flex-wrap gap-2 bg-white p-2 rounded-[1.5rem] w-full xl:w-fit shadow-sm border border-slate-100 transition-opacity ${!selectedEmployee ? 'opacity-50 pointer-events-none' : ''} ${isArabic ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => setActiveTab('okr')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'okr' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}>
            <TrendingUp size={16} /> {t('tab_okr', 'HEDEFLER (OKR)')}
          </button>
          <button onClick={() => setActiveTab('360')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === '360' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Star size={16} /> {t('tab_360', '360° DEĞERLENDİRME')}
          </button>
          <button onClick={() => { setActiveTab('ai'); if(!aiAnalysis) fetchAIAnalysis(); }} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'ai' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-500/30' : 'text-slate-400 hover:bg-slate-50 hover:text-purple-600'}`}>
            <BrainCircuit size={16} /> {t('tab_ai', 'AI TALENT ANALİZİ')}
          </button>
        </div>

        <div className="w-full xl:w-auto bg-white p-2 rounded-[1.5rem] shadow-sm border border-slate-100 flex items-center gap-3 shrink-0">
          <select 
            className={`w-full xl:w-72 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none appearance-none cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="">-- {t('opt_select_personnel', 'PERSONEL SEÇİN')} --</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name?.toLocaleUpperCase(locale)} {emp.last_name?.toLocaleUpperCase(locale)}</option>)}
          </select>
        </div>
      </div>

      {/* ================= İÇERİK ALANI ================= */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
        {!selectedEmployee ? (
          <div className="bg-white p-20 text-center rounded-[3rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center h-full min-h-[400px]">
            <Award className="text-slate-100 mb-6" size={100} />
            <h2 className="text-2xl font-black text-slate-300 uppercase tracking-widest">{t('lbl_eval_center', 'DEĞERLENDİRME MERKEZİ')}</h2>
            <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-xs">{t('msg_select_personnel', 'LÜTFEN İŞLEM YAPMAK İÇİN BİR PERSONEL SEÇİNİZ.')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 p-8 min-h-[500px]">
              
              {/* OKR TAB */}
              {activeTab === 'okr' && (
                <div className="animate-in fade-in duration-300">
                  <div className={`flex justify-between items-center mb-8 border-b border-slate-100 pb-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <h3 className={`text-lg font-black text-slate-800 uppercase flex items-center gap-2 tracking-tighter ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <TrendingUp className="text-indigo-500" size={20}/> {t('lbl_strategic_goals', 'STRATEJİK HEDEFLER')}
                    </h3>
                    <button onClick={() => handleOpenGoalModal()} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                      {t('btn_add_goal', 'YENİ HEDEF EKLE')}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {goals.length === 0 ? (
                       <p className="text-center text-slate-400 font-bold text-xs uppercase tracking-widest py-10 opacity-70">
                         {t('msg_no_goals', 'HENÜZ ATANMIŞ BİR HEDEFİN BULUNMUYOR.')}
                       </p>
                    ) : (
                      goals.map(goal => (
                        <div key={goal.id} className="border-2 border-slate-100 p-6 rounded-[2rem] bg-slate-50/50 group relative hover:border-indigo-300 transition-all">
                          <div className={`absolute top-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${isArabic ? 'left-6 flex-row-reverse' : 'right-6'}`}>
                            <button onClick={() => handleOpenGoalModal(goal)} className="p-2 bg-white text-slate-600 rounded-xl hover:text-indigo-600 shadow-sm border border-slate-200"><Edit3 size={16}/></button>
                            <button onClick={() => handleDeleteGoal(goal.id)} className="p-2 bg-white text-slate-600 rounded-xl hover:text-rose-600 shadow-sm border border-slate-200"><Trash2 size={16}/></button>
                          </div>
                          <h4 className={`font-black text-slate-800 text-xl uppercase tracking-tighter ${isArabic ? 'text-right' : 'text-left'}`}>{translateDemoPerformanceText(goal.title)}</h4>
                          <p className={`text-slate-500 text-sm mt-2 leading-relaxed mb-6 ${isArabic ? 'text-right' : 'text-left'}`}>{translateDemoPerformanceText(goal.description)}</p>
                          
                          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-inner">
                            <div className={`flex justify-between mb-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('lbl_progress', 'MEVCUT İLERLEME')}</span>
                              <span className="text-lg font-black text-indigo-600" dir="ltr">% {goal.progress}</span>
                            </div>
                            <input 
                              type="range" min="0" max="100" step="5" value={goal.progress} 
                              onChange={(e) => handleVisualProgressChange(goal.id, parseInt(e.target.value))}
                              onMouseUp={(e) => handleUpdateProgress(goal.id, parseInt(e.target.value))}
                              className={`w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 border border-slate-200 ${isArabic ? 'direction-rtl' : ''}`}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* AI TAB */}
              {activeTab === 'ai' && (
                <div className="animate-in fade-in duration-500">
                  {isLoadingAI ? (
                    <div className="flex flex-col items-center justify-center py-32">
                      <BrainCircuit size={80} className="text-purple-600 animate-bounce mb-6" />
                      <div className="h-1 w-48 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-600 animate-progress"></div>
                      </div>
                      <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('msg_ai_analyzing', 'AI VERİ ANALİZİ YAPILIYOR...')}</p>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="space-y-8">
                      {/* 9-BOX VISUAL MATRIX */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                        <div className="space-y-4">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                             <Target size={18} className="text-purple-600"/> {t('lbl_9box_matrix', '9-BOX POTANSİYEL/PERFORMANS MATRİSİ')}
                          </h4>
                          <div className={`grid grid-cols-3 grid-rows-3 gap-2 bg-slate-100 p-2 rounded-2xl aspect-square w-full max-w-[400px] border border-slate-200 ${isArabic ? 'dir-rtl' : ''}`}>
                            {[
                              'STAR', 'HIGH_POTENTIAL', 'ENIGMA',
                              'HIGH_PERFORMER', 'CORE_EMPLOYEE', 'DILEMMA',
                              'SOLID_PERFORMER', 'EFFECTIVE_EMPLOYEE', 'UNDER_PERFORMER'
                            ].map((cat, idx) => {
                              const isActive = aiAnalysis.nine_box_category === cat;
                              return (
                                <div key={idx} className={`relative flex items-center justify-center p-2 text-center rounded-xl border transition-all ${isActive ? 'bg-purple-600 text-white scale-105 shadow-xl z-10 border-purple-400' : 'bg-white text-[8px] font-black text-slate-300 border-slate-100'}`}>
                                  {/* Kutuları da çeviriyoruz */}
                                  <span className="uppercase leading-tight">{t(`box_${cat}`, cat.replace('_', ' '))}</span>
                                  {isActive && <div className={`absolute -top-1 bg-amber-400 w-4 h-4 rounded-full border-2 border-white animate-ping ${isArabic ? '-left-1' : '-right-1'}`}></div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex flex-col gap-4">
                          <div className="bg-gradient-to-br from-slate-900 to-indigo-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                             <Sparkles className={`absolute -top-4 w-24 h-24 text-white/10 ${isArabic ? '-left-4' : '-right-4'}`} />
                             <p className={`text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-4 ${isArabic ? 'text-right' : 'text-left'}`}>{t('lbl_ai_summary', 'AI YÖNETİCİ ÖZETİ')}</p>
                             <p className={`text-lg font-medium leading-relaxed italic ${isArabic ? 'text-right' : 'text-left'}`}>
                                "{aiAnalysis.ai_executive_summary}"
                             </p>
                             <div className={`mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                <div>
                                   <p className={`text-[9px] font-bold text-slate-400 uppercase ${isArabic ? 'text-right' : 'text-left'}`}>{t('lbl_dev_suggestion', 'Gelişim Önerisi')}</p>
                                   <p className={`text-xs font-black text-emerald-400 uppercase mt-1 ${isArabic ? 'text-right' : 'text-left'}`}>{t('val_fast_promo', 'Hızlı Terfi / Liderlik Eğitimi')}</p>
                                </div>
                                <div className={isArabic ? 'text-left' : 'text-right'}>
                                   <p className="text-[9px] font-bold text-slate-400 uppercase">{t('lbl_risk_analysis', 'Risk Analizi')}</p>
                                   <p className="text-xs font-black text-amber-400 uppercase mt-1">{t('val_low_risk', 'Düşük (Bağlılık Yüksek)')}</p>
                                </div>
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                       <BrainCircuit size={48} className="mx-auto text-slate-200 mb-4" />
                       <p className="text-slate-400 font-black text-xs uppercase tracking-widest">{t('msg_press_to_analyze', 'Analiz başlatmak için butona basınız.')}</p>
                       <button onClick={fetchAIAnalysis} className="mt-6 px-8 py-4 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-200">{t('btn_run_analysis', 'ANALİZİ ÇALIŞTIR')}</button>
                    </div>
                  )}
                </div>
              )}

              {/* 360 DEĞERLENDİRME */}
              {activeTab === '360' && (
                 <div className="animate-in fade-in">
                    <div className={`flex justify-between items-center mb-8 ${isArabic ? 'flex-row-reverse' : ''}`}>
                       <h3 className={`text-lg font-black text-slate-800 uppercase flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                         <Star className="text-amber-500" size={20}/> {t('lbl_feedback_pool', 'GERİ BİLDİRİM HAVUZU')}
                       </h3>
                       <button onClick={() => handleOpenReviewModal()} className="bg-amber-500 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-100">
                         {t('btn_score', 'PUANLAMA YAP')}
                       </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {reviews.length === 0 ? (
                         <p className="col-span-full text-center text-slate-400 font-bold text-xs uppercase tracking-widest py-10 opacity-70">
                           {t('msg_no_reviews', 'GEÇMİŞ DEĞERLENDİRMEN YOK.')}
                         </p>
                       ) : (
                         reviews.map(rev => (
                           <div key={rev.id} className="bg-slate-50 border border-slate-200 p-6 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all group">
                              <div className={`flex justify-between mb-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                 <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black rounded-lg uppercase tracking-widest">{translateReviewPeriodLabel(rev.review_period)}</span>
                                 <div className={`flex text-amber-400 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < rev.rating ? "currentColor" : "none"} />)}
                                 </div>
                              </div>
                              <p className={`text-slate-600 text-sm font-medium italic ${isArabic ? 'text-right' : 'text-left'}`}>"{translateDemoPerformanceText(rev.comments)}"</p>
                              <div className={`mt-4 pt-4 border-t border-slate-100 flex justify-between items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{rev.review_type === 'MANAGER' ? t('lbl_manager_note', 'Yönetici Notu') : t('lbl_peer_note', 'İş Arkadaşı Notu')}</span>
                                 <button onClick={() => handleDeleteReview(rev.id)} className="opacity-0 group-hover:opacity-100 text-rose-500 transition-opacity"><Trash2 size={14}/></button>
                              </div>
                           </div>
                         ))
                       )}
                    </div>
                 </div>
              )}

          </div>
        )}
      </div>

      {/* 360° DEĞERLENDİRME (REVIEW) MODALI */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[110] p-4">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter text-amber-500 border-b border-slate-100 pb-4 flex items-center gap-3">
              <Star size={24} /> {t('modal_review_title', 'PERFORMANS PUANLAMASI')}
            </h2>
            <form onSubmit={handleSaveReview} className="space-y-6">
              
              <div className="space-y-2">
                <label className={`text-[10px] font-black text-slate-400 uppercase tracking-widest block ${isArabic ? 'mr-1 text-right' : 'ml-1 text-left'}`}>{t('lbl_review_period', 'Değerlendirme Dönemi')}</label>
                <select 
                  className={`w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-amber-500 font-bold appearance-none cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`} 
                  value={isCustomPeriod ? 'CUSTOM' : newReview.review_period} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'CUSTOM') setIsCustomPeriod(true);
                    else { setIsCustomPeriod(false); setNewReview({...newReview, review_period: val}); }
                  }}
                >
                   <option value={getQuarterReviewLabel(1)}>{getQuarterReviewLabel(1)}</option>
                   <option value={getQuarterReviewLabel(2)}>{getQuarterReviewLabel(2)}</option>
                   <option value={getQuarterReviewLabel(3)}>{getQuarterReviewLabel(3)}</option>
                   <option value={getQuarterReviewLabel(4)}>{getQuarterReviewLabel(4)}</option>
                   <option value="CUSTOM">{t('opt_custom_period', 'Özel Dönem Yaz...')}</option>
                </select>
                {isCustomPeriod && (
                  <input type="text" placeholder={t('ph_custom_period', `Örn: ${localizedNumber(currentYear)} Yıl Sonu Değerlendirmesi`)} className="w-full p-4 mt-2 bg-amber-50 border-2 border-amber-200 rounded-2xl font-bold outline-none" onChange={e => setCustomPeriodText(e.target.value)} />
                )}
              </div>

              <div className="space-y-3">
                <label className={`text-[10px] font-black text-slate-400 uppercase tracking-widest block ${isArabic ? 'mr-1 text-right' : 'ml-1 text-left'}`}>{t('lbl_rating', 'Genel Puan (1-5)')}</label>
                <div className={`flex justify-between bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 ${isArabic ? 'flex-row-reverse' : ''}`} dir="ltr">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button 
                      key={num} type="button" 
                      onClick={() => setNewReview({...newReview, rating: num})}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-all ${newReview.rating >= num ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 scale-110' : 'bg-white text-slate-300 border border-slate-200 hover:border-amber-300'}`}
                    >
                      {localizedNumber(num)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-[10px] font-black text-slate-400 uppercase tracking-widest block ${isArabic ? 'mr-1 text-right' : 'ml-1 text-left'}`}>{t('lbl_manager_comments', 'Yönetici Görüşü / Yorumlar')}</label>
                <textarea 
                  required
                  placeholder={t('ph_manager_comments', 'Personelin güçlü yönleri ve gelişim alanları hakkında notlarınızı buraya yazın...')}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-amber-500 font-medium h-32 resize-none" 
                  value={newReview.comments} 
                  onChange={e => setNewReview({...newReview, comments: e.target.value})} 
                />
              </div>

              <div className={`flex gap-4 pt-6 border-t border-slate-100 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button type="button" onClick={() => setIsReviewModalOpen(false)} className="flex-1 py-4 font-black uppercase text-xs tracking-widest bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all">{t('btn_cancel', 'İPTAL')}</button>
                <button type="submit" className="flex-[2] py-4 bg-amber-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-amber-200 hover:bg-amber-600 active:scale-95 transition-all">{t('btn_save_score', 'PUANLAMAYI KAYDET')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OKR MODAL */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[100] p-4">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className={`text-2xl font-black mb-8 uppercase tracking-tighter text-slate-900 border-b border-slate-100 pb-4 ${isArabic ? 'text-right' : 'text-left'}`}>{t('modal_goal_title', 'HEDEF PARAMETRELERİ')}</h2>
            <form onSubmit={handleSaveGoal} className="space-y-6">
              <div className="space-y-2">
                <label className={`text-[10px] font-black text-slate-400 uppercase tracking-widest block ${isArabic ? 'mr-1 text-right' : 'ml-1 text-left'}`}>{t('lbl_goal_title', 'Hedef Başlığı')}</label>
                <input required className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold" value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] font-black text-slate-400 uppercase tracking-widest block ${isArabic ? 'mr-1 text-right' : 'ml-1 text-left'}`}>{t('lbl_goal_desc', 'Detaylar')}</label>
                <textarea className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-medium h-32 resize-none" value={newGoal.description} onChange={e => setNewGoal({...newGoal, description: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] font-black text-slate-400 uppercase tracking-widest block ${isArabic ? 'mr-1 text-right' : 'ml-1 text-left'}`}>{t('lbl_due_date', 'Bitiş Tarihi')}</label>
                <select className={`w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`} value={isCustomGoalDate ? 'CUSTOM' : goalPeriodType} onChange={handleGoalPeriodChange}>
                   <option value={`${currentYear}-03-31`}>{getQuarterEndLabel(1)}</option>
                   <option value={`${currentYear}-06-30`}>{getQuarterEndLabel(2)}</option>
                   <option value={`${currentYear}-09-30`}>{getQuarterEndLabel(3)}</option>
                   <option value={`${currentYear}-12-31`}>{getQuarterEndLabel(4)}</option>
                   <option value="CUSTOM">{t('opt_custom_date', 'Özel Tarih...')}</option>
                </select>
                {isCustomGoalDate && <input type="date" className="w-full p-4 mt-2 bg-indigo-50 border-2 border-indigo-200 rounded-2xl font-bold" onChange={e => setCustomGoalDate(e.target.value)} />}
              </div>
              <div className={`flex gap-4 pt-6 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button type="button" onClick={() => setIsGoalModalOpen(false)} className="flex-1 py-4 font-black uppercase text-xs tracking-widest bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all">{t('btn_cancel', 'İPTAL')}</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">{t('btn_save', 'KAYDET')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceManagement;

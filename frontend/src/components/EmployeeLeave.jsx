import React, { useState, useEffect } from 'react';
import { leaveApi } from '../api/axios';
import { Calendar, Clock, CheckCircle, XCircle, Plus, Send, AlertCircle, FileText, Trash2, PieChart } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast'; 
import { useTranslation } from 'react-i18next'; 
import { localizeDigits } from '../utils/localizeNumber';

const EMPTY_LEAVE_FORM = {
  start_date: '',
  end_date: '',
  leave_country: '',
  leave_type: '',
  reason: ''
};

const EmployeeLeave = () => {
  const { t, i18n } = useTranslation(); 
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);

  const [leaves, setLeaves] = useState([]);
  const [summary, setSummary] = useState({ total_used_days: 0, remaining_days: 0 }); // 🔥 Hakediş özeti eklendi
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leaveCatalog, setLeaveCatalog] = useState({ profiles: [], types_by_country: {} });
  
  const [leaveForm, setLeaveForm] = useState(EMPTY_LEAVE_FORM);

  const fetchMyData = async () => {
    setLoading(true);
    try {
      // 🎯 Hem izin listesini hem de hakediş özetini çekiyoruz
      const [listRes, summaryRes] = await Promise.all([
        leaveApi.getMyLeaves(),
        leaveApi.getLeaveSummary(localStorage.getItem('user_id'))
      ]);
      setLeaves(listRes.data || []);
      setSummary(summaryRes.data || { total_used_days: 0 });
    } catch (error) {
      toast.error(t('err_fetch_leaves', "Bilgileriniz çekilemedi."));
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveCatalog = async () => {
    try {
      const res = await leaveApi.getCatalog();
      setLeaveCatalog(res.data || { profiles: [], types_by_country: {} });
    } catch (error) {
      toast.error(t('err_fetch_leave_catalog', 'İzin katalogu yüklenemedi.'));
    }
  };

  useEffect(() => {
    fetchMyData();
    fetchLeaveCatalog();
  }, [i18n.language]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const start = new Date(leaveForm.start_date);
    const end = new Date(leaveForm.end_date);

    if (!leaveForm.leave_country || !leaveForm.leave_type) {
      return toast.error(t('err_leave_country_type_required', 'Lütfen önce ülke / bölge ve izin türü seçin.'));
    }

    if(start > end) {
        return toast.error(t('err_date_order', "Bitiş tarihi başlangıç tarihinden önce olamaz!"));
    }

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 

    const payload = {
      ...leaveForm,
      total_days: diffDays,
      employee_id: parseInt(localStorage.getItem('user_id'), 10)
    };

    const tLoading = toast.loading(t('msg_creating_leave_req', "İzin talebiniz oluşturuluyor..."));
    try {
      await leaveApi.requestLeave(payload); 
      toast.success(t('msg_leave_req_success', "İzin talebiniz başarıyla yönetici onayına sunuldu!"), { id: tLoading });
      window.dispatchEvent(new Event('app:refresh-notifications'));
      setIsModalOpen(false);
      setLeaveForm(EMPTY_LEAVE_FORM);
      fetchMyData(); 
    } catch (err) {
      toast.error(err.response?.data?.detail || t('err_create_failed', "Talep oluşturulamadı."), { id: tLoading });
    }
  };

  const handleDelete = async (id) => {
    toast(
      t(
        'msg_leave_cancel_not_available',
        "İzin talebi iptali şu anda personel portalında aktif değil. İptal için yöneticiniz veya İK ile iletişime geçin."
      ),
      { icon: 'ℹ️' }
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(locale);
  };

  const getLeaveTypeLabel = (type) => {
    switch(type) {
        case 'ANNUAL':
        case 'YILLIK':
          return t('type_annual', 'YILLIK İZİN (ÜCRETLİ)');
        case 'EXCUSED':
        case 'MAZERET':
          return t('type_excuse', 'MAZERET İZNİ');
        case 'SICK':
        case 'HASTALIK':
          return t('type_sick', 'HASTALIK İZNİ (RAPORLU)');
        case 'MATERNITY':
          return t('type_maternity', 'DOĞUM / ANALIK İZNİ');
        case 'UNPAID':
        case 'UCRETSIZ':
          return t('type_unpaid', 'ÜCRETSİZ İZİN');
        default: return String(type || '-').replaceAll('_', ' ');
    }
  };

  const availableLeaveTypes = leaveForm.leave_country
    ? (leaveCatalog.types_by_country?.[leaveForm.leave_country] || [])
    : [];

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? "top-left" : "top-right"} reverseOrder={false} />
      
      {/* 🎯 ÜST İSTATİSTİK VE AKSİYON ALANI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
        
        {/* Kullanılan İzin Kartı */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:border-emerald-200 transition-colors">
          <div className="p-5 bg-emerald-50 text-emerald-500 rounded-[1.5rem] shrink-0"><Calendar size={32} /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{t('lbl_used_this_year', 'BU YIL KULLANILAN')}</p>
            <p className="text-3xl font-black text-slate-800 tracking-tighter" dir={isArabic ? 'rtl' : 'ltr'}>
              {localizedNumber(summary.total_used_days)} <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t('lbl_days', 'GÜN')}</span>
            </p>
          </div>
        </div>

        {/* Kalan Hak Kartı (Gelecekteki mantık için hazır) */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:border-indigo-200 transition-colors">
          <div className="p-5 bg-indigo-50 text-indigo-500 rounded-[1.5rem] shrink-0"><PieChart size={32} /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{t('lbl_remaining_leave', 'KALAN İZİN HAKKI')}</p>
            <p className="text-3xl font-black text-slate-800 tracking-tighter" dir="ltr">
              -- <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t('lbl_days', 'GÜN')}</span>
            </p>
          </div>
        </div>

        {/* Yeni Talep Butonu */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white p-6 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.1em] transition-all shadow-xl shadow-emerald-500/20 flex flex-col items-center justify-center gap-2 active:scale-95"
        >
          <Plus size={32} /> {t('btn_request_new_leave', 'YENİ İZİN TALEP ET')}
        </button>

      </div>

      {/* ================= GEÇMİŞ İZİN TALEPLERİ ================= */}
      <div className="flex-1 bg-white rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col pb-4">
        <div className="p-8 border-b border-slate-100 bg-slate-50 shrink-0">
          <h2 className="text-sm font-black text-slate-800 uppercase flex items-center gap-3 tracking-widest">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><FileText size={18} /></div>
            {t('lbl_my_leave_movements', 'İZİN HAREKETLERİM')}
          </h2>
        </div>

        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
          {loading ? (
             <p className="text-center text-slate-400 font-bold py-10 uppercase tracking-widest text-xs animate-pulse">{t('lbl_loading', 'YÜKLENİYOR...')}</p>
          ) : leaves.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-70">
               <Calendar size={64} className="mb-4 opacity-30"/>
               <p className="font-bold uppercase tracking-widest text-xs text-center" dangerouslySetInnerHTML={{__html: t('msg_no_leaves_html', "HENÜZ HERHANGİ BİR İZİN TALEBİNİZ<br/>BULUNMUYOR.")}}></p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {leaves.map((l) => (
                <div key={l.id} className="border-2 border-slate-100 p-6 rounded-[2rem] bg-white relative group hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10 transition-all flex flex-col">
                  
                  {l.status === 'PENDING' && (
                      <button 
                         onClick={() => handleDelete(l.id)} 
                         className={`absolute top-6 ${isArabic ? 'left-6' : 'right-6'} text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100`}
                         title={t('tooltip_cancel_leave', "İzni İptal Et")}
                      >
                         <Trash2 size={18}/>
                      </button>
                  )}

                  <div className="flex justify-between items-start mb-6 pr-8">
                    <span className="text-[9px] font-black uppercase bg-slate-100 px-3 py-1.5 rounded-xl text-slate-600 tracking-[0.2em] border border-slate-200">
                      {l.leave_type_label || getLeaveTypeLabel(l.leave_type)}
                    </span>
                    <div className={`text-right ${isArabic ? 'mr-auto' : 'ml-auto'}`} dir={isArabic ? 'rtl' : 'ltr'}>
                      <span className="text-2xl font-black text-slate-800 italic tracking-tighter">{localizedNumber(l.total_days)}</span>
                      <span className="text-xs font-black text-slate-400 ml-1">{t('lbl_days', 'GÜN')}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6 flex-1">
                    <p className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl w-fit border border-slate-100 shadow-sm" dir="ltr">
                      <Clock size={14} className="text-emerald-500 shrink-0"/> {formatDate(l.start_date)} <span className="text-slate-300 mx-1">-</span> {formatDate(l.end_date)}
                    </p>
                    <p className="text-xs font-bold text-slate-600 italic line-clamp-2" title={l.reason}>"{l.reason || t('lbl_no_desc', 'Açıklama belirtilmedi.')}"</p>
                  </div>
                  
                  <div className="flex justify-between items-end border-t border-slate-100 pt-5 mt-auto">
                     <div className={`flex-1 ${isArabic ? 'pl-2' : 'pr-2'}`}>
                        {l.status === 'REJECTED' && l.rejection_reason && (
                           <p className="text-[9px] font-black text-rose-500 uppercase max-w-[150px] truncate" title={l.rejection_reason}>{t('lbl_note', 'Not:')} {l.rejection_reason}</p>
                        )}
                     </div>
                     <div className="shrink-0">
                        {l.status === 'APPROVED' ? (
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 shadow-sm tracking-widest border border-emerald-200"><CheckCircle size={12}/> {t('badge_approved', 'ONAYLANDI')}</span>
                        ) : l.status === 'REJECTED' ? (
                        <span className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 shadow-sm tracking-widest border border-rose-200"><XCircle size={12}/> {t('badge_rejected', 'REDDEDİLDİ')}</span>
                        ) : (
                        <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 shadow-sm tracking-widest border border-amber-200"><Clock size={12}/> {t('badge_pending_approval', 'ONAY BEKLİYOR')}</span>
                        )}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= YENİ İZİN MODALI ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-600 p-8 flex justify-between items-start text-white shrink-0">
              <div>
                <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter italic">
                  <div className="p-2 bg-emerald-500 rounded-xl"><Calendar size={24}/></div>
                  {t('modal_title_new_leave', 'İZİN TALEBİ OLUŞTUR')}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className={`text-emerald-200 hover:text-white transition-colors ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={32}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8 bg-slate-50 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('lbl_leave_country', 'ÜLKE / BÖLGE')} *</label>
                <select
                  required
                  value={leaveForm.leave_country}
                  onChange={e => setLeaveForm({ ...leaveForm, leave_country: e.target.value, leave_type: '' })}
                  className={`w-full bg-white border-2 border-slate-200 p-4 rounded-[1.5rem] text-sm font-black outline-none focus:border-emerald-500 shadow-sm text-slate-700 transition-all ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}
                >
                  <option value="">{t('opt_select_country', 'Ülke / Bölge Seçin')}</option>
                  {(leaveCatalog.profiles || []).map(profile => (
                    <option key={profile.code} value={profile.code}>{profile.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('lbl_leave_type', 'İZİN TÜRÜ')} *</label>
                <select
                  required
                  disabled={!leaveForm.leave_country}
                  value={leaveForm.leave_type}
                  onChange={e => setLeaveForm({...leaveForm, leave_type: e.target.value})}
                  className={`w-full bg-white border-2 border-slate-200 p-4 rounded-[1.5rem] text-sm font-black outline-none focus:border-emerald-500 shadow-sm text-slate-700 transition-all disabled:bg-slate-100 disabled:text-slate-400 ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}
                >
                  <option value="">{t('opt_select_leave_type', 'Önce izin profili seçin')}</option>
                  {availableLeaveTypes.map(item => (
                    <option key={item.code} value={item.code}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('lbl_start_date', 'BAŞLANGIÇ')} *</label>
                  <input required type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({...leaveForm, start_date: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-[1.5rem] text-sm font-black outline-none focus:border-emerald-500 shadow-sm text-slate-700"/>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('lbl_end_date', 'BİTİŞ')} *</label>
                  <input required type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({...leaveForm, end_date: e.target.value})} min={leaveForm.start_date} className="w-full bg-white border-2 border-slate-200 p-4 rounded-[1.5rem] text-sm font-black outline-none focus:border-emerald-500 shadow-sm text-slate-700"/>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('lbl_reason', 'AÇIKLAMA / SEBEP')}</label>
                <textarea rows="3" value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} placeholder={t('ph_leave_reason', "Kısa bir açıklama...") } className="w-full bg-white border-2 border-slate-200 p-4 rounded-[1.5rem] text-sm font-bold outline-none focus:border-emerald-500 resize-none shadow-sm text-slate-700"></textarea>
              </div>

              <div className={`flex gap-4 pt-4 border-t border-slate-100 ${isArabic ? 'flex-row-reverse' : ''}`}>
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-500 font-black py-5 rounded-[2rem] uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 transition-all">{t('btn_cancel', 'İPTAL')}</button>
                 <button type="submit" className="flex-[2] bg-emerald-500 text-white font-black uppercase text-[10px] tracking-[0.2em] py-5 rounded-[2rem] shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 flex justify-center items-center gap-2">
                   <Send size={16}/> {t('btn_submit_leave_req', 'TALEBİ ONAYA GÖNDER')}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLeave;

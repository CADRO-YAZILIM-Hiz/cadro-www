import React, { useState, useEffect } from 'react';
import api, { leaveApi } from '../api/axios'; 
import { 
  Calendar, CheckCircle, XCircle, Clock, 
  AlertCircle, FileText, User, ChevronRight, ChevronLeft
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next'; 
import { localizeDigits } from '../utils/localizeNumber';

const LeaveManagement = () => {
  const { t, i18n } = useTranslation(); 

  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("PENDING"); 
  const [userRole, setUserRole] = useState(localStorage.getItem('user_role') || "EMPLOYEE");

  const [summaryModal, setSummaryModal] = useState({ isOpen: false, data: null, empName: "" });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leave/list?status=${activeTab}`);
      
      let filteredData = res.data || [];
      
      // 🔥 GÜVENLİK FİLTRESİ: Görüntüleyen kişinin "kendi" izin talepleri bu ekranda (Yönetici Ekranında) listelenmez!
      // Yönetici/İK kendi izin durumunu "Çalışan Portalı > İzinlerim" kısmından takip etmelidir.
      const currentUserId = parseInt(localStorage.getItem('user_id'));
      filteredData = filteredData.filter(r => r.employee_id !== currentUserId);
      
      setRequests(filteredData);
    } catch (err) {
      toast.error(t('err_fetch_requests', "İzin talepleri çekilirken bir hata oluştu."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  const handleStatusUpdate = async (id, newStatus) => {
    let note = "";
    
    if (newStatus === 'REJECTED') {
      note = prompt(t('prompt_reject_reason', "Lütfen reddetme sebebini yazınız (Zorunludur):"), t('prompt_reject_default', "Operasyonel yoğunluk nedeniyle uygun değildir."));
      if (!note) {
          toast.error(t('err_reject_reason_required', "İzni reddetmek için bir sebep belirtmelisiniz."));
          return;
      }
    } else {
      if (!window.confirm(t('msg_confirm_approve', "Bu izin talebini ONAYLAMAK istediğinize emin misiniz?"))) return;
    }
    
    const loadingToast = toast.loading(t('msg_processing', "İşlem gerçekleştiriliyor ve e-posta gönderiliyor..."));
    
    try {
      await leaveApi.processAction(id, newStatus, note);
      const successMsg = newStatus === 'APPROVED' ? t('action_approved', 'onaylandı') : t('action_rejected', 'reddedildi');
      toast.success(t('msg_status_updated', "İzin talebi {{status}}.").replace('{{status}}', successMsg), { id: loadingToast });
      fetchRequests(); 
    } catch (err) {
      const errDetail = err.response?.data?.detail;
      const errMsg = typeof errDetail === 'string' ? errDetail : t('err_action_failed', "İşlem sırasında bir hata oluştu.");
      toast.error(errMsg, { id: loadingToast });
    }
  };

  const handleViewSummary = async (empId, firstName, lastName) => {
    try {
      const res = await api.get(`/leave/summary/${empId}`);
      setSummaryModal({
        isOpen: true,
        data: res.data,
        empName: `${firstName} ${lastName}`
      });
    } catch (err) {
      toast.error(t('err_fetch_summary', "Personel özeti çekilemedi."));
    }
  };

  const getStatusBadge = (status) => {
      switch(status) {
          case 'PENDING': return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg font-bold border border-amber-200">{t('badge_pending', 'ONAY BEKLİYOR')}</span>;
          case 'APPROVED': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg font-bold border border-emerald-200">{t('badge_approved', 'ONAYLANDI')}</span>;
          case 'REJECTED': return <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-lg font-bold border border-rose-200">{t('badge_rejected', 'REDDEDİLDİ')}</span>;
          default: return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-bold border border-slate-200">{t('badge_unknown', 'BİLİNMİYOR')}</span>;
      }
  };

  const getLeaveTypeLabel = (type) => {
    switch(type) {
        case 'ANNUAL':
        case 'YILLIK': return t('type_annual', 'YILLIK İZİN (ÜCRETLİ)');
        case 'EXCUSED':
        case 'MAZERET': return t('type_excuse', 'MAZERET İZNİ');
        case 'SICK':
        case 'HASTALIK': return t('type_sick', 'HASTALIK İZNİ (RAPORLU)');
        case 'MATERNITY': return t('type_maternity', 'DOĞUM / ANALIK İZNİ');
        case 'UNPAID':
        case 'UCRETSIZ': return t('type_unpaid', 'ÜCRETSİZ İZİN');
        default: return type; 
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(locale);
  };

  return (
    <div className="h-full flex flex-col relative font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? "top-left" : "top-right"} reverseOrder={false} />

      <div className={`flex flex-col xl:flex-row justify-between items-center shrink-0 w-full gap-4 ${isArabic ? 'xl:flex-row-reverse' : ''}`}>
        <div className="flex gap-2 bg-white p-2 rounded-[1.5rem] border border-slate-100 shadow-sm w-full xl:w-auto">
          <button 
            onClick={() => setActiveTab("PENDING")} 
            className={`flex-1 xl:flex-none px-6 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-2 uppercase ${activeTab === "PENDING" ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-amber-500'}`}
          >
            <Clock size={16} className="shrink-0"/> {t('tab_pending_approvals', 'ONAY BEKLEYENLER')}
          </button>
          <button 
            onClick={() => setActiveTab("APPROVED")} 
            className={`flex-1 xl:flex-none px-6 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-2 uppercase ${activeTab === "APPROVED" ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-500'}`}
          >
            <CheckCircle size={16} className="shrink-0"/> {t('tab_approved_requests', 'ONAYLANANLAR')}
          </button>
          <button 
            onClick={() => setActiveTab("REJECTED")} 
            className={`flex-1 xl:flex-none px-6 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-2 uppercase ${activeTab === "REJECTED" ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-rose-500'}`}
          >
            <XCircle size={16} className="shrink-0"/> {t('tab_rejected_requests', 'REDDEDİLENLER')}
          </button>
        </div>

        {/* 🔥 DİKKAT: "Yeni İzin Talebi" butonu (ve modülü) buradan tamamen kaldırıldı! Yöneticiler kendi izinlerini kendi personel ekranlarından (EmployeeLeave) isteyecek. */}
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col mb-4">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-sm py-20">{t('lbl_loading_requests', 'TALEPLER YÜKLENİYOR...')}</div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-400 font-bold text-sm uppercase tracking-widest text-center py-32 border-2 border-dashed border-slate-100 m-8 rounded-[2rem]">
              <AlertCircle className="mb-4 opacity-30 text-slate-400" size={56}/> 
              <span dangerouslySetInnerHTML={{__html: t('msg_no_requests_html', "BU KATEGORİDE HİÇBİR İZİN TALEBİ BULUNMUYOR.")}}></span>
            </div>
          ) : (
            <table className="w-full text-left relative">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 tracking-widest border-b border-slate-100 sticky top-0 z-10 uppercase">
                <tr>
                  <th className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>{t('col_personnel', 'PERSONEL')}</th>
                  <th className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>{t('col_status', 'DURUM')}</th>
                  <th className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>{t('col_leave_type', 'İZİN TÜRÜ')}</th>
                  <th className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>{t('col_date_range', 'TARİH ARALIĞI')}</th>
                  <th className="p-6 text-center">{t('col_days', 'GÜN')}</th>
                  <th className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>{t('col_description', 'AÇIKLAMA / NOT')}</th>
                  <th className={`p-6 ${isArabic ? 'text-left' : 'text-right'}`}>{t('col_actions', 'İŞLEMLER')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-all group">
                    <td className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                      <div className="font-black text-slate-800 uppercase flex items-center gap-2">
                        <User size={14} className="text-indigo-400 shrink-0"/>
                        {req.employee?.first_name?.toLocaleUpperCase(locale) || req.first_name?.toLocaleUpperCase(locale)} {req.employee?.last_name?.toLocaleUpperCase(locale) || req.last_name?.toLocaleUpperCase(locale)}
                      </div>
                      <button 
                        onClick={() => handleViewSummary(req.employee_id, req.employee?.first_name || req.first_name, req.employee?.last_name || req.last_name)}
                        className={`text-[9px] text-indigo-500 hover:text-indigo-700 font-black tracking-widest mt-1.5 uppercase flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md w-fit transition-colors ${isArabic ? 'flex-row-reverse mr-auto' : ''}`}
                      >
                        <FileText size={10}/> {t('btn_leave_summary', 'KALAN İZİN ÖZETİ')}
                      </button>
                    </td>
                    <td className={`p-6 text-[10px] tracking-wider ${isArabic ? 'text-right' : 'text-left'}`}>
                        {getStatusBadge(req.status)}
                    </td>
                    <td className={`p-6 font-bold text-slate-600 text-xs uppercase tracking-wider ${isArabic ? 'text-right' : 'text-left'}`}>
                      <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                         {req.leave_type_label || getLeaveTypeLabel(req.leave_type)}
                      </span>
                    </td>
                    <td className={`p-6 text-xs font-bold text-slate-500 ${isArabic ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 w-fit ${isArabic ? 'flex-row-reverse' : ''}`} dir="ltr">
                         <span className="text-slate-800 bg-slate-100 px-2 py-1 rounded">{formatDate(req.start_date)}</span> 
                         {isArabic ? <ChevronLeft size={12} className="text-slate-300"/> : <ChevronRight size={12} className="text-slate-300"/>}
                         <span className="text-slate-800 bg-slate-100 px-2 py-1 rounded">{formatDate(req.end_date)}</span>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className="font-black text-lg text-indigo-600 bg-indigo-50 w-10 h-10 flex items-center justify-center rounded-xl mx-auto border border-indigo-100 shadow-sm" dir={isArabic ? 'rtl' : 'ltr'}>
                        {localizedNumber(req.total_days)}
                      </span>
                    </td>
                    <td className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                       <p className="text-[11px] font-medium text-slate-500 max-w-xs truncate italic" title={req.reason}>
                         "{req.reason || "-"}"
                       </p>
                       {req.status === 'REJECTED' && req.rejection_reason && (
                         <p className="text-[10px] font-black text-rose-500 mt-1 uppercase truncate max-w-xs" title={req.rejection_reason}>{t('lbl_cancel_note', 'Not:')} {req.rejection_reason}</p>
                       )}
                    </td>
                    <td className={`p-6 ${isArabic ? 'text-left' : 'text-right'}`}>
                      {(() => {
                        if (activeTab !== "PENDING") {
                          return <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">{t('lbl_action_completed', 'İŞLEM TAMAMLANDI')}</span>;
                        }

                        // 🔥 ARTIK isOwnRequest KONTROLÜNE GEREK YOK, LİSTEDE KENDİ İZİNLERİ YOK!
                        const canApprove = ["MANAGER", "HR", "ADMIN", "SUPERADMIN"].includes(userRole) && req.status === "PENDING";

                        if (canApprove) {
                          return (
                            <div className={`flex gap-2 transition-all ${isArabic ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
                              <button onClick={() => handleStatusUpdate(req.id, "APPROVED")} className="p-2 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-sm flex items-center gap-1 font-black text-[10px] tracking-widest uppercase border border-emerald-100">
                                <CheckCircle size={14}/> {t('btn_approve', 'ONAYLA')}
                              </button>
                              <button onClick={() => handleStatusUpdate(req.id, "REJECTED")} className="p-2 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center gap-1 font-black text-[10px] tracking-widest uppercase border border-rose-100">
                                <XCircle size={14}/> {t('btn_reject', 'REDDET')}
                              </button>
                            </div>
                          );
                        }

                        return <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">{t('lbl_pending_authorization', 'YETKİ BEKLENİYOR')}</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ================= PERSONEL İZİN ÖZETİ MODALI ================= */}
      {summaryModal.isOpen && summaryModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white shrink-0">
              <h2 className="text-lg font-black italic tracking-tighter flex items-center gap-2 uppercase">
                <FileText size={20}/> {t('modal_title_leave_summary', 'İZİN HAKEDİŞ ÖZETİ')}
              </h2>
              <button onClick={() => setSummaryModal({ isOpen: false, data: null, empName: "" })} className={`transition-all hover:text-white text-indigo-200 ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={24} /></button>
            </div>
            
            <div className="p-8 bg-slate-50 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="text-center">
                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{t('lbl_personnel', 'PERSONEL')}</p>
                <p className="text-xl font-black text-slate-800 uppercase mt-1">{summaryModal.empName}</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-2">{t('lbl_total_used_this_year', 'BU YIL KULLANILAN TOPLAM')}</p>
                <div className="text-5xl font-black text-indigo-600" dir={isArabic ? 'rtl' : 'ltr'}>{localizedNumber(summaryModal.data.total_used_days)} <span className="text-lg text-indigo-400 uppercase">{t('lbl_days', 'GÜN')}</span></div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black tracking-widest text-slate-400 border-b border-slate-200 pb-2 uppercase">{t('lbl_usage_breakdown', 'KULLANIM KIRILIMI')}</p>
                {((summaryModal.data.breakdown_items || []).length === 0 && Object.keys(summaryModal.data.breakdown || {}).length === 0) ? (
                  <p className="text-xs font-bold text-slate-400 text-center py-4">{t('msg_no_approved_leaves', 'Henüz onaylanmış bir izin kaydı bulunmuyor.')}</p>
                ) : (
                  ((summaryModal.data.breakdown_items || []).length > 0
                    ? summaryModal.data.breakdown_items.map((item, index) => ({
                        key: `${item.leave_country || 'TR'}-${item.leave_type}-${index}`,
                        typeLabel: item.leave_type_label || getLeaveTypeLabel(item.leave_type),
                        days: item.total_days,
                      }))
                    : Object.entries(summaryModal.data.breakdown || {}).map(([type, days]) => ({
                        key: type,
                        typeLabel: getLeaveTypeLabel(type),
                        days,
                      }))
                  ).map((item) => (
                    <div key={item.key} className={`flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <span className="font-bold text-slate-600 text-xs uppercase">{item.typeLabel}</span>
                      <span className="font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg text-xs" dir={isArabic ? 'rtl' : 'ltr'}>{localizedNumber(item.days)} {t('lbl_days', 'GÜN')}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 shrink-0">
              <button onClick={() => setSummaryModal({ isOpen: false, data: null, empName: "" })} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20">
                {t('btn_close_window', 'PENCEREYİ KAPAT')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;

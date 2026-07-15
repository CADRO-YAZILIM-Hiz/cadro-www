import React, { useState, useEffect } from 'react';
import { Bell, LogOut, ChevronDown, Calendar, Wallet, LifeBuoy, BellRing, BookOpen, ShoppingCart, ClipboardList, Mail, Paperclip, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; 
import toast from 'react-hot-toast';
import api, { getAbsoluteFileUrl, supportApi } from '../api/axios';
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi
import { localizeDigits } from '../utils/localizeNumber';
import { hasPermission } from '../auth/permissions';
import { getNotificationBadgeMap, getNotificationTotal } from '../utils/notificationCounts';

const Navbar = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası eklendi

  // 🌍 RTL Desteği için kontrol
  const isArabic = i18n.language === 'ar';
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);

  const [count, setCount] = useState(0);
  const [notifDetails, setNotifDetails] = useState({}); 
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); 
  const [isNotifOpen, setIsNotifOpen] = useState(false); 
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportTab, setSupportTab] = useState('NEW');
  const [mySupportMessages, setMySupportMessages] = useState([]);
  const supportCategoryOptions = [
    { value: 'TECHNICAL', label: t('opt_support_technical', 'Teknik Sorun') },
    { value: 'BILLING', label: t('opt_support_billing', 'Faturalama') },
    { value: 'FEATURE', label: t('opt_support_feature', 'Özellik Talebi') },
    { value: 'OTHER', label: t('opt_support_other', 'Diğer') },
  ];
  const [supportForm, setSupportForm] = useState({
    category: 'TECHNICAL',
    subject: '',
    message: '',
  });
  const [supportFiles, setSupportFiles] = useState([]);
  const navigate = useNavigate();
  
  const userName = localStorage.getItem('user_name') || t('lbl_user', 'Kullanıcı');
  const userRole = localStorage.getItem('user_role') || 'EMPLOYEE';
  const canContactVendor = ['ADMIN', 'SUPERADMIN'].includes(userRole);
  const canViewRequestForms = hasPermission(userRole, 'generic_requests.view_workspace');
  const badgeMap = getNotificationBadgeMap(notifDetails, canViewRequestForms);
  
  // 🌍 Rol isimlerini dinamikleştirdik
  const roleDisplayMap = {
    'OWNER': t('role_owner', 'PLATFORM SAHİBİ'),
    'SUPERADMIN': t('role_superadmin', 'SİSTEM YÖNETİCİSİ'),
    'ADMIN': t('role_admin', 'İNSAN KAYNAKLARI (MÜDÜR)'),
    'HR': t('role_hr', 'İNSAN KAYNAKLARI (UZMAN)'),
    'MANAGER': t('role_manager', 'DEPARTMAN YÖNETİCİSİ'),
    'EMPLOYEE': t('role_employee_short', 'PERSONEL')
  };
  const roleDisplay = roleDisplayMap[userRole] || t('role_employee_short', 'PERSONEL');

  const getInitials = (name) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const fetchNotifications = async (isMountedRef = { current: true }) => {
    try {
      const res = await api.get('/notification/unread-count');
      if (!isMountedRef.current) return;
      const details = res.data?.details || {};
      let nextSupportUnreadCount = 0;
      if (canContactVendor) {
        try {
          const supportRes = await supportApi.getUnreadBroadcastCount();
          if (!isMountedRef.current) return;
          nextSupportUnreadCount = Number(supportRes.data?.count || 0);
        } catch (error) {
          nextSupportUnreadCount = 0;
        }
      }
      const totalCount = getNotificationTotal(details, canViewRequestForms) + nextSupportUnreadCount;

      setCount(totalCount);
      setNotifDetails(details);
      setSupportUnreadCount(nextSupportUnreadCount);
    } catch (err) {
      // Sessizce yut
    }
  };

  useEffect(() => {
    const isMountedRef = { current: true };
    const refreshNotifications = () => fetchNotifications(isMountedRef);

    refreshNotifications();
    const interval = setInterval(refreshNotifications, 60000);
    window.addEventListener('app:refresh-notifications', refreshNotifications);
    
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener('app:refresh-notifications', refreshNotifications);
    };
  }, [canViewRequestForms]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    window.location.reload(); 
  };

  const toggleNotif = () => {
    setIsNotifOpen(!isNotifOpen);
    if(isDropdownOpen) setIsDropdownOpen(false);
  };

  const toggleProfile = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if(isNotifOpen) setIsNotifOpen(false);
  };

  const handleNotificationNavigate = (event, path, state = null) => {
    event.preventDefault();
    event.stopPropagation();
    setIsNotifOpen(false);
    navigate(path, state ? { state } : undefined);
  };

  const resetSupportForm = () => {
    setSupportForm({
      category: 'TECHNICAL',
      subject: '',
      message: '',
    });
    setSupportFiles([]);
  };

  const loadMySupportMessages = async () => {
    if (!canContactVendor) return;
    setSupportLoading(true);
    try {
      const response = await supportApi.getMine();
      setMySupportMessages(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setMySupportMessages([]);
    } finally {
      setSupportLoading(false);
    }
  };

  const openSupportModal = () => {
    setIsDropdownOpen(false);
    resetSupportForm();
    setSupportTab('NEW');
    setIsSupportModalOpen(true);
    loadMySupportMessages();
  };

  const closeSupportModal = () => {
    setIsSupportModalOpen(false);
    resetSupportForm();
  };

  const handleSupportSubmit = async (event) => {
    event.preventDefault();
    if (!supportForm.subject.trim() || !supportForm.message.trim()) {
      toast.error(t('msg_support_subject_message_required', 'Konu ve mesaj alanlarını doldurun.'));
      return;
    }

    const formData = new FormData();
    formData.append('category', supportForm.category);
    formData.append('subject', supportForm.subject.trim());
    formData.append('message', supportForm.message.trim());
    supportFiles.forEach((file) => formData.append('files', file));

    setSupportSubmitting(true);
    try {
      await supportApi.contact(formData);
      toast.success(t('msg_support_sent', 'Destek talebiniz gönderildi.'));
      resetSupportForm();
      setSupportTab('LIST');
      loadMySupportMessages();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('msg_support_failed', 'Destek talebi gönderilemedi.'));
    } finally {
      setSupportSubmitting(false);
    }
  };

  return (
    <div className={`h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-end px-8 sticky top-0 z-40 transition-all shadow-sm ${isArabic ? 'flex-row-reverse' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
      
      {/* ================= 🎯 ETKİLEŞİMLİ BİLDİRİM ZİLİ ================= */}
      <div className={`relative ${isArabic ? 'ml-6' : 'mr-6'}`}>
        <div 
          onClick={toggleNotif}
          className={`cursor-pointer p-3 rounded-2xl transition-all group border ${isNotifOpen ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-100 border-transparent hover:border-slate-200'}`}
        >
          <Bell size={22} className={`${isNotifOpen ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`} />
          
          {count > 0 && (
            <span className={`absolute top-2 flex h-4 w-4 ${isArabic ? 'left-2' : 'right-2'}`}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white items-center justify-center text-[8px] text-white font-black shadow-sm" dir="ltr">
                {count > 9 ? `${localizedNumber(9)}+` : localizedNumber(count)}
              </span>
            </span>
          )}
        </div>

        {/* 🎯 BİLDİRİM AÇILIR MENÜSÜ (DROPDOWN) */}
        {isNotifOpen && (
          <div className={`absolute top-full mt-4 w-80 bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 py-3 animate-in fade-in slide-in-from-top-4 duration-200 z-50 ${isArabic ? 'left-0' : 'right-0'}`}>
            
            <div className="px-6 py-3 border-b border-slate-50 flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">{t('lbl_notifications', 'BİLDİRİMLER')}</span>
              {count > 0 && <span className="bg-rose-100 text-rose-600 text-[9px] font-black px-2 py-0.5 rounded-full" dir="ltr">{localizedNumber(count)} {t('lbl_new', 'YENİ')}</span>}
            </div>

            <div className="max-h-64 overflow-y-auto px-3 custom-scrollbar space-y-1">
              {count === 0 ? (
                <div className="py-8 text-center flex flex-col items-center justify-center opacity-50">
                  <BellRing size={32} className="text-slate-300 mb-2"/>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('msg_no_new_notifs', 'YENİ BİLDİRİM YOK')}</span>
                </div>
              ) : (
                <>
                  {/* İzin Bildirimi */}
                  {notifDetails.pending_leaves > 0 && (
                    <button type="button" onClick={(event) => handleNotificationNavigate(event, '/leaves')} className="w-full p-3 hover:bg-slate-50 rounded-2xl cursor-pointer flex items-center gap-4 transition-colors border border-transparent hover:border-slate-100">
                      <div className="bg-amber-100 text-amber-600 p-2.5 rounded-xl shrink-0"><Calendar size={18}/></div>
                      <div className={isArabic ? 'text-right' : 'text-left'}>
                        <p className="text-xs font-black text-slate-700 uppercase">{t('lbl_leave_requests', 'İZİN TALEPLERİ')}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5"><span className="text-amber-500" dir="ltr">{localizedNumber(notifDetails.pending_leaves)} {t('lbl_items', 'adet')}</span> {t('msg_leave_waiting', 'izin talebi onayınızı bekliyor.')}</p>
                      </div>
                    </button>
                  )}

                  {/* Masraf Bildirimi */}
                  {notifDetails.pending_expenses > 0 && (
                    <button type="button" onClick={(event) => handleNotificationNavigate(event, '/expenses')} className="w-full p-3 hover:bg-slate-50 rounded-2xl cursor-pointer flex items-center gap-4 transition-colors border border-transparent hover:border-slate-100">
                      <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-xl shrink-0"><Wallet size={18}/></div>
                      <div className={isArabic ? 'text-right' : 'text-left'}>
                        <p className="text-xs font-black text-slate-700 uppercase">{t('lbl_expense_requests', 'MASRAF TALEPLERİ')}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5"><span className="text-emerald-500" dir="ltr">{localizedNumber(notifDetails.pending_expenses)} {t('lbl_items', 'adet')}</span> {t('msg_expense_waiting', 'masraf onayınızı bekliyor.')}</p>
                      </div>
                    </button>
                  )}

                  {notifDetails.pending_documents > 0 && (
                    <button type="button" onClick={(event) => handleNotificationNavigate(event, '/e-dossier')} className="w-full p-3 hover:bg-slate-50 rounded-2xl cursor-pointer flex items-center gap-4 transition-colors border border-transparent hover:border-slate-100">
                      <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl shrink-0"><Bell size={18}/></div>
                      <div className={isArabic ? 'text-right' : 'text-left'}>
                        <p className="text-xs font-black text-slate-700 uppercase">{t('lbl_pending_documents', 'BEKLEYEN EVRAKLAR')}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5"><span className="text-indigo-500" dir="ltr">{localizedNumber(notifDetails.pending_documents)} {t('lbl_items', 'adet')}</span> {t('msg_document_waiting', 'evrak onayınızı bekliyor.')}</p>
                      </div>
                    </button>
                  )}

                  {notifDetails.dossier_missing_required_documents > 0 && (
                    <button type="button" onClick={(event) => handleNotificationNavigate(event, '/e-dossier')} className="w-full p-3 bg-amber-50 rounded-2xl hover:bg-amber-100 transition-colors cursor-pointer border border-amber-100 flex items-center gap-4">
                      <div className="bg-amber-100 text-amber-700 p-2.5 rounded-xl shrink-0"><Bell size={18}/></div>
                      <div className={isArabic ? 'text-right' : 'text-left'}>
                        <p className="text-xs font-black text-slate-700 uppercase">{t('lbl_missing_required_dossier_docs', 'EKSİK ZORUNLU EVRAKLAR')}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5"><span className="text-amber-600" dir="ltr">{localizedNumber(notifDetails.dossier_missing_required_documents)} {t('lbl_items', 'adet')}</span> {t('msg_missing_required_dossier_docs_waiting', 'zorunlu evrak eksiği takip bekliyor.')}</p>
                      </div>
                    </button>
                  )}

                  {notifDetails.dossier_expired_documents > 0 && (
                    <button type="button" onClick={(event) => handleNotificationNavigate(event, '/e-dossier')} className="w-full p-3 bg-rose-50 rounded-2xl hover:bg-rose-100 transition-colors cursor-pointer border border-rose-100 flex items-center gap-4">
                      <div className="bg-rose-100 text-rose-700 p-2.5 rounded-xl shrink-0"><Bell size={18}/></div>
                      <div className={isArabic ? 'text-right' : 'text-left'}>
                        <p className="text-xs font-black text-slate-700 uppercase">{t('lbl_expired_dossier_docs', 'SÜRESİ DOLAN EVRAKLAR')}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5"><span className="text-rose-600" dir="ltr">{localizedNumber(notifDetails.dossier_expired_documents)} {t('lbl_items', 'adet')}</span> {t('msg_expired_dossier_docs_waiting', 'yenilenmesi gereken evrak bulunuyor.')}</p>
                      </div>
                    </button>
                  )}

                  {notifDetails.dossier_expiring_documents > 0 && (
                    <button type="button" onClick={(event) => handleNotificationNavigate(event, '/e-dossier')} className="w-full p-3 hover:bg-slate-50 rounded-2xl cursor-pointer flex items-center gap-4 transition-colors border border-transparent hover:border-slate-100">
                      <div className="bg-orange-100 text-orange-700 p-2.5 rounded-xl shrink-0"><Bell size={18}/></div>
                      <div className={isArabic ? 'text-right' : 'text-left'}>
                        <p className="text-xs font-black text-slate-700 uppercase">{t('lbl_expiring_dossier_docs', 'YAKINDA BİTECEK EVRAKLAR')}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5"><span className="text-orange-600" dir="ltr">{localizedNumber(notifDetails.dossier_expiring_documents)} {t('lbl_items', 'adet')}</span> {t('msg_expiring_dossier_docs_waiting', 'yakında süresi dolacak evrak var.')}</p>
                      </div>
                    </button>
                  )}

                  {notifDetails.pending_purchase_requests > 0 && (
                    <button type="button" onClick={(event) => handleNotificationNavigate(event, '/purchase-requests')} className="w-full p-3 hover:bg-slate-50 rounded-2xl cursor-pointer flex items-center gap-4 transition-colors border border-transparent hover:border-slate-100">
                      <div className="bg-sky-100 text-sky-600 p-2.5 rounded-xl shrink-0"><ShoppingCart size={18}/></div>
                      <div className={isArabic ? 'text-right' : 'text-left'}>
                        <p className="text-xs font-black text-slate-700 uppercase">{t('lbl_purchase_requests', 'SATIN ALMA TALEPLERİ')}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5"><span className="text-sky-500" dir="ltr">{localizedNumber(notifDetails.pending_purchase_requests)} {t('lbl_items', 'adet')}</span> {t('msg_purchase_requests_waiting', 'satın alma talebi işlem bekliyor.')}</p>
                      </div>
                    </button>
                  )}

                  {canViewRequestForms && badgeMap.requestForms > 0 && (
                    <button type="button" onClick={(event) => handleNotificationNavigate(event, '/request-forms')} className="w-full p-3 hover:bg-slate-50 rounded-2xl cursor-pointer flex items-center gap-4 transition-colors border border-transparent hover:border-slate-100">
                      <div className="bg-cyan-100 text-cyan-700 p-2.5 rounded-xl shrink-0"><ClipboardList size={18}/></div>
                      <div className={isArabic ? 'text-right' : 'text-left'}>
                        <p className="text-xs font-black text-slate-700 uppercase">{t('lbl_generic_requests', 'KURUMSAL TALEPLER')}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5"><span className="text-cyan-600" dir="ltr">{localizedNumber(badgeMap.requestForms)} {t('lbl_items', 'adet')}</span> {t('msg_generic_requests_waiting', 'kurumsal talep işlem bekliyor.')}</p>
                      </div>
                    </button>
                  )}

                  {/* Destek Masası Bildirimi */}
                  {notifDetails.open_tickets > 0 && (
                    <button type="button" onClick={(event) => handleNotificationNavigate(event, '/helpdesk')} className="w-full p-3 hover:bg-slate-50 rounded-2xl cursor-pointer flex items-center gap-4 transition-colors border border-transparent hover:border-slate-100">
                      <div className="bg-rose-100 text-rose-600 p-2.5 rounded-xl shrink-0"><LifeBuoy size={18}/></div>
                      <div className={isArabic ? 'text-right' : 'text-left'}>
                        <p className="text-xs font-black text-slate-700 uppercase">{t('lbl_open_tickets', 'AÇIK TALEPLER')}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5"><span className="text-rose-500" dir="ltr">{notifDetails.open_tickets} {t('lbl_items', 'adet')}</span> {t('msg_ticket_waiting', 'açık destek talebi var.')}</p>
                      </div>
                    </button>
                  )}
                  {notifDetails.pending_policy_acknowledgements > 0 && (
                    <button type="button" onClick={(event) => handleNotificationNavigate(event, '/knowledge-base')} className="w-full p-3 hover:bg-slate-50 rounded-2xl cursor-pointer flex items-center gap-4 transition-colors border border-transparent hover:border-slate-100">
                      <div className="bg-violet-100 text-violet-600 p-2.5 rounded-xl shrink-0"><BookOpen size={18}/></div>
                      <div className={isArabic ? 'text-right' : 'text-left'}>
                        <p className="text-xs font-black text-slate-700 uppercase">{t('lbl_pending_policy_acknowledgements', 'POLİTİKA ONAYLARI')}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5"><span className="text-violet-600" dir="ltr">{localizedNumber(notifDetails.pending_policy_acknowledgements)} {t('lbl_items', 'adet')}</span> {t('msg_pending_policy_acknowledgements_waiting', 'okuma ve onay bekleyen politika içeriği var.')}</p>
                      </div>
                    </button>
                  )}
                  {supportUnreadCount > 0 && (
                    <button
                      type="button"
                      onClick={(event) => handleNotificationNavigate(event, '/support-center', { supportTab: 'BROADCASTS' })}
                      className="w-full p-3 hover:bg-slate-50 rounded-2xl cursor-pointer flex items-center gap-4 transition-colors border border-transparent hover:border-slate-100"
                    >
                      <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl shrink-0"><Mail size={18}/></div>
                      <div className={isArabic ? 'text-right' : 'text-left'}>
                        <p className="text-xs font-black text-slate-700 uppercase">{t('lbl_support_broadcasts', 'DESTEK MESAJLARI')}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          <span className="text-indigo-600" dir="ltr">{localizedNumber(supportUnreadCount)} {t('lbl_items', 'adet')}</span> {t('msg_support_broadcast_waiting', 'okunmamış duyuru sizi bekliyor.')}
                        </p>
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* 🎯 ÇALIŞAN "TÜMÜNÜ GÖR" BUTONU */}
            <div className="px-4 mt-2 pt-3 border-t border-slate-50">
               <button 
                 onClick={() => {navigate('/dashboard'); setIsNotifOpen(false);}} 
                 className="w-full py-3.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm"
               >
                 {t('btn_view_all_dashboard', 'TÜMÜNÜ GÖR (KOKPİTE GİT)')}
               </button>
            </div>

          </div>
        )}
      </div>
      
      {/* ================= KULLANICI PROFİLİ VE AÇILIR MENÜ ================= */}
      <div className="relative">
        <div 
          onClick={toggleProfile}
          className={`${isArabic ? 'border-r-2 pr-6' : 'border-l-2 pl-6'} border-slate-100 flex items-center gap-4 cursor-pointer transition-opacity ${isDropdownOpen ? 'opacity-100' : 'hover:opacity-80'}`}
        >
          <div className={`flex flex-col ${isArabic ? 'text-left items-start' : 'text-right items-end'}`}>
            <p className="text-xs font-black text-slate-800 tracking-widest uppercase">{userName}</p>
            <p className={`text-[9px] text-emerald-500 font-black tracking-[0.2em] flex items-center gap-1.5 mt-1 uppercase ${isArabic ? 'flex-row-reverse' : ''}`}>
              {roleDisplay} <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50"></span>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 rounded-[1.2rem] bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shadow-inner shrink-0 uppercase tracking-tighter" dir="ltr">
               {getInitials(userName)}
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* 🎯 PROFİL AÇILIR MENÜSÜ */}
        {isDropdownOpen && (
          <div className={`absolute top-full mt-4 w-64 bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 py-3 animate-in fade-in slide-in-from-top-4 duration-200 z-50 ${isArabic ? 'left-0' : 'right-0'}`}>
            
            <div className={`px-6 py-4 border-b border-slate-50 mb-2 bg-slate-50/50 mx-2 rounded-[1.5rem] ${isArabic ? 'text-right' : 'text-left'}`}>
              <p className="text-[9px] font-black text-slate-400 tracking-[0.2em] uppercase mb-1">{t('lbl_logged_in', 'OTURUM AÇIK')}</p>
              <p className="text-xs font-bold text-slate-800 truncate uppercase">{userName}</p>
            </div>
            
            <div className="px-2">
              {canContactVendor && (
                <button
                  onClick={openSupportModal}
                  className={`w-full px-5 py-4 rounded-2xl text-[10px] font-black text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-3 uppercase tracking-widest active:scale-95 ${isArabic ? 'text-right flex-row-reverse' : 'text-left'}`}
                >
                  <Mail size={16} className="shrink-0" /> {t('btn_contact_cadro', 'CADRO DESTEK')}
                </button>
              )}
              <button 
                onClick={handleLogout}
                className={`w-full px-5 py-4 rounded-2xl text-[10px] font-black text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center gap-3 uppercase tracking-widest active:scale-95 ${isArabic ? 'text-right flex-row-reverse' : 'text-left'}`}
              >
                <LogOut size={16} className="shrink-0" /> {t('btn_secure_logout', 'GÜVENLİ ÇIKIŞ YAP')}
              </button>
            </div>
            
          </div>
        )}
      </div>

      {isSupportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
          <div className={`w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl ${isArabic ? 'text-right' : 'text-left'}`}>
            <div className={`flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  {t('lbl_contact_cadro', 'CADRO DESTEĞE ULAŞIN')}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {t('msg_contact_cadro_desc', 'Teknik konu, faturalama veya ürün geri bildirimi için kayıt açın. Durum güncellemelerini burada takip edebilirsiniz.')}
                </p>
              </div>
              <button
                type="button"
                onClick={closeSupportModal}
                className="rounded-2xl border border-slate-200 p-3 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 pt-5">
              <div className={`grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                <button
                  type="button"
                  onClick={() => setSupportTab('NEW')}
                  className={`rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition ${supportTab === 'NEW' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                >
                  {t('btn_new_support_request', 'Yeni Talep')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSupportTab('LIST');
                    loadMySupportMessages();
                  }}
                  className={`rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition ${supportTab === 'LIST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                >
                  {t('btn_my_support_requests', 'Mesajlarım')}
                </button>
              </div>
            </div>

            {supportTab === 'NEW' ? (
            <form onSubmit={handleSupportSubmit} className="space-y-5 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
                    {t('lbl_support_category', 'Kategori')}
                  </span>
                  <select
                    value={supportForm.category}
                    onChange={(e) => setSupportForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                  >
                    {supportCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
                    {t('lbl_support_subject', 'Konu')}
                  </span>
                  <input
                    value={supportForm.subject}
                    onChange={(e) => setSupportForm((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder={t('ph_support_subject', 'Kısa ve net bir konu yazın')}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
                  {t('lbl_support_message', 'Mesaj')}
                </span>
                <textarea
                  rows={6}
                  value={supportForm.message}
                  onChange={(e) => setSupportForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder={t('ph_support_message', 'Yaşadığınız durumu, beklenen sonucu ve varsa hangi ekranda olduğunu yazın')}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
                  {t('lbl_support_attachments', 'Dosya / Fotoğraf Ekle')}
                </span>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                  <label className={`flex cursor-pointer items-center gap-3 text-sm font-bold text-slate-700 ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <Paperclip size={16} />
                    <span>{t('btn_support_choose_files', 'Dosya Seç')}</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setSupportFiles(Array.from(e.target.files || []))}
                    />
                  </label>
                  {supportFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {supportFiles.map((file) => (
                        <div key={`${file.name}-${file.size}`} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700">
                          {file.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </label>

              <div className={`flex items-center justify-end gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={closeSupportModal}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-50"
                >
                  {t('btn_cancel', 'Vazgeç')}
                </button>
                <button
                  type="submit"
                  disabled={supportSubmitting}
                  className="rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {supportSubmitting ? t('msg_sending', 'Gönderiliyor...') : t('btn_send_support', 'Destek Talebini Gönder')}
                </button>
              </div>
            </form>
            ) : (
              <div className="space-y-4 px-6 py-6">
                {supportLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-600">
                    {t('msg_loading_support_requests', 'Destek kayıtları yükleniyor...')}
                  </div>
                ) : mySupportMessages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
                    {t('msg_no_support_requests', 'Henüz açılmış destek kaydınız yok.')}
                  </div>
                ) : (
                  mySupportMessages.map((item) => {
                    const statusMap = {
                      PENDING: t('support_status_pending', 'Beklemede'),
                      IN_PROGRESS: t('support_status_in_progress', 'İşleme Alındı'),
                      RESOLVED: t('support_status_resolved', 'Sonuçlandı'),
                    };
                    const statusClassMap = {
                      PENDING: 'border-amber-200 bg-amber-50 text-amber-900',
                      IN_PROGRESS: 'border-cyan-200 bg-cyan-50 text-cyan-900',
                      RESOLVED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
                    };
                    return (
                      <div key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                        <div className={`flex items-start justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <div>
                            <p className="text-sm font-black text-slate-900">{item.subject}</p>
                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{item.category}</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusClassMap[item.status] || statusClassMap.PENDING}`}>
                            {statusMap[item.status] || item.status}
                          </span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p>
                        {item.owner_note ? (
                          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{t('lbl_owner_update', 'CADRO Ekibi Güncellemesi')}</p>
                            <p className="mt-2 text-sm font-semibold text-slate-700">{item.owner_note}</p>
                          </div>
                        ) : null}
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                          <span>{new Date(item.created_at).toLocaleString()}</span>
                          {item.attachments?.length ? <span>{item.attachments.length} {t('lbl_attachment_count', 'ek dosya')}</span> : null}
                        </div>
                        {item.attachments?.length ? (
                          <div className="mt-3 space-y-2">
                            {item.attachments.map((attachment) => (
                              <a
                                key={`${item.id}-${attachment.url}`}
                                href={getAbsoluteFileUrl(attachment.url)}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                              >
                                {attachment.filename}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Navbar;

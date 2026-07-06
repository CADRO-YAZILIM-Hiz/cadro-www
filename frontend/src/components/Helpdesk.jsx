import React, { useState, useEffect, useRef } from 'react';
import { ticketApi, getAbsoluteFileUrl } from '../api/axios';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Plus, Send, Clock, CheckCircle, AlertCircle, X, LifeBuoy, User, Paperclip, FileText, History } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast'; 
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi
import { localizeDigits } from '../utils/localizeNumber';

const Helpdesk = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası
  const [searchParams, setSearchParams] = useSearchParams();

  // 🌍 Dinamik toLocaleUpperCase ve RTL için dil tespiti
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);

  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); 
  
  const [newTicket, setNewTicket] = useState({ subject: "", category: "IK_TALEBI", priority: "NORMAL", initial_message: "" });
  
  const messagesEndRef = useRef(null); 
  const currentUserId = parseInt(localStorage.getItem('user_id') || '0', 10);
  const currentUserRole = localStorage.getItem('user_role') || 'EMPLOYEE';
  const canCloseTicket = selectedTicket
    ? ["ADMIN", "SUPERADMIN", "MANAGER"].includes(currentUserRole) || selectedTicket.assigned_to === currentUserId
    : ["ADMIN", "SUPERADMIN", "MANAGER"].includes(currentUserRole);
  const ticketStats = {
    open: tickets.filter((ticket) => ticket.status === 'AÇIK' || ticket.status === 'İŞLEMDE').length,
    inProgress: tickets.filter((ticket) => ticket.status === 'İŞLEMDE').length,
    pending: tickets.filter((ticket) => ticket.status === 'AÇIK').length,
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (searchParams.get('prefill') !== 'health-correction') return;

    const reportNo = searchParams.get('reportNo') || '';
    const period = searchParams.get('period') || '';
    const issueDate = searchParams.get('issueDate') || '';
    const payrollEffect = searchParams.get('payrollEffect') || '';

    const detailLines = [
      t('helpdesk_health_prefill_intro', 'Kendi sağlık raporu puantaj kaydım için İK inceleme talep ediyorum.'),
      reportNo ? `${t('attendance_self_report_no', 'RAPOR NO')}: ${reportNo}` : null,
      period ? `${t('attendance_self_report_period', 'RAPOR DÖNEMİ')}: ${period}` : null,
      issueDate ? `${t('attendance_self_issue_date', 'DÜZENLENME TARİHİ')}: ${issueDate}` : null,
      payrollEffect ? `${t('attendance_self_payroll_visibility', 'BORDRO ETKİSİ')}: ${payrollEffect}` : null,
      t('helpdesk_health_prefill_closing', 'Lütfen puantaj ve bordro etkisini kontrol ederek gerekli düzeltmeyi yapın.'),
    ].filter(Boolean).join('\n');

    setNewTicket({
      subject: t('helpdesk_health_prefill_subject', 'Sağlık Raporu Kaydı Düzeltme Talebi'),
      category: 'IK_TALEBI',
      priority: 'NORMAL',
      initial_message: detailLines,
    });
    setIsModalOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, t]);

  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchTickets = async () => {
    try {
      const res = await ticketApi.getAll();
      setTickets(res.data);
    } catch (err) {
      toast.error(t('err_fetch_tickets', "Talepler çekilemedi."));
    }
  };

  const loadTicketDetails = async (id) => {
    try {
      const res = await ticketApi.getDetails(id);
      setSelectedTicket(res.data);
      setMessages(res.data.messages || []);
      setSelectedFile(null); 
    } catch (err) {
      toast.error(t('err_fetch_details', "Talep detayları çekilemedi."));
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    const tLoading = toast.loading(t('msg_creating_ticket', "Destek talebi oluşturuluyor..."));
    try {
      await ticketApi.create({ ...newTicket, message: newTicket.initial_message });
      setIsModalOpen(false);
      setNewTicket({ subject: "", category: "IK_TALEBI", priority: "NORMAL", initial_message: "" });
      toast.success(t('msg_ticket_created', "Talebiniz başarıyla oluşturuldu."), { id: tLoading });
      window.dispatchEvent(new Event('app:refresh-notifications'));
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('err_create_ticket', "Talep oluşturulurken hata oluştu."), { id: tLoading });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && !selectedFile) return;
    
    const tLoading = toast.loading(t('msg_sending_msg', "Mesaj iletiliyor..."));
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("message", replyText || t('lbl_file_attached', "Ekteki dosyayı inceleyebilirsiniz."));
        await ticketApi.addMessageWithFile(selectedTicket.id, formData);
      } else {
        await ticketApi.addMessage(selectedTicket.id, replyText);
      }
      
      setReplyText("");
      setSelectedFile(null);
      toast.success(t('msg_msg_sent', "Mesaj gönderildi!"), { id: tLoading });
      loadTicketDetails(selectedTicket.id); 
    } catch (err) {
      toast.error(t('err_send_msg', "Mesaj gönderilemedi."), { id: tLoading });
    }
  };

  const handleMarkAsResolved = async () => {
    if(window.confirm(t('msg_confirm_resolve', "Bu talebi ÇÖZÜLDÜ olarak işaretlemek istiyor musunuz? İşlem geri alınamaz ve sohbet kapatılır."))) {
      const tLoading = toast.loading(t('msg_closing_ticket', "Talep kapatılıyor..."));
      try {
        await ticketApi.updateStatus(selectedTicket.id, "ÇÖZÜLDÜ");
        toast.success(t('msg_ticket_closed', "Talep başarıyla kapatıldı."), { id: tLoading });
        window.dispatchEvent(new Event('app:refresh-notifications'));
        loadTicketDetails(selectedTicket.id);
        fetchTickets();
      } catch(err) {
        toast.error(t('err_update_status', "Durum güncellenemedi."), { id: tLoading });
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'AÇIK': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'İŞLEMDE': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'ÇÖZÜLDÜ': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // 🌍 Dinamik Durum Çevirisi
  const getTranslatedStatus = (status) => {
    switch (status) {
      case 'AÇIK': return t('status_open', 'AÇIK');
      case 'İŞLEMDE': return t('status_in_progress', 'İŞLEMDE');
      case 'ÇÖZÜLDÜ': return t('status_resolved', 'ÇÖZÜLDÜ');
      default: return status;
    }
  };

  // 🌍 Dinamik Kategori Çevirisi
  const getTranslatedCategory = (category) => {
    switch (category) {
        case 'DİĞER': return t('cat_other', 'DİĞER / GENEL İK');
        case 'IK_TALEBI': return t('cat_hr', 'İK TALEBİ');
        case 'BORDRO': return t('cat_payroll', 'BORDRO');
        case 'IT_DESTEK': return t('cat_it', 'IT DESTEK');
        case 'IDARI_TALEP': return t('cat_admin', 'İDARİ TALEP');
        default: return category;
    }
  };

  const getHistoryActionLabel = (actionType) => {
    switch (actionType) {
      case 'CREATED':
        return t('helpdesk_history_created', 'TALEP OLUŞTURULDU');
      case 'MESSAGE_ADDED':
        return t('helpdesk_history_message_added', 'MESAJ EKLENDİ');
      case 'ATTACHMENT_ADDED':
        return t('helpdesk_history_attachment_added', 'DOSYA EKLENDİ');
      case 'STATUS_UPDATED':
        return t('helpdesk_history_status_updated', 'DURUM GÜNCELLENDİ');
      case 'ASSIGNED':
        return t('helpdesk_history_assigned', 'ATAMA YAPILDI');
      default:
        return actionType;
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? "top-left" : "top-right"} reverseOrder={false} />
      
      <div className={`flex flex-col xl:flex-row justify-between items-center gap-4 shrink-0 w-full ${isArabic ? 'xl:flex-row-reverse' : ''}`}>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm w-full xl:w-auto">
          <div className="rounded-xl bg-cyan-100 p-2 text-cyan-600"><LifeBuoy size={16} /></div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            {t('helpdesk_total_tickets', 'TOPLAM TALEP')} ({localizedNumber(tickets.length)})
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black tracking-[0.2em] hover:bg-cyan-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95 uppercase">
          <Plus size={18} /> {t('btn_create_ticket', 'YENİ TALEP OLUŞTUR')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 shrink-0">
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-500">{t('helpdesk_stat_open', 'AÇIK')}</p>
              <p className="mt-1 text-[10px] font-bold text-rose-400">{t('helpdesk_stat_open_hint', 'Toplam aktif talep')}</p>
            </div>
            <p className="text-2xl font-black text-rose-700" dir="ltr">{localizedNumber(ticketStats.open)}</p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-600">{t('status_in_progress', 'İŞLEMDE')}</p>
              <p className="mt-1 text-[10px] font-bold text-amber-500">{t('helpdesk_stat_in_progress_hint', 'Üzerinde çalışılan')}</p>
            </div>
            <p className="text-2xl font-black text-amber-700" dir="ltr">{localizedNumber(ticketStats.inProgress)}</p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-600">{t('helpdesk_stat_pending', 'BEKLEYEN')}</p>
              <p className="mt-1 text-[10px] font-bold text-cyan-500">{t('helpdesk_stat_pending_hint', 'İlk yanıt bekleyen')}</p>
            </div>
            <p className="text-2xl font-black text-cyan-700" dir="ltr">{localizedNumber(ticketStats.pending)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden pb-4">
        
        {/* LİSTE PANELİ */}
        <div className="w-full lg:w-1/3 xl:w-1/4 bg-white rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col overflow-hidden shrink-0">
          <div className="p-6 xl:p-8 bg-slate-50 border-b border-slate-100 shrink-0 flex items-center gap-3">
            <div className="p-2 bg-cyan-100 text-cyan-600 rounded-xl"><LifeBuoy size={18}/></div>
            <h2 className="font-black text-sm text-slate-800 uppercase tracking-widest">
              {t('helpdesk_total_tickets', 'TOPLAM TALEP')} ({localizedNumber(tickets.length)})
            </h2>
          </div>
          
          <div className={`flex-1 overflow-y-auto p-4 xl:p-6 space-y-4 custom-scrollbar bg-slate-50/50 ${isArabic ? 'pl-2' : 'pr-2'}`}>
            {tickets.map(ticket => (
              <div 
                key={ticket.id} 
                onClick={() => loadTicketDetails(ticket.id)}
                className={`p-5 rounded-[2rem] cursor-pointer transition-all border-2 shadow-sm ${selectedTicket?.id === ticket.id ? 'bg-cyan-50 border-cyan-300 shadow-lg shadow-cyan-200/50' : 'bg-white border-slate-100 hover:border-cyan-200 hover:shadow-md'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl border tracking-[0.2em] uppercase shadow-sm ${getStatusColor(ticket.status)}`}>
                    {getTranslatedStatus(ticket.status)}
                  </span>
                  <div className={`flex flex-col ${isArabic ? 'items-start' : 'items-end'}`}>
                    {ticket.priority === 'ACİL' && <span className="text-[9px] bg-rose-500 text-white px-2 py-1 rounded-lg tracking-widest uppercase font-black mb-1 shadow-sm border border-rose-600">{t('lbl_urgent', 'ACİL')}</span>}
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest" dir="ltr">{new Date(ticket.created_at).toLocaleDateString(locale)}</span>
                  </div>
                </div>
                <h3 className="text-sm font-black text-slate-800 line-clamp-2 uppercase mb-2 leading-tight">{ticket.subject}</h3>
                {ticket.creator_name && (
                  <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">
                    {t('lbl_created_by', 'Created By')}: {ticket.creator_name}
                  </p>
                )}
                <p className={`text-[9px] font-bold tracking-[0.2em] uppercase w-fit px-2 py-1 rounded-md border truncate max-w-full ${ticket.category === 'BORDRO' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-cyan-100 text-cyan-700 border-cyan-200'}`}>
                  {getTranslatedCategory(ticket.category)}
                </p>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="text-center p-10 text-slate-400 text-xs font-bold uppercase tracking-widest opacity-60 flex flex-col items-center justify-center h-full">
                <LifeBuoy size={48} className="mb-4"/>
                <span dangerouslySetInnerHTML={{__html: t('msg_no_tickets_html', "SİSTEMDE KAYITLI BİR<br/>TALEP BULUNMUYOR.")}}></span>
              </div>
            )}
          </div>
        </div>

        {/* SOHBET PANELİ */}
        <div className="w-full lg:w-2/3 xl:w-3/4 bg-white rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col overflow-hidden relative h-full">
          {selectedTicket ? (
            <>
              {/* CHAT HEADER */}
              <div className="bg-slate-50 border-b border-slate-100 shrink-0">
                <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className={`flex-1 ${isArabic ? 'pl-4' : 'pr-4'}`}>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter italic mb-4 leading-tight">{selectedTicket.subject}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-black text-slate-500 tracking-[0.2em]">
                      <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm uppercase">{t('lbl_ticket_no', 'TALEP NO:')} #{selectedTicket.id}</span>
                      <span className={`px-3 py-1.5 rounded-xl border uppercase shadow-sm ${selectedTicket.category === 'BORDRO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>{getTranslatedCategory(selectedTicket.category)}</span>
                      {selectedTicket.priority === 'ACİL' && <span className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-xl border border-rose-200 uppercase flex items-center gap-1.5 shadow-sm"><AlertCircle size={14}/> {t('lbl_urgent', 'ACİL')}</span>}
                    </div>
                  </div>
                  {selectedTicket.status !== 'ÇÖZÜLDÜ' && canCloseTicket && (
                    <button onClick={handleMarkAsResolved} className="w-full md:w-auto text-[10px] font-black bg-emerald-500 text-white px-6 py-4 rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 tracking-[0.2em] uppercase active:scale-95 shrink-0">
                      <CheckCircle size={18}/> {t('btn_close_ticket', 'TALEBİ KAPAT')}
                    </button>
                  )}
                </div>
                <div className="px-6 pb-6 md:px-8">
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                      <History size={16} className="text-slate-500" />
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">
                        {t('helpdesk_action_history', 'AKSİYON GEÇMİŞİ')}
                      </p>
                    </div>
                    {selectedTicket.history?.length ? (
                      <div className="mt-3 grid gap-2">
                        {selectedTicket.history.slice(0, 5).map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 ${isArabic ? 'flex-row-reverse text-right' : ''}`}
                          >
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                                {getHistoryActionLabel(item.action_type)}
                              </p>
                              <p className="mt-1 text-xs font-bold text-slate-500">
                                {item.actor_name}
                                {item.action_note ? ` • ${item.action_note}` : ''}
                              </p>
                            </div>
                            <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400" dir="ltr">
                              {item.created_at ? new Date(item.created_at).toLocaleDateString(locale) : '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs font-bold text-slate-400">
                        {t('helpdesk_no_history', 'Henüz kayıtlı aksiyon geçmişi yok.')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* CHAT BODY */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/80 space-y-6 custom-scrollbar flex flex-col bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
                {messages.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 opacity-70">
                    <MessageSquare size={48} className="mb-4" />
                    <p className="font-bold text-xs uppercase tracking-widest">{t('msg_no_messages', 'Henüz bir mesaj gönderilmemiş.')}</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.sender_id === currentUserId;
                    // Arapça (RTL) modunda mantığı ters çevir: "isMe" normalde sağdadır, Arapçada solda olmalı (veya RTL'de de isMe hep start tarafında kalsın). 
                    // Standart WP/Telegram mantığı: isMe kendi diline göre hep start(sağ) / end(sol)
                    const alignmentClass = isMe 
                        ? (isArabic ? 'items-start' : 'items-end') 
                        : (isArabic ? 'items-end' : 'items-start');

                    const bubbleRadiusClass = isMe
                        ? (isArabic ? 'rounded-tl-sm' : 'rounded-tr-sm')
                        : (isArabic ? 'rounded-tr-sm' : 'rounded-tl-sm');

                    return (
                      <div key={idx} className={`flex flex-col w-full ${alignmentClass}`}>
                         <span className="text-[9px] font-black text-slate-400 mb-1.5 px-3 uppercase tracking-[0.2em]">{msg.sender_name}</span>
                         <div className={`max-w-[90%] sm:max-w-[75%] p-5 sm:p-6 rounded-[2rem] shadow-sm relative ${isMe ? `bg-cyan-600 text-white shadow-cyan-600/20 ${bubbleRadiusClass}` : `bg-white border border-slate-200 text-slate-700 ${bubbleRadiusClass}`}`}>
                          <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                          
                          {/* 🎯 EĞER DOSYA VARSA GÖSTER */}
                          {msg.file_url && (
                            <a href={getAbsoluteFileUrl(msg.file_url)} target="_blank" rel="noopener noreferrer" className={`mt-4 p-3 rounded-xl flex items-center gap-3 transition-colors border ${isMe ? 'bg-cyan-700/50 hover:bg-cyan-700 border-cyan-500 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}>
                              <div className={`p-2 rounded-lg ${isMe ? 'bg-cyan-500' : 'bg-slate-200'}`}><FileText size={20}/></div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest">{t('btn_open_attachment', 'EKTEKİ DOSYAYI AÇ')}</span>
                                <span className="text-[8px] opacity-70 uppercase tracking-widest">{t('lbl_click_to_view', 'Görüntülemek için tıklayın')}</span>
                              </div>
                            </a>
                          )}

                          <span className={`text-[9px] block mt-4 font-black tracking-widest uppercase ${isMe ? (isArabic ? 'text-cyan-200 text-left' : 'text-cyan-200 text-right') : (isArabic ? 'text-slate-400 text-right' : 'text-slate-400 text-left')}`} dir="ltr">
                            {new Date(msg.created_at).toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* CHAT FOOTER */}
              {selectedTicket.status !== 'ÇÖZÜLDÜ' ? (
                <div className="p-4 md:p-6 bg-white border-t border-slate-100 shrink-0">
                  {selectedFile && (
                    <div className="mb-3 px-4 py-2 bg-cyan-50 border border-cyan-200 rounded-xl text-[10px] font-bold text-cyan-700 flex items-center justify-between shadow-sm animate-in fade-in">
                      <span className="flex items-center gap-2"><FileText size={14}/> {selectedFile.name}</span>
                      <button onClick={() => setSelectedFile(null)} className="text-rose-500 hover:scale-125 transition-transform"><X size={16}/></button>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className={`flex items-center gap-3 md:gap-4 relative ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <input type="file" id="ticket-file" className="hidden" accept=".pdf,.jpeg,.jpg,.png,.doc,.docx,.xls,.xlsx,.txt" onChange={(e) => setSelectedFile(e.target.files[0])} />
                    <label htmlFor="ticket-file" className="cursor-pointer bg-slate-100 p-4 sm:p-5 rounded-full hover:bg-slate-200 text-slate-600 transition-colors shadow-sm active:scale-95 shrink-0">
                      <Paperclip size={20} />
                    </label>

                    <input 
                      type="text" 
                      value={replyText} 
                      onChange={(e) => setReplyText(e.target.value)} 
                      placeholder={t('ph_type_reply', 'Bir cevap yazın...')} 
                      className="flex-1 bg-slate-50 border-2 border-slate-100 px-5 py-4 sm:px-6 sm:py-5 rounded-[2rem] text-sm outline-none focus:border-cyan-500 font-bold shadow-sm text-slate-700 transition-colors"
                    />
                    <button type="submit" disabled={!replyText.trim() && !selectedFile} className="bg-slate-900 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-[2rem] font-black flex items-center justify-center hover:bg-cyan-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shrink-0">
                      <Send size={24} className={isArabic ? 'rotate-180' : ''}/>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-6 bg-emerald-50 text-emerald-700 text-center text-[10px] sm:text-[11px] font-black tracking-[0.2em] uppercase flex items-center justify-center gap-3 border-t border-emerald-100 shrink-0">
                  <CheckCircle size={20}/> {t('msg_ticket_closed_comment', 'BU TALEP ÇÖZÜLDÜĞÜ İÇİN YORUMA KAPATILMIŞTIR.')}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 opacity-60">
              <MessageSquare size={64} className="mb-6" />
              <p className="font-black text-xs uppercase tracking-[0.2em] text-center leading-relaxed" dangerouslySetInnerHTML={{__html: t('msg_select_ticket_html', "DETAYLARI VE MESAJLARI GÖRMEK İÇİN<br/>SOL TARAFTAN BİR TALEP SEÇİNİZ")}}></p>
            </div>
          )}
        </div>
      </div>

      {/* YENİ TALEP MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white shrink-0">
              <h3 className="font-black text-xl italic tracking-tighter flex items-center gap-3 uppercase">
                <div className="p-2 bg-cyan-500 rounded-xl"><LifeBuoy size={24}/></div>
                {t('modal_title_new_ticket', 'YENİ DESTEK TALEBİ')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className={`text-slate-400 hover:text-white transition-colors ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><X size={32}/></button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-10 space-y-8 bg-slate-50 overflow-y-auto custom-scrollbar">
              <div>
                <label className={`text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_subject_summary', 'KONU ÖZETİ')} <span className="text-rose-500">*</span></label>
                <input required type="text" value={newTicket.subject} onChange={e => setNewTicket({...newTicket, subject: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-5 rounded-[1.5rem] text-sm outline-none focus:border-cyan-500 font-black shadow-sm text-slate-700 transition-colors" placeholder={t('ph_subject', 'Örn: 2024 Mart Bordromu Talep Ediyorum')}/>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={`text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_category', 'KATEGORİ')} <span className="text-rose-500">*</span></label>
                  <select value={newTicket.category} onChange={e => setNewTicket({...newTicket, category: e.target.value})} className={`w-full bg-white border-2 border-slate-200 p-5 rounded-[1.5rem] text-sm outline-none focus:border-emerald-500 font-bold shadow-sm text-slate-700 transition-colors appearance-none cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}>
                    <option value="IK_TALEBI">{t('cat_hr', 'İK TALEBİ')}</option>
                    <option value="BORDRO" className="font-black text-emerald-600">{t('cat_payroll', 'MAAŞ & BORDRO TALEBİ')}</option>
                    <option value="IT_DESTEK">{t('cat_it', 'IT & DONANIM')}</option>
                    <option value="IDARI_TALEP">{t('cat_admin', 'İDARİ İŞLER / MALZEME')}</option>
                    <option value="DİĞER">{t('cat_other', 'DİĞER / GENEL İK')}</option>
                  </select>
                </div>
                <div>
                  <label className={`text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_priority', 'ÖNCELİK')} <span className="text-rose-500">*</span></label>
                  <select value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value})} className={`w-full bg-white border-2 border-slate-200 p-5 rounded-[1.5rem] text-sm outline-none focus:border-cyan-500 font-bold shadow-sm text-slate-700 transition-colors appearance-none cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}>
                    <option value="DÜŞÜK">{t('prio_low', 'DÜŞÜK')}</option>
                    <option value="NORMAL">{t('prio_normal', 'NORMAL')}</option>
                    <option value="ACİL">{t('prio_urgent', 'ACİL')}</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className={`text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_message_details', 'MESAJINIZ / DETAY')} <span className="text-rose-500">*</span></label>
                <textarea required rows="5" value={newTicket.initial_message} onChange={e => setNewTicket({...newTicket, initial_message: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-5 rounded-[1.5rem] text-sm outline-none focus:border-cyan-500 resize-none font-bold shadow-sm text-slate-700 transition-colors" placeholder={t('ph_ticket_message', 'Talebinizi buraya yazın...')}></textarea>
              </div>
              
              <div className={`flex gap-4 pt-4 border-t border-slate-200 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-5 rounded-[2rem] bg-white border-2 border-slate-200 text-slate-500 font-black text-[10px] tracking-[0.2em] uppercase hover:bg-slate-50 transition-all shadow-sm">{t('btn_cancel', 'İPTAL')}</button>
                <button type="submit" className={`flex-[2] bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] hover:bg-cyan-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <Send size={18} className={isArabic ? 'rotate-180' : ''}/> {t('btn_submit_ticket', 'TALEBİ SİSTEME İLET')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Helpdesk;

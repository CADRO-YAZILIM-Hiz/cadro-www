import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Mail, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { getAbsoluteFileUrl, supportApi } from '../api/axios';

const SupportCenter = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isArabic = i18n.language === 'ar';
  const userRole = localStorage.getItem('user_role') || 'EMPLOYEE';
  const canRequestCancellation = userRole === 'SUPERADMIN';
  const supportCategoryOptions = [
    { value: 'TECHNICAL', label: t('opt_support_technical', 'Teknik Sorun') },
    { value: 'BILLING', label: t('opt_support_billing', 'Faturalama') },
    { value: 'FEATURE', label: t('opt_support_feature', 'Özellik Talebi') },
    { value: 'OTHER', label: t('opt_support_other', 'Diğer') },
  ];
  const [submitting, setSubmitting] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('NEW');
  const [messages, setMessages] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({
    category: 'TECHNICAL',
    subject: '',
    message: '',
  });

  const resetForm = () => {
    setForm({
      category: 'TECHNICAL',
      subject: '',
      message: '',
    });
    setFiles([]);
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await supportApi.getMine();
      setMessages(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setMessages([]);
      toast.error(t('msg_support_failed', 'Destek kayıtları alınamadı.'));
    } finally {
      setLoading(false);
    }
  };

  const loadBroadcasts = async () => {
    setBroadcastLoading(true);
    try {
      const response = await supportApi.getMyBroadcasts();
      setBroadcasts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setBroadcasts([]);
      toast.error(t('msg_support_broadcasts_failed', 'Duyurular alınamadı.'));
    } finally {
      setBroadcastLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    loadBroadcasts();
  }, []);

  useEffect(() => {
    if (location.state?.supportTab === 'BROADCASTS') {
      setTab('BROADCASTS');
    }
  }, [location.state]);

  const markBroadcastRead = async (broadcastId) => {
    try {
      const response = await supportApi.markBroadcastRead(broadcastId);
      setBroadcasts((prev) => prev.map((item) => (item.id === broadcastId ? response.data : item)));
      window.dispatchEvent(new Event('app:refresh-notifications'));
    } catch (error) {
      toast.error(t('msg_support_broadcast_read_failed', 'Duyuru okunmuş olarak işaretlenemedi.'));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error(t('msg_support_subject_message_required', 'Konu ve mesaj alanlarını doldurun.'));
      return;
    }

    const formData = new FormData();
    formData.append('category', form.category);
    formData.append('subject', form.subject.trim());
    formData.append('message', form.message.trim());
    files.forEach((file) => formData.append('files', file));

    setSubmitting(true);
    try {
      await supportApi.contact(formData);
      toast.success(t('msg_support_sent', 'Destek talebiniz gönderildi.'));
      resetForm();
      setTab('LIST');
      loadMessages();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('msg_support_failed', 'Destek talebi gönderilemedi.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancellationRequest = async () => {
    if (!canRequestCancellation) return;
    if (!form.message.trim()) {
      toast.error(t('msg_support_cancellation_message_required', 'İptal talebi için kısa bir açıklama yazın.'));
      return;
    }

    const formData = new FormData();
    formData.append('message', form.message.trim());
    files.forEach((file) => formData.append('files', file));

    setCancelSubmitting(true);
    try {
      await supportApi.requestSubscriptionCancellation(formData);
      toast.success(t('msg_support_cancellation_sent', 'Abonelik iptal talebiniz CADRO ekibi onayına gönderildi.'));
      resetForm();
      setTab('LIST');
      loadMessages();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('msg_support_cancellation_failed', 'Abonelik iptal talebi gönderilemedi.'));
    } finally {
      setCancelSubmitting(false);
    }
  };

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

  const getCategoryLabel = (value) => {
    const categoryMap = {
      TECHNICAL: t('opt_support_technical', 'Teknik Sorun'),
      BILLING: t('opt_support_billing', 'Faturalama'),
      FEATURE: t('opt_support_feature', 'Özellik Talebi'),
      OTHER: t('opt_support_other', 'Diğer'),
      'Teknik Sorun': t('opt_support_technical', 'Teknik Sorun'),
      Faturalama: t('opt_support_billing', 'Faturalama'),
      'Özellik Talebi': t('opt_support_feature', 'Özellik Talebi'),
      Diğer: t('opt_support_other', 'Diğer'),
    };

    return categoryMap[value] || value || '-';
  };

  return (
    <div className={`space-y-6 ${isArabic ? 'text-right' : 'text-left'}`} dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? 'top-left' : 'top-right'} />
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className={`flex items-start justify-between gap-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              {t('lbl_contact_cadro', 'CADRO DESTEK')}
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              {t('title_support_center', 'Destek Mesajları')}
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              {t('msg_contact_cadro_desc', 'Teknik konu, faturalama veya ürün geri bildirimi için kayıt açın. Durum güncellemelerini burada takip edebilirsiniz.')}
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-indigo-50 p-4 text-indigo-600">
            <Mail size={24} />
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className={`grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1 ${isArabic ? 'text-right' : 'text-left'}`}>
          <button
            type="button"
            onClick={() => setTab('NEW')}
            className={`rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition ${tab === 'NEW' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            {t('btn_new_support_request', 'Yeni Talep')}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('LIST');
              loadMessages();
            }}
            className={`rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition ${tab === 'LIST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            {t('btn_my_support_requests', 'Mesajlarım')}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('BROADCASTS');
              loadBroadcasts();
            }}
            className={`rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition ${tab === 'BROADCASTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            {t('btn_support_broadcasts', 'Duyurular')}
            {broadcasts.some((item) => !item.is_read) ? (
              <span className="ml-2 inline-flex rounded-full bg-rose-500 px-2 py-0.5 text-[9px] text-white" dir="ltr">
                {broadcasts.filter((item) => !item.is_read).length}
              </span>
            ) : null}
          </button>
        </div>

        {tab === 'NEW' ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {canRequestCancellation ? (
              <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-5">
                <div className={`flex items-start justify-between gap-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-700">
                      {t('lbl_subscription_cancellation', 'Abonelik İptal Talebi')}
                    </p>
                    <h3 className="mt-2 text-lg font-black tracking-tight text-slate-900">
                      {t('title_subscription_cancellation_owner_review', 'İptal talebi önce CADRO ekibi onayına gider')}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-700">
                      {t('msg_subscription_cancellation_owner_review', 'Bu seçenek yalnızca superadmin için açıktır. Talep önce CADRO ekibine düşer; görüşme ve onay sonrası Paddle tarafında işleme alınır.')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancellationRequest}
                    disabled={cancelSubmitting}
                    className="rounded-2xl bg-rose-600 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cancelSubmitting
                      ? t('msg_support_cancellation_sending', 'Gönderiliyor...')
                      : t('btn_request_subscription_cancellation', 'Aboneliğimi İptal Et')}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
                  {t('lbl_support_category', 'Kategori')}
                </span>
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                >
                  {supportCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
                  {t('lbl_support_subject', 'Konu')}
                </span>
                <input
                  value={form.subject}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
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
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
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
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  />
                </label>
                {files.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {files.map((file) => (
                      <div key={`${file.name}-${file.size}`} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700">
                        {file.name}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </label>

            <div className={`flex items-center justify-end gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-50"
              >
                {t('btn_clear', 'Temizle')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? t('msg_sending', 'Gönderiliyor...') : t('btn_send_support', 'Destek Talebini Gönder')}
              </button>
            </div>
          </form>
        ) : tab === 'LIST' ? (
          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-600">
                {t('msg_loading_support_requests', 'Destek kayıtları yükleniyor...')}
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
                {t('msg_no_support_requests', 'Henüz açılmış destek kaydınız yok.')}
              </div>
            ) : (
              messages.map((item) => (
                <div key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className={`flex items-start justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <p className="text-sm font-black text-slate-900">{item.subject}</p>
                      <div className={`mt-1 flex flex-wrap items-center gap-2 ${isArabic ? 'justify-end' : ''}`}>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{getCategoryLabel(item.category)}</p>
                        {item.request_kind === 'SUBSCRIPTION_CANCELLATION' ? (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-rose-800">
                            {t('lbl_owner_approval_required', 'CADRO Ekibi Onayı Gerekli')}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusClassMap[item.status] || statusClassMap.PENDING}`}>
                      {statusMap[item.status] || item.status}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p>
                  {item.owner_note ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {t('lbl_owner_update', 'CADRO Ekibi Güncellemesi')}
                      </p>
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
              ))
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {broadcastLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-600">
                {t('msg_loading_support_broadcasts', 'Duyurular yükleniyor...')}
              </div>
            ) : broadcasts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
                {t('msg_no_support_broadcasts', 'Henüz yayınlanmış duyuru yok.')}
              </div>
            ) : (
              broadcasts.map((item) => (
                <div key={item.id} className={`rounded-[1.5rem] border p-4 shadow-sm ${item.is_read ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50/50'}`}>
                  <div className={`flex items-start justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <p className="text-sm font-black text-slate-900">{item.subject}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                        {item.is_read ? t('lbl_broadcast_read', 'Okundu') : t('lbl_broadcast_unread', 'Yeni Duyuru')}
                      </p>
                    </div>
                    {!item.is_read ? (
                      <button
                        type="button"
                        onClick={() => markBroadcastRead(item.id)}
                        className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-indigo-600"
                      >
                        {t('btn_mark_as_read', 'Okundu İşaretle')}
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p>
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
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportCenter;

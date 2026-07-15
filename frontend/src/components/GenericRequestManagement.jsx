import React, { useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  CheckCircle2,
  Clock3,
  FilePlus2,
  FileText,
  LifeBuoy,
  Paperclip,
  Search,
  Send,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { genericRequestApi, getAbsoluteFileUrl, getEmployees } from '../api/axios';
import { localizeDigits } from '../utils/localizeNumber';
import FilterPopover from './FilterPopover';

const EMPTY_FORM = {
  request_type: 'IT_ACCESS',
  requested_for_employee_id: 'SELF',
  priority: 'NORMAL',
  title: '',
  description: '',
  needed_by: '',
  form_payload: {
    system_name: '',
    access_level: '',
    document_name: '',
    delivery_method: '',
    payroll_period: '',
    payroll_topic: '',
    equipment_name: '',
    equipment_quantity: '',
    admin_topic: '',
    other_reference: '',
  },
};

const STATUS_STYLES = {
  OPEN: 'bg-amber-100 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
};

const HIDDEN_PAYLOAD_KEYS = new Set(['seed', 'company_id', 'index']);

const CARD_TONE_STYLES = {
  amber: 'text-amber-600',
  cyan: 'text-cyan-600',
  emerald: 'text-emerald-600',
  rose: 'text-rose-600',
};

const GenericRequestManagement = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isArabic = i18n.language === 'ar';
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);
  const role = localStorage.getItem('user_role') || 'EMPLOYEE';
  const currentUserId = Number(localStorage.getItem('user_id') || '0');
  const isEmployee = role === 'EMPLOYEE';

  const [activeTab, setActiveTab] = useState('OPEN');
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({ open: 0, in_progress: 0, completed: 0, rejected: 0 });
  const [catalog, setCatalog] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({ query: '', request_type: 'ALL', employee_id: 'ALL' });
  const [filterDraft, setFilterDraft] = useState({ query: '', request_type: 'ALL', employee_id: 'ALL' });
  const [openFilterMenu, setOpenFilterMenu] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [historyFilters, setHistoryFilters] = useState({ query: '', action: 'ALL', actor: 'ALL', start_date: '', end_date: '' });

  const locale = i18n.language === 'tr' ? 'tr-TR' : i18n.language === 'de' ? 'de-DE' : i18n.language === 'ar' ? 'ar-SA' : 'en-US';

  const selectedCatalogItem = useMemo(
    () => catalog.find((item) => item.code === form.request_type) || catalog[0],
    [catalog, form.request_type]
  );
  const filteredHistoryItems = useMemo(() => {
    const normalizedQuery = historyFilters.query.trim().toLowerCase();
    return ((selectedRequest?.history) || []).filter((item) => {
      if (historyFilters.action !== 'ALL' && item.action !== historyFilters.action) return false;
      if (historyFilters.actor !== 'ALL' && item.actor_name !== historyFilters.actor) return false;
      if (historyFilters.start_date && (!item.created_at || item.created_at.slice(0, 10) < historyFilters.start_date)) return false;
      if (historyFilters.end_date && (!item.created_at || item.created_at.slice(0, 10) > historyFilters.end_date)) return false;
      if (!normalizedQuery) return true;
      return [item.detail, item.actor_name, getHistoryActionLabel(item.action)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [selectedRequest, historyFilters, t]);

  const fieldMap = {
    IT_ACCESS: [
      { key: 'system_name', label: t('field_system_name', 'Sistem / Uygulama'), placeholder: t('ph_system_name', 'Örn. ERP, CRM, e-posta'), col: 'md:col-span-1' },
      { key: 'access_level', label: t('field_access_level', 'Erişim Seviyesi'), placeholder: t('ph_access_level', 'Örn. görüntüleme, düzenleme'), col: 'md:col-span-1' },
    ],
    HR_DOCUMENT: [
      { key: 'document_name', label: t('field_document_name', 'Talep Edilen Belge'), placeholder: t('ph_document_name', 'Örn. çalışma belgesi, maaş yazısı'), col: 'md:col-span-1' },
      { key: 'delivery_method', label: t('field_delivery_method', 'Teslim Şekli'), placeholder: t('ph_delivery_method', 'E-posta, imzalı PDF, basılı kopya'), col: 'md:col-span-1' },
    ],
    HEALTH_RECORD_CORRECTION: [
      { key: 'document_name', label: t('field_health_correction_topic', 'Düzeltme Konusu'), placeholder: t('ph_health_correction_topic', 'Örn. sağlık raporu puantaj kaydı'), col: 'md:col-span-1' },
      { key: 'delivery_method', label: t('field_health_correction_expectation', 'İşlem Beklentisi'), placeholder: t('ph_health_correction_expectation', 'Örn. İK inceleme ve bordro kontrolü'), col: 'md:col-span-1' },
    ],
    ADMIN_SUPPORT: [
      { key: 'admin_topic', label: t('field_admin_topic', 'İdari Konu'), placeholder: t('ph_admin_topic', 'Örn. ofis, lojistik, araç, tedarik'), col: 'md:col-span-2' },
    ],
    PAYROLL_QUERY: [
      { key: 'payroll_period', label: t('field_payroll_period', 'Bordro Dönemi'), placeholder: t('ph_payroll_period', 'Örn. 2026-03'), col: 'md:col-span-1' },
      { key: 'payroll_topic', label: t('field_payroll_topic', 'Bordro Konusu'), placeholder: t('ph_payroll_topic', 'Örn. mesai, kesinti, prim'), col: 'md:col-span-1' },
    ],
    EQUIPMENT_REQUEST: [
      { key: 'equipment_name', label: t('field_equipment_name', 'Talep Edilen Ekipman'), placeholder: t('ph_equipment_name', 'Örn. laptop, kulaklık, kart okuyucu'), col: 'md:col-span-1' },
      { key: 'equipment_quantity', label: t('field_equipment_quantity', 'Adet'), placeholder: t('ph_equipment_quantity', 'Örn. 1'), col: 'md:col-span-1' },
    ],
    OTHER: [
      { key: 'other_reference', label: t('field_other_reference', 'Referans / Kısa Etiket'), placeholder: t('ph_other_reference', 'İç referans veya kısa etiket'), col: 'md:col-span-2' },
    ],
  };

  const payloadLabels = {
    system_name: t('field_system_name', 'Sistem / Uygulama'),
    access_level: t('field_access_level', 'Erişim Seviyesi'),
    document_name: t('field_payload_document_name', 'Belge / Konu'),
    delivery_method: t('field_payload_delivery_method', 'Teslim / İşlem Şekli'),
    payroll_period: t('field_payroll_period', 'Bordro Dönemi'),
    payroll_topic: t('field_payroll_topic', 'Bordro Konusu'),
    equipment_name: t('field_payload_equipment_name', 'Ekipman'),
    equipment_quantity: t('field_equipment_quantity', 'Adet'),
    admin_topic: t('field_admin_topic', 'İdari Konu'),
    other_reference: t('field_payload_reference', 'Referans'),
  };

  const activeDynamicFields = fieldMap[form.request_type] || fieldMap.OTHER;
  const getVisiblePayloadEntries = (payload) =>
    Object.entries(payload || {}).filter(([key, value]) => {
      if (HIDDEN_PAYLOAD_KEYS.has(key)) return false;
      if (value === null || value === undefined) return false;
      if (String(value).trim() === '') return false;
      return true;
    });
  const getPayloadLabel = (key) => payloadLabels[key] || key.replaceAll('_', ' ');
  function getHistoryActionLabel(action) {
    switch (action) {
      case 'CREATED':
        return t('lbl_created', 'Oluşturuldu');
      case 'STATUS_UPDATED':
        return t('lbl_status_updated', 'Durum Güncellendi');
      case 'MESSAGE_ADDED':
        return t('lbl_message_added', 'Mesaj Eklendi');
      case 'ATTACHMENT_ADDED':
        return t('lbl_attachment_added', 'Dosya Eklendi');
      default:
        return action || '-';
    }
  }

  const fetchDetail = async (requestId) => {
    setDetailLoading(true);
    try {
      const res = await genericRequestApi.getDetails(requestId);
      setSelectedRequest(res.data);
      setHistoryFilters({ query: '', action: 'ALL', actor: 'ALL', start_date: '', end_date: '' });
    } catch {
      toast.error(t('err_fetch_generic_request_detail', 'Talep detayı yüklenemedi.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await genericRequestApi.getAll({
        status: activeTab,
        query: filters.query || undefined,
        request_type: filters.request_type !== 'ALL' ? filters.request_type : undefined,
        employee_id: filters.employee_id !== 'ALL' ? filters.employee_id : undefined,
      });
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error(t('err_fetch_generic_requests', 'Kurumsal talepler yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await genericRequestApi.getSummary({
        query: filters.query || undefined,
        request_type: filters.request_type !== 'ALL' ? filters.request_type : undefined,
        employee_id: filters.employee_id !== 'ALL' ? filters.employee_id : undefined,
      });
      setSummary(res.data || { open: 0, in_progress: 0, completed: 0, rejected: 0 });
    } catch {
      // quiet
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab, filters.query, filters.request_type, filters.employee_id]);

  useEffect(() => {
    fetchSummary();
  }, [filters.query, filters.request_type, filters.employee_id]);

  useEffect(() => {
    setFilterDraft(filters);
  }, [filters]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [catalogRes, employeeRes] = await Promise.all([
          genericRequestApi.getCatalog(),
          getEmployees(),
        ]);
        setCatalog(Array.isArray(catalogRes.data) ? catalogRes.data : []);
        setEmployees(Array.isArray(employeeRes.data) ? employeeRes.data : []);
      } catch {
        setCatalog([]);
        setEmployees([]);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    const requestType = searchParams.get('request_type');
    if (requestType && requestType !== filters.request_type) {
      setFilters((prev) => ({ ...prev, request_type: requestType }));
    }
  }, [searchParams, filters.request_type]);

  useEffect(() => {
    if (searchParams.get('prefill') !== 'health-correction') return;

    const reportNo = searchParams.get('reportNo') || '';
    const period = searchParams.get('period') || '';
    const payrollEffect = searchParams.get('payrollEffect') || '';
    const issueDate = searchParams.get('issueDate') || '';

    const descriptionLines = [
      t('generic_request_prefill_health_intro', 'Kendi sağlık raporu puantaj kaydım için düzeltme talep ediyorum.'),
      reportNo ? `${t('attendance_self_report_no', 'RAPOR NO')}: ${reportNo}` : null,
      period ? `${t('attendance_self_report_period', 'RAPOR DÖNEMİ')}: ${period}` : null,
      issueDate ? `${t('attendance_self_issue_date', 'DÜZENLENME TARİHİ')}: ${issueDate}` : null,
      payrollEffect ? `${t('attendance_self_payroll_visibility', 'BORDRO ETKİSİ')}: ${payrollEffect}` : null,
      t('generic_request_prefill_health_closing', 'Lütfen kayıt doğruluğunu ve bordro etkisini kontrol edin.'),
    ].filter(Boolean).join('\n');

    setForm({
      request_type: 'HEALTH_RECORD_CORRECTION',
      requested_for_employee_id: isEmployee ? 'SELF' : String(currentUserId || 'SELF'),
      priority: 'NORMAL',
      title: t('generic_request_prefill_health_title', 'Puantaj Sağlık Raporu Kaydı Düzeltme Talebi'),
      description: descriptionLines,
      needed_by: '',
      form_payload: {
        ...EMPTY_FORM.form_payload,
        document_name: t('generic_request_prefill_health_document', 'Puantaj / Sağlık Raporu Kaydı'),
        delivery_method: t('generic_request_prefill_health_delivery', 'İK inceleme ve düzeltme'),
      },
    });
    setShowCreateModal(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, t, isEmployee, currentUserId]);

  const handleCreate = async (event) => {
    event.preventDefault();
    const loadingToast = toast.loading(t('msg_creating_generic_request', 'Kurumsal talep oluşturuluyor...'));
    try {
      const requested_for_employee_id =
        isEmployee || form.requested_for_employee_id === 'SELF'
          ? currentUserId
          : Number(form.requested_for_employee_id || currentUserId);

      const payload = {};
      activeDynamicFields.forEach((field) => {
        if (form.form_payload[field.key]) payload[field.key] = form.form_payload[field.key];
      });

      await genericRequestApi.create({
        request_type: form.request_type,
        requested_for_employee_id,
        priority: form.priority,
        title: form.title,
        description: form.description,
        needed_by: form.needed_by || undefined,
        form_payload: payload,
      });

      toast.success(t('msg_generic_request_created', 'Talep ilgili sorumluya yönlendirildi.'), { id: loadingToast });
      window.dispatchEvent(new Event('app:refresh-notifications'));
      setShowCreateModal(false);
      setForm(EMPTY_FORM);
      fetchRequests();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_create_generic_request', 'Talep oluşturulamadı.'), { id: loadingToast });
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    let resolution_note = '';
    if (status === 'REJECTED') {
      resolution_note = window.prompt(
        t('prompt_generic_request_reject', 'Reddetme notunu girin:'),
        t('prompt_generic_request_reject_default', 'Talep mevcut süreç veya politika ile uyumlu bulunmadı.')
      ) || '';
      if (!resolution_note.trim()) return;
    }

    if (status !== 'REJECTED' && !window.confirm(t('msg_confirm_generic_request_action', 'Bu durumu uygulamak istiyor musunuz?'))) {
      return;
    }

    const loadingToast = toast.loading(t('msg_processing', 'İşlem gerçekleştiriliyor...'));
    try {
      await genericRequestApi.updateStatus(requestId, { status, resolution_note: resolution_note || undefined });
      toast.success(t('msg_generic_request_updated', 'Talep durumu güncellendi.'), { id: loadingToast });
      window.dispatchEvent(new Event('app:refresh-notifications'));
      fetchRequests();
      fetchSummary();
      if (selectedRequest?.id === requestId) {
        fetchDetail(requestId);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_action_failed', 'İşlem sırasında hata oluştu.'), { id: loadingToast });
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!selectedRequest || (!replyText.trim() && !selectedFile)) return;

    const loadingToast = toast.loading(t('msg_sending_msg', 'Mesaj iletiliyor...'));
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('message', replyText || t('lbl_file_attached', 'Ek dosya yüklendi.'));
        await genericRequestApi.addMessageWithFile(selectedRequest.id, formData);
      } else {
        await genericRequestApi.addMessage(selectedRequest.id, { message: replyText });
      }
      setReplyText('');
      setSelectedFile(null);
      toast.success(t('msg_msg_sent', 'Mesaj gönderildi.'), { id: loadingToast });
      fetchDetail(selectedRequest.id);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_send_msg', 'Mesaj gönderilemedi.'), { id: loadingToast });
    }
  };

  const exportHistoryCsv = () => {
    const rows = [
      ['aksiyon', 'kullanici', 'detay', 'tarih'],
      ...filteredHistoryItems.map((item) => [
        getHistoryActionLabel(item.action),
        item.actor_name || '-',
        item.detail || '',
        item.created_at || '',
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `generic-request-history-${selectedRequest?.id || 'export'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportHistoryExcel = async () => {
    const excelModule = await import('exceljs');
    const ExcelJS = excelModule.default || excelModule;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Gecmis');
    worksheet.columns = [
      { header: 'Aksiyon', key: 'action' },
      { header: 'Kullanici', key: 'user' },
      { header: 'Detay', key: 'detail' },
      { header: 'Tarih', key: 'date' },
    ];
    filteredHistoryItems.forEach((item) => {
      worksheet.addRow({
        action: getHistoryActionLabel(item.action),
        user: item.actor_name || '-',
        detail: item.detail || '',
        date: item.created_at ? new Date(item.created_at).toLocaleString(locale) : '-',
      });
    });
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generic-request-history-${selectedRequest?.id || 'export'}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'OPEN':
        return t('status_open', 'Açık');
      case 'IN_PROGRESS':
        return t('status_in_progress', 'İşlemde');
      case 'COMPLETED':
        return t('status_completed', 'Tamamlandı');
      case 'REJECTED':
        return t('status_rejected', 'Reddedildi');
      default:
        return status;
    }
  };

  const statusCards = [
    { key: 'open', tab: 'OPEN', title: t('generic_requests_open', 'Açık Kayıtlar'), icon: <Clock3 size={18} />, tone: 'amber' },
    { key: 'in_progress', tab: 'IN_PROGRESS', title: t('status_in_progress', 'İşlemde'), icon: <LifeBuoy size={18} />, tone: 'cyan' },
    { key: 'completed', tab: 'COMPLETED', title: t('status_completed', 'Tamamlandı'), icon: <CheckCircle2 size={18} />, tone: 'emerald' },
    { key: 'rejected', tab: 'REJECTED', title: t('status_rejected', 'Reddedildi'), icon: <XCircle size={18} />, tone: 'rose' },
  ];

  const applyFilterMenu = () => {
    setFilters(filterDraft);
    setOpenFilterMenu(null);
  };

  const cancelFilterMenu = () => {
    setFilterDraft(filters);
    setOpenFilterMenu(null);
  };

  const resetFilterMenu = (menuKey) => {
    if (menuKey === 'query') {
      setFilterDraft((prev) => ({ ...prev, query: '' }));
      return;
    }
    if (menuKey === 'type') {
      setFilterDraft((prev) => ({ ...prev, request_type: 'ALL' }));
      return;
    }
    if (menuKey === 'employee') {
      setFilterDraft((prev) => ({ ...prev, employee_id: 'ALL' }));
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? 'top-left' : 'top-right'} />

      <div className={`flex flex-col xl:flex-row justify-between gap-4 ${isArabic ? 'xl:flex-row-reverse' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
          {statusCards.map((card) => (
            <button
              key={card.key}
              onClick={() => setActiveTab(card.tab)}
              className={`text-left bg-white border rounded-[1.75rem] p-5 shadow-sm transition-all ${
                activeTab === card.tab ? 'border-cyan-300 shadow-cyan-100/40' : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className={`flex items-center gap-2 font-black text-sm uppercase tracking-widest ${CARD_TONE_STYLES[card.tone] || 'text-slate-600'}`}>
                  {card.icon}
                  <span>{card.title}</span>
                </div>
                <span className={`text-2xl font-black ${CARD_TONE_STYLES[card.tone] || 'text-slate-600'}`} dir="ltr">
                  {localizedNumber(summary[card.key] || 0)}
                </span>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="xl:w-auto w-full bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-4 rounded-[1.75rem] shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px]"
        >
          <FilePlus2 size={18} />
          {t('btn_new_generic_request', 'Yeni Kurumsal Talep')}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, request_type: 'ALL' }))}
          className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
            filters.request_type === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          {t('generic_request_quick_all', 'TÜM TALEPLER')}
        </button>
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, request_type: 'HEALTH_RECORD_CORRECTION' }))}
          className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
            filters.request_type === 'HEALTH_RECORD_CORRECTION'
              ? 'bg-cyan-600 text-white border-cyan-600'
              : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'
          }`}
        >
          {t('generic_request_quick_health_corrections', 'SAĞLIK KAYDI DÜZELTMELERİ')}
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-wrap gap-2 items-center">
          <FilterPopover
            label={t('lbl_search', 'Arama')}
            open={openFilterMenu === 'query'}
            active={Boolean(filters.query)}
            onToggle={() => setOpenFilterMenu((prev) => (prev === 'query' ? null : 'query'))}
            onReset={() => resetFilterMenu('query')}
            onCancel={cancelFilterMenu}
            onApply={applyFilterMenu}
            align={isArabic ? 'left' : 'right'}
            panelWidthClass="w-[320px]"
            className="w-full sm:w-[230px]"
          >
            <div className="relative">
              <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isArabic ? 'right-3' : 'left-3'}`} />
              <input
                value={filterDraft.query}
                onChange={(e) => setFilterDraft((prev) => ({ ...prev, query: e.target.value }))}
                placeholder={t('ph_search_generic_requests', 'Talep başlığı, açıklama veya personel ara')}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500 ${isArabic ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
              />
            </div>
          </FilterPopover>

          <FilterPopover
            label={t('lbl_request_type', 'Talep Türü')}
            open={openFilterMenu === 'type'}
            active={filters.request_type !== 'ALL'}
            onToggle={() => setOpenFilterMenu((prev) => (prev === 'type' ? null : 'type'))}
            onReset={() => resetFilterMenu('type')}
            onCancel={cancelFilterMenu}
            onApply={applyFilterMenu}
            align={isArabic ? 'left' : 'right'}
            className="w-full sm:w-[230px]"
          >
            <select
              value={filterDraft.request_type}
              onChange={(e) => setFilterDraft((prev) => ({ ...prev, request_type: e.target.value }))}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500 appearance-none cursor-pointer ${isArabic ? 'text-right' : 'text-left'}`}
            >
              <option value="ALL">{t('opt_all_request_types', 'Tüm Talep Türleri')}</option>
              {catalog.map((item) => (
                <option key={item.code} value={item.code}>{item.label}</option>
              ))}
            </select>
          </FilterPopover>

          {!isEmployee && (
            <FilterPopover
              label={t('col_personnel', 'Personel')}
              open={openFilterMenu === 'employee'}
              active={filters.employee_id !== 'ALL'}
              onToggle={() => setOpenFilterMenu((prev) => (prev === 'employee' ? null : 'employee'))}
              onReset={() => resetFilterMenu('employee')}
              onCancel={cancelFilterMenu}
              onApply={applyFilterMenu}
              align={isArabic ? 'left' : 'right'}
              className="w-full sm:w-[230px]"
            >
              <select
                value={filterDraft.employee_id}
                onChange={(e) => setFilterDraft((prev) => ({ ...prev, employee_id: e.target.value }))}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500 appearance-none cursor-pointer ${isArabic ? 'text-right' : 'text-left'}`}
              >
                <option value="ALL">{t('opt_all_personnel', 'Tüm Personel')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
            </FilterPopover>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading ? (
            <div className="py-20 text-center text-slate-400 font-black uppercase tracking-widest">{t('lbl_loading', 'Yükleniyor...')}</div>
          ) : requests.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-black uppercase tracking-widest">{t('msg_no_generic_requests', 'Bu görünümde kurumsal talep bulunmuyor.')}</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {requests.map((item) => (
                <div key={item.id} className="border-2 border-slate-100 rounded-[2rem] p-5 bg-slate-50/70">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-black text-slate-800">{item.title}</p>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-1">
                        {item.request_type_label}
                      </p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${STATUS_STYLES[item.status] || STATUS_STYLES.OPEN}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-medium text-slate-600 leading-relaxed">{item.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                    <div className="bg-white rounded-2xl p-3 border border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('lbl_requested_by', 'Talebi Açan')}</p>
                      <p className="font-bold text-slate-700 mt-1">{item.creator_name}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-3 border border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('lbl_requested_for', 'Talep Edilen Personel')}</p>
                      <p className="font-bold text-slate-700 mt-1">{item.requested_for_name || item.creator_name}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black">
                    <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700">
                      {t('lbl_assigned_to', 'Yönlendirilen')}: {item.assigned_to_name || '-'}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700">
                      {t('lbl_priority', 'Öncelik')}: {item.priority}
                    </span>
                    {item.needed_by && (
                      <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700">
                        {t('lbl_needed_by', 'Gerekli Tarih')}: {new Date(item.needed_by).toLocaleDateString(locale)}
                      </span>
                    )}
                  </div>

                  {getVisiblePayloadEntries(item.form_payload).length > 0 && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {getVisiblePayloadEntries(item.form_payload).map(([key, value]) => (
                        <div key={key} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{getPayloadLabel(key)}</p>
                          <p className="mt-1 text-sm font-bold text-slate-700">{String(value || '-')}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">{t('lbl_routing_logic', 'İş Akışı')}</p>
                    <p className="mt-1 text-sm font-medium text-cyan-800">{item.route_hint}</p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {item.resolution_note || t('lbl_no_resolution_note', 'Henüz işlem notu yok')}
                    </span>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => fetchDetail(item.id)}
                        className="px-3 py-2 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest border border-slate-900"
                      >
                      {t('btn_open_flow', 'Detayı Aç')}
                      </button>
                      {item.can_process ? (
                        <>
                        {item.status === 'OPEN' && (
                          <button
                            onClick={() => handleStatusUpdate(item.id, 'IN_PROGRESS')}
                            className="px-3 py-2 rounded-xl bg-cyan-50 text-cyan-700 font-black text-[10px] uppercase tracking-widest border border-cyan-200"
                          >
                            {t('btn_take_in_progress', 'İncelemeye Al')}
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusUpdate(item.id, 'COMPLETED')}
                          className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase tracking-widest border border-emerald-200"
                        >
                          {t('btn_complete', 'Sonuçlandır')}
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(item.id, 'REJECTED')}
                          className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 font-black text-[10px] uppercase tracking-widest border border-rose-200"
                        >
                          {t('btn_reject', 'Reddet')}
                        </button>
                        </>
                      ) : (
                        <span className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {item.processed_by_name || t('lbl_action_completed', 'İşlem sonuçlandı')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-4xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="bg-cyan-600 p-6 flex items-center justify-between text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] opacity-80">{t('lbl_request_routing_engine', 'Talep İş Akışı Motoru')}</p>
                <h3 className="text-2xl font-black mt-2">{t('btn_new_generic_request', 'Yeni Kurumsal Talep')}</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 md:p-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_request_type', 'Talep Türü')}</label>
                  <select
                    value={form.request_type}
                    onChange={(e) => setForm((prev) => ({ ...prev, request_type: e.target.value }))}
                    className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                  >
                    {catalog.map((item) => (
                      <option key={item.code} value={item.code}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {!isEmployee ? (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_requested_for', 'Talep Edilen Personel')}</label>
                    <select
                      value={form.requested_for_employee_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, requested_for_employee_id: e.target.value }))}
                      className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                    >
                      <option value="SELF">{t('opt_myself', 'Kendi adıma')}</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_priority', 'Öncelik')}</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                      className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                    >
                      <option value="LOW">{t('priority_low', 'Düşük')}</option>
                      <option value="NORMAL">{t('priority_normal', 'Normal')}</option>
                      <option value="HIGH">{t('priority_high', 'Yüksek')}</option>
                      <option value="URGENT">{t('priority_urgent', 'Acil')}</option>
                    </select>
                  </div>
                )}
              </div>

              {!isEmployee && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_priority', 'Öncelik')}</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                    className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                  >
                    <option value="LOW">{t('priority_low', 'Düşük')}</option>
                    <option value="NORMAL">{t('priority_normal', 'Normal')}</option>
                    <option value="HIGH">{t('priority_high', 'Yüksek')}</option>
                    <option value="URGENT">{t('priority_urgent', 'Acil')}</option>
                  </select>
                </div>
              )}

              <div className="rounded-[1.6rem] border border-cyan-100 bg-cyan-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-600">{t('lbl_route_explanation', 'İş Akışı Özeti')}</p>
                <p className="mt-2 text-sm font-medium text-cyan-800">{selectedCatalogItem?.route_hint || '-'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_title', 'Başlık')}</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                    placeholder={t('ph_generic_request_title', 'Talebi kısa ve net özetleyin')}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_description', 'Açıklama')}</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                    placeholder={t('ph_generic_request_description', 'Talebin nedenini ve beklenen sonucu yazın')}
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_needed_by', 'Gerekli Tarih')}</label>
                  <input
                    type="date"
                    value={form.needed_by}
                    onChange={(e) => setForm((prev) => ({ ...prev, needed_by: e.target.value }))}
                    className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeDynamicFields.map((field) => (
                  <div key={field.key} className={field.col}>
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{field.label}</label>
                    <input
                      value={form.form_payload[field.key] || ''}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        form_payload: {
                          ...prev.form_payload,
                          [field.key]: e.target.value,
                        },
                      }))}
                      className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
              </div>

              <div className={`flex items-center justify-end gap-3 pt-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-3 rounded-[1.2rem] border-2 border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[11px]"
                >
                  {t('btn_cancel', 'Vazgeç')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-[1.2rem] bg-cyan-500 hover:bg-cyan-600 text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-cyan-500/20"
                >
                  {t('btn_submit_request', 'Talebi Gönder')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-6xl h-[88vh] bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-900 p-6 flex items-center justify-between text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] opacity-70">{selectedRequest.request_type_label}</p>
                <h3 className="text-2xl font-black mt-2">{selectedRequest.title}</h3>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center">
                <XCircle size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-black uppercase tracking-widest">
                {t('lbl_loading', 'Yükleniyor...')}
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] overflow-hidden">
                <div className="border-b xl:border-b-0 xl:border-r border-slate-100 overflow-y-auto custom-scrollbar p-6 space-y-5 bg-slate-50/60">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl border border-slate-100 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lbl_requested_by', 'Talebi Açan')}</p>
                      <p className="mt-2 text-base font-black text-slate-800">{selectedRequest.creator_name}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lbl_requested_for', 'Talep Edilen Personel')}</p>
                      <p className="mt-2 text-base font-black text-slate-800">{selectedRequest.requested_for_name || selectedRequest.creator_name}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lbl_description', 'Açıklama')}</p>
                    <p className="mt-2 text-sm font-medium text-slate-700 leading-relaxed">{selectedRequest.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px] font-black">
                    <span className={`px-3 py-1.5 rounded-xl border ${STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.OPEN}`}>
                      {getStatusLabel(selectedRequest.status)}
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700">
                      {t('lbl_assigned_to', 'Yönlendirilen')}: {selectedRequest.assigned_to_name || '-'}
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700">
                      {t('lbl_priority', 'Öncelik')}: {selectedRequest.priority}
                    </span>
                  </div>

                  {getVisiblePayloadEntries(selectedRequest.form_payload).length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {getVisiblePayloadEntries(selectedRequest.form_payload).map(([key, value]) => (
                        <div key={key} className="bg-white rounded-2xl border border-slate-100 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{getPayloadLabel(key)}</p>
                          <p className="mt-2 text-sm font-bold text-slate-800">{String(value || '-')}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-cyan-50 rounded-2xl border border-cyan-100 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-600">{t('lbl_routing_logic', 'İş Akışı')}</p>
                    <p className="mt-2 text-sm font-medium text-cyan-800">{selectedRequest.route_hint}</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lbl_action_history', 'Aksiyon Geçmişi')}</p>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={exportHistoryExcel}
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700"
                      >
                        {t('btn_export_excel', 'Excel Dışa Aktar')}
                      </button>
                      <button
                        type="button"
                        onClick={exportHistoryCsv}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700"
                      >
                        {t('btn_export_csv', 'CSV Dışa Aktar')}
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3">
                      <input
                        value={historyFilters.query}
                        onChange={(e) => setHistoryFilters((prev) => ({ ...prev, query: e.target.value }))}
                        placeholder={t('ph_search_history', 'Geçmişte ara')}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-cyan-400"
                      />
                      <select
                        value={historyFilters.action}
                        onChange={(e) => setHistoryFilters((prev) => ({ ...prev, action: e.target.value }))}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-cyan-400"
                      >
                        <option value="ALL">{t('opt_all_actions', 'Tüm Aksiyonlar')}</option>
                        {Array.from(new Set(((selectedRequest?.history) || []).map((item) => item.action).filter(Boolean))).map((action) => (
                          <option key={action} value={action}>{getHistoryActionLabel(action)}</option>
                        ))}
                      </select>
                      <select
                        value={historyFilters.actor}
                        onChange={(e) => setHistoryFilters((prev) => ({ ...prev, actor: e.target.value }))}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-cyan-400"
                      >
                        <option value="ALL">{t('opt_all_actors', 'Tüm Kullanıcılar')}</option>
                        {Array.from(new Set(((selectedRequest?.history) || []).map((item) => item.actor_name).filter(Boolean))).map((actor) => (
                          <option key={actor} value={actor}>{actor}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={historyFilters.start_date}
                        onChange={(e) => setHistoryFilters((prev) => ({ ...prev, start_date: e.target.value }))}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-cyan-400"
                      />
                      <input
                        type="date"
                        value={historyFilters.end_date}
                        onChange={(e) => setHistoryFilters((prev) => ({ ...prev, end_date: e.target.value }))}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div className="mt-3 space-y-3">
                      {filteredHistoryItems.length === 0 ? (
                        <p className="text-sm font-medium text-slate-500">{t('msg_no_action_history', 'Henüz aksiyon geçmişi yok.')}</p>
                      ) : (
                        filteredHistoryItems.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{getHistoryActionLabel(item.action)}</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleString(locale) : '-'}</p>
                            </div>
                            <p className="mt-2 text-sm font-bold text-slate-800">{item.actor_name || '-'}</p>
                            {item.detail && <p className="mt-1 text-sm font-medium text-slate-600">{item.detail}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-white">
                    <h4 className="text-sm font-black uppercase tracking-[0.22em] text-slate-700">{t('lbl_request_timeline', 'Talep Akışı')}</h4>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 bg-white">
                    {(selectedRequest.messages || []).length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 font-black uppercase tracking-widest text-xs">
                        {t('msg_no_request_messages', 'Henüz yorum veya ek yok.')}
                      </div>
                    ) : (
                      selectedRequest.messages.map((msg) => {
                        const isMine = msg.sender_id === currentUserId;
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMine ? (isArabic ? 'items-start' : 'items-end') : (isArabic ? 'items-end' : 'items-start')}`}>
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 px-2">{msg.sender_name}</span>
                            <div className={`mt-1 max-w-[85%] rounded-[1.5rem] px-4 py-3 shadow-sm border ${isMine ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                              <p className="text-sm font-medium whitespace-pre-wrap">{msg.message}</p>
                              {msg.file_url && (
                                <a href={getAbsoluteFileUrl(msg.file_url)} target="_blank" rel="noreferrer" className={`mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-widest ${isMine ? 'bg-cyan-700 text-white' : 'bg-white text-cyan-700 border border-cyan-200'}`}>
                                  <FileText size={14} />
                                  {t('btn_open_attachment', 'Eki Aç')}
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} className="p-5 border-t border-slate-100 bg-slate-50 space-y-3">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      className="w-full rounded-[1.4rem] border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-cyan-400"
                      placeholder={t('ph_request_reply', 'Akışa not, cevap veya işlem bilgisi yazın')}
                    />
                    {selectedFile && (
                      <div className="flex items-center justify-between rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-700">
                        <span>{selectedFile.name}</span>
                        <button type="button" onClick={() => setSelectedFile(null)} className="text-cyan-700">
                          <XCircle size={18} />
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 px-4 py-3 rounded-[1.2rem] border-2 border-slate-200 bg-white text-slate-700 font-black uppercase tracking-widest text-[11px] cursor-pointer">
                        <Paperclip size={14} />
                        {t('btn_add_attachment', 'Dosya Ekle')}
                        <input type="file" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                      </label>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-[1.2rem] bg-cyan-500 hover:bg-cyan-600 text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-cyan-500/20"
                      >
                        <Send size={14} />
                        {t('btn_send_message', 'Mesaj Gönder')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericRequestManagement;

import React, { useState, useEffect } from 'react';
import api, { expenseApi, getAbsoluteFileUrl, getEmployees } from '../api/axios'; 
import { 
  Receipt, CheckCircle, XCircle, Clock, 
  AlertCircle, FileText, User, ChevronRight, Image as ImageIcon,
  DollarSign, CreditCard, Plus, UploadCloud, Trash2,
  FileSpreadsheet, Download, Search
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi
import { localizeDigits } from '../utils/localizeNumber';
import FilterPopover from './FilterPopover';

const CURRENCY_OPTIONS = [
  { value: 'TRY', label: '₺ TRY' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'GBP', label: '£ GBP' },
  { value: 'AED', label: 'د.إ AED' },
  { value: 'SAR', label: '﷼ SAR' },
  { value: 'QAR', label: '﷼ QAR' },
  { value: 'KWD', label: 'د.ك KWD' },
  { value: 'BHD', label: '.د.ب BHD' },
  { value: 'OMR', label: 'ر.ع OMR' },
  { value: 'JOD', label: 'د.ا JOD' },
  { value: 'EGP', label: '£ EGP' },
];

const ExpenseManagement = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası eklendi
  
  // 🌍 Dinamik toLocaleUpperCase ve RTL için dil tespiti
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);

  // 🌍 KATEGORİLERİ DİNAMİKLEŞTİR
  const getExpenseCategories = () => [
    t('cat_food', "Yemek & Gıda"), 
    t('cat_transport', "Yol & Ulaşım"), 
    t('cat_accommodation', "Konaklama"), 
    t('cat_education', "Eğitim & Kurs"), 
    t('cat_office', "Ofis Malzemesi"), 
    t('cat_customer', "Müşteri Ağırlama"), 
    t('cat_other', "Diğer")
  ];

  const EXPENSE_CATEGORIES = getExpenseCategories();

  const getLocalizedExpenseCategory = (value) => {
    const normalized = String(value || '').trim().toLocaleLowerCase('tr-TR');
    const categoryMap = {
      [t('cat_food', 'Food & Beverage').toLocaleLowerCase('tr-TR')]: t('cat_food', 'Food & Beverage'),
      'yemek & gıda': t('cat_food', 'Food & Beverage'),
      'yemek & gida': t('cat_food', 'Food & Beverage'),
      'yemek': t('cat_food', 'Food & Beverage'),
      'gıda': t('cat_food', 'Food & Beverage'),
      'gida': t('cat_food', 'Food & Beverage'),
      [t('cat_transport', 'Transport & Travel').toLocaleLowerCase('tr-TR')]: t('cat_transport', 'Transport & Travel'),
      'yol & ulaşım': t('cat_transport', 'Transport & Travel'),
      'yol & ulasim': t('cat_transport', 'Transport & Travel'),
      'ulaşım': t('cat_transport', 'Transport & Travel'),
      'ulasim': t('cat_transport', 'Transport & Travel'),
      'yakıt': t('cat_transport', 'Transport & Travel'),
      'yakit': t('cat_transport', 'Transport & Travel'),
      [t('cat_accommodation', 'Accommodation').toLocaleLowerCase('tr-TR')]: t('cat_accommodation', 'Accommodation'),
      'konaklama': t('cat_accommodation', 'Accommodation'),
      [t('cat_education', 'Education & Course').toLocaleLowerCase('tr-TR')]: t('cat_education', 'Education & Course'),
      'eğitim & kurs': t('cat_education', 'Education & Course'),
      'egitim & kurs': t('cat_education', 'Education & Course'),
      [t('cat_office', 'Office Supplies').toLocaleLowerCase('tr-TR')]: t('cat_office', 'Office Supplies'),
      'ofis malzemesi': t('cat_office', 'Office Supplies'),
      'ekipman': t('cat_office', 'Office Supplies'),
      'ofis': t('cat_office', 'Office Supplies'),
      [t('cat_customer', 'Client Hospitality').toLocaleLowerCase('tr-TR')]: t('cat_customer', 'Client Hospitality'),
      'müşteri ağırlama': t('cat_customer', 'Client Hospitality'),
      'musteri agirlama': t('cat_customer', 'Client Hospitality'),
      [t('cat_other', 'Other').toLocaleLowerCase('tr-TR')]: t('cat_other', 'Other'),
      'diğer': t('cat_other', 'Other'),
      'diger': t('cat_other', 'Other'),
    };
    return categoryMap[normalized] || value || t('cat_other', 'Other');
  };

  const [expenses, setExpenses] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState({
    pending: { count: 0, total_amount: 0, totals_by_currency: {} },
    approved: { count: 0, total_amount: 0, totals_by_currency: {} },
    rejected: { count: 0, total_amount: 0, totals_by_currency: {} },
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("PENDING");
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({ query: '', employee_id: 'ALL', category: 'ALL', start_date: '', end_date: '' });
  const [filterDraft, setFilterDraft] = useState({ query: '', employee_id: 'ALL', category: 'ALL', start_date: '', end_date: '' });
  const [openFilterMenu, setOpenFilterMenu] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  
  const [receiptModal, setReceiptModal] = useState({ isOpen: false, url: null, empName: "" });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const userRole = localStorage.getItem('user_role') || "EMPLOYEE";
  const currentUserId = parseInt(localStorage.getItem('user_id'));
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'TRY',
    category: EXPENSE_CATEGORIES[0],
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    file: null
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', activeTab);
      if (filters.query.trim()) params.set('query', filters.query.trim());
      if (filters.employee_id !== 'ALL') params.set('employee_id', filters.employee_id);
      if (filters.category !== 'ALL') params.set('category', filters.category);
      if (filters.start_date) params.set('start_date', filters.start_date);
      if (filters.end_date) params.set('end_date', filters.end_date);
      const res = await api.get(`/expense/list?${params.toString()}`); 
      setExpenses(res.data || []);
    } catch (err) {
      toast.error(t('err_fetch_expenses', "Masraflar çekilirken hata oluştu."));
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenseSummary = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.query.trim()) params.set('query', filters.query.trim());
      if (filters.employee_id !== 'ALL') params.set('employee_id', filters.employee_id);
      if (filters.category !== 'ALL') params.set('category', filters.category);
      if (filters.start_date) params.set('start_date', filters.start_date);
      if (filters.end_date) params.set('end_date', filters.end_date);
      const res = await api.get(`/expense/summary?${params.toString()}`);
      setExpenseSummary(res.data || {
        pending: { count: 0, total_amount: 0, totals_by_currency: {} },
        approved: { count: 0, total_amount: 0, totals_by_currency: {} },
        rejected: { count: 0, total_amount: 0, totals_by_currency: {} },
      });
    } catch (err) {
      // summary hatasını sessiz geçiyoruz; liste ekranı yine çalışsın
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [activeTab, filters.query, filters.employee_id, filters.category, filters.start_date, filters.end_date]);

  useEffect(() => {
    fetchExpenseSummary();
  }, [filters.query, filters.employee_id, filters.category, filters.start_date, filters.end_date]);

  useEffect(() => {
    setFilterDraft(filters);
  }, [filters]);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await getEmployees();
        const allEmployees = Array.isArray(res.data) ? res.data : [];
        setEmployeeOptions(allEmployees.filter((emp) => emp?.is_active !== false));
      } catch (err) {
        setEmployeeOptions([]);
      }
    };
    loadEmployees();
  }, []);

  // 🎯 GÜNCELLENDİ: Hata yakalayıcıya çeviri desteği
  const getSafeErrorMessage = (err, defaultMsg) => {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      const fieldName = detail[0]?.loc?.[1] || t('lbl_unknown_field', "Bilinmeyen Alan");
      return t('err_format_invalid', "Hata ({{field}}): Eksik veya geçersiz format!").replace('{{field}}', fieldName);
    }
    return defaultMsg;
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!currentUserId) return toast.error(t('err_no_user_id', "Kullanıcı kimliği bulunamadı."));
    if (!formData.file) return toast.error(t('err_missing_receipt', "Lütfen bir fiş/fatura görseli yükleyin."));

    const data = new FormData();
    data.append('employee_id', currentUserId);
    data.append('amount', parseFloat(formData.amount));
    data.append('currency', formData.currency);
    data.append('category', formData.category);
    data.append('description', formData.description || t('lbl_no_desc', 'Açıklama girilmedi'));
    data.append('expense_date', formData.expense_date);
    data.append('file', formData.file);

    const loadingToast = toast.loading(t('msg_uploading_expense', "Fiş yükleniyor ve kaydediliyor..."));
    try {
      await api.post('/expense/', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success(t('msg_expense_submitted', "Masrafınız eklendi ve onaya gönderildi!"), { id: loadingToast });
      setIsAddModalOpen(false);
      setFormData({ amount: '', currency: 'TRY', category: EXPENSE_CATEGORIES[0], description: '', expense_date: new Date().toISOString().split('T')[0], file: null });
      fetchExpenses();
      fetchExpenseSummary();
    } catch (err) {
      toast.error(getSafeErrorMessage(err, t('err_submit_expense', "Masraf eklenemedi.")), { id: loadingToast });
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    let rejectReason = "";
    if (newStatus === 'REJECTED') {
      rejectReason = prompt(t('prompt_reject_reason', "Lütfen reddetme sebebini yazınız (Zorunlu Değil):"), t('prompt_reject_default', "Fiş görseli okunamıyor veya standart dışı."));
      if (rejectReason === null) return; 
    } else {
      if (!window.confirm(t('msg_confirm_approve', "Bu masraf beyanını ONAYLAMAK istediğinize emin misiniz?"))) return;
    }

    const loadingToast = toast.loading(t('msg_processing', "İşlem gerçekleştiriliyor ve e-posta atılıyor..."));
    try {
      await api.put(`/expense/${id}/status`, { status: newStatus, rejection_reason: rejectReason });
      toast.success(
        newStatus === 'APPROVED'
          ? t('msg_expense_approved', "Masraf onaylandı.")
          : t('msg_expense_rejected', "Masraf reddedildi."),
        { id: loadingToast }
      );
      fetchExpenses(); 
      fetchExpenseSummary();
    } catch (err) {
      toast.error(getSafeErrorMessage(err, t('err_action_failed', "İşlem başarısız.")), { id: loadingToast });
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm(t('msg_confirm_delete_expense', "Bu masrafı tamamen SİLMEK istediğinize emin misiniz?"))) return;
    try {
      await api.delete(`/expense/${id}`);
      toast.success(t('msg_expense_deleted', "Masraf kaydı başarıyla silindi."));
      fetchExpenses();
      fetchExpenseSummary();
    } catch (err) {
      toast.error(getSafeErrorMessage(err, t('err_delete_failed', "Silinemedi.")));
    }
  };

  const handleExport = async (format) => {
    const tLoading = toast.loading(t('msg_exporting', 'Dışa aktarılıyor...'));
    setExporting(true);
    try {
      const response = await api.get(`/expense/export?format=${format}&status=${activeTab}`, {
        params: {
          query: filters.query.trim() || undefined,
          employee_id: filters.employee_id !== 'ALL' ? filters.employee_id : undefined,
          category: filters.category !== 'ALL' ? filters.category : undefined,
          start_date: filters.start_date || undefined,
          end_date: filters.end_date || undefined,
        },
        responseType: 'blob',
        headers: { 'Accept-Language': i18n.language },
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const ext = format === 'excel' ? 'xlsx' : format;
      const fileNameStr = t('file_expense', 'Masraf_Raporu');
      link.setAttribute('download', `${fileNameStr}_${new Date().toISOString().split('T')[0]}.${ext}`);

      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success(t('msg_export_success', 'Dosya başarıyla indirildi!'), { id: tLoading });
    } catch (err) {
      toast.error(getSafeErrorMessage(err, t('err_export_failed', 'Dışa aktarım başarısız oldu.')), { id: tLoading });
    } finally {
      setExporting(false);
    }
  };

  const openReceipt = (url, firstName, lastName) => {
    setReceiptModal({ isOpen: true, url: getAbsoluteFileUrl(url), empName: `${firstName} ${lastName}` });
  };

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
    if (menuKey === 'employee') {
      setFilterDraft((prev) => ({ ...prev, employee_id: 'ALL' }));
      return;
    }
    if (menuKey === 'category') {
      setFilterDraft((prev) => ({ ...prev, category: 'ALL' }));
      return;
    }
    if (menuKey === 'date') {
      setFilterDraft((prev) => ({ ...prev, start_date: '', end_date: '' }));
    }
  };

  const filteredExpenses = expenses;

  // 🌍 Sayı Formatlayıcı
  const formatCurrency = (amount) => {
    return localizedNumber(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 🌍 Tarih Formatlayıcı
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(locale);
  };

  const getSummaryCardClass = (statusKey) => {
    if (statusKey === 'PENDING') {
      return activeTab === statusKey
        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
        : 'bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100';
    }
    if (statusKey === 'APPROVED') {
      return activeTab === statusKey
        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
        : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100';
    }
    return activeTab === statusKey
      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
      : 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100';
  };

  const getSummaryMetaClass = (statusKey) => (
    activeTab === statusKey ? 'text-white/80' : 'text-slate-400'
  );

  const renderCurrencyBreakdown = (summary, statusKey) => {
    const currencyEntries = Object.entries(summary?.totals_by_currency || {});
    if (!currencyEntries.length) {
      return <div className="mt-1 text-lg font-black tracking-tight" dir="ltr">0.00</div>;
    }

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {currencyEntries.map(([currency, amount]) => (
          <span
            key={`${statusKey}-${currency}`}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black tracking-widest border ${
              activeTab === statusKey
                ? 'bg-white/15 border-white/20 text-white'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
            dir="ltr"
          >
            {formatCurrency(amount)} {currency}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6 relative font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? "top-left" : "top-right"} />

      {/* ================= ÜST BAR ================= */}
      <div className="flex flex-col gap-4 shrink-0 w-full">
        <div className="grid grid-cols-1 xl:grid-cols-[170px_170px_170px_170px_auto_auto] gap-2 w-full xl:w-auto items-center">
          <FilterPopover
            label={t('lbl_search', 'Arama')}
            open={openFilterMenu === 'query'}
            active={Boolean(filters.query)}
            onToggle={() => setOpenFilterMenu((prev) => (prev === 'query' ? null : 'query'))}
            onReset={() => resetFilterMenu('query')}
            onCancel={cancelFilterMenu}
            onApply={applyFilterMenu}
            align={isArabic ? 'left' : 'right'}
            panelWidthClass="w-[300px]"
          >
            <div className="relative">
              <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isArabic ? 'right-3' : 'left-3'}`} />
              <input
                value={filterDraft.query}
                onChange={(e) => setFilterDraft((prev) => ({ ...prev, query: e.target.value }))}
                placeholder={t('ph_search_expense_employee', 'Personel ara')}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500 ${isArabic ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
              />
            </div>
          </FilterPopover>

          <FilterPopover
            label={t('col_personnel', 'Personel')}
            open={openFilterMenu === 'employee'}
            active={filters.employee_id !== 'ALL'}
            onToggle={() => setOpenFilterMenu((prev) => (prev === 'employee' ? null : 'employee'))}
            onReset={() => resetFilterMenu('employee')}
            onCancel={cancelFilterMenu}
            onApply={applyFilterMenu}
            align={isArabic ? 'left' : 'right'}
          >
            <select
              value={filterDraft.employee_id}
              onChange={(e) => setFilterDraft((prev) => ({ ...prev, employee_id: e.target.value }))}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500 appearance-none cursor-pointer ${isArabic ? 'text-right' : 'text-left'}`}
            >
              <option value="ALL">{t('opt_all_personnel', 'Tüm Personel')}</option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {`${employee.first_name || ''} ${employee.last_name || ''}`.trim()}
                </option>
              ))}
            </select>
          </FilterPopover>

          <FilterPopover
            label={t('lbl_category', 'Kategori')}
            open={openFilterMenu === 'category'}
            active={filters.category !== 'ALL'}
            onToggle={() => setOpenFilterMenu((prev) => (prev === 'category' ? null : 'category'))}
            onReset={() => resetFilterMenu('category')}
            onCancel={cancelFilterMenu}
            onApply={applyFilterMenu}
            align={isArabic ? 'left' : 'right'}
          >
            <select
              value={filterDraft.category}
              onChange={(e) => setFilterDraft((prev) => ({ ...prev, category: e.target.value }))}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500 appearance-none cursor-pointer ${isArabic ? 'text-right' : 'text-left'}`}
            >
              <option value="ALL">{t('opt_all_categories', 'Tüm Kategoriler')}</option>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </FilterPopover>

          <FilterPopover
            label={t('lbl_date_range', 'Tarih Aralığı')}
            open={openFilterMenu === 'date'}
            active={Boolean(filters.start_date || filters.end_date)}
            onToggle={() => setOpenFilterMenu((prev) => (prev === 'date' ? null : 'date'))}
            onReset={() => resetFilterMenu('date')}
            onCancel={cancelFilterMenu}
            onApply={applyFilterMenu}
            align={isArabic ? 'left' : 'right'}
          >
            <input
              type="date"
              value={filterDraft.start_date}
              onChange={(e) => setFilterDraft((prev) => ({ ...prev, start_date: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500"
              dir="ltr"
            />
            <input
              type="date"
              value={filterDraft.end_date}
              onChange={(e) => setFilterDraft((prev) => ({ ...prev, end_date: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500"
              dir="ltr"
            />
          </FilterPopover>

          <div className={`grid grid-cols-2 sm:flex gap-2 ${isArabic ? 'sm:flex-row-reverse' : ''}`}>
            <button onClick={() => handleExport('excel')} disabled={exporting || !filteredExpenses.length} className="flex items-center justify-center gap-1.5 px-3 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 whitespace-nowrap">
              <FileSpreadsheet size={15} /> {t('btn_export_excel', 'EXCEL')}
            </button>
            <button onClick={() => handleExport('csv')} disabled={exporting || !filteredExpenses.length} className="flex items-center justify-center gap-1.5 px-3 py-3 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 whitespace-nowrap">
              <FileText size={15} /> {t('btn_export_csv', 'CSV')}
            </button>
            <button onClick={() => handleExport('pdf')} disabled={exporting || !filteredExpenses.length} className="flex items-center justify-center gap-1.5 px-3 py-3 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 whitespace-nowrap">
              <Download size={15} /> {t('btn_export_pdf', 'PDF')}
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            title={t('btn_new_expense', 'YENİ MASRAF GİRİŞİ')}
            className="w-full xl:w-auto bg-slate-900 text-white px-4 py-3.5 rounded-2xl font-black text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl hover:bg-emerald-600 transition-all active:scale-95 uppercase"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button onClick={() => setActiveTab("PENDING")} className={`rounded-[2rem] p-5 text-left transition-all ${getSummaryCardClass("PENDING")} ${isArabic ? 'text-right' : ''}`}>
            <div className={`flex items-center justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <div className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${activeTab === 'PENDING' ? 'text-white' : 'text-amber-700'}`}>
                <Clock size={16}/> {t('tab_pending', 'BEKLEYENLER')}
              </div>
              <span className={`text-3xl font-black tracking-tighter ${activeTab === 'PENDING' ? 'text-white' : 'text-slate-900'}`}>
                {localizedNumber(expenseSummary.pending?.count || 0)}
              </span>
            </div>
            <div className={`mt-3 text-[11px] font-black uppercase tracking-[0.2em] ${getSummaryMetaClass("PENDING")}`}>
              {t('lbl_total_amount', 'TOPLAM TUTAR')}
            </div>
            {renderCurrencyBreakdown(expenseSummary.pending, "PENDING")}
          </button>

          <button onClick={() => setActiveTab("APPROVED")} className={`rounded-[2rem] p-5 text-left transition-all ${getSummaryCardClass("APPROVED")} ${isArabic ? 'text-right' : ''}`}>
            <div className={`flex items-center justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <div className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${activeTab === 'APPROVED' ? 'text-white' : 'text-emerald-700'}`}>
                <CheckCircle size={16}/> {t('tab_approved', 'ONAYLANANLAR')}
              </div>
              <span className={`text-3xl font-black tracking-tighter ${activeTab === 'APPROVED' ? 'text-white' : 'text-slate-900'}`}>
                {localizedNumber(expenseSummary.approved?.count || 0)}
              </span>
            </div>
            <div className={`mt-3 text-[11px] font-black uppercase tracking-[0.2em] ${getSummaryMetaClass("APPROVED")}`}>
              {t('lbl_total_amount', 'TOPLAM TUTAR')}
            </div>
            {renderCurrencyBreakdown(expenseSummary.approved, "APPROVED")}
          </button>

          <button onClick={() => setActiveTab("REJECTED")} className={`rounded-[2rem] p-5 text-left transition-all ${getSummaryCardClass("REJECTED")} ${isArabic ? 'text-right' : ''}`}>
            <div className={`flex items-center justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <div className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${activeTab === 'REJECTED' ? 'text-white' : 'text-rose-700'}`}>
                <XCircle size={16}/> {t('tab_rejected', 'REDDEDİLENLER')}
              </div>
              <span className={`text-3xl font-black tracking-tighter ${activeTab === 'REJECTED' ? 'text-white' : 'text-slate-900'}`}>
                {localizedNumber(expenseSummary.rejected?.count || 0)}
              </span>
            </div>
            <div className={`mt-3 text-[11px] font-black uppercase tracking-[0.2em] ${getSummaryMetaClass("REJECTED")}`}>
              {t('lbl_total_amount', 'TOPLAM TUTAR')}
            </div>
            {renderCurrencyBreakdown(expenseSummary.rejected, "REJECTED")}
          </button>
        </div>
      </div>

      {/* ================= MASRAF LİSTESİ ================= */}
      <div className="flex-1 bg-white rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col pb-4">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs h-full">{t('lbl_loading', 'MASRAFLAR YÜKLENİYOR...')}</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-32 border-2 border-dashed border-slate-100 m-8 rounded-[2rem] opacity-70">
              <AlertCircle className="mb-4 opacity-50 text-slate-400" size={56}/> 
              <span dangerouslySetInnerHTML={{__html: t('msg_no_expenses_category_html', "BU KATEGORİDE MASRAF BEYANI BULUNMUYOR.")}}></span>
            </div>
          ) : (
            <table className="w-full text-left relative">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 tracking-[0.2em] border-b sticky top-0 z-10 uppercase shadow-sm">
                <tr>
                  <th className={`py-6 px-8 ${isArabic ? 'text-right' : 'text-left'}`}>{t('col_personnel', 'PERSONEL')}</th>
                  <th className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>{t('col_category_date', 'KATEGORİ & TARİH')}</th>
                  <th className={`p-6 ${isArabic ? 'text-left' : 'text-right'}`}>{t('col_amount', 'TUTAR')}</th>
                  <th className="p-6 text-center">{t('col_receipt', 'FİŞ / FATURA')}</th>
                  <th className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>{t('col_description', 'AÇIKLAMA / NOT')}</th>
                  <th className={`py-6 px-8 ${isArabic ? 'text-left' : 'text-right'}`}>{t('col_actions', 'İŞLEMLER')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredExpenses.map(exp => {
                  const isOwnRequest = exp.employee_id === currentUserId;
                  const canApprove = ["MANAGER", "HR", "ADMIN", "SUPERADMIN"].includes(userRole) && exp.status === "PENDING";

                  return (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className={`py-6 px-8 ${isArabic ? 'text-right' : 'text-left'}`}>
                      <div className="font-black text-slate-800 uppercase flex items-center gap-2">
                        <User size={14} className="text-emerald-500 shrink-0"/>
                        {exp.employee?.first_name?.toLocaleUpperCase(locale)} {exp.employee?.last_name?.toLocaleUpperCase(locale)}
                      </div>
                    </td>
                    <td className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                      <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-black text-slate-600 text-[10px] uppercase tracking-widest shadow-sm inline-block mb-2">
                        {/* Kategori backend'den dönüyor, listeye eklenebilir veya ham kalabilir */}
                        {getLocalizedExpenseCategory(exp.category)}
                      </span>
                      <div className={`text-[11px] font-bold text-slate-400 tracking-widest flex items-center gap-1.5 ${isArabic ? 'flex-row-reverse justify-end' : ''}`} dir="ltr">
                        <Clock size={12} className="shrink-0"/> {formatDate(exp.expense_date)}
                      </div>
                    </td>
                    <td className={`p-6 ${isArabic ? 'text-left' : 'text-right'}`}>
                      <div className={`flex items-center gap-1 ${isArabic ? 'justify-start flex-row-reverse' : 'justify-end'}`} dir="ltr">
                        <span className="font-black text-xl text-slate-800 tracking-tighter">{formatCurrency(exp.amount)}</span>
                        <span className="text-[10px] font-black text-slate-400 tracking-widest">{exp.currency}</span>
                      </div>
                      {exp.is_paid && (
                         <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-black tracking-widest uppercase mt-1 inline-block border border-indigo-100 shadow-sm">{t('badge_added_to_payroll', 'BORDROYA EKLENDİ')}</span>
                      )}
                    </td>
                    <td className="p-6 text-center">
                      {exp.receipt_url ? (
                        <button 
                          onClick={() => openReceipt(exp.receipt_url, exp.employee?.first_name, exp.employee?.last_name)}
                          className="font-black text-[10px] text-indigo-600 bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-100 flex items-center justify-center gap-2 mx-auto hover:bg-indigo-600 hover:text-white transition-all shadow-sm tracking-widest uppercase"
                        >
                          <ImageIcon size={14}/> {t('btn_view_receipt', 'FİŞİ GÖR')}
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 uppercase tracking-widest">{t('lbl_no_doc', 'BELGE YOK')}</span>
                      )}
                    </td>
                    <td className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                       <p className="text-[11px] font-bold text-slate-500 max-w-[200px] truncate italic" title={exp.description}>"{exp.description || "-"}"</p>
                       {exp.status === 'REJECTED' && exp.rejection_reason && (
                         <p className="text-[10px] font-black text-rose-500 mt-1 uppercase tracking-widest truncate max-w-[200px]" title={exp.rejection_reason}>{t('lbl_cancel_reason', 'İptal Nedeni:')} {exp.rejection_reason}</p>
                       )}
                    </td>
                    
                    <td className={`py-6 px-8 ${isArabic ? 'text-left' : 'text-right'}`}>
                      {activeTab !== "PENDING" ? (
                        <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">{t('lbl_action_completed', 'İŞLEM TAMAMLANDI')}</span>
                      ) : isOwnRequest && !canApprove ? (
                        <div className={`flex gap-2 transition-all ${isArabic ? 'justify-start' : 'justify-end'}`}>
                          <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 mt-2">{t('lbl_pending_approval', 'ONAY BEKLİYOR')}</span>
                          <button onClick={() => handleDeleteExpense(exp.id)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center gap-1.5 font-black text-[10px] tracking-widest border border-slate-200" title={t('tooltip_delete_req', "Talebimi Sil")}>
                            <Trash2 size={14}/> 
                          </button>
                        </div>
                      ) : canApprove && !isOwnRequest ? (
                         <div className={`flex gap-2 transition-all ${isArabic ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
                          <button onClick={() => handleStatusUpdate(exp.id, "APPROVED")} className="p-2 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-sm flex items-center gap-1 font-black text-[10px] tracking-widest uppercase border border-emerald-100">
                            <CheckCircle size={14}/> {t('btn_approve', 'ONAYLA')}
                          </button>
                          <button onClick={() => handleStatusUpdate(exp.id, "REJECTED")} className="p-2 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center gap-1 font-black text-[10px] tracking-widest uppercase border border-rose-100">
                            <XCircle size={14}/> {t('btn_reject', 'REDDET')}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">{t('lbl_no_action_needed', 'İŞLEM GEREKMİYOR')}</span>
                      )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ================= MASRAF EKLEME MODALI ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white shrink-0">
              <h2 className="text-xl font-black italic tracking-tighter flex items-center gap-3 uppercase">
                <div className="p-2 bg-emerald-500 rounded-xl"><Plus size={20} className="text-white"/></div>
                {t('modal_title_new_expense', 'YENİ MASRAF GİRİŞİ')}
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className={`text-slate-400 hover:text-white transition-colors ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={32} /></button>
            </div>
            
            <form onSubmit={handleAddExpense} className="p-10 space-y-8 bg-slate-50 overflow-y-auto custom-scrollbar max-h-[80vh]">
              
              {/* Kategori & Tarih */}
              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className={`text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_category', 'Category')} <span className="text-rose-500">*</span></label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={`w-full p-4 bg-white border-2 border-slate-100 rounded-2xl outline-none font-black text-sm text-slate-700 focus:border-emerald-500 shadow-sm transition-all appearance-none ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}>
                    {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className={`text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_expense_date', 'Masraf Tarihi')} <span className="text-rose-500">*</span></label>
                  <input type="date" required value={formData.expense_date} onChange={e => setFormData({...formData, expense_date: e.target.value})} className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl outline-none font-black text-sm text-slate-700 focus:border-emerald-500 shadow-sm transition-all" dir={isArabic ? "rtl" : "ltr"}/>
                </div>
              </div>

              {/* Tutar & Döviz */}
              <div className="flex gap-5">
                <div className="flex flex-col gap-2 flex-[3]">
                  <label className={`text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_amount', 'Fiş Tutarı')} <span className="text-rose-500">*</span></label>
                  <input type="number" step="0.01" min="0" required placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-black text-xl text-slate-800 shadow-sm transition-all" dir="ltr"/>
                </div>
                <div className="flex flex-col gap-2 flex-[1]">
                  <label className={`text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_currency', 'Döviz')}</label>
                  <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className={`w-full p-4 bg-white border-2 border-slate-100 rounded-2xl outline-none font-black text-sm text-slate-700 focus:border-emerald-500 shadow-sm transition-all appearance-none ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`} dir="ltr">
                    {CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency.value} value={currency.value}>{currency.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={`-mt-3 px-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">
                  {t('lbl_amount_preview', 'TUTAR ÖNİZLEME')}: <span dir={isArabic ? 'rtl' : 'ltr'}>{formatCurrency(formData.amount || 0)} {formData.currency}</span>
                </p>
              </div>

              {/* Açıklama */}
              <div className="flex flex-col gap-2">
                <label className={`text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_desc_details', 'Açıklama / Detay')}</label>
                <textarea placeholder={t('ph_expense_desc', "Müşteri yemeği, proje malzemesi vb.")} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm text-slate-700 min-h-[100px] resize-none shadow-sm transition-all"></textarea>
              </div>

              {/* 📸 FİŞ YÜKLEME ALANI */}
              <div className="flex flex-col gap-2">
                <label className={`text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_receipt_image', 'Fiş / Fatura Görseli')} <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input type="file" required accept="image/*,.pdf" onChange={e => setFormData({...formData, file: e.target.files[0]})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title=" "/>
                  <div className={`w-full p-8 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all ${formData.file ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-300 hover:border-emerald-300 hover:bg-slate-50'}`}>
                    <UploadCloud size={40} className={formData.file ? 'text-emerald-500' : 'text-slate-300'}/>
                    <span className={`font-black text-[10px] tracking-widest uppercase text-center ${formData.file ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {formData.file ? formData.file.name : t('btn_open_cam_gallery', "FOTOĞRAF / PDF SEÇ")}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`flex gap-4 pt-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-8 py-5 bg-white border border-slate-200 rounded-[2rem] font-black text-[10px] tracking-[0.2em] uppercase text-slate-500 hover:bg-slate-50 transition-all shadow-sm">{t('btn_cancel', 'İPTAL')}</button>
                <button type="submit" className={`flex-[2] bg-emerald-500 text-white rounded-[2rem] font-black text-[10px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/30 active:scale-95 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <CheckCircle size={18}/> {t('btn_submit_for_approval', 'BEYAN ET VE ONAYA GÖNDER')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 📸 FİŞ GÖRÜNTÜLEME MODALI ================= */}
      {receiptModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
              <h2 className="text-xl font-black italic tracking-tighter flex items-center gap-3 uppercase">
                <Receipt size={24} className="text-cyan-500"/> {t('modal_title_receipt', 'MASRAF FİŞİ')}
              </h2>
              <button onClick={() => setReceiptModal({ isOpen: false, url: null, empName: "" })} className={`text-slate-400 hover:text-white transition-all ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={32} /></button>
            </div>
            
            <div className="p-8 bg-slate-50/50 flex-1 overflow-auto flex items-center justify-center relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] min-h-[300px]">
              <div className={`absolute top-6 bg-slate-900/90 backdrop-blur-md px-5 py-3 rounded-2xl font-black text-[10px] tracking-[0.2em] text-white shadow-xl border border-slate-700 flex items-center gap-2 z-20 ${isArabic ? 'right-6 flex-row-reverse' : 'left-6'}`}>
                <User size={14} className="text-emerald-400"/> {t('lbl_personnel_name', 'PERSONEL:')} {receiptModal.empName}
              </div>
              
              {receiptModal.url.endsWith('.pdf') ? (
                 <iframe src={receiptModal.url} className="w-full h-[60vh] rounded-[2rem] shadow-2xl border-4 border-white relative z-10 bg-white" title={t('lbl_receipt_pdf', 'Fiş PDF')} />
              ) : (
                <img 
                  src={receiptModal.url} 
                  alt={t('lbl_receipt_img', 'Masraf Fişi')} 
                  className="max-w-full h-auto rounded-[2rem] shadow-2xl border-4 border-white relative z-10 bg-white"
                  onError={(e) => { e.target.src = `https://via.placeholder.com/400x600?text=${t('lbl_img_not_found', 'Gorsel+Bulunamadi')}` }}
                />
              )}
            </div>

            <div className="p-6 bg-white border-t border-slate-100 shrink-0">
              <button onClick={() => setReceiptModal({ isOpen: false, url: null, empName: "" })} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-[10px] tracking-[0.2em] uppercase hover:bg-emerald-600 transition-all active:scale-95 shadow-xl shadow-slate-900/20">
                {t('btn_close_window', 'PENCEREYİ KAPAT')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManagement;

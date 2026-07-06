import React, { useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { CheckCircle, Clock, Plus, Receipt, Search, ShoppingCart, Store, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';

import { getEmployees, purchaseRequestApi } from '../api/axios';
import { localizeDigits } from '../utils/localizeNumber';
import FilterPopover from './FilterPopover';

const EMPTY_FORM = {
  item_name: '',
  item_url: '',
  vendor_name: '',
  quantity: 1,
  unit_price: '',
  currency: 'TRY',
  justification: '',
  needed_by: '',
};

const PurchaseRequestManagement = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const userRole = localStorage.getItem('user_role') || 'EMPLOYEE';
  const currentUserId = Number(localStorage.getItem('user_id') || '0');
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);

  const [activeTab, setActiveTab] = useState('PENDING');
  const [filters, setFilters] = useState({ query: '', employee_id: 'ALL' });
  const [filterDraft, setFilterDraft] = useState({ query: '', employee_id: 'ALL' });
  const [openFilterMenu, setOpenFilterMenu] = useState(null);
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({
    pending: { count: 0, totals_by_currency: {} },
    approved: { count: 0, totals_by_currency: {} },
    rejected: { count: 0, totals_by_currency: {} },
  });
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [historyModal, setHistoryModal] = useState({ open: false, title: '', items: [], loading: false });
  const [historyFilters, setHistoryFilters] = useState({ query: '', action: 'ALL', actor: 'ALL', start_date: '', end_date: '' });

  const getHistoryActionLabel = (action) => {
    switch (action) {
      case 'CREATED':
        return t('lbl_created', 'Oluşturuldu');
      case 'STATUS_UPDATED':
        return t('lbl_status_updated', 'Durum Güncellendi');
      case 'CONVERTED_TO_EXPENSE':
        return t('lbl_converted_to_expense', 'Masrafa Dönüştürüldü');
      default:
        return action || '-';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PENDING':
        return t('status_pending', 'Bekliyor');
      case 'APPROVED':
        return t('status_approved', 'Onaylandı');
      case 'REJECTED':
        return t('status_rejected', 'Reddedildi');
      default:
        return status || '-';
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await purchaseRequestApi.getAll({
        status: activeTab,
        query: filters.query || undefined,
        employee_id: filters.employee_id !== 'ALL' ? filters.employee_id : undefined,
      });
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error(t('err_fetch_purchase_requests', 'Satın alma talepleri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await purchaseRequestApi.getSummary({
        query: filters.query || undefined,
        employee_id: filters.employee_id !== 'ALL' ? filters.employee_id : undefined,
      });
      setSummary(res.data || {
        pending: { count: 0, totals_by_currency: {} },
        approved: { count: 0, totals_by_currency: {} },
        rejected: { count: 0, totals_by_currency: {} },
      });
    } catch (error) {
      // quiet
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab, filters.query, filters.employee_id]);

  useEffect(() => {
    fetchSummary();
  }, [filters.query, filters.employee_id]);

  useEffect(() => {
    setFilterDraft(filters);
  }, [filters]);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await getEmployees();
        setEmployeeOptions(Array.isArray(res.data) ? res.data : []);
      } catch {
        setEmployeeOptions([]);
      }
    };
    loadEmployees();
  }, []);

  const currentStatusSummary = useMemo(() => {
    if (activeTab === 'APPROVED') return summary.approved;
    if (activeTab === 'REJECTED') return summary.rejected;
    return summary.pending;
  }, [activeTab, summary]);

  const filteredHistoryItems = useMemo(() => {
    const normalizedQuery = historyFilters.query.trim().toLowerCase();
    return (historyModal.items || []).filter((item) => {
      if (historyFilters.action !== 'ALL' && item.action !== historyFilters.action) return false;
      if (historyFilters.actor !== 'ALL' && item.actor_name !== historyFilters.actor) return false;
      if (historyFilters.start_date && (!item.created_at || item.created_at.slice(0, 10) < historyFilters.start_date)) return false;
      if (historyFilters.end_date && (!item.created_at || item.created_at.slice(0, 10) > historyFilters.end_date)) return false;
      if (!normalizedQuery) return true;
      return [item.detail, item.actor_name, getHistoryActionLabel(item.action)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [historyModal.items, historyFilters]);

  const handleCreate = async (event) => {
    event.preventDefault();
    const loadingToast = toast.loading(t('msg_creating_purchase_request', 'Satın alma talebi oluşturuluyor...'));
    try {
      await purchaseRequestApi.create({
        employee_id: currentUserId,
        item_name: form.item_name,
        item_url: form.item_url || undefined,
        vendor_name: form.vendor_name || undefined,
        quantity: Number(form.quantity || 1),
        unit_price: Number(form.unit_price || 0),
        currency: form.currency,
        justification: form.justification || undefined,
        needed_by: form.needed_by || undefined,
      });
      toast.success(t('msg_purchase_request_created', 'Satın alma talebi finans onayına gönderildi.'), { id: loadingToast });
      window.dispatchEvent(new Event('app:refresh-notifications'));
      setShowCreateModal(false);
      setForm(EMPTY_FORM);
      fetchRequests();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_create_purchase_request', 'Talep oluşturulamadı.'), { id: loadingToast });
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    let rejection_reason = '';
    if (status === 'REJECTED') {
      rejection_reason = window.prompt(
        t('prompt_purchase_reject_reason', 'Lütfen reddetme sebebini yazın:'),
        t('prompt_purchase_reject_default', 'Bütçe / satın alma politikası nedeniyle uygun bulunmadı.')
      ) || '';
      if (!rejection_reason.trim()) return;
    } else if (!window.confirm(t('msg_confirm_purchase_approve', 'Bu satın alma talebini onaylamak istiyor musunuz?'))) {
      return;
    }

    const loadingToast = toast.loading(t('msg_processing', 'İşlem gerçekleştiriliyor...'));
    try {
      await purchaseRequestApi.updateStatus(requestId, { status, rejection_reason: rejection_reason || undefined });
      toast.success(
        status === 'APPROVED'
          ? t('msg_purchase_request_approved', 'Satın alma talebi onaylandı.')
          : t('msg_purchase_request_rejected', 'Satın alma talebi reddedildi.'),
        { id: loadingToast }
      );
      window.dispatchEvent(new Event('app:refresh-notifications'));
      fetchRequests();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_action_failed', 'İşlem sırasında hata oluştu.'), { id: loadingToast });
    }
  };

  const handleConvertToExpense = async (requestId) => {
    if (!window.confirm(t('msg_confirm_convert_purchase_expense', 'Bu talebi masraf kaydına dönüştürmek istiyor musunuz?'))) {
      return;
    }
    const loadingToast = toast.loading(t('msg_converting_purchase_expense', 'Masraf kaydı oluşturuluyor...'));
    try {
      await purchaseRequestApi.convertToExpense(requestId);
      toast.success(t('msg_purchase_expense_converted', 'Talep masraf kaydına dönüştürüldü.'), { id: loadingToast });
      window.dispatchEvent(new Event('app:refresh-notifications'));
      fetchRequests();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_convert_purchase_expense', 'Masraf kaydı oluşturulamadı.'), { id: loadingToast });
    }
  };

  const openHistoryModal = async (item) => {
    setHistoryFilters({ query: '', action: 'ALL', actor: 'ALL', start_date: '', end_date: '' });
    setHistoryModal({ open: true, title: item.item_name, items: [], loading: true });
    try {
      const res = await purchaseRequestApi.getHistory(item.id);
      setHistoryModal({ open: true, title: item.item_name, items: Array.isArray(res.data) ? res.data : [], loading: false });
    } catch (error) {
      setHistoryModal({ open: true, title: item.item_name, items: [], loading: false });
      toast.error(t('err_fetch_history', 'Geçmiş yüklenemedi.'));
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
    link.download = `purchase-request-history-${historyModal.title || 'export'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportHistoryExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredHistoryItems.map((item) => ({
        Aksiyon: getHistoryActionLabel(item.action),
        Kullanici: item.actor_name || '-',
        Detay: item.detail || '',
        Tarih: item.created_at
          ? new Date(item.created_at).toLocaleString(
              i18n.language === 'tr' ? 'tr-TR' : i18n.language === 'de' ? 'de-DE' : i18n.language === 'ar' ? 'ar-SA' : 'en-US'
            )
          : '-',
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gecmis');
    XLSX.writeFile(workbook, `purchase-request-history-${historyModal.title || 'export'}.xlsx`);
  };

  const renderTotals = (totals) => {
    const entries = Object.entries(totals || {});
    if (!entries.length) return <span className="text-slate-400">-</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {entries.map(([currency, amount]) => (
          <span key={currency} className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-black">
            {localizedNumber(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
          </span>
        ))}
      </div>
    );
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
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? 'top-left' : 'top-right'} />

      <div className={`flex flex-col xl:flex-row justify-between gap-4 ${isArabic ? 'xl:flex-row-reverse' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
          {[
            { key: 'pending', tab: 'PENDING', title: t('lbl_pending_requests', 'Bekleyen Talepler'), color: 'amber', icon: <Clock size={18} /> },
            { key: 'approved', tab: 'APPROVED', title: t('lbl_approved_requests', 'Onaylanan Talepler'), color: 'emerald', icon: <CheckCircle size={18} /> },
            { key: 'rejected', tab: 'REJECTED', title: t('lbl_rejected_requests', 'Reddedilen Talepler'), color: 'rose', icon: <XCircle size={18} /> },
          ].map(card => (
            <button
              key={card.key}
              onClick={() => setActiveTab(card.tab)}
              className={`text-left bg-white border rounded-[1.75rem] p-5 shadow-sm transition-all ${activeTab === card.tab ? `border-${card.color}-300` : 'border-slate-100 hover:border-slate-200'}`}
            >
              <div className={`flex items-center justify-between gap-3 text-${card.color}-500`}>
                <div className="flex items-center gap-2 font-black text-sm uppercase tracking-widest">
                  {card.icon}
                  <span>{card.title}</span>
                </div>
                <span className={`text-2xl font-black text-${card.color}-600`} dir="ltr">
                  {localizedNumber(summary[card.key]?.count || 0)}
                </span>
              </div>
              <div className="mt-4">{renderTotals(summary[card.key]?.totals_by_currency)}</div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="xl:w-auto w-full bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-4 rounded-[1.75rem] shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px]"
        >
          <Plus size={18} />
          {t('btn_new_purchase_request', 'Yeni Satın Alma Talebi')}
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl flex-1 flex flex-col overflow-hidden">
        <div className={`p-6 border-b border-slate-100 flex flex-wrap gap-2 items-center ${isArabic ? 'justify-start' : 'justify-start'}`}>
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
            className="w-full sm:w-[220px]"
          >
            <div className="relative">
              <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isArabic ? 'right-3' : 'left-3'}`} />
              <input
                value={filterDraft.query}
                onChange={(e) => setFilterDraft((prev) => ({ ...prev, query: e.target.value }))}
                placeholder={t('ph_search_purchase_requests', 'Kalem, tedarikçi veya personel ara')}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500 ${isArabic ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
              />
            </div>
          </FilterPopover>

          {userRole !== 'EMPLOYEE' && (
            <FilterPopover
              label={t('col_personnel', 'Personel')}
              open={openFilterMenu === 'employee'}
              active={filters.employee_id !== 'ALL'}
              onToggle={() => setOpenFilterMenu((prev) => (prev === 'employee' ? null : 'employee'))}
              onReset={() => resetFilterMenu('employee')}
              onCancel={cancelFilterMenu}
              onApply={applyFilterMenu}
              align={isArabic ? 'left' : 'right'}
              className="w-full sm:w-[220px]"
            >
              <select
                value={filterDraft.employee_id}
                onChange={(e) => setFilterDraft((prev) => ({ ...prev, employee_id: e.target.value }))}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500 appearance-none cursor-pointer ${isArabic ? 'text-right' : 'text-left'}`}
              >
                <option value="ALL">{t('opt_all_personnel', 'Tüm Personel')}</option>
                {employeeOptions.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
            </FilterPopover>
          )}
        </div>

        <div className="px-6 pt-4 text-xs font-black uppercase tracking-widest text-slate-400">
          {t('lbl_current_total', 'Seçili Görünüm Toplamı')}: {localizedNumber(currentStatusSummary?.count || 0)}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading ? (
            <div className="py-20 text-center text-slate-400 font-black uppercase tracking-widest">{t('lbl_loading', 'Yükleniyor...')}</div>
          ) : requests.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-black uppercase tracking-widest">{t('msg_no_purchase_requests', 'Bu görünümde talep bulunmuyor.')}</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {requests.map(item => (
                <div key={item.id} className="border-2 border-slate-100 rounded-[2rem] p-5 bg-slate-50/70">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-black text-slate-800">{item.item_name}</p>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-1">
                        {item.first_name} {item.last_name}
                      </p>
                    </div>
                    <span className="text-lg font-black text-cyan-600" dir="ltr">
                      {localizedNumber(item.total_amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.currency}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                    <div className="bg-white rounded-2xl p-3 border border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('lbl_vendor', 'Tedarikçi')}</p>
                      <p className="font-bold text-slate-700 mt-1">{item.vendor_name || '-'}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-3 border border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('lbl_quantity_unit_price', 'Adet x Birim')}</p>
                      <p className="font-bold text-slate-700 mt-1" dir="ltr">{localizedNumber(item.quantity)} x {localizedNumber(item.unit_price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <p className="font-medium text-slate-600">{item.justification || t('lbl_no_desc', 'Açıklama belirtilmedi.')}</p>
                    <div className="flex flex-wrap gap-2 text-[11px] font-black">
                      <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700">{t('lbl_finance_approver', 'Finans Onayı')}: {item.finance_approver_name || '-'}</span>
                      {item.needed_by && <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700">{t('lbl_needed_by', 'Gerekli Tarih')}: {item.needed_by}</span>}
                      {item.item_url && (
                        <a href={item.item_url} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-xl bg-cyan-50 text-cyan-700">
                          {t('lbl_product_link', 'Ürün Linki')}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      item.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {getStatusLabel(item.status)}
                    </span>

                    {item.can_approve ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleStatusUpdate(item.id, 'APPROVED')} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase tracking-widest border border-emerald-200">
                          {t('btn_approve', 'Onayla')}
                        </button>
                        <button onClick={() => handleStatusUpdate(item.id, 'REJECTED')} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 font-black text-[10px] uppercase tracking-widest border border-rose-200">
                          {t('btn_reject', 'Reddet')}
                        </button>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        {item.can_convert_to_expense && (
                          <button onClick={() => handleConvertToExpense(item.id)} className="px-3 py-2 rounded-xl bg-cyan-50 text-cyan-700 font-black text-[10px] uppercase tracking-widest border border-cyan-200 flex items-center gap-1.5">
                            <Receipt size={12} />
                            {t('btn_convert_to_expense', 'Masrafa Dönüştür')}
                          </button>
                        )}
                        <button onClick={() => openHistoryModal(item)} className="px-3 py-2 rounded-xl bg-white text-slate-700 font-black text-[10px] uppercase tracking-widest border border-slate-200">
                          {t('btn_view_history', 'Geçmiş')}
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {item.converted_expense_id
                            ? t('lbl_converted_to_expense', 'Masrafa dönüştürüldü')
                            : (item.rejection_reason || t('lbl_action_completed', 'İşlem tamamlandı'))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="bg-cyan-600 p-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <ShoppingCart size={22} />
                <h3 className="font-black uppercase tracking-widest">{t('modal_purchase_request', 'Satın Alma Talebi')}</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)}><XCircle size={26} /></button>
            </div>

            <form onSubmit={handleCreate} className="p-8 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t('lbl_item_name', 'Kalem / Hizmet')}</label>
                <input required value={form.item_name} onChange={(e) => setForm(prev => ({ ...prev, item_name: e.target.value }))} className="w-full bg-white border-2 border-slate-200 rounded-[1.5rem] px-4 py-3 text-sm font-bold outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t('lbl_vendor', 'Tedarikçi')}</label>
                <div className="relative">
                  <Store size={15} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isArabic ? 'right-4' : 'left-4'}`} />
                  <input value={form.vendor_name} onChange={(e) => setForm(prev => ({ ...prev, vendor_name: e.target.value }))} className={`w-full bg-white border-2 border-slate-200 rounded-[1.5rem] py-3 text-sm font-bold outline-none focus:border-cyan-400 ${isArabic ? 'pr-10 pl-4' : 'pl-10 pr-4'}`} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t('lbl_product_link', 'Ürün Linki')}</label>
                <input value={form.item_url} onChange={(e) => setForm(prev => ({ ...prev, item_url: e.target.value }))} className="w-full bg-white border-2 border-slate-200 rounded-[1.5rem] px-4 py-3 text-sm font-bold outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t('lbl_quantity', 'Adet')}</label>
                <input type="number" min="1" required value={form.quantity} onChange={(e) => setForm(prev => ({ ...prev, quantity: e.target.value }))} className="w-full bg-white border-2 border-slate-200 rounded-[1.5rem] px-4 py-3 text-sm font-bold outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t('lbl_unit_price', 'Birim Fiyat')}</label>
                <input type="number" min="0" step="0.01" required value={form.unit_price} onChange={(e) => setForm(prev => ({ ...prev, unit_price: e.target.value }))} className="w-full bg-white border-2 border-slate-200 rounded-[1.5rem] px-4 py-3 text-sm font-bold outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t('lbl_currency', 'Para Birimi')}</label>
                <select value={form.currency} onChange={(e) => setForm(prev => ({ ...prev, currency: e.target.value }))} className="w-full bg-white border-2 border-slate-200 rounded-[1.5rem] px-4 py-3 text-sm font-bold outline-none focus:border-cyan-400">
                  {['TRY', 'USD', 'EUR', 'GBP', 'AED', 'SAR'].map(currency => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t('lbl_needed_by', 'Gerekli Tarih')}</label>
                <input type="date" value={form.needed_by} onChange={(e) => setForm(prev => ({ ...prev, needed_by: e.target.value }))} className="w-full bg-white border-2 border-slate-200 rounded-[1.5rem] px-4 py-3 text-sm font-bold outline-none focus:border-cyan-400" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t('lbl_justification', 'İş Gerekçesi')}</label>
                <textarea rows="4" value={form.justification} onChange={(e) => setForm(prev => ({ ...prev, justification: e.target.value }))} className="w-full bg-white border-2 border-slate-200 rounded-[1.5rem] px-4 py-3 text-sm font-bold outline-none focus:border-cyan-400 resize-none" />
              </div>
              <div className={`md:col-span-2 flex gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-500 rounded-[1.5rem] py-4 font-black uppercase tracking-widest text-[10px]">
                  {t('btn_cancel', 'İptal')}
                </button>
                <button type="submit" className="flex-[2] bg-cyan-500 text-white rounded-[1.5rem] py-4 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-cyan-500/20">
                  {t('btn_submit_purchase_request', 'Finans Onayına Gönder')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyModal.open && (
        <div className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="bg-slate-900 p-6 flex items-center justify-between text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] opacity-70">{t('lbl_action_history', 'Aksiyon Geçmişi')}</p>
                <h3 className="text-2xl font-black mt-2">{historyModal.title}</h3>
              </div>
              <button onClick={() => setHistoryModal({ open: false, title: '', items: [], loading: false })}><XCircle size={26} /></button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-3 bg-slate-50">
              <div className="flex justify-end gap-2">
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
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700"
                >
                  {t('btn_export_csv', 'CSV Dışa Aktar')}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input
                  value={historyFilters.query}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, query: e.target.value }))}
                  placeholder={t('ph_search_history', 'Geçmişte ara')}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-cyan-400"
                />
                <select
                  value={historyFilters.action}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, action: e.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-cyan-400"
                >
                  <option value="ALL">{t('opt_all_actions', 'Tüm Aksiyonlar')}</option>
                  {Array.from(new Set((historyModal.items || []).map((item) => item.action).filter(Boolean))).map((action) => (
                    <option key={action} value={action}>{getHistoryActionLabel(action)}</option>
                  ))}
                </select>
                <select
                  value={historyFilters.actor}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, actor: e.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-cyan-400"
                >
                  <option value="ALL">{t('opt_all_actors', 'Tüm Kullanıcılar')}</option>
                  {Array.from(new Set((historyModal.items || []).map((item) => item.actor_name).filter(Boolean))).map((actor) => (
                    <option key={actor} value={actor}>{actor}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={historyFilters.start_date}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, start_date: e.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-cyan-400"
                />
                <input
                  type="date"
                  value={historyFilters.end_date}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, end_date: e.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-cyan-400"
                />
              </div>
              {historyModal.loading ? (
                <div className="py-20 text-center text-slate-400 font-black uppercase tracking-widest">{t('lbl_loading', 'Yükleniyor...')}</div>
              ) : filteredHistoryItems.length === 0 ? (
                <div className="py-20 text-center text-slate-400 font-black uppercase tracking-widest">{t('msg_no_action_history', 'Henüz aksiyon geçmişi yok.')}</div>
              ) : (
                filteredHistoryItems.map((item) => (
                  <div key={item.id} className="rounded-[1.5rem] border border-slate-100 bg-white px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{getHistoryActionLabel(item.action)}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleString(i18n.language === 'tr' ? 'tr-TR' : i18n.language === 'de' ? 'de-DE' : i18n.language === 'ar' ? 'ar-SA' : 'en-US') : '-'}</p>
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-800">{item.actor_name || '-'}</p>
                    {item.detail && <p className="mt-1 text-sm font-medium text-slate-600">{item.detail}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseRequestManagement;

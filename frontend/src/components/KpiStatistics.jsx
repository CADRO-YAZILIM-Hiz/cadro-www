import React, { useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { BarChart3, CalendarRange, Plus, Target, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import PageToolbar from './PageToolbar';
import FilterPopover from './FilterPopover';
import { kpiApi } from '../api/axios';
import { localizeDigits } from '../utils/localizeNumber';

const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 8)}01`;

const EMPTY_FORM = {
  title: '',
  category: 'OTHER',
  unit: 'COUNT',
  value: '',
  target_value: '',
  metric_date: today,
  source_type: 'MANUAL',
  note: '',
};

const KpiStatistics = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isArabic = i18n.language === 'ar';
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);
  const getCategoryLabel = (value) => t(`kpi_category_${String(value || 'other').toLowerCase()}`, value || '-');
  const getUnitLabel = (value) => t(`kpi_unit_${String(value || 'count').toLowerCase()}`, value || '-');
  const getSourceLabel = (value) => t(`kpi_source_${String(value || 'manual').toLowerCase()}`, value || '-');

  const [catalog, setCatalog] = useState({ categories: [], units: [], sources: [] });
  const [summary, setSummary] = useState({
    current_range: { total_metrics: 0, total_value: 0, start_date: monthStart, end_date: today },
    previous_range: { total_metrics: 0, total_value: 0, start_date: monthStart, end_date: today },
    delta_value: 0,
    categories: {},
  });
  const [metrics, setMetrics] = useState([]);
  const [filters, setFilters] = useState({
    query: '',
    category: 'ALL',
    start_date: monthStart,
    end_date: today,
  });
  const [filterDraft, setFilterDraft] = useState({
    query: '',
    category: 'ALL',
    start_date: monthStart,
    end_date: today,
  });
  const [openFilterMenu, setOpenFilterMenu] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [activeSummaryGroup, setActiveSummaryGroup] = useState('workforce');

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await kpiApi.getAll({
        query: filters.query || undefined,
        category: filters.category !== 'ALL' ? filters.category : undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      });
      setMetrics(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error(t('err_fetch_kpi_metrics', 'KPI kayıtları yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await kpiApi.getSummary({
        query: filters.query || undefined,
        category: filters.category !== 'ALL' ? filters.category : undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      });
      setSummary(res.data || summary);
    } catch {
      // quiet
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const res = await kpiApi.getCatalog();
        setCatalog(res.data || { categories: [], units: [], sources: [] });
      } catch {
        setCatalog({ categories: [], units: [], sources: [] });
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    const category = searchParams.get('category');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const query = searchParams.get('query');
    const nextFilters = {
      query: query || '',
      category: category || 'ALL',
      start_date: startDate || monthStart,
      end_date: endDate || today,
    };
    setFilters((prev) => (
      prev.query === nextFilters.query &&
      prev.category === nextFilters.category &&
      prev.start_date === nextFilters.start_date &&
      prev.end_date === nextFilters.end_date
        ? prev
        : nextFilters
    ));
  }, [searchParams]);

  useEffect(() => {
    fetchMetrics();
    fetchSummary();
  }, [filters.query, filters.category, filters.start_date, filters.end_date]);

  useEffect(() => {
    setFilterDraft(filters);
  }, [filters]);

  const handleCreate = async (event) => {
    event.preventDefault();
    const loadingToast = toast.loading(t('msg_creating_kpi_metric', 'KPI kaydı oluşturuluyor...'));
    try {
      await kpiApi.create({
        ...form,
        value: Number(form.value || 0),
        target_value: form.target_value === '' ? null : Number(form.target_value),
      });
      toast.success(t('msg_kpi_metric_created', 'KPI kaydı eklendi.'), { id: loadingToast });
      setShowCreateModal(false);
      setForm(EMPTY_FORM);
      fetchMetrics();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_create_kpi_metric', 'KPI kaydı oluşturulamadı.'), { id: loadingToast });
    }
  };

  const handleDelete = async (metricId) => {
    if (!window.confirm(t('msg_confirm_delete_kpi', 'Bu KPI kaydını silmek istiyor musunuz?'))) return;
    const loadingToast = toast.loading(t('msg_processing', 'İşlem gerçekleştiriliyor...'));
    try {
      await kpiApi.delete(metricId);
      toast.success(t('msg_kpi_metric_deleted', 'KPI kaydı silindi.'), { id: loadingToast });
      fetchMetrics();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_delete_kpi_metric', 'KPI kaydı silinemedi.'), { id: loadingToast });
    }
  };

  const categoryCards = useMemo(() => Object.entries(summary.categories || {}), [summary.categories]);
  const systemMetricCards = useMemo(
    () => [
      { key: 'active_employees', label: t('lbl_system_active_employees', 'Aktif Personel'), value: summary.system_metrics?.active_employees || 0, tone: 'cyan', group: 'workforce' },
      { key: 'turnover_rate', label: t('lbl_system_turnover_rate', 'Dönem Devir Oranı'), value: summary.system_metrics?.turnover_rate || 0, tone: 'indigo', suffix: '%', group: 'workforce' },
      { key: 'approved_leave_today', label: t('lbl_system_leave_today', 'Bugün İzinli'), value: summary.system_metrics?.approved_leave_today || 0, tone: 'amber', group: 'absence' },
      { key: 'absent_today', label: t('lbl_system_absent_today', 'Bugün Devamsız'), value: summary.system_metrics?.absent_today || 0, tone: 'rose', group: 'absence' },
      { key: 'absence_rate_today', label: t('lbl_system_absence_rate_today', 'Bugün Devamsızlık Oranı'), value: summary.system_metrics?.absence_rate_today || 0, tone: 'rose', suffix: '%', group: 'absence' },
      { key: 'leave_coverage_rate_today', label: t('lbl_system_leave_coverage_rate_today', 'Bugün İzin Oranı'), value: summary.system_metrics?.leave_coverage_rate_today || 0, tone: 'amber', suffix: '%', group: 'absence' },
      { key: 'leave_usage_rate', label: t('lbl_system_leave_usage_rate', 'Dönem İzin Kullanımı'), value: summary.system_metrics?.leave_usage_rate || 0, tone: 'emerald', suffix: '%', group: 'absence' },
      { key: 'open_request_queue', label: t('lbl_system_open_queue', 'Açık İş Kuyruğu'), value: summary.system_metrics?.open_request_queue || 0, tone: 'rose', group: 'operations' },
      { key: 'pending_policy_acknowledgements', label: t('lbl_system_pending_policy_ack', 'Bekleyen Politika Onayı'), value: summary.system_metrics?.pending_policy_acknowledgements || 0, tone: 'indigo', group: 'compliance' },
      { key: 'expiring_documents_30d', label: t('lbl_system_expiring_documents', '30 Günde Bitecek Evrak'), value: summary.system_metrics?.expiring_documents_30d || 0, tone: 'emerald', group: 'compliance' },
    ],
    [summary.system_metrics, t]
  );
  const summaryGroups = useMemo(
    () => [
      { id: 'workforce', label: t('lbl_kpi_group_workforce', 'İşgücü') },
      { id: 'absence', label: t('lbl_kpi_group_absence', 'Devamsızlık & İzin') },
      { id: 'operations', label: t('lbl_kpi_group_operations', 'Operasyon') },
      { id: 'compliance', label: t('lbl_kpi_group_compliance', 'Uyum') },
    ],
    [t]
  );
  const visibleSystemMetricCards = useMemo(
    () => systemMetricCards.filter((item) => item.group === activeSummaryGroup),
    [activeSummaryGroup, systemMetricCards]
  );
  const tabs = useMemo(
    () => [
      { id: 'summary', label: t('lbl_system_metrics', 'Sistem Metrikleri') },
      { id: 'categories', label: t('lbl_category_breakdown', 'Kategori Dağılımı') },
      { id: 'records', label: t('lbl_kpi_records', 'KPI Kayıtları') },
    ],
    [t]
  );

  const applyFilterMenu = () => {
    setFilters(filterDraft);
    const nextParams = new URLSearchParams();
    if (filterDraft.query) nextParams.set('query', filterDraft.query);
    if (filterDraft.category !== 'ALL') nextParams.set('category', filterDraft.category);
    if (filterDraft.start_date) nextParams.set('start_date', filterDraft.start_date);
    if (filterDraft.end_date) nextParams.set('end_date', filterDraft.end_date);
    setSearchParams(nextParams, { replace: true });
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
    if (menuKey === 'category') {
      setFilterDraft((prev) => ({ ...prev, category: 'ALL' }));
      return;
    }
    if (menuKey === 'date') {
      setFilterDraft((prev) => ({ ...prev, start_date: monthStart, end_date: today }));
    }
  };

  const toolbarLeft = (
    <div className="flex flex-wrap gap-2 items-center w-full">
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
        <input
          value={filterDraft.query}
          onChange={(e) => setFilterDraft((prev) => ({ ...prev, query: e.target.value }))}
          placeholder={t('ph_search_kpi_metrics', 'KPI başlığı ara')}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500"
        />
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
        className="w-full sm:w-[220px]"
      >
        <select
          value={filterDraft.category}
          onChange={(e) => setFilterDraft((prev) => ({ ...prev, category: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500"
        >
          <option value="ALL">{t('opt_all_categories', 'Tüm Kategoriler')}</option>
          {catalog.categories.map((item) => (
            <option key={item} value={item}>{getCategoryLabel(item)}</option>
          ))}
        </select>
      </FilterPopover>

      <FilterPopover
        label={t('lbl_date_range', 'Tarih Aralığı')}
        open={openFilterMenu === 'date'}
        active={filters.start_date !== monthStart || filters.end_date !== today}
        onToggle={() => setOpenFilterMenu((prev) => (prev === 'date' ? null : 'date'))}
        onReset={() => resetFilterMenu('date')}
        onCancel={cancelFilterMenu}
        onApply={applyFilterMenu}
        align={isArabic ? 'left' : 'right'}
        className="w-full sm:w-[220px]"
      >
        <input
          type="date"
          value={filterDraft.start_date}
          onChange={(e) => setFilterDraft((prev) => ({ ...prev, start_date: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500"
        />
        <input
          type="date"
          value={filterDraft.end_date}
          onChange={(e) => setFilterDraft((prev) => ({ ...prev, end_date: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500"
        />
      </FilterPopover>
    </div>
  );

  const toolbarRight = (
    <button
      onClick={() => setShowCreateModal(true)}
      className="w-full xl:w-auto bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3.5 rounded-[1.5rem] shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px]"
    >
      <Plus size={16} />
      {t('btn_new_kpi_metric', 'Yeni KPI Kaydı')}
    </button>
  );

  return (
    <div className="h-full flex flex-col gap-6 font-sans pb-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? 'top-left' : 'top-right'} />

      <PageToolbar left={toolbarLeft} right={toolbarRight} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-[1.8rem] border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lbl_selected_period_metrics', 'Seçili Dönem Kayıt')}</p>
              <p className="mt-2 text-3xl font-black text-slate-800" dir="ltr">{localizedNumber(summary.current_range?.total_metrics || 0)}</p>
            </div>
            <BarChart3 className="text-cyan-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-[1.8rem] border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lbl_selected_period_total', 'Seçili Dönem Toplam')}</p>
              <p className="mt-2 text-3xl font-black text-slate-800" dir="ltr">{localizedNumber(summary.current_range?.total_value || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <Target className="text-indigo-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-[1.8rem] border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lbl_period_delta', 'Önceki Dönem Farkı')}</p>
              <p className={`mt-2 text-3xl font-black ${summary.delta_value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                {summary.delta_value >= 0 ? '+' : ''}{localizedNumber(summary.delta_value || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            {summary.delta_value >= 0 ? <TrendingUp className="text-emerald-500" size={24} /> : <TrendingDown className="text-rose-500" size={24} />}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-t-[1rem] text-[12px] font-black uppercase tracking-[0.2em] transition-all border ${
                  activeTab === tab.id
                    ? 'bg-white text-cyan-600 border-slate-200 border-b-white'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 md:p-6">
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-700">
                <CalendarRange size={18} className="text-indigo-500" />
                <h3 className="text-xs font-black uppercase tracking-[0.22em]">{t('lbl_system_metrics', 'Sistem Metrikleri')}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {summaryGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setActiveSummaryGroup(group.id)}
                    className={`px-4 py-2.5 rounded-[1rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all border ${
                      activeSummaryGroup === group.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {visibleSystemMetricCards.map((item) => (
                  <div key={item.key} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className={`mt-2 text-2xl font-black ${
                      item.tone === 'cyan'
                        ? 'text-cyan-700'
                        : item.tone === 'amber'
                          ? 'text-amber-700'
                          : item.tone === 'indigo'
                            ? 'text-indigo-700'
                            : item.tone === 'emerald'
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                    }`} dir="ltr">
                      {localizedNumber(item.value, item.suffix ? { minimumFractionDigits: 0, maximumFractionDigits: 2 } : {})}{item.suffix || ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            categoryCards.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <CalendarRange size={18} className="text-cyan-500" />
                  <h3 className="text-xs font-black uppercase tracking-[0.22em]">{t('lbl_category_breakdown', 'Kategori Dağılımı')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {categoryCards.map(([category, data]) => (
                    <div key={category} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{getCategoryLabel(category)}</p>
                      <p className="mt-2 text-2xl font-black text-slate-800" dir="ltr">{localizedNumber(data.count || 0)}</p>
                      <p className="mt-1 text-sm font-bold text-cyan-700" dir="ltr">{localizedNumber(data.total_value || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 font-black uppercase tracking-widest">
                {t('msg_no_kpi_categories', 'Seçili filtrelerde kategori özeti bulunmuyor.')}
              </div>
            )
          )}
        </div>
      </div>

      <div className={`bg-white rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col ${activeTab === 'records' ? 'flex-1 overflow-hidden min-h-[360px]' : ''}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-700">{t('lbl_kpi_records', 'KPI Kayıtları')}</h3>
            <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-[0.18em]">
              {summary.current_range?.start_date} - {summary.current_range?.end_date}
            </p>
          </div>
        </div>

        {activeTab === 'records' ? (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6">
            {loading ? (
              <div className="py-20 text-center text-slate-400 font-black uppercase tracking-widest">{t('lbl_loading', 'Yükleniyor...')}</div>
            ) : metrics.length === 0 ? (
              <div className="py-20 text-center text-slate-400 font-black uppercase tracking-widest">{t('msg_no_kpi_metrics', 'Seçili filtrelerde KPI kaydı bulunmuyor.')}</div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {metrics.map((item) => (
                  <div key={item.id} className="border-2 border-slate-100 rounded-[2rem] p-5 bg-slate-50/70">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-black text-slate-800">{item.title}</p>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-1">{getCategoryLabel(item.category)}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="w-10 h-10 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 flex items-center justify-center"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      <div className="bg-white rounded-2xl p-3 border border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('lbl_actual_value', 'Gerçekleşen')}</p>
                        <p className="mt-2 text-xl font-black text-slate-800" dir="ltr">{localizedNumber(item.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {getUnitLabel(item.unit)}</p>
                      </div>
                      <div className="bg-white rounded-2xl p-3 border border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('lbl_target_value', 'Hedef')}</p>
                        <p className="mt-2 text-xl font-black text-cyan-700" dir="ltr">
                          {item.target_value == null ? '-' : `${localizedNumber(item.target_value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${getUnitLabel(item.unit)}`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black">
                      <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700">{t('lbl_metric_date', 'Metrik Tarihi')}: {item.metric_date}</span>
                      <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700">{t('lbl_source_type', 'Kaynak')}: {getSourceLabel(item.source_type)}</span>
                      {item.progress_ratio != null && (
                        <span className={`px-3 py-1 rounded-xl ${item.progress_ratio >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {t('lbl_target_progress', 'Hedefe İlerleme')}: %{localizedNumber(item.progress_ratio, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>

                    {item.note && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lbl_note', 'Not')}</p>
                        <p className="mt-2 text-sm font-medium text-slate-700">{item.note}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            {t('lbl_open_records_tab', 'KPI kayıtlarını görmek için KPI Kayıtları sekmesini açın.')}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="bg-cyan-600 p-6 flex items-center justify-between text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] opacity-80">{t('lbl_statistics_engine', 'KPI & Statistics')}</p>
                <h3 className="text-2xl font-black mt-2">{t('btn_new_kpi_metric', 'Yeni KPI Kaydı')}</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center">
                <Plus size={18} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_title', 'Başlık')}</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                  placeholder={t('ph_kpi_title', 'Örn. Aylık işe alım, eğitim katılım oranı')}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_category', 'Kategori')}</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                >
                  {catalog.categories.map((item) => <option key={item} value={item}>{getCategoryLabel(item)}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_unit', 'Birim')}</label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                  className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                >
                  {catalog.units.map((item) => <option key={item} value={item}>{getUnitLabel(item)}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_actual_value', 'Gerçekleşen')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
                  className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_target_value', 'Hedef')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.target_value}
                  onChange={(e) => setForm((prev) => ({ ...prev, target_value: e.target.value }))}
                  className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_metric_date', 'Metrik Tarihi')}</label>
                <input
                  type="date"
                  value={form.metric_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, metric_date: e.target.value }))}
                  className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_source_type', 'Kaynak')}</label>
                <select
                  value={form.source_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, source_type: e.target.value }))}
                  className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-cyan-400 focus:bg-white"
                >
                  {catalog.sources.map((item) => <option key={item} value={item}>{getSourceLabel(item)}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lbl_note', 'Not')}</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  rows={4}
                  className="mt-2 w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none focus:border-cyan-400 focus:bg-white"
                  placeholder={t('ph_kpi_note', 'Açıklama, kaynak veya yorum ekleyin')}
                />
              </div>

              <div className={`md:col-span-2 flex items-center justify-end gap-3 pt-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
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
                  {t('btn_save', 'Kaydet')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiStatistics;

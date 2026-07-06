import React, { useEffect, useMemo, useState } from 'react';
import {
  UserPlus,
  UserMinus,
  Search,
  ChevronRight,
  KeyRound,
  FileText,
  FolderPlus,
  ShieldCheck,
  ShieldOff,
  CalendarDays,
  Briefcase,
  CircleAlert,
  CheckCircle2,
  RefreshCcw,
  X,
  Plus,
  Trash2,
  ListChecks,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { onboardingApi } from '../api/axios';
import FilterPopover from '../components/FilterPopover';

const SummaryCard = ({ title, value, hint, tone = 'slate' }) => {
  const tones = {
    slate: 'from-slate-50 to-white border-slate-200 text-slate-800',
    indigo: 'from-indigo-50 to-white border-indigo-200 text-indigo-800',
    emerald: 'from-emerald-50 to-white border-emerald-200 text-emerald-800',
    rose: 'from-rose-50 to-white border-rose-200 text-rose-800',
    amber: 'from-amber-50 to-white border-amber-200 text-amber-800',
  };

  return (
    <div className={`rounded-[1.5rem] border bg-gradient-to-br p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">{title}</p>
          <p className="mt-2 text-[10px] font-bold text-slate-400">{hint}</p>
        </div>
        <p className="shrink-0 text-2xl font-black leading-none">{value}</p>
      </div>
    </div>
  );
};

const ChecklistRow = ({ item }) => {
  const { t } = useTranslation();
  return (
    <div className={`rounded-[1.5rem] border p-4 transition-all ${item.done ? 'border-emerald-100 bg-emerald-50/70' : 'border-amber-100 bg-amber-50/70'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-xl p-2 ${item.done ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
          {item.done ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black uppercase tracking-wide text-slate-800">{item.label}</p>
          <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {item.done ? t('status_completed', 'Tamam') : t('status_open', 'Açık')}
        </span>
      </div>
    </div>
  );
};

const TemplateChecklistRow = ({ item, onToggle }) => {
  const { t } = useTranslation();
  return (
    <div className={`rounded-[1.5rem] border p-4 transition-all ${item.done ? 'border-emerald-100 bg-emerald-50/70' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          className={`mt-0.5 rounded-xl p-2 text-white transition-all ${item.done ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-400 hover:bg-slate-500'}`}
          title={item.done ? t('status_completed', 'Tamam') : t('status_open', 'Açık')}
        >
          <CheckCircle2 size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black uppercase tracking-wide text-slate-800">{item.label}</p>
            {item.responsible_role ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {item.responsible_role}
              </span>
            ) : null}
            {item.is_required ? (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                {t('lbl_required', 'Zorunlu')}
              </span>
            ) : null}
            {item.action_key ? (
              <span className="rounded-full bg-cyan-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                {t('lifecycle_auto_step', 'Otomatik')}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
          {item.completed_by_name || item.completed_at ? (
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {item.done
                ? `${item.completed_by_name || t('lbl_system', 'Sistem')} • ${item.completed_at ? new Date(item.completed_at).toLocaleString() : ''}`
                : t('lifecycle_checklist_not_completed', 'Henüz tamamlanmadı')}
            </p>
          ) : null}
          {item.note ? (
            <p className="mt-2 text-sm font-semibold text-slate-500">{item.note}</p>
          ) : null}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {item.done ? t('status_completed', 'Tamam') : t('status_open', 'Açık')}
        </span>
      </div>
    </div>
  );
};

const extractNumbers = (value) => {
  const matches = String(value || '').match(/\d+/g);
  return matches ? matches.map((item) => Number(item)) : [];
};

const localizeLifecycleChecklistItem = (item, t) => {
  if (!item?.id) return item;

  if (item.id === 'account_closed') {
    return {
      ...item,
      label: t('lifecycle_item_account_closed', 'Kullanıcı hesabı kapatıldı'),
      detail: t('lifecycle_item_account_closed_detail', 'Hesap erişimi durdurulur, MFA ve mobil oturumlar pasifleştirilir.'),
    };
  }

  if (item.id === 'exit_date') {
    const hasDate = item.detail && !String(item.detail).includes('Henüz');
    return {
      ...item,
      label: t('lifecycle_item_exit_date', 'Çıkış tarihi tanımlandı'),
      detail: hasDate ? item.detail : t('lifecycle_item_exit_date_missing', 'Henüz çıkış tarihi girilmedi.'),
    };
  }

  if (item.id === 'termination_document') {
    const [count = 0] = extractNumbers(item.detail);
    return {
      ...item,
      label: t('lifecycle_item_termination_document', 'Çıkış belgesi oluşturuldu'),
      detail: t('lifecycle_detail_documents_count', { count, defaultValue: '{{count}} belge' }),
    };
  }

  if (item.id === 'assets_returned') {
    const [count = 0] = extractNumbers(item.detail);
    return {
      ...item,
      label: t('lifecycle_item_assets_returned', 'Zimmetler kapatıldı'),
      detail: t('lifecycle_detail_active_assets_count', { count, defaultValue: '{{count}} aktif zimmet' }),
    };
  }

  if (item.id === 'finance_clearance') {
    const [leaveCount = 0, expenseCount = 0] = extractNumbers(item.detail);
    return {
      ...item,
      label: t('lifecycle_item_finance_clearance', 'Açık izin ve masraf kalmadı'),
      detail: t('lifecycle_detail_pending_finance_count', {
        leaveCount,
        expenseCount,
        defaultValue: '{{leaveCount}} izin, {{expenseCount}} masraf bekliyor',
      }),
    };
  }

  if (item.id === 'tickets_closed') {
    const [count = 0] = extractNumbers(item.detail);
    return {
      ...item,
      label: t('lifecycle_item_tickets_closed', 'Açık destek talepleri kapatıldı'),
      detail: t('lifecycle_detail_open_tickets_count', { count, defaultValue: '{{count}} açık talep' }),
    };
  }

  if (item.id === 'org_assignment') {
    const department = item.detail?.split('/')[0]?.trim() || t('lifecycle_no_department', 'Departman yok');
    const position = item.detail?.split('/')[1]?.trim() || t('lbl_unassigned', 'Kadrosuz');
    const normalize = (value, fallbackKey, fallbackText) => (
      value === 'Departman yok' || value === 'Kadro yok'
        ? t(fallbackKey, fallbackText)
        : value
    );

    return {
      ...item,
      label: t('lifecycle_item_org_assignment', 'Departman ve kadro ataması yapıldı'),
      detail: `${normalize(department, 'lifecycle_no_department', 'Departman yok')} / ${normalize(position, 'lbl_unassigned', 'Kadrosuz')}`,
    };
  }

  if (item.id === 'account_ready') {
    const hasEmail = item.detail && String(item.detail).includes('@');
    return {
      ...item,
      label: t('lifecycle_item_account_ready', 'Kullanıcı hesabı hazır'),
      detail: hasEmail ? item.detail : t('lifecycle_item_account_ready_missing', 'E-posta tanımlı değil'),
    };
  }

  if (item.id === 'password_change') {
    return {
      ...item,
      label: t('lifecycle_item_password_change', 'İlk giriş şifre değişimi bekleniyor'),
      detail: item.done
        ? t('lifecycle_item_password_change_active', 'Geçici şifre aktif')
        : t('lifecycle_item_password_change_done', 'Şifre kalıcı hale gelmiş'),
    };
  }

  if (item.id === 'contract_document') {
    const [count = 0] = extractNumbers(item.detail);
    return {
      ...item,
      label: t('lifecycle_item_contract_document', 'İş sözleşmesi oluşturuldu'),
      detail: t('lifecycle_detail_documents_count', { count, defaultValue: '{{count}} belge' }),
    };
  }

  if (item.id === 'dossier_ready') {
    const [totalCount = 0, pendingCount = 0] = extractNumbers(item.detail);
    return {
      ...item,
      label: t('lifecycle_item_dossier_ready', 'Özlük evrakları toplandı'),
      detail: t('lifecycle_detail_dossier_count', {
        totalCount,
        pendingCount,
        defaultValue: '{{totalCount}} evrak, {{pendingCount}} bekleyen',
      }),
    };
  }

  if (item.id === 'device_login') {
    const [count = 0] = extractNumbers(item.detail);
    return {
      ...item,
      label: t('lifecycle_item_device_login', 'İlk cihaz oturumu görüldü'),
      detail: t('lifecycle_detail_device_count', { count, defaultValue: '{{count}} cihaz kaydı' }),
    };
  }

  return item;
};

const ChecklistTemplateModal = ({
  open,
  mode,
  items,
  availableActions,
  form,
  onFormChange,
  onCreate,
  onDelete,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!open) return null;

  const title = mode === 'offboarding'
    ? t('lifecycle_template_modal_offboarding', 'İşten Ayrılış Kontrol Listesi Şablonu')
    : t('lifecycle_template_modal_onboarding', 'İşe Başlatma Kontrol Listesi Şablonu');

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{t('lifecycle_checklist_template_label', 'Kontrol Listesi Şablonu')}</p>
            <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900">
            <X size={18} />
          </button>
        </div>

        <div className="grid max-h-[calc(90vh-84px)] grid-cols-1 gap-6 overflow-y-auto p-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-3">
            {items.length ? items.map((item) => (
              <div key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black uppercase tracking-wide text-slate-800">{item.label}</p>
                    <p className="mt-2 text-sm text-slate-500">{item.detail || t('lifecycle_template_no_detail', 'Açıklama girilmedi.')}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.responsible_role ? (
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                          {item.responsible_role}
                        </span>
                      ) : null}
                      {item.is_required ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                          {t('lbl_required', 'Zorunlu')}
                        </span>
                      ) : null}
                      {item.action_key ? (
                        <span className="rounded-full bg-cyan-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                          {availableActions.find((action) => action.key === item.action_key)?.label || item.action_key}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button type="button" onClick={() => onDelete(item.id)} className="rounded-xl bg-white p-2 text-rose-500 shadow-sm transition-all hover:bg-rose-50">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="text-sm font-bold text-slate-400">{t('lifecycle_template_empty', 'Bu süreç için henüz checklist maddesi eklenmedi.')}</p>
              </div>
            )}
          </div>

          <form onSubmit={onCreate} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lifecycle_add_template_item', 'Yeni Şablon Maddesi')}</p>
            <div className="mt-4 space-y-4">
              <Field label={t('lbl_title', 'Başlık')} value={form.label} onChange={(next) => onFormChange('label', next)} />
              <TextareaField label={t('lbl_description', 'Açıklama')} value={form.detail} onChange={(next) => onFormChange('detail', next)} />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectField
                  label={t('lifecycle_target_role_short', 'Sorumlu Rol')}
                  value={form.responsible_role}
                  onChange={(next) => onFormChange('responsible_role', next)}
                  options={[
                    { value: '', label: t('lifecycle_target_role_any', 'Genel / Atamasız') },
                    { value: 'HR', label: t('lifecycle_role_hr', 'İK') },
                    { value: 'ADMIN', label: t('lifecycle_role_admin', 'Admin') },
                    { value: 'MANAGER', label: t('lifecycle_role_manager', 'Yönetici') },
                    { value: 'EMPLOYEE', label: t('lifecycle_role_employee', 'Personel') },
                  ]}
                />
                <SelectField
                  label={t('lifecycle_auto_action', 'Otomatik Aksiyon')}
                  value={form.action_key}
                  onChange={(next) => onFormChange('action_key', next)}
                  options={[
                    { value: '', label: t('lifecycle_manual_step', 'Manuel madde') },
                    ...(availableActions || []),
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label={t('lifecycle_sort_order', 'Sıra')} type="number" value={form.sort_order} onChange={(next) => onFormChange('sort_order', next)} />
              </div>
              <label className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={form.is_required} onChange={(event) => onFormChange('is_required', event.target.checked)} />
                {t('lifecycle_template_required_note', 'Bu madde ilerleme hesabına dahil edilsin')}
              </label>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="submit" className="flex items-center gap-2 rounded-[1.25rem] bg-slate-900 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-slate-700">
                <Plus size={16} /> {t('btn_add', 'Ekle')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const EmployeeRow = ({ employee, selected, onClick, mode }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[1.75rem] border p-4 text-left transition-all ${selected ? 'border-slate-900 bg-slate-900 text-white shadow-xl shadow-slate-900/10' : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-black uppercase tracking-wide ${selected ? 'text-white' : 'text-slate-800'}`}>{employee.name}</p>
          <p className={`mt-1 text-[11px] font-bold uppercase tracking-[0.18em] ${selected ? 'text-cyan-300' : 'text-slate-400'}`}>{employee.position || t('lbl_unassigned', 'Kadrosuz')}</p>
        </div>
        <ChevronRight size={18} className={selected ? 'text-cyan-300' : 'text-slate-300'} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
        <span className={`rounded-full px-3 py-1 ${selected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'}`}>{employee.department || t('lifecycle_no_department', 'Departman yok')}</span>
        <span className={`rounded-full px-3 py-1 ${employee.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {employee.status === 'ACTIVE' ? t('status_active', 'Aktif') : t('lifecycle_account_closed_status', 'Kapalı')}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className={selected ? 'text-white/70' : 'text-slate-400'}>
            {mode === 'offboarding' ? t('lifecycle_closure_progress', 'Kapanış İlerlemesi') : t('lifecycle_opening_progress', 'Açılış İlerlemesi')}
          </span>
          <span className={selected ? 'text-white' : 'text-slate-700'}>%{employee.progress}</span>
        </div>
        <div className={`mt-2 h-2 rounded-full ${selected ? 'bg-white/10' : 'bg-slate-100'}`}>
          <div
            className={`h-2 rounded-full ${mode === 'offboarding' ? 'bg-rose-500' : 'bg-indigo-500'}`}
            style={{ width: `${employee.progress}%` }}
          />
        </div>
      </div>
    </button>
  );
};

const PAYMENT_FIELDS = ['gross_amount', 'legal_deduction', 'net_amount', 'special_deduction', 'net_payment'];

const parseMoney = (value) => {
  if (!value) return 0;
  const normalized = String(value).replace(/[^0-9,.-]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoneyForInput = (value) => {
  const fixed = Number(value || 0).toFixed(2);
  return fixed === '0.00' ? '' : fixed;
};

const recalculatePaymentRows = (rows = []) => {
  const cloned = rows.map((row) => ({ ...row }));
  if (!cloned.length) return cloned;
  const totalIndex = cloned.findIndex((row) => String(row.label || '').toLowerCase() === 'toplam');
  if (totalIndex === -1) return cloned;
  const totalRow = { ...cloned[totalIndex] };
  PAYMENT_FIELDS.forEach((field) => {
    const sum = cloned.reduce((acc, row, index) => {
      if (index === totalIndex) return acc;
      return acc + parseMoney(row[field]);
    }, 0);
    totalRow[field] = formatMoneyForInput(sum);
  });
  cloned[totalIndex] = totalRow;
  return cloned;
};

const prepareReleaseDraft = (draft) => {
  if (!draft) return draft;
  return {
    ...draft,
    payment_rows: recalculatePaymentRows(draft.payment_rows || []),
  };
};

const TerminationReleaseModal = ({ open, value, templates, loading, onClose, onChange, onTemplateChange, onPaymentChange, onDownload, onStore }) => {
  const { t } = useTranslation();
  if (!open) return null;

  const rows = value?.payment_rows || [];
  const activeTemplate = templates.find((item) => item.key === value?.template_key);
  const getTemplateCopy = (template) => {
    if (!template) return { title: '', subtitle: '' };
    if (template.key === 'tr_release') {
      return {
        title: t('lifecycle_template_tr_release_title', 'TR/KKTC İbraname'),
        subtitle: t('lifecycle_template_tr_release_subtitle', 'TR / KKTC uyumlu klasik çıkış ve ibra metni'),
      };
    }
    if (template.key === 'generic_clearance') {
      return {
        title: t('lifecycle_template_generic_clearance_title', 'Genel Kapanış Mutabakatı'),
        subtitle: t('lifecycle_template_generic_clearance_subtitle', 'Ülke bağımsız genel kapanış ve mutabakat formu'),
      };
    }
    if (template.key === 'de_exit') {
      return {
        title: t('lifecycle_template_de_exit_title', 'DE Austritt & Schlussabrechnung'),
        subtitle: t('lifecycle_template_de_exit_subtitle', 'Almanya odaklı çıkış mutabakatı ve kapanış özeti'),
      };
    }
    return { title: template.title, subtitle: template.subtitle };
  };
  const exitReasonOptions = [
    { value: '', label: t('lifecycle_exit_reason_select', 'Neden seçin') },
    { value: 'TERK', label: t('lifecycle_exit_reason_abandonment', 'Terk') },
    { value: 'ISTIFA', label: t('lifecycle_exit_reason_resignation', 'İstifa') },
    { value: 'CIKARILMA', label: t('lifecycle_exit_reason_termination', 'Çıkarılma / Fesih') },
    { value: 'VATANI_GOREV', label: t('lifecycle_exit_reason_military', 'Vatani Görev') },
    { value: 'EMEKLILIK', label: t('lifecycle_exit_reason_retirement', 'Emeklilik') },
    { value: 'VEFAT', label: t('lifecycle_exit_reason_death', 'Vefat') },
    { value: 'DIGER', label: t('lifecycle_exit_reason_other', 'Diğer') },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-rose-500">{t('lifecycle_offboarding_document', 'İşten Ayrılış Belgesi')}</p>
            <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">{t('lifecycle_release_form_title', 'İşten Ayrılış / İbraname Formu')}</h3>
            <p className="mt-2 text-sm text-slate-500">{t('lifecycle_release_form_desc', 'Sistem alanları doldurur, hukuki serbest metin ve ödeme kalemlerini burada tamamlayıp PDF üretebilirsin.')}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-88px)] overflow-y-auto px-6 py-6">
          {loading || !value ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
              {t('lifecycle_form_loading', 'Form yükleniyor...')}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lifecycle_template_label', 'Belge Şablonu')}</label>
                <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
                  {templates.map((template) => {
                    const templateCopy = getTemplateCopy(template);
                    return (
                      <button
                        key={template.key}
                        type="button"
                        onClick={() => onTemplateChange(template.key)}
                        className={`rounded-[1.25rem] border px-4 py-4 text-left transition-all ${value?.template_key === template.key ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                      >
                        <p className="text-sm font-black uppercase tracking-wide">{templateCopy.title}</p>
                        <p className={`mt-2 text-sm ${value?.template_key === template.key ? 'text-white/70' : 'text-slate-500'}`}>{templateCopy.subtitle}</p>
                      </button>
                    );
                  })}
                </div>
                {activeTemplate ? (
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    {activeTemplate.requires_sgk ? t('lifecycle_template_sgk_note', 'Bu şablonda SGK/yerel sicil alanı kullanılır.') : t('lifecycle_template_generic_note', 'Bu şablon genel kapanış formu olarak kullanılır.')}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Field label={t('lifecycle_employer_name', 'İşveren Unvanı')} value={value.employer_name} onChange={(next) => onChange('employer_name', next)} />
                <Field label={t('lifecycle_employer_address', 'İşveren Adresi')} value={value.employer_address} onChange={(next) => onChange('employer_address', next)} />
                <Field label={t('lifecycle_employer_sgk', 'SGK İşyeri Sicil No')} value={value.employer_sgk_workplace_no} onChange={(next) => onChange('employer_sgk_workplace_no', next)} />
                <Field label={t('lifecycle_employer_tax', 'Vergi Numarası')} value={value.employer_tax_number} onChange={(next) => onChange('employer_tax_number', next)} />
                <Field label={t('lifecycle_employee_name', 'Personel Adı')} value={value.employee_name} onChange={(next) => onChange('employee_name', next)} />
                <Field label={t('lifecycle_employee_ssn', 'SGK Sigorta Sicil No')} value={value.employee_social_security_no} onChange={(next) => onChange('employee_social_security_no', next)} />
                <SelectField label={t('lifecycle_exit_reason_label', 'İşten Ayrılış Nedeni')} value={value.exit_reason} onChange={(next) => onChange('exit_reason', next)} options={exitReasonOptions} />
                <Field label={t('lifecycle_hire_date', 'İşe Başlama Tarihi')} type="date" value={value.hire_date} onChange={(next) => onChange('hire_date', next)} />
                <Field label={t('lifecycle_exit_date', 'İşten Ayrılış Tarihi')} type="date" value={value.exit_date} onChange={(next) => onChange('exit_date', next)} />
                <Field label={t('lifecycle_release_date', 'İbra Tarihi')} type="date" value={value.release_date} onChange={(next) => onChange('release_date', next)} />
              </div>

              {value.exit_reason === 'DIGER' ? (
                <div className="grid grid-cols-1 gap-4">
                  <Field label={t('lifecycle_other_exit_reason_note', 'Diğer Ayrılış Açıklaması')} value={value.exit_reason_note} onChange={(next) => onChange('exit_reason_note', next)} placeholder={t('lifecycle_other_exit_reason_placeholder', 'Serbest metin ile açıklayın')} />
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4">
                <TextareaField label={t('lifecycle_intro_text', 'Giriş Metni')} value={value.intro_text} onChange={(next) => onChange('intro_text', next)} />
                <TextareaField label={t('lifecycle_settlement_text', 'Hakediş Metni')} value={value.settlement_text} onChange={(next) => onChange('settlement_text', next)} />
                <TextareaField label={t('lifecycle_no_claim_text', 'Hak Talebi Kalmadığına Dair Metin')} value={value.no_claim_text} onChange={(next) => onChange('no_claim_text', next)} />
                <TextareaField label={t('lifecycle_contact_note', 'Adres ve Telefon / Serbest Not')} value={value.employee_contact_text} onChange={(next) => onChange('employee_contact_text', next)} />
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lifecycle_payment_table', 'Ödeme Tablosu')}</p>
                  <p className="mt-2 text-sm text-slate-500">{t('lifecycle_payment_table_hint', 'İstersen boş bırak, istersen satırları hukuk/muhasebe onayına göre doldur.')}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        <th className="px-3 py-2">{t('lifecycle_payment_col_name', 'Ödemeler')}</th>
                        <th className="px-3 py-2">{t('lifecycle_payment_col_gross', 'Brüt')}</th>
                        <th className="px-3 py-2">{t('lifecycle_payment_col_legal', 'Yasal Kesinti')}</th>
                        <th className="px-3 py-2">{t('lifecycle_payment_col_net', 'Net')}</th>
                        <th className="px-3 py-2">{t('lifecycle_payment_col_special', 'Özel Kesinti')}</th>
                        <th className="px-3 py-2">{t('lifecycle_payment_col_net_payment', 'Net Ödeme')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={`${row.label}-${index}`} className="rounded-2xl bg-white shadow-sm">
                          <td className="min-w-[180px] px-3 py-2 text-sm font-bold text-slate-700">{row.label}</td>
                          {['gross_amount', 'legal_deduction', 'net_amount', 'special_deduction', 'net_payment'].map((fieldKey) => (
                            <td key={fieldKey} className="px-3 py-2">
                              <input
                                value={row[fieldKey] || ''}
                                onChange={(event) => onPaymentChange(index, fieldKey, event.target.value)}
                                disabled={String(row.label || '').toLowerCase() === 'toplam'}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-rose-300"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={onClose} className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-100">
                  {t('btn_cancel', 'Vazgeç')}
                </button>
                <button type="button" onClick={onDownload} className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-100">
                  {t('btn_download_pdf', 'PDF İndir')}
                </button>
                <button type="button" onClick={onStore} className="rounded-[1.25rem] bg-rose-600 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-rose-700">
                  {t('btn_store_to_dossier', 'E-Özlüğe Kaydet')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder = '', type = 'text' }) => (
  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
    <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="mt-3 w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-rose-300"
    />
  </div>
);

const SelectField = ({ label, value, onChange, options }) => (
  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
    <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</label>
    <select
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      className="mt-3 w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-rose-300"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);

const TextareaField = ({ label, value, onChange }) => (
  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
    <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</label>
    <textarea
      rows={4}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      className="mt-3 w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-rose-300"
    />
  </div>
);

const getLifecycleRoleLabel = (role, t) => {
  switch (String(role || '').toUpperCase()) {
    case 'SUPERADMIN':
      return t('lifecycle_role_superadmin', 'Superadmin');
    case 'ADMIN':
      return t('lifecycle_role_admin', 'Admin');
    case 'HR':
      return t('lifecycle_role_hr', 'İK');
    case 'MANAGER':
      return t('lifecycle_role_manager', 'Yönetici');
    case 'EMPLOYEE':
      return t('lifecycle_role_employee', 'Personel');
    default:
      return role || t('lbl_undefined', 'Tanımsız');
  }
};

const OnboardingOffboarding = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('onboarding');
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [openFilterMenu, setOpenFilterMenu] = useState(null);
  const [overview, setOverview] = useState({ summary: {}, employees: [] });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [releaseDraft, setReleaseDraft] = useState(null);
  const [loadingReleaseDraft, setLoadingReleaseDraft] = useState(false);
  const [releaseTemplates, setReleaseTemplates] = useState([]);
  const [checklistTemplates, setChecklistTemplates] = useState([]);
  const [checklistAvailableActions, setChecklistAvailableActions] = useState([]);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [checklistTemplateForm, setChecklistTemplateForm] = useState({
    label: '',
    detail: '',
    responsible_role: '',
    action_key: '',
    sort_order: 10,
    is_required: true,
  });

  const isOffboarding = activeTab === 'offboarding';

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const response = await onboardingApi.getOverview(activeTab, search);
      const payload = response.data || { summary: {}, employees: [] };
      setOverview(payload);
      if (!payload.employees?.length) {
        setSelectedEmployeeId(null);
        setDetail(null);
      } else if (!payload.employees.some((employee) => employee.id === selectedEmployeeId)) {
        setSelectedEmployeeId(payload.employees[0].id);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('lifecycle_overview_load_error', 'Süreç verileri yüklenemedi.'));
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchDetail = async (employeeId) => {
    if (!employeeId) return;
    setLoadingDetail(true);
    try {
      const response = await onboardingApi.getDetail(employeeId, activeTab);
      setDetail(response.data);
      if (response.data?.employee?.exit_date) {
        setExitDate(response.data.employee.exit_date);
      } else if (!isOffboarding) {
        setExitDate(new Date().toISOString().split('T')[0]);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('lifecycle_detail_load_error', 'Süreç detayı yüklenemedi.'));
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetchReleaseTemplates = async () => {
    try {
      const response = await onboardingApi.getOffboardingTemplates();
      setReleaseTemplates(response.data?.templates || []);
    } catch (error) {
      console.error('Lifecycle templates could not be loaded', error);
    }
  };

  const fetchChecklistTemplates = async () => {
    try {
      const response = await onboardingApi.getChecklistTemplates(activeTab);
      setChecklistTemplates(response.data?.items || []);
      setChecklistAvailableActions(response.data?.available_actions || []);
    } catch (error) {
      console.error('Lifecycle checklist templates could not be loaded', error);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchReleaseTemplates();
    fetchChecklistTemplates();
  }, [activeTab]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchOverview();
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchDetail(selectedEmployeeId);
    }
  }, [selectedEmployeeId, activeTab]);

  const selectedEmployee = detail?.employee;

  const summaryCards = useMemo(() => {
    const summary = overview.summary || {};
    if (isOffboarding) {
      return [
        { title: t('lifecycle_summary_total_process', 'Toplam Süreç'), value: summary.total || 0, hint: t('lifecycle_summary_total_process_hint', 'İzlenen personel'), tone: 'rose' },
        { title: t('lifecycle_summary_closed_accounts', 'Kapatılan Hesap'), value: summary.closed_accounts || 0, hint: t('lifecycle_summary_closed_accounts_hint', 'Erişimi durdurulan'), tone: 'slate' },
        { title: t('lifecycle_summary_documents_ready', 'Belgesi Hazır'), value: summary.documents_ready || 0, hint: t('lifecycle_summary_offboarding_documents_hint', 'Çıkış evrakı oluşan'), tone: 'emerald' },
        { title: t('lifecycle_summary_attention_needed', 'Takip Gereken'), value: summary.attention_needed || 0, hint: t('lifecycle_summary_attention_needed_hint', 'Açık adımı olan'), tone: 'amber' },
      ];
    }
    return [
      { title: t('lifecycle_summary_total_employees', 'Toplam Personel'), value: summary.total || 0, hint: t('lifecycle_summary_total_employees_hint', 'İşe başlatma görünümü'), tone: 'indigo' },
      { title: t('lifecycle_summary_accounts_ready', 'Hesap Hazır'), value: summary.accounts_ready || 0, hint: t('lifecycle_summary_accounts_ready_hint', 'Giriş bilgisi tanımlı'), tone: 'emerald' },
      { title: t('lifecycle_summary_documents_ready', 'Belgesi Hazır'), value: summary.documents_ready || 0, hint: t('lifecycle_summary_onboarding_documents_hint', 'Sözleşme ve evrakı hazır'), tone: 'slate' },
      { title: t('lifecycle_summary_attention_needed', 'Takip Gereken'), value: summary.attention_needed || 0, hint: t('lifecycle_summary_attention_needed_onboarding_hint', 'Eksik adımı olan'), tone: 'amber' },
    ];
  }, [overview, isOffboarding]);

  const handleDownload = async (kind) => {
    if (!selectedEmployeeId) return;
      const loadingToast = toast.loading(t('lifecycle_preparing_document', 'Belge hazırlanıyor...'));
    try {
      const response = await onboardingApi.downloadDocument(selectedEmployeeId, kind);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fallbackName = kind === 'termination' ? 'isten_cikis.pdf' : 'is_sozlesmesi.pdf';
      link.setAttribute('download', fallbackName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('lifecycle_document_downloaded', 'Belge indirildi.'), { id: loadingToast });
    } catch (error) {
      toast.error(error.response?.data?.detail || t('lifecycle_document_download_error', 'Belge indirilemedi.'), { id: loadingToast });
    }
  };

  const handleStoreDocument = async (kind) => {
    if (!selectedEmployeeId) return;
    const loadingToast = toast.loading(t('lifecycle_document_storing', 'Belge e-özlüğe kaydediliyor...'));
    try {
      await onboardingApi.createDocument(selectedEmployeeId, kind);
      toast.success(t('lifecycle_document_stored', 'Belge üretildi ve e-özlüğe kaydedildi.'), { id: loadingToast });
      fetchOverview();
      fetchDetail(selectedEmployeeId);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('lifecycle_document_store_error', 'Belge kaydedilemedi.'), { id: loadingToast });
    }
  };

  const handleOpenAccount = async () => {
    if (!selectedEmployeeId) return;
    const loadingToast = toast.loading(t('lifecycle_account_opening', 'Kullanıcı hesabı açılıyor...'));
    try {
      await onboardingApi.openAccount(selectedEmployeeId);
      toast.success(t('lifecycle_account_opened', 'Hesap açıldı.'), { id: loadingToast, duration: 7000 });
      fetchOverview();
      fetchDetail(selectedEmployeeId);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('lifecycle_account_open_error', 'Hesap açılamadı.'), { id: loadingToast });
    }
  };

  const handleCloseAccount = async () => {
    if (!selectedEmployeeId) return;
    const loadingToast = toast.loading(t('lifecycle_account_closing', 'Hesap kapatılıyor...'));
    try {
      await onboardingApi.closeAccount(selectedEmployeeId, exitDate);
      toast.success(t('lifecycle_account_closed', 'Hesap kapatıldı ve personel arşive alındı.'), { id: loadingToast });
      fetchOverview();
      fetchDetail(selectedEmployeeId);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('lifecycle_account_close_error', 'Hesap kapatılamadı.'), { id: loadingToast });
    }
  };

  const openTerminationReleaseModal = async (templateKey = 'tr_release') => {
    if (!selectedEmployeeId) return;
    setLoadingReleaseDraft(true);
    setIsReleaseModalOpen(true);
    try {
      const response = await onboardingApi.getTerminationReleaseDraft(selectedEmployeeId, templateKey);
      setReleaseDraft(prepareReleaseDraft(response.data));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('lifecycle_release_form_open_error', 'İşten ayrılış formu açılamadı.'));
      setIsReleaseModalOpen(false);
    } finally {
      setLoadingReleaseDraft(false);
    }
  };

  const updateReleaseField = (field, nextValue) => {
    setReleaseDraft((prev) => {
      const nextDraft = { ...(prev || {}), [field]: nextValue };
      if (field === 'exit_reason' && nextValue !== 'DIGER') {
        nextDraft.exit_reason_note = '';
      }
      return nextDraft;
    });
  };

  const handleTemplateChange = async (templateKey) => {
    if (!selectedEmployeeId) return;
    setLoadingReleaseDraft(true);
    try {
      const response = await onboardingApi.getTerminationReleaseDraft(selectedEmployeeId, templateKey);
      setReleaseDraft(prepareReleaseDraft(response.data));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('lifecycle_template_load_error', 'Şablon yüklenemedi.'));
    } finally {
      setLoadingReleaseDraft(false);
    }
  };

  const updateReleasePaymentField = (index, field, nextValue) => {
    setReleaseDraft((prev) => {
      if (!prev) return prev;
      const paymentRows = [...(prev.payment_rows || [])];
      paymentRows[index] = { ...paymentRows[index], [field]: nextValue };
      return { ...prev, payment_rows: recalculatePaymentRows(paymentRows) };
    });
  };

  const handleTerminationReleaseDownload = async () => {
    if (!selectedEmployeeId || !releaseDraft) return;
    const loadingToast = toast.loading(t('lifecycle_release_pdf_preparing', 'İşten ayrılış PDF hazırlanıyor...'));
    try {
      const response = await onboardingApi.downloadTerminationReleasePdf(selectedEmployeeId, releaseDraft);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ibraname.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('lifecycle_release_pdf_downloaded', 'İşten ayrılış belgesi indirildi.'), { id: loadingToast });
    } catch (error) {
      toast.error(error.response?.data?.detail || t('lifecycle_release_pdf_error', 'İşten ayrılış belgesi indirilemedi.'), { id: loadingToast });
    }
  };

  const handleTerminationReleaseStore = async () => {
    if (!selectedEmployeeId || !releaseDraft) return;
    const loadingToast = toast.loading(t('lifecycle_release_storing', 'İşten ayrılış belgesi e-özlüğe kaydediliyor...'));
    try {
      await onboardingApi.storeTerminationRelease(selectedEmployeeId, releaseDraft);
      toast.success(t('lifecycle_release_stored', 'İşten ayrılış belgesi üretildi ve e-özlüğe kaydedildi.'), { id: loadingToast });
      setIsReleaseModalOpen(false);
      fetchOverview();
      fetchDetail(selectedEmployeeId);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('lifecycle_release_store_error', 'İşten ayrılış belgesi kaydedilemedi.'), { id: loadingToast });
    }
  };

  const handleChecklistTemplateChange = (field, value) => {
    setChecklistTemplateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChecklistTemplateCreate = async (event) => {
    event.preventDefault();
    const loadingToast = toast.loading(t('lifecycle_template_creating', 'Kontrol listesi maddesi ekleniyor...'));
    try {
      await onboardingApi.createChecklistTemplate({
        mode: activeTab,
        label: checklistTemplateForm.label,
        detail: checklistTemplateForm.detail,
        responsible_role: checklistTemplateForm.responsible_role || null,
        action_key: checklistTemplateForm.action_key || null,
        sort_order: Number(checklistTemplateForm.sort_order || 0),
        is_required: checklistTemplateForm.is_required,
      });
      toast.success(t('lifecycle_template_created', 'Kontrol listesi şablon maddesi eklendi.'), { id: loadingToast });
      setChecklistTemplateForm({
        label: '',
        detail: '',
        responsible_role: '',
        action_key: '',
        sort_order: 10,
        is_required: true,
      });
      fetchChecklistTemplates();
      if (selectedEmployeeId) fetchDetail(selectedEmployeeId);
      fetchOverview();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('lifecycle_template_create_error', 'Kontrol listesi maddesi eklenemedi.'), { id: loadingToast });
    }
  };

  const handleChecklistTemplateDelete = async (templateId) => {
    const loadingToast = toast.loading(t('lifecycle_template_deleting', 'Kontrol listesi maddesi siliniyor...'));
    try {
      await onboardingApi.deleteChecklistTemplate(templateId);
      toast.success(t('lifecycle_template_deleted', 'Kontrol listesi şablon maddesi silindi.'), { id: loadingToast });
      fetchChecklistTemplates();
      if (selectedEmployeeId) fetchDetail(selectedEmployeeId);
      fetchOverview();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('lifecycle_template_delete_error', 'Kontrol listesi maddesi silinemedi.'), { id: loadingToast });
    }
  };

  const handleToggleCustomChecklist = async (item) => {
    if (!selectedEmployeeId || !item?.template_id) return;
    const loadingToast = toast.loading(t('lifecycle_checklist_updating', 'Kontrol listesi maddesi güncelleniyor...'));
    try {
      await onboardingApi.updateChecklistItem(selectedEmployeeId, item.template_id, {
        is_done: !item.done,
        note: item.note || '',
      });
      toast.success(t('lifecycle_checklist_updated', 'Kontrol listesi maddesi güncellendi.'), { id: loadingToast });
      fetchOverview();
      fetchDetail(selectedEmployeeId);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('lifecycle_checklist_update_error', 'Kontrol listesi maddesi güncellenemedi.'), { id: loadingToast });
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <Toaster position="top-right" />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('onboarding')}
            className={`rounded-[1.5rem] px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] transition-all ${!isOffboarding ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            <span className="flex items-center gap-2"><UserPlus size={16} /> {t('lifecycle_tab_onboarding', 'İşe Başlatma')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('offboarding')}
            className={`rounded-[1.5rem] px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] transition-all ${isOffboarding ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            <span className="flex items-center gap-2"><UserMinus size={16} /> {t('lifecycle_tab_offboarding', 'İşten Ayrılış')}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={fetchOverview}
          className="w-fit rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-slate-500 transition-all hover:border-slate-300 hover:text-slate-800"
          title={t('btn_refresh', 'Yenile')}
        >
          <RefreshCcw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-sm">
          <FilterPopover
            label={t('lbl_search', 'Arama')}
            open={openFilterMenu === 'search'}
            active={Boolean(search)}
            onToggle={() => setOpenFilterMenu((prev) => (prev === 'search' ? null : 'search'))}
            onReset={() => setSearchDraft('')}
            onCancel={() => { setSearchDraft(search); setOpenFilterMenu(null); }}
            onApply={() => { setSearch(searchDraft); setOpenFilterMenu(null); }}
            panelWidthClass="w-[320px]"
          >
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder={isOffboarding ? t('lifecycle_search_offboarding', 'Çıkış süreci personeli ara') : t('lifecycle_search_onboarding', 'Yeni başlayan personel ara')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-[12px] font-bold text-slate-700 outline-none placeholder:text-slate-300 focus:border-indigo-500"
              />
            </div>
          </FilterPopover>

          <div className="mt-5 space-y-3">
            {loadingOverview ? (
              <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                {t('lbl_loading', 'Yükleniyor...')}
              </div>
            ) : overview.employees?.length ? (
              overview.employees.map((employee) => (
                <EmployeeRow
                  key={employee.id}
                  employee={employee}
                  mode={activeTab}
                  selected={selectedEmployeeId === employee.id}
                  onClick={() => setSelectedEmployeeId(employee.id)}
                />
              ))
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">{t('lbl_no_records', 'Kayıt Yok')}</p>
                <p className="mt-3 text-sm text-slate-500">{t('lifecycle_no_matching_personnel', 'Bu görünüm için eşleşen personel bulunamadı.')}</p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          {loadingDetail ? (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-sm font-bold uppercase tracking-[0.24em] text-slate-400">
              {t('lifecycle_detail_loading', 'Süreç detayı yükleniyor...')}
            </div>
          ) : !selectedEmployee ? (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">{t('lifecycle_select_personnel', 'Personel Seçin')}</p>
              <p className="mt-3 text-sm text-slate-500">{t('lifecycle_select_personnel_hint', 'Soldaki listeden bir personel seçtiğinizde işe başlatma / işten ayrılış adımları burada görünecek.')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className={`rounded-[2.25rem] p-6 text-white shadow-xl ${isOffboarding ? 'bg-gradient-to-br from-rose-600 via-rose-500 to-orange-400' : 'bg-gradient-to-br from-slate-900 via-indigo-700 to-cyan-500'}`}>
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/70">{isOffboarding ? t('lifecycle_offboarding_process', 'İşten Ayrılış Süreci') : t('lifecycle_onboarding_process', 'İşe Başlatma Süreci')}</p>
                    <h2 className="mt-3 text-3xl font-black uppercase tracking-tight">{selectedEmployee.name}</h2>
                    <div className="mt-4 flex flex-wrap gap-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/80">
                      <span className="rounded-full bg-white/10 px-3 py-2">{getLifecycleRoleLabel(selectedEmployee.role, t)}</span>
                      <span className="rounded-full bg-white/10 px-3 py-2">{selectedEmployee.department || t('lifecycle_no_department', 'Departman yok')}</span>
                      <span className="rounded-full bg-white/10 px-3 py-2">{selectedEmployee.position || t('lbl_unassigned', 'Kadrosuz')}</span>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] bg-white/10 px-5 py-4 text-right backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/70">{t('lifecycle_progress', 'İlerleme')}</p>
                    <p className="mt-2 text-4xl font-black">%{detail.progress}</p>
                    <p className="mt-2 text-xs font-bold text-white/70">{selectedEmployee.status === 'ACTIVE' ? t('lifecycle_account_active', 'Hesap aktif') : t('lifecycle_account_closed_status', 'Hesap kapalı')}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lbl_email', 'E-Posta')}</p>
                  <p className="mt-3 text-sm font-bold text-slate-800">{selectedEmployee.email || t('lbl_undefined', 'Tanımsız')}</p>
                </div>
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{isOffboarding ? t('lifecycle_exit_date_short', 'Çıkış Tarihi') : t('lbl_hire_date', 'İşe Giriş')}</p>
                  <p className="mt-3 text-sm font-bold text-slate-800">{isOffboarding ? (selectedEmployee.exit_date || t('lifecycle_not_planned', 'Planlanmadı')) : (selectedEmployee.hire_date || t('lbl_undefined', 'Tanımsız'))}</p>
                </div>
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lifecycle_document_count', 'Evrak Sayısı')}</p>
                  <p className="mt-3 text-sm font-bold text-slate-800">{selectedEmployee.counts?.total_documents || 0}</p>
                </div>
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{isOffboarding ? t('lifecycle_open_workload', 'Açık Yük') : t('lifecycle_active_device', 'Aktif Cihaz')}</p>
                  <p className="mt-3 text-sm font-bold text-slate-800">
                    {isOffboarding
                      ? `${selectedEmployee.counts?.pending_leaves || 0} ${t('lifecycle_leave_unit', 'izin')} / ${selectedEmployee.counts?.pending_expenses || 0} ${t('lifecycle_expense_unit', 'masraf')}`
                      : `${selectedEmployee.counts?.active_devices || 0} ${t('lifecycle_device_unit', 'cihaz')}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={18} className={isOffboarding ? 'text-rose-500' : 'text-indigo-500'} />
                      <h3 className="text-sm font-black uppercase tracking-[0.24em] text-slate-800">{t('lifecycle_checklist', 'Kontrol Listesi')}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChecklistModalOpen(true)}
                      className="flex items-center gap-2 rounded-[1.15rem] border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
                    >
                      <ListChecks size={15} /> {t('lifecycle_manage_template', 'Şablonu Yönet')}
                    </button>
                  </div>
                  {detail.checklist?.map((item) => (
                    <ChecklistRow key={item.id} item={localizeLifecycleChecklistItem(item, t)} />
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <ListChecks size={18} className={isOffboarding ? 'text-rose-500' : 'text-indigo-500'} />
                    <h3 className="text-sm font-black uppercase tracking-[0.24em] text-slate-800">{t('lifecycle_operation_checklist', 'Operasyon Kontrol Listesi')}</h3>
                  </div>
                  {detail.custom_checklist?.length ? detail.custom_checklist.map((item) => (
                    <TemplateChecklistRow key={item.id} item={item} onToggle={() => handleToggleCustomChecklist(item)} />
                  )) : (
                    <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                      <p className="text-sm font-bold text-slate-400">{t('lifecycle_custom_checklist_empty', 'Bu süreç için henüz tekrar kullanılabilir kontrol listesi maddesi eklenmedi.')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className={isOffboarding ? 'text-rose-500' : 'text-indigo-500'} />
                    <h3 className="text-sm font-black uppercase tracking-[0.24em] text-slate-800">{t('lifecycle_progress_summary', 'İlerleme Özeti')}</h3>
                  </div>
                  <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold leading-7 text-slate-500">
                      {isOffboarding
                        ? t('lifecycle_offboarding_checklist_note', 'Standart kapanış maddeleri ile şirketin tekrar kullanılabilir işten ayrılış kontrol listesi adımları birlikte ilerleme yüzdesine dahil edilir.')
                        : t('lifecycle_onboarding_checklist_note', 'Standart işe başlatma maddeleri ile şirketin tekrar kullanılabilir işe başlatma kontrol listesi adımları birlikte ilerleme yüzdesine dahil edilir.')}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className={isOffboarding ? 'text-rose-500' : 'text-indigo-500'} />
                    <h3 className="text-sm font-black uppercase tracking-[0.24em] text-slate-800">{t('lifecycle_process_actions', 'Süreç Aksiyonları')}</h3>
                  </div>

                  <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="space-y-3">
                      {isOffboarding ? (
                        <>
                          <label className="block text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{t('lifecycle_exit_date_short', 'Çıkış Tarihi')}</label>
                          <div className="relative">
                            <CalendarDays size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="date"
                              value={exitDate}
                              onChange={(event) => setExitDate(event.target.value)}
                              className="w-full rounded-[1.25rem] border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-rose-300"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleCloseAccount}
                            className="flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-rose-600 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-rose-700"
                          >
                            <ShieldOff size={16} /> {t('lifecycle_close_account', 'Hesabı Kapat')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleOpenAccount}
                          className="flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-indigo-600 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-indigo-700"
                        >
                          <KeyRound size={16} /> {t('lifecycle_open_account', 'Hesabı Aç / Şifre Gönder')}
                        </button>
                      )}

                      {isOffboarding ? (
                        <button
                          type="button"
                          onClick={openTerminationReleaseModal}
                          className="flex w-full items-center justify-center gap-2 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-100"
                        >
                          <FileText size={16} /> {t('lifecycle_open_release_form', 'İşten Ayrılış Formunu Aç')}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDownload('contract')}
                            className="flex w-full items-center justify-center gap-2 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-100"
                          >
                            <FileText size={16} /> {t('lifecycle_download_document', 'Belgeyi İndir')}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStoreDocument('contract')}
                            className="flex w-full items-center justify-center gap-2 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-100"
                          >
                            <FolderPlus size={16} /> {t('btn_store_to_dossier', 'E-Özlüğe Kaydet')}
                          </button>
                        </>
                      )}
                    </div>

                    <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{t('lifecycle_process_note', 'Süreç Notu')}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        {isOffboarding
                          ? t('lifecycle_offboarding_note', 'Önce aktif zimmetleri ve açık iş yüklerini kontrol edin. Hesap kapanınca MFA ve mobil cihaz oturumları da pasifleştirilir.')
                          : t('lifecycle_onboarding_note', 'Hesap açılışında geçici şifre gönderilir. Üretilen sözleşmeyi e-özlüğe kaydedip işe başlatma evrak setine dahil edebilirsiniz.')}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-slate-900 p-3 text-white">
                        {isOffboarding ? <UserMinus size={18} /> : <Briefcase size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lifecycle_highlights', 'Öne Çıkan Eksikler')}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(selectedEmployee.highlights || []).length ? (
                            selectedEmployee.highlights.map((highlight) => (
                              <span key={highlight} className="rounded-full bg-white px-3 py-2 text-[11px] font-bold text-slate-600 shadow-sm">
                                {highlight}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-3 py-2 text-[11px] font-bold text-emerald-700">
                              {t('lifecycle_no_open_items', 'Süreçte açık madde kalmadı')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <ChecklistTemplateModal
        open={isChecklistModalOpen}
        mode={activeTab}
        items={checklistTemplates}
        availableActions={checklistAvailableActions}
        form={checklistTemplateForm}
        onFormChange={handleChecklistTemplateChange}
        onCreate={handleChecklistTemplateCreate}
        onDelete={handleChecklistTemplateDelete}
        onClose={() => setIsChecklistModalOpen(false)}
      />

      <TerminationReleaseModal
        open={isReleaseModalOpen}
        value={releaseDraft}
        templates={releaseTemplates}
        loading={loadingReleaseDraft}
        onClose={() => setIsReleaseModalOpen(false)}
        onChange={updateReleaseField}
        onTemplateChange={handleTemplateChange}
        onPaymentChange={updateReleasePaymentField}
        onDownload={handleTerminationReleaseDownload}
        onStore={handleTerminationReleaseStore}
      />
    </div>
  );
};

export default OnboardingOffboarding;

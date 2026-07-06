import React, { useEffect, useMemo, useState } from 'react';
import api, { companyApi, getEmployees, settingsApi, employeeApi, getAbsoluteFileUrl } from '../api/axios';
import { Building2, Save, AlertCircle, Upload, CheckCircle, Image as ImageIcon, MapPin, Phone, Mail, Globe, LifeBuoy, FileText, ShoppingCart, Shield, Wallet, UserPlus, UserMinus, Lock, Key, Cpu } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const TABS = {
  RESPONSIBLES: 'RESPONSIBLES',
  COMPANY: 'COMPANY',
  PERSONAL: 'PERSONAL',
};

const DOSSIER_DOCUMENT_OPTIONS = [
  'KIMLIK',
  'SOZLESME',
  'BANKA_BILGISI',
  'VERGI_BELGESI',
  'SOSYAL_GUVENLIK_KAYDI',
  'HANDBOOK_ACK',
  'ISG_EGITIM',
  'NDA',
  'BACKGROUND_CHECK',
  'CALISMA_IZNI',
  'VIZE',
  'IKAMET_BELGESI',
  'ONBOARDING_CHECKLIST',
  'ISTEN_CIKIS',
  'EXIT_INTERVIEW',
  'OFFBOARDING_CHECKLIST',
];

const DOSSIER_ALERT_ROLE_OPTIONS = ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN', 'SUPERADMIN'];
const PLAN_OPTIONS = [
  { value: 'BASIC', label: 'Basic' },
  { value: 'PRO', label: 'Pro' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
];
const DOSSIER_DOCUMENT_TRANSLATION_KEYS = {
  KIMLIK: 'doc_id',
  SOZLESME: 'doc_contract',
  BANKA_BILGISI: 'doc_bank_info',
  VERGI_BELGESI: 'doc_tax_doc',
  SOSYAL_GUVENLIK_KAYDI: 'doc_social_security_record',
  HANDBOOK_ACK: 'doc_handbook_ack',
  ISG_EGITIM: 'doc_ohs_training',
  NDA: 'doc_nda',
  BACKGROUND_CHECK: 'doc_background_check',
  CALISMA_IZNI: 'doc_work_permit',
  VIZE: 'doc_visa',
  IKAMET_BELGESI: 'doc_residency',
  ONBOARDING_CHECKLIST: 'doc_onboarding_checklist',
  ISTEN_CIKIS: 'doc_termination',
  EXIT_INTERVIEW: 'doc_exit_interview',
  OFFBOARDING_CHECKLIST: 'doc_offboarding_checklist',
};

const CompanySettings = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS.RESPONSIBLES);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    official_legal_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    tax_number: '',
    workplace_registration_no: '',
    plan_code: 'PRO',
  });

  const [routingConfigs, setRoutingConfigs] = useState({
    it_responsible: '',
    hr_responsible: '',
    admin_responsible: '',
    payroll_officer_id: '',
    onboarding_responsible: '',
    offboarding_responsible: '',
    dossier_required_global: [],
    dossier_required_tr: [],
    dossier_required_kktc: [],
    dossier_required_eu: [],
    dossier_required_mena: [],
    dossier_required_leadership: [],
    dossier_alert_roles: ['MANAGER', 'HR', 'ADMIN', 'SUPERADMIN'],
  });

  const [pwdForm, setPwdForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const dossierProfileFields = useMemo(
    () => [
      { key: 'dossier_required_global', title: t('dossier_profile_global_title', 'Global'), description: t('dossier_profile_global_desc', 'Varsayılan şirket profili için temel zorunlu belge seti.') },
      { key: 'dossier_required_tr', title: t('dossier_profile_tr_title', 'TR'), description: t('dossier_profile_tr_desc', 'Türkiye profili için zorunlu belge seti.') },
      { key: 'dossier_required_kktc', title: t('dossier_profile_kktc_title', 'KKTC'), description: t('dossier_profile_kktc_desc', 'KKTC profili için zorunlu belge seti.') },
      { key: 'dossier_required_eu', title: t('dossier_profile_eu_title', 'EU'), description: t('dossier_profile_eu_desc', 'Avrupa profili için zorunlu belge seti.') },
      { key: 'dossier_required_mena', title: t('dossier_profile_mena_title', 'MENA'), description: t('dossier_profile_mena_desc', 'MENA profili için zorunlu belge seti.') },
      { key: 'dossier_required_leadership', title: t('dossier_profile_leadership_title', 'Leadership'), description: t('dossier_profile_leadership_desc', 'Yönetici, HR, Admin ve Superadmin için ek zorunlu belge seti.') },
    ],
    [t]
  );

  const groupedEmployees = useMemo(() => {
    return employees.reduce((acc, emp) => {
      const empPos = positions.find((p) => p.id === emp.position_id);
      const departmentName = (empPos ? empPos.department : (emp.department || t('lbl_other', 'DİĞER'))).toLocaleUpperCase(locale);
      const title = (empPos ? empPos.title : t('lbl_unassigned', 'Unassigned')).toLocaleUpperCase(locale);
      if (!acc[departmentName]) acc[departmentName] = [];
      acc[departmentName].push({ ...emp, display_title: title });
      return acc;
    }, {});
  }, [employees, positions, locale, t]);

  const resolvedLogoUrl = useMemo(() => {
    if (!company?.logo_url) return null;
    return getAbsoluteFileUrl(company.logo_url);
  }, [company?.logo_url]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const [companyRes, employeesRes, settingsRes, positionsRes] = await Promise.all([
        api.get('/company/list'),
        getEmployees(),
        settingsApi.getSettings(),
        employeeApi.getPositions(),
      ]);

      const myCompany = companyRes.data?.[0] || null;
      setCompany(myCompany);
      if (myCompany) {
        setFormData({
          name: myCompany.name || '',
          official_legal_name: myCompany.official_legal_name || '',
          address: myCompany.address || '',
          phone: myCompany.phone || '',
          email: myCompany.email || '',
          website: myCompany.website || '',
          tax_number: myCompany.tax_number || '',
          workplace_registration_no: myCompany.workplace_registration_no || '',
          plan_code: myCompany.plan_code || 'PRO',
        });
      }

      setEmployees(employeesRes.data || []);
      setPositions(positionsRes.data || []);
      setRoutingConfigs({
        it_responsible: settingsRes.data?.it_responsible || '',
        hr_responsible: settingsRes.data?.hr_responsible || '',
        admin_responsible: settingsRes.data?.admin_responsible || '',
        payroll_officer_id: settingsRes.data?.payroll_officer_id || '',
        onboarding_responsible: settingsRes.data?.onboarding_responsible || '',
        offboarding_responsible: settingsRes.data?.offboarding_responsible || '',
        dossier_required_global: settingsRes.data?.dossier_required_global || [],
        dossier_required_tr: settingsRes.data?.dossier_required_tr || [],
        dossier_required_kktc: settingsRes.data?.dossier_required_kktc || [],
        dossier_required_eu: settingsRes.data?.dossier_required_eu || [],
        dossier_required_mena: settingsRes.data?.dossier_required_mena || [],
        dossier_required_leadership: settingsRes.data?.dossier_required_leadership || [],
        dossier_alert_roles: settingsRes.data?.dossier_alert_roles?.length ? settingsRes.data.dossier_alert_roles : ['MANAGER', 'HR', 'ADMIN', 'SUPERADMIN'],
      });
    } catch (error) {
      toast.error(t('err_fetch_data', 'Veriler yüklenirken bir hata oluştu.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleUpdateCompany = async (event) => {
    event.preventDefault();
    if (!company) return;
    const loadingToast = toast.loading(t('msg_updating_company_info', 'Şirket bilgileri güncelleniyor...'));
    try {
      setSaving(true);
      await api.put(`/company/${company.id}`, formData);
      localStorage.setItem('company_plan', formData.plan_code || 'PRO');
      window.dispatchEvent(new Event('app:plan-changed'));
      toast.success(t('msg_company_info_updated', 'Şirket bilgileri güncellendi.'), { id: loadingToast });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_company_info_update', 'Şirket bilgileri güncellenemedi.'), { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRouting = async () => {
    const loadingToast = toast.loading(t('msg_saving_company_responsibles', 'Şirket sorumluları kaydediliyor...'));
    try {
      setSaving(true);
      const payload = Object.fromEntries(
        Object.entries(routingConfigs).map(([key, value]) => {
          if (Array.isArray(value)) return [key, value];
          return [key, value ? parseInt(value, 10) : null];
        })
      );
      await settingsApi.updateSettings(payload);
      toast.success(t('msg_company_responsibles_saved', 'Şirket sorumluları kaydedildi.'), { id: loadingToast });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_company_responsibles_save', 'Şirket sorumluları kaydedilemedi.'), { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      toast.error(t('err_pwd_match', 'Yeni şifreler birbiriyle eşleşmiyor!'));
      return;
    }
    if (pwdForm.new_password.length < 6) {
      toast.error(t('err_pwd_length', 'Yeni şifreniz en az 6 karakter olmalıdır.'));
      return;
    }

    const loadingToast = toast.loading(t('msg_updating_password', 'Şifreniz güncelleniyor...'));
    try {
      setSaving(true);
      await api.put('/employee/me/change-password', {
        old_password: pwdForm.old_password,
        new_password: pwdForm.new_password,
      });
      toast.success(t('msg_password_updated', 'Şifreniz başarıyla değiştirildi.'), { id: loadingToast });
      setPwdForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_password_update', 'Şifre güncellenemedi.'), { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('err_file_size', "Dosya boyutu 2MB'den büyük olamaz."));
      event.target.value = null;
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!selectedFile || !company) return;
    const loadingToast = toast.loading(t('msg_updating_logo', 'Logo yükleniyor...'));
    try {
      setSaving(true);
      await companyApi.uploadLogo(company.id, selectedFile);
      toast.success(t('msg_logo_updated', 'Logo başarıyla güncellendi.'), { id: loadingToast });
      setSelectedFile(null);
      setPreviewUrl(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_logo_upload', 'Logo yüklenemedi.'), { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-950 text-2xl font-black uppercase tracking-[0.3em] text-cyan-400">{t('msg_loading_settings', 'Ayarlar yükleniyor...')}</div>;
  }

  const tabButtons = [
    { key: TABS.RESPONSIBLES, label: t('settings_tab_responsibles', 'Şirket Sorumluları'), hint: t('settings_tab_responsibles_hint', 'Sistem iş akışı ayarları'), icon: <Cpu size={16} /> },
    { key: TABS.COMPANY, label: t('settings_tab_company', 'Şirket Bilgileri'), hint: t('settings_tab_company_hint', 'Adres, telefon, logo'), icon: <Building2 size={16} /> },
    { key: TABS.PERSONAL, label: t('settings_tab_personal', 'Kişisel Ayarlar'), hint: t('settings_tab_personal_hint', 'Şifre ve güvenlik'), icon: <Lock size={16} /> },
  ];

  const getDocumentLabel = (type) => t(DOSSIER_DOCUMENT_TRANSLATION_KEYS[type] || type, type.replaceAll('_', ' '));
  const getRoleLabel = (roleCode) => {
    if (roleCode === 'EMPLOYEE') return t('role_employee_short', 'PERSONEL');
    return t(`role_${roleCode.toLowerCase()}`, roleCode);
  };

  const toggleRoutingListValue = (field, value) => {
    setRoutingConfigs((prev) => {
      const currentValues = Array.isArray(prev[field]) ? prev[field] : [];
      const exists = currentValues.includes(value);
      return {
        ...prev,
        [field]: exists ? currentValues.filter((item) => item !== value) : [...currentValues, value],
      };
    });
  };

  return (
    <div className="min-h-full space-y-8" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? 'top-left' : 'top-right'} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {tabButtons.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-[2rem] border p-5 text-left transition-all ${activeTab === tab.key ? 'border-slate-900 bg-slate-900 text-white shadow-xl shadow-slate-900/10' : 'border-slate-200 bg-white hover:border-cyan-200 hover:shadow-sm'}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${activeTab === tab.key ? 'text-cyan-300' : 'text-slate-400'}`}>{tab.hint}</p>
                <h3 className={`mt-2 text-lg font-black uppercase tracking-tight ${activeTab === tab.key ? 'text-white' : 'text-slate-900'}`}>{tab.label}</h3>
              </div>
              <div className={`rounded-2xl p-3 ${activeTab === tab.key ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'}`}>{tab.icon}</div>
            </div>
          </button>
        ))}
      </div>

      {activeTab === TABS.RESPONSIBLES && (
        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <ResponsibleCard
                title={t('settings_responsible_it', 'Helpdesk (IT)')}
                description={t('settings_responsible_it_desc', 'Teknik destek, cihaz arızası ve BT operasyon talepleri varsayılan olarak bu sorumlunun iş listesine düşer.')}
                icon={<LifeBuoy size={16} className="text-cyan-500" />}
              >
                <EmployeeSelect value={routingConfigs.it_responsible} onChange={(event) => setRoutingConfigs((prev) => ({ ...prev, it_responsible: event.target.value }))} groupedEmployees={groupedEmployees} t={t} locale={locale} />
              </ResponsibleCard>

              <ResponsibleCard
                title={t('settings_responsible_hr', 'İK Sorumlusu')}
                description={t('settings_responsible_hr_desc', 'Özlük, evrak ve çalışan yaşam döngüsü süreçlerinde ilk operasyon sorumlusu olarak kullanılır.')}
                icon={<FileText size={16} className="text-indigo-500" />}
              >
                <EmployeeSelect value={routingConfigs.hr_responsible} onChange={(event) => setRoutingConfigs((prev) => ({ ...prev, hr_responsible: event.target.value }))} groupedEmployees={groupedEmployees} t={t} locale={locale} />
              </ResponsibleCard>

              <ResponsibleCard
                title={t('settings_responsible_admin', 'İdari / Malzeme')}
                description={t('settings_responsible_admin_desc', 'İdari işler, satın alma ön talepleri ve ofis ihtiyaçlarında varsayılan iş akışı sahibi olarak çalışır.')}
                icon={<ShoppingCart size={16} className="text-amber-500" />}
              >
                <EmployeeSelect value={routingConfigs.admin_responsible} onChange={(event) => setRoutingConfigs((prev) => ({ ...prev, admin_responsible: event.target.value }))} groupedEmployees={groupedEmployees} t={t} locale={locale} />
              </ResponsibleCard>

              <ResponsibleCard
                title={t('settings_responsible_payroll', 'Bordro Sorumlusu')}
                description={t('settings_responsible_payroll_desc', 'Bordro, ücret, kesinti ve dönemsel maaş sorularında ilk değerlendirme sorumlusu olarak atanır.')}
                icon={<Wallet size={16} className="text-emerald-500" />}
              >
                <EmployeeSelect value={routingConfigs.payroll_officer_id} onChange={(event) => setRoutingConfigs((prev) => ({ ...prev, payroll_officer_id: event.target.value }))} groupedEmployees={groupedEmployees} t={t} locale={locale} />
              </ResponsibleCard>

              <ResponsibleCard
                title={t('settings_responsible_onboarding', 'İşe Başlatma Sorumlusu')}
                description={t('settings_responsible_onboarding_desc', 'Yeni personel hesabı açılışı, ilk evrak takibi ve işe başlangıç adımlarında varsayılan iş sahibi olur.')}
                icon={<UserPlus size={16} className="text-sky-500" />}
              >
                <EmployeeSelect value={routingConfigs.onboarding_responsible} onChange={(event) => setRoutingConfigs((prev) => ({ ...prev, onboarding_responsible: event.target.value }))} groupedEmployees={groupedEmployees} t={t} locale={locale} />
              </ResponsibleCard>

              <ResponsibleCard
                title={t('settings_responsible_offboarding', 'İşten Ayrılış Sorumlusu')}
                description={t('settings_responsible_offboarding_desc', 'Çıkış tarihi, hesap kapatma, iade ve kapanış belgeleri sürecinde varsayılan iş sahibi olur.')}
                icon={<UserMinus size={16} className="text-rose-500" />}
              >
                <EmployeeSelect value={routingConfigs.offboarding_responsible} onChange={(event) => setRoutingConfigs((prev) => ({ ...prev, offboarding_responsible: event.target.value }))} groupedEmployees={groupedEmployees} t={t} locale={locale} />
              </ResponsibleCard>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lbl_general_note', 'Genel Not')}</p>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Bu atamalar zorunlu değildir. Bir alan boş bırakılırsa sistem ilgili rolün varsayılan iş akışını devreye alır; işe başlatma ve işten ayrılış süreçlerinde öncelik İK tarafında kalır, gerektiğinde ADMIN veya SUPERADMIN desteğine yönelir.
            </p>
          </div>

          <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lbl_dossier_rules_engine', 'E-Özlük Kural Motoru')}</p>
                <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-slate-900">{t('lbl_required_document_sets', 'Zorunlu belge setleri')}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Boş bırakırsanız sistem varsayılan zorunlu belge setini kullanır. Burada seçim yaptığınız profillerde şirketinizin kendi kuralları geçerli olur.
                </p>
              </div>
              <div className="rounded-[1.25rem] bg-indigo-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                E-Özlük 2. Faz
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
              {dossierProfileFields.map((profile) => (
                <div key={profile.key} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">{profile.title}</p>
                  <p className="mt-2 text-[12px] leading-5 text-slate-500">{profile.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {DOSSIER_DOCUMENT_OPTIONS.map((docType) => {
                      const active = (routingConfigs[profile.key] || []).includes(docType);
                      return (
                        <button
                          key={`${profile.key}-${docType}`}
                          type="button"
                          onClick={() => toggleRoutingListValue(profile.key, docType)}
                          className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                            active
                              ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200 hover:text-cyan-600'
                          }`}
                        >
                          {getDocumentLabel(docType)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">{t('lbl_expiry_alert_roles', 'Expiry Alert Rolleri')}</p>
              <p className="mt-2 text-[12px] leading-5 text-slate-500">
                Süresi dolan, yakında bitecek ve eksik zorunlu evrak bildirimleri sadece burada seçtiğiniz rollere gösterilir.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {DOSSIER_ALERT_ROLE_OPTIONS.map((roleCode) => {
                  const active = (routingConfigs.dossier_alert_roles || []).includes(roleCode);
                  return (
                    <button
                      key={roleCode}
                      type="button"
                      onClick={() => toggleRoutingListValue('dossier_alert_roles', roleCode)}
                      className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                        active
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200 hover:text-amber-700'
                      }`}
                    >
                      {getRoleLabel(roleCode)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={handleSaveRouting}
              disabled={saving}
              className="flex items-center gap-2 rounded-[1.5rem] bg-slate-900 px-6 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-cyan-600 disabled:opacity-50"
            >
              <Save size={16} /> {t('btn_save_routing_responsibles', 'İş Akışı Sorumlularını Kaydet')}
            </button>
          </div>
        </section>
      )}

      {activeTab === TABS.COMPANY && (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
            <form onSubmit={handleUpdateCompany} className="space-y-8">
              <div className="grid grid-cols-1 gap-5">
                <FieldBlock label={t('settings_field_visible_company_name', 'Görünen Şirket Adı')} value={formData.name} onChange={(value) => setFormData((prev) => ({ ...prev, name: value }))} upper />
                <FieldBlock label={t('settings_field_legal_name', 'Yasal / Ticari Unvan')} value={formData.official_legal_name} onChange={(value) => setFormData((prev) => ({ ...prev, official_legal_name: value }))} placeholder={t('ph_legal_name', 'Sözleşme ve resmi belgelerde kullanılacak unvan')} />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FieldBlock label={t('settings_field_tax_no', 'Vergi No')} value={formData.tax_number} onChange={(value) => setFormData((prev) => ({ ...prev, tax_number: value }))} />
                <FieldBlock label={t('settings_field_workplace_no', 'SGK / İşyeri Sicil No')} value={formData.workplace_registration_no} onChange={(value) => setFormData((prev) => ({ ...prev, workplace_registration_no: value }))} />
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">{t('settings_field_active_plan', 'Aktif Paket')}</label>
                  <select
                    value={formData.plan_code}
                    onChange={(event) => setFormData((prev) => ({ ...prev, plan_code: event.target.value }))}
                    className="w-full rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-900 outline-none transition-all focus:border-cyan-300 focus:bg-white"
                  >
                    {PLAN_OPTIONS.map((plan) => (
                      <option key={plan.value} value={plan.value}>
                        {plan.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[12px] leading-5 text-slate-500">
                    Bu alan ürün modüllerini açıp kapatır. Paddle entegrasyonu tamamlandığında aynı plan kodu ödeme akışıyla otomatik güncellenecek.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <TextAreaBlock label={t('settings_field_address', 'Adres')} value={formData.address} onChange={(value) => setFormData((prev) => ({ ...prev, address: value }))} />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FieldBlock label={t('settings_field_phone', 'Telefon')} value={formData.phone} onChange={(value) => setFormData((prev) => ({ ...prev, phone: value }))} icon={<Phone size={14} />} />
                <FieldBlock label={t('settings_field_email', 'E-Posta')} value={formData.email} onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))} type="email" icon={<Mail size={14} />} />
                <div className="md:col-span-2">
                  <FieldBlock label={t('settings_field_website', 'Web Sitesi')} value={formData.website} onChange={(value) => setFormData((prev) => ({ ...prev, website: value }))} icon={<Globe size={14} />} />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-[1.5rem] bg-slate-900 px-6 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-cyan-600 disabled:opacity-50"
                >
                  <Save size={16} /> {t('btn_update_company_info', 'Şirket Bilgilerini Güncelle')}
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-6">
            <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="rounded-[1.5rem] bg-cyan-500 p-4 shadow-lg shadow-cyan-500/20">
                  <Building2 size={26} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">{t('lbl_document_header', 'Belge Başlığı')}</p>
                  <h3 className="mt-2 text-xl font-black uppercase tracking-tight">{(formData.official_legal_name || formData.name || 'Şirket').toLocaleUpperCase(locale)}</h3>
                </div>
              </div>
              <div className="mt-6 space-y-3 text-sm text-slate-300">
                <p><strong>{t('settings_field_tax_no', 'Vergi No')}:</strong> {formData.tax_number || '-'}</p>
                <p><strong>{t('settings_field_workplace_no', 'SGK / İşyeri Sicil No')}:</strong> {formData.workplace_registration_no || '-'}</p>
                <p><strong>{t('settings_field_active_plan', 'Aktif Paket')}:</strong> {formData.plan_code || 'PRO'}</p>
                <p><strong>{t('settings_field_address', 'Adres')}:</strong> {formData.address || '-'}</p>
              </div>
            </div>

            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lbl_logo_management', 'Logo Yönetimi')}</p>
                  <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-slate-900">{t('lbl_brand_identity', 'Kurumsal Kimlik')}</h3>
                </div>
                <label htmlFor="logo-upload" className="cursor-pointer rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3 text-slate-500 transition-all hover:border-cyan-200 hover:text-cyan-600">
                  <Upload size={18} />
                </label>
                <input id="logo-upload" type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
              </div>

              <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-[2rem] bg-slate-50 p-6">
                {previewUrl || resolvedLogoUrl ? (
                  <img src={previewUrl || resolvedLogoUrl} alt={t('lbl_logo_management', 'Logo Yönetimi')} className="max-h-36 object-contain rounded-xl bg-white p-3 shadow-lg" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <ImageIcon size={44} />
                    <span className="text-[11px] font-black uppercase tracking-[0.22em]">{t('msg_no_logo_yet', 'Henüz logo yok')}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <div className={`flex items-center gap-3 rounded-[1.25rem] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] ${resolvedLogoUrl ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {resolvedLogoUrl ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {resolvedLogoUrl ? t('msg_pdf_header_ready', 'PDF anteti hazır') : t('msg_logo_pending', 'Logo bekleniyor')}
                </div>
                {selectedFile ? (
                  <button
                    type="button"
                    onClick={handleLogoUpload}
                    disabled={saving}
                    className="rounded-[1.25rem] bg-cyan-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {t('btn_upload_logo', 'Logoyu Yükle')}
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === TABS.PERSONAL && (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-[2.5rem] bg-gradient-to-br from-indigo-600 via-indigo-500 to-cyan-500 p-8 text-white shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/70">{t('lbl_personal_settings', 'Kişisel Ayarlar')}</p>
            <h2 className="mt-3 text-2xl font-black uppercase tracking-tight">{t('lbl_account_security', 'Hesap Güvenliği')}</h2>
            <p className="mt-4 text-sm leading-6 text-white/80">
              Bu bölüm sadece oturum sahibinin şifre ve temel güvenlik ayarları içindir. Rapor, rota ve kurumsal ayarlar diğer sekmelerde kalır.
            </p>
            <div className="mt-6 rounded-[1.75rem] bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">{t('lbl_security_tip', 'Öneri')}</p>
              <p className="mt-3 text-sm leading-6 text-white/90">{t('desc_security_tip', 'Yönetici hesabında güçlü bir parola kullanın ve düzenli aralıklarla değiştirin. Mobil MFA akışınız zaten aktif durumdadır.')}</p>
            </div>
          </section>

          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-[1.25rem] bg-indigo-100 p-3 text-indigo-600">
                <Key size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('lbl_password_update', 'Şifre Güncelleme')}</p>
                <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-slate-900">{t('lbl_personal_security_settings', 'Kişisel güvenlik ayarları')}</h3>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <FieldBlock label={t('lbl_current_password', 'Mevcut Şifre')} type="password" value={pwdForm.old_password} onChange={(value) => setPwdForm((prev) => ({ ...prev, old_password: value }))} />
              <FieldBlock label={t('lbl_new_password', 'Yeni Şifre')} type="password" value={pwdForm.new_password} onChange={(value) => setPwdForm((prev) => ({ ...prev, new_password: value }))} />
              <FieldBlock label={t('lbl_confirm_new_password', 'Yeni Şifre Tekrar')} type="password" value={pwdForm.confirm_password} onChange={(value) => setPwdForm((prev) => ({ ...prev, confirm_password: value }))} />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-[1.5rem] bg-indigo-600 px-6 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Shield size={16} /> {t('btn_update_password', 'Şifreyi Güncelle')}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

const ResponsibleCard = ({ title, description, icon, children }) => (
  <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
    <div className="mb-4 flex items-center gap-3">
      <div className="rounded-xl bg-white p-2 shadow-sm">{icon}</div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">{title}</p>
        {description ? (
          <p className="mt-2 text-[12px] leading-5 text-slate-500 normal-case tracking-normal">{description}</p>
        ) : null}
      </div>
    </div>
    {children}
  </div>
);

const FieldBlock = ({ label, value, onChange, icon, type = 'text', upper = false, placeholder = '' }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 flex items-center gap-2">
      {icon || null}
      {label}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={(event) => onChange(upper ? event.target.value?.toLocaleUpperCase() : event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-cyan-300"
    />
  </div>
);

const TextAreaBlock = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 flex items-center gap-2">
      <MapPin size={14} />
      {label}
    </label>
    <textarea
      rows={3}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-cyan-300"
    />
  </div>
);

const EmployeeSelect = ({ value, onChange, groupedEmployees, t, locale }) => (
  <select
    value={value || ''}
    onChange={onChange}
    className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-cyan-300"
  >
    <option value="">-- {t('opt_none_selected', 'KİMSE SEÇİLMEDİ')} --</option>
    {Object.entries(groupedEmployees).map(([dept, emps]) => (
      <optgroup key={dept} label={dept}>
        {emps.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.first_name?.toLocaleUpperCase(locale)} {emp.last_name?.toLocaleUpperCase(locale)} ({emp.display_title})
          </option>
        ))}
      </optgroup>
    ))}
  </select>
);

export default CompanySettings;

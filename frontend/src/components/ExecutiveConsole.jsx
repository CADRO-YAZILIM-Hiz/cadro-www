import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api, { executiveApi, getAbsoluteFileUrl, supportApi } from '../api/axios';
import { Activity, AlertTriangle, Banknote, Building2, ChevronDown, Database, ExternalLink, HardDrive, Layers3, Mail, MonitorCog, Paperclip, Phone, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const formatBytes = (bytes = 0) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = Number(bytes || 0);
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
};

const formatDate = (value, locale) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString(locale);
  } catch (error) {
    return value;
  }
};

const formatCurrencyTRY = (value = 0, locale = 'tr-TR') => {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(value || 0));
  } catch (error) {
    return `${Number(value || 0)} TRY`;
  }
};

const toneClassMap = {
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  critical: 'border-rose-300 bg-rose-50 text-rose-900',
  info: 'border-cyan-300 bg-cyan-50 text-cyan-900',
};

const normalizeText = (value) => String(value || '').toLocaleLowerCase('tr-TR');
const isCancellationRequest = (item) => item?.request_kind === 'SUBSCRIPTION_CANCELLATION' || item?.category === 'Abonelik İptal Talebi';

const summarizeBroadcastStatusByCompany = (broadcast) => {
  const buildGroups = (items = []) => {
    const map = new Map();

    items.forEach((item) => {
      const companyKey = `${item.company_id || 'unknown'}-${item.company_name || 'Şirket bilgisi yok'}`;
      if (!map.has(companyKey)) {
        map.set(companyKey, {
          company_id: item.company_id || null,
          company_name: item.company_name || 'Şirket bilgisi yok',
          users: [],
        });
      }
      map.get(companyKey).users.push(item);
    });

    return Array.from(map.values()).sort((a, b) => a.company_name.localeCompare(b.company_name, 'tr'));
  };

  return {
    readGroups: buildGroups(broadcast.read_receipts || []),
    pendingGroups: buildGroups(broadcast.pending_recipients || []),
  };
};

const getCompanyStateMeta = (company, companyViewMode) => {
  const ownerTag = String(company.owner_tag || '').toUpperCase();
  const subscriptionStatus = String(company.subscription_status || '').toUpperCase();

  if (companyViewMode === 'PASSIVE') {
    if (company.should_call_this_week) {
      return {
        label: 'Öncelikli Takip',
        badgeClass: 'border-rose-200 bg-rose-50 text-rose-900',
        cardClass: 'border-rose-200 bg-rose-50/40',
      };
    }
    if (String(company.recovery_candidate || '').toUpperCase() === 'YUKSEK') {
      return {
        label: 'Geri Kazanım Fırsatı',
        badgeClass: 'border-amber-200 bg-amber-50 text-amber-900',
        cardClass: 'border-amber-200 bg-amber-50/40',
      };
    }
    return {
      label: 'Pasif İzleme',
      badgeClass: 'border-slate-200 bg-white text-slate-800',
      cardClass: 'border-slate-200 bg-slate-50',
    };
  }

  if (ownerTag === 'ODEME_RISKI' || subscriptionStatus === 'PAST_DUE') {
    return {
      label: 'Riskli',
      badgeClass: 'border-rose-200 bg-rose-50 text-rose-900',
      cardClass: 'border-rose-200 bg-rose-50/40',
    };
  }
  if (ownerTag === 'TAKIP_BEKLIYOR' || company.usage_score < 30) {
    return {
      label: 'İzleniyor',
      badgeClass: 'border-amber-200 bg-amber-50 text-amber-900',
      cardClass: 'border-amber-200 bg-amber-50/40',
    };
  }
  if (ownerTag === 'YUKSELTME_ADAYI' || company.suggested_next_plan) {
    return {
      label: 'Büyüme Sinyali',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      cardClass: 'border-emerald-200 bg-emerald-50/40',
    };
  }
  return {
    label: 'Sağlıklı',
    badgeClass: 'border-cyan-200 bg-cyan-50 text-cyan-900',
    cardClass: 'border-cyan-200 bg-cyan-50/30',
  };
};

const ExecutiveConsole = () => {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [companyMetaDrafts, setCompanyMetaDrafts] = useState({});
  const [savingCompanyId, setSavingCompanyId] = useState(null);
  const [openCompanyId, setOpenCompanyId] = useState(null);
  const [companyViewMode, setCompanyViewMode] = useState('ACTIVE');
  const [activeFilterMode, setActiveFilterMode] = useState('ALL');
  const [passiveFilterMode, setPassiveFilterMode] = useState('ALL');
  const [companySearch, setCompanySearch] = useState('');
  const [supportInbox, setSupportInbox] = useState([]);
  const [supportDrafts, setSupportDrafts] = useState({});
  const [ownerBroadcasts, setOwnerBroadcasts] = useState([]);
  const [openBroadcastAuditId, setOpenBroadcastAuditId] = useState(null);
  const [openBroadcastCompanyKeys, setOpenBroadcastCompanyKeys] = useState({});
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSavingId, setSupportSavingId] = useState(null);
  const [broadcastSubmitting, setBroadcastSubmitting] = useState(false);
  const [broadcastFiles, setBroadcastFiles] = useState([]);
  const [broadcastForm, setBroadcastForm] = useState({
    subject: '',
    message: '',
  });

  const currentSection = useMemo(() => {
    if (location.pathname.includes('/revenue')) return 'revenue';
    if (location.pathname.includes('/companies')) return 'companies';
    if (location.pathname.includes('/risks')) return 'risks';
    if (location.pathname.includes('/messages')) return 'messages';
    return 'overview';
  }, [location.pathname]);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const response = await api.get('/executive/overview');
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || t('msg_executive_fetch_failed', 'Yönetmen koltuğu verileri alınamadı.'));
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  useEffect(() => {
    const fetchSupportInbox = async () => {
      if (currentSection !== 'messages') return;
      try {
        setSupportLoading(true);
        const [inboxResponse, broadcastResponse] = await Promise.all([
          supportApi.getInbox(),
          supportApi.getOwnerBroadcasts(),
        ]);
        const items = (Array.isArray(inboxResponse.data) ? inboxResponse.data : []).sort((left, right) => {
          const leftPriority = isCancellationRequest(left) ? 1 : 0;
          const rightPriority = isCancellationRequest(right) ? 1 : 0;
          if (leftPriority !== rightPriority) return rightPriority - leftPriority;
          return new Date(right.updated_at || right.created_at || 0) - new Date(left.updated_at || left.created_at || 0);
        });
        setSupportInbox(items);
        setOwnerBroadcasts(Array.isArray(broadcastResponse.data) ? broadcastResponse.data : []);
        setSupportDrafts(
          items.reduce((accumulator, item) => {
            accumulator[item.id] = {
              status: item.status,
              owner_note: item.owner_note || '',
            };
            return accumulator;
          }, {})
        );
      } catch (err) {
        setSupportInbox([]);
        setOwnerBroadcasts([]);
        setSupportDrafts({});
      } finally {
        setSupportLoading(false);
      }
    };
    fetchSupportInbox();
  }, [currentSection]);

  useEffect(() => {
    const navigationIntent = location.state?.executiveFilter;
    if (!navigationIntent) return;

    if (navigationIntent.companyViewMode) {
      setCompanyViewMode(navigationIntent.companyViewMode);
    }
    if (navigationIntent.passiveFilterMode) {
      setPassiveFilterMode(navigationIntent.passiveFilterMode);
    }
    if (navigationIntent.activeFilterMode) {
      setActiveFilterMode(navigationIntent.activeFilterMode);
    }
    if (typeof navigationIntent.companySearch === 'string') {
      setCompanySearch(navigationIntent.companySearch);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const summaryCards = useMemo(() => {
    if (!data?.summary) return [];
    return [
      { label: 'Şirket', value: data.summary.total_companies, icon: <Building2 size={18} /> },
      { label: 'Toplam Kişi', value: data.summary.total_employees, icon: <Users size={18} /> },
      { label: 'Aktif Kişi', value: data.summary.active_employees, icon: <Layers3 size={18} /> },
      { label: 'Kurulum', value: `${data.summary.basic_companies}/${data.summary.pro_companies}/${data.summary.enterprise_companies}`, icon: <MonitorCog size={18} /> },
      { label: 'Tahmini Aylık Gelir', value: formatCurrencyTRY(data.summary.estimated_monthly_revenue_try, locale), icon: <Banknote size={18} /> },
      { label: 'Yükseltme Adayı', value: data.summary.upgrade_candidate_count, icon: <TrendingUp size={18} /> },
      { label: '30 Gün Gelir Yönü', value: `${data.summary.mrr_change_percent_30d > 0 ? '+' : ''}${data.summary.mrr_change_percent_30d}%`, icon: <Activity size={18} /> },
      { label: 'Ödeme Riski', value: data.summary.payment_risk_count, icon: <AlertTriangle size={18} /> },
      { label: 'Düşüş Riski', value: data.summary.downgrade_risk_count, icon: <ShieldAlert size={18} /> },
    ];
  }, [data, locale]);

  const maxTrendRequests = useMemo(
    () => Math.max(1, ...(data?.traffic?.customer_trend_7d || []).map((item) => item.request_count || 0)),
    [data]
  );

  useEffect(() => {
    if (!location.hash) return;
    const sectionId = location.hash.replace('#', '');
    const target = document.getElementById(sectionId);
    if (target) {
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash, currentSection]);

  const heroContent = {
    overview: {
      eyebrow: 'Genel Görünüm',
      title: 'Platformun genel nabzını izle',
      description: 'Şirket, kişi, gelir yönü ve kritik sinyalleri tek bakışta gör. Bu alan hızlı karar almak için sade tutuldu.',
    },
    revenue: {
      eyebrow: 'Gelir & Paketler',
      title: 'Gelir ve paket hareketini oku',
      description: 'Tahmini aylık gelir, plan dağılımı, büyüme yönü ve yükseltme fırsatlarını buradan takip et.',
    },
    companies: {
      eyebrow: 'Şirketler',
      title: 'Müşteri portföyünü tek tabloda yönet',
      description: 'Hangi şirket hangi pakette, kaç kişilik kullanıyor, ne kadar gelir üretiyor ve hangi plan adayı görünüyor buradan izle.',
    },
    risks: {
      eyebrow: 'Riskler & Uyarılar',
      title: 'Ödeme ve operasyon risklerini takip et',
      description: 'Ödeme riski, düşüş sinyalleri, kritik hata akışı ve harici altyapı uyarıları bu ekranda toplanır.',
    },
    messages: {
      eyebrow: 'Mesajlar',
      title: 'Müşteri mesajlarını tek yerden yönet',
      description: 'Admin ve superadmin tarafından açılan destek kayıtları burada toplanır. Durumu güncelle, not düş ve takip akışını yönet.',
    },
  }[currentSection];

  const topSummaryCards = summaryCards.slice(0, 6);
  const revenueSummaryCards = summaryCards.filter((card) =>
    ['Tahmini Aylık Gelir', 'Yükseltme Adayı', '30 Gün Gelir Yönü', 'Ödeme Riski', 'Düşüş Riski'].includes(card.label)
  );
  const priorityActionItems = useMemo(() => {
    if (!data) return [];
    return [
      {
        key: 'follow-up-passive',
        label: 'Bugün Öncelikli Arama',
        value: data?.summary?.passive_call_count || 0,
        description: 'Bu hafta aranması gereken pasif şirketler.',
        tone: (data?.summary?.passive_call_count || 0) > 0 ? 'critical' : 'info',
        action: () => navigate('/executive-console/companies', {
          state: {
            executiveFilter: {
              companyViewMode: 'PASSIVE',
              passiveFilterMode: 'CALL_THIS_WEEK',
            },
          },
        }),
      },
      {
        key: 'payment-risk',
        label: 'Ödeme Riski',
        value: data?.summary?.payment_risk_count || 0,
        description: 'Abonelik veya tahsilat riski taşıyan şirketler.',
        tone: (data?.summary?.payment_risk_count || 0) > 0 ? 'critical' : 'info',
        action: () => navigate('/executive-console/risks#payment-risk'),
      },
      {
        key: 'upgrade',
        label: 'Yükseltme Fırsatı',
        value: data?.summary?.upgrade_candidate_count || 0,
        description: 'Paket yükseltme konuşulabilecek şirketler.',
        tone: (data?.summary?.upgrade_candidate_count || 0) > 0 ? 'warning' : 'info',
        action: () => navigate('/executive-console/revenue#upgrade-candidates'),
      },
      {
        key: 'system-alerts',
        label: 'Açık Sistem Uyarısı',
        value: (data?.alerts || []).length,
        description: 'Hosting, disk veya kritik operasyon uyarıları.',
        tone: (data?.alerts || []).length > 0 ? 'warning' : 'info',
        action: () => navigate('/executive-console/risks#system-alerts'),
      },
    ];
  }, [data, navigate]);

  const openCompanyView = (options = {}) => {
    navigate('/executive-console/companies', {
      state: {
        executiveFilter: options,
      },
    });
  };

  const handleRevenueCardClick = (label) => {
    if (label === 'Yükseltme Adayı') {
      navigate('/executive-console/revenue#upgrade-candidates');
      return;
    }
    if (label === 'Ödeme Riski') {
      navigate('/executive-console/risks#payment-risk');
      return;
    }
    if (label === 'Düşüş Riski') {
      navigate('/executive-console/risks#downgrade-risk');
      return;
    }
    navigate('/executive-console/revenue');
  };
  const activeCompanies = useMemo(
    () =>
      (data?.companies || []).filter(
        (company) => company.is_active && !['CANCELED', 'PAST_DUE'].includes(String(company.subscription_status || '').toUpperCase())
      ),
    [data?.companies]
  );
  const passiveCompanies = useMemo(
    () =>
      (data?.companies || []).filter(
        (company) => !company.is_active || ['CANCELED', 'PAST_DUE'].includes(String(company.subscription_status || '').toUpperCase())
      ),
    [data?.companies]
  );
  const visibleCompanies = useMemo(() => {
    const baseCompanies = companyViewMode === 'PASSIVE' ? passiveCompanies : activeCompanies;
    let filteredCompanies = baseCompanies;

    if (companyViewMode !== 'PASSIVE') {
      if (activeFilterMode === 'FOLLOW_UP') {
        filteredCompanies = filteredCompanies.filter((company) => {
          const ownerTag = String(company.owner_tag || '').toUpperCase();
          return ownerTag === 'TAKIP_BEKLIYOR' || ownerTag === 'ODEME_RISKI' || company.usage_score < 30;
        });
      } else if (activeFilterMode === 'UPSELL') {
        filteredCompanies = filteredCompanies.filter((company) => Boolean(company.suggested_next_plan || String(company.owner_tag || '').toUpperCase() === 'YUKSELTME_ADAYI'));
      }
    } else if (passiveFilterMode === 'CALL_THIS_WEEK') {
      filteredCompanies = filteredCompanies.filter((company) => company.should_call_this_week);
    } else if (passiveFilterMode === 'RECOVERY_HIGH') {
      filteredCompanies = filteredCompanies.filter((company) => String(company.recovery_candidate || '').toUpperCase() === 'YUKSEK');
    }

    const query = normalizeText(companySearch).trim();
    if (!query) {
      return filteredCompanies;
    }

    return filteredCompanies.filter((company) => {
      const haystack = [
        company.name,
        company.official_legal_name,
        company.contact_email,
        company.contact_phone,
        company.primary_contact?.name,
        company.primary_contact?.role,
        company.plan_code,
        company.subscription_status,
        company.owner_tag,
        company.suggested_next_plan,
      ]
        .map(normalizeText)
        .join(' ');
      return haystack.includes(query);
    });
  }, [companyViewMode, activeFilterMode, passiveFilterMode, activeCompanies, passiveCompanies, companySearch]);

  useEffect(() => {
    if (!data?.companies?.length) return;
    const nextDrafts = {};
    data.companies.forEach((company) => {
      nextDrafts[company.id] = {
        owner_note: company.owner_note || '',
        owner_tag: company.owner_tag || '',
        last_contact_at: company.last_contact_at ? String(company.last_contact_at).slice(0, 10) : '',
        next_follow_up_at: company.next_follow_up_at ? String(company.next_follow_up_at).slice(0, 10) : '',
        last_contact_result: company.last_contact_result || '',
      };
    });
    setCompanyMetaDrafts(nextDrafts);
    setOpenCompanyId((prev) => prev || data.companies[0]?.id || null);
  }, [data?.companies]);

  useEffect(() => {
    const source = companyViewMode === 'PASSIVE' ? passiveCompanies : activeCompanies;
    setOpenCompanyId((prev) => {
      if (!source.length) return null;
      if (prev && source.some((company) => company.id === prev)) {
        return prev;
      }
      return source[0].id;
    });
  }, [companyViewMode, activeCompanies, passiveCompanies]);

  useEffect(() => {
    if (!visibleCompanies.length) {
      setOpenCompanyId(null);
      return;
    }

    const query = normalizeText(companySearch).trim();
    if (query) {
      const matchedCompany = visibleCompanies.find((company) => {
        const searchableText = [
          company.name,
          company.official_legal_name,
          company.contact_email,
          company.contact_phone,
          company.primary_contact?.name,
          company.primary_contact?.role,
          company.plan_code,
          company.subscription_status,
          company.owner_tag,
          company.suggested_next_plan,
        ]
          .map(normalizeText)
          .join(' ');
        return searchableText.includes(query);
      });

      if (matchedCompany) {
        setOpenCompanyId(matchedCompany.id);
        return;
      }
    }

    setOpenCompanyId((prev) => {
      if (prev && visibleCompanies.some((company) => company.id === prev)) {
        return prev;
      }
      return visibleCompanies[0].id;
    });
  }, [visibleCompanies, companySearch]);

  const updateCompanyDraft = (companyId, field, value) => {
    setCompanyMetaDrafts((prev) => ({
      ...prev,
      [companyId]: {
        ...(prev[companyId] || {}),
        [field]: value,
      },
    }));
  };

  const saveCompanyMeta = async (companyId) => {
    const draft = companyMetaDrafts[companyId];
    if (!draft) return;
    try {
      setSavingCompanyId(companyId);
      const response = await executiveApi.updateCompanyMeta(companyId, draft);
      setData((prev) => ({
        ...prev,
        companies: (prev?.companies || []).map((company) =>
          company.id === companyId
            ? {
                ...company,
                owner_note: response.data.owner_note || '',
                owner_tag: response.data.owner_tag || '',
                last_contact_at: response.data.last_contact_at || null,
                next_follow_up_at: response.data.next_follow_up_at || null,
                last_contact_result: response.data.last_contact_result || '',
              }
            : company
        ),
      }));
    } catch (saveError) {
      window.alert(saveError.response?.data?.detail || 'Şirket notu kaydedilemedi.');
    } finally {
      setSavingCompanyId(null);
    }
  };

  const updateSupportStatus = async (messageId, status, ownerNote) => {
    try {
      setSupportSavingId(messageId);
      const response = await supportApi.updateStatus(messageId, { status, owner_note: ownerNote || '' });
      setSupportInbox((prev) => prev.map((item) => (item.id === messageId ? response.data : item)));
      setSupportDrafts((prev) => ({
        ...prev,
        [messageId]: {
          status: response.data.status,
          owner_note: response.data.owner_note || '',
        },
      }));
      toast.success(t('msg_support_status_saved', 'Destek durumu kaydedildi.'));
    } catch (saveError) {
      window.alert(saveError.response?.data?.detail || t('msg_support_status_save_failed', 'Destek kaydı güncellenemedi.'));
    } finally {
      setSupportSavingId(null);
    }
  };

  const handleBroadcastSubmit = async (event) => {
    event.preventDefault();
    if (!broadcastForm.subject.trim() || !broadcastForm.message.trim()) {
      toast.error(t('msg_support_subject_message_required', 'Konu ve mesaj alanlarını doldurun.'));
      return;
    }

    const formData = new FormData();
    formData.append('subject', broadcastForm.subject.trim());
    formData.append('message', broadcastForm.message.trim());
    broadcastFiles.forEach((file) => formData.append('files', file));

    try {
      setBroadcastSubmitting(true);
      const response = await supportApi.createBroadcast(formData);
      setOwnerBroadcasts((prev) => [response.data.item, ...prev]);
      setBroadcastForm({ subject: '', message: '' });
      setBroadcastFiles([]);
      toast.success(t('msg_support_broadcast_sent', 'Duyuru yayınlandı.'));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('msg_support_broadcast_failed', 'Duyuru yayınlanamadı.'));
    } finally {
      setBroadcastSubmitting(false);
    }
  };

  const toggleBroadcastCompanyKey = (key) => {
    setOpenBroadcastCompanyKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-lg font-black uppercase tracking-[0.22em] text-slate-700">Yönetmen koltuğu yükleniyor...</div>;
  }

  if (error) {
    return <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-10 text-sm font-bold text-rose-700">{error}</div>;
  }

  return (
    <div className="space-y-8" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? 'top-left' : 'top-right'} />
      <section className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">{heroContent.eyebrow}</p>
        <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">{heroContent.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              {heroContent.description}
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-white/10 px-5 py-4 text-sm font-bold text-white/90">
            Dış hosting veya cloud uyarıları için aynı panel <code className="rounded bg-white/10 px-2 py-1 text-[11px]">backend/ops_alerts.json</code> beslemesini de okur.
          </div>
        </div>
      </section>

      {currentSection === 'overview' ? (
        <>
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Bugün Öncelikli Aksiyonlar</p>
                <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Günün odağı</h2>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-slate-700">
                Bu alan toast yerine öne çıkan işleri tek satırda gösterir. Önce buraya bakıp ardından ilgili menüye geçebilirsin.
              </p>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
              {priorityActionItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.action}
                  className={`rounded-[1.5rem] border px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${toneClassMap[item.tone] || toneClassMap.info}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em]">{item.label}</p>
                      <p className="mt-2 text-sm leading-6">{item.description}</p>
                    </div>
                    <div className="text-3xl font-black tracking-tight">{item.value}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topSummaryCards.map((card) => (
              <div key={card.label} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">{card.label}</p>
                  <div className="rounded-xl bg-slate-100 p-2 text-slate-700">{card.icon}</div>
                </div>
                <div className="mt-4 text-3xl font-black tracking-tight text-slate-900">{card.value}</div>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Gelir Sinyali</p>
              <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Kısa finans özeti</h2>
              <div className="mt-5 space-y-4 text-sm">
                <MetricRow label="Tahmini aylık gelir" value={formatCurrencyTRY(data?.summary?.estimated_monthly_revenue_try, locale)} strong />
                <MetricRow label="30 gün gelir yönü" value={`${data?.summary?.mrr_change_percent_30d > 0 ? '+' : ''}${data?.summary?.mrr_change_percent_30d || 0}%`} />
                <MetricRow label="Yükseltme adayı" value={data?.summary?.upgrade_candidate_count || 0} />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Ana Riskler</p>
              <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Takip gerektiren sinyaller</h2>
              <div className="mt-5 space-y-4 text-sm">
                <MetricRow label="Ödeme riski" value={data?.summary?.payment_risk_count || 0} />
                <MetricRow label="Düşüş riski" value={data?.summary?.downgrade_risk_count || 0} />
                <MetricRow label="Açık sistem uyarısı" value={(data?.alerts || []).length} />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Platform Sağlığı</p>
              <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Kaynak ve trafik</h2>
              <div className="mt-5 space-y-4 text-sm">
                <MetricRow label="Uygulama toplamı" value={formatBytes(data?.platform_usage?.app_storage_bytes)} />
                <MetricRow label="24 saat istek" value={data?.traffic?.request_count_24h || 0} />
                <MetricRow label="24 saat aktif şirket" value={data?.traffic?.active_companies_24h || 0} />
              </div>
            </div>
          </section>
        </>
      ) : null}

      {currentSection === 'revenue' ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {revenueSummaryCards.map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={() => handleRevenueCardClick(card.label)}
                className="rounded-[2rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">{card.label}</p>
                  <div className="rounded-xl bg-slate-100 p-2 text-slate-700">{card.icon}</div>
                </div>
                <div className="mt-4 text-3xl font-black tracking-tight text-slate-900">{card.value}</div>
              </button>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <div id="upgrade-candidates" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Gelir Görünümü</p>
                    <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Paket bazlı tahmin</h2>
                  </div>
                  <Banknote size={20} className="text-slate-700" />
                </div>
                <div className="mt-5 space-y-4 text-sm">
                  <MetricRow label="Basic aylık tahmin" value={formatCurrencyTRY(data?.summary?.basic_mrr_try, locale)} />
                  <MetricRow label="Pro aylık tahmin" value={formatCurrencyTRY(data?.summary?.pro_mrr_try, locale)} />
                  <MetricRow label="Enterprise aylık tahmin" value={formatCurrencyTRY(data?.summary?.enterprise_mrr_try, locale)} />
                  <MetricRow label="Toplam aylık tahmin" value={formatCurrencyTRY(data?.summary?.estimated_monthly_revenue_try, locale)} strong />
                  <MetricRow label="30 gün gelir yönü" value={`${data?.summary?.mrr_change_percent_30d > 0 ? '+' : ''}${data?.summary?.mrr_change_percent_30d || 0}%`} />
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Yükseltme Fırsatları</p>
                    <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Paket büyütme adayı şirketler</h2>
                  </div>
                  <div className="rounded-[1.2rem] bg-emerald-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900">
                    {data?.upgrade_candidates?.length || 0} aday
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {(data?.upgrade_candidates || []).length ? (
                    data.upgrade_candidates.map((candidate) => (
                      <button
                        key={candidate.company_id}
                        type="button"
                        onClick={() => openCompanyView({
                          companyViewMode: 'ACTIVE',
                          activeFilterMode: 'UPSELL',
                          companySearch: candidate.company_name,
                        })}
                        className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">{candidate.company_name}</h3>
                            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
                              {candidate.current_plan} → {candidate.suggested_plan}
                            </p>
                          </div>
                          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-900">
                            {formatCurrencyTRY(candidate.estimated_mrr_try, locale)}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-700">
                          <span>Aktif kişi: <strong className="text-slate-900">{candidate.active_employee_count}</strong></span>
                          <span>30 gün istek: <strong className="text-slate-900">{candidate.request_count_30d}</strong></span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-700">{candidate.reason}</p>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-900">
                      Şu anda belirgin yükseltme adayı görünmüyor.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Son 7 Gün</p>
                  <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Müşteri ve trafik eğilimi</h2>
                </div>
                <TrendingUp size={20} className="text-slate-700" />
              </div>
              <div className="mt-5 space-y-3">
                {(data?.traffic?.customer_trend_7d || []).map((item) => (
                  <div key={item.date} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-black uppercase tracking-tight text-slate-900">{formatDate(item.date, locale)}</div>
                      <div className="text-xs font-bold text-slate-700">{item.request_count} istek</div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.max(6, Math.round(((item.request_count || 0) / maxTrendRequests) * 100))}%` }} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-700">
                      <span>Şirket: <strong className="text-slate-900">{item.active_companies}</strong></span>
                      <span>Kullanıcı: <strong className="text-slate-900">{item.active_users}</strong></span>
                      <span>İstek: <strong className="text-slate-900">{item.request_count}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}

      {currentSection === 'messages' ? (
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Yayın Duyurusu</p>
                <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Admin ve superadminlere mesaj gönder</h2>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-slate-700">
                Bu alandan tüm admin ve superadmin kullanıcılarına sistem güncellemesi, uyarı ya da bilgilendirme mesajı yayınlayabilirsin.
              </p>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="mt-6 space-y-5">
              <div className="grid gap-4 xl:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">Konu</span>
                  <input
                    value={broadcastForm.subject}
                    onChange={(event) => setBroadcastForm((prev) => ({ ...prev, subject: event.target.value }))}
                    placeholder="Kısa ve net bir başlık yaz"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">Ek Dosya / Görsel</span>
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                    <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-slate-700">
                      <Paperclip size={16} />
                      <span>Dosya Seç</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) => setBroadcastFiles(Array.from(event.target.files || []))}
                      />
                    </label>
                    {broadcastFiles.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {broadcastFiles.map((file) => (
                          <div key={`${file.name}-${file.size}`} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700">
                            {file.name}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">Mesaj</span>
                <textarea
                  rows={5}
                  value={broadcastForm.message}
                  onChange={(event) => setBroadcastForm((prev) => ({ ...prev, message: event.target.value }))}
                  placeholder="Kısa ya da uzun duyuru metnini buraya yaz"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                />
              </label>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={broadcastSubmitting}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {broadcastSubmitting ? 'Yayınlanıyor...' : 'Duyuruyu Yayınla'}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Yayın Geçmişi</p>
                <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Gönderilen duyurular</h2>
              </div>
              <div className="rounded-[1.2rem] bg-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
                {ownerBroadcasts.length} duyuru
              </div>
            </div>
            {ownerBroadcasts.length === 0 ? (
              <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                Henüz yayınlanan duyuru yok.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {ownerBroadcasts.map((item) => (
                  <div key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    {(() => {
                      const { readGroups, pendingGroups } = summarizeBroadcastStatusByCompany(item);
                      return (
                        <>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight text-slate-900">{item.subject}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                          Admin ve Superadmin kitlesine yayınlandı
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-900">
                          Yayında
                        </span>
                        <button
                          type="button"
                          onClick={() => setOpenBroadcastAuditId((prev) => (prev === item.id ? null : item.id))}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-900 transition hover:bg-slate-100"
                        >
                          Durum
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                      <span>{formatDate(item.created_at, locale)}</span>
                      {item.attachments?.length ? <span>{item.attachments.length} ek dosya</span> : null}
                    </div>
                    {item.attachments?.length ? (
                      <div className="mt-3 space-y-2">
                        {item.attachments.map((attachment) => (
                          <a
                            key={`${item.id}-${attachment.url}`}
                            href={getAbsoluteFileUrl(attachment.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                          >
                            {attachment.filename}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {openBroadcastAuditId === item.id ? (
                      <div className="mt-5 grid gap-4 xl:grid-cols-2">
                        <div className="rounded-[1.25rem] border border-emerald-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800">Okundu</p>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-900">
                              {item.read_count || 0}
                            </span>
                          </div>
                          {readGroups.length ? (
                            <div className="mt-3 space-y-3">
                              {readGroups.map((group) => (
                                <div key={`${item.id}-read-group-${group.company_name}`} className="rounded-xl bg-emerald-50 px-3 py-3 text-sm text-slate-700">
                                  <button
                                    type="button"
                                    onClick={() => toggleBroadcastCompanyKey(`${item.id}-read-${group.company_name}`)}
                                    className="flex w-full items-center justify-between gap-3 text-left"
                                  >
                                    <p className="font-black text-slate-900">{group.company_name}</p>
                                    <span className="text-xs font-black text-emerald-900">{group.users.length} kişi</span>
                                  </button>
                                  {openBroadcastCompanyKeys[`${item.id}-read-${group.company_name}`] ? (
                                    <div className="mt-2 space-y-2">
                                      {group.users.map((receipt) => (
                                        <div key={`${item.id}-read-${receipt.user_id}`} className="rounded-lg bg-white/70 px-3 py-2">
                                          <p className="text-xs font-black text-slate-900">{receipt.employee_name || `Kullanıcı #${receipt.user_id}`}</p>
                                          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-900">{receipt.role}</p>
                                          <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                            {receipt.read_at ? new Date(receipt.read_at).toLocaleString(locale) : 'Okundu zamanı yok'}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50 px-3 py-4 text-sm font-bold text-emerald-900">
                              Henüz okundu bilgisi yok.
                            </div>
                          )}
                        </div>

                        <div className="rounded-[1.25rem] border border-amber-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-800">Bekliyor</p>
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-900">
                              {item.pending_count || 0}
                            </span>
                          </div>
                          {pendingGroups.length ? (
                            <div className="mt-3 space-y-3">
                              {pendingGroups.map((group) => (
                                <div key={`${item.id}-pending-group-${group.company_name}`} className="rounded-xl bg-amber-50 px-3 py-3 text-sm text-slate-700">
                                  <button
                                    type="button"
                                    onClick={() => toggleBroadcastCompanyKey(`${item.id}-pending-${group.company_name}`)}
                                    className="flex w-full items-center justify-between gap-3 text-left"
                                  >
                                    <p className="font-black text-slate-900">{group.company_name}</p>
                                    <span className="text-xs font-black text-amber-900">{group.users.length} kişi</span>
                                  </button>
                                  {openBroadcastCompanyKeys[`${item.id}-pending-${group.company_name}`] ? (
                                    <div className="mt-2 space-y-2">
                                      {group.users.map((recipient) => (
                                        <div key={`${item.id}-pending-${recipient.user_id}`} className="rounded-lg bg-white/70 px-3 py-2">
                                          <p className="text-xs font-black text-slate-900">{recipient.employee_name || `Kullanıcı #${recipient.user_id}`}</p>
                                          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-900">{recipient.role}</p>
                                          <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                            {recipient.email || 'E-posta bilgisi yok'}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3 rounded-xl border border-dashed border-amber-200 bg-amber-50 px-3 py-4 text-sm font-bold text-amber-900">
                              Bekleyen şirket kalmadı.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Gelen Kutusu</p>
                <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Müşteri mesajları</h2>
              </div>
              <div className="rounded-[1.2rem] bg-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
                {supportInbox.length} kayıt
              </div>
            </div>
            {supportLoading ? (
              <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 text-sm font-bold text-slate-600">
                {t('msg_support_messages_loading', 'Mesajlar yükleniyor...')}
              </div>
            ) : supportInbox.length === 0 ? (
              <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                {t('msg_support_inbox_empty', 'Henüz gelen mesaj yok.')}
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {supportInbox.map((item) => {
                  const draft = supportDrafts[item.id] || {
                    status: item.status,
                    owner_note: item.owner_note || '',
                  };
                  const statusClassMap = {
                    PENDING: 'border-amber-200 bg-amber-50 text-amber-900',
                    IN_PROGRESS: 'border-cyan-200 bg-cyan-50 text-cyan-900',
                    RESOLVED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
                  };
                  const statusLabelMap = {
                    PENDING: t('support_status_pending', 'Beklemede'),
                    IN_PROGRESS: t('support_status_in_progress', 'İşleme Alındı'),
                    RESOLVED: t('support_status_resolved', 'Sonuçlandı'),
                  };
                  return (
                    <div key={item.id} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-black uppercase tracking-tight text-slate-900">{item.subject}</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                            {item.company_name} • {item.requester_name} • {item.requester_role}
                          </p>
                          {isCancellationRequest(item) ? (
                            <div className="mt-2 inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-800">
                              {t('msg_support_cancellation_owner_queue', 'Paddle öncesi CADRO ekibi onayı bekleyen iptal talebi')}
                            </div>
                          ) : null}
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusClassMap[item.status] || statusClassMap.PENDING}`}>
                          {statusLabelMap[item.status] || item.status}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Mesaj</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p>
                          </div>
                          <div className="text-xs font-bold text-slate-500">
                            {formatDate(item.created_at, locale)} • {item.category}
                          </div>
                          {item.attachments?.length ? (
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Ekler</p>
                              <div className="mt-2 space-y-2">
                                {item.attachments.map((attachment) => (
                                  <a
                                    key={`${item.id}-${attachment.url}`}
                                    href={getAbsoluteFileUrl(attachment.url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                                  >
                                    {attachment.filename}
                                  </a>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Durum Yönetimi</p>
                            <select
                              value={draft.status}
                              onChange={(event) =>
                                setSupportDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    status: event.target.value,
                                    owner_note: prev[item.id]?.owner_note ?? item.owner_note ?? '',
                                  },
                                }))
                              }
                              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                              disabled={supportSavingId === item.id}
                            >
                              <option value="PENDING">{t('support_status_pending', 'Beklemede')}</option>
                              <option value="IN_PROGRESS">{t('support_status_in_progress', 'İşleme Alındı')}</option>
                              <option value="RESOLVED">{t('support_status_resolved', 'Sonuçlandı')}</option>
                            </select>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{t('lbl_owner_update', 'CADRO Ekibi Güncellemesi')}</p>
                            <textarea
                              rows={5}
                              value={draft.owner_note || ''}
                              onChange={(event) =>
                                setSupportDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    status: prev[item.id]?.status ?? item.status,
                                    owner_note: event.target.value,
                                  },
                                }))
                              }
                              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                              placeholder={isCancellationRequest(item)
                                ? t('ph_support_cancellation_owner_note', 'Görüşme notu, ikna durumu veya Paddle öncesi karar notu')
                                : t('ph_support_owner_note', 'Müşteriye görünecek kısa durum notu')}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => updateSupportStatus(item.id, draft.status, draft.owner_note)}
                            disabled={supportSavingId === item.id}
                            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {supportSavingId === item.id ? t('msg_saving', 'Kaydediliyor...') : t('btn_save_status', 'Durumu Kaydet')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {currentSection === 'companies' ? (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Şirket ve Abonelikler</p>
                <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Şirket kartları</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCompanyViewMode('ACTIVE');
                    setActiveFilterMode('ALL');
                    setPassiveFilterMode('ALL');
                  }}
                  className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                    companyViewMode === 'ACTIVE'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Aktif Şirketler {activeCompanies.length}
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyViewMode('PASSIVE')}
                  className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                    companyViewMode === 'PASSIVE'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Pasif Şirketler {passiveCompanies.length}
                </button>
              </div>
            </div>

            {companyViewMode === 'PASSIVE' ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPassiveFilterMode('ALL')}
                  className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                    passiveFilterMode === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Tüm Pasifler {passiveCompanies.length}
                </button>
                <button
                  type="button"
                  onClick={() => setPassiveFilterMode('CALL_THIS_WEEK')}
                  className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                    passiveFilterMode === 'CALL_THIS_WEEK'
                      ? 'bg-amber-900 text-white'
                      : 'border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  Bu Hafta Aranacaklar {passiveCompanies.filter((company) => company.should_call_this_week).length}
                </button>
                <button
                  type="button"
                  onClick={() => setPassiveFilterMode('RECOVERY_HIGH')}
                  className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                    passiveFilterMode === 'RECOVERY_HIGH'
                      ? 'bg-rose-900 text-white'
                      : 'border border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100'
                  }`}
                >
                  Yüksek Geri Kazanım {passiveCompanies.filter((company) => String(company.recovery_candidate || '').toUpperCase() === 'YUKSEK').length}
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFilterMode('ALL')}
                  className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                    activeFilterMode === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Tüm Aktifler {activeCompanies.length}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilterMode('FOLLOW_UP')}
                  className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                    activeFilterMode === 'FOLLOW_UP'
                      ? 'bg-amber-900 text-white'
                      : 'border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  Takip Gerekenler {activeCompanies.filter((company) => {
                    const ownerTag = String(company.owner_tag || '').toUpperCase();
                    return ownerTag === 'TAKIP_BEKLIYOR' || ownerTag === 'ODEME_RISKI' || company.usage_score < 30;
                  }).length}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilterMode('UPSELL')}
                  className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                    activeFilterMode === 'UPSELL'
                      ? 'bg-emerald-900 text-white'
                      : 'border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                  }`}
                >
                  Yükseltme Adayları {activeCompanies.filter((company) => Boolean(company.suggested_next_plan || String(company.owner_tag || '').toUpperCase() === 'YUKSELTME_ADAYI')).length}
                </button>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                Şirket Ara
                <input
                  type="text"
                  value={companySearch}
                  onChange={(event) => setCompanySearch(event.target.value)}
                  placeholder={companyViewMode === 'PASSIVE' ? 'Şirket, temsilci, e-posta veya plan ara' : 'Şirket, temsilci, e-posta, etiket veya plan ara'}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-400"
                />
              </label>
            </div>

            <div className="mt-6 space-y-4">
              {visibleCompanies.map((company) => {
                const isOpen = openCompanyId === company.id;
                const draft = companyMetaDrafts[company.id] || {};
                const stateMeta = getCompanyStateMeta(company, companyViewMode);
                return (
                  <div key={company.id} className={`rounded-[1.8rem] border shadow-sm ${stateMeta.cardClass}`}>
                    <button
                      type="button"
                      onClick={() => setOpenCompanyId((prev) => (prev === company.id ? null : company.id))}
                      className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black uppercase tracking-tight text-slate-900">{company.name}</h3>
                          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-900">
                            {company.plan_code}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
                            {company.subscription_status}
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${stateMeta.badgeClass}`}>
                            {stateMeta.label}
                          </span>
                          {companyViewMode === 'PASSIVE' && company.recovery_candidate ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-900">
                              Geri Kazanım: {company.recovery_candidate.replaceAll('_', ' ')}
                            </span>
                          ) : null}
                          {company.owner_tag || company.suggested_next_plan ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-900">
                              {(company.owner_tag || company.suggested_next_plan || '').replaceAll('_', ' ')}
                            </span>
                          ) : null}
                          {companyViewMode === 'PASSIVE' && company.should_call_this_week ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-900">
                              Bu Hafta Ara
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 truncate text-sm text-slate-700">{company.official_legal_name || company.email || '-'}</p>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-700 xl:grid-cols-5">
                          <span>Gelir: <strong className="text-slate-900">{formatCurrencyTRY(company.estimated_mrr_try, locale)}</strong></span>
                          <span>Kişi: <strong className="text-slate-900">{company.employee_count}</strong></span>
                          <span>Aktif: <strong className="text-slate-900">{company.active_employee_count}</strong></span>
                          <span>Kullanım: <strong className="text-slate-900">{company.usage_score}/100</strong></span>
                          <span>Yükseltme: <strong className="text-slate-900">{(company.upsell_probability || '-').replaceAll('_', ' ')}</strong></span>
                        </div>
                      </div>

                      <ChevronDown size={18} className={`mt-1 shrink-0 text-slate-700 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen ? (
                      <div className="border-t border-slate-200 bg-white px-5 py-5">
                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                          <div className="space-y-5">
                            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">İrtibat</p>
                              <div className="mt-3 space-y-2 text-sm text-slate-700">
                                <div><strong className="text-slate-900">{company.primary_contact?.name || 'Temsilci atanmadı'}</strong></div>
                                <div>{company.primary_contact?.role || 'Genel irtibat'}</div>
                                <div className="flex items-center gap-2">
                                  <Mail size={14} className="text-slate-600" />
                                  {company.contact_email ? <a href={`mailto:${company.contact_email}`} className="hover:text-cyan-700 hover:underline">{company.contact_email}</a> : <span>-</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone size={14} className="text-slate-600" />
                                  {company.contact_phone ? <a href={`tel:${company.contact_phone}`} className="hover:text-cyan-700 hover:underline">{company.contact_phone}</a> : <span>-</span>}
                                </div>
                                <div className="flex flex-wrap gap-3 pt-2">
                                  {company.mailto_url ? (
                                    <a
                                      href={companyViewMode === 'PASSIVE' && company.recovery_mailto_url ? company.recovery_mailto_url : company.mailto_url}
                                      className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-900 transition hover:bg-cyan-100"
                                    >
                                      <Mail size={14} />
                                      {companyViewMode === 'PASSIVE' ? 'Geri Kazanım Maili' : 'Mail Gönder'}
                                    </a>
                                  ) : null}
                                  {company.contact_phone ? (
                                    <a
                                      href={`tel:${company.contact_phone}`}
                                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 transition hover:bg-slate-100"
                                    >
                                      <Phone size={14} />
                                      Ara
                                    </a>
                                  ) : null}
                                  {company.website ? (
                                    <a
                                      href={company.website}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 transition hover:bg-slate-100"
                                    >
                                      <ExternalLink size={14} />
                                      Siteyi Aç
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">Şirket Özeti</p>
                              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-700">
                                <span>Başlangıç: <strong className="text-slate-900">{formatDate(company.subscription_start_date, locale)}</strong></span>
                                <span>Bitiş: <strong className="text-slate-900">{formatDate(company.subscription_end_date, locale)}</strong></span>
                                <span>30 gün istek: <strong className="text-slate-900">{company.request_count_30d}</strong></span>
                                <span>Uplift sinyali: <strong className="text-slate-900">{(company.upsell_probability || '-').replaceAll('_', ' ')}</strong></span>
                                {companyViewMode === 'PASSIVE' ? (
                                  <>
                                    <span>Son kullanım: <strong className="text-slate-900">{formatDate(company.last_activity_at, locale)}</strong></span>
                                    <span>Geri kazanım: <strong className="text-slate-900">{(company.recovery_candidate || '-').replaceAll('_', ' ')}</strong></span>
                                    <span>Son plan: <strong className="text-slate-900">{company.last_used_plan || '-'}</strong></span>
                                    <span>Teklif: <strong className="text-slate-900">{company.recovery_offer || '-'}</strong></span>
                                  </>
                                ) : null}
                              </div>
                              {company.upgrade_reason ? (
                                <p className="mt-3 text-sm leading-6 text-slate-700">{company.upgrade_reason}</p>
                              ) : null}
                              {companyViewMode === 'PASSIVE' && company.recovery_reason ? (
                                <p className="mt-3 text-sm leading-6 text-amber-900">{company.recovery_reason}</p>
                              ) : null}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                              <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
                                Son iletişim
                                <input
                                  type="date"
                                  value={draft.last_contact_at || ''}
                                  onChange={(event) => updateCompanyDraft(company.id, 'last_contact_at', event.target.value)}
                                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-400"
                                />
                              </label>
                              <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
                                Sonraki takip
                                <input
                                  type="date"
                                  value={draft.next_follow_up_at || ''}
                                  onChange={(event) => updateCompanyDraft(company.id, 'next_follow_up_at', event.target.value)}
                                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-400"
                                />
                              </label>
                            </div>

                            <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
                              Hızlı etiket
                              <select
                                value={draft.owner_tag || ''}
                                onChange={(event) => updateCompanyDraft(company.id, 'owner_tag', event.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-400"
                              >
                                <option value="">Etiket seç</option>
                                <option value="YUKSELTME_ADAYI">Yükseltme adayı</option>
                                <option value="ODEME_RISKI">Ödeme riski</option>
                                <option value="ONCELIKLI_MUSTERI">Öncelikli müşteri</option>
                                <option value="DUSUK_KULLANIM">Düşük kullanım</option>
                                <option value="TAKIP_BEKLIYOR">Takip bekliyor</option>
                              </select>
                            </label>

                            <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
                              Son görüşme sonucu
                              <input
                                type="text"
                                value={draft.last_contact_result || ''}
                                onChange={(event) => updateCompanyDraft(company.id, 'last_contact_result', event.target.value)}
                                placeholder="Örn. Nisan başında tekrar görüşülecek."
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-400"
                              />
                            </label>

                            <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
                              Owner notu
                              <textarea
                                value={draft.owner_note || ''}
                                onChange={(event) => updateCompanyDraft(company.id, 'owner_note', event.target.value)}
                                rows={5}
                                placeholder="Örn. Mayıs sonunda Enterprise görüşmesi için aranacak."
                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-400"
                              />
                            </label>

                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                onClick={() => saveCompanyMeta(company.id)}
                                disabled={savingCompanyId === company.id}
                                className="rounded-full bg-slate-900 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingCompanyId === company.id ? 'Kaydediliyor' : 'Şirket Kartını Kaydet'}
                              </button>
                              {company.last_contact_at ? (
                                <span className="text-xs font-bold text-slate-700">Kayıtlı son iletişim: {formatDate(company.last_contact_at, locale)}</span>
                              ) : null}
                              {company.next_follow_up_at ? (
                                <span className="text-xs font-bold text-amber-900">Sonraki takip: {formatDate(company.next_follow_up_at, locale)}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {!visibleCompanies.length ? (
                <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-5 py-6 text-sm font-bold text-slate-700">
                  {companySearch
                    ? 'Arama veya filtre ölçütüne uyan şirket bulunamadı.'
                    : (companyViewMode === 'ACTIVE'
                      ? 'Şu anda aktif şirket görünmüyor.'
                      : 'Şu anda pasif şirket görünmüyor.')}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Portföy Özeti</p>
                  <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Şirket yoğunluğu</h2>
                </div>
                <Building2 size={20} className="text-slate-700" />
              </div>
              <div className="mt-5 space-y-4 text-sm">
                <MetricRow label="Toplam şirket" value={data?.summary?.total_companies || 0} />
                <MetricRow label="Aktif şirket" value={activeCompanies.length} />
                <MetricRow label="Pasif şirket" value={passiveCompanies.length} />
                <MetricRow label="Bu hafta aranacak pasif" value={data?.summary?.passive_call_count || 0} />
                <MetricRow label="Basic şirket" value={data?.summary?.basic_companies || 0} />
                <MetricRow label="Pro şirket" value={data?.summary?.pro_companies || 0} />
                <MetricRow label="Enterprise şirket" value={data?.summary?.enterprise_companies || 0} />
                <MetricRow label="Toplam aktif kişi" value={data?.summary?.active_employees || 0} strong />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Sistem Kaynakları</p>
                  <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Alan kullanımı</h2>
                </div>
                <HardDrive size={20} className="text-slate-700" />
              </div>
              <div className="mt-5 space-y-4 text-sm">
                <MetricRow label="Veritabanı" value={formatBytes(data?.platform_usage?.database_bytes)} />
                <MetricRow label="Yüklemeler" value={formatBytes(data?.platform_usage?.uploads_bytes)} />
                <MetricRow label="Statik dosyalar" value={formatBytes(data?.platform_usage?.static_bytes)} />
                <MetricRow label="Uygulama toplamı" value={formatBytes(data?.platform_usage?.app_storage_bytes)} strong />
                <MetricRow label="Disk boş" value={formatBytes(data?.platform_usage?.disk_free_bytes)} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {currentSection === 'risks' ? (
        <>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div id="payment-risk" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Ödeme Riski</p>
              <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Takip edilmesi gereken şirketler</h2>
            </div>
            <AlertTriangle size={20} className="text-slate-700" />
          </div>
          <div className="mt-5 space-y-3">
            {(data?.payment_risk_companies || []).length ? (
              data.payment_risk_companies.map((company) => (
                <button
                  key={company.company_id}
                  type="button"
                  onClick={() => openCompanyView({
                    companyViewMode: 'PASSIVE',
                    companySearch: company.company_name,
                  })}
                  className="w-full rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">{company.company_name}</h3>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-800">{company.plan_code} · {company.subscription_status}</p>
                    </div>
                    <div className="text-sm font-black text-slate-900">{formatCurrencyTRY(company.estimated_mrr_try, locale)}</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{company.reason}</p>
                  <p className="mt-2 text-xs text-slate-700">Bitiş: {formatDate(company.subscription_end_date, locale)}</p>
                </button>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-900">
                Şu anda ödeme riski taşıyan belirgin şirket görünmüyor.
              </div>
            )}
          </div>
        </div>

        <div id="downgrade-risk" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Düşüş Riski</p>
              <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Paket küçültme adayı müşteriler</h2>
            </div>
            <ShieldAlert size={20} className="text-slate-700" />
          </div>
          <div className="mt-5 space-y-3">
            {(data?.downgrade_risk_companies || []).length ? (
              data.downgrade_risk_companies.map((company) => (
                <button
                  key={company.company_id}
                  type="button"
                  onClick={() => openCompanyView({
                    companyViewMode: 'ACTIVE',
                    activeFilterMode: 'FOLLOW_UP',
                    companySearch: company.company_name,
                  })}
                  className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">{company.company_name}</h3>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-700">{company.plan_code}</p>
                    </div>
                    <div className="text-sm font-black text-slate-900">{formatCurrencyTRY(company.estimated_mrr_try, locale)}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-700">
                    <span>30 gün istek: <strong className="text-slate-900">{company.request_count_30d}</strong></span>
                    <span>Önceki 30 gün: <strong className="text-slate-900">{company.request_count_previous_30d}</strong></span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{company.reason}</p>
                </button>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-900">
                Şu anda paket düşürme sinyali veren belirgin müşteri görünmüyor.
              </div>
            )}
          </div>
        </div>
      </section>
      
      <section id="system-alerts" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Operasyon Uyarıları</p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Sunucu, abonelik ve dış beslemeler</h2>
          </div>
          <ShieldAlert size={20} className="text-slate-700" />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {(data?.alerts || []).length ? (
            data.alerts.map((alert, index) => (
              <div
                key={`${alert.source}-${index}`}
                className={`rounded-[1.5rem] border p-4 ${toneClassMap[alert.severity] || toneClassMap.info}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]">{alert.source}</p>
                    <h3 className="mt-2 text-sm font-black uppercase tracking-tight">{alert.title}</h3>
                  </div>
                  <AlertTriangle size={16} />
                </div>
                <p className="mt-3 text-sm leading-6">{alert.message}</p>
                <p className="mt-3 text-xs opacity-75">{formatDate(alert.created_at, locale)}</p>
              </div>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-900">
              Şu anda açık risk uyarısı görünmüyor.
            </div>
          )}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <NoteCard icon={<Database size={18} />} title="Uyarı Besleme Notu" text={data?.notes?.external_alert_feed} />
          <NoteCard icon={<Activity size={18} />} title="Trafik Notu" text={data?.notes?.traffic_definition} />
        </div>
      </section>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Kritik Zaman Çizelgesi</p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">Son 7 gün hata ve dış uyarı akışı</h2>
          </div>
          <ShieldAlert size={20} className="text-slate-700" />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {(data?.traffic?.critical_timeline_7d || []).map((item) => (
            <div key={item.date} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">{formatDate(item.date, locale)}</h3>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">5xx: {item.critical_error_count}</span>
                  <span className="rounded-full bg-cyan-100 px-3 py-1 text-cyan-700">Harici: {item.external_alert_count}</span>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {(item.alerts || []).length ? (
                  item.alerts.map((alert, index) => (
                    <div key={`${item.date}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <div className="font-black text-slate-900">{alert.title}</div>
                      <div className="mt-1 text-xs text-slate-700">{alert.message}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    Harici kritik kayıt yok.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      </>
      ) : null}
    </div>
  );
};

const MetricRow = ({ label, value, strong = false }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
    <span className="text-slate-700">{label}</span>
    <span className={`font-black ${strong ? 'text-slate-900' : 'text-slate-700'}`}>{value}</span>
  </div>
);

const TrafficCard = ({ label, value }) => (
  <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 p-4">
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">{label}</p>
    <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">{value}</div>
  </div>
);

const NoteCard = ({ icon, title, text }) => (
  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center gap-3 text-slate-900">
      {icon}
      <h3 className="text-sm font-black uppercase tracking-tight">{title}</h3>
    </div>
    <p className="mt-3 text-sm leading-6 text-slate-700">{text}</p>
  </div>
);

export default ExecutiveConsole;

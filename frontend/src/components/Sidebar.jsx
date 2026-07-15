import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import api, { clearAuthStorage, supportApi } from '../api/axios'; 
import { 
  LayoutDashboard, Users, Calendar, Clock, Package, Settings, LogOut, Network, 
  LifeBuoy, Briefcase, FolderOpen, Wallet, Target, Pin, PinOff, GraduationCap, Home,
  Cpu, UserPlus, ShoppingCart, BookOpen, ClipboardList, Telescope, Mail
  , BarChart3, ShieldCheck, Building2
} from 'lucide-react'; 
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi
import { ChevronDown } from 'lucide-react';
import { canAccessPath } from '../auth/permissions';
import { getNotificationBadgeMap } from '../utils/notificationCounts';

const Sidebar = ({ setIsAuthenticated, userRole }) => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası eklendi
  
  // 🌍 RTL Desteği
  const isArabic = i18n.language === 'ar';
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));

  const location = useLocation();
  const navigate = useNavigate();
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [notifications, setNotifications] = useState({});
  const [openSectionId, setOpenSectionId] = useState(null);

  const role = userRole || localStorage.getItem('user_role') || "EMPLOYEE";
  
  const isEmployee = role === "EMPLOYEE";
  const isOwner = role === "OWNER";
  const isManager = role === "MANAGER";
  const isHR = role === "HR" || role === "ADMIN"; 
  const isSuperAdmin = role === "SUPERADMIN";
  const isExpanded = isOwner ? true : (isPinned || isHovered);

  const [userInfo, setUserInfo] = useState({
    name: localStorage.getItem('user_name') || t('lbl_user', 'Kullanıcı'),
    title: t('lbl_loading', 'YÜKLENİYOR...')
  });

  const isUnknownValue = (value) => {
    const normalized = String(value || '').trim().toLocaleLowerCase('tr-TR');
    return !normalized || ['bilinmiyor', 'unknown', 'unbekannt', 'غير معروف'].includes(normalized);
  };

  const fetchUserInfo = async () => {
    if (isOwner) {
      const fullName = localStorage.getItem('user_name') || t('role_owner', 'PLATFORM SAHİBİ');
      setUserInfo({ name: fullName, title: t('role_owner', 'PLATFORM SAHİBİ') });
      return;
    }
    try {
      const res = await api.get('/employee/me/portal');
      if (res.data && res.data.profile) {
        const { first_name, last_name, position, department } = res.data.profile;
        const fullName = [first_name, last_name].filter(Boolean).join(' ') || t('lbl_user', 'Kullanıcı');
        const companyPlan = res.data?.subscription?.plan_code || 'PRO';

        let displayTitle = t('role_employee_short', "PERSONEL");
        if (!isUnknownValue(position)) displayTitle = position;
        else if (!isUnknownValue(department)) displayTitle = department;
        else if (isSuperAdmin) displayTitle = t('role_superadmin', "SİSTEM YÖNETİCİSİ");
        else if (isHR) displayTitle = t('role_hr', "İNSAN KAYNAKLARI");
        else if (isManager) displayTitle = t('role_manager', "YÖNETİCİ");

        setUserInfo({ name: fullName, title: displayTitle });
        localStorage.setItem('user_name', fullName); 
        localStorage.setItem('company_plan', companyPlan);
      }
    } catch (error) {
       let defaultTitle = isOwner ? t('role_owner', 'PLATFORM SAHİBİ') : isSuperAdmin ? t('role_superadmin', 'SİSTEM YÖNETİCİSİ') : isHR ? t('role_hr', 'İNSAN KAYNAKLARI') : isManager ? t('role_manager', 'YÖNETİCİ') : t('role_employee_short', 'PERSONEL');
       setUserInfo(prev => ({ ...prev, title: defaultTitle }));
    }
  };

  const fetchNotifications = async () => {
    if (isOwner) {
      setNotifications({});
      return;
    }
    try {
      const res = await api.get('/notification/unread-count');
      const data = res.data?.details || {};
      let supportUnreadCount = 0;
      if (canAccessPath(role, '/support-center')) {
        try {
          const supportRes = await supportApi.getUnreadBroadcastCount();
          supportUnreadCount = Number(supportRes.data?.count || 0);
        } catch (error) {
          supportUnreadCount = 0;
        }
      }
      const badges = getNotificationBadgeMap(data, canAccessPath(role, '/request-forms'));

      setNotifications({
        '/leaves': badges.leaves,
        '/expenses': badges.expenses,
        '/e-dossier': badges.dossier,
        '/purchase-requests': badges.purchaseRequests,
        '/knowledge-base': badges.knowledgeBase,
        '/helpdesk': badges.helpdesk,
        '/request-forms': badges.requestForms,
        '/support-center': supportUnreadCount,
      });
    } catch (error) {
      console.error("Bildirimler çekilemedi:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUserInfo(); 
    
    const interval = setInterval(fetchNotifications, 60000); 
    const handleNotificationRefresh = () => {
      fetchNotifications();
    };
    const handlePlanRefresh = () => {
      fetchNotifications();
      fetchUserInfo();
    };
    window.addEventListener('app:refresh-notifications', handleNotificationRefresh);
    window.addEventListener('app:plan-changed', handlePlanRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('app:refresh-notifications', handleNotificationRefresh);
      window.removeEventListener('app:plan-changed', handlePlanRefresh);
    };
  }, [role, t]); // 🌍 t kancası eklendi (dil değişirse unvanlar güncellensin diye)

  useEffect(() => {
    const handleResize = () => { window.innerWidth < 1024 ? setIsPinned(false) : setIsPinned(true); };
    window.addEventListener('resize', handleResize);
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    clearAuthStorage();
    if(setIsAuthenticated) setIsAuthenticated(false);
    navigate('/login'); 
  };

  const sectionTitleClass = `px-4 text-[10px] font-black uppercase tracking-[0.22em] text-white ${isArabic ? 'text-right' : 'text-left'}`;

  const buildMenuItem = (key, fallback, path, icon) => ({
    name: t(key, fallback),
    path,
    icon,
  });

  const buildSection = (id, key, fallback, items) => ({
    id,
    title: t(key, fallback),
    items,
  });

  // ==========================================
  // 🛡️ ROL BAZLI MENÜ (RBAC) YAPILANDIRMASI (ÇEVİRİ UYARLI)
  // ==========================================
  const superAdminMenuSections = [
    buildSection('workspace', 'sidebar_group_workspace', 'Çalışma Alanı', [
      buildMenuItem('menu_executive_console', 'YÖNETMEN KOLTUĞU', '/executive-console', <Telescope size={20} />),
      buildMenuItem('menu_dashboard', 'SİSTEM KOKPİTİ', '/dashboard', <LayoutDashboard size={20} />),
      buildMenuItem('menu_portal', 'ÇALIŞAN PORTALI', '/portal', <Home size={20} />),
      buildMenuItem('menu_kpi_statistics', 'KPI & İSTATİSTİKLER', '/kpi-statistics', <BarChart3 size={20} />),
    ]),
    buildSection('people', 'sidebar_group_people', 'İnsan Kaynakları', [
      buildMenuItem('menu_employees', 'PERSONEL YÖNETİMİ', '/employees', <Users size={20} />),
      buildMenuItem('menu_onboarding', 'ONBOARDING & OFFBOARDING', '/onboarding', <UserPlus size={20} />),
      buildMenuItem('menu_org_chart', 'ORGANİZASYON ŞEMASI', '/org-chart', <Network size={20} />),
      buildMenuItem('menu_ats', 'ADAY TAKİP (ATS)', '/ats', <Briefcase size={20} />),
    ]),
    buildSection('operations', 'sidebar_group_operations', 'Operasyon', [
      buildMenuItem('menu_attendance', 'ZAMAN & DEVAMLILIK', '/attendance', <Clock size={20} />),
      buildMenuItem('menu_locations', 'KONUMLAR & ŞANTİYELER', '/locations', <Pin size={20} />),
      buildMenuItem('menu_leaves', 'İZİN YÖNETİMİ', '/leaves', <Calendar size={20} />),
      buildMenuItem('menu_dossier', 'E-ÖZLÜK ARŞİVİ', '/e-dossier', <FolderOpen size={20} />),
      buildMenuItem('menu_assets', 'ZİMMET & ENVANTER', '/assets', <Package size={20} />),
    ]),
    buildSection('compliance', 'sidebar_group_compliance', 'Gelişim & Uyum', [
      buildMenuItem('menu_performance', 'PERFORMANS (OKR)', '/performance', <Target size={20} />),
      buildMenuItem('menu_training', 'EĞİTİM (LMS)', '/training', <GraduationCap size={20} />),
      buildMenuItem('menu_knowledge_base', 'BİLGİ BANKASI & POLİTİKALAR', '/knowledge-base', <BookOpen size={20} />),
    ]),
    buildSection('requests', 'sidebar_group_requests', 'Finans & Talepler', [
      buildMenuItem('menu_expenses', 'MASRAF & HARCAMA', '/expenses', <Wallet size={20} />),
      buildMenuItem('menu_purchase_requests', 'SATIN ALMA TALEPLERİ', '/purchase-requests', <ShoppingCart size={20} />),
      buildMenuItem('menu_request_forms', 'KURUMSAL TALEP FORMLARI', '/request-forms', <ClipboardList size={20} />),
    ]),
  ];

  const ownerMenuSections = [
    buildSection('platform', 'sidebar_group_workspace', 'Platform', [
      buildMenuItem('menu_executive_console', 'GENEL GÖRÜNÜM', '/executive-console/overview', <Telescope size={20} />),
      buildMenuItem('menu_executive_companies', 'ŞİRKETLER', '/executive-console/companies', <Building2 size={20} />),
      buildMenuItem('menu_executive_revenue', 'GELİR & PAKETLER', '/executive-console/revenue', <BarChart3 size={20} />),
      buildMenuItem('menu_executive_risks', 'RİSKLER & UYARILAR', '/executive-console/risks', <ShieldCheck size={20} />),
      buildMenuItem('menu_executive_messages', 'MESAJLAR', '/executive-console/messages', <Mail size={20} />),
    ]),
    buildSection('security', 'sidebar_group_requests', 'Hesap', [
      buildMenuItem('menu_account_security', 'HESAP GÜVENLİĞİ', '/account-security', <ShieldCheck size={20} />),
    ]),
  ];

  const hrMenuSections = [
    buildSection('workspace', 'sidebar_group_workspace', 'Çalışma Alanı', [
      buildMenuItem('menu_dashboard', 'SİSTEM KOKPİTİ', '/dashboard', <LayoutDashboard size={20} />),
      buildMenuItem('menu_portal', 'ÇALIŞAN PORTALI', '/portal', <Home size={20} />),
      buildMenuItem('menu_kpi_statistics', 'KPI & İSTATİSTİKLER', '/kpi-statistics', <BarChart3 size={20} />),
    ]),
    buildSection('people', 'sidebar_group_people', 'İnsan Kaynakları', [
      buildMenuItem('menu_employees', 'PERSONEL YÖNETİMİ', '/employees', <Users size={20} />),
      buildMenuItem('menu_onboarding', 'ONBOARDING & OFFBOARDING', '/onboarding', <UserPlus size={20} />),
      buildMenuItem('menu_org_chart', 'ORGANİZASYON ŞEMASI', '/org-chart', <Network size={20} />),
      buildMenuItem('menu_ats', 'ADAY TAKİP (ATS)', '/ats', <Briefcase size={20} />),
    ]),
    buildSection('operations', 'sidebar_group_operations', 'Operasyon', [
      buildMenuItem('menu_attendance', 'ZAMAN & DEVAMLILIK', '/attendance', <Clock size={20} />),
      buildMenuItem('menu_locations', 'KONUMLAR & ŞANTİYELER', '/locations', <Pin size={20} />),
      buildMenuItem('menu_leaves', 'İZİN YÖNETİMİ', '/leaves', <Calendar size={20} />),
      buildMenuItem('menu_dossier', 'E-ÖZLÜK ARŞİVİ', '/e-dossier', <FolderOpen size={20} />),
      buildMenuItem('menu_assets', 'ZİMMET & ENVANTER', '/assets', <Package size={20} />),
    ]),
    buildSection('compliance', 'sidebar_group_compliance', 'Gelişim & Uyum', [
      buildMenuItem('menu_performance', 'PERFORMANS (OKR)', '/performance', <Target size={20} />),
      buildMenuItem('menu_training', 'EĞİTİM (LMS)', '/training', <GraduationCap size={20} />),
      buildMenuItem('menu_knowledge_base', 'BİLGİ BANKASI & POLİTİKALAR', '/knowledge-base', <BookOpen size={20} />),
    ]),
    buildSection('requests', 'sidebar_group_requests', 'Finans & Talepler', [
      buildMenuItem('menu_expenses', 'MASRAF & HARCAMA', '/expenses', <Wallet size={20} />),
      buildMenuItem('menu_purchase_requests', 'SATIN ALMA TALEPLERİ', '/purchase-requests', <ShoppingCart size={20} />),
      buildMenuItem('menu_request_forms', 'KURUMSAL TALEP FORMLARI', '/request-forms', <ClipboardList size={20} />),
    ]),
  ];

  const managerMenuSections = [
    buildSection('workspace', 'sidebar_group_workspace', 'Çalışma Alanı', [
      buildMenuItem('menu_portal', 'SİSTEM KOKPİTİ', '/portal', <Home size={20} />),
      buildMenuItem('menu_kpi_statistics', 'KPI & İSTATİSTİKLER', '/kpi-statistics', <BarChart3 size={20} />),
    ]),
    buildSection('team', 'sidebar_group_team', 'Ekip & Organizasyon', [
      buildMenuItem('menu_my_team', 'EKİBİM (PERSONEL)', '/employees', <Users size={20} />),
      buildMenuItem('menu_org_chart', 'ORGANİZASYON ŞEMASI', '/org-chart', <Network size={20} />),
      buildMenuItem('menu_ats', 'ADAY TAKİP (ATS)', '/ats', <Briefcase size={20} />),
    ]),
    buildSection('workday', 'sidebar_group_workday', 'Günlük Operasyon', [
      buildMenuItem('menu_attendance', 'ZAMAN & DEVAMLILIK', '/attendance', <Clock size={20} />),
      buildMenuItem('menu_leaves', 'İZİN YÖNETİMİ', '/leaves', <Calendar size={20} />),
      buildMenuItem('menu_performance', 'PERFORMANS (OKR)', '/performance', <Target size={20} />),
      buildMenuItem('menu_training', 'EĞİTİM (LMS)', '/training', <GraduationCap size={20} />),
    ]),
    buildSection('requests', 'sidebar_group_requests', 'Talepler & Destek', [
      buildMenuItem('menu_knowledge_base', 'BİLGİ BANKASI & POLİTİKALAR', '/knowledge-base', <BookOpen size={20} />),
      buildMenuItem('menu_expenses', 'MASRAF & HARCAMA', '/expenses', <Wallet size={20} />),
      buildMenuItem('menu_purchase_requests', 'SATIN ALMA TALEPLERİ', '/purchase-requests', <ShoppingCart size={20} />),
      buildMenuItem('menu_request_forms', 'KURUMSAL TALEP FORMLARI', '/request-forms', <ClipboardList size={20} />),
    ]),
  ];

  const employeeMenuSections = [
    buildSection('workspace', 'sidebar_group_workspace', 'Çalışma Alanı', [
      buildMenuItem('menu_portal', 'SİSTEM KOKPİTİ', '/portal', <Home size={20} />),
    ]),
    buildSection('workday', 'sidebar_group_workday', 'Günlük Çalışma', [
      buildMenuItem('menu_attendance', 'ZAMAN & DEVAMLILIK', '/attendance', <Clock size={20} />),
      buildMenuItem('menu_leaves', 'İZİN YÖNETİMİ', '/leaves', <Calendar size={20} />),
      buildMenuItem('menu_dossier', 'E-ÖZLÜK ARŞİVİ', '/e-dossier', <FolderOpen size={20} />),
      buildMenuItem('menu_org_chart', 'ORGANİZASYON ŞEMASI', '/org-chart', <Network size={20} />),
    ]),
    buildSection('growth', 'sidebar_group_growth', 'Gelişim', [
      buildMenuItem('menu_performance', 'PERFORMANS (OKR)', '/performance', <Target size={20} />),
      buildMenuItem('menu_training', 'EĞİTİM (LMS)', '/training', <GraduationCap size={20} />),
      buildMenuItem('menu_knowledge_base', 'BİLGİ BANKASI & POLİTİKALAR', '/knowledge-base', <BookOpen size={20} />),
    ]),
    buildSection('requests', 'sidebar_group_requests', 'Talepler & Destek', [
      buildMenuItem('menu_expenses', 'MASRAF & HARCAMA', '/expenses', <Wallet size={20} />),
      buildMenuItem('menu_purchase_requests', 'SATIN ALMA TALEPLERİ', '/purchase-requests', <ShoppingCart size={20} />),
      buildMenuItem('menu_request_forms', 'KURUMSAL TALEP FORMLARI', '/request-forms', <ClipboardList size={20} />),
    ]),
  ];

  let activeMenuSections = employeeMenuSections;
  if (isOwner) activeMenuSections = ownerMenuSections;
  else if (isSuperAdmin) activeMenuSections = superAdminMenuSections;
  else if (isHR) activeMenuSections = hrMenuSections;
  else if (isManager) activeMenuSections = managerMenuSections;

  const visibleMenuSections = useMemo(
    () =>
      activeMenuSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => canAccessPath(role, item.path)),
        }))
        .filter((section) => section.items.length > 0),
    [activeMenuSections, role]
  );
  const ownerVisibleItems = useMemo(
    () => visibleMenuSections.flatMap((section) => section.items),
    [visibleMenuSections]
  );

  useEffect(() => {
    const matchedSection = visibleMenuSections.find((section) =>
      section.items.some((item) => location.pathname.startsWith(item.path))
    );

    setOpenSectionId((prev) => {
      const fallbackSectionId = matchedSection?.id || visibleMenuSections[0]?.id || null;
      if (!prev) {
        return fallbackSectionId;
      }

      const currentSection = visibleMenuSections.find((section) => section.id === prev);
      if (!currentSection) {
        return fallbackSectionId;
      }

      const currentSectionHasActiveRoute = currentSection.items.some((item) =>
        location.pathname.startsWith(item.path)
      );

      if (!currentSectionHasActiveRoute && matchedSection?.id) {
        return matchedSection.id;
      }

      return prev;
    });
  }, [role, i18n.language, location.pathname]);

  const toggleSection = (sectionId) => {
    setOpenSectionId((prev) => (prev === sectionId ? null : sectionId));
  };

  const initial = userInfo.name.charAt(0).toUpperCase();

  return (
    <div className={`h-screen bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 flex-shrink-0 relative z-50 font-sans ${isExpanded ? 'w-64' : 'w-20'}`} onMouseEnter={() => !isOwner && setIsHovered(true)} onMouseLeave={() => !isOwner && setIsHovered(false)} dir={isArabic ? 'rtl' : 'ltr'}>
      
      {/* --- LOGO ALANI --- */}
      <div className={`h-20 flex items-center border-b border-slate-800/50 transition-all duration-300 ${isExpanded ? 'justify-between px-6' : 'justify-center'}`}>
        <div className="flex items-center gap-3 overflow-hidden" dir="ltr">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-indigo-500 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0 shadow-lg shadow-cyan-500/20">
            <Cpu size={24} className="opacity-90"/>
          </div>

          <span className={`font-black text-white text-xl tracking-tight whitespace-nowrap transition-all duration-300 uppercase ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>
            CA<span className="text-cyan-400">DRO</span>
          </span>
        </div>
        {isExpanded && !isOwner && <button onClick={() => setIsPinned(!isPinned)} className={`text-slate-500 hover:text-white transition-colors p-1 flex-shrink-0 ${isArabic ? 'mr-auto' : ''}`}>{isPinned ? <PinOff size={18} /> : <Pin size={18} />}</button>}
      </div>

      {/* --- KULLANICI PROFİL KARTI --- */}
      <div className={`border-b border-slate-800/50 p-4 flex items-center gap-3 transition-all duration-300 ${isExpanded ? 'justify-start' : 'justify-center'} bg-slate-800/20`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-black flex-shrink-0 shadow-lg shadow-cyan-500/20 uppercase" dir="ltr">{initial}</div>
        <div className={`flex flex-col overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'} ${isArabic ? 'text-right' : 'text-left'}`}>
          <span className="text-sm font-bold text-white whitespace-nowrap truncate uppercase tracking-wide">{userInfo.name?.toLocaleUpperCase(locale)}</span>
          <span className="text-[9px] font-black text-cyan-400 tracking-[0.2em] uppercase truncate max-w-[140px]" title={userInfo.title}>{userInfo.title?.toLocaleUpperCase(locale)}</span>
        </div>
      </div>

      {/* --- MENÜ LİSTESİ --- */}
      <div className="flex-1 overflow-y-auto py-6 custom-scrollbar px-3">
        {isOwner ? (
          <div className="space-y-1.5">
            {ownerVisibleItems.map((item, index) => {
              const badgeCount = notifications[item.path] || 0;

              return (
                <NavLink
                  to={item.path}
                  key={`${item.path}-${index}`}
                  className={({ isActive }) =>
                    `relative flex items-center rounded-xl transition-all duration-200 group px-4 py-3 ${isActive ? 'bg-cyan-500/10 text-cyan-400 font-bold' : 'hover:bg-slate-800 hover:text-white text-white font-semibold'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className={`relative ${isActive ? 'text-cyan-400' : 'text-white group-hover:text-cyan-400'} transition-colors shrink-0`}>
                        {item.icon}
                        {badgeCount > 0 && (
                          <span className={`absolute -top-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900 animate-pulse ${isArabic ? '-left-1' : '-right-1'}`}></span>
                        )}
                      </div>
                      <span className={`text-[11px] whitespace-nowrap overflow-hidden transition-all duration-300 tracking-wider uppercase ${isArabic ? 'mr-3 opacity-100 w-auto' : 'ml-3 opacity-100 w-auto'}`}>
                        {item.name}
                      </span>
                      {badgeCount > 0 && (
                        <span className={`bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-rose-500/30 ${isArabic ? 'mr-auto' : 'ml-auto'}`} dir="ltr">
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ) : (
          visibleMenuSections.map((section, sectionIndex) => (
            <div key={section.title} className={sectionIndex === 0 ? 'mb-3' : 'mb-4'}>
              {isExpanded ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center rounded-xl px-4 py-3 bg-slate-800/70 hover:bg-slate-800 transition-colors ${isArabic ? 'flex-row-reverse' : ''}`}
                >
                  <span className={sectionTitleClass}>{section.title}</span>
                  <ChevronDown
                    size={16}
                    className={`text-white/90 transition-transform duration-200 ${openSectionId === section.id ? 'rotate-180' : ''} ${isArabic ? 'ml-auto' : 'ml-auto'}`}
                  />
                </button>
              ) : sectionIndex > 0 ? (
                <div className="mx-3 my-3 border-t border-slate-800/70" />
              ) : null}

              <div className={`space-y-1.5 overflow-hidden transition-all duration-200 ${isExpanded && openSectionId !== section.id ? 'max-h-0 opacity-0 mt-0' : 'max-h-[1200px] opacity-100 mt-2'}`}>
                {section.items.map((item, index) => {
                  const badgeCount = notifications[item.path] || 0;

                  return (
                    <NavLink
                      to={item.path}
                      key={`${section.title}-${index}`}
                      title={!isExpanded ? item.name : ""}
                      className={({ isActive }) =>
                        `relative flex items-center rounded-xl transition-all duration-200 group ${isExpanded ? 'px-4 py-3' : 'justify-center py-3'} ${isActive ? 'bg-cyan-500/10 text-cyan-400 font-bold' : 'hover:bg-slate-800 hover:text-white text-white font-semibold'}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className={`relative ${isActive ? 'text-cyan-400' : 'text-white group-hover:text-cyan-400'} transition-colors shrink-0`}>
                            {item.icon}
                            {!isExpanded && badgeCount > 0 && (
                              <span className={`absolute -top-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900 animate-pulse ${isArabic ? '-left-1' : '-right-1'}`}></span>
                            )}
                          </div>

                          <span className={`text-[11px] whitespace-nowrap overflow-hidden transition-all duration-300 tracking-wider uppercase ${isExpanded ? (isArabic ? 'mr-3 opacity-100 w-auto' : 'ml-3 opacity-100 w-auto') : 'opacity-0 w-0'}`}>
                            {item.name}
                          </span>

                          {isExpanded && badgeCount > 0 && (
                            <span className={`bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-rose-500/30 ${isArabic ? 'mr-auto' : 'ml-auto'}`} dir="ltr">
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- ALT MENÜ (AYARLAR VE ÇIKIŞ) --- */}
      <div className="p-4 border-t border-slate-800/50 space-y-1.5 shrink-0">
        
        {canAccessPath(role, '/settings') && (
            <NavLink 
              to="/settings" 
              title={!isExpanded ? t('menu_settings', 'SİSTEM AYARLARI') : ""} 
              className={({ isActive }) => 
                `flex items-center rounded-xl transition-all group font-semibold ${isExpanded ? 'px-4 py-3' : 'justify-center py-3'} ${isActive ? 'bg-cyan-500/10 text-cyan-400' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`
              }
            >
              <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500 shrink-0"/>
              <span className={`text-[11px] whitespace-nowrap overflow-hidden transition-all duration-300 tracking-wider uppercase ${isExpanded ? (isArabic ? 'mr-3 opacity-100' : 'ml-3 opacity-100') : 'opacity-0 w-0'}`}>{t('menu_settings', 'SİSTEM AYARLARI')}</span>
            </NavLink>
        )}

        {canAccessPath(role, '/support-center') && (
            <NavLink
              to="/support-center"
              title={!isExpanded ? t('menu_support_center', 'DESTEK MESAJLARI') : ""}
              className={({ isActive }) =>
                `flex items-center rounded-xl transition-all group font-semibold ${isExpanded ? 'px-4 py-3' : 'justify-center py-3'} ${isActive ? 'bg-cyan-500/10 text-cyan-400' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`
              }
            >
              <Mail size={18} className="shrink-0" />
              <span className={`text-[11px] whitespace-nowrap overflow-hidden transition-all duration-300 tracking-wider uppercase ${isExpanded ? (isArabic ? 'mr-3 opacity-100' : 'ml-3 opacity-100') : 'opacity-0 w-0'}`}>
                {t('menu_support_center', 'DESTEK MESAJLARI')}
              </span>
            </NavLink>
        )}

        <button onClick={handleLogout} title={!isExpanded ? t('menu_logout', "GÜVENLİ ÇIKIŞ") : ""} className={`w-full flex items-center rounded-xl transition-all hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 group font-semibold ${isExpanded ? 'px-4 py-3' : 'justify-center py-3'}`}>
          <LogOut size={18} className={`transition-transform shrink-0 ${isArabic ? 'group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`}/>
          <span className={`text-[11px] whitespace-nowrap overflow-hidden transition-all duration-300 tracking-wider uppercase ${isExpanded ? (isArabic ? 'mr-3 opacity-100' : 'ml-3 opacity-100') : 'opacity-0 w-0'}`}>{t('menu_logout', 'GÜVENLİ ÇIKIŞ')}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

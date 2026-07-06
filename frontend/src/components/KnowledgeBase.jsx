import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Eye,
  FileText,
  Filter,
  Plus,
  ScrollText,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { getEmployees, knowledgeBaseApi } from '../api/axios';
import FilterPopover from './FilterPopover';
import PageToolbar from './PageToolbar';
import { localizeDigits } from '../utils/localizeNumber';

const UI_COPY = {
  tr: {
    pageTitle: 'Bilgi Bankası & Politikalar',
    pageHint: 'Kurumsal makale, SOP ve politika onay merkezi',
    create: 'Yeni İçerik',
    policies: 'Politikalar',
    articles: 'Bilgi Makaleleri',
    all: 'Tümü',
    assigned: 'Atanan',
    unread: 'Okunmayan',
    awaitingAck: 'Onay Bekleyen',
    reackRequired: 'Yeniden Onay',
    reackMessage: 'Bu sürüm için yeniden onay gerekiyor.',
    reackAction: 'Yeniden Onayla',
    published: 'Yayında',
    scope: 'Hedef Kapsam',
    roleScope: 'Role Göre',
    deptScope: 'Departmana Göre',
    empScope: 'Personele Göre',
    status: 'Durum',
    search: 'Başlık, özet veya kategori ara...',
    empty: 'Bu filtrede içerik bulunmuyor.',
    read: 'Okundu',
    markAck: 'Okudum ve Onaylıyorum',
    requiredAck: 'Onay Zorunlu',
    noSummary: 'Özet girilmedi.',
    noContent: 'İçerik eklenmedi.',
    companyWide: 'Tüm Şirket',
    targetRole: 'Hedef Rol',
    targetDepartment: 'Hedef Departman',
    targetEmployee: 'Hedef Personel',
    title: 'Başlık',
    category: 'Kategori',
    version: 'Versiyon',
    summary: 'Kısa Özet',
    content: 'İçerik',
    publishStatus: 'Yayın Durumu',
    save: 'Kaydet',
    cancel: 'Vazgeç',
    edit: 'Düzenle',
    history: 'Versiyon Geçmişi',
    receiptHistory: 'Okuma ve Onay Geçmişi',
    noHistory: 'Bu içerik için henüz versiyon geçmişi yok.',
    noReceiptHistory: 'Bu içerik için henüz okuma veya onay geçmişi yok.',
    created: 'Oluşturuldu',
    updated: 'Güncellendi',
    deleted: 'Silindi',
    restored: 'Geri Yüklendi',
    preRestore: 'Geri Yükleme Öncesi',
    restore: 'Geri Yükle',
    restoreConfirm: 'Bu sürümü aktif içerik olarak geri yüklemek istiyor musunuz?',
    restoreSuccess: 'Sürüm geri yüklendi.',
    restoreError: 'Sürüm geri yüklenemedi.',
    readAction: 'Okundu',
    ackAction: 'Onaylandı',
    compare: 'Karşılaştır',
    compareTitle: 'Sürüm Karşılaştırma',
    currentVersion: 'Güncel Sürüm',
    selectedVersion: 'Seçilen Sürüm',
    noSelection: 'Listeden bir içerik seçildiğinde detay burada açılacak.',
    createdBy: 'Yayınlayan',
    targeting: 'Hedefleme',
    stats: 'Okuma Özeti',
    assignedCount: 'Atanan',
    readCount: 'Okuyan',
    ackCount: 'Onaylayan',
    pendingAckCount: 'Bekleyen Onay',
    deleteConfirm: 'Bu bilgi bankası içeriğini silmek istediğinize emin misiniz?',
    employeePlaceholder: 'Personel seçin',
    departmentPlaceholder: 'Departman seçin',
    roleEmployee: 'Personel',
    roleManager: 'Yönetici',
    roleHr: 'İK',
    roleAdmin: 'Admin',
    roleSuperadmin: 'Superadmin',
    articleTypeArticle: 'Makale',
    articleTypePolicy: 'Politika',
    draft: 'Taslak',
    publishedStatus: 'Yayında',
    archived: 'Arşiv',
    createdSuccess: 'Bilgi bankası içeriği oluşturuldu.',
    deletedSuccess: 'İçerik silindi.',
    ackSuccess: 'Politika onayı kaydedildi.',
    readError: 'İçerik durumu güncellenemedi.',
    saveError: 'İçerik kaydedilemedi.',
    deleteError: 'İçerik silinemedi.',
    fetchError: 'Bilgi bankası verileri çekilemedi.',
  },
  en: {
    pageTitle: 'Knowledge Base & Policies',
    pageHint: 'Corporate articles, SOPs and policy acknowledgements',
    create: 'New Article',
    policies: 'Policies',
    articles: 'Knowledge Articles',
    all: 'All',
    assigned: 'Assigned',
    unread: 'Unread',
    awaitingAck: 'Awaiting Ack',
    reackRequired: 'Re-Ack Needed',
    reackMessage: 'This version requires a fresh acknowledgement.',
    reackAction: 'Acknowledge Again',
    published: 'Published',
    scope: 'Target Scope',
    roleScope: 'By Role',
    deptScope: 'By Department',
    empScope: 'By Employee',
    status: 'Status',
    search: 'Search title, summary or category...',
    empty: 'No content found for this filter.',
    read: 'Read',
    markAck: 'I Read and Acknowledge',
    requiredAck: 'Ack Required',
    noSummary: 'No summary entered.',
    noContent: 'No content added.',
    companyWide: 'Company Wide',
    targetRole: 'Target Role',
    targetDepartment: 'Target Department',
    targetEmployee: 'Target Employee',
    title: 'Title',
    category: 'Category',
    version: 'Version',
    summary: 'Short Summary',
    content: 'Content',
    publishStatus: 'Publish Status',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    history: 'Version History',
    receiptHistory: 'Read & Ack History',
    noHistory: 'No version history for this entry yet.',
    noReceiptHistory: 'No read or acknowledgement history for this entry yet.',
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    restored: 'Restored',
    preRestore: 'Before Restore',
    restore: 'Restore',
    restoreConfirm: 'Do you want to restore this version as the active content?',
    restoreSuccess: 'Version restored.',
    restoreError: 'Version could not be restored.',
    readAction: 'Read',
    ackAction: 'Acknowledged',
    compare: 'Compare',
    compareTitle: 'Version Comparison',
    currentVersion: 'Current Version',
    selectedVersion: 'Selected Version',
    noSelection: 'Details will appear here when you select an article from the list.',
    createdBy: 'Published By',
    targeting: 'Targeting',
    stats: 'Reading Summary',
    assignedCount: 'Assigned',
    readCount: 'Read',
    ackCount: 'Acknowledged',
    pendingAckCount: 'Awaiting Ack',
    deleteConfirm: 'Are you sure you want to delete this knowledge base entry?',
    employeePlaceholder: 'Select employee',
    departmentPlaceholder: 'Select department',
    roleEmployee: 'Employee',
    roleManager: 'Manager',
    roleHr: 'HR',
    roleAdmin: 'Admin',
    roleSuperadmin: 'Superadmin',
    articleTypeArticle: 'Article',
    articleTypePolicy: 'Policy',
    draft: 'Draft',
    publishedStatus: 'Published',
    archived: 'Archived',
    createdSuccess: 'Knowledge base entry created.',
    deletedSuccess: 'Entry deleted.',
    ackSuccess: 'Policy acknowledgement saved.',
    readError: 'Content state could not be updated.',
    saveError: 'Content could not be saved.',
    deleteError: 'Content could not be deleted.',
    fetchError: 'Knowledge base data could not be loaded.',
  },
  de: {
    pageTitle: 'Wissensbasis & Richtlinien',
    pageHint: 'Unternehmensartikel, SOPs und Richtlinienbestätigungen',
    create: 'Neuer Inhalt',
    policies: 'Richtlinien',
    articles: 'Wissensartikel',
    all: 'Alle',
    assigned: 'Zugewiesen',
    unread: 'Ungelesen',
    awaitingAck: 'Offene Bestätigung',
    reackRequired: 'Erneute Bestätigung',
    reackMessage: 'Für diese Version ist eine neue Bestätigung erforderlich.',
    reackAction: 'Erneut Bestätigen',
    published: 'Veröffentlicht',
    scope: 'Zielbereich',
    roleScope: 'Nach Rolle',
    deptScope: 'Nach Abteilung',
    empScope: 'Nach Mitarbeiter',
    status: 'Status',
    search: 'Titel, Zusammenfassung oder Kategorie suchen...',
    empty: 'Kein Inhalt für diesen Filter gefunden.',
    read: 'Gelesen',
    markAck: 'Gelesen und bestätigt',
    requiredAck: 'Bestätigung erforderlich',
    noSummary: 'Keine Zusammenfassung vorhanden.',
    noContent: 'Kein Inhalt vorhanden.',
    companyWide: 'Gesamtes Unternehmen',
    targetRole: 'Zielrolle',
    targetDepartment: 'Zielabteilung',
    targetEmployee: 'Zielmitarbeiter',
    title: 'Titel',
    category: 'Kategorie',
    version: 'Version',
    summary: 'Kurzfassung',
    content: 'Inhalt',
    publishStatus: 'Veröffentlichungsstatus',
    save: 'Speichern',
    cancel: 'Abbrechen',
    edit: 'Bearbeiten',
    history: 'Versionsverlauf',
    receiptHistory: 'Lese- und Bestätigungsverlauf',
    noHistory: 'Für diesen Inhalt gibt es noch keinen Versionsverlauf.',
    noReceiptHistory: 'Für diesen Inhalt gibt es noch keinen Lese- oder Bestätigungsverlauf.',
    created: 'Erstellt',
    updated: 'Aktualisiert',
    deleted: 'Gelöscht',
    restored: 'Wiederhergestellt',
    preRestore: 'Vor Wiederherstellung',
    restore: 'Wiederherstellen',
    restoreConfirm: 'Möchten Sie diese Version als aktiven Inhalt wiederherstellen?',
    restoreSuccess: 'Version wiederhergestellt.',
    restoreError: 'Version konnte nicht wiederhergestellt werden.',
    readAction: 'Gelesen',
    ackAction: 'Bestätigt',
    compare: 'Vergleichen',
    compareTitle: 'Versionsvergleich',
    currentVersion: 'Aktuelle Version',
    selectedVersion: 'Gewählte Version',
    noSelection: 'Details erscheinen hier, sobald ein Inhalt aus der Liste ausgewählt wird.',
    createdBy: 'Veröffentlicht von',
    targeting: 'Zielgruppe',
    stats: 'Leseübersicht',
    assignedCount: 'Zugewiesen',
    readCount: 'Gelesen',
    ackCount: 'Bestätigt',
    pendingAckCount: 'Offen',
    deleteConfirm: 'Möchten Sie diesen Wissensbasis-Eintrag wirklich löschen?',
    employeePlaceholder: 'Mitarbeiter wählen',
    departmentPlaceholder: 'Abteilung wählen',
    roleEmployee: 'Mitarbeiter',
    roleManager: 'Manager',
    roleHr: 'HR',
    roleAdmin: 'Admin',
    roleSuperadmin: 'Superadmin',
    articleTypeArticle: 'Artikel',
    articleTypePolicy: 'Richtlinie',
    draft: 'Entwurf',
    publishedStatus: 'Veröffentlicht',
    archived: 'Archiv',
    createdSuccess: 'Wissensbasis-Inhalt erstellt.',
    deletedSuccess: 'Inhalt gelöscht.',
    ackSuccess: 'Richtlinienbestätigung gespeichert.',
    readError: 'Der Status konnte nicht aktualisiert werden.',
    saveError: 'Der Inhalt konnte nicht gespeichert werden.',
    deleteError: 'Der Inhalt konnte nicht gelöscht werden.',
    fetchError: 'Wissensbasisdaten konnten nicht geladen werden.',
  },
  ar: {
    pageTitle: 'قاعدة المعرفة والسياسات',
    pageHint: 'مقالات الشركة وإجراءات العمل وإقرارات السياسات',
    create: 'محتوى جديد',
    policies: 'السياسات',
    articles: 'مقالات المعرفة',
    all: 'الكل',
    assigned: 'المعيّن',
    unread: 'غير المقروء',
    awaitingAck: 'بانتظار الإقرار',
    reackRequired: 'إقرار جديد',
    reackMessage: 'هذه النسخة تتطلب إقراراً جديداً.',
    reackAction: 'أقر مرة أخرى',
    published: 'المنشور',
    scope: 'نطاق الاستهداف',
    roleScope: 'حسب الدور',
    deptScope: 'حسب القسم',
    empScope: 'حسب الموظف',
    status: 'الحالة',
    search: 'ابحث في العنوان أو الملخص أو الفئة...',
    empty: 'لا يوجد محتوى لهذا الفلتر.',
    read: 'تمت القراءة',
    markAck: 'قرأت وأقرّ',
    requiredAck: 'الإقرار إلزامي',
    noSummary: 'لا يوجد ملخص.',
    noContent: 'لا يوجد محتوى.',
    companyWide: 'على مستوى الشركة',
    targetRole: 'الدور المستهدف',
    targetDepartment: 'القسم المستهدف',
    targetEmployee: 'الموظف المستهدف',
    title: 'العنوان',
    category: 'الفئة',
    version: 'الإصدار',
    summary: 'ملخص قصير',
    content: 'المحتوى',
    publishStatus: 'حالة النشر',
    save: 'حفظ',
    cancel: 'إلغاء',
    edit: 'تعديل',
    history: 'سجل الإصدارات',
    receiptHistory: 'سجل القراءة والإقرار',
    noHistory: 'لا يوجد سجل إصدارات لهذا المحتوى بعد.',
    noReceiptHistory: 'لا يوجد سجل قراءة أو إقرار لهذا المحتوى بعد.',
    created: 'تم الإنشاء',
    updated: 'تم التحديث',
    deleted: 'تم الحذف',
    restored: 'تمت الاستعادة',
    preRestore: 'قبل الاستعادة',
    restore: 'استعادة',
    restoreConfirm: 'هل تريد استعادة هذا الإصدار كمحتوى نشط؟',
    restoreSuccess: 'تمت استعادة الإصدار.',
    restoreError: 'تعذر استعادة الإصدار.',
    readAction: 'تمت القراءة',
    ackAction: 'تم الإقرار',
    compare: 'مقارنة',
    compareTitle: 'مقارنة الإصدارات',
    currentVersion: 'الإصدار الحالي',
    selectedVersion: 'الإصدار المحدد',
    noSelection: 'ستظهر التفاصيل هنا عند اختيار محتوى من القائمة.',
    createdBy: 'تم النشر بواسطة',
    targeting: 'الاستهداف',
    stats: 'ملخص القراءة',
    assignedCount: 'المعيّن',
    readCount: 'قرأ',
    ackCount: 'أقرّ',
    pendingAckCount: 'بانتظار الإقرار',
    deleteConfirm: 'هل أنت متأكد من حذف هذا المحتوى؟',
    employeePlaceholder: 'اختر موظفاً',
    departmentPlaceholder: 'اختر قسماً',
    roleEmployee: 'موظف',
    roleManager: 'مدير',
    roleHr: 'الموارد البشرية',
    roleAdmin: 'الإدارة',
    roleSuperadmin: 'سوبر أدمن',
    articleTypeArticle: 'مقال',
    articleTypePolicy: 'سياسة',
    draft: 'مسودة',
    publishedStatus: 'منشور',
    archived: 'أرشيف',
    createdSuccess: 'تم إنشاء المحتوى.',
    deletedSuccess: 'تم حذف المحتوى.',
    ackSuccess: 'تم حفظ الإقرار بالسياسة.',
    readError: 'تعذر تحديث حالة المحتوى.',
    saveError: 'تعذر حفظ المحتوى.',
    deleteError: 'تعذر حذف المحتوى.',
    fetchError: 'تعذر تحميل بيانات قاعدة المعرفة.',
  },
};

const ROLE_OPTIONS = ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN', 'SUPERADMIN'];
const ARTICLE_TABS = ['ALL', 'POLICY', 'ARTICLE'];

const KnowledgeBase = () => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'tr').startsWith('de')
    ? 'de'
    : (i18n.language || 'tr').startsWith('ar')
      ? 'ar'
      : (i18n.language || 'tr').startsWith('en')
        ? 'en'
        : 'tr';
  const ui = UI_COPY[lang];
  const isArabic = lang === 'ar';
  const locale = lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : lang === 'ar' ? 'ar-SA' : 'en-US';
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);
  const role = localStorage.getItem('user_role') || 'EMPLOYEE';
  const canManage = ['MANAGER', 'HR', 'ADMIN', 'SUPERADMIN'].includes(role);

  const [articles, setArticles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [articleTypeTab, setArticleTypeTab] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(canManage ? 'PUBLISHED' : '');
  const [filterDraft, setFilterDraft] = useState({ search: '', status: canManage ? 'PUBLISHED' : '' });
  const [openFilterMenu, setOpenFilterMenu] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [articleHistory, setArticleHistory] = useState([]);
  const [receiptHistory, setReceiptHistory] = useState([]);
  const [compareVersion, setCompareVersion] = useState(null);
  const [form, setForm] = useState({
    title: '',
    summary: '',
    content: '',
    category: '',
    article_type: 'POLICY',
    version: '1.0',
    status: 'PUBLISHED',
    require_ack: true,
    target_scope: 'ALL',
    target_role: '',
    target_department_id: '',
    target_employee_id: '',
  });

  const departmentOptions = useMemo(() => {
    const seen = new Map();
    (employees || []).forEach((emp) => {
      if (emp.department_id && emp.department) {
        seen.set(emp.department_id, emp.department);
      }
    });
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [employees, locale]);

  const selectedArticle = useMemo(
    () => articles.find((item) => item.id === selectedId) || null,
    [articles, selectedId],
  );

  const fetchData = async (preserveId = selectedId) => {
    try {
      const params = {
        article_type: articleTypeTab !== 'ALL' ? articleTypeTab : undefined,
        status: canManage && statusFilter ? statusFilter : undefined,
        search: search.trim() || undefined,
      };
      const requests = [knowledgeBaseApi.getAll(params)];
      if (canManage) requests.push(getEmployees());

      const [articleRes, employeeRes] = await Promise.all(requests);
      const nextArticles = articleRes.data || [];
      setArticles(nextArticles);

      if (canManage) {
        setEmployees((employeeRes?.data || []).filter((item) => item.status === 'ACTIVE'));
      }

      const nextSelectedId = preserveId && nextArticles.some((item) => item.id === preserveId)
        ? preserveId
        : nextArticles[0]?.id || null;
      setSelectedId(nextSelectedId);
    } catch (error) {
      toast.error(ui.fetchError);
    }
  };

  useEffect(() => {
    fetchData();
  }, [articleTypeTab, statusFilter, search]);

  useEffect(() => {
    setFilterDraft({ search, status: statusFilter });
  }, [search, statusFilter]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!canManage || !selectedId) {
        setArticleHistory([]);
        setReceiptHistory([]);
        return;
      }
      try {
        const [versionRes, receiptRes] = await Promise.all([
          knowledgeBaseApi.getHistory(selectedId),
          knowledgeBaseApi.getReceiptHistory(selectedId),
        ]);
        setArticleHistory(Array.isArray(versionRes.data) ? versionRes.data : []);
        setReceiptHistory(Array.isArray(receiptRes.data) ? receiptRes.data : []);
      } catch {
        setArticleHistory([]);
        setReceiptHistory([]);
      }
    };
    loadHistory();
  }, [canManage, selectedId]);

  const handleSelectArticle = async (article) => {
    setSelectedId(article.id);
    if (!article.is_read) {
      try {
        await knowledgeBaseApi.markRead(article.id);
        fetchData(article.id);
      } catch (error) {
        toast.error(ui.readError);
      }
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedArticle) return;
    try {
      await knowledgeBaseApi.acknowledge(selectedArticle.id);
      toast.success(ui.ackSuccess);
      fetchData(selectedArticle.id);
    } catch (error) {
      toast.error(ui.readError);
    }
  };

  const handleDelete = async (articleId) => {
    if (!window.confirm(ui.deleteConfirm)) return;
    try {
      await knowledgeBaseApi.remove(articleId);
      toast.success(ui.deletedSuccess);
      fetchData();
    } catch (error) {
      toast.error(ui.deleteError);
    }
  };

  const resetFormState = () => {
    setEditingArticleId(null);
    setForm({
      title: '',
      summary: '',
      content: '',
      category: '',
      article_type: 'POLICY',
      version: '1.0',
      status: 'PUBLISHED',
      require_ack: true,
      target_scope: 'ALL',
      target_role: '',
      target_department_id: '',
      target_employee_id: '',
    });
  };

  const openEditModal = () => {
    if (!selectedArticle) return;
    setEditingArticleId(selectedArticle.id);
    setForm({
      title: selectedArticle.title || '',
      summary: selectedArticle.summary || '',
      content: selectedArticle.content || '',
      category: selectedArticle.category || '',
      article_type: selectedArticle.article_type || 'POLICY',
      version: selectedArticle.version || '1.0',
      status: selectedArticle.status || 'PUBLISHED',
      require_ack: Boolean(selectedArticle.require_ack),
      target_scope: selectedArticle.target_scope || 'ALL',
      target_role: selectedArticle.target_role || '',
      target_department_id: selectedArticle.target_department_id ? String(selectedArticle.target_department_id) : '',
      target_employee_id: selectedArticle.target_employee_id ? String(selectedArticle.target_employee_id) : '',
    });
    setIsCreateModalOpen(true);
  };

  const getSnapshotTypeLabel = (value) => {
    if (value === 'CREATED') return ui.created;
    if (value === 'UPDATED') return ui.updated;
    if (value === 'DELETED') return ui.deleted;
    if (value === 'RESTORED') return ui.restored;
    if (value === 'PRE_RESTORE') return ui.preRestore;
    return value;
  };

  const getReceiptActionLabel = (value) => {
    if (value === 'READ') return ui.readAction;
    if (value === 'ACK') return ui.ackAction;
    return value;
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        target_department_id: form.target_scope === 'DEPARTMENT' && form.target_department_id ? Number(form.target_department_id) : null,
        target_employee_id: form.target_scope === 'EMPLOYEE' && form.target_employee_id ? Number(form.target_employee_id) : null,
        target_role: form.target_scope === 'ROLE' ? form.target_role : null,
      };
      if (editingArticleId) {
        await knowledgeBaseApi.update(editingArticleId, payload);
      } else {
        await knowledgeBaseApi.create(payload);
      }
      toast.success(editingArticleId ? ui.save : ui.createdSuccess);
      setIsCreateModalOpen(false);
      resetFormState();
      fetchData();
    } catch (error) {
      toast.error(ui.saveError);
    }
  };

  const articleCounts = useMemo(() => {
    const allItems = articles || [];
    return {
      assigned: allItems.length,
      unread: allItems.filter((item) => !item.is_read).length,
      awaitingAck: allItems.filter((item) => item.require_ack && !item.is_acknowledged).length,
      published: allItems.filter((item) => item.status === 'PUBLISHED').length,
      policies: allItems.filter((item) => item.article_type === 'POLICY').length,
      pendingAckTotal: allItems.reduce((sum, item) => sum + (item.pending_ack_count || 0), 0),
    };
  }, [articles]);

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString(locale);
  };

  const roleLabel = (value) => {
    const roleMap = {
      EMPLOYEE: ui.roleEmployee,
      MANAGER: ui.roleManager,
      HR: ui.roleHr,
      ADMIN: ui.roleAdmin,
      SUPERADMIN: ui.roleSuperadmin,
    };
    return roleMap[value] || value;
  };

  const statusLabel = (value) => {
    if (value === 'DRAFT') return ui.draft;
    if (value === 'ARCHIVED') return ui.archived;
    return ui.publishedStatus;
  };

  const typeLabel = (value) => (value === 'POLICY' ? ui.articleTypePolicy : ui.articleTypeArticle);

  const scopeLabel = (value, roleValue) => {
    if (value === 'ROLE') return `${ui.roleScope}${roleValue ? ` • ${roleLabel(roleValue)}` : ''}`;
    if (value === 'DEPARTMENT') return ui.deptScope;
    if (value === 'EMPLOYEE') return ui.empScope;
    return ui.companyWide;
  };

  const renderComparedText = (value, otherValue, tone) => {
    const sourceTokens = String(value || '').split(/\s+/);
    const compareTokens = String(otherValue || '').split(/\s+/);
    return sourceTokens.map((token, index) => {
      const different = token !== compareTokens[index];
      return (
        <span
          key={`${token}-${index}`}
          className={different ? (tone === 'cyan' ? 'rounded bg-cyan-100 px-1' : 'rounded bg-indigo-100 px-1') : ''}
        >
          {token}
          {index < sourceTokens.length - 1 ? ' ' : ''}
        </span>
      );
    });
  };

  const handleRestoreVersion = async (versionId) => {
    if (!selectedArticle) return;
    if (!window.confirm(ui.restoreConfirm)) return;
    try {
      await knowledgeBaseApi.restoreVersion(selectedArticle.id, versionId);
      toast.success(ui.restoreSuccess);
      fetchData(selectedArticle.id);
    } catch {
      toast.error(ui.restoreError);
    }
  };

  const comparisonRows = compareVersion && selectedArticle ? [
    { label: ui.title, current: selectedArticle.title || '-', version: compareVersion.title || '-' },
    { label: ui.version, current: selectedArticle.version || '-', version: compareVersion.version || '-' },
    { label: ui.publishStatus, current: statusLabel(selectedArticle.status), version: statusLabel(compareVersion.status) },
    { label: ui.category, current: selectedArticle.category || '-', version: compareVersion.category || '-' },
    {
      label: ui.targeting,
      current: selectedArticle.scope_label || ui.companyWide,
      version: scopeLabel(compareVersion.target_scope, compareVersion.target_role),
    },
    { label: ui.summary, current: selectedArticle.summary || ui.noSummary, version: compareVersion.summary || ui.noSummary },
    { label: ui.content, current: selectedArticle.content || ui.noContent, version: compareVersion.content || ui.noContent },
  ].map((row) => ({
    ...row,
    isDifferent: String(row.current || '').trim() !== String(row.version || '').trim(),
  })) : [];

  const applyFilterMenu = () => {
    setSearch(filterDraft.search);
    setStatusFilter(filterDraft.status);
    setOpenFilterMenu(null);
  };

  const cancelFilterMenu = () => {
    setFilterDraft({ search, status: statusFilter });
    setOpenFilterMenu(null);
  };

  const resetFilterMenu = (menuKey) => {
    if (menuKey === 'search') {
      setFilterDraft((prev) => ({ ...prev, search: '' }));
      return;
    }
    if (menuKey === 'status') {
      setFilterDraft((prev) => ({ ...prev, status: canManage ? 'PUBLISHED' : '' }));
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? 'top-left' : 'top-right'} reverseOrder={false} />

      <PageToolbar
        left={(
          <div className={`flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm ${isArabic ? 'flex-row-reverse' : ''}`}>
            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600">
              <BookOpen size={16} />
            </div>
            <div className={isArabic ? 'text-right' : 'text-left'}>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{ui.pageTitle}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{ui.pageHint}</p>
            </div>
          </div>
        )}
        right={(
          <div className={`flex flex-wrap items-center gap-3 w-full xl:w-auto ${isArabic ? 'justify-start xl:flex-row-reverse' : 'justify-end'}`}>
            <FilterPopover
              label={t('lbl_search', 'Arama')}
              open={openFilterMenu === 'search'}
              active={Boolean(search)}
              onToggle={() => setOpenFilterMenu((prev) => (prev === 'search' ? null : 'search'))}
              onReset={() => resetFilterMenu('search')}
              onCancel={cancelFilterMenu}
              onApply={applyFilterMenu}
              align="left"
              panelWidthClass="w-[320px]"
              className="w-full sm:w-[220px]"
            >
              <div className="relative">
                <Filter size={14} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isArabic ? 'right-3' : 'left-3'}`} />
                <input
                  value={filterDraft.search}
                  onChange={(e) => setFilterDraft((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder={ui.search}
                  className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500 ${isArabic ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
                />
              </div>
            </FilterPopover>
            {canManage && (
              <FilterPopover
                label={t('lbl_status', 'Durum')}
                open={openFilterMenu === 'status'}
                active={Boolean(statusFilter) && statusFilter !== 'PUBLISHED'}
                onToggle={() => setOpenFilterMenu((prev) => (prev === 'status' ? null : 'status'))}
                onReset={() => resetFilterMenu('status')}
                onCancel={cancelFilterMenu}
                onApply={applyFilterMenu}
                align={isArabic ? 'left' : 'right'}
                className="w-full sm:w-[190px] min-w-0"
              >
                <select
                  value={filterDraft.status}
                  onChange={(e) => setFilterDraft((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="PUBLISHED">{ui.publishedStatus}</option>
                  <option value="DRAFT">{ui.draft}</option>
                  <option value="ARCHIVED">{ui.archived}</option>
                </select>
              </FilterPopover>
            )}
            {canManage && (
              <button
                onClick={() => {
                  resetFormState();
                  setIsCreateModalOpen(true);
                }}
                className={`flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-200 transition-all hover:bg-slate-900 ${isArabic ? 'flex-row-reverse' : ''}`}
              >
                <Plus size={16} />
                {ui.create}
              </button>
            )}
          </div>
        )}
      />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 shrink-0">
        {(canManage
          ? [
              { label: ui.published, value: articleCounts.published, icon: <FileText size={16} className="text-cyan-500" /> },
              { label: ui.policies, value: articleCounts.policies, icon: <ShieldCheck size={16} className="text-emerald-500" /> },
              { label: ui.pendingAckCount, value: articleCounts.pendingAckTotal, icon: <CheckCircle2 size={16} className="text-amber-500" /> },
            ]
          : [
              { label: ui.assigned, value: articleCounts.assigned, icon: <Users size={16} className="text-cyan-500" /> },
              { label: ui.unread, value: articleCounts.unread, icon: <Eye size={16} className="text-amber-500" /> },
              { label: ui.awaitingAck, value: articleCounts.awaitingAck, icon: <ShieldCheck size={16} className="text-emerald-500" /> },
            ]).map((item) => (
          <div key={item.label} className="rounded-[1.75rem] border border-slate-100 bg-white px-5 py-4 shadow-sm">
            <div className={`flex items-center justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <div className={isArabic ? 'text-right' : 'text-left'}>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-800">{localizedNumber(item.value)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">{item.icon}</div>
            </div>
          </div>
        ))}
        <div className="xl:col-span-2 rounded-[1.75rem] border border-slate-100 bg-white p-2 shadow-sm">
          <div className={`grid grid-cols-3 gap-2 ${isArabic ? 'text-right' : 'text-left'}`}>
            {ARTICLE_TABS.map((tab) => {
              const active = articleTypeTab === tab;
              const label = tab === 'POLICY' ? ui.policies : tab === 'ARTICLE' ? ui.articles : ui.all;
              return (
                <button
                  key={tab}
                  onClick={() => setArticleTypeTab(tab)}
                  className={`rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${active ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="min-h-0 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              {articleTypeTab === 'POLICY' ? ui.policies : articleTypeTab === 'ARTICLE' ? ui.articles : ui.all}
            </p>
          </div>
          <div className="h-full overflow-y-auto p-3 custom-scrollbar">
            {articles.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
                {ui.empty}
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map((article) => {
                  const active = selectedId === article.id;
                  return (
                    <button
                      key={article.id}
                      onClick={() => handleSelectArticle(article)}
                      className={`w-full rounded-[1.5rem] border p-4 text-left transition-all ${active ? 'border-indigo-300 bg-indigo-50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'} ${isArabic ? 'text-right' : 'text-left'}`}
                    >
                      <div className={`flex items-start justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <div className="min-w-0">
                          <p className="truncate text-base font-black tracking-tight text-slate-800">{article.title}</p>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{article.summary || ui.noSummary}</p>
                        </div>
                        <span className={`shrink-0 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest ${article.article_type === 'POLICY' ? 'bg-amber-100 text-amber-700' : 'bg-cyan-100 text-cyan-700'}`}>
                          {typeLabel(article.article_type)}
                        </span>
                      </div>
                      <div className={`mt-4 flex flex-wrap items-center gap-2 ${isArabic ? 'justify-end' : ''}`}>
                        <span className="rounded-xl bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {article.scope_label || ui.companyWide}
                        </span>
                        {article.require_ack && (
                          <span className="rounded-xl bg-rose-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-700">
                            {article.needs_reacknowledgement ? ui.reackRequired : ui.requiredAck}
                          </span>
                        )}
                        {article.is_read && (
                          <span className="rounded-xl bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                            {ui.read}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          {!selectedArticle ? (
            <div className="flex h-full items-center justify-center p-10 text-center text-sm font-bold text-slate-400">
              {ui.noSelection}
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className={`flex flex-wrap items-start justify-between gap-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <div className={isArabic ? 'text-right' : 'text-left'}>
                    <div className={`mb-3 flex flex-wrap items-center gap-2 ${isArabic ? 'justify-end' : ''}`}>
                      <span className={`rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest ${selectedArticle.article_type === 'POLICY' ? 'bg-amber-100 text-amber-700' : 'bg-cyan-100 text-cyan-700'}`}>
                        {typeLabel(selectedArticle.article_type)}
                      </span>
                      <span className="rounded-xl bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {statusLabel(selectedArticle.status)}
                      </span>
                      <span className="rounded-xl bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        v{selectedArticle.version}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">{selectedArticle.title}</h2>
                    <p className="mt-2 text-sm font-semibold text-slate-500">{selectedArticle.summary || ui.noSummary}</p>
                  </div>
                  <div className={`flex flex-wrap items-center gap-2 ${isArabic ? 'justify-start flex-row-reverse' : ''}`}>
                    {selectedArticle.require_ack && !selectedArticle.is_acknowledged && (
                      <button
                        onClick={handleAcknowledge}
                        className={`flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-200 ${isArabic ? 'flex-row-reverse' : ''}`}
                      >
                        <CheckCircle2 size={15} />
                        {selectedArticle.needs_reacknowledgement ? ui.reackAction : ui.markAck}
                      </button>
                    )}
                    {canManage && (
                      <>
                        <button
                          onClick={openEditModal}
                          className={`flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-slate-700 ${isArabic ? 'flex-row-reverse' : ''}`}
                        >
                          <ScrollText size={15} />
                          {ui.edit}
                        </button>
                        <button
                          onClick={() => handleDelete(selectedArticle.id)}
                          className={`flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-100 ${isArabic ? 'flex-row-reverse' : ''}`}
                        >
                          <Trash2 size={15} />
                          Sil
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid flex-1 min-h-0 grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-h-0 overflow-y-auto px-6 py-6 custom-scrollbar">
                  {selectedArticle.needs_reacknowledgement && (
                    <div className="mb-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">{ui.reackRequired}</p>
                      <p className="mt-2 text-sm font-bold text-amber-900">{ui.reackMessage}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 px-5 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.targeting}</p>
                      <p className="mt-3 text-sm font-bold text-slate-700">{selectedArticle.scope_label || ui.companyWide}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 px-5 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.createdBy}</p>
                      <p className="mt-3 text-sm font-bold text-slate-700">{selectedArticle.creator_name || '-'}</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.content}</p>
                    <div className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                      {selectedArticle.content || ui.noContent}
                    </div>
                  </div>
                </div>

                <div className="min-h-0 overflow-y-auto custom-scrollbar border-t 2xl:border-t-0 2xl:border-l border-slate-100 bg-slate-50/70 p-6">
                  <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.stats}</p>
                    <div className="mt-4 space-y-3">
                      {(canManage
                        ? [
                            [ui.assignedCount, selectedArticle.assigned_count || 0],
                            [ui.readCount, selectedArticle.read_count || 0],
                            [ui.ackCount, selectedArticle.ack_count || 0],
                            [ui.pendingAckCount, selectedArticle.pending_ack_count || 0],
                          ]
                        : [
                            [ui.read, selectedArticle.is_read ? 1 : 0],
                            [ui.requiredAck, selectedArticle.require_ack ? 1 : 0],
                            [ui.ackCount, selectedArticle.is_acknowledged ? 1 : 0],
                          ]).map(([label, value]) => (
                        <div key={label} className={`flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <span className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</span>
                          <span className="text-lg font-black tracking-tight text-slate-800">{localizedNumber(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.publishStatus}</p>
                    <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                      <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <span>{ui.status}</span>
                        <span className="font-black text-slate-800">{statusLabel(selectedArticle.status)}</span>
                      </div>
                      <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <span>{ui.version}</span>
                        <span className="font-black text-slate-800">{selectedArticle.version}</span>
                      </div>
                      {selectedArticle.acknowledged_version && (
                        <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <span>{ui.ackCount}</span>
                          <span className="font-black text-slate-800">v{selectedArticle.acknowledged_version}</span>
                        </div>
                      )}
                      <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <span>{ui.createdBy}</span>
                        <span className="font-black text-slate-800">{selectedArticle.creator_name || '-'}</span>
                      </div>
                      <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <span>Son Güncelleme</span>
                        <span className="font-black text-slate-800">{formatDateTime(selectedArticle.updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <>
                      <div className="mt-4 rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.history}</p>
                        <div className="mt-4 space-y-3">
                          {articleHistory.length === 0 ? (
                            <p className="text-sm font-semibold text-slate-500">{ui.noHistory}</p>
                          ) : (
                            articleHistory.map((item) => (
                              <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                                <div className={`flex items-center justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{getSnapshotTypeLabel(item.snapshot_type)}</span>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{formatDateTime(item.created_at)}</span>
                                </div>
                                <p className="mt-2 text-sm font-black text-slate-800">{item.title}</p>
                                <div className={`mt-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-500 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                  <span>v{item.version}</span>
                                  <span>{item.actor_name || '-'}</span>
                                </div>
                                {item.snapshot_type !== 'PRE_RESTORE' && item.snapshot_type !== 'DELETED' && (
                                  <div className={`mt-3 flex flex-wrap items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                    <button
                                      onClick={() => setCompareVersion(item)}
                                      className={`flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 hover:bg-slate-200 ${isArabic ? 'flex-row-reverse' : ''}`}
                                    >
                                      <ScrollText size={12} />
                                      {ui.compare}
                                    </button>
                                    <button
                                      onClick={() => handleRestoreVersion(item.id)}
                                      className={`flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 hover:bg-indigo-100 ${isArabic ? 'flex-row-reverse' : ''}`}
                                    >
                                      <ScrollText size={12} />
                                      {ui.restore}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="mt-4 rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.receiptHistory}</p>
                        <div className="mt-4 space-y-3">
                          {receiptHistory.length === 0 ? (
                            <p className="text-sm font-semibold text-slate-500">{ui.noReceiptHistory}</p>
                          ) : (
                            receiptHistory.map((item) => (
                              <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                                <div className={`flex items-center justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{getReceiptActionLabel(item.action_type)}</span>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{formatDateTime(item.created_at)}</span>
                                </div>
                                <div className={`mt-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-500 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                  <span>{item.employee_name || '-'}</span>
                                  <span>{item.article_version ? `v${item.article_version}` : '-'}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isCreateModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" dir={isArabic ? 'rtl' : 'ltr'}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2.5rem] bg-white p-6 shadow-2xl">
            <div className={`flex items-center justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <div className={isArabic ? 'text-right' : 'text-left'}>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.create}</p>
                <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{editingArticleId ? `${ui.edit} - ${ui.pageTitle}` : ui.pageTitle}</h3>
              </div>
              <button
                onClick={() => { setIsCreateModalOpen(false); resetFormState(); }}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500"
              >
                {ui.cancel}
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.title}</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.category}</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.version}</label>
                <input
                  value={form.version}
                  onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.policies} / {ui.articles}</label>
                <select
                  value={form.article_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, article_type: e.target.value, require_ack: e.target.value === 'POLICY' ? prev.require_ack : false }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                >
                  <option value="POLICY">{ui.articleTypePolicy}</option>
                  <option value="ARTICLE">{ui.articleTypeArticle}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.publishStatus}</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                >
                  <option value="PUBLISHED">{ui.publishedStatus}</option>
                  <option value="DRAFT">{ui.draft}</option>
                  <option value="ARCHIVED">{ui.archived}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.scope}</label>
                <select
                  value={form.target_scope}
                  onChange={(e) => setForm((prev) => ({ ...prev, target_scope: e.target.value, target_role: '', target_department_id: '', target_employee_id: '' }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                >
                  <option value="ALL">{ui.companyWide}</option>
                  <option value="ROLE">{ui.roleScope}</option>
                  <option value="DEPARTMENT">{ui.deptScope}</option>
                  <option value="EMPLOYEE">{ui.empScope}</option>
                </select>
              </div>

              {form.target_scope === 'ROLE' && (
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.targetRole}</label>
                  <select
                    value={form.target_role}
                    onChange={(e) => setForm((prev) => ({ ...prev, target_role: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                  >
                    <option value="">{ui.targetRole}</option>
                    {ROLE_OPTIONS.map((item) => (
                      <option key={item} value={item}>{roleLabel(item)}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.target_scope === 'DEPARTMENT' && (
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.targetDepartment}</label>
                  <select
                    value={form.target_department_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, target_department_id: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                  >
                    <option value="">{ui.departmentPlaceholder}</option>
                    {departmentOptions.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.target_scope === 'EMPLOYEE' && (
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.targetEmployee}</label>
                  <select
                    value={form.target_employee_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, target_employee_id: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                  >
                    <option value="">{ui.employeePlaceholder}</option>
                    {employees.map((item) => (
                      <option key={item.id} value={item.id}>{item.first_name} {item.last_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.summary}</label>
                <textarea
                  rows="3"
                  value={form.summary}
                  onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.content}</label>
                <textarea
                  required
                  rows="12"
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400"
                />
              </div>

              {form.article_type === 'POLICY' && (
                <label className={`md:col-span-2 flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm font-bold text-amber-700 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.require_ack}
                    onChange={(e) => setForm((prev) => ({ ...prev, require_ack: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {ui.requiredAck}
                </label>
              )}

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetFormState();
                    setIsCreateModalOpen(false);
                  }}
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-500"
                >
                  {ui.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-200"
                >
                  {ui.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {compareVersion && selectedArticle && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4" dir={isArabic ? 'rtl' : 'ltr'}>
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[2.5rem] bg-white p-6 shadow-2xl">
            <div className={`flex items-center justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <div className={isArabic ? 'text-right' : 'text-left'}>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{ui.compareTitle}</p>
                <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{selectedArticle.title}</h3>
              </div>
              <button
                onClick={() => setCompareVersion(null)}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500"
              >
                {ui.cancel}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
              {comparisonRows.map((row) => (
                <React.Fragment key={row.label}>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{row.label}</p>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${row.isDifferent ? 'border-cyan-200 bg-cyan-50' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-600">{ui.currentVersion}</p>
                    <div className={`mt-2 whitespace-pre-wrap text-sm font-bold text-slate-800 ${(row.label === ui.summary || row.label === ui.content) && row.isDifferent ? 'rounded-xl border border-cyan-200 bg-white px-3 py-3' : ''}`}>
                      {(row.label === ui.summary || row.label === ui.content) && row.isDifferent
                        ? renderComparedText(row.current, row.version, 'cyan')
                        : row.current}
                    </div>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${row.isDifferent ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-600">{ui.selectedVersion}</p>
                    <div className={`mt-2 whitespace-pre-wrap text-sm font-bold text-slate-800 ${(row.label === ui.summary || row.label === ui.content) && row.isDifferent ? 'rounded-xl border border-indigo-200 bg-white px-3 py-3' : ''}`}>
                      {(row.label === ui.summary || row.label === ui.content) && row.isDifferent
                        ? renderComparedText(row.version, row.current, 'indigo')
                        : row.version}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;

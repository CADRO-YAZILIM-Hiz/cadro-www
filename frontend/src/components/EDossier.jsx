import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom'; 
import { getEmployees, documentApi, getAbsoluteFileUrl } from '../api/axios';
import { FolderOpen, UploadCloud, FileText, Trash2, Search, CheckCircle, Clock, XCircle, Download, Users, ChevronDown, AlertTriangle, ShieldCheck, ShieldAlert, TimerReset } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast'; 
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi
import FilterPopover from './FilterPopover';

const EDossier = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası

  // 🌍 Dinamik toLocaleUpperCase ve RTL için dil tespiti
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';
  const emptyComplianceSummary = {
    profile: {
      country_profile: 'GLOBAL',
      role_profile: 'EMPLOYEE',
      is_foreign_worker: false,
      employee_status: 'ACTIVE',
    },
    summary: {
      completion_total: 0,
      completion_ready: 0,
      completion_percent: 100,
      missing_required_count: 0,
      expired_required_count: 0,
      expiring_required_count: 0,
      expired_documents_count: 0,
      expiring_documents_count: 0,
      alert_count: 0,
    },
    required_documents: [],
    missing_required_documents: [],
    expired_required_documents: [],
    expiring_required_documents: [],
    expired_documents: [],
    expiring_documents: [],
  };

  // 🌍 EVRAK TİPLERİNİ DİNAMİK ÇEVİRİYE BAĞLADIK
  const getDocumentTypes = () => [
    { id: 'KIMLIK', label: t('doc_id', 'KİMLİK / PASAPORT FOTOKOPİSİ') },
    { id: 'ON_IZIN', label: t('doc_pre_permit', 'ÖN İZİN EVRAKLARI (KKTC)') },
    { id: 'CALISMA_IZNI', label: t('doc_work_permit', 'ÇALIŞMA İZNİ & SAĞLIK RAPORU') },
    { id: 'IKAMET_BELGESI', label: t('doc_residency', 'İKAMET / ADRES TEYİT BELGESİ') },
    { id: 'VIZE', label: t('doc_visa', 'VİZE / OTURUM İZNİ') },
    { id: 'SOZLESME', label: t('doc_contract', 'İŞ SÖZLEŞMESİ (HİZMET AKDİ)') },
    { id: 'NDA', label: t('doc_nda', 'GİZLİLİK / NDA') },
    { id: 'HANDBOOK_ACK', label: t('doc_handbook_ack', 'EL KİTABI ONAYI') },
    { id: 'BACKGROUND_CHECK', label: t('doc_background_check', 'ARKA PLAN KONTROLÜ') },
    { id: 'ISG_EGITIM', label: t('doc_ohs_training', 'İSG EĞİTİM / SAĞLIK UYGUNLUK') },
    { id: 'BANKA_BILGISI', label: t('doc_bank_info', 'BANKA / IBAN BİLGİSİ') },
    { id: 'VERGI_BELGESI', label: t('doc_tax_doc', 'VERGİ / TIN BELGESİ') },
    { id: 'BORDRO', label: t('doc_payroll', 'MAAŞ BORDROSU') },
    { id: 'SOSYAL_GUVENLIK_KAYDI', label: t('doc_social_security_record', 'SOSYAL GÜVENLİK KAYDI') },
    { id: 'PERFORMANS_DEGERLENDIRME', label: t('doc_performance_review', 'PERFORMANS DEĞERLENDİRME') },
    { id: 'EGITIM_KAYDI', label: t('doc_training_record', 'EĞİTİM KAYDI') },
    { id: 'IZIN_BELGESI', label: t('doc_leave_record', 'İZİN / DEVAMSIZLIK BELGESİ') },
    { id: 'DISIPLIN_KAYDI', label: t('doc_disciplinary', 'DİSİPLİN KAYDI') },
    { id: 'ISTEN_CIKIS', label: t('doc_termination', 'İŞTEN AYRILMA (FESİH / İBRANAME)') },
    { id: 'EXIT_INTERVIEW', label: t('doc_exit_interview', 'ÇIKIŞ GÖRÜŞMESİ') },
    { id: 'ONBOARDING_CHECKLIST', label: t('doc_onboarding_checklist', 'ONBOARDING CHECKLIST') },
    { id: 'OFFBOARDING_CHECKLIST', label: t('doc_offboarding_checklist', 'OFFBOARDING CHECKLIST') },
    { id: 'SERTIFIKA', label: t('doc_certificate', 'SERTİFİKA & MESLEKİ EĞİTİM') },
    { id: 'DIGER', label: t('doc_other', 'DİĞER EVRAKLAR') }
  ];

  const DOCUMENT_TYPES = getDocumentTypes();
  const getDocumentHref = (document) => getAbsoluteFileUrl(document?.download_url || document?.file_path);
  const normalizeDocumentType = (value) => (value || '').toString().trim().toUpperCase();
  const getDocumentTypeLabel = (docType) => {
    const normalized = normalizeDocumentType(docType);
    const translatedMap = {
      KIMLIK: t('doc_id', 'KİMLİK / PASAPORT FOTOKOPİSİ'),
      'KIMLIK FOTOKOPISI': t('doc_id', 'KİMLİK / PASAPORT FOTOKOPİSİ'),
      'KİMLİK FOTOKOPİSİ': t('doc_id', 'KİMLİK / PASAPORT FOTOKOPİSİ'),
      ON_IZIN: t('doc_pre_permit', 'ÖN İZİN EVRAKLARI (KKTC)'),
      CALISMA_IZNI: t('doc_work_permit', 'ÇALIŞMA İZNİ & SAĞLIK RAPORU'),
      IKAMET_BELGESI: t('doc_residency', 'İKAMET / ADRES TEYİT BELGESİ'),
      VIZE: t('doc_visa', 'VİZE / OTURUM İZNİ'),
      'SAGLIK RAPORU': t('doc_work_permit', 'ÇALIŞMA İZNİ & SAĞLIK RAPORU'),
      SOZLESME: t('doc_contract', 'İŞ SÖZLEŞMESİ (HİZMET AKDİ)'),
      NDA: t('doc_nda', 'GİZLİLİK / NDA'),
      HANDBOOK_ACK: t('doc_handbook_ack', 'EL KİTABI ONAYI'),
      BACKGROUND_CHECK: t('doc_background_check', 'ARKA PLAN KONTROLÜ'),
      ISG_EGITIM: t('doc_ohs_training', 'İSG EĞİTİM / SAĞLIK UYGUNLUK'),
      BANKA_BILGISI: t('doc_bank_info', 'BANKA / IBAN BİLGİSİ'),
      VERGI_BELGESI: t('doc_tax_doc', 'VERGİ / TIN BELGESİ'),
      BORDRO: t('doc_payroll', 'MAAŞ BORDROSU'),
      SOSYAL_GUVENLIK_KAYDI: t('doc_social_security_record', 'SOSYAL GÜVENLİK KAYDI'),
      PERFORMANS_DEGERLENDIRME: t('doc_performance_review', 'PERFORMANS DEĞERLENDİRME'),
      EGITIM_KAYDI: t('doc_training_record', 'EĞİTİM KAYDI'),
      IZIN_BELGESI: t('doc_leave_record', 'İZİN / DEVAMSIZLIK BELGESİ'),
      DISIPLIN_KAYDI: t('doc_disciplinary', 'DİSİPLİN KAYDI'),
      'DIPLOMA': t('doc_certificate', 'SERTİFİKA & MESLEKİ EĞİTİM'),
      SERTIFIKA: t('doc_certificate', 'SERTİFİKA & MESLEKİ EĞİTİM'),
      'BANKA BILGISI': t('doc_bank_info', 'BANKA / IBAN BİLGİSİ'),
      EXIT_INTERVIEW: t('doc_exit_interview', 'ÇIKIŞ GÖRÜŞMESİ'),
      ONBOARDING_CHECKLIST: t('doc_onboarding_checklist', 'ONBOARDING CHECKLIST'),
      OFFBOARDING_CHECKLIST: t('doc_offboarding_checklist', 'OFFBOARDING CHECKLIST'),
      DIGER: t('doc_other', 'DİĞER EVRAKLAR'),
    };
    return translatedMap[normalized] || DOCUMENT_TYPES.find((item) => item.id === normalized)?.label || docType;
  };

  const parseSafeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getDaysUntil = (value) => {
    const target = parseSafeDate(value);
    if (!target) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryState = (value) => {
    const daysUntil = getDaysUntil(value);
    if (daysUntil === null) return null;
    if (daysUntil < 0) return 'expired';
    if (daysUntil <= 30) return 'expiring';
    return null;
  };

  const formatDisplayDate = (value) => {
    if (!value) return t('common_not_available', 'Yok');
    const parsed = parseSafeDate(value);
    if (!parsed) return value;
    return parsed.toLocaleDateString(locale);
  };

  const [searchParams] = useSearchParams(); 
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorFilterOpen, setSelectorFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [complianceSummary, setComplianceSummary] = useState(emptyComplianceSummary);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [documentHistory, setDocumentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('KIMLIK');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const userRole = localStorage.getItem('user_role');
  const userId = parseInt(localStorage.getItem('user_id')); 

  useEffect(() => {
    if (userRole !== 'EMPLOYEE') {
      fetchEmployees();
    } else {
      fetchSelf();
    }
  }, [userRole]); // 🌍 useEffect dependency güncellendi

  useEffect(() => {
    const targetEmpId = searchParams.get('emp_id');
    
    if (employees && employees.length > 0 && userRole !== 'EMPLOYEE') {
      if (targetEmpId) {
        const targetEmp = employees.find(e => e.id.toString() === targetEmpId);
        if (targetEmp) {
          setSelectedEmployee(targetEmp);
          return;
        }
      }

      if (selectedEmployee) return;

      const storedEmpId = localStorage.getItem('e_dossier_selected_employee_id');
      if (storedEmpId) {
        const storedEmp = employees.find((e) => e.id.toString() === storedEmpId);
        if (storedEmp) {
          setSelectedEmployee(storedEmp);
          return;
        }
      }

      setSelectedEmployee(employees[0]);
    }
  }, [employees, searchParams, userRole, selectedEmployee]);

  useEffect(() => {
    if (userRole !== 'EMPLOYEE' && selectedEmployee?.id) {
      localStorage.setItem('e_dossier_selected_employee_id', selectedEmployee.id.toString());
    }
  }, [selectedEmployee, userRole]);
  
  useEffect(() => {
    if (selectedEmployee) fetchDossierData(selectedEmployee.id);
  }, [selectedEmployee]);

  useEffect(() => {
    setSearchDraft(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    setFile(null);
    setSelectedType('KIMLIK');
    setDocumentNumber('');
    setIssuedBy('');
    setIssueDate('');
    setValidUntil('');
    setIsMandatory(false);
    const fileInput = document.getElementById('file-upload');
    if (fileInput) fileInput.value = null;
  }, [selectedEmployee?.id]);

  useEffect(() => {
    if (!documents.length) {
      setSelectedDocumentId(null);
      return;
    }
    if (!documents.some((doc) => doc.id === selectedDocumentId)) {
      setSelectedDocumentId(documents[0].id);
    }
  }, [documents, selectedDocumentId]);

  useEffect(() => {
    if (!selectedDocumentId) {
      setDocumentHistory([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const res = await documentApi.getHistory(selectedDocumentId);
        setDocumentHistory(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setDocumentHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [selectedDocumentId]);

  const fetchSelf = async () => {
    try {
      const myName = localStorage.getItem('user_name') || t('lbl_employee', "Personel");
      const [fName, ...restName] = myName.split(' ');
      const lName = restName.join(' ');

      setSelectedEmployee({
        id: userId,
        first_name: fName || t('lbl_first_name', "Ad"),
        last_name: lName || t('lbl_last_name', "Soyad")
      });
    } catch (err) { 
      toast.error(t('err_fetch_files', "Dosyalarınız çekilemedi.")); 
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await getEmployees();
      setEmployees(res.data || []);
    } catch (err) { 
        toast.error(t('err_fetch_emps', "Personeller çekilemedi.")); 
    }
  };

  const fetchDossierData = async (empId) => {
    setLoading(true);
    try {
      const [documentsRes, complianceRes] = await Promise.all([
        documentApi.getByEmployee(empId),
        documentApi.getComplianceSummary(empId),
      ]);
      setDocuments(Array.isArray(documentsRes.data) ? documentsRes.data : (documentsRes.data.documents || []));
      setComplianceSummary(complianceRes.data || emptyComplianceSummary);
    } catch (err) { 
        toast.error(t('err_fetch_docs', "Evraklar çekilemedi.")); 
        setComplianceSummary(emptyComplianceSummary);
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!file || !selectedEmployee) return;
    
    if (file.size > 10 * 1024 * 1024) {
        toast.error(t('err_file_size', "Dosya boyutu 10MB'dan büyük olamaz."));
        return;
    }

    const formData = new FormData();
    formData.append('employee_id', selectedEmployee.id); 
    formData.append('category', selectedType);
    formData.append('document_type', selectedType);
    formData.append('document_number', documentNumber);
    formData.append('issued_by', issuedBy);
    formData.append('issue_date', issueDate);
    formData.append('valid_until', validUntil);
    formData.append('is_mandatory', isMandatory ? 'true' : 'false');
    formData.append('file', file);

    setUploading(true);
    const tLoading = toast.loading(t('msg_uploading_doc', "Evrak arşive yükleniyor..."));

    try {
      await documentApi.upload(formData); 
      setFile(null);
      setDocumentNumber('');
      setIssuedBy('');
      setIssueDate('');
      setValidUntil('');
      setIsMandatory(false);
      fetchDossierData(selectedEmployee.id);
      
      document.getElementById('file-upload').value = null;
      
      if (userRole === 'EMPLOYEE') {
          toast.success(t('msg_upload_pending', "Evrak başarıyla yüklendi ve yönetici onayına sunuldu."), { id: tLoading });
      } else {
          toast.success(t('msg_upload_success', "Evrak başarıyla arşive eklendi."), { id: tLoading });
      }
    } catch (err) { 
        toast.error(err.response?.data?.detail || t('err_upload_failed', "Evrak yüklenirken hata oluştu."), { id: tLoading }); 
    }
    setUploading(false);
  };

  const handleUpdateStatus = async (docId, status) => {
    try {
      await documentApi.updateStatus(docId, status);
      const actionMsg = status === 'APPROVED' ? t('action_approved', 'Onaylandı') : t('action_rejected', 'Reddedildi');
      toast.success(
        t('msg_document_status_updated', "Evrak durumu {{status}} olarak güncellendi.").replace('{{status}}', actionMsg)
      );
      fetchDossierData(selectedEmployee.id);
    } catch (err) { 
        toast.error(t('err_document_status_update', "Evrak durumu güncellenemedi.")); 
    }
  };

  const handleDelete = async (docId, docStatus) => {
    if (userRole === 'EMPLOYEE' && docStatus !== 'PENDING') {
        toast.error(t('err_delete_pending_only', "Sadece onay bekleyen (PENDING) evraklarınızı silebilirsiniz."));
        return;
    }

    if (!window.confirm(t('msg_confirm_delete_doc', "Bu evrak kalıcı olarak silinecek. Emin misiniz?"))) return;
    
    try {
      await documentApi.delete(docId);
      toast.success(t('msg_delete_success', "Evrak başarıyla arşivden silindi."));
      fetchDossierData(selectedEmployee.id);
    } catch (err) { 
        toast.error(t('err_delete_failed', "Evrak silinemedi.")); 
    }
  };

  const filteredEmployees = employees.filter(e =>
    `${e.first_name} ${e.last_name} ${e.department || ''} ${e.position || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const summaryMeta = complianceSummary.summary || emptyComplianceSummary.summary;
  const requiredDocuments = complianceSummary.required_documents || [];
  const missingRequiredDocuments = complianceSummary.missing_required_documents || [];
  const expiredRequiredDocuments = complianceSummary.expired_required_documents || [];
  const expiringRequiredDocuments = complianceSummary.expiring_required_documents || [];
  const expiringSoonDocuments = complianceSummary.expiring_documents || [];
  const expiredDocuments = complianceSummary.expired_documents || [];
  const completionTotal = summaryMeta.completion_total ?? 0;
  const completionReady = summaryMeta.completion_ready ?? 0;
  const completionPercent = summaryMeta.completion_percent ?? 100;
  const selectedDocument = documents.find((doc) => doc.id === selectedDocumentId) || null;
  const tabs = [
    { id: 'documents', label: t('tab_uploaded_documents', 'YÜKLENMİŞ EVRAKLAR') },
    { id: 'upload', label: t('tab_upload_document', 'EVRAK YÜKLE') },
    { id: 'compliance', label: t('tab_compliance', 'UYUM ÖZETİ') },
  ];
  const dossierProfileLabel = t(
    `dossier_profile_${(complianceSummary.profile?.country_profile || 'GLOBAL').toLowerCase()}`,
    complianceSummary.profile?.country_profile || 'GLOBAL'
  );
  const getHistoryActionLabel = (action) => {
    const actionMap = {
      UPLOADED: t('dossier_history_uploaded', 'Yüklendi'),
      STATUS_UPDATED: t('dossier_history_status_updated', 'Durum Güncellendi'),
      DELETED: t('dossier_history_deleted', 'Silindi'),
    };
    return actionMap[action] || action;
  };

  const getDocumentStatusLabel = (status) => {
    const map = {
      PENDING: t('badge_pending_approval', 'ONAY BEKLİYOR'),
      APPROVED: t('badge_approved_doc', 'ONAYLI EVRAK'),
      REJECTED: t('badge_rejected_doc', 'REDDEDİLDİ'),
    };
    return map[status] || status || '-';
  };

  const getRoleLabel = (roleCode) => {
    if (!roleCode) return t('lbl_system_user', 'Sistem');
    return t(`role_${String(roleCode).toLowerCase()}`, roleCode);
  };

  const getHistoryDetailText = (item) => {
    if (item.detail && !String(item.detail).startsWith('status:')) return item.detail;
    if (item.action === 'STATUS_UPDATED' && item.new_status) {
      return t('msg_document_status_updated', 'Evrak durumu {{status}} olarak güncellendi.')
        .replace('{{status}}', getDocumentStatusLabel(item.new_status).toLowerCase());
    }
    if (item.action === 'UPLOADED') {
      return t('msg_upload_success', 'Evrak başarıyla arşive eklendi.');
    }
    if (item.action === 'DELETED') {
      return t('doc_deleted', 'Evrak başarıyla silindi');
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? "top-left" : "top-right"} />

      <div className="flex-1 flex flex-col gap-6 overflow-hidden pb-4">

        {/* ================= SAĞ PANEL: DİJİTAL DOSYA DOLABI ================= */}
        <div className="w-full bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col overflow-hidden">
          {!selectedEmployee ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8 uppercase font-bold tracking-widest text-sm">
              <FolderOpen className="mb-4 opacity-50" size={64} />
              <p className="text-center leading-relaxed" dangerouslySetInnerHTML={{__html: t('msg_select_emp_focus_html', "E-ÖZLÜK DOSYASINI GÖRMEK İÇİN<br/>ÖNCE BİR PERSONEL SEÇİNİZ.")}}></p>
            </div>
          ) : (
            <>
              {/* İÇERİK ALANI */}
              <div className={`flex-1 overflow-y-auto p-5 md:p-6 bg-slate-50/50 custom-scrollbar ${isArabic ? 'pl-2' : 'pr-2'}`}>
                <div className="bg-white p-4 rounded-[1.8rem] border border-slate-100 shadow-sm mb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,1.3fr)_220px_170px_170px_170px] gap-3 items-stretch">
                    <div className="min-w-0 bg-slate-50 border border-slate-100 rounded-[1.25rem] px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[1rem] bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0 uppercase shadow-sm">
                        {selectedEmployee ? `${selectedEmployee.first_name?.[0] || '?'}${selectedEmployee.last_name?.[0] || '?'}` : '??'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[16px] font-black text-slate-800 uppercase truncate tracking-tight">
                          {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : t('msg_no_employee_selected', 'Henüz personel seçilmedi')}
                        </p>
                        <p className="text-[12px] font-bold uppercase tracking-widest text-slate-400 mt-0.5 truncate">
                          {(selectedEmployee?.department || selectedEmployee?.position || t('lbl_employee', 'PERSONEL'))}
                        </p>
                      </div>
                    </div>

                    {userRole !== 'EMPLOYEE' ? (
                      <button
                        onClick={() => setIsSelectorOpen(true)}
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-[1.25rem] font-black text-[11px] tracking-[0.2em] flex items-center justify-center gap-2 uppercase shadow-sm hover:border-cyan-300 hover:text-cyan-600 hover:bg-cyan-50 transition-all active:scale-95"
                      >
                        <Users size={14} />
                        {selectedEmployee ? t('btn_change_employee_archive', 'PERSONEL DEĞİŞTİR') : t('btn_select_employee_archive', 'PERSONEL SEÇ')}
                        <ChevronDown size={14} />
                      </button>
                    ) : (
                      <div className="bg-slate-50 border border-slate-100 rounded-[1.25rem] px-4 py-3 flex items-center justify-center">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                          {t('lbl_my_dossier', 'KİŞİSEL E-ÖZLÜK ARŞİVİM')}
                        </p>
                      </div>
                    )}

                    <div className="bg-slate-50 border border-slate-100 rounded-[1.25rem] px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {t('lbl_completion_score', 'TAMAMLILIK SKORU')}
                      </p>
                      <div className="mt-1.5 flex items-end justify-between gap-3">
                        <p className="text-2xl font-black text-slate-800">{completionReady}/{completionTotal}</p>
                        <p className="text-[11px] font-black uppercase tracking-widest text-cyan-600">{completionPercent}%</p>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-[1.25rem] px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
                        {t('lbl_expiring_soon', 'YAKINDA SONA ERECEK')}
                      </p>
                      <p className="mt-1.5 text-2xl font-black text-amber-700">{summaryMeta.expiring_documents_count || 0}</p>
                    </div>

                    <div className={`${missingRequiredDocuments.length > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'} border rounded-[1.25rem] px-4 py-3`}>
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${missingRequiredDocuments.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {t('lbl_missing_required', 'EKSİK ZORUNLU')}
                      </p>
                      <div className="mt-1.5 flex items-end justify-between gap-2">
                        <p className={`text-2xl font-black ${missingRequiredDocuments.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{summaryMeta.missing_required_count || 0}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{dossierProfileLabel}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[1.8rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-4 pt-4 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex flex-wrap gap-2">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 rounded-t-[1rem] text-[12px] font-black uppercase tracking-[0.2em] transition-all border ${
                            activeTab === tab.id
                              ? 'bg-white text-cyan-600 border-slate-200 border-b-white'
                              : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'
                          }`}
                        >
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 md:p-6">
                    {activeTab === 'documents' && (
                      <div className="grid grid-cols-1 xl:grid-cols-[minmax(360px,1fr)_minmax(0,1.2fr)] gap-4 items-start">
                        <div className="rounded-[1.6rem] border border-slate-100 overflow-hidden">
                          {loading ? (
                            <div className="text-center py-10 font-black text-sm text-slate-400 uppercase tracking-widest">{t('msg_searching_docs', 'Evraklar aranıyor...')}</div>
                          ) : documents.length === 0 ? (
                            <div className="text-center py-16 px-6 bg-white">
                              <FolderOpen size={48} className="mx-auto mb-4 text-slate-300"/>
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t('msg_no_docs_found', 'Bu personelin dosyasında henüz evrak bulunmuyor.')}</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {documents.map((doc) => (
                                <button
                                  key={doc.id}
                                  onClick={() => setSelectedDocumentId(doc.id)}
                                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${selectedDocumentId === doc.id ? 'bg-cyan-50/70' : 'bg-white hover:bg-slate-50'}`}
                                >
                                  <div className={`w-9 h-9 rounded-[0.9rem] flex items-center justify-center shrink-0 border ${doc.status === 'PENDING' ? 'bg-amber-50 text-amber-500 border-amber-100' : doc.status === 'REJECTED' ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                                    <FileText size={16} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-50 px-1.5 py-1 rounded-md border border-cyan-100 shadow-sm">
                                    {getDocumentTypeLabel(doc.document_type)}
                                  </span>
                                      {doc.status === 'PENDING' && <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">{t('badge_pending_approval', 'ONAY BEKLİYOR')}</span>}
                                      {doc.status === 'APPROVED' && <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">{t('badge_approved_doc', 'ONAYLI EVRAK')}</span>}
                                      {doc.status === 'REJECTED' && <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">{t('badge_rejected_doc', 'REDDEDİLDİ')}</span>}
                                    </div>
                                    <p className="text-[13px] font-black text-slate-800 truncate">{doc.file_name}</p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {doc.document_number ? <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{t('lbl_doc_number_short', 'NO')}: {doc.document_number}</span> : null}
                                      {doc.expiry_date ? <span className={`text-[11px] font-bold uppercase tracking-widest ${getExpiryState(doc.expiry_date) === 'expired' ? 'text-rose-500' : getExpiryState(doc.expiry_date) === 'expiring' ? 'text-amber-500' : 'text-slate-400'}`}>{formatDisplayDate(doc.expiry_date)}</span> : null}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-[1.6rem] border border-slate-100 bg-white p-5">
                          {selectedDocument ? (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl"><FileText size={16}/></div>
                                <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-[0.2em]">
                                  {t('lbl_document_detail', 'EVRAK DETAYI')}
                                </h4>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2 py-1 rounded-md border border-cyan-100 shadow-sm">
                                  {getDocumentTypeLabel(selectedDocument.document_type)}
                                </span>
                                {selectedDocument.status === 'PENDING' && <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">{t('badge_pending_approval', 'ONAY BEKLİYOR')}</span>}
                                {selectedDocument.status === 'APPROVED' && <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">{t('badge_approved_doc', 'ONAYLI EVRAK')}</span>}
                                {selectedDocument.status === 'REJECTED' && <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-2 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">{t('badge_rejected_doc', 'REDDEDİLDİ')}</span>}
                                {getExpiryState(selectedDocument.expiry_date) === 'expiring' && <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">{t('badge_expiring_soon', 'YAKINDA BİTİYOR')}</span>}
                                {getExpiryState(selectedDocument.expiry_date) === 'expired' && <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">{t('badge_expired', 'SÜRESİ DOLDU')}</span>}
                              </div>
                              <a href={getDocumentHref(selectedDocument)} target="_blank" rel="noreferrer" className="block text-[20px] font-black text-slate-800 hover:text-cyan-600 truncate">
                                {selectedDocument.file_name}
                              </a>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 px-4 py-3">
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('lbl_doc_number', 'BELGE NO')}</p>
                                  <p className="mt-1 text-[16px] font-black text-slate-700">{selectedDocument.document_number || t('common_not_available', 'Yok')}</p>
                                </div>
                                <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 px-4 py-3">
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('lbl_doc_issued_by', 'VEREN KURUM')}</p>
                                  <p className="mt-1 text-[16px] font-black text-slate-700">{selectedDocument.issued_by || t('common_not_available', 'Yok')}</p>
                                </div>
                                <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 px-4 py-3">
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('lbl_doc_issue_date', 'DÜZENLENME TARİHİ')}</p>
                                  <p className="mt-1 text-[16px] font-black text-slate-700">{formatDisplayDate(selectedDocument.issue_date)}</p>
                                </div>
                                <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50 px-4 py-3">
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('lbl_doc_valid_until', 'GEÇERLİLİK TARİHİ')}</p>
                                  <p className="mt-1 text-[16px] font-black text-slate-700">{formatDisplayDate(selectedDocument.expiry_date)}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <a href={getDocumentHref(selectedDocument)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-cyan-500 transition-all">
                                  <Download size={14} />
                                  {t('tooltip_view_doc', 'Evrakı Görüntüle')}
                                </a>
                                {(userRole !== 'EMPLOYEE' || (userRole === 'EMPLOYEE' && selectedDocument.status === 'PENDING')) && (
                                  <button onClick={() => handleDelete(selectedDocument.id, selectedDocument.status)} className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all">
                                    <Trash2 size={14} />
                                    {t('tooltip_delete_archive', 'Arşivden Sil')}
                                  </button>
                                )}
                              </div>
                              {["HR", "ADMIN", "SUPERADMIN"].includes(userRole) && selectedDocument.status === 'PENDING' && (
                                <div className="flex gap-2 pt-2">
                                  <button onClick={() => handleUpdateStatus(selectedDocument.id, 'APPROVED')} className="flex-1 text-[11px] tracking-widest bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 py-2.5 rounded-xl font-black uppercase transition-all flex items-center justify-center gap-2 shadow-sm"><CheckCircle size={14}/> {t('btn_approve', 'ONAYLA')}</button>
                                  <button onClick={() => handleUpdateStatus(selectedDocument.id, 'REJECTED')} className="flex-1 text-[11px] tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-200 py-2.5 rounded-xl font-black uppercase transition-all flex items-center justify-center gap-2 shadow-sm"><XCircle size={14}/> {t('btn_reject', 'REDDET')}</button>
                                </div>
                              )}

                              <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50 px-4 py-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">{t('lbl_document_action_history', 'EVRAK AKSİYON GEÇMİŞİ')}</p>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {documentHistory.length} {t('lbl_items', 'adet')}
                                  </span>
                                </div>
                                <div className="mt-3 space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                                  {historyLoading ? (
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{t('msg_loading_document_history', 'Geçmiş yükleniyor...')}</p>
                                  ) : documentHistory.length === 0 ? (
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{t('msg_no_document_history', 'Bu evrak için henüz aksiyon geçmişi yok.')}</p>
                                  ) : (
                                    documentHistory.map((item) => (
                                      <div key={item.id} className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-slate-900 text-white">
                                            {getHistoryActionLabel(item.action)}
                                          </span>
                                          {item.new_status ? (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600">
                                              {item.previous_status ? `${getDocumentStatusLabel(item.previous_status)} -> ${getDocumentStatusLabel(item.new_status)}` : getDocumentStatusLabel(item.new_status)}
                                            </span>
                                          ) : null}
                                        </div>
                                        <p className="mt-2 text-[12px] font-bold text-slate-700">
                                          {item.actor_name || t('lbl_system_user', 'Sistem')} • {getRoleLabel(item.actor_role)} • {formatDisplayDate(item.created_at)}
                                        </p>
                                        {getHistoryDetailText(item) ? (
                                          <p className="mt-1 text-[11px] font-semibold text-slate-500">{getHistoryDetailText(item)}</p>
                                        ) : null}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50 px-4 py-12 text-center">
                              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400">
                                {t('msg_select_doc_for_detail', 'DETAYI GÖRMEK İÇİN BİR EVRAK SEÇİN')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === 'upload' && (
                      <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl"><UploadCloud size={16}/></div>
                          <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-[0.2em]">
                            {t('lbl_upload_new_doc', 'SİSTEME YENİ EVRAK YÜKLE')}
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <label className={`block text-[11px] font-black tracking-widest text-slate-400 mb-2 uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_doc_category', 'EVRAK KATEGORİSİ')} <span className="text-rose-500">*</span></label>
                            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className={`w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] px-4 py-3.5 text-[12px] font-black text-slate-700 outline-none focus:border-cyan-500 shadow-sm appearance-none cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}>
                              {DOCUMENT_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                            </select>
                          </div>
                          <div className="min-w-0">
                            <label className={`block text-[11px] font-black tracking-widest text-slate-400 mb-2 uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_select_file_format', 'DOSYA SEÇİN (PDF / RESİM)')} <span className="text-rose-500">*</span></label>
                            <input type="file" accept=".pdf, .png, .jpg, .jpeg, .doc, .docx" onChange={(e) => setFile(e.target.files[0])} className="hidden" id="file-upload"/>
                            <label htmlFor="file-upload" className={`w-full cursor-pointer border-2 border-dashed bg-white rounded-[1.25rem] px-4 py-3.5 text-[12px] font-black flex items-center justify-center gap-2 transition-all uppercase tracking-widest ${file ? 'border-cyan-400 text-cyan-600 bg-cyan-50' : 'border-slate-300 text-slate-500 hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50'}`}>
                              {file ? <CheckCircle size={16}/> : <FileText size={16}/>}
                              {file ? file.name : t('btn_choose_from_pc', "BİLGİSAYARDAN DOSYA SEÇİN")}
                            </label>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
                          <div className="min-w-0">
                            <label className={`block text-[11px] font-black tracking-widest text-slate-400 mb-2 uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_doc_number', 'BELGE NO')}</label>
                            <input type="text" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value.toUpperCase())} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] px-3.5 py-3 text-[11px] font-black text-slate-700 outline-none focus:border-cyan-500 shadow-sm" />
                          </div>
                          <div className="min-w-0">
                            <label className={`block text-[11px] font-black tracking-widest text-slate-400 mb-2 uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_doc_issued_by', 'VEREN KURUM')}</label>
                            <input type="text" value={issuedBy} onChange={(e) => setIssuedBy(e.target.value.toUpperCase())} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] px-3.5 py-3 text-[11px] font-black text-slate-700 outline-none focus:border-cyan-500 shadow-sm" />
                          </div>
                          <label className="flex items-center gap-3 px-3.5 py-3 bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} className="w-4 h-4 accent-cyan-500 rounded-md" />
                            {t('lbl_doc_mandatory', 'ZORUNLU EVRAK')}
                          </label>
                          <div>
                            <label className={`block text-[11px] font-black tracking-widest text-slate-400 mb-2 uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_doc_issue_date', 'DÜZENLENME TARİHİ')}</label>
                            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] px-3.5 py-3 text-[11px] font-black text-slate-700 outline-none focus:border-cyan-500 shadow-sm" />
                          </div>
                          <div>
                            <label className={`block text-[11px] font-black tracking-widest text-slate-400 mb-2 uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_doc_valid_until', 'GEÇERLİLİK TARİHİ')}</label>
                            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] px-3.5 py-3 text-[11px] font-black text-slate-700 outline-none focus:border-cyan-500 shadow-sm" />
                          </div>
                          <div className="flex items-end">
                            <button onClick={handleUpload} disabled={!file || uploading} className="bg-slate-900 text-white px-5 py-3 rounded-[1.25rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-cyan-500 disabled:opacity-50 transition-all active:scale-95 w-full h-[46px]">
                              {uploading ? t('btn_uploading', "YÜKLENİYOR...") : t('btn_upload_to_archive', "ARŞİVE YÜKLE")}
                            </button>
                          </div>
                        </div>
                        <p className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_max_file_size', 'Maksimum Dosya Boyutu: 10MB')}</p>
                      </div>
                    )}

                    {activeTab === 'compliance' && (
                      <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl"><ShieldCheck size={16} /></div>
                          <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-[0.2em]">
                            {t('lbl_dossier_compliance', 'EVRAK UYUM ÖZETİ')}
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                          <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('lbl_completion_score', 'TAMAMLILIK SKORU')}</p>
                            <div className="mt-2 flex items-end justify-between gap-3">
                              <p className="text-2xl font-black text-slate-800">{completionPercent}%</p>
                              <p className="text-[11px] font-black uppercase tracking-widest text-cyan-600">{completionReady}/{completionTotal}</p>
                            </div>
                          </div>
                          <div className="rounded-[1.25rem] border border-amber-100 bg-amber-50/70 px-4 py-3">
                            <div className="flex items-center gap-2 text-amber-600">
                              <TimerReset size={14} />
                              <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t('lbl_expiring_soon', 'YAKINDA SONA ERECEK')}</p>
                            </div>
                            <p className="mt-2 text-2xl font-black text-amber-700">{summaryMeta.expiring_documents_count || 0}</p>
                          </div>
                          <div className="rounded-[1.25rem] border border-rose-100 bg-rose-50/70 px-4 py-3">
                            <div className="flex items-center gap-2 text-rose-600">
                              <ShieldAlert size={14} />
                              <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t('lbl_expired_docs', 'SÜRESİ DOLAN')}</p>
                            </div>
                            <p className="mt-2 text-2xl font-black text-rose-700">{summaryMeta.expired_documents_count || 0}</p>
                          </div>
                          <div className="rounded-[1.25rem] border border-indigo-100 bg-indigo-50/70 px-4 py-3">
                            <div className="flex items-center gap-2 text-indigo-600">
                              <AlertTriangle size={14} />
                              <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t('lbl_missing_required', 'EKSİK ZORUNLU')}</p>
                            </div>
                            <div className="mt-2 flex items-end justify-between gap-3">
                              <p className="text-2xl font-black text-indigo-700">{summaryMeta.missing_required_count || 0}</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{dossierProfileLabel}</p>
                            </div>
                          </div>
                        </div>

                        <div className={`mt-4 rounded-[1.35rem] border px-4 py-3 ${missingRequiredDocuments.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 ${missingRequiredDocuments.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {missingRequiredDocuments.length > 0 ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${missingRequiredDocuments.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {missingRequiredDocuments.length > 0 ? t('msg_missing_required_docs', 'EKSİK ZORUNLU EVRAKLAR') : t('msg_all_required_docs_ready', 'ZORUNLU EVRAKLAR TAMAM')}
                              </p>
                              {missingRequiredDocuments.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {missingRequiredDocuments.map((item) => (
                                    <span key={item.document_type} className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white text-amber-700 border border-amber-200">
                                      {getDocumentTypeLabel(item.document_type)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[12px] font-bold text-emerald-700 mt-1">
                                  {t('msg_dossier_compliant', 'Bu arşivde tanımlı zorunlu evraklar şu an eksiksiz görünüyor.')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {(expiredRequiredDocuments.length > 0 || expiringRequiredDocuments.length > 0) && (
                          <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                            <div className={`rounded-[1.35rem] border px-4 py-3 ${expiredRequiredDocuments.length > 0 ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50'}`}>
                              <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${expiredRequiredDocuments.length > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                                {t('lbl_expired_required_docs', 'SÜRESİ DOLAN ZORUNLU EVRAKLAR')}
                              </p>
                              {expiredRequiredDocuments.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {expiredRequiredDocuments.map((item) => (
                                    <span key={item.document_type} className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white text-rose-700 border border-rose-200">
                                      {getDocumentTypeLabel(item.document_type)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[12px] font-bold text-slate-500 mt-1">{t('msg_no_expired_required_docs', 'Zorunlu belgelerde süresi dolmuş kayıt görünmüyor.')}</p>
                              )}
                            </div>

                            <div className={`rounded-[1.35rem] border px-4 py-3 ${expiringRequiredDocuments.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
                              <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${expiringRequiredDocuments.length > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                                {t('lbl_expiring_required_docs', 'YAKINDA BİTECEK ZORUNLU EVRAKLAR')}
                              </p>
                              {expiringRequiredDocuments.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {expiringRequiredDocuments.map((item) => (
                                    <span key={item.document_type} className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white text-amber-700 border border-amber-200">
                                      {getDocumentTypeLabel(item.document_type)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[12px] font-bold text-slate-500 mt-1">{t('msg_no_expiring_required_docs', 'Yakında bitecek zorunlu evrak görünmüyor.')}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {requiredDocuments.length > 0 && (
                          <div className="mt-4 rounded-[1.35rem] border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">
                              {t('lbl_country_role_rule_set', 'ÜLKE / ROL KURAL SETİ')}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {requiredDocuments.map((item) => (
                                <span
                                  key={`${item.document_type}-${item.reason_code}`}
                                  className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                                    item.status === 'READY'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : item.status === 'EXPIRING'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : item.status === 'EXPIRED'
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : 'bg-white text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {getDocumentTypeLabel(item.document_type)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {userRole !== 'EMPLOYEE' && isSelectorOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-3 uppercase tracking-widest">
                  <div className="p-2 bg-cyan-100 text-cyan-600 rounded-xl"><FolderOpen size={18}/></div>
                  {t('lbl_archive_selection', 'ARŞİV SEÇİMİ')}
                </h3>
                <button onClick={() => setIsSelectorOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white transition-all">
                  <XCircle size={20} />
                </button>
              </div>
              <FilterPopover
                label={t('lbl_search', 'Arama')}
                open={selectorFilterOpen}
                active={Boolean(searchTerm)}
                onToggle={() => setSelectorFilterOpen((prev) => !prev)}
                onReset={() => setSearchDraft('')}
                onCancel={() => { setSearchDraft(searchTerm); setSelectorFilterOpen(false); }}
                onApply={() => { setSearchTerm(searchDraft); setSelectorFilterOpen(false); }}
                align={isArabic ? 'left' : 'right'}
                panelWidthClass="w-[320px]"
              >
                <div className="relative">
                  <Search className={`absolute ${isArabic ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-cyan-500`} size={14} />
                  <input
                    type="text"
                    placeholder={t('ph_search_emp', "İsim veya departman ara...")}
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    className={`w-full ${isArabic ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold outline-none focus:border-cyan-500 transition-all text-slate-700`}
                  />
                </div>
              </FilterPopover>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEmployees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setIsSelectorOpen(false);
                    }}
                    className={`w-full ${isArabic ? 'text-right' : 'text-left'} p-4 rounded-2xl transition-all flex items-center gap-4 ${selectedEmployee?.id === emp.id ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-200 border border-cyan-400' : 'bg-white text-slate-700 border border-slate-100 hover:border-cyan-200 hover:shadow-md'}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${selectedEmployee?.id === emp.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}>
                        <p className={`font-black text-sm uppercase truncate tracking-tight ${emp.pending_document_count > 0 ? 'text-amber-500' : emp.has_documents ? 'text-cyan-600' : ''}`}>
                          {emp.first_name?.toLocaleUpperCase(locale)} {emp.last_name?.toLocaleUpperCase(locale)}
                        </p>
                        {emp.pending_document_count > 0 ? (
                          <span className="text-[8px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200 px-2 py-1 rounded-full shadow-sm" dir="ltr">
                            {emp.pending_document_count}
                          </span>
                        ) : emp.has_documents ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/50 shrink-0"></span>
                        ) : null}
                      </div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest truncate mt-1 ${selectedEmployee?.id === emp.id ? 'text-cyan-100' : 'text-slate-400'}`}>
                        {(emp.department || t('lbl_employee', 'PERSONEL')).toLocaleUpperCase(locale)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EDossier;

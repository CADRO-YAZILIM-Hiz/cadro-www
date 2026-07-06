import React, { useEffect, useState, useRef, useMemo } from 'react'; 
import api, { employeeApi, reportApi, profileApi } from '../api/axios'; 
import { 
  UserPlus, X, User, Briefcase, CreditCard, ShieldCheck, 
  Building2, Trash2, Edit3, Mail, GraduationCap, 
  Heart, Baby, CheckCircle, Smartphone, Archive, Network, Droplet,
  ChevronRight, ChevronLeft, Save, FileText, Download, Key, IdCard, Search,
  ChevronDown, ChevronUp, Bell, Check, XCircle 
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

const userRole = localStorage.getItem('user_role') || "EMPLOYEE";
const isHR = ["SUPERADMIN", "ADMIN", "HR"].includes(userRole);

const InputGroup = ({ label, name, type = "text", onChange, value, required = false, placeholder, min, isArabic, disabled = false, readOnly = false }) => (
  <div className="flex flex-col gap-1.5 w-full font-sans">
    <label className={`text-[11px] font-bold text-slate-500 tracking-wider text-left uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <input 
      type={type} name={name} required={required} value={value || ""} onChange={onChange} placeholder={placeholder} min={min} disabled={disabled} readOnly={readOnly}
      className={`w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] outline-none focus:border-indigo-500 font-semibold text-slate-700 text-sm shadow-sm transition-all placeholder:text-slate-300 disabled:opacity-70 disabled:cursor-not-allowed read-only:bg-slate-100 ${type === 'email' || type === 'number' || type === 'date' ? 'dir-ltr text-left' : ''}`} 
    />
  </div>
);

const EmployeeList = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası

  // 🌍 Dinamik toLocaleUpperCase ve RTL için dil tespiti
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';
  const localizedNumber = (value, options = {}) => {
    return localizeDigits(value, i18n.language, options);
  };

  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [positions, setPositions] = useState([]); 
  const [departments, setDepartments] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ACTIVE"); 
  const [editId, setEditId] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [openFilterMenu, setOpenFilterMenu] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const formRef = useRef(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState(t('lbl_default_report_title', "Personel Listesi ve İSG Raporu"));
  
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false);

  const [expandedDepts, setExpandedDepts] = useState([]);
  const [deptStateInitialized, setDeptStateInitialized] = useState(false);
  
  // 🌍 Rapor sütunlarını dile göre gösterip backend için sabit anahtarlarla taşıyoruz
  const availableColumns = useMemo(() => ([
    { key: 'Ad Soyad', label: t('col_fullname', "Ad Soyad") },
    { key: 'TC/Kimlik No', label: t('col_identity', "TC/Kimlik No") },
    { key: 'Departman', label: t('col_department', "Departman") },
    { key: 'Kadro', label: t('col_position', "Kadro") },
    { key: 'Kan Grubu', label: t('col_blood_type', "Kan Grubu") },
    { key: 'Telefon', label: t('col_phone', "Telefon") },
    { key: 'E-Posta', label: t('col_email', "E-Posta") },
    { key: 'İşe Giriş', label: t('col_hire_date', "İşe Giriş") },
    { key: 'Eğitim', label: t('col_education', "Eğitim") },
    { key: 'Uyruk', label: t('col_nationality', "Uyruk") }
  ]), [t]);
  
  const [selectedColumns, setSelectedColumns] = useState([
    'Ad Soyad',
    'Departman',
    'Kan Grubu',
    'Telefon'
  ]);

  const initialState = {
    company_id: "", department_id: "", position_id: "", first_name: "", last_name: "", email: "", phone: "",
    identity_no: "", mother_name: "", father_name: "", birth_place: "", birth_date: "",
    gender: t('opt_male', "Erkek"), blood_type: t('opt_unknown', "Bilinmiyor"), address: "", emergency_contact_name: "", emergency_contact_relation: "", emergency_contact_phone: "", social_security_no: "", provident_fund_no: "", 
    nationality: "", is_married: false, spouse_name: "", spouse_works: false, children_count: 0, 
    children_names: [], education_level: t('opt_university', "Üniversite"), hire_date: new Date().toISOString().split('T')[0],
    gross_salary: "", salary_currency: "TRY", bank_name: "", iban: "", account_holder_name: "", tax_id_number: "",
    work_authorization_type: "", work_authorization_no: "", work_authorization_start_date: "", work_authorization_expiry_date: "",
    visa_type: "", visa_expiry_date: "", nda_signed_at: "", handbook_ack_signed_at: "", background_check_status: "NOT_STARTED",
    background_check_completed_at: "", occupational_health_status: "NOT_STARTED", occupational_health_valid_until: "",
    status: "ACTIVE", role: "EMPLOYEE" 
  };

  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    setSearchDraft(searchTerm);
  }, [searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, compRes, posRes, deptRes] = await Promise.all([
        api.get(`/employee/list?status=${activeTab}`),
        api.get('/company/list'),
        employeeApi.getPositions(),
        api.get('/employee/department/list') 
      ]);
      setEmployees(empRes.data || []);
      setCompanies(compRes.data || []);
      setPositions(posRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (err) { 
      toast.error(t('err_fetch_data', "Veri çekme hatası oluştu.")); 
      console.error(err); 
    }
    setLoading(false);
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await profileApi.getRequests('PENDING');
      setPendingRequests(res.data || []);
    } catch (error) {
      console.error("Onaylar çekilemedi", error);
    }
  };

  useEffect(() => { 
    fetchData(); 
    fetchPendingRequests(); 
  }, [activeTab]);

  useEffect(() => {
    setDeptStateInitialized(false);
    setSearchTerm("");
  }, [activeTab]);

  const filteredEmployees = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase(locale);
    if (!query) return employees;

    return employees.filter(emp => {
      const haystack = [
        emp.first_name,
        emp.last_name,
        emp.email,
        emp.phone,
        emp.department,
        emp.position
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase(locale);

      return haystack.includes(query);
    });
  }, [employees, searchTerm, locale]);

  const groupedEmployees = useMemo(() => {
    const groups = filteredEmployees.reduce((acc, emp) => {
      const deptName = emp.department || t('lbl_unassigned_dept', "Unassigned Roles");
      const cleanDept = deptName.toLocaleUpperCase(locale);
      
      if (!acc[cleanDept]) acc[cleanDept] = [];
      acc[cleanDept].push(emp);
      return acc;
    }, {});

    return groups;
  }, [filteredEmployees, locale, t]);

  useEffect(() => {
    const deptKeys = Object.keys(groupedEmployees);

    if (!deptStateInitialized) {
      setExpandedDepts(deptKeys);
      setDeptStateInitialized(true);
      return;
    }

    setExpandedDepts(prev => prev.filter(dept => deptKeys.includes(dept)));
  }, [groupedEmployees, deptStateInitialized]);

  const toggleDept = (dept) => {
    setExpandedDepts(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const openModalForNew = () => {
    setEditId(null);
    setIsViewMode(false);
    setFormData(initialState);
    setFormStep(1);
    setIsModalOpen(true);
  };

  const handleEdit = async (emp) => {
    const tLoading = toast.loading(t('msg_opening_dossier', "Özlük dosyası açılıyor..."));
    try {
      const response = await api.get(`/employee/${emp.id}`);
      const fullEmpData = response.data;

      setEditId(fullEmpData.id);
      setIsViewMode(fullEmpData.status === "INACTIVE");
      
      let parsedChildren = [];
      if (fullEmpData.children_names) {
        try { parsedChildren = JSON.parse(fullEmpData.children_names); } catch { parsedChildren = []; }
      }

      setFormData({ 
        ...initialState, 
        ...fullEmpData, 
        department_id: fullEmpData.department_id || "", 
        position_id: fullEmpData.position_id || "", 
        role: fullEmpData.role || "EMPLOYEE",
        background_check_status: fullEmpData.background_check_status || "NOT_STARTED",
        occupational_health_status: fullEmpData.occupational_health_status || "NOT_STARTED",
        children_names: parsedChildren 
      });

      setFormStep(1);
      toast.dismiss(tLoading);
      setIsModalOpen(true);
    } catch (error) {
      toast.error(t('err_loading_emp_details', "Personel detayları yüklenirken bir hata oluştu."), { id: tLoading });
    }
  };

  const handleTerminateInitiate = async (emp) => {
    const exitDate = prompt(t('prompt_exit_date', "İşten çıkış tarihi (YYYY-MM-DD):"), new Date().toISOString().split('T')[0]);
    if (!exitDate) return;
    
    const confirmMsg = t('msg_confirm_archive', "{{name}} isimli personeli arşivlemek istediğinize emin misiniz?").replace('{{name}}', `${emp.first_name} ${emp.last_name}`);
    if (!window.confirm(confirmMsg)) return;

    const tLoading = toast.loading(t('msg_archiving_emp', "Personel arşivleniyor..."));
    try {
      await api.put(`/employee/terminate/${emp.id}`, { exit_date: exitDate });
      toast.success(t('msg_archive_success', "Personel başarıyla arşivlendi ve kadrosu boşaltıldı."), { id: tLoading });
      fetchData();
    } catch (err) { 
      toast.error(err.response?.data?.detail || t('err_archive_failed', "Üzerinde zimmet/masraf olabilir, arşivlenemedi."), { id: tLoading }); 
    }
  };

  const handleResetPassword = async (emp) => {
    const confirmMsg = t('msg_confirm_reset_pwd', "{{name}} isimli personelin şifresini sıfırlamak istediğinize emin misiniz?").replace('{{name}}', `${emp.first_name} ${emp.last_name}`);
    if (window.confirm(confirmMsg)) {
      const tLoading = toast.loading(t('msg_resetting_pwd', "Şifre sıfırlanıyor..."));
      try {
        const response = await api.post(`/employee/${emp.id}/reset-password`);
        toast.success(t('msg_reset_success', "Şifre başarıyla sıfırlandı. (Mail gönderildi)"), { id: tLoading });
        alert(response.data.message); 
      } catch (err) {
        toast.error(t('err_reset_failed', "Şifre sıfırlanırken bir hata oluştu."), { id: tLoading });
      }
    }
  };

  const handleChildrenCountChange = (e) => {
    const count = parseInt(e.target.value) || 0;
    let newNames = [...formData.children_names];
    if (count > newNames.length) {
      for (let i = newNames.length; i < count; i++) newNames.push("");
    } else {
      newNames = newNames.slice(0, count);
    }
    setFormData({...formData, children_count: count, children_names: newNames});
  };

  const handleChildNameChange = (index, value) => {
    const newNames = [...formData.children_names];
    newNames[index] = value;
    setFormData({...formData, children_names: newNames});
  };

  const handleNextStep = () => {
    if (formRef.current && !formRef.current.reportValidity()) return;
    setFormStep(prev => Math.min(4, prev + 1));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (formRef.current && !formRef.current.reportValidity()) return; 

    const payload = { 
      ...formData, 
      company_id: formData.company_id ? parseInt(formData.company_id) : null, 
      department_id: formData.department_id ? parseInt(formData.department_id) : null,
      position_id: formData.position_id ? parseInt(formData.position_id) : null,
      gross_salary: formData.gross_salary ? parseFloat(formData.gross_salary) : 0,
      iban: formData.iban ? formData.iban.replace(/\s+/g, '').toUpperCase() : "",
      children_count: parseInt(formData.children_count || 0),
      children_names: JSON.stringify(formData.children_names) 
    };

    const tLoading = toast.loading(t('msg_processing_record', "Özlük kaydı işleniyor..."));
    try {
      if (editId) {
        await api.put(`/employee/${editId}`, payload);
        toast.success(t('msg_update_success', "Kayıt başarıyla güncellendi."), { id: tLoading });
      } else {
        await api.post('/employee/create', payload); 
        toast.success(t('msg_create_success', "Personel başarıyla sisteme eklendi."), { id: tLoading });
      }
      setIsModalOpen(false); 
      setFormData(initialState); 
      fetchData();
    } catch (err) { 
      toast.error(err.response?.data?.detail || t('err_save_failed', "Kaydedilemedi. Girdiğiniz verileri kontrol ediniz."), { id: tLoading, duration: 5000 }); 
    }
  };

  const downloadPdf = async (apiCall, defaultFilename) => {
    const tLoading = toast.loading(t('msg_preparing_pdf', "PDF Belgesi hazırlanıyor..."));
    try {
      const response = await apiCall();
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      
      let filename = defaultFilename;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
          const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
          if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('msg_download_success', "Belge indirildi."), { id: tLoading });
    } catch (error) {
      toast.error(t('err_pdf_failed', "PDF oluşturulurken bir hata oluştu!"), { id: tLoading });
    }
  };

  const filteredPositions = useMemo(() => {
    if (!formData.department_id) return [];
    return positions.filter(pos => pos.department_id === parseInt(formData.department_id));
  }, [formData.department_id, positions]);

  const handleGenerateDynamicReport = async () => {
    if (selectedColumns.length === 0) {
        toast.error(t('err_select_column', "Lütfen en az 1 sütun seçiniz."));
        return;
    }
    
    const tLoading = toast.loading(t('msg_generating_report', "Özel raporunuz oluşturuluyor..."));
    try {
        const payload = { columns: selectedColumns, title: reportTitle };
        const response = await api.post('/report/dynamic', payload, { responseType: 'blob' });
        
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        
        let filename = `${reportTitle.replace(/\s+/g, '_')}.pdf`;
        const disposition = response.headers['content-disposition'];
        if (disposition && disposition.indexOf('filename=') !== -1) {
            const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
            if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
        }
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        toast.success(t('msg_report_downloaded', "Rapor başarıyla indirildi."), { id: tLoading });
        setIsReportModalOpen(false); 
    } catch (error) {
        toast.error(t('err_report_failed', "Rapor oluşturulurken bir hata oluştu."), { id: tLoading });
    }
  };

  const toggleColumn = (col) => {
      if (selectedColumns.includes(col)) {
          setSelectedColumns(selectedColumns.filter(c => c !== col));
      } else {
          setSelectedColumns([...selectedColumns, col]);
      }
  };

  const handleReviewRequest = async (reqId, status) => {
    const tLoading = toast.loading(t('msg_processing', "İşlem yapılıyor..."));
    try {
      await profileApi.reviewRequest(reqId, status);
      toast.success(status === 'APPROVED' ? t('msg_profile_updated', "Profil başarıyla güncellendi.") : t('msg_request_rejected', "Talep reddedildi."), { id: tLoading });
      
      fetchPendingRequests();
      if (status === 'APPROVED') fetchData();
      
      if (pendingRequests.length === 1) setIsApprovalsModalOpen(false);
      
    } catch (err) {
      toast.error(t('err_action_failed', "İşlem gerçekleştirilemedi."), { id: tLoading });
    }
  };

  const translateKey = (key) => {
      switch(key) {
          case 'phone': return t('lbl_key_phone', 'TELEFON NUMARASI');
          case 'address': return t('lbl_key_address', 'İKAMETGAH ADRESİ');
          default: return key.toLocaleUpperCase(locale);
      }
  };

  // 🌍 Tarih Formatlayıcı
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(locale);
  };

  const renderFormStep = () => {
    switch(formStep) {
      case 1: return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup label={t('lbl_first_name', 'AD')} name="first_name" required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
            <InputGroup label={t('lbl_last_name', 'SOYAD')} name="last_name" required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup label={t('lbl_identity_no', 'KİMLİK / PASAPORT NO')} name="identity_no" required value={formData.identity_no} onChange={e => setFormData({...formData, identity_no: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
            <div className="flex flex-col gap-1.5 w-full">
               <label className={`text-[11px] font-bold text-slate-500 tracking-wider text-left uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_gender', 'CİNSİYET')}</label>
               <select className={`w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-semibold text-sm shadow-sm outline-none focus:border-indigo-500 text-slate-700 transition-all ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                 <option value="Erkek">{t('opt_male', 'Erkek')}</option><option value="Kadın">{t('opt_female', 'Kadın')}</option>
               </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup label={t('lbl_mother_name', 'ANNE ADI')} name="mother_name" value={formData.mother_name} onChange={e => setFormData({...formData, mother_name: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
            <InputGroup label={t('lbl_father_name', 'BABA ADI')} name="father_name" value={formData.father_name} onChange={e => setFormData({...formData, father_name: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup label={t('lbl_birth_place', 'DOĞUM YERİ')} name="birth_place" value={formData.birth_place} onChange={e => setFormData({...formData, birth_place: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
            <InputGroup label={t('lbl_birth_date', 'DOĞUM TARİHİ')} name="birth_date" type="date" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} isArabic={isArabic} />
          </div>
        </div>
      );
      case 2: return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup label={t('lbl_email', 'E-POSTA ADRESİ')} name="email" required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value?.toLowerCase()})} isArabic={isArabic} />
            <InputGroup label={t('lbl_phone_no', 'CEP TELEFONU')} name="phone" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} isArabic={isArabic} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5 w-full">
              <label className={`text-[11px] font-bold text-slate-500 tracking-wider text-left uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_address', 'İKAMETGAH ADRESİ')}</label>
              <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] outline-none focus:border-indigo-500 font-semibold text-sm min-h-[120px] resize-none shadow-sm text-slate-700 transition-all" />
            </div>
            <div className="space-y-6">
              <InputGroup label={t('lbl_nationality', 'UYRUK / VATANDAŞLIK')} name="nationality" value={formData.nationality} placeholder={t('ph_nationality', 'Örn: TC, KKTC')} onChange={e => setFormData({...formData, nationality: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
              
              <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl space-y-4">
                <label className="flex items-center gap-3 text-[11px] font-bold cursor-pointer uppercase tracking-widest text-rose-800">
                  <input type="checkbox" checked={formData.is_married} onChange={e => setFormData({...formData, is_married: e.target.checked})} className="w-5 h-5 accent-rose-500 rounded-lg cursor-pointer" /> 
                  <Heart size={16} className="text-rose-500"/> {t('lbl_marital_married', 'MEDENİ HALİ: EVLİ')}
                </label>
                {formData.is_married && (
                  <div className={`space-y-4 animate-in fade-in ${isArabic ? 'pr-8' : 'pl-8'}`}>
                    <InputGroup label={t('lbl_spouse_name', 'EŞİNİN ADI SOYADI')} name="spouse_name" value={formData.spouse_name} onChange={e => setFormData({...formData, spouse_name: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
                    <label className="flex items-center gap-3 text-[11px] font-bold cursor-pointer text-rose-700 tracking-widest uppercase">
                      <input type="checkbox" checked={formData.spouse_works} onChange={e => setFormData({...formData, spouse_works: e.target.checked})} className="w-4 h-4 accent-rose-500 rounded-lg cursor-pointer" /> 
                      {t('lbl_spouse_works', 'EŞİ ÇALIŞIYOR MU? (Vergi İndirimi)')}
                    </label>
                  </div>
                )}
                <div className="pt-5 border-t border-rose-200 mt-2">
                  <div className="flex items-center gap-3">
                    <Baby size={20} className="text-rose-500" />
                    <InputGroup label={t('lbl_children_count', 'BAKMAKLA YÜKÜMLÜ OLDUĞU ÇOCUK SAYISI')} name="children_count" type="number" min="0" value={formData.children_count} onChange={handleChildrenCountChange} isArabic={isArabic} />
                  </div>
                  {formData.children_count > 0 && (
                    <div className={`mt-4 space-y-3 ml-2 animate-in fade-in ${isArabic ? 'pr-8 border-r-2 border-rose-300' : 'pl-8 border-l-2 border-rose-300'}`}>
                      {formData.children_names.map((name, idx) => (
                        <InputGroup key={idx} label={t('lbl_child_name', '{{idx}}. ÇOCUK ADI SOYADI').replace('{{idx}}', localizedNumber(idx + 1))} value={name} onChange={(e) => handleChildNameChange(idx, e.target.value?.toLocaleUpperCase(locale))} isArabic={isArabic} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-cyan-50 p-8 rounded-[2rem] border border-cyan-100">
            <InputGroup label={t('lbl_emergency_contact_name', 'ACİL DURUM KİŞİSİ')} name="emergency_contact_name" value={formData.emergency_contact_name} onChange={e => setFormData({...formData, emergency_contact_name: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
            <InputGroup label={t('lbl_emergency_contact_relation', 'YAKINLIK DERECESİ')} name="emergency_contact_relation" value={formData.emergency_contact_relation} onChange={e => setFormData({...formData, emergency_contact_relation: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
            <InputGroup label={t('lbl_emergency_contact_phone', 'ACİL DURUM TELEFONU')} name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={e => setFormData({...formData, emergency_contact_phone: e.target.value})} isArabic={isArabic} />
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5 w-full">
              <label className={`text-[11px] font-bold text-slate-500 tracking-wider text-left uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_company_branch', 'BAĞLI ŞİRKET / ŞUBE')} *</label>
              <select required value={formData.company_id} onChange={e => setFormData({...formData, company_id: e.target.value})} className={`w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-semibold text-sm outline-none focus:border-indigo-500 shadow-sm text-slate-700 transition-all cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}>
                <option value="" disabled>-- {t('opt_select', 'Seçiniz')} --</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name?.toLocaleUpperCase(locale)}</option>)}
              </select>
            </div>
            <InputGroup label={t('lbl_hire_date', 'İŞE GİRİŞ TARİHİ')} name="hire_date" type="date" required value={formData.hire_date} onChange={e => setFormData({...formData, hire_date: e.target.value})} isArabic={isArabic} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-50 p-8 rounded-3xl border border-indigo-100 shadow-inner">
            <div className="flex flex-col gap-1.5 w-full">
              <label className={`text-[11px] font-bold text-indigo-700 tracking-widest flex items-center gap-2 uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>
                <Building2 size={16}/> {t('lbl_department', 'ÇALIŞACAĞI DEPARTMAN')} *
              </label>
              <select 
                required
                value={formData.department_id || ""} 
                onChange={e => {
                  setFormData({
                    ...formData, 
                    department_id: e.target.value, 
                    position_id: "" 
                  });
                }} 
                className={`w-full p-4 bg-white border border-indigo-200 rounded-[1.5rem] font-bold text-sm outline-none focus:border-indigo-500 shadow-sm text-slate-800 transition-all cursor-pointer uppercase appearance-none ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}
              >
                <option value="" disabled>-- {t('opt_select_dept', 'DEPARTMAN SEÇİNİZ')} --</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name?.toLocaleUpperCase(locale)}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className={`text-[11px] font-bold text-indigo-700 tracking-widest flex items-center gap-2 uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>
                <Network size={16}/> {t('lbl_position', 'ATANACAĞI KADRO (POZİSYON)')}
              </label>
              <select 
                value={formData.position_id || ""} 
                onChange={e => setFormData({...formData, position_id: e.target.value})} 
                disabled={!formData.department_id}
                className={`w-full p-4 bg-white border border-indigo-200 rounded-[1.5rem] font-bold text-sm outline-none focus:border-indigo-500 shadow-sm text-slate-800 transition-all cursor-pointer uppercase appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}
              >
                <option value="">-- {t('opt_no_position', 'KADRO SEÇİLMEDİ')} --</option>
                {filteredPositions.map(pos => (
                  <option key={pos.id} value={pos.id}>{pos.title?.toLocaleUpperCase(locale)}</option>
                ))}
              </select>
              {!formData.department_id && <p className={`text-[9px] text-indigo-400 mt-1 italic font-bold ${isArabic ? 'mr-2' : 'ml-2'}`}>{t('lbl_select_dept_first', 'Önce departman seçin')}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5 w-full bg-slate-800 p-6 rounded-3xl border-2 border-slate-700 shadow-xl">
               <label className={`text-[11px] font-bold text-cyan-400 tracking-widest text-left uppercase flex items-center gap-2 ${isArabic ? 'mr-1' : 'ml-1'}`}>
                 <ShieldCheck size={16}/> {t('lbl_system_role', 'SİSTEM YETKİSİ (ROL)')} *
               </label>
               <select required className={`w-full p-4 bg-slate-900 border border-slate-600 rounded-[1.5rem] font-bold text-sm shadow-inner outline-none focus:border-cyan-500 text-white transition-all cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`} value={formData.role || "EMPLOYEE"} onChange={e => setFormData({...formData, role: e.target.value})}>
                 <option value="EMPLOYEE">👨‍💻 {t('role_employee', 'STANDART ÇALIŞAN (Sadece Kendi Bilgileri)')}</option>
                 <option value="MANAGER">👔 {t('role_manager', 'YÖNETİCİ / MÜDÜR (Kendi Ekibi ve Onaylar)')}</option>
                 <option value="HR">📋 {t('role_hr', 'İNSAN KAYNAKLARI (Tüm Personel ve İşlemler)')}</option>
                 <option value="ADMIN">👑 {t('role_admin', 'SİSTEM YÖNETİCİSİ (Tam Yetki)')}</option>
               </select>
               <p className={`text-[9px] font-semibold text-slate-400 mt-2 uppercase tracking-wide ${isArabic ? 'mr-2' : 'ml-2'}`}>{t('desc_role_access', 'Seçilen role göre sol menü ve veri erişimi otomatik ayarlanır.')}</p>
            </div>
            
            <div className="flex flex-col gap-1.5 w-full justify-center">
               <label className={`text-[11px] font-bold text-slate-500 tracking-wider text-left uppercase flex items-center gap-2 ${isArabic ? 'mr-1' : 'ml-1'}`}><GraduationCap size={14}/> {t('lbl_education_level', 'EĞİTİM SEVİYESİ')}</label>
               <select className={`w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-semibold text-sm shadow-sm outline-none focus:border-indigo-500 text-slate-700 transition-all cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`} value={formData.education_level} onChange={e => setFormData({...formData, education_level: e.target.value})}>
                 <option value="İlkokul">{t('edu_primary', 'İlkokul')}</option>
                 <option value="Ortaokul">{t('edu_middle', 'Ortaokul')}</option>
                 <option value="Lise">{t('edu_high', 'Lise')}</option>
                 <option value="Üniversite">{t('edu_university', 'Üniversite')}</option>
                 <option value="Yüksek Lisans">{t('edu_master', 'Yüksek Lisans')}</option>
               </select>
            </div>
          </div>
        </div>
      );
      case 4: return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="flex gap-3">
               <div className="flex-[3]"><InputGroup label={t('lbl_gross_salary', 'ANLAŞILAN MAAŞ (BRÜT)')} name="gross_salary" type="number" min="0" required value={formData.gross_salary} onChange={e => setFormData({...formData, gross_salary: e.target.value})} isArabic={isArabic} /></div>
               <div className="flex-1">
                  <label className={`text-[11px] font-bold text-slate-500 tracking-wider uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_currency', 'DÖVİZ')}</label>
                  <select className={`w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-semibold text-xs shadow-sm focus:border-indigo-500 outline-none text-slate-700 transition-all cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`} value={formData.salary_currency} onChange={e => setFormData({...formData, salary_currency: e.target.value})} dir="ltr">
                    {CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency.value} value={currency.value}>{currency.label}</option>
                    ))}
                  </select>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 w-full">
               <label className={`text-[11px] font-bold text-rose-500 tracking-wider text-left flex items-center gap-1 uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}><Droplet size={14}/> {t('lbl_blood_type', 'KAN GRUBU (İSG)')}</label>
               <select className={`w-full p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-[1.5rem] font-semibold text-sm shadow-sm outline-none focus:border-rose-400 transition-all cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`} value={formData.blood_type} onChange={e => setFormData({...formData, blood_type: e.target.value})} dir="ltr">
                 <option value="Bilinmiyor">{t('opt_not_selected', 'Seçilmedi')}</option><option value="A+">A+</option><option value="A-">A-</option>
                 <option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option>
                 <option value="AB-">AB-</option><option value="0+">0+</option><option value="0-">0-</option>
               </select>
             </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-8 rounded-[2rem] border border-slate-200">
             <InputGroup label={t('lbl_ssn', 'SOSYAL GÜVENLİK NO (SGK / SSN)')} name="social_security_no" value={formData.social_security_no} onChange={e => setFormData({...formData, social_security_no: e.target.value})} isArabic={isArabic} />
             <InputGroup label={t('lbl_tax_no', 'VERGİ / EK FON NO (Opsiyonel)')} name="provident_fund_no" value={formData.provident_fund_no} onChange={e => setFormData({...formData, provident_fund_no: e.target.value})} isArabic={isArabic} />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-emerald-50 p-8 rounded-[2rem] border border-emerald-100">
             <InputGroup label={t('lbl_bank_name', 'BANKA ADI')} name="bank_name" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
             <InputGroup label={t('lbl_account_holder_name', 'HESAP SAHİBİ')} name="account_holder_name" value={formData.account_holder_name} onChange={e => setFormData({...formData, account_holder_name: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
             <InputGroup label={t('lbl_iban', 'IBAN')} name="iban" value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value?.toUpperCase()})} isArabic={isArabic} />
             <InputGroup label={t('lbl_tax_id_number', 'VERGİ KİMLİK / TIN')} name="tax_id_number" value={formData.tax_id_number} onChange={e => setFormData({...formData, tax_id_number: e.target.value})} isArabic={isArabic} />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100">
             <InputGroup label={t('lbl_work_auth_type', 'ÇALIŞMA YETKİ TÜRÜ')} name="work_authorization_type" value={formData.work_authorization_type} onChange={e => setFormData({...formData, work_authorization_type: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
             <InputGroup label={t('lbl_work_auth_no', 'ÇALIŞMA YETKİ NO')} name="work_authorization_no" value={formData.work_authorization_no} onChange={e => setFormData({...formData, work_authorization_no: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
             <InputGroup label={t('lbl_work_auth_start', 'YETKİ BAŞLANGICI')} name="work_authorization_start_date" type="date" value={formData.work_authorization_start_date} onChange={e => setFormData({...formData, work_authorization_start_date: e.target.value})} isArabic={isArabic} />
             <InputGroup label={t('lbl_work_auth_expiry', 'YETKİ BİTİŞİ')} name="work_authorization_expiry_date" type="date" value={formData.work_authorization_expiry_date} onChange={e => setFormData({...formData, work_authorization_expiry_date: e.target.value})} isArabic={isArabic} />
             <InputGroup label={t('lbl_visa_type', 'VİZE / OTURUM TÜRÜ')} name="visa_type" value={formData.visa_type} onChange={e => setFormData({...formData, visa_type: e.target.value?.toLocaleUpperCase(locale)})} isArabic={isArabic} />
             <InputGroup label={t('lbl_visa_expiry', 'VİZE BİTİŞ TARİHİ')} name="visa_expiry_date" type="date" value={formData.visa_expiry_date} onChange={e => setFormData({...formData, visa_expiry_date: e.target.value})} isArabic={isArabic} />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-50 p-8 rounded-[2rem] border border-amber-100">
             <InputGroup label={t('lbl_nda_signed_at', 'NDA İMZA TARİHİ')} name="nda_signed_at" type="date" value={formData.nda_signed_at} onChange={e => setFormData({...formData, nda_signed_at: e.target.value})} isArabic={isArabic} />
             <InputGroup label={t('lbl_handbook_ack_signed_at', 'EL KİTABI ONAY TARİHİ')} name="handbook_ack_signed_at" type="date" value={formData.handbook_ack_signed_at} onChange={e => setFormData({...formData, handbook_ack_signed_at: e.target.value})} isArabic={isArabic} />
             <div className="flex flex-col gap-1.5 w-full">
               <label className={`text-[11px] font-bold text-slate-500 tracking-wider text-left uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_background_check_status', 'ARKA PLAN KONTROL DURUMU')}</label>
               <select className={`w-full p-4 bg-white border-2 border-amber-100 rounded-[1.5rem] font-semibold text-sm shadow-sm outline-none focus:border-amber-400 text-slate-700 transition-all ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`} value={formData.background_check_status} onChange={e => setFormData({...formData, background_check_status: e.target.value})}>
                 <option value="NOT_STARTED">{t('opt_not_started', 'Başlatılmadı')}</option>
                 <option value="IN_PROGRESS">{t('opt_in_progress', 'Devam Ediyor')}</option>
                 <option value="COMPLETED">{t('opt_completed_short', 'Tamamlandı')}</option>
                 <option value="EXEMPT">{t('opt_exempt', 'Muaf')}</option>
               </select>
             </div>
             <InputGroup label={t('lbl_background_check_completed_at', 'ARKA PLAN KONTROL TARİHİ')} name="background_check_completed_at" type="date" value={formData.background_check_completed_at} onChange={e => setFormData({...formData, background_check_completed_at: e.target.value})} isArabic={isArabic} />
             <div className="flex flex-col gap-1.5 w-full">
               <label className={`text-[11px] font-bold text-slate-500 tracking-wider text-left uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_occupational_health_status', 'İSG / SAĞLIK UYGUNLUK')}</label>
               <select className={`w-full p-4 bg-white border-2 border-amber-100 rounded-[1.5rem] font-semibold text-sm shadow-sm outline-none focus:border-amber-400 text-slate-700 transition-all ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`} value={formData.occupational_health_status} onChange={e => setFormData({...formData, occupational_health_status: e.target.value})}>
                 <option value="NOT_STARTED">{t('opt_not_started', 'Başlatılmadı')}</option>
                 <option value="FIT">{t('opt_fit', 'Uygun')}</option>
                 <option value="RESTRICTED">{t('opt_restricted', 'Kısıtlı Uygun')}</option>
                 <option value="EXPIRED">{t('opt_expired', 'Süresi Doldu')}</option>
               </select>
             </div>
             <InputGroup label={t('lbl_occupational_health_valid_until', 'İSG / SAĞLIK GEÇERLİLİK')} name="occupational_health_valid_until" type="date" value={formData.occupational_health_valid_until} onChange={e => setFormData({...formData, occupational_health_valid_until: e.target.value})} isArabic={isArabic} />
           </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? "top-left" : "top-right"} reverseOrder={false} />
      
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 shrink-0 w-full">
        <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-full xl:w-auto">
            <button onClick={() => setActiveTab("ACTIVE")} className={`flex-1 xl:flex-none px-8 py-3.5 rounded-xl text-[10px] font-bold tracking-[0.2em] transition-all uppercase ${activeTab === "ACTIVE" ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                {t('tab_active_roster', 'AKTİF KADRO')}
            </button>
            <button onClick={() => setActiveTab("INACTIVE")} className={`flex-1 xl:flex-none px-8 py-3.5 rounded-xl text-[10px] font-bold tracking-[0.2em] transition-all uppercase ${activeTab === "INACTIVE" ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                {t('tab_archive_roster', 'ARŞİV (ÇIKANLAR)')}
            </button>
        </div>
        
        <div className="flex flex-wrap xl:flex-nowrap items-center gap-3 w-full xl:w-auto">
            <FilterPopover
                label={t('lbl_search', 'Arama')}
                open={openFilterMenu === 'search'}
                active={Boolean(searchTerm)}
                onToggle={() => setOpenFilterMenu((prev) => (prev === 'search' ? null : 'search'))}
                onReset={() => setSearchDraft('')}
                onCancel={() => { setSearchDraft(searchTerm); setOpenFilterMenu(null); }}
                onApply={() => { setSearchTerm(searchDraft); setOpenFilterMenu(null); }}
                align={isArabic ? 'left' : 'right'}
                panelWidthClass="w-[320px]"
                className="flex-1 min-w-[220px] xl:min-w-[240px] xl:max-w-[300px]"
            >
                <div className="relative">
                  <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isArabic ? 'right-3' : 'left-3'}`} />
                  <input
                      type="text"
                      value={searchDraft}
                      onChange={(e) => setSearchDraft(e.target.value)}
                      dir={isArabic ? 'rtl' : 'ltr'}
                      placeholder={t('ph_search_employee', 'Search by name, email or phone...')}
                      className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-500 ${isArabic ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
                  />
                </div>
            </FilterPopover>
            <button 
                onClick={() => setIsApprovalsModalOpen(true)} 
                className={`flex-1 xl:flex-none shrink-0 px-6 py-4 rounded-2xl font-bold text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 shadow-sm transition-all uppercase ${pendingRequests.length > 0 ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
                <Bell size={16} /> {t('btn_approvals', 'ONAYLAR')} {pendingRequests.length > 0 && `(${localizedNumber(pendingRequests.length)})`}
            </button>
            
            <button onClick={() => setIsReportModalOpen(true)} className="flex-1 xl:flex-none shrink-0 bg-rose-50 text-rose-600 border border-rose-100 px-6 py-4 rounded-2xl font-bold text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 shadow-sm hover:bg-rose-500 hover:text-white transition-all active:scale-95 uppercase">
                <FileText size={16} /> {t('btn_custom_report', 'ÖZEL RAPOR OLUŞTUR')}
            </button>
            
            <button onClick={openModalForNew} className="flex-1 xl:flex-none shrink-0 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 uppercase">
                <UserPlus size={18} /> {t('btn_new_record', 'YENİ KAYIT')}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col pb-4">
        {loading ? (
           <div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">{t('lbl_loading', 'VERİLER YÜKLENİYOR...')}</div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left relative">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 tracking-widest border-b sticky top-0 z-10 uppercase shadow-sm">
                <tr>
                  <th className={`py-6 px-8 ${isArabic ? 'text-right' : 'text-left'}`}>{t('col_head_name', 'AD SOYAD / KADRO')}</th>
                  <th className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>{t('col_head_company', 'ŞİRKET / LOKASYON')}</th>
                  <th className={`p-6 ${isArabic ? 'text-right' : 'text-left'}`}>{activeTab === "ACTIVE" ? t('col_head_hire', "İŞE GİRİŞ") : t('col_head_exit', "İŞTEN ÇIKIŞ")}</th>
                  <th className={`py-6 px-8 ${isArabic ? 'text-left' : 'text-right'}`}>{t('col_head_actions', 'İŞLEMLER')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                
                {Object.keys(groupedEmployees).length === 0 ? (
                    <tr>
                        <td colSpan="4" className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs opacity-60">{t('msg_no_records_tab', 'Bu sekmede kayıt bulunmuyor.')}</td>
                    </tr>
                ) : (
                    Object.entries(groupedEmployees).map(([dept, deptEmps]) => (
                      <React.Fragment key={dept}>
                        <tr onClick={() => toggleDept(dept)} className={`cursor-pointer transition-all ${expandedDepts.includes(dept) ? 'bg-indigo-50/50' : 'bg-slate-50 hover:bg-slate-100'}`}>
                          <td colSpan="4" className="py-4 px-8 border-b border-slate-200">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shadow-sm"><Building2 size={16}/></div>
                                 <span className="font-bold text-slate-700 tracking-widest uppercase text-xs">{dept}</span>
                                 <span className="bg-white text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm">{localizedNumber(deptEmps.length)} {t('lbl_personnel_count', 'PERSONEL')}</span>
                              </div>
                              <div className={`p-1.5 rounded-lg transition-all ${expandedDepts.includes(dept) ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
                                {expandedDepts.includes(dept) ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                              </div>
                            </div>
                          </td>
                        </tr>

                        {expandedDepts.includes(dept) && deptEmps.map(emp => {
                            return (
                                <tr key={emp.id} className="hover:bg-slate-50/80 transition-all group animate-in fade-in">
                                <td className={`py-5 px-8 ${isArabic ? 'pr-12 text-right' : 'pl-12 text-left'}`}>
                                    <div className="font-bold text-slate-800 uppercase">{emp.first_name?.toLocaleUpperCase(locale)} {emp.last_name?.toLocaleUpperCase(locale)}</div>
                                    <div className="text-[10px] text-indigo-500 font-semibold tracking-widest mt-1 uppercase">
                                        {emp.position ? emp.position.toLocaleUpperCase(locale) : `- ${t('lbl_unassigned_short', 'Unassigned')} -`}
                                    </div>
                                </td>
                                <td className={`p-5 font-bold text-slate-600 text-[11px] uppercase ${isArabic ? 'text-right' : 'text-left'}`}>
                                    <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">{companies.find(c => c.id === emp.company_id)?.name?.toLocaleUpperCase(locale)}</span>
                                </td>
                                <td className={`p-5 text-xs font-semibold text-slate-500 tracking-widest ${isArabic ? 'text-right' : 'text-left'}`} dir="ltr">{formatDate(activeTab === "ACTIVE" ? emp.hire_date : emp.exit_date)}</td>
                                <td className={`py-5 px-8 ${isArabic ? 'text-left' : 'text-right'}`}>
                                    <div className={`flex flex-wrap gap-2 opacity-100 transition-all ${isArabic ? 'justify-start' : 'justify-end'}`}>
                                    <button onClick={() => downloadPdf(() => api.get(`/employee/${emp.id}/info-card`, { responseType: 'blob' }), `InfoCard_${emp.first_name}.pdf`)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100" title={t('tooltip_download_card', "Personel Bilgi Kartı (PDF) İndir")}>
                                        <IdCard size={16}/>
                                    </button>
                                    {activeTab === "ACTIVE" && (
                                        <>
                                            <button onClick={() => downloadPdf(() => reportApi.getEmploymentCertificate(emp.id), `Certificate_${emp.first_name}.pdf`)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-emerald-100" title={t('tooltip_download_cert', "Resmi Çalışma Belgesi (PDF) İndir")}>
                                                <Download size={16}/>
                                            </button>
                                            <button onClick={() => handleResetPassword(emp)} className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm border border-amber-100" title={t('tooltip_reset_pwd', "Sisteme Giriş Şifresini Sıfırla")}>
                                                <Key size={16}/>
                                            </button>
                                        </>
                                    )}
                                    <button onClick={() => handleEdit(emp)} className={`p-2.5 rounded-xl shadow-sm border transition-all ${activeTab === "INACTIVE" ? 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-800 hover:text-white'}`} title={activeTab === "INACTIVE" ? t('tooltip_view_archive', "Görüntüle") : t('tooltip_edit', "Düzenle")}><Edit3 size={16}/></button>
                                    {activeTab === "ACTIVE" && (
                                        <button onClick={() => handleTerminateInitiate(emp)} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white shadow-sm border border-rose-100 transition-all" title={t('tooltip_terminate', "İşten Çıkar (Arşivle)")}><Archive size={16}/></button>
                                    )}
                                    </div>
                                </td>
                                </tr>
                            )
                        })}
                      </React.Fragment>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🎯 PROFİL ONAYLARI MODALI */}
      {isApprovalsModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-amber-500 p-8 flex justify-between items-center text-white shrink-0">
              <h2 className="text-xl font-black italic tracking-wide flex items-center gap-3 uppercase">
                <div className="p-2 bg-amber-400 rounded-xl"><Bell size={24}/></div> 
                {t('modal_title_approvals', 'PROFİL GÜNCELLEME TALEPLERİ')}
              </h2>
              <button onClick={() => setIsApprovalsModalOpen(false)} className={`transition-all text-amber-200 hover:text-white ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><X size={32} /></button>
            </div>
            
            <div className="p-8 bg-slate-50 flex-1 overflow-y-auto custom-scrollbar space-y-6">
              {pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-60">
                   <CheckCircle size={48} className="mb-4 text-emerald-500"/>
                   <p className="font-black text-xs uppercase tracking-widest text-center" dangerouslySetInnerHTML={{__html: t('msg_no_pending_requests_html', "TÜM TALEPLER İNCELENDİ!<br/>ONAY BEKLEYEN İŞLEM YOK.")}}></p>
                </div>
              ) : (
                pendingRequests.map(req => (
                  <div key={req.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm hover:border-amber-300 transition-colors">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
                      <div>
                        <p className="font-black text-slate-800 text-sm uppercase">{req.employee_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest" dir="ltr">{new Date(req.created_at).toLocaleString(locale)}</p>
                      </div>
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-200">{t('badge_new_request', 'YENİ TALEP')}</span>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      {Object.entries(req.changes).map(([key, value]) => (
                        <div key={key} className={`bg-slate-50 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-100 ${isArabic ? 'sm:flex-row-reverse' : ''}`}>
                          <span className={`text-[10px] font-black text-slate-500 tracking-widest ${isArabic ? 'text-right' : 'text-left'}`}>{translateKey(key)}:</span>
                          <span className={`font-bold text-sm text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 break-words ${isArabic ? 'text-left' : 'text-right'}`} dir="ltr">{value}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className={`flex gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                       <button onClick={() => handleReviewRequest(req.id, 'REJECTED')} className="flex-1 py-4 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-rose-50 transition-all active:scale-95">
                         <XCircle size={16}/> {t('btn_reject', 'REDDET')}
                       </button>
                       <button onClick={() => handleReviewRequest(req.id, 'APPROVED')} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all active:scale-95">
                         <Check size={16}/> {t('btn_approve', 'ONAYLA')}
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- RAPOR MODALI --- */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-rose-600 p-8 flex justify-between items-center text-white shrink-0">
                    <h2 className="text-xl font-bold italic tracking-wide flex items-center gap-3 uppercase">
                        <div className="p-2 bg-rose-500 rounded-xl"><FileText size={24}/></div> 
                        {t('modal_title_custom_report', 'ÖZEL RAPOR OLUŞTUR')}
                    </h2>
                    <button onClick={() => setIsReportModalOpen(false)} className={`transition-all text-rose-300 hover:text-white ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><X size={32} /></button>
                </div>
                
                <div className="p-10 space-y-8 bg-slate-50">
                    <InputGroup label={t('lbl_report_title', 'RAPOR BAŞLIĞI')} value={reportTitle} onChange={(e) => setReportTitle(e.target.value?.toLocaleUpperCase(locale))} isArabic={isArabic} />
                    
                    <div>
                        <label className={`text-[11px] font-bold text-slate-500 tracking-widest text-left uppercase mb-4 block ${isArabic ? 'mr-1' : 'ml-1'}`}>
                            {t('lbl_report_columns', 'RAPORDA YER ALACAK BİLGİLER (SÜTUNLAR)')}
                        </label>
                        <div className="grid grid-cols-2 gap-5 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                            {availableColumns.map((col, idx) => (
                                <label key={idx} className="flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer hover:text-rose-600 transition-colors uppercase tracking-widest">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedColumns.includes(col.key)} 
                                        onChange={() => toggleColumn(col.key)}
                                        className="w-5 h-5 accent-rose-500 rounded-lg cursor-pointer"
                                    />
                                    {col.label}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={`p-8 bg-white border-t border-slate-100 flex gap-4 shrink-0 ${isArabic ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
                    <button onClick={() => setIsReportModalOpen(false)} className="px-8 py-4 rounded-2xl font-bold text-[10px] tracking-widest uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">{t('btn_cancel', 'İPTAL')}</button>
                    <button onClick={handleGenerateDynamicReport} className={`px-10 py-4 bg-rose-600 text-white rounded-2xl font-bold text-[10px] tracking-widest uppercase flex items-center gap-2 shadow-xl shadow-rose-600/30 hover:bg-rose-700 transition-all active:scale-95 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <Download size={18}/> {t('btn_download_pdf_report', 'PDF RAPORU İNDİR')}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- YENİ KAYIT MODALI --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white shrink-0">
              <h2 className="text-xl font-bold italic tracking-wide flex items-center gap-3 uppercase">
                <div className="p-2 bg-indigo-500 rounded-xl">{editId ? <Edit3 size={24}/> : <UserPlus size={24}/>}</div>
                {editId ? (isViewMode ? t('modal_title_view_emp', "ARŞİV PERSONEL KAYDI") : t('modal_title_edit_emp', "ÖZLÜK DOSYASINI GÜNCELLE")) : t('modal_title_new_emp', "YENİ PERSONEL ÖZLÜK KAYDI")}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className={`transition-all text-slate-400 hover:text-white ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><X size={32} /></button>
            </div>
            
            <div className={`flex border-b border-slate-200 bg-slate-50 shrink-0 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <button type="button" onClick={() => setFormStep(1)} className={`flex-1 py-5 text-[10px] font-bold tracking-widest uppercase border-b-4 transition-all flex justify-center items-center gap-2 ${formStep === 1 ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}><User size={18}/> {localizeDigits(1, i18n.language)}. {t('step_identity', 'KİMLİK')}</button>
              <button type="button" onClick={() => setFormStep(2)} className={`flex-1 py-5 text-[10px] font-bold tracking-widest uppercase border-b-4 transition-all flex justify-center items-center gap-2 ${formStep === 2 ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}><Heart size={18}/> {localizeDigits(2, i18n.language)}. {t('step_contact_family', 'İLETİŞİM & AİLE')}</button>
              <button type="button" onClick={() => setFormStep(3)} className={`flex-1 py-5 text-[10px] font-bold tracking-widest uppercase border-b-4 transition-all flex justify-center items-center gap-2 ${formStep === 3 ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}><Briefcase size={18}/> {localizeDigits(3, i18n.language)}. {t('step_corporate', 'KURUMSAL')}</button>
              <button type="button" onClick={() => setFormStep(4)} className={`flex-1 py-5 text-[10px] font-bold tracking-widest uppercase border-b-4 transition-all flex justify-center items-center gap-2 ${formStep === 4 ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}><CreditCard size={18}/> {localizeDigits(4, i18n.language)}. {t('step_finance_legal', 'FİNANS & YASAL')}</button>
            </div>

            <div className="overflow-y-auto p-10 flex-1 bg-white custom-scrollbar">
              <form id="wizard-form" ref={formRef} onSubmit={handleSubmit}>
                <fieldset disabled={isViewMode} className="disabled:opacity-90">
                  {renderFormStep()}
                </fieldset>
              </form>
            </div>

            <div className={`p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <button type="button" onClick={() => setFormStep(prev => Math.max(1, prev - 1))} className={`px-6 py-4 rounded-2xl font-bold text-[10px] tracking-widest uppercase flex items-center gap-2 transition-all ${formStep === 1 ? 'opacity-0 pointer-events-none' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-200 shadow-sm'} ${isArabic ? 'flex-row-reverse' : ''}`}>
                {isArabic ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>} {t('btn_back', 'GERİ')}
              </button>
              
              <div className={`flex gap-4 items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                <span className={`text-[10px] font-bold text-slate-400 tracking-widest uppercase ${isArabic ? 'ml-4' : 'mr-4'}`}>{t('lbl_step', 'ADIM {{step}} / 4').replace('{{step}}', localizedNumber(formStep)).replace('/ 4', `/ ${localizedNumber(4)}`)}</span>

                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 rounded-2xl font-bold text-[10px] tracking-widest uppercase text-slate-400 hover:bg-slate-200 transition-all">{t('btn_cancel', 'İPTAL')}</button>
                
                {formStep < 4 ? (
                  <button type="button" onClick={handleNextStep} className={`px-10 py-4 bg-indigo-50 text-indigo-700 rounded-2xl font-bold text-[10px] tracking-widest uppercase flex items-center gap-2 hover:bg-indigo-100 transition-all border border-indigo-200 shadow-sm ${isArabic ? 'flex-row-reverse' : ''}`}>
                    {t('btn_next', 'İLERİ')} {isArabic ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
                  </button>
                ) : !isViewMode ? (
                  <button type="submit" form="wizard-form" className={`px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-[10px] tracking-widest uppercase flex items-center gap-2 shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <Save size={18}/> {editId ? t('btn_update_record', "KAYDI GÜNCELLE") : t('btn_complete_record', "ÖZLÜK KAYDINI TAMAMLA")}
                  </button>
                ) : (
                  <div className="px-6 py-4 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] tracking-widest uppercase">
                    {t('msg_archive_readonly', 'ARŞİV KAYITLARI SADECE GÖRÜNTÜLENİR')}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;

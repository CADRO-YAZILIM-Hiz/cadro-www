import React, { useState, useEffect } from 'react';
import api, { atsApi, createEmployee, getAbsoluteFileUrl } from '../api/axios'; 
import { 
    Briefcase, Plus, GripVertical, CheckCircle, XCircle, Mail, Phone, Users, Star, 
    FileText, UploadCloud, UserPlus, Send, Network, Trash2, Download, Bot, Target, 
    MessageSquare, ThumbsUp, ThumbsDown, UserCheck, Sparkles, Loader2 
} from 'lucide-react'; 
import toast, { Toaster } from 'react-hot-toast'; 
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi
import { localizeDigits } from '../utils/localizeNumber';

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

const ATS = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);
  const workflowBadgeCatalog = [
    { key: 'cv_reviewed', label: t('lbl_badge_cv_reviewed', 'CV İncelendi') },
    { key: 'phone_screen_done', label: t('lbl_badge_phone_screen', 'Telefon Görüşmesi Yapıldı') },
    { key: 'interview_completed', label: t('lbl_badge_interview_completed', 'Mülakat Tamamlandı') },
    { key: 'reference_checked', label: t('lbl_badge_reference_checked', 'Referanslar Arandı') },
    { key: 'test_completed', label: t('lbl_badge_test_completed', 'Test Tamamlandı') },
    { key: 'manager_approved', label: t('lbl_badge_manager_approved', 'Yönetici Onayı Alındı') },
    { key: 'offer_shared', label: t('lbl_badge_offer_shared', 'Teklif Paylaşıldı') },
    { key: 'documents_received', label: t('lbl_badge_documents_received', 'Belgeler Alındı') },
    { key: 'employee_record_created', label: t('lbl_badge_employee_record_created', 'Personel Kaydı Oluşturuldu') },
  ];

  const [jobs, setJobs] = useState([]);
  const [positions, setPositions] = useState([]); 
  const [selectedJob, setSelectedJob] = useState(null);
  
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  
  const [detailCandidate, setDetailCandidate] = useState(null); 
  const [hireCandidate, setHireCandidate] = useState(null);
  const [rejectCandidate, setRejectCandidate] = useState(null);
  
  const [offerCandidate, setOfferCandidate] = useState(null);
  const [offerDetails, setOfferDetails] = useState({ salary: "", currency: "TRY", start_date: new Date().toISOString().split('T')[0] });

  const [rejectMail, setRejectMail] = useState({ subject: "", body: "" });
  const [newJob, setNewJob] = useState({ title: "", department: "", description: "" });
  const [newCandidate, setNewCandidate] = useState({ first_name: "", last_name: "", email: "", phone: "", notes: "" });

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 🌍 YENİ: Aşama isimleri (titles) artık dile göre dinamik
  const stages = [
    { id: 'YENI', title: t('stage_new', 'YENİ BAŞVURU'), color: 'bg-slate-100 border-slate-200 text-slate-700' },
    { id: 'MULAKAT', title: t('stage_interview', 'MÜLAKAT'), color: 'bg-amber-50 border-amber-200 text-amber-700' },
    { id: 'REFERANS', title: t('stage_reference', 'REFERANS & TEST'), color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { id: 'TEKLIF', title: t('stage_offer', 'TEKLİF SUNULDU'), color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
    { id: 'ISE_ALINDI', title: t('stage_hired', 'İŞE ALINDI 🎉'), color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { id: 'YETENEK_HAVUZU', title: t('stage_talent_pool', 'YETENEK HAVUZU 🏊‍♂️'), color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { id: 'ADAY_VAZGECTI', title: t('stage_withdrawn', 'ADAY VAZGEÇTİ 🛑'), color: 'bg-orange-50 border-orange-200 text-orange-700' },
    { id: 'RED', title: t('stage_rejected', 'REDDEDİLDİ (BİZ)'), color: 'bg-rose-50 border-rose-200 text-rose-700' },
  ];

  const departments = React.useMemo(() => {
    const deptMap = new Map();
    positions.forEach((pos) => {
      if (pos.department_id && pos.department) {
        deptMap.set(pos.department_id, pos.department);
      }
    });
    return Array.from(deptMap.entries()).map(([id, name]) => ({ id, name }));
  }, [positions]);

  const filteredHirePositions = React.useMemo(() => {
    if (!hireCandidate?.department_id) return [];
    return positions.filter((pos) => pos.department_id === Number(hireCandidate.department_id));
  }, [positions, hireCandidate?.department_id]);

  const findMatchingPosition = React.useCallback((jobTitle, jobDepartment) => {
    const normalize = (value) => (value || '').trim().toLocaleUpperCase('tr-TR');
    return positions.find((pos) =>
      normalize(pos.title) === normalize(jobTitle) &&
      normalize(pos.department) === normalize(jobDepartment)
    );
  }, [positions]);

  const parseWorkflowBadges = React.useCallback((candidate) => {
    if (!candidate?.workflow_badges) return [];
    try {
      const parsed = JSON.parse(candidate.workflow_badges);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }, []);

  const getWorkflowBadgeLabel = React.useCallback((badgeKey) => {
    return workflowBadgeCatalog.find((item) => item.key === badgeKey)?.label || badgeKey;
  }, [workflowBadgeCatalog]);

  const toggleWorkflowBadge = (badgeKey) => {
    const currentBadges = parseWorkflowBadges(detailCandidate);
    const nextBadges = currentBadges.includes(badgeKey)
      ? currentBadges.filter((item) => item !== badgeKey)
      : [...currentBadges, badgeKey];

    setDetailCandidate({
      ...detailCandidate,
      workflow_badges: JSON.stringify(nextBadges)
    });
  };

  const fetchJobsAndPositions = async () => {
    try {
      const res = await atsApi.getJobs();
      const safeJobs = res.data.map(job => ({
        ...job,
        candidates: job.candidates || []
      }));
      setJobs(safeJobs);
      
      if (selectedJob) {
          const updatedSelectedJob = safeJobs.find(j => j.id === selectedJob.id);
          if (updatedSelectedJob) setSelectedJob(updatedSelectedJob);
      } else if (safeJobs.length > 0) {
          setSelectedJob(safeJobs[0]);
      }

      const posRes = await api.get('/employee/position/list');
      setPositions(posRes.data || []);
      
    } catch (err) {
      console.error(t('error_fetch_data', "Veriler çekilemedi"), err);
    }
  };

  useEffect(() => {
    fetchJobsAndPositions();
  }, []);

  const handlePositionSelect = (e) => {
    const posId = e.target.value;
    if (!posId) return;
    const selectedPos = positions.find(p => p.id === parseInt(posId));
    if (selectedPos) {
      setNewJob({ ...newJob, title: selectedPos.title, department: selectedPos.department });
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      await atsApi.createJob(newJob);
      setIsJobModalOpen(false);
      setNewJob({ title: "", department: "", description: "" });
      fetchJobsAndPositions();
      toast.success(t('msg_job_published', "İlan başarıyla yayınlandı."));
    } catch (err) { toast.error(t('msg_job_create_error', "İlan oluşturulamadı.")); }
  };

  const handleCreateCandidate = async (e) => {
    e.preventDefault();
    if (!selectedJob) return toast.error(t('msg_select_open_job', "Lütfen açık kadro seçin!"));
    try {
      await atsApi.createCandidate({ ...newCandidate, job_posting_id: parseInt(selectedJob.id, 10) });
      setIsCandidateModalOpen(false);
      setNewCandidate({ first_name: "", last_name: "", email: "", phone: "", notes: "" });
      fetchJobsAndPositions(); 
      toast.success(t('msg_candidate_created', "Aday kaydı oluşturuldu."));
    } catch (err) { toast.error(t('msg_candidate_create_error', "Aday eklenemedi!")); }
  };

  const handleCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") return toast.error(t('msg_pdf_only', "Sadece PDF formatında bir dosya yükleyin."));
    
    const tLoading = toast.loading(t('msg_uploading_cv', "CV yükleniyor..."));
    const formData = new FormData(); formData.append("file", file);
    try {
      const res = await atsApi.uploadCV(detailCandidate.id, formData);
      setDetailCandidate({ ...detailCandidate, cv_url: res.data.cv_url, rating: res.data.ai_rating, notes: res.data.ai_notes });
      fetchJobsAndPositions(); 
      toast.success(t('msg_cv_uploaded', "CV başarıyla yüklendi."), { id: tLoading });
    } catch (err) { toast.error(t('msg_cv_upload_error', "CV Yüklenemedi"), { id: tLoading }); }
  };

  const handleAIAnalyze = async () => {
    if (!detailCandidate.cv_url) return toast.error(t('msg_upload_cv_first', "Önce adayın CV'sini yüklemelisiniz."));
    
    setIsAnalyzing(true);
    const tLoading = toast.loading(t('msg_ai_analyzing', "Gemini AI özgeçmişi derinlemesine inceliyor..."));
    
    try {
      const res = await api.get(`/ats/candidates/${detailCandidate.id}/analyze`); 
      
      setDetailCandidate(prev => ({
        ...prev,
        rating: res.data.match_score,
        notes: `🤖 ${t('lbl_ai_evaluation', 'AI Değerlendirmesi')}: ${res.data.summary}`
      }));

      fetchJobsAndPositions();
      toast.success(t('msg_ai_analysis_done', "Yapay zeka analizi tamamlandı!"), { id: tLoading });
    } catch (err) {
      toast.error(t('msg_ai_analysis_error', "Yapay zeka şu an meşgul veya bir hata oluştu."), { id: tLoading });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDragStart = (e, candidateId) => { e.dataTransfer.setData("candidateId", candidateId.toString()); };
  const handleDragOver = (e) => { e.preventDefault(); };

  const handleDrop = async (e, newStage) => {
    e.preventDefault();
    const candidateIdStr = e.dataTransfer.getData("candidateId");
    if (!candidateIdStr) return;
    const candidateId = parseInt(candidateIdStr);

    const candidate = selectedJob.candidates.find(c => c.id === candidateId);
    if (!candidate || candidate.stage === newStage) return;

    if (newStage === 'ADAY_VAZGECTI') {
        const confirmMsg = t('msg_confirm_withdraw', "{{name}} isimli adayın teklifi reddettiğini veya çekildiğini onaylıyor musunuz?").replace('{{name}}', candidate.first_name);
        if (!window.confirm(confirmMsg)) return;
    }
    if (newStage === 'RED') {
      setRejectCandidate(candidate);
      
      // 🌍 Red maili şablonunu dile göre dinamik oluştur
      const mailSubject = t('mail_reject_subject', "{{job}} Pozisyonu Başvurunuz Hakkında").replace('{{job}}', selectedJob.title);
      const mailBody = t('mail_reject_body', "Sayın {{first_name}} {{last_name}},\n\nŞirketimize ve {{job}} pozisyonuna göstermiş olduğunuz ilgi için teşekkür ederiz.\n\nÖzgeçmişinizi ve mülakat sonuçlarınızı dikkatle inceledik. Ne yazık ki, bu aşamada sizinle sürece devam edemeyeceğimizi bildirmek isteriz.\n\nNitelikleriniz gerçekten etkileyiciydi. İleride profilinize uygun yeni bir fırsat doğması halinde sizinle tekrar iletişime geçmekten memnuniyet duyarız.\n\nKariyerinizde başarılar dileriz.\n\nSaygılarımızla,\nİnsan Kaynakları Departmanı")
        .replace('{{first_name}}', candidate.first_name)
        .replace('{{last_name}}', candidate.last_name)
        .replace('{{job}}', selectedJob.title);

      setRejectMail({ subject: mailSubject, body: mailBody });
      return; 
    }
    if (newStage === 'TEKLIF') {
        setOfferCandidate(candidate);
    }
    if (newStage === 'ISE_ALINDI') {
      const matchedPosition = findMatchingPosition(selectedJob.title, selectedJob.department);
      setHireCandidate({ 
        ...candidate,
        tc_no: "",
        department: selectedJob.department,
        position: selectedJob.title,
        department_id: matchedPosition?.department_id || "",
        position_id: matchedPosition?.id || "",
        gross_salary: "",
        currency: "TRY",
        hire_date: new Date().toISOString().split('T')[0]
      });
      return; 
    }

    const updatedCandidates = selectedJob.candidates.map(c => c.id === candidateId ? { ...c, stage: newStage } : c);
    setSelectedJob({ ...selectedJob, candidates: updatedCandidates });

    try {
      await atsApi.updateStage(candidateId, newStage);
      fetchJobsAndPositions(); 
    } catch (err) { 
        toast.error(t('msg_stage_update_error', "Aşama güncellenirken hata oluştu."));
        fetchJobsAndPositions(); 
    }
  };

  const handleSaveCandidateDetails = async (e) => {
    e.preventDefault();
    const tLoading = toast.loading(t('msg_saving_notes', "Değerlendirme notları kaydediliyor..."));
    try {
      await api.put(`/ats/candidates/${detailCandidate.id}/rating`, {
        hr_rating_communication: detailCandidate.hr_rating_communication || 0,
        hr_rating_technical: detailCandidate.hr_rating_technical || 0,
        hr_rating_culture: detailCandidate.hr_rating_culture || 0,
        hr_rating_motivation: detailCandidate.hr_rating_motivation || 0,
        hr_notes_pros: detailCandidate.hr_notes_pros || "",
        hr_notes_cons: detailCandidate.hr_notes_cons || "",
        hr_notes_overall: detailCandidate.hr_notes_overall || "",
        workflow_badges: detailCandidate.workflow_badges || "[]"
      });
      setDetailCandidate(null); 
      fetchJobsAndPositions(); 
      toast.success(t('msg_saved_successfully', "Başarıyla kaydedildi."), { id: tLoading });
    } catch (err) { toast.error(t('msg_save_error', "Değerlendirme notları kaydedilemedi!"), { id: tLoading }); }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    const tLoading = toast.loading(t('msg_sending_reject_mail', "Red maili gönderiliyor..."));
    try {
      await atsApi.rejectCandidate(rejectCandidate.id, rejectMail);
      const successMsg = t('msg_reject_mail_sent', "{{name}} isimli adaya bilgilendirme maili gönderildi ve reddedildi.").replace('{{name}}', rejectCandidate.first_name);
      toast.success(successMsg, { id: tLoading });
      setRejectCandidate(null); 
      fetchJobsAndPositions();
    } catch (err) { toast.error(t('msg_error_occurred', "Hata oluştu."), { id: tLoading }); }
  };

  const handleHireSubmit = async (e) => {
    e.preventDefault();
    if (!hireCandidate.department_id || !hireCandidate.position_id) {
      toast.error(t('msg_hire_pick_org_slot', "Lütfen işe alım için bir departman ve pozisyon seçin."));
      return;
    }
    const tLoading = toast.loading(t('msg_creating_employee_card', "Personel kartı oluşturuluyor..."));
    try {
      await createEmployee({
        first_name: hireCandidate.first_name,
        last_name: hireCandidate.last_name,
        identity_no: hireCandidate.tc_no,
        email: hireCandidate.email,
        phone: hireCandidate.phone || "",
        department_id: parseInt(hireCandidate.department_id, 10),
        position_id: parseInt(hireCandidate.position_id, 10),
        gross_salary: parseFloat(hireCandidate.gross_salary || 0),
        salary_currency: hireCandidate.currency,
        hire_date: hireCandidate.hire_date,
        candidate_id: hireCandidate.id,
        role: "EMPLOYEE"
      });
      const successMsg = t('msg_hire_success', "{{name}} artık resmi bir personel.").replace('{{name}}', hireCandidate.first_name);
      toast.success(successMsg, { id: tLoading });
      setHireCandidate(null); fetchJobsAndPositions();
    } catch (err) { toast.error(t('msg_hire_error', "Personel oluşturulamadı! Zorunlu alanları kontrol edin."), { id: tLoading }); }
  };

  const handleDeleteCandidate = async (e, candidateId, candidateName) => {
    e.stopPropagation(); 
    const confirmMsg = t('msg_confirm_delete_candidate', "{{name}} isimli adayı sistemden tamamen silmek istediğinize emin misiniz?").replace('{{name}}', candidateName);
    if (!window.confirm(confirmMsg)) return;
    try { await atsApi.deleteCandidate(candidateId); fetchJobsAndPositions(); toast.success(t('msg_candidate_deleted', "Aday silindi.")); } 
    catch (err) { toast.error(t('msg_candidate_delete_error', "Aday silinirken hata oluştu.")); }
  };

  const handleGenerateOfferLetter = async (e) => {
      e.preventDefault();
      const tLoading = toast.loading(t('msg_generating_offer_pdf', "Teklif mektubu (PDF) üretiliyor..."));
      try {
          const payload = { salary: parseFloat(offerDetails.salary), currency: offerDetails.currency, position_title: selectedJob.title, start_date: offerDetails.start_date };
          const response = await atsApi.generateOfferLetter(offerCandidate.id, payload);
          
          const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
          const link = document.createElement('a'); link.href = url;
          let filename = `Offer_${offerCandidate.last_name}.pdf`; // Dosya adı güvenli hale getirildi
          link.setAttribute('download', filename); document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
          setOfferCandidate(null); 
          toast.success(t('msg_offer_downloaded', "Mektup başarıyla indirildi."), { id: tLoading });
      } catch (error) { toast.error(t('msg_offer_error', "Teklif mektubu oluşturulurken bir hata oluştu."), { id: tLoading }); }
  };

  const getGlobalScore = (candidate) => {
    if (!candidate) return "0.0";
    
    const hrScores = [
      parseFloat(candidate.hr_rating_communication) || 0,
      parseFloat(candidate.hr_rating_technical) || 0,
      parseFloat(candidate.hr_rating_culture) || 0,
      parseFloat(candidate.hr_rating_motivation) || 0
    ].filter(s => s > 0);
    
    const hrAvg = hrScores.length > 0 ? (hrScores.reduce((a, b) => a + b, 0) / hrScores.length) : 0;
    
    let rawAiScore = parseFloat(candidate.rating) || 0;
    let aiScore = rawAiScore > 5 ? (rawAiScore / 20) : rawAiScore; 

    let result = 0;
    if (hrAvg > 0 && aiScore > 0) result = (hrAvg + aiScore) / 2;
    else if (hrAvg > 0) result = hrAvg;
    else if (aiScore > 0) result = aiScore;

    return result > 0 ? result.toFixed(1) : "0.0";
  };

  const RatingRow = ({ label, field, icon }) => (
    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button" onClick={() => setDetailCandidate({...detailCandidate, [field]: star})} className={`p-1.5 rounded-lg transition-all ${detailCandidate[field] >= star ? 'text-amber-400 bg-amber-50' : 'text-slate-200 bg-white hover:bg-slate-50 hover:text-amber-200'}`}>
            <Star size={18} fill={detailCandidate[field] >= star ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
    </div>
  );

  const actionButtons = (
    <>
      <button onClick={() => setIsJobModalOpen(true)} className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 px-6 py-3.5 rounded-2xl text-xs font-black hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2 uppercase active:scale-95">
        <Briefcase size={16} className="text-cyan-600" /> {t('btn_new_job', 'YENİ İLAN AÇ')}
      </button>
      <button onClick={() => setIsCandidateModalOpen(true)} disabled={!selectedJob} className="flex-1 md:flex-none bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-xs font-black transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 hover:bg-cyan-600 disabled:opacity-50 uppercase active:scale-95">
        <UserPlus size={16}/> {t('btn_add_candidate', 'ADAY EKLE')}
      </button>
    </>
  );

  return (
    <div className="h-full flex flex-col font-sans">
      <Toaster position="top-right" />
      
      {/* ================= AKSİYON ÇUBUĞU ================= */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-6 shrink-0 w-full">
        <div className="w-full md:w-auto flex-1 md:flex-none">
          <select 
            className="w-full min-w-[250px] bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 shadow-sm uppercase tracking-widest"
            value={selectedJob?.id || ""}
            onChange={(e) => setSelectedJob(jobs.find(j => j.id === parseInt(e.target.value)))}
          >
            {jobs.length === 0 && <option value="">{t('opt_no_active_job', 'Aktif İlan Yok')}</option>}
            {jobs.map(job => (
              <option key={job.id} value={job.id}>{job.title} ({job.department})</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 w-full md:w-auto lg:hidden">
          {actionButtons}
        </div>
      </div>

      <div className={`hidden lg:flex fixed bottom-6 z-40 gap-3 ${i18n.language === 'ar' ? 'left-6' : 'right-6'}`}>
        <div className="rounded-[1.75rem] bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl shadow-slate-900/10 p-3 flex items-center gap-3">
          {actionButtons}
        </div>
      </div>

      {/* ================= KANBAN BOARD ALANI ================= */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {!selectedJob ? (
          <div className="w-full flex flex-col items-center justify-center text-slate-400 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-10">
              <Briefcase size={64} className="mb-4 opacity-50" />
              <p className="font-black text-sm uppercase tracking-widest text-center">{t('msg_empty_board', 'LÜTFEN BİR İLAN SEÇİN VEYA YENİ BİR AÇIK İLAN OLUŞTURUN')}</p>
              <p className="text-xs font-medium mt-2">{t('msg_empty_board_sub', 'Aday havuzunuzu yönetmek için yukarıdaki menüyü kullanın.')}</p>
          </div>
        ) : (
          stages.map(stage => {
            const stageCandidates = (selectedJob.candidates || []).filter(c => c.stage === stage.id);
            return (
              <div key={stage.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage.id)} className={`flex-shrink-0 w-80 rounded-[2rem] border ${stage.color} flex flex-col max-h-[70vh]`}>
                <div className="p-4 border-b border-inherit bg-white/50 rounded-t-[2rem] flex justify-between items-center backdrop-blur-sm">
                  <h3 className="font-black text-sm tracking-wider uppercase">{stage.title}</h3>
                  <span className="bg-white px-2 py-1 rounded-lg text-[10px] font-black shadow-sm">{localizedNumber(stageCandidates.length)}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {stageCandidates.map(candidate => {
                    const unifiedScore = getGlobalScore(candidate);

                    return (
                    <div key={candidate.id} draggable onDragStart={(e) => handleDragStart(e, candidate.id)} onClick={() => setDetailCandidate({...candidate})} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-cyan-300 transition-all relative">
                      
                      <button 
                        onClick={(e) => handleDeleteCandidate(e, candidate.id, candidate.first_name)} 
                        className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all z-20"
                        title={t('tooltip_delete_candidate', "Adayı Sil")}
                      >
                        <Trash2 size={16} />
                      </button>

                      {unifiedScore !== "0.0" && (
                        <div className="absolute top-10 right-3 flex items-center gap-1 text-amber-400 z-10" title={t('tooltip_global_score', "Genel Uyum Skoru (İK + AI)")}>
                          <Star size={12} fill="currentColor" />
                          <span className="text-[10px] font-black">{unifiedScore}</span>
                        </div>
                      )}
                      
                      {candidate.cv_url && <div className="absolute bottom-3 right-3 text-indigo-400 opacity-60 z-10"><FileText size={14} /></div>}

                      {parseWorkflowBadges(candidate).length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1.5 pr-6">
                          {parseWorkflowBadges(candidate).slice(0, 3).map((badgeKey) => (
                            <span key={badgeKey} className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                              badgeKey === 'employee_record_created'
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border border-cyan-200 bg-cyan-50 text-cyan-700'
                            }`}>
                              {badgeKey === 'employee_record_created' ? <UserCheck size={11} /> : <CheckCircle size={11} />}
                              {getWorkflowBadgeLabel(badgeKey)}
                            </span>
                          ))}
                          {parseWorkflowBadges(candidate).length > 3 && (
                            <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600">
                              +{parseWorkflowBadges(candidate).length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-2 mt-1">
                        <div className="flex items-center gap-2 pr-10">
                          <GripVertical size={14} className="text-slate-300 cursor-grab"/>
                          <h4 className="font-bold text-sm text-slate-800 line-clamp-1 uppercase">{candidate.first_name} {candidate.last_name}</h4>
                        </div>
                      </div>
                      <div className="pl-5 space-y-1 pr-6">
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate"><Mail size={10} className="shrink-0"/> {candidate.email}</p>
                        {candidate.phone && <p className="text-[10px] text-slate-500 flex items-center gap-1"><Phone size={10} className="shrink-0"/> {candidate.phone}</p>}
                      </div>
                    </div>
                  )})}
                  {stageCandidates.length === 0 && (
                    <div className="h-full min-h-[100px] flex items-center justify-center border-2 border-dashed border-inherit rounded-2xl opacity-40">
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {stage.id === 'ISE_ALINDI'
                          ? t('lbl_drag_to_hire', 'İŞE ALIM İÇİN BURAYA SÜRÜKLE')
                          : t('lbl_drag_here', 'BURAYA SÜRÜKLE')}
                      </span>
                    </div>
                  )}
                </div>
                {stage.id === 'TEKLIF' && stageCandidates.length > 0 && (
                    <div className="p-3 border-t border-indigo-200 bg-indigo-100/50 rounded-b-[2rem] text-center">
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{t('lbl_click_to_offer', 'Sözleşme oluşturmak için adayın üzerine tıklayın.')}</p>
                    </div>
                )}
                {stage.id === 'ISE_ALINDI' && (
                    <div className="p-3 border-t border-emerald-200 bg-emerald-100/50 rounded-b-[2rem] text-center">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                          {t('lbl_drop_to_open_hire_modal', 'ADAYI BURAYA BIRAKTIĞINDA PERSONEL KARTI AÇILIR')}
                        </p>
                    </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ================= MODALLAR ================= */}

      {/* 1. İLAN EKLEME MODALI */}
      {isJobModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
              <h3 className="text-xl font-black italic tracking-tighter flex items-center gap-3 uppercase">
                <div className="p-2 bg-cyan-500 rounded-xl"><Briefcase size={20}/></div>
                {t('modal_title_new_job', 'YENİ İLAN AÇ')}
              </h3>
              <button onClick={() => setIsJobModalOpen(false)} className="hover:rotate-90 transition-all"><XCircle size={24}/></button>
            </div>
            <form onSubmit={handleCreateJob} className="p-10 overflow-y-auto space-y-8 bg-slate-50 custom-scrollbar">
              <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem]">
                <label className="text-xs font-black text-indigo-700 block mb-3 flex items-center gap-2 uppercase tracking-widest">
                  <Network size={16}/> {t('lbl_select_position_from_org', 'ORGANİZASYONDAN BOŞ KADRO SEÇ')}
                </label>
                <select onChange={handlePositionSelect} className="w-full bg-white border-2 border-indigo-200 p-4 rounded-2xl text-sm font-bold outline-none text-slate-700 shadow-sm focus:border-indigo-500 uppercase">
                  <option value="">- {t('opt_manual_job', 'MANUEL İLAN GİRECEĞİM')} -</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.department})</option>
                  ))}
                </select>
                <p className="text-[10px] text-indigo-500 mt-3 font-bold uppercase tracking-widest">{t('msg_auto_fill_warning', 'SEÇTİĞİNİZ KADRONUN ADI VE DEPARTMANI OTOMATİK DOLDURULACAKTIR.')}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[11px] font-black tracking-wider text-slate-500 block mb-2 uppercase">{t('lbl_job_title', 'İLAN / POZİSYON ADI')}</label>
                  <input required type="text" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-cyan-500 shadow-sm font-bold uppercase"/>
                </div>
                <div>
                  <label className="text-[11px] font-black tracking-wider text-slate-500 block mb-2 uppercase">{t('lbl_department', 'DEPARTMAN')}</label>
                  <input required type="text" value={newJob.department} onChange={e => setNewJob({...newJob, department: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-cyan-500 shadow-sm font-bold uppercase" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black tracking-wider text-slate-500 block mb-2 uppercase">{t('lbl_job_desc', 'İLAN AÇIKLAMASI VE ARANAN NİTELİKLER')}</label>
                <textarea required rows="6" value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-cyan-500 resize-none shadow-sm font-medium leading-relaxed"></textarea>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs hover:bg-cyan-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95 uppercase tracking-widest mt-2">
                {t('btn_publish_job', 'İLANI YAYINA AL')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. ADAY EKLEME MODALI */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
              <h3 className="text-xl font-black italic tracking-tighter flex items-center gap-3 uppercase">
                <div className="p-2 bg-cyan-500 rounded-xl"><Users size={20}/></div>
                {t('modal_title_new_candidate', 'YENİ ADAY EKLE')}
              </h3>
              <button onClick={() => setIsCandidateModalOpen(false)} className="hover:rotate-90 transition-all"><XCircle size={28}/></button>
            </div>
            <form onSubmit={handleCreateCandidate} className="p-8 space-y-6 bg-slate-50 overflow-y-auto custom-scrollbar">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[11px] font-black tracking-wider text-slate-500 block mb-2 uppercase">{t('lbl_first_name', 'ADI')} <span className="text-rose-500">*</span></label>
                  <input required type="text" value={newCandidate.first_name} onChange={e => setNewCandidate({...newCandidate, first_name: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-cyan-500 shadow-sm font-bold uppercase" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-black tracking-wider text-slate-500 block mb-2 uppercase">{t('lbl_last_name', 'SOYADI')} <span className="text-rose-500">*</span></label>
                  <input required type="text" value={newCandidate.last_name} onChange={e => setNewCandidate({...newCandidate, last_name: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-cyan-500 shadow-sm font-bold uppercase" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black tracking-wider text-slate-500 block mb-2 uppercase">{t('lbl_email', 'E-POSTA')} <span className="text-rose-500">*</span></label>
                <input required type="email" value={newCandidate.email} onChange={e => setNewCandidate({...newCandidate, email: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-cyan-500 shadow-sm font-bold" />
              </div>
              <div>
                <label className="text-[11px] font-black tracking-wider text-slate-500 block mb-2 uppercase">{t('lbl_phone', 'TELEFON NUMARASI')}</label>
                <input type="text" value={newCandidate.phone} onChange={e => setNewCandidate({...newCandidate, phone: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-cyan-500 shadow-sm font-bold" placeholder={t('ph_optional', 'Opsiyonel')} />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs hover:bg-cyan-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95 uppercase tracking-widest">{t('btn_save_to_system', 'SİSTEME KAYDET')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. İŞE ALIM MODALI */}
      {hireCandidate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-600 p-6 flex justify-between items-center text-white shrink-0">
              <div>
                <h3 className="text-xl font-black italic tracking-tighter flex items-center gap-3 uppercase">
                   <div className="p-2 bg-emerald-500 rounded-xl"><UserPlus size={24}/></div>
                   {t('modal_title_hire', 'İŞE ALIMI TAMAMLA')}
                </h3>
                <p className="text-[10px] font-bold text-emerald-100 tracking-widest mt-1 ml-16 uppercase max-w-[30rem] leading-relaxed">{t('lbl_creating_emp_card', 'PERSONEL KARTI OLUŞTURULUYOR')}</p>
              </div>
              <button onClick={() => setHireCandidate(null)} className="hover:rotate-90 transition-all"><XCircle size={28}/></button>
            </div>
            <form onSubmit={handleHireSubmit} className="p-8 overflow-y-auto space-y-6 bg-slate-50 custom-scrollbar">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4 shadow-sm">
                <div className="w-14 h-14 bg-emerald-100 rounded-[1.5rem] flex items-center justify-center text-emerald-600 font-black text-xl border border-emerald-200 shrink-0 uppercase">
                  {hireCandidate.first_name[0]}{hireCandidate.last_name[0]}
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-lg uppercase">{hireCandidate.first_name} {hireCandidate.last_name}</h4>
                  <p className="text-xs font-bold text-slate-400">{hireCandidate.email}</p>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black tracking-wider text-slate-500 block mb-2 uppercase">{t('lbl_identity_no', 'KİMLİK / PASAPORT NO')} <span className="text-rose-500">*</span></label>
                <input required type="text" value={hireCandidate.tc_no || ""} onChange={e => setHireCandidate({...hireCandidate, tc_no: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-emerald-500 shadow-sm font-bold" placeholder={t('ph_identity', 'Kimlik Numarası')} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black tracking-wider text-slate-500 block mb-2 uppercase">{t('lbl_department', 'DEPARTMAN')} <span className="text-rose-500">*</span></label>
                  <select required value={hireCandidate.department_id || ""} onChange={e => {
                    const nextDepartmentId = e.target.value;
                    const nextDepartment = departments.find((dept) => dept.id === parseInt(nextDepartmentId, 10));
                    setHireCandidate({
                      ...hireCandidate,
                      department_id: nextDepartmentId,
                      department: nextDepartment?.name || "",
                      position_id: "",
                      position: ""
                    });
                  }} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-emerald-500 shadow-sm font-bold uppercase">
                    <option value="">-- {t('opt_select_dept', 'DEPARTMAN SEÇİNİZ')} --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black tracking-wider text-slate-500 block mb-2 uppercase">{t('lbl_position', 'POZİSYON / ÜNVAN')} <span className="text-rose-500">*</span></label>
                  <select required value={hireCandidate.position_id || ""} onChange={e => {
                    const nextPositionId = e.target.value;
                    const nextPosition = positions.find((pos) => pos.id === parseInt(nextPositionId, 10));
                    setHireCandidate({
                      ...hireCandidate,
                      position_id: nextPositionId,
                      position: nextPosition?.title || ""
                    });
                  }} disabled={!hireCandidate.department_id} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-emerald-500 shadow-sm font-bold uppercase disabled:opacity-50">
                    <option value="">-- {t('opt_select_position', 'POZİSYON SEÇİNİZ')} --</option>
                    {filteredHirePositions.map((pos) => (
                      <option key={pos.id} value={pos.id}>{pos.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black tracking-wider text-slate-500 block mb-2 uppercase">{t('lbl_gross_salary', 'BRÜT MAAŞ')} <span className="text-rose-500">*</span></label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input required type="number" min="0" value={hireCandidate.gross_salary} onChange={e => setHireCandidate({...hireCandidate, gross_salary: e.target.value})} className="flex-1 w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-emerald-500 shadow-sm font-black" placeholder="Örn: 45000" />
                    <select value={hireCandidate.currency} onChange={e => setHireCandidate({...hireCandidate, currency: e.target.value})} className="w-full sm:w-28 bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl text-sm font-black outline-none focus:border-emerald-500 text-slate-700">
                      {CURRENCY_OPTIONS.map((currency) => (
                        <option key={currency.value} value={currency.value}>{currency.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-black tracking-wider text-slate-500 block mb-2 uppercase">{t('lbl_hire_date', 'İŞE BAŞLAMA TARİHİ')} <span className="text-rose-500">*</span></label>
                  <input required type="date" value={hireCandidate.hire_date} onChange={e => setHireCandidate({...hireCandidate, hire_date: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-emerald-500 shadow-sm font-bold text-slate-700" />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-emerald-500 text-white py-5 rounded-[2rem] font-black text-xs hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/30 active:scale-95 uppercase tracking-widest">
                  {t('btn_save_official_employee', 'RESMİ PERSONEL OLARAK KAYDET')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ADAY DETAY & SCORECARD MODALI */}
      {detailCandidate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-inner uppercase">
                    {detailCandidate.first_name[0]}{detailCandidate.last_name[0]}
                </div>
                <div>
                  <h3 className="text-xl font-black italic tracking-tighter uppercase">{detailCandidate.first_name} {detailCandidate.last_name}</h3>
                  <p className="text-[10px] font-bold text-cyan-400 tracking-widest mt-1 uppercase flex items-center gap-2">
                     <Target size={12}/> {t('lbl_evaluation_center', 'ADAY DEĞERLENDİRME MERKEZİ (SCORECARD)')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                 <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl flex items-center gap-3 shadow-lg shadow-amber-500/10 hidden md:flex">
                     <div className="text-right">
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('lbl_global_score', 'GENEL UYUM SKORU')}</p>
                         <p className="text-xl font-black text-amber-400">{getGlobalScore(detailCandidate)} <span className="text-sm text-slate-500">/ 5.0</span></p>
                     </div>
                     <Star size={32} className="text-amber-400" fill="currentColor" />
                 </div>
                 <button onClick={() => setDetailCandidate(null)} className="hover:rotate-90 transition-all text-slate-400 hover:text-white"><XCircle size={32}/></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200 custom-scrollbar">
              {/* SOL KOLON: SİSTEM & YZ */}
              <div className="w-full lg:w-1/3 p-8 space-y-6 bg-slate-50/50">
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-2">{t('lbl_contact_and_cv', 'İLETİŞİM VE CV')}</h4>
                   <p className="text-sm font-bold text-slate-700 flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm"><Mail size={16} className="text-cyan-500 shrink-0"/> {detailCandidate.email}</p>
                   {detailCandidate.phone && <p className="text-sm font-bold text-slate-700 flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm"><Phone size={16} className="text-cyan-500 shrink-0"/> {detailCandidate.phone}</p>}
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-[2rem] shadow-inner space-y-4">
                  {detailCandidate.cv_url ? (
                    <>
                      <a href={getAbsoluteFileUrl(detailCandidate.cv_url)} target="_blank" rel="noreferrer" className="bg-indigo-600 text-white px-6 py-4 rounded-2xl text-xs font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 w-full uppercase tracking-widest">
                        <FileText size={16}/> {t('btn_view_cv', "CV'Yİ GÖRÜNTÜLE")}
                      </a>
                      
                      {/* 🎯 AI ANALİZ BUTONU */}
                      <button 
                        onClick={handleAIAnalyze} 
                        disabled={isAnalyzing}
                        className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 text-white px-6 py-4 rounded-2xl text-xs font-black hover:from-cyan-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 uppercase tracking-widest disabled:opacity-50"
                      >
                        {isAnalyzing ? (
                          <><Loader2 size={18} className="animate-spin"/> {t('btn_analyzing', 'İNCELENİYOR...')}</>
                        ) : (
                          <><Sparkles size={18}/> ✨ {t('btn_start_ai_analysis', 'AI ANALİZİNİ BAŞLAT')}</>
                        )}
                      </button>
                    </>
                  ) : (
                    <label className="bg-white text-indigo-600 border-2 border-indigo-200 px-6 py-4 rounded-2xl text-xs font-black hover:bg-indigo-50 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm w-full uppercase tracking-widest">
                      <UploadCloud size={18}/> {t('btn_upload_pdf', 'PDF YÜKLE')}
                      <input type="file" accept=".pdf" className="hidden" onChange={handleCVUpload} />
                    </label>
                  )}
                </div>

                {/* 🎯 AI ANALİZ SONUÇLARI */}
                {detailCandidate.rating > 0 && (
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 rounded-[2rem] shadow-xl relative overflow-hidden mt-8">
                     <Bot className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-700 opacity-20 pointer-events-none" />
                     <div className="flex items-center gap-2 mb-4">
                        <div className="bg-cyan-500 p-2 rounded-lg"><Bot size={16} className="text-white"/></div>
                        <h4 className="text-[11px] font-black text-cyan-400 uppercase tracking-widest">{t('lbl_ai_analysis_title', 'YAPAY ZEKA (AI) ANALİZİ')}</h4>
                     </div>
                     <div className="flex items-end gap-2 mb-4 border-b border-slate-700 pb-4">
                        <span className="text-3xl font-black text-amber-400">%{detailCandidate.rating}</span>
                        <span className="text-xs font-bold text-slate-400 mb-1 ml-2">{t('lbl_match_score', 'Uyum Skoru')}</span>
                     </div>
                     <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                        "{detailCandidate.notes?.replace(`🤖 ${t('lbl_ai_evaluation', 'AI Değerlendirmesi')}: `, '') || t('lbl_no_ai_note', 'Yapay zeka notu bulunamadı.')}"
                     </p>
                  </div>
                )}
              </div>

              {/* SAĞ KOLON: İK SCORECARD */}
              <div className="w-full lg:w-2/3 p-8 bg-white space-y-8">
                <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                       <Target size={14}/> {t('lbl_competency_eval', 'YETKİNLİK BAZLI DEĞERLENDİRME (NİCEL)')}
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <RatingRow label={t('lbl_rating_comm', 'İletişim ve İfade')} field="hr_rating_communication" icon={<MessageSquare size={16}/>} />
                      <RatingRow label={t('lbl_rating_tech', 'Mesleki / Teknik')} field="hr_rating_technical" icon={<Briefcase size={16}/>} />
                      <RatingRow label={t('lbl_rating_culture', 'Kültürel Uyum')} field="hr_rating_culture" icon={<Users size={16}/>} />
                      <RatingRow label={t('lbl_rating_motivation', 'Özgüven & Motivasyon')} field="hr_rating_motivation" icon={<Star size={16}/>} />
                   </div>
                </div>

                <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                       <FileText size={14}/> {t('lbl_interview_notes', 'MÜLAKAT NOTLARI (NİTEL)')}
                   </h4>
                   <div className="space-y-4">
                      <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex gap-3 focus-within:border-emerald-300 focus-within:bg-white transition-colors">
                          <ThumbsUp size={18} className="text-emerald-500 shrink-0 mt-1"/>
                          <div className="flex-1">
                             <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block mb-1">{t('lbl_pros', 'Güçlü Yönler (Artılar)')}</label>
                             <textarea rows="2" value={detailCandidate.hr_notes_pros || ""} onChange={e => setDetailCandidate({...detailCandidate, hr_notes_pros: e.target.value})} className="w-full bg-transparent text-sm outline-none resize-y placeholder:text-emerald-300/50 font-medium text-slate-700" placeholder={t('ph_pros', "Adayın mülakatta en çok parladığı konular...")}></textarea>
                          </div>
                      </div>

                      <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl flex gap-3 focus-within:border-rose-300 focus-within:bg-white transition-colors">
                          <ThumbsDown size={18} className="text-rose-500 shrink-0 mt-1"/>
                          <div className="flex-1">
                             <label className="text-[10px] font-black text-rose-700 uppercase tracking-widest block mb-1">{t('lbl_cons', 'Soru İşaretleri (Eksiler)')}</label>
                             <textarea rows="2" value={detailCandidate.hr_notes_cons || ""} onChange={e => setDetailCandidate({...detailCandidate, hr_notes_cons: e.target.value})} className="w-full bg-transparent text-sm outline-none resize-y placeholder:text-rose-300/50 font-medium text-slate-700" placeholder={t('ph_cons', "Adayla ilgili endişeler veya yetersiz kaldığı konular...")}></textarea>
                          </div>
                      </div>

                      <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex gap-3 focus-within:border-indigo-300 focus-within:bg-white transition-colors">
                          <UserCheck size={18} className="text-indigo-500 shrink-0 mt-1"/>
                          <div className="flex-1">
                             <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block mb-1">{t('lbl_overall', 'Genel İK Kararı / Özet')}</label>
                             <textarea rows="3" value={detailCandidate.hr_notes_overall || ""} onChange={e => setDetailCandidate({...detailCandidate, hr_notes_overall: e.target.value})} className="w-full bg-transparent text-sm outline-none resize-y placeholder:text-indigo-300/50 font-medium text-slate-700" placeholder={t('ph_overall', "İşe alım yöneticisine bu adayı öneriyor musunuz? Genel özet...")}></textarea>
                          </div>
                      </div>
                   </div>
                </div>

                <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                       <CheckCircle size={14}/> {t('lbl_process_badges', 'SÜREÇ ROZETLERİ')}
                   </h4>
                   <div className="flex flex-wrap gap-3">
                      {workflowBadgeCatalog.map((badge) => {
                        const isActive = parseWorkflowBadges(detailCandidate).includes(badge.key);
                        return (
                          <button
                            key={badge.key}
                            type="button"
                            onClick={() => toggleWorkflowBadge(badge.key)}
                            className={`rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                              isActive
                                ? badge.key === 'employee_record_created'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {badge.label}
                          </button>
                        );
                      })}
                   </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 flex gap-4 shrink-0">
               {detailCandidate.stage === 'TEKLIF' && (
                  <button onClick={() => { setOfferCandidate(detailCandidate); setDetailCandidate(null); }} className="flex-1 bg-indigo-50 border-2 border-indigo-200 text-indigo-600 px-4 py-5 rounded-[2rem] font-black text-xs hover:bg-indigo-100 transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2">
                    <Download size={16}/> {t('btn_generate_contract', 'SÖZLEŞME ÜRET')}
                  </button>
               )}
              <button onClick={handleSaveCandidateDetails} className="flex-[2] bg-slate-900 text-white px-8 py-5 rounded-[2rem] font-black text-xs hover:bg-cyan-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95 uppercase tracking-widest">
                {t('btn_save_eval_form', 'DEĞERLENDİRME FORMUNU KAYDET')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. RED MAİLİ MODALI */}
      {rejectCandidate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-rose-600 p-6 flex justify-between items-center text-white shrink-0">
              <div>
                <h3 className="text-xl font-black italic tracking-tighter flex items-center gap-3 uppercase">
                  <div className="p-2 bg-rose-500 rounded-xl"><Mail size={24}/></div>
                  {t('modal_title_reject', 'ADAYI REDDET VE BİLGİLENDİR')}
                </h3>
                <p className="text-[10px] font-bold text-rose-200 tracking-widest mt-1 ml-14 uppercase">{t('lbl_edit_mail_template', 'AŞAĞIDAKİ MAİL ŞABLONUNU DÜZENLEYEBİLİRSİNİZ')}</p>
              </div>
              <button onClick={() => setRejectCandidate(null)} className="hover:rotate-90 transition-all"><XCircle size={28}/></button>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-8 overflow-y-auto space-y-6 bg-slate-50 custom-scrollbar">
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 text-sm font-bold text-slate-700 flex gap-3 shadow-sm items-center">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest shrink-0">{t('lbl_to', 'KİME:')}</span> <span className="truncate">{rejectCandidate.email}</span>
              </div>
              <div>
                <label className="text-[11px] font-black tracking-widest text-slate-500 block mb-2 uppercase">{t('lbl_mail_subject', 'MAİL KONUSU')} <span className="text-rose-500">*</span></label>
                <input required type="text" value={rejectMail.subject} onChange={e => setRejectMail({...rejectMail, subject: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-rose-500 font-bold shadow-sm text-slate-800" />
              </div>
              <div>
                <label className="text-[11px] font-black tracking-widest text-slate-500 block mb-2 uppercase">{t('lbl_mail_body', 'MAİL İÇERİĞİ')} <span className="text-rose-500">*</span></label>
                <textarea required rows="10" value={rejectMail.body} onChange={e => setRejectMail({...rejectMail, body: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-5 rounded-[2rem] text-sm outline-none focus:border-rose-500 resize-y leading-relaxed font-medium shadow-sm text-slate-700" />
              </div>
              <div className="flex gap-4 pt-2 shrink-0">
                <button type="button" onClick={() => setRejectCandidate(null)} className="flex-1 bg-white border-2 border-slate-200 text-slate-600 py-5 rounded-[2rem] font-black text-xs hover:bg-slate-100 transition-all uppercase tracking-widest">
                  {t('btn_cancel', 'İPTAL ET')}
                </button>
                <button type="submit" className="flex-[2] bg-rose-500 text-white py-5 rounded-[2rem] font-black text-xs hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/30 flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest">
                  <Send size={18}/> {t('btn_send_and_reject', 'GÖNDER VE ADAYI REDDET')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. İŞ TEKLİFİ (OFFER LETTER) PDF ÜRETİM MODALI */}
      {offerCandidate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white shrink-0">
              <div>
                <h3 className="text-xl font-black italic tracking-tighter flex items-center gap-3 uppercase">
                  <div className="p-2 bg-indigo-500 rounded-xl"><FileText size={24}/></div>
                  {t('modal_title_offer', 'TEKLİF MEKTUBU OLUŞTUR')}
                </h3>
                <p className="text-[10px] font-bold text-indigo-200 tracking-widest mt-1 ml-14 uppercase">{t('lbl_preparing_pdf', 'RESMİ PDF BELGESİ HAZIRLANIYOR')}</p>
              </div>
              <button onClick={() => setOfferCandidate(null)} className="hover:rotate-90 transition-all"><XCircle size={28}/></button>
            </div>
            <form onSubmit={handleGenerateOfferLetter} className="p-8 overflow-y-auto space-y-6 bg-slate-50 custom-scrollbar">
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 text-sm font-bold flex gap-3 shadow-sm items-center">
                 <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 text-lg uppercase">
                     {offerCandidate.first_name[0]}{offerCandidate.last_name[0]}
                 </div>
                 <div>
                    <p className="text-slate-800 uppercase">{offerCandidate.first_name} {offerCandidate.last_name}</p>
                    <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">{selectedJob.title}</p>
                 </div>
              </div>
              <div>
                <label className="text-[11px] font-black tracking-wider text-slate-500 block mb-2 uppercase">{t('lbl_offered_salary', 'TEKLİF EDİLEN AYLIK MAAŞ')} <span className="text-rose-500">*</span></label>
                <div className="flex gap-2">
                    <input required type="number" min="0" value={offerDetails.salary} onChange={e => setOfferDetails({...offerDetails, salary: e.target.value})} className="flex-1 w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-indigo-500 shadow-sm font-bold text-slate-800" placeholder={t('ph_salary', 'Örn: 45000')} />
                    <select value={offerDetails.currency} onChange={e => setOfferDetails({...offerDetails, currency: e.target.value})} className="w-24 bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 text-slate-700">
                        {CURRENCY_OPTIONS.map((currency) => (
                          <option key={currency.value} value={currency.value}>{currency.label}</option>
                        ))}
                    </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black tracking-wider text-slate-500 block mb-2 uppercase">{t('lbl_planned_start_date', 'PLANLANAN İŞE BAŞLAMA TARİHİ')} <span className="text-rose-500">*</span></label>
                <input required type="date" value={offerDetails.start_date} onChange={e => setOfferDetails({...offerDetails, start_date: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-indigo-500 shadow-sm font-bold text-slate-700" />
              </div>
              <div className="flex gap-4 pt-2 shrink-0">
                <button type="button" onClick={() => setOfferCandidate(null)} className="flex-1 bg-white border-2 border-slate-200 text-slate-600 py-5 rounded-[2rem] font-black text-xs hover:bg-slate-100 transition-all uppercase tracking-widest">
                  {t('btn_cancel', 'İPTAL ET')}
                </button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest">
                  <Download size={18}/> {t('btn_download_pdf', 'PDF İNDİR')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ATS;

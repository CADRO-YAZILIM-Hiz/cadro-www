import React, { useState, useEffect, useMemo } from 'react';
import api, { trainingApi, getEmployees } from '../api/axios';
import { 
  GraduationCap, Calendar, Clock, Users, Trash2, XCircle, 
  UserPlus, Mail, AlertTriangle, CheckCircle2, User, Send, 
  FileSpreadsheet, CheckSquare 
} from 'lucide-react'; 
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi
import { localizeDigits } from '../utils/localizeNumber';
import FilterPopover from './FilterPopover';

const Training = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası

  // 🌍 Dinamik RTL ve Dil kontrolü
  const isArabic = i18n.language === 'ar';
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));

  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);

  const [trainings, setTrainings] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false); 
  
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [departmentFilterDraft, setDepartmentFilterDraft] = useState('');
  const [assignFilterOpen, setAssignFilterOpen] = useState(false);
  
  const [newTraining, setNewTraining] = useState({ title: '', description: '', instructor: '', location: '', training_date: '', training_time: '' });
  const [cancelMessage, setCancelMessage] = useState('');

  const translateDepartmentName = (value) => {
    if (!value) return t('lbl_unassigned_dept', 'Unassigned Department');
    return value;
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [trainRes, empRes] = await Promise.all([
        trainingApi.getTrainings(),
        getEmployees()
      ]);
      setTrainings(trainRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) { 
      toast.error(t('err_fetch_data', "Veriler çekilirken bir hata oluştu.")); 
    }
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewTraining({ title: '', description: '', instructor: '', location: '', training_date: '', training_time: '' });
  };

  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedEmployees([]);
    setSelectedTraining(null);
    setDepartmentFilter('');
    setDepartmentFilterDraft('');
  };

  const closeCancelModal = () => {
    setIsCancelModalOpen(false);
    setCancelMessage('');
    setSelectedTraining(null);
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
    setSelectedTraining(null);
  };

  const openCancelModalWithDraft = (training) => {
    setSelectedTraining(training);
    const dateStr = new Date(training.training_date).toLocaleDateString(locale);
    // 🌍 İptal taslağını çevirilerle dinamik yap
    const draftMsg = t('draft_cancel_msg', "Değerli Çalışma Arkadaşlarımız,\n\n{{date}} tarihinde gerçekleştirilmesi planlanan \"{{title}}\" konulu eğitimimiz iptal edilmiştir.\n\nBilginize sunar, iyi çalışmalar dileriz.")
                        .replace('{{date}}', dateStr)
                        .replace('{{title}}', training.title);
    setCancelMessage(draftMsg);
    setIsCancelModalOpen(true);
  };

  useEffect(() => {
    setDepartmentFilterDraft(departmentFilter);
  }, [departmentFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await trainingApi.createTraining(newTraining);
      toast.success(t('msg_training_scheduled', "Yeni eğitim başarıyla planlandı."));
      closeCreateModal();
      fetchData();
    } catch (err) { toast.error(t('err_schedule_training', "Eğitim planlanamadı!")); }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) return toast.error(t('err_select_min_one_emp', "Lütfen en az 1 personel seçin."));
    const tLoading = toast.loading(t('msg_assigning_sending', "Personel atanıyor ve mail gönderiliyor..."));
    try {
      await trainingApi.assignEmployees(selectedTraining.id, { employee_ids: selectedEmployees });
      toast.success(t('msg_assigned_invited', "Personeller atandı ve davetiyeler gönderildi!"), { id: tLoading });
      closeAssignModal();
      fetchData();
    } catch (err) { toast.error(t('err_assign_failed', "Atama işlemi başarısız oldu."), { id: tLoading }); }
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    const tLoading = toast.loading(t('msg_canceling_sending', "İptal ediliyor ve mailler gönderiliyor..."));
    try {
      await trainingApi.cancelTraining(selectedTraining.id, { custom_message: cancelMessage });
      toast.success(t('msg_training_canceled', "Eğitim iptal edildi ve katılımcılara bildirildi."), { id: tLoading });
      closeCancelModal();
      fetchData();
    } catch (err) { toast.error(t('err_cancel_failed', "İptal işlemi başarısız."), { id: tLoading }); }
  };

  const handleDelete = async (id) => {
    if(!window.confirm(t('msg_confirm_delete_training', "Bu eğitimi sistemden tamamen silmek istediğinize emin misiniz?"))) return;
    try {
      await trainingApi.deleteTraining(id);
      toast.success(t('msg_training_deleted', "Eğitim sistemden silindi."));
      fetchData();
    } catch (err) { toast.error(t('err_delete_training', "Eğitim silinemedi.")); }
  };

  const toggleEmployeeSelection = (id) => {
    setSelectedEmployees(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const availableDepartments = useMemo(() => {
    return [...new Set((employees || []).map(emp => emp.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, locale));
  }, [employees, locale]);

  const assignedEmployeeIds = useMemo(() => {
    return new Set((selectedTraining?.participants || []).map(p => p.employee_id));
  }, [selectedTraining]);

  const visibleEmployees = useMemo(() => {
    if (!selectedTraining) return [];

    return (employees || []).filter(emp => {
      if (departmentFilter && emp.department !== departmentFilter) return false;
      return true;
    });
  }, [employees, selectedTraining, departmentFilter]);

  const visibleEmployeesByDepartment = useMemo(() => {
    return visibleEmployees.reduce((acc, emp) => {
      const deptName = emp.department || t('lbl_unassigned_dept', 'Unassigned Department');
      if (!acc[deptName]) acc[deptName] = [];
      acc[deptName].push(emp);
      return acc;
    }, {});
  }, [visibleEmployees, t]);

  const selectAllVisibleEmployees = () => {
    const visibleIds = visibleEmployees
      .filter(emp => !assignedEmployeeIds.has(emp.id))
      .map(emp => emp.id);
    setSelectedEmployees(prev => [...new Set([...prev, ...visibleIds])]);
  };

  const clearVisibleEmployees = () => {
    const visibleIds = new Set(visibleEmployees.map(emp => emp.id));
    setSelectedEmployees(prev => prev.filter(id => !visibleIds.has(id)));
  };

  const openAssignModal = async (training) => {
    try {
      const [trainRes, empRes] = await Promise.all([
        trainingApi.getTrainings(),
        getEmployees()
      ]);

      const refreshedTrainings = trainRes.data || [];
      const refreshedTraining = refreshedTrainings.find(item => item.id === training.id) || training;

      setTrainings(refreshedTrainings);
      setEmployees(empRes.data || []);
      setSelectedTraining(refreshedTraining);
      setSelectedEmployees([]);
      setDepartmentFilter('');
      setIsAssignModalOpen(true);
    } catch (err) {
      toast.error(t('err_fetch_data', "Veriler çekilirken bir hata oluştu."));
    }
  };

  const handleAttendance = async (participantId, status) => {
    try {
      await trainingApi.takeAttendance(participantId, status); 
      toast.success(t('msg_attendance_updated', "Yoklama durumu güncellendi."));
      fetchData(); 
      
      setSelectedTraining(prev => ({
          ...prev,
          participants: prev.participants.map(p => p.participant_id === participantId ? { ...p, attendance_status: status } : p)
      }));

    } catch (error) { toast.error(t('err_attendance_update', "Yoklama güncellenemedi!")); }
  };

  const exportToExcel = () => {
    if (!selectedTraining) return;
    downloadParticipantsPdf(selectedTraining);
    return;
    if (!selectedTraining || !selectedTraining.participants || selectedTraining.participants.length === 0) {
      toast.error(t('err_no_data_download', "İndirilecek veri bulunamadı."));
      return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += t('csv_headers', "Eğitim Adı,Tarih,Eğitmen,Personel Ad Soyad,Departman,Katılım Durumu\n");

    selectedTraining.participants.forEach(p => {
      let row = `"${selectedTraining.title}","${selectedTraining.training_date}","${selectedTraining.instructor}","${p.first_name} ${p.last_name}","${p.department || '-'}","${p.attendance_status}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Yoklama_${selectedTraining.title.replace(/\s+/g, '_')}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(t('msg_download_success', 'Belge indirildi.'));
  };

  const downloadParticipantsPdf = async (training) => {
    const tLoading = toast.loading(t('msg_preparing_pdf', 'PDF hazırlanıyor...'));
    try {
      const response = await trainingApi.getParticipantsReportPdf(training.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;

      let filename = `TrainingParticipants_${training.title.replace(/\s+/g, '_')}.pdf`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) filename = decodeURIComponent(matches[1].replace(/['"]/g, ''));
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('msg_download_success', 'Belge indirildi.'), { id: tLoading });
    } catch (error) {
      toast.error(t('err_pdf_failed', 'PDF oluşturulurken bir hata oluştu!'), { id: tLoading });
    }
  };

  // 🌍 Tarih Formatlayıcı
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(locale);
  };

  return (
    <div className="h-full flex flex-col gap-6 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? "top-left" : "top-right"} reverseOrder={false} />
      
      {/* ================= ÜST BUTON ALANI ================= */}
      <div className={`flex flex-col xl:flex-row justify-between items-center gap-4 shrink-0 w-full ${isArabic ? 'xl:flex-row-reverse' : ''}`}>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm w-full xl:w-auto">
          <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600"><GraduationCap size={16} /></div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            {t('lbl_participants', 'KATILIMCI')}: {localizedNumber(trainings.reduce((sum, training) => sum + (training.participants || []).length, 0))}
          </p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className={`bg-indigo-600 text-white px-6 py-3.5 rounded-2xl text-xs font-black hover:bg-slate-900 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2 active:scale-95 uppercase tracking-widest w-full md:w-auto justify-center ${isArabic ? 'flex-row-reverse' : ''}`}>
          <GraduationCap size={18}/> {t('btn_schedule_training', 'YENİ EĞİTİM PLANLA')}
        </button>
      </div>

      {/* ================= EĞİTİM KARTLARI GRİD ================= */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar pb-4 ${isArabic ? 'pl-2' : 'pr-2'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {trainings.length === 0 ? (
             <div className="col-span-full p-16 text-center text-slate-400 font-bold bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-sm uppercase tracking-widest text-sm">
               {t('msg_no_trainings_scheduled', 'HENÜZ PLANLANMIŞ BİR EĞİTİM BULUNMUYOR.')}
             </div>
          ) : (
            trainings.map(training => {
              
              const todayStr = new Date().toISOString().split('T')[0];
              const isPast = training.training_date < todayStr;

              return (
                <div key={training.id} className={`bg-white rounded-[2.5rem] p-6 shadow-md border hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ${training.status === 'CANCELLED' ? 'border-rose-100 shadow-rose-100/50 opacity-80' : isPast ? 'border-slate-200 opacity-90 hover:border-slate-300' : 'border-indigo-100 hover:border-indigo-300'} relative overflow-hidden flex flex-col group`}>
                  
                  <GraduationCap className={`absolute -bottom-6 opacity-5 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12 ${training.status === 'CANCELLED' ? 'text-rose-900' : 'text-indigo-900'} ${isArabic ? '-left-6' : '-right-6'}`} size={160}/>
                  
                  <div className="relative z-10 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${training.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' : isPast ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {training.status === 'CANCELLED' ? t('badge_cancelled', 'İPTAL EDİLDİ') : isPast ? t('badge_completed', 'TAMAMLANDI') : t('badge_approaching', 'YAKLAŞIYOR')}
                      </div>
                      <button onClick={() => handleDelete(training.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title={t('tooltip_delete', 'Sil')}>
                        <Trash2 size={18}/>
                      </button>
                    </div>
                    
                    <h3 className={`text-xl font-black text-slate-800 mb-2 uppercase ${isArabic ? 'text-right' : 'text-left'}`}>{training.title}</h3>
                    <p className={`text-xs text-slate-500 font-medium mb-6 line-clamp-2 ${isArabic ? 'text-right' : 'text-left'}`}>{training.description || t('lbl_no_description', "Açıklama bulunmuyor.")}</p>
                    
                    <div className="space-y-3 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 mb-6 shadow-inner">
                      <div className={`flex items-center gap-3 text-xs font-bold text-slate-700 uppercase tracking-wide ${isArabic ? 'flex-row-reverse justify-end' : ''}`}><User size={16} className="text-indigo-400 shrink-0"/> {t('lbl_instructor', 'EĞİTMEN')}: <span className={isArabic ? 'text-right' : 'text-left'}>{training.instructor}</span></div>
                      <div className={`flex items-center gap-3 text-xs font-bold text-slate-700 uppercase tracking-wide ${isArabic ? 'flex-row-reverse justify-end' : ''}`} dir="ltr"><Calendar size={16} className="text-indigo-400 shrink-0"/> {formatDate(training.training_date)}</div>
                      <div className={`flex items-center gap-3 text-xs font-bold text-slate-700 uppercase tracking-wide ${isArabic ? 'flex-row-reverse justify-end' : ''}`} dir="ltr"><Clock size={16} className="text-indigo-400 shrink-0"/> {training.training_time}</div>
                      <div className={`flex items-center gap-3 text-xs font-bold text-slate-700 uppercase tracking-wide ${isArabic ? 'flex-row-reverse justify-end' : ''}`}><Users size={16} className="text-indigo-400 shrink-0"/> {t('lbl_participants', 'KATILIMCI')}: {localizedNumber((training.participants || []).length)} {t('lbl_persons', 'KİŞİ')}</div>
                    </div>
                  </div>

                  <div className={`relative z-10 grid grid-cols-2 gap-2 mt-auto ${isArabic ? 'flex-row-reverse' : ''}`}>
                    {training.status !== 'CANCELLED' && (
                      <>
                        {!isPast ? (
                          <button onClick={() => openAssignModal(training)} className={`bg-slate-900 text-white py-3.5 rounded-[1.5rem] text-[10px] font-black tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-md uppercase active:scale-95 ${isArabic ? 'flex-row-reverse' : ''}`}>
                            <UserPlus size={14}/> {t('btn_assign_personnel', 'PERSONEL ATA')}
                          </button>
                        ) : (
                          <button onClick={() => { 
                            if((training.participants || []).length === 0) return toast.error(t('err_no_participants_assigned', "Bu eğitime kimse atanmamış."));
                            setSelectedTraining(training); 
                            setIsReportModalOpen(true); 
                          }} className={`bg-emerald-500 text-white py-3.5 rounded-[1.5rem] text-[10px] font-black tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-md uppercase active:scale-95 ${isArabic ? 'flex-row-reverse' : ''}`}>
                            <CheckSquare size={14}/> {t('btn_take_attendance', 'YOKLAMA YAP')}
                          </button>
                        )}
                        
                        <button onClick={() => openCancelModalWithDraft(training)} className={`bg-white border-2 border-slate-100 text-rose-500 py-3.5 rounded-[1.5rem] text-[10px] font-black tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2 uppercase active:scale-95 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <AlertTriangle size={14}/> {t('btn_cancel', 'İPTAL ET')}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => downloadParticipantsPdf(training)}
                      className={`col-span-2 bg-white border-2 border-indigo-100 text-indigo-700 py-3.5 rounded-[1.5rem] text-[10px] font-black tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 uppercase active:scale-95 ${isArabic ? 'flex-row-reverse' : ''}`}
                    >
                      <FileSpreadsheet size={14}/> {t('btn_participant_report_pdf', 'Participant Report PDF')}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= MODALLAR ================= */}

      {/* 1. EĞİTİM OLUŞTURMA MODALI */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 shrink-0">
              <h3 className="font-black text-white text-lg flex items-center gap-2 uppercase tracking-widest"><GraduationCap size={20}/> {t('modal_title_schedule_training', 'YENİ EĞİTİM PLANLA')}</h3>
              <button onClick={closeCreateModal} className={`text-indigo-200 hover:text-white transition-colors ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={28}/></button>
            </div>
            
            <form onSubmit={handleCreate} className="flex flex-col overflow-hidden h-full">
                <div className="p-8 overflow-y-auto space-y-6 bg-slate-50 custom-scrollbar">
                    <div>
                        <label className={`text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_training_title', 'EĞİTİM ADI / KONUSU')} <span className="text-rose-500">*</span></label>
                        <input required type="text" value={newTraining.title} onChange={e => setNewTraining({...newTraining, title: e.target.value})} className={`w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 shadow-sm ${isArabic ? 'text-right' : 'text-left'}`} placeholder={t('ph_training_title', "Örn: İleri Düzey Excel Eğitimi")}/>
                    </div>
                    <div>
                        <label className={`text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_training_desc', 'AÇIKLAMA')}</label>
                        <textarea rows="3" value={newTraining.description} onChange={e => setNewTraining({...newTraining, description: e.target.value})} className={`w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500 resize-none shadow-sm ${isArabic ? 'text-right' : 'text-left'}`} placeholder={t('ph_training_desc', "Eğitim içeriği hakkında kısa bilgi...")}></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                        <label className={`text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_instructor', 'EĞİTMEN')} <span className="text-rose-500">*</span></label>
                        <input required type="text" value={newTraining.instructor} onChange={e => setNewTraining({...newTraining, instructor: e.target.value})} className={`w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 shadow-sm ${isArabic ? 'text-right' : 'text-left'}`} placeholder={t('ph_instructor', "Örn: Ahmet Yılmaz")}/>
                        </div>
                        <div>
                        <label className={`text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_location', 'KONUM / LİNK')} <span className="text-rose-500">*</span></label>
                        <input required type="text" value={newTraining.location} onChange={e => setNewTraining({...newTraining, location: e.target.value})} className={`w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 shadow-sm ${isArabic ? 'text-right' : 'text-left'}`} placeholder={t('ph_location', "Toplantı Odası 1 veya Zoom Linki")}/>
                        </div>
                        <div>
                        <label className={`text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_date', 'TARİH')} <span className="text-rose-500">*</span></label>
                        <input required type="date" value={newTraining.training_date} onChange={e => setNewTraining({...newTraining, training_date: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 shadow-sm" dir={isArabic ? 'rtl' : 'ltr'}/>
                        </div>
                        <div>
                        <label className={`text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_time', 'SAAT')} <span className="text-rose-500">*</span></label>
                        <input required type="time" value={newTraining.training_time} onChange={e => setNewTraining({...newTraining, training_time: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 shadow-sm" dir="ltr"/>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 bg-white shrink-0">
                    <button type="submit" className={`w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <CheckCircle2 size={18}/> {t('btn_save_publish_training', 'EĞİTİMİ KAYDET VE YAYINLA')}
                    </button>
                </div>
            </form>

          </div>
        </div>
      )}

      {/* 2. PERSONEL ATAMA MODALI */}
      {isAssignModalOpen && selectedTraining && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in zoom-in-95">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 shrink-0 text-white">
              <div>
                <h3 className="font-black text-lg flex items-center gap-2 uppercase tracking-tighter"><Users size={20} className="text-indigo-400"/> {t('modal_title_assign_personnel', 'Assign Personnel to Training')}</h3>
                <p className={`text-[10px] font-bold text-slate-400 mt-1 tracking-widest uppercase ${isArabic ? 'text-right mr-7' : 'text-left ml-7'}`}>{selectedTraining.title}</p>
              </div>
              <button onClick={closeAssignModal} className={`text-slate-500 hover:text-white transition-colors ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={28}/></button>
            </div>
            
            <form onSubmit={handleAssign} className="flex flex-col h-full max-h-[60vh] bg-slate-50">
              <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3 text-indigo-800 text-[10px] font-black uppercase tracking-widest shadow-inner">
                <Mail size={18} className="text-indigo-500 shrink-0"/> {t('msg_invitation_will_be_sent', 'Invitation email will be sent to selected personnel.')}
              </div>

              <div className="p-4 bg-white border-b border-slate-100 space-y-3">
                <div className={`flex flex-wrap gap-2 ${isArabic ? 'justify-start' : 'justify-end'}`}>
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-widest">
                    {t('lbl_assigned_count', 'Assigned')}: {localizedNumber((selectedTraining.participants || []).length)}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-widest">
                    {t('lbl_selected_count', 'Selected')}: {localizedNumber(selectedEmployees.length)}
                  </span>
                </div>

                <FilterPopover
                  label={t('lbl_department_filter', 'Department Filter')}
                  open={assignFilterOpen}
                  active={Boolean(departmentFilter)}
                  onToggle={() => setAssignFilterOpen((prev) => !prev)}
                  onReset={() => setDepartmentFilterDraft('')}
                  onCancel={() => { setDepartmentFilterDraft(departmentFilter); setAssignFilterOpen(false); }}
                  onApply={() => { setDepartmentFilter(departmentFilterDraft); setAssignFilterOpen(false); }}
                  align={isArabic ? 'left' : 'right'}
                  panelWidthClass="w-[280px]"
                >
                  <select
                    value={departmentFilterDraft}
                    onChange={(e) => setDepartmentFilterDraft(e.target.value)}
                    className={`w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl text-[12px] font-bold outline-none focus:border-indigo-500 shadow-sm ${isArabic ? 'text-right' : 'text-left'}`}
                  >
                    <option value="">{t('opt_all_departments', 'All Departments')}</option>
                    {availableDepartments.map(dept => (
                      <option key={dept} value={dept}>{translateDepartmentName(dept)}</option>
                    ))}
                  </select>
                </FilterPopover>

                <div className={`flex flex-wrap gap-2 ${isArabic ? 'justify-start' : 'justify-end'}`}>
                  <button type="button" onClick={selectAllVisibleEmployees} className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all">
                    {t('btn_select_all_visible', 'Select Visible')}
                  </button>
                  <button type="button" onClick={clearVisibleEmployees} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                    {t('btn_clear_visible', 'Clear Visible')}
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                {visibleEmployees.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                    {t('msg_no_assignable_employee', 'No personnel found for this filter.')}
                  </div>
                ) : (
                  Object.entries(visibleEmployeesByDepartment).map(([deptName, deptEmployees]) => (
                    <div key={deptName} className="space-y-3">
                      <div className="flex items-center justify-between px-2">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{translateDepartmentName(deptName)}</p>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black uppercase tracking-widest">
                          {localizedNumber(deptEmployees.length)} {t('lbl_persons', 'People')}
                        </span>
                      </div>

                      {deptEmployees.map(emp => {
                        const isAlreadyAssigned = assignedEmployeeIds.has(emp.id);

                        return (
                          <label key={emp.id} className={`flex items-center gap-4 p-4 border-2 rounded-2xl transition-colors shadow-sm ${isAlreadyAssigned ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-75' : 'bg-white border-slate-100 cursor-pointer hover:border-indigo-400'} ${isArabic ? 'flex-row-reverse' : ''}`}>
                            <input 
                              type="checkbox" 
                              className="w-5 h-5 accent-indigo-600 rounded cursor-pointer disabled:cursor-not-allowed"
                              checked={isAlreadyAssigned || selectedEmployees.includes(emp.id)}
                              disabled={isAlreadyAssigned}
                              onChange={() => toggleEmployeeSelection(emp.id)}
                            />
                            <div className={`flex-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                              <div className={`flex flex-wrap items-center gap-2 ${isArabic ? 'justify-end' : 'justify-start'}`}>
                                <p className="text-sm font-black text-slate-800 uppercase">{emp.first_name} {emp.last_name}</p>
                                {isAlreadyAssigned && (
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-widest">
                                    {t('badge_already_assigned', 'Already Assigned')}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{translateDepartmentName(emp.department)} - {emp.position}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-6 border-t border-slate-100 shrink-0 bg-white">
                <button type="submit" className={`w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <Send size={18}/> {t('btn_assign_and_invite', '{{count}} PERSONELİ ATA VE DAVET ET').replace('{{count}}', localizedNumber(selectedEmployees.length))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. YOKLAMA VE RAPOR MODALI */}
      {isReportModalOpen && selectedTraining && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-600 shrink-0 text-white">
              <div>
                <h3 className="font-black text-lg flex items-center gap-2 uppercase tracking-tighter"><CheckSquare size={20} className="text-emerald-200"/> {t('modal_title_attendance_report', 'EĞİTİM YOKLAMASI VE RAPORU')}</h3>
                <p className={`text-[10px] font-bold text-emerald-200 mt-1 tracking-widest uppercase ${isArabic ? 'text-right mr-7' : 'text-left ml-7'}`}>{selectedTraining.title}</p>
              </div>
              <button onClick={closeReportModal} className={`text-emerald-200 hover:text-white transition-colors ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={28}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
              <div className={`flex justify-between items-center mb-6 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('lbl_registered_personnel_list', 'KAYITLI PERSONEL LİSTESİ')}</p>
                <button onClick={exportToExcel} className={`bg-white border-2 border-slate-200 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:border-emerald-500 transition-all shadow-sm active:scale-95 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <FileSpreadsheet size={14}/> {t('btn_participant_report_pdf', 'PDF İNDİR')}
                </button>
              </div>

              <div className="space-y-3">
                {(!selectedTraining.participants || selectedTraining.participants.length === 0) ? (
                  <p className="text-center text-slate-400 font-bold uppercase py-10 tracking-widest text-xs">{t('msg_no_one_assigned', 'BU EĞİTİME KİMSE ATANMAMIŞ.')}</p>
                ) : (
                  selectedTraining.participants.map(p => (
                    <div key={p.participant_id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm gap-4 ${isArabic ? 'md:flex-row-reverse' : ''}`}>
                      <div className={isArabic ? 'text-right' : 'text-left'}>
                        <p className="font-black text-slate-800 uppercase">{p.first_name} {p.last_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.department || '-'}</p>
                      </div>
                      
                      <div className={`flex gap-2 shrink-0 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <button onClick={() => handleAttendance(p.participant_id, 'KATILDI')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${p.attendance_status === 'KATILDI' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600'}`}>
                          {t('btn_attended', 'KATILDI')}
                        </button>
                        <button onClick={() => handleAttendance(p.participant_id, 'KATILMADI')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${p.attendance_status === 'KATILMADI' ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600'}`}>
                          {t('btn_not_attended', 'KATILMADI')}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. İPTAL VE MAİL ONAY MODALI */}
      {isCancelModalOpen && selectedTraining && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-rose-600 text-white shrink-0">
              <div>
                <h3 className="font-black text-lg flex items-center gap-2 uppercase tracking-tighter"><AlertTriangle size={20} className="text-rose-200"/> {t('modal_title_cancel_training', 'EĞİTİMİ İPTAL ET')}</h3>
                <p className={`text-[10px] font-bold text-rose-200 mt-1 uppercase tracking-widest ${isArabic ? 'text-right mr-7' : 'text-left ml-7'}`}>{t('lbl_cancellation_draft', 'İPTAL BİLDİRİM TASLAĞI')}</p>
              </div>
              <button onClick={closeCancelModal} className={`text-rose-300 hover:text-white transition-colors ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={28}/></button>
            </div>
            
            <form onSubmit={handleCancel} className="flex flex-col h-full overflow-hidden">
                <div className="p-8 overflow-y-auto space-y-6 bg-slate-50 custom-scrollbar">
                    <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 text-[11px] font-black text-rose-800 uppercase tracking-widest shadow-inner leading-relaxed">
                        {t('msg_cancellation_warning', 'AŞAĞIDAKİ İPTAL MESAJI, BU EĞİTİME KAYITLI TÜM PERSONELLERE E-POSTA OLARAK GÖNDERİLECEKTİR. METNİ DÜZENLEYEBİLİRSİNİZ.')}
                    </div>
                    
                    <div>
                        <label className={`text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_cancel_email_content', 'İPTAL E-POSTA İÇERİĞİ')}</label>
                        <textarea 
                        required 
                        rows="8" 
                        value={cancelMessage} 
                        onChange={e => setCancelMessage(e.target.value)} 
                        className={`w-full bg-white border-2 border-slate-200 p-5 rounded-2xl text-sm outline-none focus:border-rose-500 resize-y leading-relaxed font-bold text-slate-700 shadow-sm ${isArabic ? 'text-right' : 'text-left'}`}
                        ></textarea>
                    </div>
                </div>
                <div className={`flex gap-4 p-6 shrink-0 border-t border-slate-100 bg-white ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <button type="button" onClick={closeCancelModal} className="flex-1 bg-white border-2 border-slate-200 text-slate-600 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">
                        {t('btn_cancel', 'VAZGEÇ')}
                    </button>
                    <button type="submit" className={`flex-[2] bg-rose-500 text-white py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/30 flex items-center justify-center gap-2 active:scale-95 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <Send size={18}/> {t('btn_cancel_and_notify', 'İPTAL ET VE HERKESE BİLDİR')}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Training;

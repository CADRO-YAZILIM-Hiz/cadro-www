import React, { useEffect, useState, useMemo } from 'react'; 
import api, { employeeApi } from '../api/axios'; 
import { Network, ChevronDown, ChevronRight, ChevronLeft, User, Briefcase, PlusCircle, X, Users, Trash2, GripHorizontal, Edit3, Building2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast'; 
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi
import { localizeDigits } from '../utils/localizeNumber';

// ==========================================
// 🌍 ALT BİLEŞEN: KADRO KUTUSU (NODE)
// ==========================================
const PositionNode = ({ pos, onDelete, onMovePosition, onEdit, isArabic, locale, t, language }) => {
  const [expanded, setExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false); 
  
  const hasSubordinates = pos.subordinates && pos.subordinates.length > 0;
  const isVacant = pos.is_vacant;
  const isSystemGenerated = Boolean(pos.is_system_generated);
  
  const baseBg = isVacant ? 'bg-rose-50' : 'bg-emerald-50';
  const baseBorder = isVacant ? 'border-rose-200' : 'border-emerald-200';
  const dragOverClass = isDragOver ? 'border-dashed border-indigo-500 border-4 scale-105 shadow-2xl shadow-indigo-500/30' : `border-2 ${baseBorder} hover:shadow-xl`;
  
  const iconColor = isVacant ? 'text-rose-500' : 'text-emerald-500';
  const headerColor = isVacant ? 'bg-rose-100 text-rose-700' : 'bg-emerald-600 text-white';

  const handleDragStart = (e) => {
    if (isSystemGenerated) return;
    e.dataTransfer.setData('text/plain', pos.id.toString());
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation(); 
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    e.stopPropagation(); 
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation(); 
    setIsDragOver(false);
    
    const draggedPosIdStr = e.dataTransfer.getData('text/plain');
    if (!draggedPosIdStr) return;
    
    const draggedPosId = parseInt(draggedPosIdStr, 10);
    
    if (draggedPosId !== pos.id) {
      onMovePosition(draggedPosId, pos.id);
    }
  };

  return (
    <div className="flex flex-col items-center mt-6 font-sans">
      <div 
        draggable={!isSystemGenerated}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white shadow-lg shadow-slate-200/50 rounded-[1.5rem] w-72 text-center z-10 relative group transition-all duration-300 ${isSystemGenerated ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} ${dragOverClass}`}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className={`px-4 py-3 rounded-t-[1.3rem] font-bold text-[11px] tracking-wide uppercase ${headerColor} flex justify-between items-center relative`}>
          <div className="flex items-center gap-2 overflow-hidden">
            {!isSystemGenerated && (
              <GripHorizontal size={14} className="opacity-50 cursor-grab shrink-0" title={t('tooltip_drag_to_move', 'Sürüklemek için tutun')} />
            )}
            <span className="truncate max-w-[150px]" title={pos.title}>{pos.title?.toLocaleUpperCase(locale)}</span>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            {!isVacant && pos.employees.length > 1 && (
              <span className={`bg-white/20 px-2 py-0.5 rounded-md text-[9px] flex items-center gap-1 shadow-sm ${isArabic ? 'ml-1' : 'mr-1'}`} dir="ltr">
                  <Users size={10}/> {localizeDigits(pos.employees.length, language)}
              </span>
            )}
            
            {!isSystemGenerated && <button 
              onClick={(e) => { e.stopPropagation(); onEdit(pos); }} 
              className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm ${isVacant ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-500 hover:text-white' : 'bg-emerald-500 text-white hover:bg-indigo-500'}`}
              title={t('tooltip_edit_position', 'KADRO BİLGİLERİNİ DÜZENLE')}
            >
              <Edit3 size={12} />
            </button>}

            {!isSystemGenerated && <button 
              onClick={(e) => { e.stopPropagation(); onDelete(pos.id); }} 
              className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm ${isVacant ? 'bg-rose-200 text-rose-800 hover:bg-rose-500 hover:text-white' : 'bg-emerald-500 text-white hover:bg-rose-500'}`}
              title={t('tooltip_delete_position', 'KADROYU SİL')}
            >
              <Trash2 size={12} />
            </button>}
          </div>
        </div>
        
        <div className={`p-6 ${baseBg} rounded-b-[1.3rem] ${isDragOver ? 'bg-indigo-50' : ''} transition-colors min-h-[150px] flex flex-col items-center justify-center`}>
          <div className="flex justify-center mb-4">
            {isVacant ? <Briefcase size={32} className={iconColor} /> : <User size={32} className={iconColor} />}
          </div>
          
          {isVacant ? (
            <div className="font-bold text-rose-500 text-[10px] py-2 uppercase tracking-widest opacity-70 border border-rose-200 px-3 rounded-xl border-dashed">-- {t('lbl_vacant_position', 'BOŞ KADRO')} --</div>
          ) : (
            <div className="flex flex-col gap-2.5 w-full max-h-40 overflow-y-auto custom-scrollbar pr-1">
              {pos.employees.map(emp => (
                <div
                  key={emp.id}
                  className="flex items-center gap-2 bg-white border border-emerald-100/70 py-2.5 px-3 rounded-xl shadow-sm text-left"
                  title={`${emp.first_name} ${emp.last_name}`}
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black shrink-0">
                    {emp.first_name?.[0]?.toLocaleUpperCase(locale)}{emp.last_name?.[0]?.toLocaleUpperCase(locale)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-700 text-[12px] leading-tight break-words whitespace-normal">
                      {emp.first_name?.toLocaleUpperCase(locale)} {emp.last_name?.toLocaleUpperCase(locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <p className="text-[9px] font-bold text-slate-400 mt-4 border border-slate-200 bg-white px-3 py-1.5 rounded-xl uppercase tracking-widest w-full truncate shadow-sm" title={pos.department}>
            {pos.department?.toLocaleUpperCase(locale)}
          </p>
        </div>

        {hasSubordinates && (
          <button onClick={() => setExpanded(!expanded)} className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900 border-4 border-white rounded-full p-1 text-white hover:bg-indigo-500 transition-colors shadow-lg z-20">
            {expanded ? <ChevronDown size={16} /> : (isArabic ? <ChevronLeft size={16} /> : <ChevronRight size={16} />)}
          </button>
        )}
      </div>

      {hasSubordinates && expanded && (
        <div className="flex justify-center gap-10 mt-6 relative pt-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[calc(100%-2.5rem)] h-6 border-t-2 border-slate-200 rounded-t-xl"></div>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-slate-200"></div>

          {pos.subordinates.map(sub => (
            <div key={sub.id} className="relative">
               <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-slate-200"></div>
               <PositionNode pos={sub} onDelete={onDelete} onMovePosition={onMovePosition} onEdit={onEdit} isArabic={isArabic} locale={locale} t={t} language={language} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 🌍 ANA BİLEŞEN: ORGANİZASYON ŞEMASI
// ==========================================
const OrgChart = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası eklendi

  // 🌍 Dinamik toLocaleUpperCase ve RTL için dil tespiti
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';

  const [orgData, setOrgData] = useState([]);
  const [flatPositions, setFlatPositions] = useState([]);
  const [departments, setDepartments] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false); 
  const [expandedDepartments, setExpandedDepartments] = useState({});
  
  const [editPosId, setEditPosId] = useState(null);
  
  const [formData, setFormData] = useState({ title: "", department_id: "", parent_id: "" });
  const [deptName, setDeptName] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orgRes, posRes, deptRes] = await Promise.allSettled([
        employeeApi.getOrgChart(),
        employeeApi.getPositions(),
        api.get('/employee/department/list')
      ]);
      
      if (orgRes.status === 'fulfilled') setOrgData(orgRes.value.data || []);
      if (posRes.status === 'fulfilled') setFlatPositions(posRes.value.data || []);
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value.data || []);
      
    } catch (err) { 
        toast.error(t('err_fetch_org_data', "Şema verileri çekilemedi."));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!orgData.length) return;
    setExpandedDepartments((prev) => {
      const next = { ...prev };
      orgData.forEach((rootPos) => {
        const deptName = rootPos.department || t('lbl_unknown_department', 'Bilinmeyen Departman');
        if (typeof next[deptName] === 'undefined') {
          next[deptName] = true;
        }
      });
      return next;
    });
  }, [orgData, t]);

  const handleOpenNewModal = () => {
    setEditPosId(null);
    setFormData({ title: "", department_id: "", parent_id: "" });
    setIsModalOpen(true);
  };

  const handleEditPosition = (pos) => {
    setEditPosId(pos.id);
    setFormData({
      title: pos.title,
      department_id: pos.department_id || "", 
      parent_id: pos.parent_id || ""
    });
    setIsModalOpen(true);
  };

  const handleDeletePosition = async (posId) => {
    if(!window.confirm(t('msg_confirm_delete_pos', "Bu kadroyu silmek istediğinize emin misiniz? Alt kadrolar ve personeller etkilenebilir."))) return;
    
    const tLoading = toast.loading(t('msg_deleting_pos', "Kadro siliniyor..."));
    try {
      await api.delete(`/employee/position/${posId}`);
      toast.success(t('msg_delete_success', "Kadro başarıyla silindi."), { id: tLoading });
      fetchData(); 
    } catch (err) {
      toast.error(err.response?.data?.detail || t('err_delete_pos_failed', "Kadro içinde personel olabilir, silinemedi."), { id: tLoading });
    }
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    const tLoading = toast.loading(t('msg_creating_dept', "Departman oluşturuluyor..."));
    try {
      await api.post('/employee/department', { name: deptName });
      toast.success(t('msg_dept_added', "Yeni departman sisteme eklendi."), { id: tLoading });
      setIsDeptModalOpen(false);
      setDeptName("");
      fetchData(); 
    } catch(err) {
      toast.error(t('err_add_dept', "Departman eklenemedi."), { id: tLoading });
    }
  };

  const isDescendant = (draggedId, targetId) => {
    let currentTarget = flatPositions.find(p => p.id === targetId);
    while (currentTarget && currentTarget.parent_id) {
        if (currentTarget.parent_id === draggedId) return true;
        currentTarget = flatPositions.find(p => p.id === currentTarget.parent_id);
    }
    return false;
  };

  const handleMovePosition = async (draggedId, targetId) => {
    if (isDescendant(draggedId, targetId)) {
        toast.error(t('err_hierarchy_loop', "HİYERARŞİ HATASI: Bir üst kadroyu, kendi altındaki bir kadroya bağlayamazsınız!"));
        return;
    }

    if (!window.confirm(t('msg_confirm_move_pos', "Bu kadroyu yeni yöneticisine bağlamak istediğinize emin misiniz?"))) return;

    const tLoading = toast.loading(t('msg_updating_org', "Organizasyon güncelleniyor..."));
    try {
      await api.put(`/employee/position/${draggedId}`, { parent_id: targetId });
      toast.success(t('msg_move_success', "Kadro başarıyla taşındı."), { id: tLoading });
      fetchData(); 
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_move_failed', "Kadro taşınırken bir hata oluştu."), { id: tLoading });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const parentIdVal = formData.parent_id ? parseInt(formData.parent_id) : null;
    const deptIdVal = formData.department_id ? parseInt(formData.department_id) : null;

    if (!deptIdVal) return toast.error(t('err_select_dept', "Lütfen bir departman seçin!"));
    
    if (editPosId && parentIdVal === editPosId) {
        return toast.error(t('err_self_parent', "Bir kadroyu kendine bağlayamazsınız!"));
    }

    if (editPosId && parentIdVal) {
        if (isDescendant(editPosId, parentIdVal)) {
            return toast.error(t('err_hierarchy_loop', "HİYERARŞİ HATASI: Bir üst kadroyu, kendi altındaki bir kadroya bağlayamazsınız!"));
        }
    }

    const payload = {
        title: formData.title,
        department_id: deptIdVal, 
        parent_id: parentIdVal
    };

    const tLoading = toast.loading(t('msg_saving_pos', "Kadro kaydediliyor..."));
    try {
      if (editPosId) {
        await api.put(`/employee/position/${editPosId}`, payload);
        toast.success(t('msg_update_pos_success', "Kadro güncellendi."), { id: tLoading });
      } else {
        await api.post('/employee/position', payload);
        toast.success(t('msg_create_pos_success', "Yeni kadro oluşturuldu."), { id: tLoading });
      }
      setIsModalOpen(false);
      setFormData({ title: "", department_id: "", parent_id: "" });
      setEditPosId(null);
      fetchData();
    } catch (err) { 
        toast.error(t('err_action_failed', "İşlem başarısız oldu!"), { id: tLoading }); 
    }
  };

  const buildHierarchicalList = (positions, parentId = null, depth = 0) => {
    let result = [];
    const children = positions.filter(p => p.parent_id === parentId);
    
    children.forEach(child => {
      result.push({ ...child, depth });
      result = result.concat(buildHierarchicalList(positions, child.id, depth + 1));
    });
    
    return result;
  };

  const hierarchicalPositions = useMemo(() => buildHierarchicalList(flatPositions), [flatPositions]);
  const departmentGroups = useMemo(() => {
    return orgData.reduce((acc, rootPos) => {
      const deptName = rootPos.department || t('lbl_unknown_department', 'Bilinmeyen Departman');
      if (!acc[deptName]) acc[deptName] = [];
      acc[deptName].push(rootPos);
      return acc;
    }, {});
  }, [orgData, t]);

  const getDepartmentEmployeeCount = (nodes) => {
    const countNodeEmployees = (node) => {
      const ownEmployees = Array.isArray(node.employees) ? node.employees.length : 0;
      const childEmployees = Array.isArray(node.subordinates)
        ? node.subordinates.reduce((sum, child) => sum + countNodeEmployees(child), 0)
        : 0;
      return ownEmployees + childEmployees;
    };
    return nodes.reduce((sum, node) => sum + countNodeEmployees(node), 0);
  };

  const toggleDepartment = (deptName) => {
    setExpandedDepartments((prev) => ({
      ...prev,
      [deptName]: !prev[deptName]
    }));
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? "top-left" : "top-right"} reverseOrder={false} />
      
      {/* ================= AKSİYON ÇUBUĞU ================= */}
      <div className={`flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 w-full ${isArabic ? 'flex-row-reverse' : ''}`}>
        
        <div className="hidden md:flex items-center gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <GripHorizontal size={18} className="text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('lbl_drag_drop_info', 'KADROLARI SÜRÜKLEYİP BAĞLAYABİLİRSİNİZ')}</span>
        </div>

        <div className={`flex items-center gap-2 w-full md:w-auto ${isArabic ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => setIsDeptModalOpen(true)} className={`flex-1 md:flex-none bg-white border-2 border-slate-200 text-slate-700 px-6 py-4 rounded-2xl font-bold text-[11px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95 uppercase shadow-sm ${isArabic ? 'flex-row-reverse' : ''}`}>
            <Building2 size={16} className="text-cyan-600"/> {t('btn_create_dept', 'DEPARTMAN AÇ')}
          </button>
          
          <button onClick={handleOpenNewModal} className={`flex-1 md:flex-none bg-indigo-600 text-white px-6 py-4 rounded-2xl font-bold text-[11px] tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 uppercase ${isArabic ? 'flex-row-reverse' : ''}`}>
            <PlusCircle size={16} /> {t('btn_create_position', 'YENİ KADRO AÇ')}
          </button>
        </div>
      </div>

      {/* ================= ORGANİZASYON AĞACI ALANI ================= */}
      <div className="flex-1 bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-auto custom-scrollbar flex justify-center items-start pb-20 relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
        {loading ? (
          <div className="text-slate-400 font-bold animate-pulse mt-20 uppercase tracking-widest text-xs">{t('lbl_loading_chart', 'ŞEMA OLUŞTURULUYOR...')}</div>
        ) : orgData.length === 0 ? (
          <div className="text-center text-slate-400 font-bold mt-20 flex flex-col items-center uppercase tracking-widest text-xs opacity-60 max-w-lg leading-relaxed">
            <Network className="mb-6 opacity-30" size={64}/>
            <span dangerouslySetInnerHTML={{__html: t('msg_empty_org_chart_html', "SİSTEMDE HENÜZ BİR KADRO YOK.<br/>ÖNCE DEPARTMAN AÇIN, ARDINDAN İLK POZİSYONU OLUŞTURUN.")}}></span>
          </div>
        ) : (
          <div className="w-full max-w-[1800px] space-y-8">
            {Object.entries(departmentGroups).map(([deptName, rootPositions]) => {
              const isExpanded = expandedDepartments[deptName] !== false;
              return (
                <div key={deptName} className="bg-white/80 border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
                  <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                        <Building2 size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest truncate">
                          {deptName?.toLocaleUpperCase(locale)}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          {t('lbl_employee_count', 'PERSONEL SAYISI')}: {localizeDigits(getDepartmentEmployeeCount(rootPositions), i18n.language)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleDepartment(deptName)}
                      className="shrink-0 p-3 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                      title={isExpanded ? t('btn_collapse_department', 'Departmanı Daralt') : t('btn_expand_department', 'Departmanı Aç')}
                    >
                      {isExpanded ? <ChevronDown size={18} /> : (isArabic ? <ChevronLeft size={18} /> : <ChevronRight size={18} />)}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="p-8 overflow-x-auto custom-scrollbar animate-in fade-in duration-300">
                      <div className="flex justify-center gap-16 min-w-max pr-10">
                        {rootPositions.map(rootPos => (
                          <PositionNode 
                            key={rootPos.id} 
                            pos={rootPos} 
                            onDelete={handleDeletePosition} 
                            onMovePosition={handleMovePosition}
                            onEdit={handleEditPosition} 
                            isArabic={isArabic}
                            locale={locale}
                            t={t}
                            language={i18n.language}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= 🏢 DEPARTMAN MODALI ================= */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white shrink-0">
              <h2 className="text-xl font-bold italic tracking-wide flex items-center gap-3 uppercase">
                <div className="p-2.5 bg-cyan-500 rounded-xl"><Building2 size={20}/></div>
                {t('modal_title_new_dept', 'YENİ DEPARTMAN AÇ')}
              </h2>
              <button onClick={() => setIsDeptModalOpen(false)} className={`transition-all text-slate-400 hover:text-white ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><X size={28} /></button>
            </div>
            
            <form onSubmit={handleDeptSubmit} className="p-10 bg-slate-50 space-y-6">
                <div className="flex flex-col gap-3">
                  <label className={`text-[10px] font-bold text-slate-500 tracking-widest uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_department_name', 'DEPARTMAN ADI')} <span className="text-rose-500">*</span></label>
                  <input required value={deptName} onChange={e => setDeptName(e.target.value?.toLocaleUpperCase(locale))} placeholder={t('ph_department_name', "Örn: BİLGİ TEKNOLOJİLERİ")} className={`p-5 bg-white border-2 border-slate-100 rounded-2xl font-semibold text-sm text-slate-700 outline-none focus:border-cyan-500 shadow-sm transition-colors uppercase placeholder:text-slate-300 ${isArabic ? 'text-right' : 'text-left'}`} />
                </div>
                
                <button type="submit" className="w-full py-5 bg-cyan-600 text-white rounded-[2rem] font-bold tracking-widest text-[11px] shadow-xl shadow-cyan-600/20 hover:bg-cyan-700 transition-all active:scale-95 uppercase mt-4">
                  {t('btn_save_dept', 'DEPARTMANI KAYDET')}
                </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= 💼 KADRO MODALI ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white shrink-0">
              <h2 className="text-xl font-bold italic tracking-wide flex items-center gap-3 uppercase">
                <div className="p-2.5 bg-indigo-500 rounded-xl"><Briefcase size={20}/></div>
                {editPosId ? t('modal_title_edit_pos', "KADROYU GÜNCELLE") : t('modal_title_new_pos', "YENİ KADRO TANIMLA")}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className={`transition-all text-slate-400 hover:text-white ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><X size={28} /></button>
            </div>
            
            <div className="p-10 bg-slate-50 flex-1 overflow-y-auto custom-scrollbar space-y-8">
              <form id="pos-form" onSubmit={handleSubmit} className="space-y-8">
                
                <div className="flex flex-col gap-3">
                  <label className={`text-[10px] font-bold text-slate-500 tracking-widest uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_position_name', 'KADRO / POZİSYON ADI')} <span className="text-rose-500">*</span></label>
                  <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value?.toLocaleUpperCase(locale)})} placeholder={t('ph_position_name', "Örn: SAHA MÜHENDİSİ")} className={`p-5 bg-white border-2 border-slate-100 rounded-2xl font-semibold text-sm text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-colors uppercase placeholder:text-slate-300 ${isArabic ? 'text-right' : 'text-left'}`} />
                </div>

                <div className="flex flex-col gap-3">
                  <label className={`text-[10px] font-bold text-slate-500 tracking-widest uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_belongs_to_dept', 'AİT OLDUĞU DEPARTMAN')} <span className="text-rose-500">*</span></label>
                  <select 
                    required 
                    value={formData.department_id} 
                    onChange={e => setFormData({...formData, department_id: e.target.value})} 
                    className={`p-5 bg-white border-2 border-slate-100 rounded-2xl font-bold text-[11px] text-slate-700 outline-none shadow-sm transition-colors focus:border-indigo-500 uppercase appearance-none cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}
                  >
                    <option value="">-- {t('opt_select_dept', 'BİR DEPARTMAN SEÇİN')} --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name?.toLocaleUpperCase(locale)}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col gap-3 bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 shadow-inner">
                  <label className={`text-[10px] font-bold text-indigo-700 tracking-widest uppercase flex items-center gap-2 ${isArabic ? 'mr-1' : 'ml-1'}`}><Network size={16}/> {t('lbl_parent_position', 'ÜST KADRO (KİME BAĞLI?)')} <span className="text-rose-500">*</span></label>
                  <select 
                    value={formData.parent_id} 
                    onChange={e => setFormData({...formData, parent_id: e.target.value})} 
                    className={`p-5 bg-white border-2 border-indigo-200 rounded-2xl font-bold text-[11px] text-slate-700 outline-none shadow-sm transition-colors focus:border-indigo-500 uppercase appearance-none cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}
                    dir="ltr"
                  >
                    <option value="">-- {t('opt_top_management', 'EN TEPE YÖNETİM (BAĞLI DEĞİL)')} --</option>
                    {hierarchicalPositions.map(p => {
                      if (p.id === editPosId) return null; 
                      return (
                        <option key={p.id} value={p.id}>
                          {"\u00A0\u00A0\u00A0\u00A0".repeat(p.depth)}
                          {p.depth > 0 ? "└─ " : ""}
                          {p.title?.toLocaleUpperCase(locale)} ({p.department?.toLocaleUpperCase(locale)})
                        </option>
                      );
                    })}
                  </select>
                  <p className={`text-[9px] text-indigo-500/80 font-bold mt-2 leading-relaxed uppercase tracking-widest italic ${isArabic ? 'mr-1' : 'ml-1'}`}>
                    {t('desc_parent_pos_info', 'Bu kadrodaki çalışanların izinleri, seçtiğiniz üst kadrodaki kişiye düşer.')}
                  </p>
                </div>
              </form>
            </div>
            
            <div className={`p-8 bg-white border-t border-slate-100 flex gap-4 shrink-0 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <button type="submit" form="pos-form" className={`w-full py-5 bg-slate-900 text-white rounded-[2rem] font-bold tracking-widest text-[11px] shadow-xl shadow-slate-900/20 hover:bg-indigo-600 transition-all active:scale-95 uppercase flex items-center justify-center gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Briefcase size={18}/> {editPosId ? t('btn_save_changes', 'DEĞİŞİKLİKLERİ KAYDET') : t('btn_save_to_system', 'SİSTEME KAYDET')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgChart;

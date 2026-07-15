import React, { useState, useEffect } from 'react';
import { 
  Settings, Users, LifeBuoy, FileText, ShoppingCart, 
  Save, AlertCircle, CheckCircle2 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api, { getEmployees, settingsApi } from '../api/axios';
import { useTranslation } from 'react-i18next';

const SystemSettings = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // API'den gelecek gerçek personel listesi
  const [employees, setEmployees] = useState([]);

  // API'den gelecek ve API'ye gönderilecek ayarlar state'i
  const [routingConfigs, setRoutingConfigs] = useState({
    it_responsible: "",
    hr_responsible: "",
    admin_responsible: ""
  });

  useEffect(() => {
    const fetchSettingsAndEmployees = async () => {
      try {
        setLoading(true);
        
        // 1. Gerçek Personel Listesini Çek (axios.js'deki getEmployees fonksiyonu ile)
        const empRes = await getEmployees(); 
        setEmployees(Array.isArray(empRes.data) ? empRes.data : []);

        // 2. Gerçek Sistem Ayarlarını Çek (axios.js'deki settingsApi.getRouting fonksiyonu ile)
        const settingsRes = await settingsApi.getRouting();
        if (settingsRes.data) {
          setRoutingConfigs({
            it_responsible: settingsRes.data.it_responsible || "",
            hr_responsible: settingsRes.data.hr_responsible || "",
            admin_responsible: settingsRes.data.admin_responsible || ""
          });
        }
      } catch (error) {
        console.error("Sistem verileri çekilemedi:", error);
        toast.error(t('err_settings_load', 'Ayarlar veya personel listesi yüklenemedi.'));
      } finally {
        setLoading(false);
      }
    };

    fetchSettingsAndEmployees();
  }, []);

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setRoutingConfigs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      // Backend'e ayarları gönder (axios.js'deki settingsApi.updateRouting fonksiyonu ile)
      await settingsApi.updateRouting(routingConfigs);
      toast.success(t('msg_routing_saved', 'Yönlendirme ayarları başarıyla kaydedildi!'));
    } catch (error) {
      console.error("Kaydetme hatası:", error);
      toast.error(t('err_settings_save', 'Ayarlar kaydedilirken bir sorun oluştu.'));
    } finally {
      setSaving(false);
    }
  };

  // Personelleri departmanlarına göre gruplayan fonksiyon (Dropwdown için)
  const groupedEmployees = employees.reduce((acc, emp) => {
    const dept = emp.department || 'DİĞER'; // Backend'de department yoksa 'DİĞER' altına atar
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(emp);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto">
      <Toaster position="top-right" />
      
      {/* BAŞLIK KARTI */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 mb-8 text-white relative overflow-hidden shadow-2xl shrink-0">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-3">
              <Settings size={28} className="text-indigo-400"/>{t('page_system_settings_title_prefix', 'Sistem &')} <span className="text-indigo-400">{t('page_system_settings_title_highlight', 'İş Akışı Ayarları')}</span>
            </h1>
            <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest max-w-xl">
              {t('page_system_settings_desc', 'Destek, izin ve operasyon taleplerinin varsayılan olarak hangi sorumlunun iş listesine düşeceğini buradan tanımlayabilirsiniz.')}
            </p>
          </div>
          <button 
            onClick={handleSaveSettings}
            disabled={saving || loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all shrink-0 active:scale-95"
          >
            {saving ? <AlertCircle className="animate-spin" size={18}/> : <Save size={18}/>}
            {saving ? t('msg_saving', 'KAYDEDİLİYOR...') : t('btn_save_settings', 'AYARLARI KAYDET')}
          </button>
        </div>
        <Users className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-5 rotate-12 pointer-events-none" />
      </div>

      {loading ? (
         <div className="flex-1 flex justify-center items-center text-slate-400 font-black tracking-widest text-xs uppercase">
           {t('msg_waiting_settings_api', 'Ayarlar ve kadrolar API’den bekleniyor...')}
         </div>
      ) : (
        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/40 flex-1 overflow-y-auto custom-scrollbar">
          
          <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
             <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><CheckCircle2 size={24}/></div>
             <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{t('lbl_workflow_responsibles', 'İş Akışı Sorumluları')}</h3>
          </div>

          <div className="space-y-8 max-w-3xl">
            
            {/* IT SORUMLUSU */}
            <div className="flex flex-col md:flex-row md:items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0 shadow-sm">
                <LifeBuoy size={28}/>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-black text-slate-800 uppercase mb-1">{t('settings_responsible_it', 'BT Destek Sorumlusu')}</label>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t('settings_responsible_it_desc', 'Teknik destek, arıza ve donanım talepleri varsayılan olarak bu kişiye yönlendirilir.')}</p>
                <EmployeeSelect 
                  name="it_responsible" 
                  value={routingConfigs.it_responsible} 
                  onChange={handleSelectChange} 
                  groupedEmployees={groupedEmployees} 
                />
              </div>
            </div>

            {/* İK SORUMLUSU */}
            <div className="flex flex-col md:flex-row md:items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                <FileText size={28}/>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-black text-slate-800 uppercase mb-1">{t('settings_responsible_hr', 'İK Operasyon Sorumlusu')}</label>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t('settings_responsible_hr_desc', 'Özlük, izin, evrak ve çalışan operasyonları talepleri varsayılan olarak bu kişiye yönlendirilir.')}</p>
                <EmployeeSelect 
                  name="hr_responsible" 
                  value={routingConfigs.hr_responsible} 
                  onChange={handleSelectChange} 
                  groupedEmployees={groupedEmployees} 
                />
              </div>
            </div>

            {/* İDARİ İŞLER SORUMLUSU */}
            <div className="flex flex-col md:flex-row md:items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                <ShoppingCart size={28}/>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-black text-slate-800 uppercase mb-1">{t('settings_responsible_admin', 'İdari İşler ve Tedarik Sorumlusu')}</label>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t('settings_responsible_admin_desc', 'Ofis ihtiyaçları, malzeme temini ve zimmet süreçleri varsayılan olarak bu kişiye yönlendirilir.')}</p>
                <EmployeeSelect 
                  name="admin_responsible" 
                  value={routingConfigs.admin_responsible} 
                  onChange={handleSelectChange} 
                  groupedEmployees={groupedEmployees} 
                />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

// --- YARDIMCI BİLEŞEN: Gruplandırılmış Dropdown ---
const EmployeeSelect = ({ name, value, onChange, groupedEmployees }) => {
  const { t } = useTranslation();
  return (
  <select 
    name={name}
    value={value || ""}
    onChange={onChange}
    className="w-full bg-white border-2 border-slate-200 text-slate-700 text-sm font-bold rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 uppercase transition-colors hover:border-slate-300 cursor-pointer"
  >
    <option value="" className="text-slate-400">-- {t('opt_select_employee', 'Personel Seçiniz')} --</option>
    {Object.entries(groupedEmployees).map(([departmentName, emps]) => (
      <optgroup key={departmentName} label={`📍 ${departmentName.toUpperCase()}`} className="bg-slate-50 text-indigo-600 font-black">
        {emps.map(emp => (
          <option key={emp.id} value={emp.id} className="text-slate-700 font-bold bg-white">
            {emp.first_name} {emp.last_name} {emp.title ? `- ${emp.title}` : ''}
          </option>
        ))}
      </optgroup>
    ))}
  </select>
  );
};

export default SystemSettings;

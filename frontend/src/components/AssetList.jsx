import React, { useState, useEffect, useMemo } from 'react'; 
import api, { assetApi } from '../api/axios'; 
import { 
  PackagePlus, X, Laptop, ShieldCheck, Wrench, 
  Archive, PlusCircle, User, AlertCircle, CopyPlus, 
  ChevronDown, ChevronUp, CornerDownRight, FileText, Send, Trash2
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi
import { localizeDigits } from '../utils/localizeNumber';

const InputGroup = ({ label, name, type = "text", onChange, value, required = false, placeholder, min }) => (
  <div className="flex flex-col gap-1.5 w-full font-sans">
    <label className="text-[11px] font-bold text-slate-500 tracking-wider ml-1 text-left uppercase">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <input 
      type={type} name={name} required={required} value={value || ""} onChange={onChange} placeholder={placeholder} min={min}
      className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-semibold text-sm shadow-sm transition-all placeholder:text-slate-300" 
    />
  </div>
);

const AssetList = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: t fonksiyonu ve dil objesi
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);

  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ total: 0, available: 0, assigned: 0, in_repair: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL"); 
  const [expandedGroup, setExpandedGroup] = useState(null);

  // 🌍 Varsayılan durumu dile göre çevir (Sıfır / Brand New)
  const defaultCondition = t('condition_new', 'Sıfır');
  const defaultWorkingCondition = t('condition_working', 'Sağlam / Çalışır Durumda');

  const getLocalizedAssetCategory = (value) => {
    const normalized = String(value || '').trim().toLocaleLowerCase('tr-TR');
    const categoryMap = {
      [t('cat_electronics', 'Electronics').toLocaleLowerCase('tr-TR')]: t('cat_electronics', 'Electronics'),
      'elektronik cihazlar': t('cat_electronics', 'Electronics'),
      [t('cat_vehicles', 'Vehicles / Transport').toLocaleLowerCase('tr-TR')]: t('cat_vehicles', 'Vehicles / Transport'),
      'araç / ulaşım': t('cat_vehicles', 'Vehicles / Transport'),
      'arac / ulasim': t('cat_vehicles', 'Vehicles / Transport'),
      [t('cat_furniture', 'Furniture / Office').toLocaleLowerCase('tr-TR')]: t('cat_furniture', 'Furniture / Office'),
      'mobilya / ofis': t('cat_furniture', 'Furniture / Office'),
      'ofis malzemesi': t('cat_furniture', 'Furniture / Office'),
      'ofis ekipmani': t('cat_furniture', 'Furniture / Office'),
      'ofis ekipmanı': t('cat_furniture', 'Furniture / Office'),
      [t('cat_digital', 'License / Digital').toLocaleLowerCase('tr-TR')]: t('cat_digital', 'License / Digital'),
      'lisans / dijital': t('cat_digital', 'License / Digital'),
      'saha ekipmani': t('cat_other', 'Other'),
      'saha ekipmanı': t('cat_other', 'Other'),
      [t('cat_other', 'Other').toLocaleLowerCase('tr-TR')]: t('cat_other', 'Other'),
      'diğer': t('cat_other', 'Other'),
      'diger': t('cat_other', 'Other'),
    };
    return categoryMap[normalized] || value || t('cat_other', 'Other');
  };

  const getLocalizedAssetName = (value) => {
    const normalized = String(value || '').trim().toLocaleLowerCase('tr-TR');
    const assetNameMap = {
      'telefon': 'Phone',
      'cep telefonu': 'Mobile Phone',
      'yazici': 'Printer',
      'yazıcı': 'Printer',
      'barkod okuyucu': 'Barcode Scanner',
      'tablet': 'Tablet',
      'monitor': 'Monitor',
      'monitör': 'Monitor',
      'klavye': 'Keyboard',
      'fare': 'Mouse',
      'mouse': 'Mouse',
      'laptop': 'Laptop',
      'dizustu bilgisayar': 'Laptop',
      'dizüstü bilgisayar': 'Laptop',
    };
    return assetNameMap[normalized] || value || '-';
  };

  const [assignModalData, setAssignModalData] = useState({ isOpen: false, assetId: null, employeeId: "", condition: defaultWorkingCondition });

  const initialForm = {
    asset_name: "", category: "Elektronik Cihazlar", serial_no_text: "", quantity: 1,
    condition_on_assign: defaultCondition, description: "", employee_id: ""
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assetRes, statRes, empRes] = await Promise.all([
        api.get(activeFilter === "ALL" ? '/asset/list' : `/asset/list?status=${activeFilter}`),
        api.get('/asset/stats'),
        api.get('/employee/list?status=ACTIVE') 
      ]);
      setAssets(assetRes.data || []);
      setStats(statRes.data || { total: 0, available: 0, assigned: 0, in_repair: 0 });
      setEmployees(empRes.data || []);
    } catch (err) { 
      toast.error(t('error_fetching_data', "Veriler çekilemedi.")); // 🌍 Çeviri eklendi
    } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [activeFilter]);

  useEffect(() => {
    setAssignModalData(prev => ({ ...prev, condition: defaultWorkingCondition }));
  }, [defaultWorkingCondition]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      condition_on_assign: prev.condition_on_assign || defaultCondition
    }));
  }, [defaultCondition]);

  const groupedAssets = useMemo(() => {
    return assets.reduce((acc, asset) => {
      const key = `${asset.category}_${asset.asset_name}`;
      if (!acc[key]) {
        acc[key] = { asset_name: asset.asset_name, category: asset.category, items: [], summary: { total: 0, AVAILABLE: 0, ASSIGNED: 0, IN_REPAIR: 0 } };
      }
      acc[key].items.push(asset);
      acc[key].summary.total += 1;
      acc[key].summary[asset.status] = (acc[key].summary[asset.status] || 0) + 1;
      return acc;
    }, {});
  }, [assets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const serialArray = formData.serial_no_text.split(/[\n,]+/).map(s => s.trim()).filter(s => s !== "");
    
    const payload = { 
      asset_name: formData.asset_name,
      category: formData.category,
      condition_on_assign: formData.condition_on_assign,
      description: formData.description,
      serial_numbers: serialArray,
      quantity: serialArray.length > 0 ? serialArray.length : parseInt(formData.quantity, 10),
    };
    
    try {
      const res = await assetApi.bulkCreate(payload);
      toast.success(res.data.message || t('assets_added_success', "Varlıklar başarıyla eklendi.")); // 🌍 Çeviri eklendi
      if (formData.employee_id) {
        toast(t('info_assign_after_create', "Varlıklar stoğa eklendi. Personel zimmetini listeden tek tek verebilirsiniz."));
      }
      setIsModalOpen(false);
      setFormData(initialForm);
      fetchData(); 
    } catch (err) { 
      toast.error(err.response?.data?.detail || t('error_adding_assets', "Varlıklar eklenemedi.")); // 🌍 Çeviri eklendi
    }
  };

  const changeStatus = async (asset, newStatus) => {
    try {
      if (newStatus === "AVAILABLE" && asset.status === "ASSIGNED") {
        const noteMsg = t('prompt_return_note', "İade Notu / Kondisyon:");
        const defaultNote = t('default_return_note', "Sağlam İade Alındı");
        const note = prompt(noteMsg, defaultNote);
        if (note === null) return; 
        await assetApi.returnAsset({ asset_id: asset.id, return_condition: note, new_status: "AVAILABLE" });
      } else if (asset.status === "AVAILABLE" && newStatus === "IN_REPAIR") {
        const note = prompt(
          t('prompt_repair_note', "Tamire gönderme notu:"),
          t('default_repair_note', "Arıza tespit edildi, servise gönderildi.")
        );
        if (note === null) return;
        await assetApi.updateStatus(asset.id, { status: "IN_REPAIR", note });
      } else if (asset.status === "IN_REPAIR" && newStatus === "AVAILABLE") {
        const note = prompt(
          t('prompt_repair_done_note', "Tamir tamamlandı notu:"),
          t('default_repair_done_note', "Bakım / onarım tamamlandı, depoya alındı.")
        );
        if (note === null) return;
        await assetApi.updateStatus(asset.id, { status: "AVAILABLE", note });
      } else {
        toast(t('info_status_route_not_ready', "Bu durum geçişi backend tarafında henüz ayrı bir işlem olarak açılmadı."));
        return;
      }
      toast.success(t('status_updated', "Durum güncellendi.")); // 🌍 Çeviri eklendi
      fetchData();
    } catch (err) { toast.error(t('error_occurred', "Hata oluştu.")); } // 🌍 Çeviri eklendi
  };

  const handleAssignAsset = async (e) => {
    e.preventDefault();
    if(!assignModalData.employeeId) return toast.error(t('select_personnel_first', "Personel seçiniz.")); // 🌍 Çeviri eklendi
    try {
      await assetApi.assign({
        asset_id: assignModalData.assetId,
        employee_id: parseInt(assignModalData.employeeId, 10),
        condition_on_assign: assignModalData.condition
      });
      toast.success(t('assignment_successful', "Zimmetleme başarılı.")); // 🌍 Çeviri eklendi
      setAssignModalData({ isOpen: false, assetId: null, employeeId: "", condition: defaultWorkingCondition });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('assignment_error', "Zimmetleme hatası.")); // 🌍 Çeviri eklendi
    }
  };

  const handleDownloadPDF = async (assetId) => {
    const loadingMsg = t('preparing_pdf', "PDF hazırlanıyor...");
    const toastId = toast.loading(loadingMsg); // 🌍 Çeviri eklendi
    try {
      const response = await api.get(`/asset/download-pdf/${assetId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Asset_Report_${assetId}.pdf`); // Dosya adı sabit bırakıldı
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url); 
      toast.success(t('pdf_downloaded', "PDF indirildi."), { id: toastId }); // 🌍 Çeviri eklendi
    } catch (err) {
      toast.error(t('pdf_not_found', "PDF bulunamadı."), { id: toastId }); // 🌍 Çeviri eklendi
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case "AVAILABLE": return <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1 w-fit uppercase tracking-widest"><Archive size={12}/> {t('status_in_stock', 'DEPODA')}</span>;
      case "ASSIGNED": return <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1 w-fit uppercase tracking-widest"><User size={12}/> {t('status_assigned', 'ZİMMETLİ')}</span>;
      case "IN_REPAIR": return <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1 w-fit uppercase tracking-widest"><Wrench size={12}/> {t('status_in_repair', 'TAMİRDE')}</span>;
      default: return <span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest">{t('status_archived', 'ARŞİV')}</span>;
    }
  };

  const toggleGroup = (key) => setExpandedGroup(expandedGroup === key ? null : key);

  // 🌍 Dinamik toLocaleUpperCase için mevcut dilin tespiti
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));

  return (
    <div className="h-full flex flex-col gap-6 relative animate-in fade-in duration-500 font-sans">
      <Toaster position="top-right" />
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0">
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-[1.25rem] border border-slate-200 shadow-sm w-full xl:w-fit shrink-0">
          {["ALL", "AVAILABLE", "ASSIGNED", "IN_REPAIR"].map(f => (
            <button key={f} onClick={() => setActiveFilter(f)} className={`px-5 py-2.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all flex-1 xl:flex-none ${activeFilter === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
              {f === "ALL" ? t('filter_all', 'TÜMÜ') : f === "AVAILABLE" ? t('filter_in_stock', 'DEPODA') : f === "ASSIGNED" ? t('filter_assigned', 'ZİMMETLİ') : t('filter_in_repair', 'TAMİRDE')}
            </button>
          ))}
        </div>
        <button onClick={() => { setFormData(initialForm); setIsModalOpen(true); }} className="w-full xl:w-auto bg-indigo-600 text-white px-8 py-3.5 rounded-[1.25rem] font-bold text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 shrink-0">
          <PackagePlus size={16} /> {t('btn_add_new_asset', 'YENİ VARLIK EKLE')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 shrink-0">
        <StatCard label={t('stat_total_assets', 'TOPLAM VARLIK')} value={localizedNumber(stats.total)} icon={<Laptop size={24}/>} color="bg-white" />
        <StatCard label={t('stat_available', 'DEPODA (MÜSAİT)')} value={localizedNumber(stats.available)} icon={<Archive size={24}/>} color="bg-emerald-500 text-white" />
        <StatCard label={t('stat_assigned', 'ZİMMETLİ')} value={localizedNumber(stats.assigned)} icon={<ShieldCheck size={24}/>} color="bg-white" />
        <StatCard label={t('stat_in_repair', 'TAMİRDE / ARIZALI')} value={localizedNumber(stats.in_repair)} icon={<Wrench size={24}/>} color="bg-white" />
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden mb-10 flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
             <div className="flex justify-center items-center h-40 font-bold tracking-widest text-slate-300 text-xs uppercase">{t('loading', 'YÜKLENİYOR...')}</div>
          ) : (
            <table className="w-full text-left relative">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 tracking-widest border-b uppercase sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-6">{t('table_category_model', 'KATEGORİ / MODEL ADI')}</th>
                  <th className="p-6">{t('table_stock_status', 'STOK DURUMU')}</th>
                  <th className="p-6 text-right">{t('table_actions', 'EYLEMLER')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {Object.entries(groupedAssets).map(([key, group]) => (
                  <React.Fragment key={key}>
                    <tr onClick={() => toggleGroup(key)} className={`cursor-pointer transition-all hover:bg-slate-50 group ${expandedGroup === key ? 'bg-indigo-50/40' : ''}`}>
                      <td className="p-6">
                        <div className="text-[10px] text-indigo-500 font-bold tracking-wide uppercase mb-1">{getLocalizedAssetCategory(group.category)?.toLocaleUpperCase(locale)}</div>
                        <div className="font-bold text-slate-800 text-sm uppercase">{getLocalizedAssetName(group.asset_name)?.toLocaleUpperCase(locale)}</div>
                      </td>
                      <td className="p-6">
                        <div className="flex gap-2 items-center">
                          <span className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-sm">{t('lbl_total', 'TOP')}: {localizedNumber(group.summary.total)}</span>
                          {group.summary.AVAILABLE > 0 && <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100 text-[9px] font-bold uppercase shadow-sm">{t('lbl_stock', 'DEPO')}: {localizedNumber(group.summary.AVAILABLE)}</span>}
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className={`inline-block p-2 rounded-xl transition-all ${expandedGroup === key ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                          {expandedGroup === key ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                        </div>
                      </td>
                    </tr>

                    {expandedGroup === key && (
                      <tr>
                        <td colSpan="3" className="p-0 bg-slate-50/50 border-b-4 border-slate-100">
                          <div className="p-6 pl-12 animate-in slide-in-from-top-2">
                            <table className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                              <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                <tr>
                                  <th className="p-4 w-10"><CornerDownRight size={14} className="opacity-50"/></th>
                                  <th className="p-4">{t('table_serial_plate', 'SERİ NO / PLAKA')}</th>
                                  <th className="p-4">{t('table_status', 'DURUM')}</th>
                                  <th className="p-4">{t('table_current_assignee', 'MEVCUT SORUMLU')}</th>
                                  <th className="p-4 text-right">{t('table_operations', 'İŞLEMLER')}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {group.items.map(asset => (
                                  <tr key={asset.id} className="hover:bg-slate-50/80 transition-all group/sub">
                                    <td className="p-4 text-slate-300 font-bold text-xs">#{asset.id}</td>
                                    <td className="p-4 font-semibold text-slate-700 text-xs uppercase">{asset.serial_no?.toLocaleUpperCase(locale) || "-"}</td>
                                    <td className="p-4">{getStatusBadge(asset.status)}</td>
                                    <td className="p-4">
                                      {asset.status === "ASSIGNED" ? (
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black">
                                            {employees.find(e => e.id === asset.employee_id)?.first_name[0] || "?"}
                                          </div>
                                          <span className="font-semibold text-slate-700 text-xs uppercase tracking-wide">
                                            {employees.find(e => e.id === asset.employee_id)?.first_name?.toLocaleUpperCase(locale) || t('unknown', "BİLİNMİYOR")} {employees.find(e => e.id === asset.employee_id)?.last_name?.toLocaleUpperCase(locale) || ""}
                                          </span>
                                        </div>
                                      ) : <span className="text-slate-300">-</span>}
                                    </td>
                                    <td className="p-4 text-right">
                                      <div className="flex justify-end items-center gap-2 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                        {asset.status === "AVAILABLE" && (
                                          <>
                                            <button onClick={() => setAssignModalData({ isOpen: true, assetId: asset.id, employeeId: "", condition: defaultWorkingCondition })} className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-[9px] uppercase tracking-widest rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-1 shadow-sm"><Send size={12}/> {t('btn_assign', 'ZİMMETLE')}</button>
                                            <button onClick={() => changeStatus(asset, "IN_REPAIR")} title={t('btn_send_repair', "Tamir")} className="p-1.5 bg-amber-50 text-amber-500 rounded-lg border border-amber-100"><Wrench size={14}/></button>
                                          </>
                                        )}
                                        {asset.status === "ASSIGNED" && (
                                          <>
                                            <button onClick={() => handleDownloadPDF(asset.id)} className="px-3 py-1.5 bg-slate-900 text-white font-bold text-[9px] uppercase tracking-widest rounded-lg hover:bg-cyan-500 transition-all flex items-center gap-1"><FileText size={12}/> {t('btn_report', 'TUTANAK')}</button>
                                            <button onClick={() => changeStatus(asset, "AVAILABLE")} title={t('btn_return', "İade Al")} className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg border border-emerald-100"><Archive size={14}/></button>
                                          </>
                                        )}
                                        {asset.status === "IN_REPAIR" && <button onClick={() => changeStatus(asset, "AVAILABLE")} title={t('btn_repair_done', "Tamir Bitti")} className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg border border-emerald-100"><ShieldCheck size={14}/></button>}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- MODAL: YENİ VARLIK --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-8 flex justify-between items-center text-white">
              <h2 className="text-xl font-bold italic tracking-wide uppercase flex items-center gap-3"><CopyPlus size={24}/> {t('modal_bulk_entry_title', 'TOPLU ENVANTER GİRİŞİ')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-all"><X size={32} /></button>
            </div>
            <div className="p-10 bg-slate-50 flex-1 overflow-y-auto custom-scrollbar">
              <form id="asset-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <InputGroup label={t('lbl_model_name', 'MODEL / VARLIK ADI')} name="asset_name" required value={formData.asset_name} onChange={e => setFormData({...formData, asset_name: e.target.value?.toLocaleUpperCase(locale)})} placeholder={t('ph_model_name', 'Örn: MACBOOK PRO M3')} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('lbl_category', 'KATEGORİ')}</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="p-3.5 bg-white border border-slate-200 rounded-2xl font-semibold text-sm outline-none shadow-sm appearance-none">
                      {[t('cat_electronics', "Electronics"), t('cat_vehicles', "Vehicles / Transport"), t('cat_furniture', "Furniture / Office"), t('cat_digital', "License / Digital"), t('cat_other', "Other")].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border border-indigo-100 shadow-inner">
                    <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest ml-1 block mb-2">{t('lbl_serial_numbers', 'SERİ NUMARALARI')}</label>
                    <textarea value={formData.serial_no_text} onChange={e => setFormData({...formData, serial_no_text: e.target.value?.toLocaleUpperCase(locale)})} placeholder={t('ph_serial_numbers', "Her satıra bir adet gelecek şekilde...")} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-indigo-500 text-xs min-h-[120px] font-mono" />
                    <div className="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('lbl_total_detected', 'Toplam: {count} Adet Tespit Edildi').replace('{count}', localizedNumber(formData.serial_no_text.split(/[\n,]+/).filter(s => s.trim() !== "").length))}</div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex flex-col gap-1.5 bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 shadow-inner">
                    <label className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider ml-1 flex items-center gap-1"><User size={14}/> {t('lbl_instant_assign', 'ANINDA ZİMMETLE')}</label>
                    <select value={formData.employee_id} onChange={e => setFormData({...formData, employee_id: e.target.value})} className="p-4 bg-white border border-indigo-200 rounded-xl font-semibold text-sm outline-none">
                      <option value="">- {t('opt_keep_in_stock', 'Depoda Tut')} -</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name?.toLocaleUpperCase(locale)} {emp.last_name?.toLocaleUpperCase(locale)}</option>)}
                    </select>
                    <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-2">{t('desc_assign_after_stock', 'KAYITTAN SONRA ZİMMETİ LİSTEDEN VEREBİLİRSİNİZ.')}</p>
                  </div>
                  <InputGroup label={t('lbl_notes', 'AÇIKLAMA / NOTLAR')} name="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
              </form>
            </div>
            <div className="p-8 bg-white border-t border-slate-100 flex gap-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 border-2 border-slate-200 text-slate-400 rounded-[2rem] font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-colors">{t('btn_cancel', 'İPTAL')}</button>
              <button type="submit" form="asset-form" className="flex-[2] py-5 bg-indigo-600 text-white rounded-[2rem] font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">{t('btn_save_assets', 'VARLIKLARI SİSTEME İŞLE')}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: ZİMMETLE --- */}
      {assignModalData.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-8 flex justify-between items-center text-white">
              <h2 className="text-xl font-bold italic tracking-wide uppercase flex items-center gap-2"><Send size={24}/> {t('modal_assign_title', 'PERSONEL ATAMASI')}</h2>
              <button onClick={() => setAssignModalData({ ...assignModalData, isOpen: false })} className="hover:rotate-90 transition-all"><X size={28} /></button>
            </div>
            <div className="p-10 bg-slate-50 space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('lbl_select_personnel', 'PERSONEL SEÇİNİZ')}</label>
                <select required value={assignModalData.employeeId} onChange={e => setAssignModalData({...assignModalData, employeeId: e.target.value})} className="p-4 bg-white border-2 border-slate-200 rounded-2xl font-semibold text-sm outline-none focus:border-indigo-600">
                  <option value="" disabled>- {t('opt_select', 'Seçim Yapınız')} -</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name?.toLocaleUpperCase(locale)} {emp.last_name?.toLocaleUpperCase(locale)} ({emp.department?.toLocaleUpperCase(locale)})</option>)}
                </select>
              </div>
              <InputGroup label={t('lbl_delivery_condition', 'TESLİM KONDİSYONU')} value={assignModalData.condition} onChange={e => setAssignModalData({...assignModalData, condition: e.target.value})} placeholder={t('ph_condition', 'Örn: Çiziksiz / Sıfır')} />
            </div>
            <div className="p-8 bg-white border-t border-slate-100 flex gap-4">
              <button onClick={() => setAssignModalData({ ...assignModalData, isOpen: false })} className="flex-1 py-4 border-2 border-slate-200 text-slate-400 rounded-2xl font-bold uppercase text-[10px] tracking-widest">{t('btn_cancel', 'VAZGEÇ')}</button>
              <button onClick={handleAssignAsset} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase text-[10px] shadow-lg hover:bg-indigo-700 active:scale-95 transition-all tracking-widest">{t('btn_confirm_assign', 'ONAYLA VE ZİMMETLE')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- YARDIMCI BİLEŞEN ---
const StatCard = ({ label, value, icon, color }) => (
  <div className={`${color} p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02] font-sans`}>
    <div className={`p-4 rounded-2xl ${color.includes('white') ? 'bg-slate-50 text-slate-500' : 'bg-white/20'}`}>{icon}</div>
    <div>
      <p className={`text-[10px] font-bold tracking-widest uppercase ${color.includes('white') ? 'text-slate-400' : 'text-indigo-100'}`}>{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  </div>
);

export default AssetList;

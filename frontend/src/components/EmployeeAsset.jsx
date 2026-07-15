import React, { useState, useEffect } from 'react';
import { assetApi, ticketApi } from '../api/axios';
import { Package, ShieldCheck, Wrench, AlertTriangle, XCircle, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast'; 
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi
import { localizeDigits } from '../utils/localizeNumber';

const EmployeeAsset = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası

  // 🌍 Dinamik toLocaleUpperCase ve RTL için dil tespiti
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [issueDescription, setIssueDescription] = useState('');
  
  const employeeId = parseInt(localStorage.getItem('user_id'), 10);

  useEffect(() => {
    if(employeeId) fetchMyAssets();
  }, [employeeId]);

  const fetchMyAssets = async () => {
    setLoading(true);
    try {
      const res = await assetApi.getEmployeeAssets(employeeId);
      setAssets(res.data || []);
    } catch (error) {
      toast.error(t('err_fetch_assets', "Zimmet bilgileri çekilemedi.")); // 🌍 Çeviri
      console.error("Zimmetler çekilemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReportIssue = async (e) => {
    e.preventDefault();
    if (!issueDescription.trim()) return toast.error(t('err_empty_issue', "Lütfen arıza detayını yazın.")); // 🌍 Çeviri

    const tLoading = toast.loading(t('msg_sending_ticket', "Destek talebiniz IT departmanına iletiliyor...")); // 🌍 Çeviri

    try {
      // 1. Helpdesk Sisteminde Ticket Aç (Ticket içeriğini de çevirelim ki adminler anlasın, gerçi genelde TR istenir ama şablona sadık kalalım)
      await ticketApi.create({
        subject: `[${t('lbl_issue_report', 'ARIZA BİLDİRİMİ')}] ${selectedAsset.asset_name}`,
        message: `${t('lbl_serial_plate', 'Seri No/Plaka')}: ${selectedAsset.serial_no || t('lbl_unknown', 'Bilinmiyor')}\n${t('lbl_category', 'Kategori')}: ${selectedAsset.category}\n\n${t('lbl_issue_details', 'Sorun')}:\n${issueDescription}`,
        category: "IT_DESTEK", 
        priority: "ACİL",      
      });

      toast.success(t('msg_ticket_created', "Arıza talebiniz başarıyla oluşturuldu!"), { id: tLoading });
      setIsModalOpen(false);
      setIssueDescription('');
      setSelectedAsset(null);
      fetchMyAssets(); 
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_ticket_create_failed', "Talep oluşturulamadı. Lütfen yöneticinizle iletişime geçin."), { id: tLoading });
    }
  };

  const handleAcknowledge = async (assetId, assetName) => {
    const confirmMsg = t('msg_confirm_acknowledge', '"{{name}}" isimli şirket varlığını fiziken, eksiksiz ve sağlam olarak teslim aldığınızı onaylıyor musunuz? (Bu işlem dijital imza yerine geçer)').replace('{{name}}', assetName);
    
    if (!window.confirm(confirmMsg)) return;

    const tLoading = toast.loading(t('msg_acknowledging', "Teslim tutanağı onaylanıyor..."));
    try {
      await assetApi.acknowledgeAsset(assetId); 
      toast.success(t('msg_acknowledge_success', "Teslim alma işlemi başarıyla onaylandı!"), { id: tLoading });
      fetchMyAssets(); 
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_acknowledge_failed', "Onay işlemi başarısız oldu."), { id: tLoading });
    }
  };

  // 🌍 Tarih Formatlayıcı
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(locale);
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? "top-left" : "top-right"} reverseOrder={false} />

      <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col pb-4">
        
        {/* BAŞLIK */}
        <div className="p-8 border-b border-slate-100 bg-slate-50 shrink-0">
          <h2 className="text-sm font-black text-slate-800 uppercase flex items-center gap-3 tracking-widest">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl"><ShieldCheck size={18} /></div>
            {t('lbl_my_active_assets', 'AKTİF VARLIKLARIM')} ({localizedNumber(assets.length)})
          </h2>
        </div>

        {/* KARTLARIN OLDUĞU ALAN */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
          {loading ? (
             <div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase tracking-widest text-xs">{t('lbl_loading_data', 'VERİLER YÜKLENİYOR...')}</div>
          ) : assets.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10 opacity-70">
               <Package size={64} className="mb-4 opacity-30"/>
               <p className="font-bold uppercase tracking-widest text-xs text-center leading-relaxed" dangerouslySetInnerHTML={{__html: t('msg_no_assets_html', "ÜZERİNİZDE ZİMMETLİ HERHANGİ BİR<br/>ŞİRKET VARLIĞI BULUNMUYOR.")}}></p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {assets.map((asset) => (
                <div key={asset.id} className={`p-8 rounded-[2.5rem] shadow-sm transition-all flex flex-col group relative overflow-hidden border-2 ${asset.is_acknowledged ? 'border-white bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10' : 'border-amber-200 bg-amber-50'}`}>
                  
                  {/* DEV İKON (ARKAPLAN) */}
                  <Package className={`absolute -bottom-10 w-48 h-48 rotate-12 transition-colors z-0 pointer-events-none ${isArabic ? '-left-10' : '-right-10'} ${asset.is_acknowledged ? 'text-slate-50 group-hover:text-indigo-50' : 'text-amber-100/50'}`}/>
                  
                  {/* KART ÜST KISIM (Durum Rozetleri) */}
                  <div className="relative z-10 flex justify-between items-start mb-6">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border shadow-sm ${asset.is_acknowledged ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                      {asset.category}
                    </span>
                    {asset.status === 'IN_REPAIR' ? (
                        <span className="text-amber-500 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 shadow-sm"><Wrench size={12}/> {t('badge_in_repair', 'TAMİRDE')}</span>
                    ) : (
                        <span className="text-emerald-500 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm"><CheckCircle2 size={12}/> {t('badge_active_device', 'AKTİF CİHAZ')}</span>
                    )}
                  </div>
                  
                  {/* CİHAZ BİLGİLERİ */}
                  <h3 className="text-xl font-black text-slate-800 mb-1 relative z-10 uppercase italic tracking-tighter line-clamp-1">{asset.asset_name?.toLocaleUpperCase(locale)}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mb-8 relative z-10 font-mono tracking-widest uppercase" dir="ltr">
                    SN: {asset.serial_no || t('lbl_no_serial_no', 'SERİ NO BELİRTİLMEMİŞ')}
                  </p>
                  
                  {/* ALT KONTROLLER */}
                  <div className="mt-auto pt-6 border-t border-slate-100 relative z-10">
                    <div className="flex justify-between items-center mb-6 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('lbl_allocation_date', 'TAHSİS TARİHİ')}</span>
                      <span className="text-[11px] font-black text-slate-700" dir="ltr">{formatDate(asset.given_date)}</span>
                    </div>

                    {/* DİJİTAL ONAY VE DESTEK BUTONLARI */}
                    {!asset.is_acknowledged ? (
                      <div className="space-y-4">
                        <div className="text-[10px] font-black text-amber-600 uppercase flex items-center justify-center gap-2 bg-amber-100/50 p-4 rounded-2xl border border-amber-200/50 text-center tracking-widest leading-relaxed">
                          <AlertCircle size={18} className="shrink-0 text-amber-500"/> {t('msg_please_acknowledge', 'CİHAZI FİZİKEN TESLİM ALDIYSANIZ AŞAĞIDAN ONAYLAYINIZ.')}
                        </div>
                        <button 
                          onClick={() => handleAcknowledge(asset.id, asset.asset_name)}
                          className="w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 active:scale-95"
                        >
                          <CheckCircle2 size={16} /> {t('btn_acknowledge_asset', 'CİHAZI TESLİM ALDIM (ONAYLA)')}
                        </button>
                      </div>
                    ) : (
                      <button 
                        disabled={asset.status === 'IN_REPAIR'}
                        onClick={() => { setSelectedAsset(asset); setIsModalOpen(true); }}
                        className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all ${asset.status === 'IN_REPAIR' ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200' : 'bg-rose-50 border-2 border-rose-100 text-rose-600 hover:bg-rose-500 hover:border-rose-500 hover:text-white hover:shadow-xl hover:shadow-rose-500/30 active:scale-95'}`}
                      >
                        <AlertTriangle size={16} /> {asset.status === 'IN_REPAIR' ? t('btn_asset_in_repair', 'CİHAZ ŞU AN SERVİSTE') : t('btn_report_issue', 'ARIZA BİLDİR / DESTEK İSTE')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= ARIZA BİLDİRİM MODALI ================= */}
      {isModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-rose-600 p-8 flex justify-between items-start shrink-0 text-white">
              <div>
                <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter italic">
                  <div className="p-2.5 bg-rose-500 rounded-xl"><Wrench size={20}/></div>
                  {t('modal_title_issue_report', 'ARIZA VE DESTEK BİLDİRİMİ')}
                </h3>
                <p className={`text-[10px] font-bold text-rose-200 mt-2 uppercase tracking-widest ${isArabic ? 'mr-16' : 'ml-16'} flex items-center gap-1.5`}>
                   <Package size={12}/> {selectedAsset.asset_name?.toLocaleUpperCase(locale)}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className={`text-rose-300 hover:text-white transition-colors ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={28}/></button>
            </div>
            
            <form onSubmit={handleReportIssue} className="p-10 space-y-8 overflow-y-auto bg-slate-50 custom-scrollbar">
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] text-[10px] font-black text-amber-700 flex items-start gap-4 shadow-sm uppercase tracking-[0.2em] leading-relaxed">
                <AlertTriangle size={24} className="shrink-0 text-amber-500"/> 
                {t('msg_ticket_route_warning', 'AÇACAĞINIZ BU DESTEK TALEBİ DOĞRUDAN IT (BİLGİ İŞLEM) DEPARTMANINA İLETİLECEKTİR.')}
              </div>

              <div>
                <label className={`block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_issue_desc', 'SORUN NEDİR? DETAYLICA AÇIKLAYINIZ.')} <span className="text-rose-500">*</span></label>
                <textarea 
                  required 
                  rows="6" 
                  value={issueDescription} 
                  onChange={(e) => setIssueDescription(e.target.value)} 
                  className="w-full border-2 border-slate-200 rounded-[2rem] p-6 outline-none focus:border-rose-400 bg-white text-sm font-bold shadow-sm transition-all resize-none text-slate-700" 
                  placeholder={t('ph_issue_example', 'Örn: Cihazın ekranı kırıldı, bataryası şarj olmuyor, sisteme giriş yapamıyorum...')}
                ></textarea>
              </div>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-500 font-black py-5 rounded-[2rem] uppercase text-[10px] hover:bg-slate-50 transition-all tracking-[0.2em]">{t('btn_cancel', 'İPTAL')}</button>
                <button type="submit" className={`flex-[2] bg-rose-600 text-white font-black py-5 rounded-[2rem] uppercase text-[10px] shadow-xl shadow-rose-600/30 hover:bg-slate-900 transition-all flex items-center justify-center gap-2 tracking-[0.2em] active:scale-95 ${isArabic ? 'flex-row-reverse' : ''}`}><Send size={18}/> {t('btn_send_to_it', "TALEBİ IT'YE GÖNDER")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAsset;

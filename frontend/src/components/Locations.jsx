import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  MapPin, Plus, Crosshair, Download, Building, ShieldAlert, 
  Map, Navigation, XCircle, CheckCircle, Edit3, Trash2, RotateCw
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast'; 
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi

const Locations = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası

  // 🌍 Dinamik RTL kontrolü
  const isArabic = i18n.language === 'ar';

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  
  const [newLocation, setNewLocation] = useState({
    name: '', address: '', latitude: '', longitude: '', allowed_radius: 100
  });

  const [geoLoading, setGeoLoading] = useState(false);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/location/');
      setLocations(res.data || []);
    } catch (err) {
      toast.error(t('err_fetch_locations', "Konumlar çekilemedi."));
      console.error("Konum hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setNewLocation({ name: '', address: '', latitude: '', longitude: '', allowed_radius: 100 });
    setIsModalOpen(true);
  };

  const openEditModal = (loc) => {
    setEditingId(loc.id);
    setNewLocation({
      name: loc.name,
      address: loc.address || '',
      latitude: loc.latitude,
      longitude: loc.longitude,
      allowed_radius: loc.allowed_radius
    });
    setIsModalOpen(true);
  };

  const handleGetLocation = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) {
      toast.error(t('err_geo_not_supported', "Tarayıcınız konum servisini (GPS) desteklemiyor."));
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewLocation({
          ...newLocation,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        });
        setGeoLoading(false);
        toast.success(t('msg_geo_success', "Konumunuz başarıyla alındı."));
      },
      (error) => {
        toast.error(t('err_geo_failed', "Konum alınamadı. Lütfen tarayıcı izinlerinizi kontrol edin."));
        setGeoLoading(false);
      }
    );
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    const tLoading = toast.loading(t('msg_saving_location', "Şantiye kaydediliyor..."));
    try {
      const payload = {
        ...newLocation,
        latitude: parseFloat(newLocation.latitude),
        longitude: parseFloat(newLocation.longitude)
      };

      if (editingId) {
        await api.put(`/location/${editingId}`, payload);
        toast.success(t('msg_location_updated', "Şantiye başarıyla güncellendi."), { id: tLoading });
      } else {
        await api.post('/location/', payload);
        toast.success(t('msg_location_added', "Yeni şantiye başarıyla eklendi."), { id: tLoading });
      }
      
      setIsModalOpen(false);
      fetchLocations();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('err_action_failed', "İşlem sırasında bir hata oluştu."), { id: tLoading });
    }
  };

  const handleDeleteLocation = async (id, name) => {
    const confirmMsg = t('msg_confirm_delete_location', '"{{name}}" şantiyesini silmek (arşive kaldırmak) istediğinize emin misiniz? Bu işlem, bu konuma ait QR kodunu iptal edecektir.').replace('{{name}}', name);
    if (window.confirm(confirmMsg)) {
      const tLoading = toast.loading(t('msg_archiving_location', "Şantiye arşive alınıyor..."));
      try {
        await api.delete(`/location/${id}`);
        toast.success(t('msg_location_deleted', "Şantiye başarıyla silindi."), { id: tLoading });
        fetchLocations();
      } catch (err) {
        toast.error(t('err_delete_location', "Konum silinirken bir hata oluştu."), { id: tLoading });
      }
    }
  };

  // 🎯 YENİ YETENEK: Anti-Fraud QR Yenileme
  const handleRotateQR = async (id, name) => {
    const confirmMsg = t('msg_confirm_rotate_qr', 'DİKKAT: "{{name}}" şantiyesinin mevcut QR kodunu iptal edip yepyeni bir güvenlik şifresi oluşturmak istediğinize emin misiniz? (Mevcut posterler çalışmayacaktır!)').replace('{{name}}', name);
    if (window.confirm(confirmMsg)) {
      const tLoading = toast.loading(t('msg_resetting_qr', "QR Kodu sıfırlanıyor..."));
      try {
        const res = await api.put(`/location/${id}/rotate-qr`);
        toast.success(res.data.message || t('msg_qr_rotated', "Güvenlik şifresi yenilendi. Yeni posteri indirmeyi unutmayın!"), { id: tLoading, duration: 5000 });
        fetchLocations();
      } catch (err) {
        toast.error(t('err_rotate_qr', "QR kod yenilenirken bir hata oluştu."), { id: tLoading });
      }
    }
  };

  const handleDownloadPoster = async (id, name) => {
    const tLoading = toast.loading(t('msg_preparing_poster', "PDF Poster hazırlanıyor..."));
    try {
      const res = await api.get(`/location/${id}/qr-poster`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `QR_Poster_${name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('msg_poster_downloaded', "PDF İndirildi."), { id: tLoading });
    } catch (error) {
      toast.error(t('err_poster_failed', "Poster oluşturulurken bir hata oluştu."), { id: tLoading });
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? "top-left" : "top-right"} />
      
      {/* ================= AKSİYON ÇUBUĞU VE BİLGİ KARTI ================= */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 shrink-0 w-full">
        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-white px-5 py-4 shadow-sm w-full xl:w-auto">
          <div className="rounded-xl bg-rose-100 p-2 text-rose-600"><ShieldAlert size={16} /></div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-700">
            {t('lbl_anti_fraud_system', 'ANTI-FRAUD (SAHTEKARLIK ÖNLEME) SİSTEMİ')}
          </p>
        </div>
        <button onClick={openCreateModal} className={`w-full xl:w-auto bg-slate-900 hover:bg-rose-500 text-white px-8 py-5 rounded-[2rem] font-black transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 text-[10px] tracking-[0.2em] uppercase active:scale-95 shrink-0 ${isArabic ? 'flex-row-reverse' : ''}`}>
          <Plus size={20}/> {t('btn_add_location', 'ŞANTİYE / OFİS EKLE')}
        </button>
      </div>

      {/* ================= KONUMLAR (GRID) ================= */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar pb-4 ${isArabic ? 'pl-2' : 'pr-2'}`}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">{t('lbl_loading_locations', 'KONUMLAR YÜKLENİYOR...')}</div>
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-400 font-bold text-xs uppercase tracking-[0.2em] text-center py-20 border-2 border-dashed border-slate-200 rounded-[3rem] h-full opacity-60 bg-slate-50/50">
            <Map className="mb-6 opacity-40 text-slate-400" size={64}/> 
            <span dangerouslySetInnerHTML={{__html: t('msg_no_locations_html', "SİSTEME KAYITLI HİÇBİR ŞANTİYE/KONUM BULUNMUYOR.")}}></span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {locations.map(loc => (
              <div key={loc.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-rose-500/10 hover:border-rose-200 transition-all group flex flex-col relative overflow-hidden">
                
                {/* DÜZENLE, SİL VE QR YENİLE BUTONLARI */}
                <div className={`absolute top-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 ${isArabic ? 'left-6 flex-row-reverse' : 'right-6'}`}>
                  <button onClick={() => handleRotateQR(loc.id, loc.name)} className="bg-slate-50 text-slate-500 p-2.5 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-colors border border-slate-100 shadow-sm" title={t('tooltip_reset_qr', 'QR Şifresini Sıfırla (Anti-Fraud)')}>
                    <RotateCw size={16}/>
                  </button>
                  <button onClick={() => openEditModal(loc)} className="bg-slate-50 text-slate-500 p-2.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-slate-100 shadow-sm" title={t('tooltip_edit', 'Düzenle')}>
                    <Edit3 size={16}/>
                  </button>
                  <button onClick={() => handleDeleteLocation(loc.id, loc.name)} className="bg-slate-50 text-slate-500 p-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors border border-slate-100 shadow-sm" title={t('tooltip_delete', 'Sil (Arşive Al)')}>
                    <Trash2 size={16}/>
                  </button>
                </div>

                <div className={`flex items-start gap-5 mb-6 relative z-10 ${isArabic ? 'pl-32' : 'pr-32'}`}>
                  <div className="bg-rose-50 p-4 rounded-2xl text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors shrink-0 shadow-inner">
                    <Building size={28}/>
                  </div>
                  <div className="flex-1 mt-1">
                    <h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter italic leading-tight truncate" title={loc.name}>{loc.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 line-clamp-2 leading-relaxed" title={loc.address}>{loc.address || t('lbl_no_address', 'Adres Belirtilmemiş')}</p>
                  </div>
                </div>

                <div className="bg-slate-50/80 p-6 rounded-[2rem] border border-slate-100 mb-8 flex-1 space-y-4 relative z-10">
                  <div className={`flex justify-between items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5"><MapPin size={12}/> {t('lbl_latitude', 'ENLEM (LAT)')}</span>
                    <span className="font-mono font-black text-slate-700 bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-100 truncate max-w-[120px]" dir="ltr">{loc.latitude}</span>
                  </div>
                  <div className={`flex justify-between items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5"><MapPin size={12}/> {t('lbl_longitude', 'BOYLAM (LNG)')}</span>
                    <span className="font-mono font-black text-slate-700 bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-100 truncate max-w-[120px]" dir="ltr">{loc.longitude}</span>
                  </div>
                  <div className={`flex justify-between items-center border-t border-slate-200/60 pt-4 mt-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-1.5"><Crosshair size={14}/> {t('lbl_security_radius', 'GÜVENLİK ÇEMBERİ')}</span>
                    <span className="text-[10px] font-black text-rose-600 bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 tracking-widest" dir="ltr">{loc.allowed_radius} {t('lbl_meters', 'METRE')}</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleDownloadPoster(loc.id, loc.name)}
                  className={`w-full bg-slate-900 text-white py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-rose-500 transition-all active:scale-95 shadow-xl shadow-slate-900/20 relative z-10 ${isArabic ? 'flex-row-reverse' : ''}`}
                >
                  <Download size={18}/> {t('btn_download_poster', 'A4 QR POSTERİ İNDİR')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= MODAL (EKLEME & DÜZENLEME) ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white shrink-0">
              <h3 className="text-xl font-black italic tracking-tighter flex items-center gap-3 uppercase">
                <div className="p-2.5 bg-rose-500 rounded-xl"><MapPin size={24}/></div>
                {editingId ? t('modal_title_edit_loc', "ŞANTİYE / OFİS DÜZENLE") : t('modal_title_new_loc', "YENİ ŞANTİYE / OFİS EKLE")}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className={`hover:text-white transition-all text-slate-400 ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={32}/></button>
            </div>
            
            <form onSubmit={handleSaveLocation} className="p-10 space-y-8 overflow-y-auto bg-slate-50 custom-scrollbar">
              <div>
                <label className={`text-[11px] font-black tracking-[0.2em] text-slate-500 block mb-3 uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_location_name', 'KONUM ADI (Örn: Merkez Ofis)')} <span className="text-rose-500">*</span></label>
                <input required type="text" value={newLocation.name} onChange={e => setNewLocation({...newLocation, name: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-5 rounded-[1.5rem] text-sm outline-none focus:border-rose-500 shadow-sm font-black text-slate-800 transition-colors uppercase" />
              </div>
              
              <div>
                <label className={`text-[11px] font-black tracking-[0.2em] text-slate-500 block mb-3 uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_full_address', 'AÇIK ADRES')}</label>
                <textarea rows="3" value={newLocation.address} onChange={e => setNewLocation({...newLocation, address: e.target.value})} className="w-full bg-white border-2 border-slate-200 p-5 rounded-[1.5rem] text-sm outline-none focus:border-rose-500 shadow-sm font-bold text-slate-700 resize-none transition-colors" placeholder={t('ph_optional', "İsteğe bağlı...")}></textarea>
              </div>

              <div className="bg-white border-2 border-rose-100 p-8 rounded-[2.5rem] space-y-6 shadow-sm">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 ${isArabic ? 'sm:flex-row-reverse' : ''}`}>
                  <label className={`text-[11px] font-black tracking-[0.2em] text-rose-600 uppercase flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}><Navigation size={18}/> {t('lbl_gps_coordinates', 'GPS KOORDİNATLARI')} <span className="text-rose-500">*</span></label>
                  <button type="button" onClick={handleGetLocation} disabled={geoLoading} className={`bg-rose-50 text-rose-600 border border-rose-200 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                    {geoLoading ? t('btn_finding_location', "BULUNUYOR...") : <><MapPin size={14}/> {t('btn_get_my_location', 'MEVCUT KONUMUMU AL')}</>}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={`text-[10px] font-black tracking-[0.2em] text-slate-500 block mb-2 uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_latitude', 'ENLEM (LATITUDE)')}</label>
                    <input required type="number" step="any" value={newLocation.latitude} onChange={e => setNewLocation({...newLocation, latitude: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-sm outline-none focus:border-rose-400 shadow-inner font-mono font-black text-slate-800 transition-colors" placeholder="35.3369" dir="ltr" />
                  </div>
                  <div>
                    <label className={`text-[10px] font-black tracking-[0.2em] text-slate-500 block mb-2 uppercase ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_longitude', 'BOYLAM (LONGITUDE)')}</label>
                    <input required type="number" step="any" value={newLocation.longitude} onChange={e => setNewLocation({...newLocation, longitude: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-sm outline-none focus:border-rose-400 shadow-inner font-mono font-black text-slate-800 transition-colors" placeholder="33.3152" dir="ltr" />
                  </div>
                </div>
              </div>

              <div>
                <label className={`text-[11px] font-black tracking-[0.2em] text-slate-500 block mb-3 uppercase flex items-center gap-2 ${isArabic ? 'mr-1' : 'ml-1'}`}><Crosshair size={16} className="text-rose-500"/> {t('lbl_security_radius_input', 'GÜVENLİK ÇEMBERİ (YARIÇAP - METRE)')} <span className="text-rose-500">*</span></label>
                <input required type="number" min="10" value={newLocation.allowed_radius} onChange={e => setNewLocation({...newLocation, allowed_radius: parseInt(e.target.value)})} className="w-full bg-white border-2 border-slate-200 p-5 rounded-[1.5rem] text-lg outline-none focus:border-rose-500 shadow-sm font-black text-rose-600 transition-colors" dir="ltr"/>
                <p className={`text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-widest leading-relaxed ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('desc_radius_warning', 'Personel bu çemberin dışına çıkarsa QR kod çalışmaz ve yoklama veremez.')}</p>
              </div>

              <div className={`flex gap-4 pt-4 border-t border-slate-200 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-500 font-black py-5 rounded-[2rem] uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 transition-all shadow-sm">{t('btn_cancel', 'İPTAL')}</button>
                <button type="submit" className={`flex-[2] bg-slate-900 text-white py-5 rounded-[2rem] font-black text-[10px] hover:bg-rose-500 transition-all shadow-xl shadow-slate-900/20 active:scale-95 uppercase tracking-[0.2em] flex items-center justify-center gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  {editingId ? <><CheckCircle size={18}/> {t('btn_update_location', 'ŞANTİYEYİ GÜNCELLE')}</> : <><CheckCircle size={18}/> {t('btn_save_location', 'ŞANTİYEYİ SİSTEME KAYDET')}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Locations;

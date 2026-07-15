import React, { useState, useEffect } from 'react';
import { expenseApi, getAbsoluteFileUrl } from '../api/axios';  
import { 
  Wallet, Plus, CheckCircle, XCircle, Clock, 
  ReceiptText, AlertCircle, AlertTriangle, 
  UploadCloud, Image as ImageIcon, Trash2 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast'; 
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi
import { localizeDigits } from '../utils/localizeNumber';

const EXPENSE_LIMIT = 2000; 
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

const EmployeeExpense = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası

  // 🌍 Dinamik toLocaleUpperCase ve RTL için dil tespiti
  const locale = i18n.language === 'tr' ? 'tr-TR' : (i18n.language === 'de' ? 'de-DE' : (i18n.language === 'ar' ? 'ar-SA' : 'en-US'));
  const isArabic = i18n.language === 'ar';
  const localizedNumber = (value, options = {}) => localizeDigits(value, i18n.language, options);

  // 🌍 KATEGORİLERİ DİNAMİKLEŞTİR (Çeviri dosyasından al)
  const EXPENSE_CATEGORIES = [
    t('cat_food', "Yemek & Gıda"), 
    t('cat_transport', "Yol & Ulaşım"), 
    t('cat_accommodation', "Konaklama"), 
    t('cat_education', "Eğitim & Kurs"), 
    t('cat_office', "Ofis Malzemesi"), 
    t('cat_customer', "Müşteri Ağırlama"), 
    t('cat_other', "Diğer")
  ];

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiptModal, setReceiptModal] = useState({ isOpen: false, url: null }); 

  const [newExpense, setNewExpense] = useState({
    amount: '',
    currency: 'TRY',
    category: EXPENSE_CATEGORIES[0],
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    file: null
  });

  const employeeId = parseInt(localStorage.getItem('user_id'), 10);

  useEffect(() => {
    fetchMyExpenses();
  }, []);

  const fetchMyExpenses = async () => {
    setLoading(true);
    try {
      const res = await expenseApi.getMyExpenses(); 
      setExpenses(res.data || []);
    } catch (error) {
      toast.error(t('err_fetch_expenses', "Masraflar çekilemedi.")); // 🌍 Çeviri
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newExpense.file) {
      toast.error(t('err_missing_receipt', "Lütfen harcamanıza ait bir fiş veya fatura görseli yükleyin!")); // 🌍 Çeviri
      return;
    }

    const data = new FormData();
    data.append('employee_id', employeeId);
    data.append('amount', parseFloat(newExpense.amount));
    data.append('currency', newExpense.currency);
    data.append('category', newExpense.category);
    data.append('description', newExpense.description || t('lbl_no_desc', 'Açıklama girilmedi'));
    data.append('expense_date', newExpense.expense_date);
    data.append('file', newExpense.file);

    const tLoading = toast.loading(t('msg_uploading_expense', "Masraf beyanı sisteme yükleniyor...")); // 🌍 Çeviri

    try {
      await expenseApi.create(data); 
      toast.success(t('msg_expense_submitted', "Masrafınız fişiyle birlikte onaya gönderildi!"), { id: tLoading }); // 🌍 Çeviri
      window.dispatchEvent(new Event('app:refresh-notifications'));
      setIsModalOpen(false);
      setNewExpense({ amount: '', currency: 'TRY', category: EXPENSE_CATEGORIES[0], expense_date: new Date().toISOString().split('T')[0], description: '', file: null });
      fetchMyExpenses(); 
    } catch (error) {
      toast.error(error.response?.data?.detail || t('err_submit_expense', "Masraf eklenirken bir hata oluştu."), { id: tLoading }); // 🌍 Çeviri
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('msg_confirm_cancel_expense', "Bu masraf beyanını iptal etmek istediğinize emin misiniz?"))) return; // 🌍 Çeviri
    const tLoading = toast.loading(t('msg_canceling_expense', "Masraf iptal ediliyor...")); // 🌍 Çeviri
    try {
        await expenseApi.delete(id);
        toast.success(t('msg_expense_canceled', "Masraf başarıyla iptal edildi."), { id: tLoading }); // 🌍 Çeviri
        window.dispatchEvent(new Event('app:refresh-notifications'));
        fetchMyExpenses();
    } catch (error) {
        toast.error(t('err_cancel_failed', "İptal işlemi başarısız."), { id: tLoading }); // 🌍 Çeviri
    }
  };

  const openReceipt = (url) => {
    setReceiptModal({ isOpen: true, url: getAbsoluteFileUrl(url) });
  };

  // 🌍 Sayı Formatlayıcı
  const formatCurrency = (amount) => {
    return localizedNumber(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <Toaster position={isArabic ? "top-left" : "top-right"} reverseOrder={false} />

      {/* İNCE AKSİYON ÇUBUĞU */}
      <div className={`flex shrink-0 w-full ${isArabic ? 'justify-start' : 'justify-end'}`}>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus size={18} /> {t('btn_new_receipt', 'YENİ FİŞ / FATURA GİR')}
        </button>
      </div>

      {/* ================= İSTATİSTİK KARTLARI ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:border-amber-200 transition-colors">
          <div className="p-5 bg-amber-50 text-amber-500 rounded-[1.5rem] shrink-0"><Clock size={32} /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{t('lbl_pending_approval', 'ONAY BEKLEYEN')}</p>
            <p className="text-3xl font-black text-slate-800 tracking-tighter" dir="ltr">
              {formatCurrency(expenses.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + Number(e.amount), 0))}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:border-cyan-200 transition-colors">
          <div className="p-5 bg-cyan-50 text-cyan-500 rounded-[1.5rem] shrink-0"><CheckCircle size={32} /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{t('lbl_approved_total', 'ONAYLANAN (TOPLAM)')}</p>
            <p className="text-3xl font-black text-slate-800 tracking-tighter" dir="ltr">
              {formatCurrency(expenses.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + Number(e.amount), 0))}
            </p>
          </div>
        </div>
      </div>

      {/* ================= GEÇMİŞ BEYANLAR LİSTESİ ================= */}
      <div className="flex-1 bg-white rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col pb-4">
        <div className="p-8 border-b border-slate-100 bg-slate-50 shrink-0">
          <h2 className="text-sm font-black text-slate-800 uppercase flex items-center gap-3 tracking-widest">
            <div className="p-2 bg-cyan-100 text-cyan-600 rounded-xl"><ReceiptText size={18}/></div>
            {t('lbl_past_declarations', 'GEÇMİŞ BEYANLARIM')}
          </h2>
        </div>

        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
          {loading ? (
             <p className="text-center text-slate-400 font-bold py-10 uppercase tracking-widest text-xs">{t('lbl_loading_data', 'VERİLER YÜKLENİYOR...')}</p>
          ) : expenses.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-70">
               <ReceiptText size={64} className="mb-4 opacity-30"/>
               <p className="font-bold uppercase tracking-widest text-xs text-center" dangerouslySetInnerHTML={{__html: t('msg_no_expenses_html', "HENÜZ SİSTEME GİRDİĞİNİZ BİR<br/>MASRAF BULUNMUYOR.")}}></p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {expenses.map((exp) => (
                <div key={exp.id} className="border-2 border-slate-100 p-6 rounded-[2rem] bg-white relative group hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-500/10 transition-all flex flex-col">
                  
                  {/* 🎯 SADECE PENDING DURUMUNDA SİLME BUTONU GÖRÜNÜR */}
                  {exp.status === 'PENDING' && (
                      <button 
                         onClick={() => handleDelete(exp.id)} 
                         className={`absolute top-6 ${isArabic ? 'left-6' : 'right-6'} text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100`}
                         title={t('tooltip_cancel_expense', "Masrafı İptal Et (Sil)")}
                      >
                         <Trash2 size={18}/>
                      </button>
                  )}

                  <div className={`flex justify-between items-start mb-6 ${exp.status === 'PENDING' ? (isArabic ? 'pl-10' : 'pr-10') : ''}`}>
                    <span className="text-[9px] font-black uppercase bg-slate-100 px-3 py-1.5 rounded-xl text-slate-600 tracking-[0.2em] border border-slate-200 shadow-sm">
                      {/* Gelen Kategori adı TR kalmış olabilir, onu da çeviri objesinden eşleyelim (opsiyonel) */}
                      {exp.category}
                    </span>
                    <div className={`text-right ${isArabic ? 'mr-auto' : 'ml-auto'}`} dir="ltr">
                      <span className="text-2xl font-black text-slate-800 italic tracking-tighter">{formatCurrency(exp.amount)}</span>
                      <span className="text-xs font-black text-slate-400 ml-1">{exp.currency}</span>
                    </div>
                  </div>
                  
                  <p className="text-xs font-bold text-slate-600 mb-6 flex-1 line-clamp-2 italic" title={exp.description}>"{exp.description || t('lbl_no_desc', 'Açıklama girilmedi.')}"</p>
                  
                  {/* 📸 FİŞ GÖRÜNTÜLEME BUTONU */}
                  {exp.receipt_url && (
                    <button 
                      onClick={() => openReceipt(exp.receipt_url)}
                      className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 hover:bg-indigo-500 hover:text-white py-3 px-4 rounded-xl w-fit transition-all border border-indigo-100 active:scale-95 shadow-sm"
                    >
                      <ImageIcon size={16}/> {t('btn_view_receipt', 'FİŞİ GÖRÜNTÜLE')}
                    </button>
                  )}
                  
                  <div className="flex justify-between items-center border-t border-slate-100 pt-5 mt-auto">
                    <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 tracking-widest" dir="ltr">
                      <Clock size={14} className="shrink-0"/> {new Date(exp.expense_date).toLocaleDateString(locale)}
                    </span>
                    
                    <div className={`flex flex-col ${isArabic ? 'items-start' : 'items-end'}`}>
                      {exp.status === 'APPROVED' ? (
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 shadow-sm tracking-widest border border-emerald-200"><CheckCircle size={12}/> {t('badge_approved', 'ONAYLANDI')}</span>
                      ) : exp.status === 'REJECTED' ? (
                        <span className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 shadow-sm tracking-widest border border-rose-200"><XCircle size={12}/> {t('badge_rejected', 'REDDEDİLDİ')}</span>
                      ) : (
                        <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 shadow-sm tracking-widest border border-amber-200"><Clock size={12}/> {t('badge_pending', 'BEKLİYOR')}</span>
                      )}
                      
                      {exp.status === 'REJECTED' && exp.rejection_reason && (
                          <span className="text-[9px] font-black text-rose-500 mt-1 uppercase max-w-[120px] truncate" title={exp.rejection_reason}>{t('lbl_cancel_reason', 'İptal:')} {exp.rejection_reason}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= YENİ MASRAF MODALI ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-cyan-600 p-8 flex justify-between items-start text-white shrink-0">
              <div>
                <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter italic">
                  <div className="p-2 bg-cyan-500 rounded-xl"><Wallet size={24}/></div>
                  {t('modal_title_new_expense', 'YENİ FİŞ / FATURA GİRİŞİ')}
                </h3>
                <p className={`text-[10px] font-bold text-cyan-200 mt-2 uppercase tracking-widest ${isArabic ? 'mr-16' : 'ml-16'}`}>{t('lbl_approved_paid', 'ONAYLANAN HARCAMALARINIZ ÖDENECEKTİR')}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className={`text-cyan-200 hover:text-white transition-colors ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={32}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto bg-slate-50 custom-scrollbar">
              
              <div className="bg-cyan-50 border border-cyan-100 p-5 rounded-2xl text-[11px] font-black text-cyan-800 flex items-start gap-4 shadow-sm uppercase tracking-widest leading-relaxed">
                <AlertCircle size={28} className="shrink-0 mt-0.5 text-cyan-500"/> 
                {t('msg_expense_policy', 'LÜTFEN SADECE İŞ İLE İLGİLİ ŞİRKET HARCAMALARINIZI GİRİNİZ. ONAYLANAN MASRAFLAR MUHASEBELEŞTİRİLECEKTİR.')}
              </div>

              {Number(newExpense.amount) > EXPENSE_LIMIT && (
                <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-[10px] font-black text-amber-700 flex items-center gap-4 shadow-sm animate-in fade-in zoom-in uppercase tracking-widest">
                  <AlertTriangle size={28} className="shrink-0 text-amber-500"/>
                  {t('msg_limit_warning', 'GİRDİĞİNİZ TUTAR LİMİT OLAN {{limit}} BİRİMİN ÜZERİNDEDİR. YÖNETİCİ ONAYI UZAYABİLİR.').replace('{{limit}}', EXPENSE_LIMIT)}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className={`block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_amount', 'TUTAR')} <span className="text-rose-500">*</span></label>
                  <input 
                    type="number" step="0.01" min="0" required 
                    value={newExpense.amount} 
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} 
                    className={`w-full border-2 rounded-2xl p-4 outline-none bg-white font-black shadow-sm transition-all ${Number(newExpense.amount) > EXPENSE_LIMIT ? 'border-amber-400 focus:border-amber-500 text-amber-700' : 'border-slate-200 focus:border-cyan-500'}`} 
                    placeholder="0.00" 
                    dir="ltr"
                  />
                </div>
                <div className="col-span-1">
                  <label className={`block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_currency', 'DÖVİZ')}</label>
                  <select 
                    value={newExpense.currency} 
                    onChange={(e) => setNewExpense({...newExpense, currency: e.target.value})} 
                    className={`w-full border-2 border-slate-200 rounded-2xl p-4 outline-none focus:border-cyan-500 bg-white font-black shadow-sm text-slate-700 appearance-none cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}
                    dir="ltr"
                  >
                    {CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency.value} value={currency.value}>{currency.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={`-mt-4 px-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                <p className="text-[10px] font-black text-cyan-600 uppercase tracking-[0.2em]">
                  {t('lbl_amount_preview', 'TUTAR ÖNİZLEME')}: <span dir={isArabic ? 'rtl' : 'ltr'}>{formatCurrency(newExpense.amount || 0)} {newExpense.currency}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_category', 'KATEGORİ')} <span className="text-rose-500">*</span></label>
                  <select required value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})} className={`w-full border-2 border-slate-200 rounded-2xl p-4 outline-none focus:border-cyan-500 bg-white font-bold shadow-sm text-slate-700 appearance-none cursor-pointer ${isArabic ? 'bg-[position:left_1rem_center]' : ''}`}>
                    {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_receipt_date', 'FİŞ TARİHİ')} <span className="text-rose-500">*</span></label>
                  <input type="date" required value={newExpense.expense_date} onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})} className="w-full border-2 border-slate-200 rounded-2xl p-4 outline-none focus:border-cyan-500 bg-white font-black shadow-sm text-slate-700" />
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_short_desc', 'KISA AÇIKLAMA / DETAY')} <span className="text-rose-500">*</span></label>
                <textarea required rows="3" value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} className="w-full border-2 border-slate-200 rounded-2xl p-4 outline-none focus:border-cyan-500 bg-white text-sm font-bold shadow-sm resize-none text-slate-700" placeholder={t('ph_expense_desc', 'Örn: Ankara müşteri ziyareti yemek bedeli...')}></textarea>
              </div>

              {/* 📸 FİŞ YÜKLEME ALANI */}
              <div>
                <label className={`block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ${isArabic ? 'mr-1' : 'ml-1'}`}>{t('lbl_receipt_image', 'FİŞ / FATURA GÖRSELİ VEYA PDF')} <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input type="file" required accept="image/*,.pdf" onChange={e => setNewExpense({...newExpense, file: e.target.files[0]})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title=" "/>
                  <div className={`w-full p-8 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all ${newExpense.file ? 'bg-cyan-50 border-cyan-400' : 'bg-white border-slate-300 hover:border-cyan-300 hover:bg-slate-50'}`}>
                    <UploadCloud size={40} className={newExpense.file ? 'text-cyan-500' : 'text-slate-300'}/>
                    <span className={`font-black text-xs text-center uppercase tracking-widest ${newExpense.file ? 'text-cyan-700' : 'text-slate-400'}`}>
                      {newExpense.file ? newExpense.file.name : t('btn_open_cam_gallery', "KAMERAYI AÇ VEYA GALERİDEN SEÇ")}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`flex gap-4 pt-4 border-t border-slate-100 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-500 font-black py-5 rounded-[2rem] uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 transition-all">{t('btn_cancel', 'İPTAL')}</button>
                <button type="submit" className="flex-[2] bg-cyan-500 text-white font-black uppercase text-[10px] tracking-[0.2em] py-5 rounded-[2rem] shadow-xl shadow-cyan-500/30 hover:bg-cyan-600 transition-all active:scale-95">{t('btn_submit_for_approval', 'MASRAFI ONAYA GÖNDER')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 📸 FİŞ GÖRÜNTÜLEME MODALI ================= */}
      {receiptModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
              <h2 className="text-xl font-black italic tracking-tighter flex items-center gap-3 uppercase">
                <ReceiptText size={24} className="text-cyan-500"/> {t('modal_title_receipt', 'MASRAF FİŞİ')}
              </h2>
              <button onClick={() => setReceiptModal({ isOpen: false, url: null })} className={`text-slate-400 hover:text-white transition-colors ${isArabic ? 'hover:-rotate-90' : 'hover:rotate-90'}`}><XCircle size={32} /></button>
            </div>
            
            <div className="p-8 bg-slate-50/50 flex-1 overflow-auto flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] min-h-[300px]">
              {receiptModal.url.endsWith('.pdf') ? (
                 <iframe src={receiptModal.url} className="w-full h-[60vh] rounded-[2rem] shadow-2xl border-4 border-white bg-white" title={t('lbl_receipt_pdf', 'Fiş PDF')} />
              ) : (
                <img 
                  src={receiptModal.url} 
                  alt={t('lbl_receipt_img', 'Masraf Fişi')} 
                  className="max-w-full h-auto max-h-[60vh] rounded-2xl shadow-xl border-4 border-white object-contain bg-white"
                  onError={(e) => { e.target.src = `https://via.placeholder.com/400x600?text=${t('lbl_img_not_found', 'Gorsel+Bulunamadi')}` }}
                />
              )}
            </div>
            <div className="p-6 bg-white border-t border-slate-100 shrink-0">
              <button onClick={() => setReceiptModal({ isOpen: false, url: null })} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs tracking-widest uppercase hover:bg-cyan-600 transition-all active:scale-95 shadow-xl shadow-slate-900/20">
                {t('btn_close_window', 'PENCEREYİ KAPAT')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeeExpense;

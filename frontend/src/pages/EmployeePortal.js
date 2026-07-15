import React from 'react';
import { 
  Laptop, Calendar, GraduationCap, LifeBuoy, 
  ArrowRight, CheckCircle2, Clock, Star, Gift, ShieldCheck
} from 'lucide-react';

const EmployeePortal = () => {
  return (
    <div className="h-full flex flex-col gap-8 overflow-y-auto custom-scrollbar pb-10">
      
      {/* ================= ÜST KARŞILAMA VE ÖZET ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
        
        {/* KİŞİSEL KART */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
          <div className="relative z-10">
            <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Merhaba Caner,</h1>
            <p className="text-indigo-100 font-medium text-sm max-w-md mb-8">
              Bugün harika bir gün! Üzerinde bekleyen 2 görev ve yaklaşan bir eğitimin var. Şirket içindeki mutluluk skorun harika görünüyor! 🚀
            </p>
            <div className="flex gap-4">
               <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Kalan İzin</p>
                  <p className="text-xl font-black">14 Gün</p>
               </div>
               <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Kudos Puanı</p>
                  <p className="text-xl font-black">1250 ✨</p>
               </div>
            </div>
          </div>
          <Star className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-10 rotate-12" />
        </div>

        {/* HIZLI AKSİYONLAR */}
        <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Hızlı İşlemler</h4>
           <div className="grid grid-cols-2 gap-3">
              <QuickAction icon={<Calendar size={18}/>} label="İzin İste" color="bg-emerald-50 text-emerald-600" />
              <QuickAction icon={<LifeBuoy size={18}/>} label="Destek Al" color="bg-rose-50 text-rose-600" />
              <QuickAction icon={<Gift size={18}/>} label="Kudos Gönder" color="bg-amber-50 text-amber-600" />
              <QuickAction icon={<ShieldCheck size={18}/>} label="Belge Yükle" color="bg-indigo-50 text-indigo-600" />
           </div>
        </div>

      </div>

      {/* ================= MODÜLER ÖZETLER ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        
        {/* ZİMMETLERİM (Asset List'ten gelir) */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
              <Laptop size={18} className="text-indigo-500"/> Üzerimdeki Varlıklar
            </h3>
            <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded-md">2 Cihaz</span>
          </div>
          <div className="space-y-4">
             <UserAssetItem title="Macbook Pro M3" serial="SN-991204" />
             <UserAssetItem title="iPhone 15 Pro" serial="SN-110293" />
          </div>
          <button className="mt-8 text-[10px] font-black text-indigo-600 uppercase flex items-center gap-2 hover:underline">
            Tüm Detaylar <ArrowRight size={14}/>
          </button>
        </div>

        {/* EĞİTİMLERİM (Akademi'den gelir) */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
              <GraduationCap size={18} className="text-purple-500"/> Bekleyen Eğitimler
            </h3>
          </div>
          <div className="space-y-4">
             <div className="p-4 bg-slate-50 rounded-2xl border-l-4 border-l-purple-500">
                <p className="text-xs font-black text-slate-800 uppercase">Siber Güvenlik 101</p>
                <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-slate-400">
                  <Clock size={12}/> 20 Mart, 14:00
                </div>
             </div>
          </div>
        </div>

        {/* DESTEK TALEPLERİM (Helpdesk'ten gelir) */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
              <LifeBuoy size={18} className="text-rose-500"/> Taleplerim
            </h3>
          </div>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-700">Laptop Ekran Sorunu</p>
                <span className="text-[9px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-1 rounded">İşlemde</span>
             </div>
          </div>
        </div>

      </div>

    </div>
  );
};

// Yardımcı Bileşenler
const QuickAction = ({ icon, label, color }) => (
  <button className={`${color} p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:scale-95 transition-all shadow-sm`}>
    {icon}
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

const UserAssetItem = ({ title, serial }) => (
  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
    <div className="bg-white p-2.5 rounded-xl shadow-sm"><Laptop size={16} className="text-slate-400"/></div>
    <div>
      <p className="text-xs font-black text-slate-800 uppercase">{title}</p>
      <p className="text-[10px] font-bold text-slate-400 mt-0.5">{serial}</p>
    </div>
  </div>
);

export default EmployeePortal;
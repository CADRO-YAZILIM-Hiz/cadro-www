import React, { useState } from 'react';
import { 
  Network, ShieldCheck, Mail, Smartphone, 
  Map, Settings, UserCheck, AlertTriangle, ArrowRight, GitMerge
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const OrgRoles = () => {
  // 1. ÖRNEK VERİ: Fonksiyonel Roller (Rota Sorumluları)
  const [routes, setRoutes] = useState([
    { id: 1, type: "IT & Sistem", responsible: "Murat Tekin", role: "Bilgi İşlem Müdürü", icon: <Smartphone className="text-cyan-500"/> },
    { id: 2, type: "Zimmet & Envanter", responsible: "Selin Ak", role: "İdari İşler Şefi", icon: <Settings className="text-amber-500"/> },
    { id: 3, type: "İş Sağlığı (İSG)", responsible: "Caner Irmak", role: "İSG Uzmanı", icon: <ShieldCheck className="text-emerald-500"/> },
    { id: 4, type: "E-Özlük & Hukuk", responsible: "Elif Demir", role: "İK Direktörü", icon: <UserCheck className="text-indigo-500"/> },
  ]);

  const handleRouteUpdate = (id) => {
    toast.success("Yönlendirme rotası güncellendi!");
  };

  return (
    <div className="h-full flex flex-col">
      <Toaster position="top-right" />
      
      {/* ÜST BİLGİ KARTI */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 mb-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
        <div className="relative z-10">
          <h1 className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-3">
            <Network size={28} className="text-cyan-400"/> Ana Kadro & <span className="text-cyan-400">Yönlendirme Rotaları</span>
          </h1>
          <p className="text-slate-400 font-medium text-sm mt-2 max-w-2xl">
            Sistemdeki otomatik süreçlerin (Destek, Arıza, Onboarding) hangi personelin ekranına düşeceğini buradan yönetin. Departmanlar arası iş akışını buradan stabilize edebilirsiniz.
          </p>
        </div>
        <GitMerge className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-5 rotate-12" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1 overflow-y-auto custom-scrollbar pb-6">
        
        {/* SOL KOLON: ROTA MERKEZİ (KRİTİK) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aktif İşlem Rotaları</h3>
            <button className="text-indigo-600 font-black text-[10px] uppercase hover:underline">Yeni Rota Ekle</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map((route) => (
              <div key={route.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group border-l-4 border-l-slate-200 hover:border-l-indigo-500">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                    {route.icon}
                  </div>
                  <button onClick={() => handleRouteUpdate(route.id)} className="bg-slate-900 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={16}/>
                  </button>
                </div>
                
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{route.type}</p>
                <h4 className="text-base font-black text-slate-800 uppercase">{route.responsible}</h4>
                <p className="text-xs text-slate-500 font-bold mb-4">{route.role}</p>
                
                <div className="pt-4 border-t border-slate-50 flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Aktif Alıcı
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase">Gecikme Limit: 24 Saat</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SAĞ KOLON: SİSTEM SAĞLIK & VEKALET */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="text-indigo-200" size={24}/>
              <h4 className="font-black text-sm uppercase tracking-widest">Kritik Uyarılar</h4>
            </div>
            <div className="space-y-4">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                <p className="text-xs font-bold leading-relaxed">İdari İşler Sorumlusu (Selin Ak) yıllık izinde. Rotalar otomatik olarak vekili Murat Tekin'e aktarıldı.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6">Departman Doluluk</h4>
            <div className="space-y-6">
              <DeptBar label="OPERASYON" val={85} color="bg-emerald-500" />
              <DeptBar label="TEKNİK / IT" val={40} color="bg-cyan-500" />
              <DeptBar label="SAHA EKİPLERİ" val={95} color="bg-rose-500" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const DeptBar = ({ label, val, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800">%{val}</span>
    </div>
    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
      <div className={`${color} h-full`} style={{ width: `${val}%` }}></div>
    </div>
  </div>
);

export default OrgRoles;
import React, { useState } from 'react';
import { 
  LifeBuoy, Plus, Clock, CheckCircle2, AlertCircle, 
  MessageSquare, User, Tag, ArrowUpRight, Search, Filter
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const HelpDesk = () => {
  const [activeFilter, setActiveFilter] = useState('ALL');

  // 1. ÖRNEK VERİ: Gelen Talepler
  const [tickets, setTickets] = useState([
    { 
      id: "TK-1024", 
      title: "Laptop Ekran Titremesi", 
      category: "IT & Sistem", 
      priority: "HIGH", 
      status: "OPEN", 
      requester: "Caner Irmak",
      date: "16.03.2024",
      assignedTo: "Murat Tekin" // Bu isim OrgChart'taki sorumluya göre otomatik gelir.
    },
    { 
      id: "TK-1025", 
      title: "Ofis Koltuğu Tekerleği Kırık", 
      category: "Zimmet & Envanter", 
      priority: "LOW", 
      status: "IN_PROGRESS", 
      requester: "Elif Demir",
      date: "15.03.2024",
      assignedTo: "Selin Ak"
    }
  ]);

  const getPriorityStyle = (priority) => {
    switch(priority) {
      case 'HIGH': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'MEDIUM': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Toaster position="top-right" />

      {/* ================= ÜST AKSİYON ÇUBUĞU ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 shrink-0">
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto w-full md:w-auto">
          <FilterButton label="Tümü" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
          <FilterButton label="Açık" active={activeFilter === 'OPEN'} onClick={() => setActiveFilter('OPEN')} />
          <FilterButton label="İşlemde" active={activeFilter === 'IN_PROGRESS'} onClick={() => setActiveFilter('IN_PROGRESS')} />
          <FilterButton label="Çözüldü" active={activeFilter === 'RESOLVED'} onClick={() => setActiveFilter('RESOLVED')} />
        </div>

        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] tracking-widest uppercase flex items-center gap-2 shadow-xl shadow-indigo-200 transition-all active:scale-95 w-full md:w-auto justify-center">
          <Plus size={18}/> YENİ DESTEK TALEBİ
        </button>
      </div>

      {/* ================= TICKET LISTESI ================= */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            
            {/* Arkaplan Süsleme */}
            <LifeBuoy className="absolute -right-6 -bottom-6 w-32 h-32 text-slate-50 pointer-events-none rotate-12 group-hover:text-indigo-50 transition-colors" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6">
              
              {/* Durum İkonu */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 ${
                ticket.status === 'OPEN' ? 'bg-amber-50 border-amber-100 text-amber-500' : 
                ticket.status === 'IN_PROGRESS' ? 'bg-indigo-50 border-indigo-100 text-indigo-500' : 'bg-emerald-50 border-emerald-100 text-emerald-500'
              }`}>
                {ticket.status === 'OPEN' ? <AlertCircle size={24}/> : <Clock size={24}/>}
              </div>

              {/* İçerik */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ticket.id}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${getPriorityStyle(ticket.priority)}`}>
                    {ticket.priority === 'HIGH' ? 'ACİL' : 'NORMAL'}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">
                    <Tag size={10}/> {ticket.category}
                  </span>
                </div>
                <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{ticket.title}</h4>
                
                <div className="flex flex-wrap items-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center"><User size={12} className="text-slate-500"/></div>
                    <span className="text-xs font-bold text-slate-600">{ticket.requester}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center"><CheckCircle2 size={12} className="text-indigo-600"/></div>
                    <span className="text-xs font-bold text-slate-600 underline">Atanan: {ticket.assignedTo}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Oluşturma: {ticket.date}</span>
                </div>
              </div>

              {/* Aksiyon */}
              <div className="shrink-0 flex items-center gap-2">
                <button className="bg-slate-50 text-slate-400 p-4 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                   <MessageSquare size={20}/>
                </button>
                <button className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase flex items-center gap-2 hover:bg-indigo-600 transition-all">
                  DETAYLARI GÖR <ArrowUpRight size={16}/>
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FilterButton = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
      active ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
    }`}
  >
    {label}
  </button>
);

export default HelpDesk;
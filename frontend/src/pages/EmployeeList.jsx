import React, { useEffect, useState } from 'react';
import { getEmployees, createEmployee, modifyEmployee, getPayrollTypes } from '../api';
import { UserPlus, Search, X, User, Briefcase, CreditCard, Calendar, MoreVertical, Archive, UserCheck, UserMinus, CheckCircle2, AlertCircle, Users, Wallet, TrendingUp, GraduationCap, MapPin, ShieldCheck } from 'lucide-react';

const InputGroup = ({ label, name, type = "text", onChange, value, required = false, step }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1 text-left">{label} {required && "*"}</label>
    <input 
      type={type} 
      name={name} 
      required={required} 
      value={value || ""} 
      onChange={onChange}
      step={step}
      className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-cyan-500 font-bold text-sm shadow-sm transition-all text-left" 
    />
  </div>
);

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [payrollTypes, setPayrollTypes] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("ACTIVE");
  const [notification, setNotification] = useState(null);
  
  const initialState = {
    first_name: "", last_name: "", email: "", phone: "",
    identity_no: "", mother_name: "", father_name: "",
    birth_place: "", birth_date: "", gender: "Erkek",
    address: "", position: "", social_security_no: "",
    provident_fund_no: "", nationality: "KKTC",
    is_married: false, spouse_works: false,
    children_count: 0, education_level: "Üniversite",
    department: "", 
    payroll_type_id: "", 
    gross_salary: 0,
    hire_date: new Date().toISOString().split('T')[0],
    status: "ACTIVE",
    // SaaS tenant yapısında şirket kapsamı token'dan çözülmeli.
    // Legacy sayfada sabit company_id göndermiyoruz.
    company_id: "" 
  };

  const [formData, setFormData] = useState(initialState);

  const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
  const totalGrossSalary = activeEmployees.reduce((sum, emp) => sum + (Number(emp.gross_salary) || 0), 0);

  const showNotify = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Personel Listesini Çek
      try {
        const empRes = await getEmployees();
        setEmployees(empRes.data || []);
      } catch (err) {
        console.error("Personel verisi çekilemedi:", err);
      }

      // 2. Yatırım Tiplerini Çek
      try {
        const typesRes = await getPayrollTypes();
        const types = typesRes.data || [];
        
        if (types.length === 0) {
            const fallbackType = { id: 1, code: "STD", name: "Standart Brüt (Sistem Verisi)" };
            setPayrollTypes([fallbackType]);
            if (!formData.payroll_type_id) {
                setFormData(prev => ({ ...prev, payroll_type_id: fallbackType.id }));
            }
        } else {
            setPayrollTypes(types);
            if (!formData.payroll_type_id) {
                setFormData(prev => ({ ...prev, payroll_type_id: types[0].id }));
            }
        }
      } catch (err) {
        console.error("Yatırım tipleri çekilemedi:", err);
      }

    } finally { 
        setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
        ...formData,
        children_count: parseInt(formData.children_count) || 0,
        gross_salary: parseFloat(formData.gross_salary) || 0,
        payroll_type_id: parseInt(formData.payroll_type_id) || 1
    };

    delete payload.company_id;

    try {
      await createEmployee(payload);
      setIsModalOpen(false);
      setFormData(initialState);
      fetchData();
      showNotify("Personel kaydı başarıyla oluşturuldu.");
    } catch (err) { 
        const errorMsg = err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || "Kayıt hatası!";
        showNotify(typeof errorMsg === 'string' ? errorMsg : "İşlem başarısız", "error"); 
    }
  };

  const handleArchive = async (id) => {
    if(window.confirm("Bu personeli arşivlemek istediğinize emin misiniz?")) {
        try {
            await modifyEmployee(id, { status: "INACTIVE" });
            fetchData();
            showNotify("Personel arşive kaldırıldı.");
        } catch (err) { showNotify("İşlem başarısız!", "error"); }
    }
  };

  // KESİLEN YER BURADAN İTİBAREN TAMAMLANDI
  const filtered = employees.filter(emp => {
    const matchesTab = emp.status === activeTab;
    const matchesSearch = `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-cyan-600 animate-pulse text-2xl uppercase italic tracking-widest">SİSTEM BAŞLATILIYOR...</div>;

  return (
    <div className="p-8 min-h-screen bg-slate-50/50 relative">
      
      {notification && (
        <div className={`fixed top-10 right-10 z-[100] flex items-center gap-3 px-6 py-4 rounded-3xl shadow-2xl border animate-in slide-in-from-right duration-300 ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="text-emerald-500" /> : <AlertCircle className="text-rose-500" />}
            <span className="font-black text-sm uppercase italic">{notification.message}</span>
        </div>
      )}

      {/* ÜST PANEL */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-10">
        <div>
          <h1 className="text-4xl text-slate-900 uppercase font-black italic tracking-tighter">PERSONEL <span className="text-cyan-500">DİZİNİ</span></h1>
          <p className="text-slate-400 font-bold text-[10px] mt-2 tracking-[0.3em] uppercase italic opacity-70">KKTC Uyumlu İK Yönetim Modülü</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-4 text-slate-400" size={18} />
            <input type="text" placeholder="İsim veya soyisim ara..." className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none w-80 font-bold shadow-sm focus:border-cyan-500 transition-all text-sm" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-cyan-600 transition-all shadow-xl flex items-center gap-2">
            <UserPlus size={18} /> PERSONEL EKLE
          </button>
        </div>
      </div>

      {/* İSTATİSTİK ŞERİDİ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 group hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-all"><Users size={28}/></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Toplam Çalışan</p><p className="text-2xl font-black text-slate-900 italic">{activeEmployees.length}</p></div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 group hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all"><Wallet size={28}/></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aylık Brüt Maliyet</p><p className="text-2xl font-black text-slate-900 italic">{totalGrossSalary.toLocaleString()} ₺</p></div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 group hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-cyan-400"><TrendingUp size={28}/></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ortalama Maaş</p><p className="text-2xl font-black text-slate-900 italic">{(activeEmployees.length > 0 ? totalGrossSalary / activeEmployees.length : 0).toLocaleString(undefined, {maximumFractionDigits:0})} ₺</p></div>
        </div>
      </div>

      {/* LİSTE */}
      <div className="bg-white rounded-[3rem] shadow-2xl border-slate-100 overflow-hidden border">
        <div className="flex border-b bg-slate-50/50">
            <button onClick={() => setActiveTab("ACTIVE")} className={`flex-1 py-5 font-black text-[11px] uppercase tracking-[0.2em] transition-all border-r ${activeTab === 'ACTIVE' ? 'bg-white text-cyan-600' : 'text-slate-400 hover:text-slate-600'}`}>AKTİF KADRO</button>
            <button onClick={() => setActiveTab("INACTIVE")} className={`flex-1 py-5 font-black text-[11px] uppercase tracking-[0.2em] transition-all ${activeTab === 'INACTIVE' ? 'bg-white text-rose-500' : 'text-slate-400 hover:text-slate-600'}`}>ARŞİVLENENLER</button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-white text-slate-400 text-[10px] uppercase font-black tracking-widest border-b">
            <tr>
              <th className="px-10 py-5">PERSONEL</th>
              <th className="px-10 py-5">POZİSYON / DEPT.</th>
              <th className="px-10 py-5">YATIRIM TİPİ</th>
              <th className="px-10 py-5">GİRİŞ TARİHİ</th>
              <th className="px-10 py-5 text-right">BRÜT MAAŞ</th>
              <th className="px-10 py-5 text-right">EYLEM</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm uppercase italic font-medium">
            {filtered.length > 0 ? filtered.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50/80 transition-all group">
                <td className="px-10 py-5 font-black text-slate-900 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-black group-hover:bg-cyan-500 group-hover:text-white transition-all">{emp.first_name[0]}{emp.last_name[0]}</div>
                  <div>
                    <p className="leading-none">{emp.first_name} {emp.last_name}</p>
                    <p className="text-[9px] text-slate-400 mt-1 not-italic font-bold tracking-tighter">{emp.identity_no || 'KİMLİK YOK'}</p>
                  </div>
                </td>
                <td className="px-10 py-5">
                    <p className="text-slate-700 font-bold leading-none text-xs">{emp.position || 'GENEL'}</p>
                    <p className="text-[9px] text-slate-400 mt-1 font-bold">{emp.department || '-'}</p>
                </td>
                <td className="px-10 py-5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 text-cyan-700 rounded-lg text-[10px] font-black tracking-tighter border border-cyan-100">
                    <ShieldCheck size={12}/>
                    {emp.payroll_type?.code || 'D1'}
                  </span>
                </td>
                <td className="px-10 py-5 text-slate-500 font-bold text-xs">{emp.hire_date}</td>
                <td className="px-10 py-5 text-right font-black text-slate-800 text-lg">{emp.gross_salary?.toLocaleString()} ₺</td>
                <td className="px-10 py-5 text-right">
                  {activeTab === 'ACTIVE' && (
                    <button onClick={() => handleArchive(emp.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><UserMinus size={20}/></button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan="6" className="py-24 text-center font-black text-slate-200 tracking-[0.5em] text-xl">LİSTE ŞU AN BOŞ</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL (FORM ALANI) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-[95rem] rounded-[3.5rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in duration-300">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center font-black italic">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-500 rounded-2xl shadow-lg shadow-cyan-500/20"><UserPlus size={24} /></div>
                <h2 className="text-2xl uppercase tracking-tighter">YENİ PERSONEL <span className="text-cyan-400 font-black">KAYIT FORMU</span></h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-all p-2 bg-white/5 rounded-full"><X size={32} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 bg-slate-50/50 max-h-[80vh] overflow-y-auto">
              
              {/* BÖLÜM 1: KİMLİK & AİLE */}
              <div className="space-y-5">
                <h4 className="text-[10px] font-black text-cyan-600 uppercase border-b border-cyan-100 pb-2 flex items-center gap-2 tracking-widest"><User size={14}/> KİMLİK VE AİLE</h4>
                <InputGroup label="Ad" name="first_name" required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                <InputGroup label="Soyad" name="last_name" required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                <InputGroup label="Kimlik No" name="identity_no" value={formData.identity_no} onChange={e => setFormData({...formData, identity_no: e.target.value})} />
                <InputGroup label="Anne Adı" name="mother_name" value={formData.mother_name} onChange={e => setFormData({...formData, mother_name: e.target.value})} />
                <InputGroup label="Baba Adı" name="father_name" value={formData.father_name} onChange={e => setFormData({...formData, father_name: e.target.value})} />
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Cinsiyet</label>
                  <select className="p-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-cyan-500" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                    <option value="Erkek">Erkek</option><option value="Kadın">Kadın</option>
                  </select>
                </div>
              </div>

              {/* BÖLÜM 2: SOSYAL & EĞİTİM */}
              <div className="space-y-5">
                <h4 className="text-[10px] font-black text-cyan-600 uppercase border-b border-cyan-100 pb-2 flex items-center gap-2 tracking-widest"><GraduationCap size={16}/> SOSYAL & EĞİTİM</h4>
                <InputGroup label="Doğum Yeri" name="birth_place" value={formData.birth_place} onChange={e => setFormData({...formData, birth_place: e.target.value})} />
                <InputGroup label="Doğum Tarihi" name="birth_date" type="date" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} />
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Eğitim Seviyesi</label>
                  <select className="p-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-cyan-500" value={formData.education_level} onChange={e => setFormData({...formData, education_level: e.target.value})}>
                    {["İlkokul", "Ortaokul", "Lise", "Üniversite", "Yüksek Lisans", "Doktora"].map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Uyruk</label>
                  <select className="p-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-cyan-500" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})}>
                    <option value="KKTC">KKTC</option><option value="TC">TC</option><option value="Diğer">Diğer</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 text-left">
                    <label className="text-[11px] font-black text-slate-500 uppercase ml-1 flex items-center gap-1"><MapPin size={12}/> Adres</label>
                    <textarea className="p-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm min-h-[90px] outline-none focus:border-cyan-500 transition-all shadow-inner" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
              </div>

              {/* BÖLÜM 3: KURUMSAL */}
              <div className="space-y-5">
                <h4 className="text-[10px] font-black text-cyan-600 uppercase border-b border-cyan-100 pb-2 flex items-center gap-2 tracking-widest"><Briefcase size={14}/> KURUMSAL BİLGİLER</h4>
                <InputGroup label="Pozisyon" name="position" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
                <InputGroup label="Departman" name="department" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                <InputGroup label="İşe Giriş Tarihi" name="hire_date" type="date" required value={formData.hire_date} onChange={e => setFormData({...formData, hire_date: e.target.value})} />
                <InputGroup label="E-Posta" name="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <InputGroup label="Telefon" name="phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                
                {/* EKLENEN KISIM: YATIRIM TİPİ DROPDOWN */}
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1 text-left">Yatırım Tipi (KKTC Mevzuat) *</label>
                  <select 
                    required
                    name="payroll_type_id"
                    value={formData.payroll_type_id || ""} 
                    onChange={e => setFormData({...formData, payroll_type_id: e.target.value})}
                    className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-cyan-500 font-bold text-sm shadow-sm transition-all text-left"
                  >
                    <option value="" disabled>Seçiniz...</option>
                    {payrollTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.code} - {type.name.length > 30 ? type.name.substring(0, 30) + '...' : type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BÖLÜM 4: KKTC SG & MALİ */}
              <div className="space-y-5">
                <h4 className="text-[10px] font-black text-cyan-600 uppercase border-b border-cyan-100 pb-2 flex items-center gap-2 tracking-widest"><CreditCard size={14}/> KKTC SG & MALİ</h4>
                <InputGroup label="Sosyal Güvenlik No" name="social_security_no" value={formData.social_security_no} onChange={e => setFormData({...formData, social_security_no: e.target.value})} />
                <InputGroup label="İhtiyat Sandığı No" name="provident_fund_no" value={formData.provident_fund_no} onChange={e => setFormData({...formData, provident_fund_no: e.target.value})} />
                <InputGroup label="Brüt Maaş (₺)" name="gross_salary" type="number" step="0.01" required value={formData.gross_salary} onChange={e => setFormData({...formData, gross_salary: e.target.value})} />
                
                <div className="p-5 bg-white border border-slate-200 rounded-[2rem] space-y-4 shadow-inner">
                    <label className="flex items-center gap-3 text-[11px] font-black uppercase cursor-pointer group">
                        <input type="checkbox" checked={formData.is_married} onChange={e => setFormData({...formData, is_married: e.target.checked})} className="w-5 h-5 accent-cyan-500 rounded-lg" /> 
                        <span className="group-hover:text-cyan-600 transition-colors">Evli</span>
                    </label>
                    {formData.is_married && (
                      <label className="flex items-center gap-3 text-[11px] font-black uppercase cursor-pointer group animate-in slide-in-from-top-2">
                        <input type="checkbox" checked={formData.spouse_works} onChange={e => setFormData({...formData, spouse_works: e.target.checked})} className="w-5 h-5 accent-cyan-500 rounded-lg" /> 
                        <span className="group-hover:text-cyan-600 transition-colors">Eşi Çalışıyor</span>
                      </label>
                    )}
                    <InputGroup label="Çocuk Sayısı" name="children_count" type="number" value={formData.children_count} onChange={e => setFormData({...formData, children_count: e.target.value})} />
                </div>

                <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black hover:bg-emerald-500 transition-all uppercase text-[11px] tracking-[0.2em] shadow-2xl active:scale-95 border-b-4 border-slate-950">
                    SİSTEME KAYDET
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;

import React, { useEffect, useState } from 'react';
import { getDashboardSummary } from '../api';
import { Users, Calendar, Wallet, TrendingUp, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardSummary()
      .then(res => {
        setSummary(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen text-blue-600 font-semibold">Veriler Yükleniyor...</div>;

  const stats = [
    { title: 'Toplam Personel', value: summary?.total_employees || 0, icon: <Users size={24} />, color: 'bg-blue-500' },
    { title: 'Aktif İzinler', value: summary?.active_leaves || 0, icon: <Calendar size={24} />, color: 'bg-emerald-500' },
    { title: 'Bekleyen Ödemeler', value: summary?.pending_payments || 0, icon: <AlertCircle size={24} />, color: 'bg-amber-500' },
    { title: 'Aylık Bütçe', value: `${summary?.monthly_budget?.toLocaleString()} ₺`, icon: <Wallet size={24} />, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800">Genel Bakış</h1>
        <p className="text-slate-500">Şirketinizin anlık İK durumu ve istatistikleri.</p>
      </header>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`${stat.color} p-3 rounded-xl text-white`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Alt Bölüm: Grafik veya Bildirim Alanı */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-64 flex items-center justify-center">
          <div className="text-center">
            <TrendingUp size={48} className="text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 font-medium">Maaş Trendi Grafiği (Yakında)</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 text-lg">Son Aktiviteler</h3>
          <div className="space-y-4">
            <div className="flex gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
              <p className="text-slate-600">Ahmet Bey izin talebinde bulundu.</p>
            </div>
            <div className="flex gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5"></div>
              <p className="text-slate-600">Yeni personel girişi yapıldı: Mehmet Y.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
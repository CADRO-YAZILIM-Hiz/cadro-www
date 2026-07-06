import React, { useState } from 'react';
import api from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import { KeyRound, Lock, ShieldCheck } from 'lucide-react';

const AccountSecurity = () => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.new_password !== form.confirm_password) {
      toast.error('Yeni şifreler eşleşmiyor.');
      return;
    }
    if ((form.new_password || '').length < 8) {
      toast.error('Yeni şifre en az 8 karakter olmalı.');
      return;
    }

    const loadingToast = toast.loading('Şifre güncelleniyor...');
    try {
      setSaving(true);
      await api.put('/employee/me/change-password', {
        old_password: form.old_password,
        new_password: form.new_password,
      });
      toast.success('Şifre başarıyla güncellendi.', { id: loadingToast });
      setForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Şifre güncellenemedi.', { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <Toaster position="top-right" />

      <section className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Hesap Güvenliği</p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight">Platform sahibi oturumu</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
          Bu alan sadece kendi hesabının güvenlik ayarları içindir. Girişte iki aşamalı doğrulama aktif kalır; burada yalnızca şifre yenileyebilirsin.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-[2.5rem] border border-emerald-200 bg-emerald-50 p-8 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-800">
            <ShieldCheck size={20} />
            <p className="text-[10px] font-black uppercase tracking-[0.22em]">MFA Durumu</p>
          </div>
          <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-emerald-900">İki aşamalı doğrulama açık</h2>
          <p className="mt-4 text-sm leading-6 text-emerald-900/80">
            Giriş yaptığında e-posta doğrulama kodu istemeye devam eder. Bu hesap, şirket ekranlarından izole tutulur ve sadece platform sahibine ait menülere erişir.
          </p>
        </section>

        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-[1.25rem] bg-indigo-100 p-3 text-indigo-600">
              <KeyRound size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Şifre İşlemleri</p>
              <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-slate-900">Parolayı yenile</h3>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <PasswordField label="Mevcut Şifre" value={form.old_password} onChange={(value) => setForm((prev) => ({ ...prev, old_password: value }))} />
            <PasswordField label="Yeni Şifre" value={form.new_password} onChange={(value) => setForm((prev) => ({ ...prev, new_password: value }))} />
            <PasswordField label="Yeni Şifre Tekrar" value={form.confirm_password} onChange={(value) => setForm((prev) => ({ ...prev, confirm_password: value }))} />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-[1.5rem] bg-indigo-600 px-6 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
              >
                <Lock size={16} />
                Şifreyi Güncelle
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

const PasswordField = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">{label}</label>
    <input
      type="password"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-900 outline-none transition-all focus:border-indigo-300 focus:bg-white"
    />
  </div>
);

export default AccountSecurity;

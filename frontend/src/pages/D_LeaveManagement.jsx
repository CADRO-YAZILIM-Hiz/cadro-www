import React from 'react';
import { useTranslation } from 'react-i18next'; // 🌍 YENİ: Dil motoru eklendi

const LeaveManagement = () => {
  const { t, i18n } = useTranslation(); // 🌍 YENİ: Çeviri kancası

  // 🌍 RTL (Arapça) Desteği
  const isArabic = i18n.language === 'ar';

  return (
    <div className="p-8 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-4">{t('title_leave_management', 'İzin Yönetimi')}</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">{t('desc_leave_management_wip', 'İzin talepleri ve onay süreci burada görüntülenecek.')}</p>
        <span className="mt-4 inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm font-bold uppercase tracking-widest">
          {t('badge_under_construction', 'Yapım Aşamasında')}
        </span>
      </div>
    </div>
  );
};

export default LeaveManagement;
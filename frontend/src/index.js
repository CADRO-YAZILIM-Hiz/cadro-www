import './i18n'; // 🌍 İlk olarak dil motoru başlatılır
import i18n from './i18n'; // 🌍 Dil objesini kullanmak için import ediyoruz
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

import './index.css'; 

// 🎯 DİNAMİK SİHİRLİ DOKUNUŞ: Tarayıcıya sitenin "o anki" dilini ve yönünü söylüyoruz
document.documentElement.lang = i18n.language || 'tr';
document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

// 🌍 Kullanıcı uygulama içindeyken dili değiştirirse HTML etiketini de anında güncelleyen dinleyici (Listener)
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
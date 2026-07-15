import React from 'react';
import Auth from './Auth';

/*
 * ⚠️ LEGACY LOGIN WRAPPER
 *
 * Bu dosya geçmişte ayrı bir giriş ekranıydı.
 * Aktif ve MFA destekli tek giriş deneyimi artık `Auth.jsx`.
 *
 * Eski route veya import'lar bozulmasın diye burayı uyumluluk katmanı
 * olarak bırakıyoruz.
 */
const LoginPage = ({ setIsAuthenticated }) => {
  return <Auth setIsAuthenticated={setIsAuthenticated} initialMode="login" />;
};

export default LoginPage;

import React from 'react';
import Auth from './Auth';

/*
 * ⚠️ LEGACY MFA LOGIN WRAPPER
 *
 * Tarihsel olarak bu dosya kendi MFA akışını içeriyordu.
 * Aktif ve güncel auth davranışı artık `Auth.jsx` içinde yaşıyor.
 *
 * `setToken` bekleyen eski çağrılar bozulmasın diye başarılı girişten sonra
 * localStorage'daki token'ı geri bildiriyoruz.
 */
function Login({ setToken, setIsAuthenticated }) {
  const handleAuthenticated = (value) => {
    if (value) {
      const token = localStorage.getItem('token');
      if (setToken) setToken(token);
      if (setIsAuthenticated) setIsAuthenticated(true);
    }
  };

  return <Auth setIsAuthenticated={handleAuthenticated} initialMode="login" />;
}

export default Login;

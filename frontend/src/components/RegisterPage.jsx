import React from 'react';
import Auth from './Auth';

/*
 * ⚠️ LEGACY REGISTER WRAPPER
 *
 * Kayıt ve giriş akışı artık MFA uyumlu tek ekran olan `Auth.jsx`
 * içinde birleşti. Bu dosya eski import zincirlerini korumak için
 * wrapper olarak tutuluyor.
 */
const RegisterPage = ({ setIsAuthenticated }) => {
  return <Auth setIsAuthenticated={setIsAuthenticated} initialMode="register" />;
};

export default RegisterPage;

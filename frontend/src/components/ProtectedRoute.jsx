import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { clearAuthStorage } from '../api/axios';
import { canAccessPath, getDefaultAuthorizedRoute, getStoredPlanCode, hasAnyPermission, hasPermission } from '../auth/permissions';

const ProtectedRoute = ({
  children,
  allowedRoles,
  requiredPermission,
  requiredAnyPermissions,
  userRole,
}) => {
  const location = useLocation();
  
  // 🎯 GÜVENLİK: Proje standartımıza uygun olarak oturum verilerini alıyoruz
  const token = localStorage.getItem('token');
  const resolvedUserRole = userRole || localStorage.getItem('user_role');
  const resolvedPlanCode = getStoredPlanCode();

  // ================= 1. OTURUM KONTROLÜ =================
  if (!token || token === 'undefined' || token === 'null') {
    clearAuthStorage();
    // Kullanıcı giriş yapmamış. 
    // UX HARİKASI: Gitmek istediği adresi "state" içine koyarak Login'e yolluyoruz.
    // Böylece giriş yaptıktan sonra kaldığı yerden devam edebilir.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ================= 2. YETKİ (RBAC) KONTROLÜ =================
  // 🔥 DÜZELTME: Sonsuz döngüyü engellemek için yetkisiz erişimler faturalandırma/uyarı sayfasına yönlendirildi.
  if (allowedRoles && !allowedRoles.includes(resolvedUserRole)) {
    return <Navigate to="/billing?error=unauthorized" replace />;
  }

  if (requiredPermission && !hasPermission(resolvedUserRole, requiredPermission)) {
    return <Navigate to="/billing?error=unauthorized" replace />;
  }

  if (requiredAnyPermissions && !hasAnyPermission(resolvedUserRole, requiredAnyPermissions)) {
    return <Navigate to="/billing?error=unauthorized" replace />;
  }

  if (!canAccessPath(resolvedUserRole, location.pathname, resolvedPlanCode)) {
    return <Navigate to="/billing?error=unauthorized" replace />;
  }

  // ================= 3. GEÇİŞ İZNİ =================
  // Her şey yolundaysa, gitmek istediği bileşeni (children) ekrana çiz.
  return children;
};

export default ProtectedRoute;
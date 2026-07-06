import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 👇 EKLENDİ: Paddle'ı uygulamanın kök seviyesinde başlatmak için
// @paddle/paddle-js artık yalnızca cadro.io marketing sitesinde kullanılır

// --- BİLEŞENLER (COMPONENTS) ---
import Sidebar from './components/Sidebar'; 
import Auth from './components/Auth'; 
import Dashboard from './components/Dashboard';
import AtsClockWidget from './components/AtsClockWidget';
import SessionTimeout from './components/SessionTimeout'; 

// İK / Yönetici Modülleri
import EmployeeList from './components/EmployeeList'; 
import CompanySettings from './components/CompanySettings'; 
import AssetList from './components/AssetList'; 
import AttendanceList from './components/AttendanceList'; 
import OrgChart from './components/OrgChart';
import LeaveManagement from './components/LeaveManagement'; 
import Billing from './components/Billing'; 
import Helpdesk from './components/Helpdesk'; 
import ATS from './components/ATS';
import ExecutiveConsole from './components/ExecutiveConsole';
import AccountSecurity from './components/AccountSecurity';
import EDossier from './components/EDossier'; 
import ExpenseManagement from './components/ExpenseManagement';
import PurchaseRequestManagement from './components/PurchaseRequestManagement';
import GenericRequestManagement from './components/GenericRequestManagement';
import KnowledgeBase from './components/KnowledgeBase';
import KpiStatistics from './components/KpiStatistics';
import PerformanceManagement from './components/PerformanceManagement'; 
import Training from './components/Training'; 
import Locations from './components/Locations';
import SupportCenter from './components/SupportCenter';
import Onboarding from './pages/Onboarding'; 

// Personel Modülleri
import EmployeePortal from './components/EmployeePortal'; 
import EmployeePerformance from './components/EmployeePerformance'; 
import EmployeeTraining from './components/EmployeeTraining'; 
import EmployeeExpense from './components/EmployeeExpense';
import EmployeeAsset from './components/EmployeeAsset';
import EmployeeLeave from './components/EmployeeLeave';
// 🔥 YENİ: Personel için puantaj sayfasını import ediyoruz
import EmployeeAttendance from './components/EmployeeAttendance'; 
import ProtectedRoute from './components/ProtectedRoute';
import { getDefaultAuthorizedRoute, getStoredPlanCode } from './auth/permissions';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('token') !== null && 
    localStorage.getItem('token') !== 'undefined' && 
    localStorage.getItem('token') !== ''
  );
  
  const [userRole, setUserRole] = useState(localStorage.getItem('user_role') || "EMPLOYEE"); 
  const planCode = getStoredPlanCode();

  useEffect(() => {
    if (isAuthenticated) {
        setUserRole(localStorage.getItem('user_role') || "EMPLOYEE");
    } else {
        setUserRole(null);
    }
  }, [isAuthenticated]);

  // 👇 EKLENDİ: Uygulama açıldığında Paddle'ı başlat
  // ==============================================================
  // 💳 PADDLE — Marketing sitesinde (cadro.io/pay.html) checkout açılır.
  // app.cadro.io içinde Paddle SDK'ya gerek yok; sadece /paddle/subscription
  // endpoint'inden abonelik durumu okunur.
  // Paddle init buradan KALDIRILDI — artık sadece cadro.io/site-config.js içinde.
  // ==============================================================

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Auth setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="*" element={<Auth setIsAuthenticated={setIsAuthenticated} />} />
        </Routes>
      </Router>
    );
  }

  // --- ROL GRUPLAMALARI ---
  const isEmployee = userRole === "EMPLOYEE";
  const isOwner = userRole === "OWNER";
  return (
    <Router>
      {isAuthenticated && <SessionTimeout setIsAuthenticated={setIsAuthenticated} />}

      <div className="app-tech-background flex min-h-screen font-sans antialiased">
        <Sidebar setIsAuthenticated={setIsAuthenticated} userRole={userRole} /> 

        <main className="app-shell-surface flex-1 h-screen flex flex-col overflow-hidden transition-all duration-300">
          {!isOwner ? (
            <div className="px-6 md:px-8 pt-6 md:pt-8 pb-0 shrink-0">
              <AtsClockWidget />
            </div>
          ) : null}

          <div className={`flex-1 overflow-y-auto overflow-x-hidden px-6 md:px-8 ${isOwner ? 'pt-8' : 'pt-6'} pb-12 custom-scrollbar`}>
            <Routes>
              
              {/* 🎯 KÖK DİZİN YÖNLENDİRMESİ */}
              <Route path="/" element={
                <Navigate to={getDefaultAuthorizedRoute(userRole, planCode)} replace />
              } />

              {/* 🏠 ANA EKRANLAR (DASHBOARD & PORTAL) */}
              <Route path="/dashboard" element={<ProtectedRoute userRole={userRole} requiredPermission="dashboard.view_company"><Dashboard /></ProtectedRoute>} />
              <Route path="/portal" element={<ProtectedRoute userRole={userRole} requiredPermission="portal.view_workspace"><EmployeePortal /></ProtectedRoute>} />

              {/* 👥 İNSAN KAYNAKLARI KOKPİTİ ROTALARI */}
              <Route path="/employees" element={<ProtectedRoute userRole={userRole} requiredPermission="employees.view_workspace"><EmployeeList /></ProtectedRoute>} />
              <Route path="/ats" element={<ProtectedRoute userRole={userRole} requiredPermission="ats.view_workspace"><ATS /></ProtectedRoute>} />
              <Route path="/e-dossier" element={<ProtectedRoute userRole={userRole} requiredPermission="dossier.view_workspace"><EDossier /></ProtectedRoute>} />
              <Route path="/locations" element={<ProtectedRoute userRole={userRole} requiredPermission="locations.manage_company"><Locations /></ProtectedRoute>} />
              
              {/* ⚙️ SÜPER ADMİN ROTALARI */}
              <Route path="/settings" element={<ProtectedRoute userRole={userRole} requiredPermission="company.settings.manage"><CompanySettings /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute userRole={userRole} requiredPermission="billing.manage_company"><Billing /></ProtectedRoute>} />
              <Route path="/executive-console" element={<Navigate to="/executive-console/overview" replace />} />
              <Route path="/executive-console/overview" element={<ProtectedRoute userRole={userRole} requiredPermission="executive.view_platform"><ExecutiveConsole /></ProtectedRoute>} />
              <Route path="/executive-console/revenue" element={<ProtectedRoute userRole={userRole} requiredPermission="executive.view_platform"><ExecutiveConsole /></ProtectedRoute>} />
              <Route path="/executive-console/companies" element={<ProtectedRoute userRole={userRole} requiredPermission="executive.view_platform"><ExecutiveConsole /></ProtectedRoute>} />
              <Route path="/executive-console/risks" element={<ProtectedRoute userRole={userRole} requiredPermission="executive.view_platform"><ExecutiveConsole /></ProtectedRoute>} />
              <Route path="/executive-console/messages" element={<ProtectedRoute userRole={userRole} requiredPermission="executive.view_platform"><ExecutiveConsole /></ProtectedRoute>} />
              <Route path="/account-security" element={<ProtectedRoute userRole={userRole} requiredPermission="account.manage_self"><AccountSecurity /></ProtectedRoute>} />
              <Route path="/onboarding" element={<ProtectedRoute userRole={userRole} requiredPermission="lifecycle.manage_company"><Onboarding /></ProtectedRoute>} />
              {/* 🔄 DİNAMİK ROTALAR (Aynı URL, Role Göre Farklı Ekran) */}
              {/* 🔥 ZIRH EKLENDİ: Artık personeller HR sayfalarını göremez! */}
              <Route path="/attendance" element={<ProtectedRoute userRole={userRole} requiredPermission="attendance.view_workspace">{isEmployee ? <EmployeeAttendance /> : <AttendanceList />}</ProtectedRoute>} />
              <Route path="/leaves" element={<ProtectedRoute userRole={userRole} requiredPermission="leaves.view_workspace">{isEmployee ? <EmployeeLeave /> : <LeaveManagement />}</ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute userRole={userRole} requiredPermission="expenses.view_workspace">{isEmployee ? <EmployeeExpense /> : <ExpenseManagement />}</ProtectedRoute>} />
              <Route path="/purchase-requests" element={<ProtectedRoute userRole={userRole} requiredPermission="purchase_requests.view_workspace"><PurchaseRequestManagement /></ProtectedRoute>} />
              <Route path="/request-forms" element={<ProtectedRoute userRole={userRole} requiredPermission="generic_requests.view_workspace"><GenericRequestManagement /></ProtectedRoute>} />
              <Route path="/knowledge-base" element={<ProtectedRoute userRole={userRole} requiredPermission="knowledge.view_workspace"><KnowledgeBase /></ProtectedRoute>} />
              <Route path="/kpi-statistics" element={<ProtectedRoute userRole={userRole} requiredPermission="kpi.view_company"><KpiStatistics /></ProtectedRoute>} />
              <Route path="/my-expenses" element={<ProtectedRoute userRole={userRole} requiredPermission="expenses.view_self_only"><EmployeeExpense /></ProtectedRoute>} />
              <Route path="/performance" element={<ProtectedRoute userRole={userRole} requiredPermission="performance.view_workspace">{isEmployee ? <EmployeePerformance /> : <PerformanceManagement />}</ProtectedRoute>} />
              <Route path="/training" element={<ProtectedRoute userRole={userRole} requiredPermission="training.view_workspace">{isEmployee ? <EmployeeTraining /> : <Training />}</ProtectedRoute>} />
              <Route path="/assets" element={<ProtectedRoute userRole={userRole} requiredPermission="assets.view_workspace">{isEmployee ? <EmployeeAsset /> : <AssetList />}</ProtectedRoute>} />

              {/* 🌍 HERKESE AÇIK ORTAK ROTALAR (Zırhlandı) */}
              <Route path="/org-chart" element={<ProtectedRoute userRole={userRole} requiredPermission="org_chart.view_workspace"><OrgChart /></ProtectedRoute>} />
              <Route path="/support-center" element={<ProtectedRoute userRole={userRole} requiredPermission="support.contact_vendor"><SupportCenter /></ProtectedRoute>} />

              {/* 🛑 404 GÜVENLİK YAKALAYICISI */}
              <Route path="*" element={<Navigate to={getDefaultAuthorizedRoute(userRole, planCode)} replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;

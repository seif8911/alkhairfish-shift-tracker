import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CodeEntry from './components/Auth/CodeEntry';
import AdminLogin from './components/Auth/AdminLogin';
import EmployeeDashboard from './components/Dashboard/EmployeeDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import { useAuth } from './hooks/useAuth';
import { useInactivity } from './hooks/useInactivity';
import { Employee, AdminUser } from './types';

function App() {
  const { t, i18n } = useTranslation();
  const { 
    isAuthenticated, 
    isAdmin, 
    user, 
    loading, 
    error, 
    login, 
    adminLogin, 
    logout 
  } = useAuth();

  // Set up inactivity detection (1 minute timeout)
  const { resetInactivityTimer } = useInactivity(1, logout);

  // Reset inactivity timer on initial render
  useEffect(() => {
    if (isAuthenticated) {
      resetInactivityTimer();
    }
  }, [isAuthenticated, resetInactivityTimer]);

  // Set initial direction based on language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Handle employee code entry
  const handleCodeSubmit = (code: string) => {
    login(code);
  };

  // Handle admin login
  const handleAdminLogin = (username: string, password: string) => {
    adminLogin(username, password);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Home route (Employee Code Entry) */}
        <Route 
          path="/" 
          element={
            isAuthenticated && !isAdmin ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <CodeEntry 
                onSubmit={handleCodeSubmit} 
                loading={loading} 
                error={error} 
              />
            )
          } 
        />
        
        {/* Admin Login route */}
        <Route 
          path="/admin" 
          element={
            isAuthenticated && isAdmin ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <AdminLogin 
                onSubmit={handleAdminLogin} 
                loading={loading} 
                error={error} 
              />
            )
          } 
        />
        
        {/* Employee Dashboard route */}
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated && !isAdmin ? (
              <EmployeeDashboard 
                employee={user as Employee} 
                onLogout={logout} 
              />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        
        {/* Admin Dashboard route */}
        <Route 
          path="/admin/dashboard" 
          element={
            isAuthenticated && isAdmin ? (
              <AdminDashboard 
                admin={user as AdminUser} 
                onLogout={logout} 
              />
            ) : (
              <Navigate to="/admin" replace />
            )
          } 
        />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
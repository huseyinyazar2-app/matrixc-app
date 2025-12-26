
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Customers } from './pages/Customers';
import { POS } from './pages/POS';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Shipping } from './pages/Shipping';
import { Returns } from './pages/Returns'; 
import { Collections } from './pages/Collections'; 
import { Costs } from './pages/Costs'; 
import { ActivityLogs } from './pages/ActivityLogs'; // Added
import { Login } from './pages/Login';
import { UserRole } from './types';

const AppContent: React.FC = () => {
  const { currentUser } = useStore();

  if (!currentUser) {
    return <Login />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-slate-900 font-sans">
        <Navbar />
        <main className="pb-20 sm:pb-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/shipping" element={<Shipping />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/reports" element={<Reports />} />
            {/* Admin Guard */}
            <Route 
              path="/settings" 
              element={
                currentUser.role === UserRole.ADMIN 
                  ? <Settings /> 
                  : <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/costs" 
              element={
                currentUser.role === UserRole.ADMIN 
                  ? <Costs /> 
                  : <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/activity-logs" 
              element={
                currentUser.role === UserRole.ADMIN 
                  ? <ActivityLogs /> 
                  : <Navigate to="/" replace />
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;

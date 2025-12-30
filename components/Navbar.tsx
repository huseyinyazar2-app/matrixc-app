
import React, { useState, useEffect } from 'react';
import { Package, LayoutDashboard, Users, BarChart3, LogOut, Download, Settings as SettingsIcon, Truck, RotateCcw, Banknote, Calculator, FileText, CheckSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { currentUser, logout } = useStore();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      setDeferredPrompt(null);
      setIsInstallable(false);
    });
  };

  const allNavItems = [
    { path: '/', label: 'Panel', icon: <LayoutDashboard size={20} /> },
    { path: '/tasks', label: 'Görevler', icon: <CheckSquare size={20} /> }, // Yeni menü
    { path: '/products', label: 'Ürünler', icon: <Package size={20} /> },
    { path: '/customers', label: 'Müşteriler', icon: <Users size={20} /> },
    { path: '/reports', label: 'Satışlar', icon: <BarChart3 size={20} /> },
    { path: '/shipping', label: 'Kargo', icon: <Truck size={20} /> },
    { path: '/returns', label: 'İadeler', icon: <RotateCcw size={20} /> },
    { path: '/collections', label: 'Tahsilat', icon: <Banknote size={20} /> },
    { path: '/costs', label: 'Maliyet', icon: <Calculator size={20} />, roles: [UserRole.ADMIN] },
    { path: '/activity-logs', label: 'Kayıtlar', icon: <FileText size={20} />, roles: [UserRole.ADMIN] },
    { path: '/settings', label: 'Ayarlar', icon: <SettingsIcon size={20} />, roles: [UserRole.ADMIN] },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.roles) {
      return currentUser && item.roles.includes(currentUser.role);
    }
    return true;
  });

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center text-primary font-bold text-xl">
              MatrixC<span className="text-slate-800">App</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full ${
                    location.pathname === item.path
                      ? 'border-primary text-slate-900'
                      : 'border-transparent text-slate-500 hover:border-gray-300 hover:text-slate-700'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
             {isInstallable && (
                <button
                  onClick={handleInstallClick}
                  className="hidden md:flex items-center bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                >
                  <Download size={16} className="mr-1.5" /> Yükle
                </button>
             )}

             <div className="flex-shrink-0 flex items-center border-l pl-4 ml-2">
                <div className="text-right mr-3 hidden md:block">
                  <div className="text-xs text-gray-400">Giriş Yapan</div>
                  <div className="text-sm font-bold text-gray-700">{currentUser?.name}</div>
                </div>
                <button 
                  onClick={logout}
                  className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <LogOut size={20} />
                </button>
             </div>
          </div>
        </div>
      </div>
      {/* Mobile Bottom Navigation - Scrollable */}
      <div className="sm:hidden border-t border-gray-200 bg-gray-50 fixed bottom-0 w-full z-50 pb-safe overflow-x-auto no-scrollbar">
         <div className="flex px-2 min-w-max">
            {navItems.map((item) => (
                <Link key={item.path} to={item.path} className={`flex flex-col items-center p-3 min-w-[70px] ${location.pathname === item.path ? 'text-primary' : 'text-gray-500'}`}>
                {item.icon}
                <span className="text-[10px] mt-1 font-medium whitespace-nowrap">{item.label}</span>
                </Link>
            ))}
         </div>
      </div>
    </nav>
  );
};

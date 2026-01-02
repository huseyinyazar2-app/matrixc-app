
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { LogIn, Lock, User } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, appVersion } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    if (!success) {
      setError('Kullanıcı adı veya şifre hatalı.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full flex flex-col">
        {/* NEW: Modern Gradient Background */}
        <div className="bg-gradient-to-br from-indigo-900 via-blue-800 to-purple-900 p-10 text-center relative overflow-hidden">
           {/* Decorative Circle */}
           <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
           <div className="absolute bottom-[-30px] right-[-30px] w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
           
           <h1 className="text-3xl font-black text-white mb-2 flex items-center justify-center relative z-10 tracking-tight">
             MatrixC<span className="text-blue-300 font-light">App</span>
             <span className="ml-2 text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full border border-white/10">{appVersion || 'v?'}</span>
           </h1>
           <p className="text-blue-100 text-sm font-medium relative z-10">Personel & Yönetim Paneli</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100 font-bold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kullanıcı Adı</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  required
                  className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Kullanıcı Adı"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  required
                  className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center justify-center transform active:scale-95"
            >
              <LogIn size={20} className="mr-2" />
              Güvenli Giriş Yap
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

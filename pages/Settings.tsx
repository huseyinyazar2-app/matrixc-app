
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Plus, Trash2, Save, Tag, Layers, Users, Globe, Truck, MapPin, UserPlus, Lock, User, ShieldCheck } from 'lucide-react';
import { UserRole } from '../types';

export const Settings: React.FC = () => {
  const { settings, updateSettings, addUser, users, deleteUser, currentUser } = useStore();
  
  const [categories, setCategories] = useState<string[]>(settings.productCategories);
  const [variants, setVariants] = useState<string[]>(settings.variantOptions);
  const [customerTypes, setCustomerTypes] = useState<string[]>(settings.customerTypes || []);
  const [salesChannels, setSalesChannels] = useState<string[]>(settings.salesChannels || []);
  const [deliveryTypes, setDeliveryTypes] = useState<string[]>(settings.deliveryTypes || []);
  const [shippingCompanies, setShippingCompanies] = useState<string[]>(settings.shippingCompanies || []);
  
  // New Item States
  const [newCategory, setNewCategory] = useState('');
  const [newVariant, setNewVariant] = useState('');
  const [newCustomerType, setNewCustomerType] = useState('');
  const [newSalesChannel, setNewSalesChannel] = useState('');
  const [newDeliveryType, setNewDeliveryType] = useState('');
  const [newShippingCompany, setNewShippingCompany] = useState('');
  
  // New User States
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = () => {
    updateSettings({
      productCategories: categories,
      variantOptions: variants,
      customerTypes: customerTypes,
      salesChannels: salesChannels,
      deliveryTypes: deliveryTypes,
      shippingCompanies: shippingCompanies
    });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleAddUser = async () => {
    if (!newUsername || !newPassword) {
      alert('Lütfen kullanıcı adı ve şifre giriniz.');
      return;
    }
    // Check if user exists
    if (users.some(u => u.username === newUsername)) {
      alert('Bu kullanıcı adı zaten kullanılıyor.');
      return;
    }

    await addUser({
      id: Math.random().toString(36).substr(2, 9),
      username: newUsername,
      password: newPassword,
      name: newUsername, // Display name same as username for simplicity per request
      role: UserRole.PERSONNEL // Fixed role as requested
    });

    setNewUsername('');
    setNewPassword('');
    alert('Yeni personel kullanıcısı başarıyla oluşturuldu.');
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
        if (id === currentUser?.id) {
            alert('Kendinizi silemezsiniz!');
            return;
        }
        await deleteUser(id);
    }
  };

  const addItem = (type: 'cat' | 'var' | 'cust' | 'chan' | 'deliv' | 'ship') => {
    if (type === 'cat' && newCategory.trim()) {
      if (!categories.includes(newCategory.trim())) {
        setCategories([...categories, newCategory.trim()]);
        setNewCategory('');
      }
    } else if (type === 'var' && newVariant.trim()) {
      if (!variants.includes(newVariant.trim())) {
        setVariants([...variants, newVariant.trim()]);
        setNewVariant('');
      }
    } else if (type === 'cust' && newCustomerType.trim()) {
      if (!customerTypes.includes(newCustomerType.trim())) {
        setCustomerTypes([...customerTypes, newCustomerType.trim()]);
        setNewCustomerType('');
      }
    } else if (type === 'chan' && newSalesChannel.trim()) {
      if (!salesChannels.includes(newSalesChannel.trim())) {
        setSalesChannels([...salesChannels, newSalesChannel.trim()]);
        setNewSalesChannel('');
      }
    } else if (type === 'deliv' && newDeliveryType.trim()) {
      if (!deliveryTypes.includes(newDeliveryType.trim())) {
        setDeliveryTypes([...deliveryTypes, newDeliveryType.trim()]);
        setNewDeliveryType('');
      }
    } else if (type === 'ship' && newShippingCompany.trim()) {
      if (!shippingCompanies.includes(newShippingCompany.trim())) {
        setShippingCompanies([...shippingCompanies, newShippingCompany.trim()]);
        setNewShippingCompany('');
      }
    }
  };

  const removeItem = (type: 'cat' | 'var' | 'cust' | 'chan' | 'deliv' | 'ship', index: number) => {
    if (type === 'cat') setCategories(categories.filter((_, i) => i !== index));
    if (type === 'var') setVariants(variants.filter((_, i) => i !== index));
    if (type === 'cust') setCustomerTypes(customerTypes.filter((_, i) => i !== index));
    if (type === 'chan') setSalesChannels(salesChannels.filter((_, i) => i !== index));
    if (type === 'deliv') setDeliveryTypes(deliveryTypes.filter((_, i) => i !== index));
    if (type === 'ship') setShippingCompanies(shippingCompanies.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 mb-20">
      <div className="flex flex-col items-end gap-2">
        <div className="flex justify-between items-center w-full">
          <h1 className="text-2xl font-bold text-slate-800">Sistem Ayarları</h1>
          <button 
            onClick={handleSave}
            className="bg-primary text-white px-6 py-2 rounded-lg font-bold flex items-center hover:bg-indigo-700 transition-colors shadow-lg"
          >
            <Save size={20} className="mr-2" /> Değişiklikleri Kaydet
          </button>
        </div>
        {showSuccess && (
          <p className="text-success font-bold text-sm animate-bounce">Değişiklikler kaydedilmiştir</p>
        )}
      </div>

      {/* USER MANAGEMENT SECTION */}
      <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 shadow-sm">
         <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <UserPlus size={20} className="mr-2 text-indigo-600" /> Personel Yönetimi
         </h2>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Add User Form */}
            <div className="bg-white p-4 rounded-xl border border-indigo-200">
               <h3 className="text-xs font-bold text-indigo-800 uppercase mb-3">Yeni Personel Ekle</h3>
               <div className="space-y-3">
                  <div>
                     <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Kullanıcı Adı</label>
                     <div className="relative">
                        <User className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                           type="text" className="w-full pl-8 p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                           placeholder="kullaniciadi"
                           value={newUsername} onChange={e => setNewUsername(e.target.value)}
                        />
                     </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Şifre</label>
                     <div className="relative">
                        <Lock className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                           type="text" className="w-full pl-8 p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                           placeholder="******"
                           value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        />
                     </div>
                  </div>
                  <button 
                     onClick={handleAddUser}
                     className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-indigo-700"
                  >
                     Kullanıcıyı Oluştur
                  </button>
               </div>
            </div>

            {/* User List */}
            <div className="md:col-span-2">
               <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 px-1">Mevcut Kullanıcılar</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {users.map(u => (
                     <div key={u.id} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                        <div className="flex items-center">
                           <div className={`p-2 rounded-full mr-3 ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                              {u.role === UserRole.ADMIN ? <ShieldCheck size={16} /> : <User size={16} />}
                           </div>
                           <div>
                              <p className="font-bold text-sm text-slate-800">{u.username}</p>
                              <p className="text-[10px] text-gray-500 uppercase font-bold">{u.role === UserRole.ADMIN ? 'YÖNETİCİ' : 'PERSONEL'}</p>
                           </div>
                        </div>
                        {u.role !== UserRole.ADMIN && (
                           <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Kullanıcıyı Sil"
                           >
                              <Trash2 size={16} />
                           </button>
                        )}
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Ürün Grupları */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <Tag size={20} className="mr-2 text-primary" /> Ürün Grupları
          </h2>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Yeni grup adı..." value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem('cat')}
            />
            <button onClick={() => addItem('cat')} className="p-2 bg-indigo-50 text-primary rounded-lg hover:bg-indigo-100"><Plus size={20} /></button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {categories.map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg group">
                <span className="text-sm font-medium text-slate-700">{cat}</span>
                <button onClick={() => removeItem('cat', idx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Paketler / Varyantlar */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <Layers size={20} className="mr-2 text-emerald-600" /> Paketler / Varyantlar
          </h2>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Yeni paket adı..." value={newVariant}
              onChange={(e) => setNewVariant(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem('var')}
            />
            <button onClick={() => addItem('var')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><Plus size={20} /></button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {variants.map((v, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg group">
                <span className="text-sm font-medium text-slate-700">{v}</span>
                <button onClick={() => removeItem('var', idx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Müşteri Tipleri */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <Users size={20} className="mr-2 text-purple-600" /> Müşteri Tipleri
          </h2>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Bireysel, Kurumsal vb..." value={newCustomerType}
              onChange={(e) => setNewCustomerType(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem('cust')}
            />
            <button onClick={() => addItem('cust')} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"><Plus size={20} /></button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {customerTypes.map((t, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg group">
                <span className="text-sm font-medium text-slate-700">{t}</span>
                <button onClick={() => removeItem('cust', idx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Satış Kanalları */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <Globe size={20} className="mr-2 text-orange-600" /> Satış Kanalları
          </h2>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Trendyol, vb..." value={newSalesChannel}
              onChange={(e) => setNewSalesChannel(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem('chan')}
            />
            <button onClick={() => addItem('chan')} className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100"><Plus size={20} /></button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {salesChannels.map((c, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg group">
                <span className="text-sm font-medium text-slate-700">{c}</span>
                <button onClick={() => removeItem('chan', idx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Teslimat Türleri */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <MapPin size={20} className="mr-2 text-blue-600" /> Teslimat Türleri
          </h2>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Elden, Kargo vb..." value={newDeliveryType}
              onChange={(e) => setNewDeliveryType(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem('deliv')}
            />
            <button onClick={() => addItem('deliv')} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Plus size={20} /></button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {deliveryTypes.map((d, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg group">
                <span className="text-sm font-medium text-slate-700">{d}</span>
                <button onClick={() => removeItem('deliv', idx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Kargo Firmaları */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <Truck size={20} className="mr-2 text-rose-600" /> Kargo Firmaları
          </h2>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Aras, MNG vb..." value={newShippingCompany}
              onChange={(e) => setNewShippingCompany(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem('ship')}
            />
            <button onClick={() => addItem('ship')} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"><Plus size={20} /></button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {shippingCompanies.map((s, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg group">
                <span className="text-sm font-medium text-slate-700">{s}</span>
                <button onClick={() => removeItem('ship', idx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

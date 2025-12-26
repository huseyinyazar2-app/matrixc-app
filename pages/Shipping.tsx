
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Sale, Customer, UserRole } from '../types';
import { 
  Truck, Search, Filter, Package, User, MapPin, 
  CheckCircle, Clock, ExternalLink, Info, UserCheck, Calendar
} from 'lucide-react';
import { format } from 'date-fns';

export const Shipping: React.FC = () => {
  const { sales, customers, settings, updateSale, currentUser } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BEKLIYOR' | 'TESLIM_EDILDI'>('BEKLIYOR');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Form State for Modal
  const [deliveryType, setDeliveryType] = useState('');
  const [shippingCompany, setShippingCompany] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSearch = sale.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || sale.deliveryStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sales, searchTerm, statusFilter]);

  const handleOpenShipping = (sale: Sale) => {
    setSelectedSaleId(sale.id);
    setDeliveryType(sale.deliveryType || settings.deliveryTypes[0] || '');
    setShippingCompany(sale.shippingCompany || settings.shippingCompanies[0] || '');
    setTrackingNumber(sale.trackingNumber || '');
  };

  const handleSaveShipping = () => {
    const sale = sales.find(s => s.id === selectedSaleId);
    if (!sale) return;

    const updatedSale: Sale = {
      ...sale,
      deliveryStatus: 'TESLIM_EDILDI',
      deliveryType,
      shippingCompany: deliveryType === 'Kargo' ? shippingCompany : undefined,
      trackingNumber: deliveryType === 'Kargo' ? trackingNumber : undefined,
      shippingUpdatedBy: currentUser?.name || 'Bilinmiyor' // Kargo durumunu güncelleyen kişi
    };

    updateSale(updatedSale);
    setSelectedSaleId(null);
    alert('Teslimat bilgileri güncellendi.');
  };

  const selectedSale = sales.find(s => s.id === selectedSaleId);
  const selectedCustomer = customers.find(c => c.id === selectedSale?.customerId);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto mb-20">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center">
          <Truck size={24} sm:size={28} className="mr-3 text-primary" /> Teslimat & Kargo
        </h1>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-w-full">
           <button onClick={() => setStatusFilter('BEKLIYOR')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex-1 whitespace-nowrap ${statusFilter === 'BEKLIYOR' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>BEKLEYENLER</button>
           <button onClick={() => setStatusFilter('ALL')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex-1 whitespace-nowrap ${statusFilter === 'ALL' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>TÜMÜ</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" placeholder="Müşteri adına göre ara..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredSales.map(sale => (
          <div key={sale.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
             <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                   <User className="text-gray-400 mr-2" size={16} />
                   <h3 className="font-bold text-slate-900">{sale.customerName}</h3>
                </div>
                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${sale.deliveryStatus === 'TESLIM_EDILDI' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                   {sale.deliveryStatus === 'TESLIM_EDILDI' ? 'TESLİM EDİLDİ' : 'BEKLİYOR'}
                </span>
             </div>
             
             <div className="text-xs text-gray-500 mb-3 ml-6 flex flex-col gap-1">
                <span className="flex items-center"><Calendar size={12} className="mr-1"/> {format(new Date(sale.date), 'dd.MM.yyyy HH:mm')}</span>
                <span className="flex items-center font-medium text-slate-700"><Package size={12} className="mr-1"/> {sale.items.map(i => i.productName).join(', ')}</span>
                {sale.deliveryType && <span className="flex items-center font-bold text-indigo-600"><Truck size={12} className="mr-1"/> {sale.deliveryType} {sale.shippingCompany ? `- ${sale.shippingCompany}` : ''}</span>}
             </div>

             <button 
                onClick={() => handleOpenShipping(sale)}
                className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-xs uppercase flex items-center justify-center hover:bg-indigo-100"
             >
                <Truck size={16} className="mr-2" /> Teslimat Bilgisi
             </button>
          </div>
        ))}
        {filteredSales.length === 0 && <div className="text-center p-8 text-gray-400 italic">Kayıt bulunamadı.</div>}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase border-b">
              <tr>
                <th className="p-4 whitespace-nowrap">Tarih</th>
                <th className="p-4 whitespace-nowrap">Müşteri</th>
                <th className="p-4 whitespace-nowrap">İçerik</th>
                <th className="p-4 whitespace-nowrap">Teslimat Türü</th>
                <th className="p-4 text-center whitespace-nowrap">Durum</th>
                <th className="p-4 text-right whitespace-nowrap">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 whitespace-nowrap text-xs font-medium text-gray-600">
                    {format(new Date(sale.date), 'dd.MM.yyyy HH:mm')}
                    {/* Admin Görüntülemesi: Satışı yapan kişi */}
                    {currentUser?.role === UserRole.ADMIN && (
                      <div className="text-[9px] text-gray-400 mt-1 flex items-center">
                        <User size={10} className="mr-1" /> Satış: {sale.personnelName}
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-bold text-slate-800 whitespace-nowrap">{sale.customerName}</td>
                  <td className="p-4 text-xs text-gray-500 max-w-[200px] truncate">{sale.items.map(i => i.productName).join(', ')}</td>
                  <td className="p-4 text-xs font-bold text-slate-500 whitespace-nowrap">{sale.deliveryType || '-'}</td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <div className="flex flex-col items-center">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${sale.deliveryStatus === 'TESLIM_EDILDI' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {sale.deliveryStatus === 'TESLIM_EDILDI' ? 'TESLİM EDİLDİ' : 'BEKLİYOR'}
                      </span>
                      {/* Admin Görüntülemesi: Kargoyu güncelleyen kişi */}
                      {currentUser?.role === UserRole.ADMIN && sale.deliveryStatus === 'TESLIM_EDILDI' && sale.shippingUpdatedBy && (
                         <span className="text-[9px] text-gray-400 mt-1">{sale.shippingUpdatedBy}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <button 
                      onClick={() => handleOpenShipping(sale)}
                      className="p-2 bg-indigo-50 text-primary rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                      title="Teslimat Bilgilerini Düzenle"
                    >
                      <Truck size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-400 italic">Sonuç bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shipping Update Modal */}
      {selectedSaleId && selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 border-b pb-4 flex items-center uppercase tracking-tighter text-slate-800">
              <Truck className="mr-3 text-primary" /> Teslimat Kaydı Oluştur
            </h2>

            {/* Admin Info Banner */}
            {currentUser?.role === UserRole.ADMIN && (
              <div className="mb-6 p-3 bg-indigo-50 border border-indigo-100 rounded-xl grid grid-cols-2 gap-4">
                 <div className="flex items-center text-xs text-indigo-800">
                    <UserCheck size={14} className="mr-2" />
                    <span className="font-bold mr-1">Satışı Yapan:</span> {selectedSale.personnelName}
                 </div>
                 {selectedSale.shippingUpdatedBy && (
                   <div className="flex items-center text-xs text-indigo-800">
                      <Truck size={14} className="mr-2" />
                      <span className="font-bold mr-1">Son Güncelleyen:</span> {selectedSale.shippingUpdatedBy}
                   </div>
                 )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
               {/* Left: Customer & Info */}
               <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center"><User size={12} className="mr-1" /> Müşteri Bilgileri</p>
                    <p className="font-bold text-slate-900">{selectedSale.customerName}</p>
                    <p className="text-xs text-slate-600 mt-1">{selectedCustomer?.phone || 'Telefon kaydı yok'}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-400 uppercase mb-2 flex items-center"><MapPin size={12} className="mr-1" /> Teslimat Adresi</p>
                    <p className="text-xs text-blue-900 leading-relaxed font-medium">
                       {selectedCustomer?.address ? (
                         <>
                           {selectedCustomer.address} <br />
                           <span className="font-black">{selectedCustomer.district} / {selectedCustomer.city}</span>
                         </>
                       ) : 'Adres bilgisi girilmemiş.'}
                    </p>
                  </div>
               </div>

               {/* Right: Order Content */}
               <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 h-full">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 flex items-center"><Package size={12} className="mr-1" /> Sipariş İçeriği</p>
                  <div className="space-y-2">
                    {selectedSale.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 shadow-sm">
                        <span className="text-xs font-bold text-slate-700">{item.productName}</span>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-black text-slate-600">{item.quantity} ADET</span>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            <div className="bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100 space-y-5">
               <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest flex items-center">
                 <CheckCircle size={16} className="mr-2" /> Teslimat Formu
               </h3>

               <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Teslimat Türü</label>
                 <select 
                   className="w-full p-3 border border-gray-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-primary"
                   value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}
                 >
                   {settings.deliveryTypes.map(d => <option key={d} value={d}>{d}</option>)}
                 </select>
               </div>

               {deliveryType === 'Kargo' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Kargo Firması</label>
                      <select 
                        className="w-full p-3 border border-gray-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-primary"
                        value={shippingCompany} onChange={(e) => setShippingCompany(e.target.value)}
                      >
                        {settings.shippingCompanies.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Takip Numarası</label>
                      <input 
                        type="text" className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Örn: 123456789" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)}
                      />
                    </div>
                 </div>
               )}
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setSelectedSaleId(null)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase hover:bg-gray-200 transition-all">Vazgeç</button>
              <button onClick={handleSaveShipping} className="flex-1 py-4 bg-primary text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all">Bilgileri Kaydet & Tamamla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

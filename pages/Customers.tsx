
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Customer, PaymentStatus, Sale, UserRole, SaleStatus } from '../types';
import { Phone, MapPin, Wallet, Plus, History, Building, User, Search, Filter, AlertCircle, ShoppingBag, Mail, Edit, Eye, CreditCard, UserCheck, Calendar, Trash2, ArrowLeftRight, Navigation, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { trCities } from '../src/data/cities';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const Customers: React.FC = () => {
  const { customers, products, sales, addCustomer, updateCustomer, deleteCustomer, addSale, adjustCustomerBalance, currentUser, settings } = useStore();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);
  const [showSaleModal, setShowSaleModal] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saleError, setSaleError] = useState<string | null>(null);
  
  // Balance Adjustment State
  const [showBalanceAdjust, setShowBalanceAdjust] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'DEBT' | 'CREDIT'>('DEBT');
  const [adjustDesc, setAdjustDesc] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterChannel, setFilterChannel] = useState<string>('ALL');

  const [saleProductId, setSaleProductId] = useState('');
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [saleBasePrice, setSaleBasePrice] = useState(0); // List Price (Excl Tax)
  const [saleCustomerBaseUnitPrice, setSaleCustomerBaseUnitPrice] = useState(0); // Customer Price (Excl Tax)
  const [saleShippingCost, setSaleShippingCost] = useState(0);
  const [salePaymentStatus, setSalePaymentStatus] = useState<PaymentStatus>(PaymentStatus.PAID);
  const [saleDueDate, setSaleDueDate] = useState('');

  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    type: settings.customerTypes?.[0] || '',
    salesChannel: settings.salesChannels?.[0] || '',
    name: '', email: '', phone: '', city: '', district: '', address: '', description: '',
  });

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      const updated = { ...editingCustomer, ...newCustomer } as Customer;
      updateCustomer(updated);
      setEditingCustomer(null);
    } else {
      if (!newCustomer.name) { alert('Müşteri ismi zorunludur.'); return; }
      addCustomer({
        id: generateId(),
        type: newCustomer.type || '',
        salesChannel: newCustomer.salesChannel || '',
        name: newCustomer.name,
        email: newCustomer.email || '',
        phone: newCustomer.phone || '',
        city: newCustomer.city || '',
        district: newCustomer.district || '',
        address: newCustomer.address || '',
        description: newCustomer.description || '',
        currentBalance: 0,
        createdBy: currentUser?.name || 'Bilinmiyor'
      });
    }
    setShowAddModal(false);
    resetCustomerForm();
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer({ ...customer });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
      if (currentUser?.role !== UserRole.ADMIN) {
          alert("Sadece yöneticiler müşteri silebilir.");
          return;
      }
      if (window.confirm("Bu müşteriyi silmek istediğinize emin misiniz? Müşteriye ait satış kayıtları silinmez ancak müşteri bilgisi kaybolur.")) {
          deleteCustomer(id);
      }
  };

  const handleBalanceAdjustment = async () => {
      if (!showDetailModal || !adjustAmount || parseFloat(adjustAmount) <= 0) return;
      await adjustCustomerBalance(showDetailModal, parseFloat(adjustAmount), adjustType, adjustDesc);
      alert('Bakiye başarıyla güncellendi.');
      setShowBalanceAdjust(false);
      setAdjustAmount('');
      setAdjustDesc('');
  };

  const resetCustomerForm = () => {
    setNewCustomer({ 
      type: settings.customerTypes?.[0] || '',
      salesChannel: settings.salesChannels?.[0] || '',
      name: '', email: '', phone: '', city: '', district: '', address: '', description: ''
    });
    setEditingCustomer(null);
  };

  const handleCompleteSale = () => {
    setSaleError(null);
    const customer = customers.find(c => c.id === showSaleModal);
    const product = products.find(p => p.id === saleProductId);
    
    if (!customer || !product) { setSaleError('Lütfen geçerli bir ürün seçin.'); return; }
    if (saleQuantity > product.stockQuantity) { setSaleError(`Stok yetersiz. En fazla ${product.stockQuantity} adet satabilirsiniz.`); return; }
    if (salePaymentStatus === PaymentStatus.UNPAID && !saleDueDate) { setSaleError('Veresiye satışta vade tarihi zorunludur.'); return; }

    const totalAmountExclusive = saleCustomerBaseUnitPrice * saleQuantity;
    // Original Base Price Excl Tax
    const originalPriceExclusive = saleBasePrice; 

    // Calculate discount amount (Difference in total excl tax)
    const totalDifference = (saleCustomerBaseUnitPrice - saleBasePrice) * saleQuantity;

    const newSale: Sale = {
      id: generateId(),
      customerId: customer.id,
      customerName: customer.name,
      items: [{
        productId: product.id,
        productName: `${product.baseName} - ${product.variantName}`,
        quantity: saleQuantity,
        unitPrice: saleCustomerBaseUnitPrice, // Base
        originalPrice: originalPriceExclusive, // Base
        totalPrice: totalAmountExclusive // Base Total
      }],
      totalAmount: totalAmountExclusive, // Base Total
      shippingCost: saleShippingCost, 
      discountAmount: -totalDifference,
      date: new Date().toISOString(),
      paymentStatus: salePaymentStatus,
      status: SaleStatus.ACTIVE,
      dueDate: saleDueDate || undefined,
      personnelName: currentUser?.name || 'Bilinmiyor'
    };

    addSale(newSale);
    alert('Satış başarıyla gerçekleştirildi.');
    setShowSaleModal(null);
    resetSaleState();
  };

  const resetSaleState = () => {
    setSaleProductId('');
    setSaleQuantity(1);
    setSaleBasePrice(0);
    setSaleCustomerBaseUnitPrice(0);
    setSaleShippingCost(0);
    setSalePaymentStatus(PaymentStatus.PAID);
    setSaleDueDate('');
    setSaleError(null);
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || customer.phone.includes(searchTerm);
    const matchesType = filterType === 'ALL' || customer.type === filterType;
    const matchesChannel = filterChannel === 'ALL' || customer.salesChannel === filterChannel;
    return matchesSearch && matchesType && matchesChannel;
  });

  const sortedCustomers = [...filteredCustomers].reverse();

  // Sale Modal Calculations
  const productTotalBase = saleCustomerBaseUnitPrice * saleQuantity;
  const taxAmount = productTotalBase * 0.20;
  const grandTotal = productTotalBase + taxAmount + saleShippingCost;

  // Detay modalı için istatistikler
  const customerStats = useMemo(() => {
    if (!showDetailModal) return { totalPurchase: 0, lastSales: [] };
    const customerSales = sales.filter(s => s.customerId === showDetailModal).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return {
      totalPurchase: customerSales.reduce((acc, s) => acc + (s.totalAmount * 1.20) + (s.shippingCost || 0), 0),
      lastSales: customerSales
    };
  }, [showDetailModal, sales]);

  const activeProducts = useMemo(() => products.filter(p => p.isActive !== false), [products]);
  const currentProductForSale = products.find(p => p.id === saleProductId);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto mb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Müşteri Yönetimi</h1>
        <button onClick={() => { resetCustomerForm(); setShowAddModal(true); }} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 shadow-sm transition-all text-sm sm:text-base">
          <Plus size={20} className="mr-2" /> Yeni Müşteri
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="İsim veya telefon ara..." className="w-full pl-10 p-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
         <div className="relative"><select className="w-full p-3 border border-gray-300 rounded-xl text-sm bg-white outline-none" value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="ALL">Tüm Müşteri Tipleri</option>{settings.customerTypes?.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
         <div className="relative"><select className="w-full p-3 border border-gray-300 rounded-xl text-sm bg-white outline-none" value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)}><option value="ALL">Tüm Satış Kanalları</option>{settings.salesChannels?.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {sortedCustomers.map(c => (
          <div key={c.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
             <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-900 text-lg leading-tight">{c.name}</h3>
                <span className={`font-black text-lg ${c.currentBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                   {c.currentBalance.toLocaleString('tr-TR')} ₺
                </span>
             </div>
             
             <div className="flex flex-wrap gap-2 mb-3">
               <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-bold uppercase">{c.type}</span>
               <span className="text-[10px] px-2 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-100 font-bold uppercase">{c.salesChannel}</span>
             </div>

             <div className="space-y-2 mb-4 text-sm text-gray-600">
               {c.phone && <div className="flex items-center"><Phone size={14} className="mr-2 text-gray-400"/> {c.phone}</div>}
               {(c.city || c.district) && <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-400"/> {c.city}/{c.district}</div>}
             </div>

             <div className="grid grid-cols-3 gap-2">
                <button 
                   onClick={() => { setShowSaleModal(c.id); resetSaleState(); }} 
                   className="col-span-2 py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow flex items-center justify-center"
                >
                   <ShoppingBag size={16} className="mr-2" /> Satış Yap
                </button>
                <button 
                   onClick={() => setShowDetailModal(c.id)} 
                   className="py-3 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm flex items-center justify-center hover:bg-gray-200"
                >
                   <Eye size={18} />
                </button>
             </div>
             <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
               <a href={`tel:${c.phone}`} className="flex-1 text-center text-xs font-bold text-blue-600 py-1 border-r border-gray-100 flex items-center justify-center"><Phone size={12} className="mr-1"/> ARA</a>
               <button onClick={() => handleEditCustomer(c)} className="flex-1 text-center text-xs font-bold text-gray-500 py-1 flex items-center justify-center"><Edit size={12} className="mr-1"/> DÜZENLE</button>
             </div>
          </div>
        ))}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase tracking-wider">
              <tr><th className="p-4 whitespace-nowrap">Müşteri / Firma</th><th className="p-4 whitespace-nowrap">Tip</th><th className="p-4 whitespace-nowrap">Kanal</th><th className="p-4 whitespace-nowrap">Konum</th><th className="p-4 text-right whitespace-nowrap">Bakiye</th><th className="p-4 text-center whitespace-nowrap">İşlemler</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedCustomers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-slate-800 whitespace-nowrap">{c.name}</td>
                  <td className="p-4 whitespace-nowrap"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">{c.type}</span></td>
                  <td className="p-4 whitespace-nowrap"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100 uppercase">{c.salesChannel}</span></td>
                  <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{c.city || '-'}/{c.district || '-'}</td>
                  <td className={`p-4 text-right font-bold whitespace-nowrap ${c.currentBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{c.currentBalance.toLocaleString('tr-TR')} ₺</td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <div className="flex justify-center space-x-2">
                      <button onClick={() => { setShowSaleModal(c.id); resetSaleState(); }} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-1 text-[11px] font-bold uppercase tracking-tighter"><ShoppingBag size={14} /> Satış Yap</button>
                      <button onClick={() => setShowDetailModal(c.id)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all shadow-sm"><Eye size={16} /></button>
                      <button onClick={() => handleEditCustomer(c)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit size={16} /></button>
                      {currentUser?.role === UserRole.ADMIN && (<button onClick={() => handleDelete(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sil"><Trash2 size={16} /></button>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showSaleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
             <h2 className="text-xl font-bold mb-4 flex items-center border-b pb-3 text-slate-800 uppercase tracking-tighter">
              <ShoppingBag className="mr-2 text-emerald-600" /> Yeni Satış İşlemi
            </h2>
            {/* Sale modal content logic is fine as modal */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Ürün Seçiniz</label>
                  {currentProductForSale && (<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentProductForSale.stockQuantity <= currentProductForSale.lowStockThreshold ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>Mevcut Stok: {currentProductForSale.stockQuantity} Adet</span>)}
                </div>
                <select className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm outline-none focus:ring-2 focus:ring-primary" value={saleProductId}
                  onChange={(e) => {
                    const p = products.find(prod => prod.id === e.target.value);
                    setSaleProductId(e.target.value);
                    if (p) {
                      setSaleBasePrice(p.sellPrice); // Base Price
                      setSaleCustomerBaseUnitPrice(p.sellPrice); // Base Price
                    }
                  }}
                ><option value="">Ürün veya Paket Seçiniz...</option>{activeProducts.map(p => <option key={p.id} value={p.id}>{p.baseName} - {p.variantName}</option>)}</select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-tight">Liste Fiyatı (KDV Hariç)</label><div className="w-full border border-gray-200 bg-gray-50 rounded-lg p-2.5 text-sm font-bold text-slate-500">{saleBasePrice.toLocaleString('tr-TR')} ₺</div></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-tight">Müşteri Fiyatı (KDV Hariç)</label><input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" value={saleCustomerBaseUnitPrice} onChange={e => setSaleCustomerBaseUnitPrice(Number(e.target.value))} /></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Satış Adedi</label><input type="number" min="1" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" value={saleQuantity} onChange={e => setSaleQuantity(Number(e.target.value))} /></div>
              
              {/* NEW: Kargo Ücreti Girişi */}
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-200">
                  <label className="block text-xs font-bold text-orange-700 mb-1 uppercase tracking-tight flex items-center">
                      <Truck size={14} className="mr-1"/> Kargo Ücreti (Opsiyonel)
                  </label>
                  <div className="flex items-center">
                      <input 
                          type="number" min="0" 
                          className="w-full border border-orange-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" 
                          value={saleShippingCost} 
                          onChange={e => setSaleShippingCost(Number(e.target.value))} 
                          placeholder="0"
                      />
                      <span className="ml-2 font-bold text-orange-600">₺</span>
                  </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="flex justify-between items-center"><span className="text-xs text-gray-500 font-bold uppercase">Ödeme Tipi</span><div className="flex gap-2"><button onClick={() => setSalePaymentStatus(PaymentStatus.PAID)} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${salePaymentStatus === PaymentStatus.PAID ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'}`}>PEŞİN</button><button onClick={() => setSalePaymentStatus(PaymentStatus.UNPAID)} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${salePaymentStatus === PaymentStatus.UNPAID ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'}`}>VERESİYE</button></div></div>
                {salePaymentStatus === PaymentStatus.UNPAID && (<div><label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Vade Tarihi</label><input type="date" className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:ring-2 focus:ring-primary" value={saleDueDate} onChange={e => setSaleDueDate(e.target.value)} /></div>)}
              </div>
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-tight"><span>Ara Toplam (KDV Hariç):</span><span>{productTotalBase.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</span></div>
                <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-tight pb-1 border-b"><span>KDV (%20):</span><span>+ {taxAmount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</span></div>
                {saleShippingCost > 0 && (
                    <div className="flex justify-between text-[10px] text-orange-600 font-bold uppercase tracking-tight"><span>+ Kargo:</span><span>{saleShippingCost.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</span></div>
                )}
                <div className="flex justify-between items-center pt-2 font-bold text-slate-800 border-t border-slate-200"><span className="text-xs uppercase tracking-tighter">GENEL TOPLAM:</span><span className="text-2xl text-primary">{grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</span></div>
              </div>
              {saleError && (<div className="bg-red-50 text-red-600 p-2 rounded text-[10px] font-bold uppercase text-center border border-red-200 animate-pulse">{saleError}</div>)}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSaleModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-gray-200 transition-all">İptal</button>
                <button onClick={handleCompleteSale} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all">Satışı Onayla</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
             <h2 className="text-xl font-bold mb-6 pb-4 border-b border-gray-100 flex items-center uppercase tracking-tight">
              {editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Kaydı'}
            </h2>
            <form onSubmit={handleAddCustomer} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-1 md:col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Müşteri / Firma Adı *</label><input type="text" required className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary outline-none text-sm" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Müşteri Tipi</label><select className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm" value={newCustomer.type} onChange={e => setNewCustomer({...newCustomer, type: e.target.value})}>{settings.customerTypes?.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Satış Kanalı</label><select className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm" value={newCustomer.salesChannel} onChange={e => setNewCustomer({...newCustomer, salesChannel: e.target.value})}>{settings.salesChannels?.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Telefon</label><input type="tel" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">E-Posta</label><input type="email" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Şehir</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm outline-none" 
                      value={newCustomer.city} 
                      onChange={e => { setNewCustomer({ ...newCustomer, city: e.target.value, district: '' }); }}
                    >
                      <option value="">Seçiniz</option>
                      {Object.keys(trCities).map(city => <option key={city} value={city}>{city}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">İlçe</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm outline-none" 
                      value={newCustomer.district} 
                      onChange={e => setNewCustomer({...newCustomer, district: e.target.value})} 
                      disabled={!newCustomer.city}
                    >
                      <option value="">Seçiniz</option>
                      {newCustomer.city && trCities[newCustomer.city]?.map(district => <option key={district} value={district}>{district}</option>)}
                    </select>
                 </div>
                 <div className="col-span-1 md:col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Açık Adres</label><textarea rows={2} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} /></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Açıklama / Not</label><textarea rows={3} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" value={newCustomer.description} onChange={e => setNewCustomer({...newCustomer, description: e.target.value})} /></div>
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl uppercase text-xs">İptal</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg uppercase text-xs">{editingCustomer ? 'Güncelle' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && (
         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-xl font-bold uppercase tracking-tight flex items-center"><Eye className="mr-2 text-primary" /> Müşteri Finansal Analizi</h2>
                <button onClick={() => { setShowDetailModal(null); setShowBalanceAdjust(false); }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-all text-gray-500">✕</button>
             </div>
             {(() => {
               const c = customers.find(cust => cust.id === showDetailModal);
               if (!c) return null;
               return (
                 <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Müşteri / Firma Adı</p>
                            <p className="font-bold text-slate-800 text-lg leading-tight">{c.name}</p>
                            {currentUser?.role === UserRole.ADMIN && c.createdBy && (<div className="mt-2 pt-2 border-t border-gray-200 flex items-center text-xs text-indigo-600 font-bold"><UserCheck size={12} className="mr-1" /> Kaydı Açan: {c.createdBy}</div>)}
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                              <div className="flex items-center text-emerald-600 mb-1"><ShoppingBag size={14} className="mr-1" /><span className="text-[10px] font-bold uppercase">Toplam Satın Alma</span></div>
                              <p className="text-2xl font-black text-emerald-800">{customerStats.totalPurchase.toLocaleString('tr-TR')} ₺</p>
                              <p className="text-[9px] text-emerald-600 font-medium uppercase mt-1 opacity-70">Tüm Zamanlar (KDV + Kargo Dahil)</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center text-blue-600"><Wallet size={14} className="mr-1" /><span className="text-[10px] font-bold uppercase">Güncel Bakiye</span></div>
                                <button onClick={() => setShowBalanceAdjust(!showBalanceAdjust)} className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded font-bold uppercase hover:bg-blue-700 flex items-center"><ArrowLeftRight size={10} className="mr-1"/> Düzelt</button>
                              </div>
                              <p className={`text-2xl font-black ${c.currentBalance < 0 ? 'text-red-700' : 'text-blue-800'}`}>{c.currentBalance.toLocaleString('tr-TR')} ₺</p>
                              <p className="text-[9px] text-blue-600 font-medium uppercase mt-1 opacity-70">{c.currentBalance < 0 ? 'Müşteri Borcu Bulunuyor' : 'Bakiyesi Dengeli'}</p>
                            </div>
                        </div>
                        {showBalanceAdjust && (
                            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 animate-in slide-in-from-top-2">
                                <p className="text-[10px] font-bold text-indigo-800 uppercase mb-2">Manuel Bakiye Düzeltme (Dekont)</p>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <button onClick={() => setAdjustType('DEBT')} className={`flex-1 py-1 text-xs font-bold rounded ${adjustType === 'DEBT' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'}`}>BORÇLANDIR (-)</button>
                                        <button onClick={() => setAdjustType('CREDIT')} className={`flex-1 py-1 text-xs font-bold rounded ${adjustType === 'CREDIT' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>ALACAKLANDIR (+)</button>
                                    </div>
                                    <input type="number" placeholder="Tutar" className="w-full p-2 text-sm border border-indigo-200 rounded outline-none" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} />
                                    <input type="text" placeholder="Açıklama / Dekont No" className="w-full p-2 text-sm border border-indigo-200 rounded outline-none" value={adjustDesc} onChange={e => setAdjustDesc(e.target.value)} />
                                    <button onClick={handleBalanceAdjustment} className="w-full py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700">BAKİYEYİ GÜNCELLE</button>
                                </div>
                            </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 border border-gray-100 rounded-xl text-sm bg-white">
                            <p className="font-bold mb-3 text-slate-800 border-b pb-2 flex items-center"><Phone size={14} className="mr-2 text-primary" /> İletişim & Konum</p>
                            <div className="space-y-2">
                              <p className="flex items-center gap-2"><span className="text-gray-400 font-medium w-16">Telefon:</span> {c.phone || '-'}</p>
                              <p className="flex items-center gap-2"><span className="text-gray-400 font-medium w-16">E-Posta:</span> {c.email || '-'}</p>
                              <p className="flex items-center gap-2 mt-3"><MapPin size={14} className="text-primary" /> {c.city} / {c.district}</p>
                              <p className="text-xs text-gray-500 italic pl-5">{c.address || '-'}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-xs">
                            <p className="font-bold mb-2 uppercase text-yellow-700 flex items-center"><AlertCircle size={14} className="mr-1" /> Özel Notlar</p>
                            <p className="text-yellow-800 leading-relaxed italic">{c.description || 'Bu müşteri için kaydedilmiş bir not bulunmuyor.'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                       <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center uppercase"><History size={16} className="mr-2 text-gray-400" /> Son İşlem Geçmişi & Satış Sorumluları</h3>
                       <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden max-h-48 overflow-y-auto">
                          <table className="w-full text-left">
                             <thead className="bg-gray-100 text-[9px] text-gray-500 font-bold uppercase sticky top-0"><tr><th className="p-3">Tarih</th><th className="p-3">Ürün</th><th className="p-3">Toplam Tutar</th><th className="p-3 text-right">Satışı Yapan</th></tr></thead>
                             <tbody className="divide-y divide-gray-200">
                               {customerStats.lastSales.map(sale => {
                                 // Show Grand Total (Base + Tax + Shipping)
                                 const total = (sale.totalAmount * 1.20) + (sale.shippingCost || 0);
                                 return (
                                 <tr key={sale.id} className="text-xs">
                                   <td className="p-3 text-gray-600">{format(new Date(sale.date), 'dd.MM.yyyy')}</td>
                                   <td className="p-3 font-medium text-slate-800">{sale.items.length > 0 ? sale.items[0].productName : '-'}</td>
                                   <td className="p-3 font-bold text-emerald-600">{total.toLocaleString('tr-TR')} ₺</td>
                                   <td className="p-3 text-right font-medium text-indigo-600 uppercase text-[10px]">{sale.personnelName}</td>
                                 </tr>
                               )})}
                               {customerStats.lastSales.length === 0 && (<tr><td colSpan={4} className="p-4 text-center text-gray-400 text-xs italic">Henüz satış kaydı yok.</td></tr>)}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 </div>
               );
             })()}
             <div className="mt-6 flex justify-end"><button onClick={() => setShowDetailModal(null)} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-900 transition-all">Kapat</button></div>
          </div>
         </div>
      )}
    </div>
  );
};

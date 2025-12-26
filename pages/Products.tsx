
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, Customer, Sale, PaymentStatus, UserRole, SaleStatus } from '../types';
import { Plus, Edit, Search, Box, Filter, ShoppingBag, AlertCircle, Eye, EyeOff, ShieldAlert, UserCheck, Trash2, Tag, Package, Archive, Calendar, Truck, Gift, Calculator } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const Products: React.FC = () => {
  const { products, customers, addProduct, updateProduct, deleteProduct, addSale, settings, currentUser } = useStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState<string | null>(null);
  const [saleError, setSaleError] = useState<string | null>(null);
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const initialForm: Partial<Product> = { 
    baseName: settings.productCategories[0] || '', 
    variantName: settings.variantOptions[0] || '', 
    description: '', 
    sellPrice: 0, 
    stockQuantity: 0, 
    lowStockThreshold: 10,
    isActive: true
  };
  const [formData, setFormData] = useState<Partial<Product>>(initialForm);

  const [saleCustomerId, setSaleCustomerId] = useState('');
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [saleBaseUnitPrice, setSaleBaseUnitPrice] = useState(0); // KDV Hariç Birim Fiyat
  const [saleShippingCost, setSaleShippingCost] = useState(0); 
  const [salePaymentStatus, setSalePaymentStatus] = useState<PaymentStatus>(PaymentStatus.PAID);
  const [saleDueDate, setSaleDueDate] = useState('');
  
  // Gift Mode State
  const [isGiftMode, setIsGiftMode] = useState(false);
  const [giftShippingPayer, setGiftShippingPayer] = useState<'CUSTOMER' | 'COMPANY' | 'NONE'>('NONE');

  useEffect(() => {
    if (!formData.baseName && settings.productCategories.length > 0) setFormData(prev => ({ ...prev, baseName: settings.productCategories[0] }));
    if (!formData.variantName && settings.variantOptions.length > 0) setFormData(prev => ({ ...prev, variantName: settings.variantOptions[0] }));
  }, [settings]);

  // Handle gift logic changes
  useEffect(() => {
    if (isGiftMode) {
        setSaleBaseUnitPrice(0);
        if (saleShippingCost > 0 && giftShippingPayer === 'NONE') {
            setGiftShippingPayer('CUSTOMER');
        }
    } else {
        const product = products.find(p => p.id === showSaleModal);
        if (product) setSaleBaseUnitPrice(product.sellPrice);
        setGiftShippingPayer('NONE');
    }
  }, [isGiftMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct && currentUser?.role !== UserRole.ADMIN) {
      if (Number(formData.stockQuantity) < editingProduct.stockQuantity) {
        alert('Yetersiz Yetki: Personel kullanıcılar manuel olarak stok düşüremez. Sadece stok artırımı yapabilirsiniz.');
        return;
      }
    }
    if (editingProduct) {
      await updateProduct({ ...editingProduct, ...formData } as Product);
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData(initialForm);
    } else {
      const success = await addProduct({ 
        ...formData, 
        id: generateId(), 
        isActive: true,
        createdBy: currentUser?.name || 'Bilinmiyor' 
      } as Product);
      if (success) {
        setIsModalOpen(false);
        setEditingProduct(null);
        setFormData(initialForm);
      }
    }
  };

  const handleArchive = async (id: string) => {
      if (currentUser?.role !== UserRole.ADMIN) {
          alert("Sadece yöneticiler ürün silebilir (arşivleyebilir).");
          return;
      }
      if (window.confirm("Bu ürünü arşivlemek istediğinize emin misiniz? Ürün listelerde görünmeyecek ancak geçmiş raporlarda kalacaktır.")) {
          await deleteProduct(id);
      }
  };

  const handleCompleteSale = () => {
    setSaleError(null);
    const product = products.find(p => p.id === showSaleModal);
    const customer = customers.find(c => c.id === saleCustomerId);
    if (!product || !customer) { setSaleError('Lütfen bir müşteri seçiniz.'); return; }
    if (saleQuantity > product.stockQuantity) { setSaleError(`Stok miktarı yeterli değil, en fazla ${product.stockQuantity} adet satabilirsiniz.`); return; }
    if (!isGiftMode && salePaymentStatus === PaymentStatus.UNPAID && !saleDueDate) { setSaleError('Veresiye satış için vade tarihi seçilmelidir.'); return; }
    if (isGiftMode && giftShippingPayer === 'CUSTOMER' && salePaymentStatus === PaymentStatus.UNPAID && !saleDueDate) { setSaleError('Kargo borcu için vade tarihi seçilmelidir.'); return; }

    // Logic Update: saleBaseUnitPrice is ALREADY Exclusive of Tax.
    // So we just save it as is.
    const unitPriceExclusive = isGiftMode ? 0 : saleBaseUnitPrice;
    const totalAmountExclusive = unitPriceExclusive * saleQuantity;
    // Original price is also stored as Exclusive for reference
    const productOriginalPriceExclusive = product.sellPrice; 

    // Payment Logic for Gift
    let finalPaymentStatus = salePaymentStatus;
    if (isGiftMode) {
        if (giftShippingPayer === 'CUSTOMER' && saleShippingCost > 0) {
            // keep UI status
        } else {
            finalPaymentStatus = PaymentStatus.PAID; // Company pays or no cost
        }
    }

    const newSale: Sale = {
      id: generateId(),
      customerId: customer.id,
      customerName: customer.name,
      type: isGiftMode ? 'GIFT' : 'SALE',
      items: [{ 
          productId: product.id, 
          productName: `${product.baseName} - ${product.variantName}`, 
          quantity: saleQuantity, 
          unitPrice: unitPriceExclusive, 
          originalPrice: productOriginalPriceExclusive, 
          totalPrice: totalAmountExclusive 
      }],
      totalAmount: totalAmountExclusive, // Store base amount (Excl Tax)
      shippingCost: saleShippingCost, 
      shippingPayer: isGiftMode ? giftShippingPayer : undefined,
      date: new Date().toISOString(),
      paymentStatus: finalPaymentStatus,
      status: SaleStatus.ACTIVE,
      dueDate: finalPaymentStatus !== PaymentStatus.PAID ? saleDueDate : undefined,
      personnelName: currentUser?.name || 'Yönetici'
    };
    addSale(newSale);
    alert(isGiftMode ? 'Hediye çıkışı başarıyla kaydedildi.' : 'Satış başarıyla gerçekleştirildi.');
    setShowSaleModal(null);
    resetSaleState();
  };

  const resetSaleState = () => { setSaleCustomerId(''); setSaleQuantity(1); setSaleBaseUnitPrice(0); setSaleShippingCost(0); setSalePaymentStatus(PaymentStatus.PAID); setSaleDueDate(''); setSaleError(null); setIsGiftMode(false); setGiftShippingPayer('NONE'); };

  const filteredProducts = products.filter(p => {
    if (p.isArchived) return false;
    const matchesSearch = p.baseName.toLowerCase().includes(searchTerm.toLowerCase()) || p.variantName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (selectedCategory === 'ALL' || p.baseName === selectedCategory);
  });

  const selectedProductForSale = products.find(p => p.id === showSaleModal);
  
  // Calculate Totals for Modal
  const productTotalBase = isGiftMode ? 0 : (saleBaseUnitPrice * saleQuantity);
  const taxAmount = productTotalBase * 0.20;
  
  let grandTotal = productTotalBase + taxAmount + saleShippingCost;
  
  if (isGiftMode) {
      if (giftShippingPayer === 'COMPANY' || giftShippingPayer === 'NONE') grandTotal = 0;
      else if (giftShippingPayer === 'CUSTOMER') grandTotal = saleShippingCost;
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto mb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Ürün Listesi</h1>
        <button onClick={() => { setEditingProduct(null); setFormData(initialForm); setIsModalOpen(true); }} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 shadow-sm transition-all text-sm sm:text-base">
          <Plus size={20} className="mr-2" /> Yeni Ürün
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
           <input type="text" placeholder="Ürün veya paket ara..." className="w-full pl-10 p-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="relative min-w-[200px]">
           <select className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none bg-white" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="ALL">Tüm Gruplar</option>
              {settings.productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
        </div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredProducts.map(product => {
           const isPassive = product.isActive === false;
           return (
             <div key={product.id} className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative ${isPassive ? 'opacity-75 bg-gray-50' : ''}`}>
                {isPassive && <div className="absolute top-2 right-2 text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-1 rounded">PASİF</div>}
                
                <div className="flex justify-between items-start mb-3">
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{product.baseName}</span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg">{product.variantName}</h3>
                   </div>
                   <div className="text-right">
                      <p className="font-black text-xl text-slate-900">{product.sellPrice.toLocaleString('tr-TR')} ₺</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">+ KDV</p>
                   </div>
                </div>

                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                   <div className="flex items-center text-gray-600 text-xs font-bold">
                      <Package size={16} className="mr-2 text-gray-400" />
                      Stok Durumu
                   </div>
                   <span className={`text-sm font-bold ${product.stockQuantity <= product.lowStockThreshold ? 'text-red-600' : 'text-emerald-600'}`}>
                      {product.stockQuantity} Adet
                   </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <button 
                      disabled={isPassive}
                      onClick={() => { setShowSaleModal(product.id); resetSaleState(); setSaleBaseUnitPrice(product.sellPrice); }} 
                      className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center ${isPassive ? 'bg-gray-100 text-gray-400' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'}`}
                   >
                      <ShoppingBag size={18} className="mr-2" /> Satış Yap
                   </button>
                   <div className="flex gap-2">
                       <button 
                          onClick={() => { setEditingProduct(product); setFormData(product); setIsModalOpen(true); }}
                          className="flex-1 py-3 bg-white border border-gray-300 text-slate-700 rounded-xl font-bold text-sm flex items-center justify-center hover:bg-gray-50"
                       >
                          <Edit size={18} />
                       </button>
                       {currentUser?.role === UserRole.ADMIN && (
                           <button 
                              onClick={() => handleArchive(product.id)}
                              className="py-3 px-4 bg-red-50 border border-red-100 text-red-600 rounded-xl font-bold text-sm flex items-center justify-center hover:bg-red-100"
                           >
                              <Archive size={18} />
                           </button>
                       )}
                   </div>
                </div>
             </div>
           );
        })}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-[10px] font-bold uppercase border-b tracking-tight">
              <tr>
                <th className="p-4 whitespace-nowrap">Durum</th>
                <th className="p-4 whitespace-nowrap">Grup</th>
                <th className="p-4 whitespace-nowrap">Paket / Varyant</th>
                <th className="p-4 text-right whitespace-nowrap">Birim Fiyat (KDV Hariç)</th>
                <th className="p-4 text-center whitespace-nowrap">Stok</th>
                <th className="p-4 text-right whitespace-nowrap">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map(product => {
                const isPassive = product.isActive === false;
                return (
                  <tr key={product.id} className={`transition-colors ${isPassive ? 'bg-gray-50/50 opacity-60 grayscale-[0.5]' : 'hover:bg-gray-50'}`}>
                    <td className="p-4 whitespace-nowrap">
                      {isPassive ? <span className="flex items-center text-[9px] font-black text-gray-400 uppercase tracking-tighter"><EyeOff size={12} className="mr-1" /> PASİF</span> : <span className="flex items-center text-[9px] font-black text-emerald-600 uppercase tracking-tighter"><Eye size={12} className="mr-1" /> AKTİF</span>}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isPassive ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>{product.baseName}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-800 whitespace-nowrap">{product.variantName}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                        <span className="font-black text-slate-900">{product.sellPrice.toLocaleString('tr-TR')} ₺</span>
                        <span className="text-[9px] text-gray-400 ml-1 font-bold">+KDV</span>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isPassive ? 'bg-gray-200 text-gray-500' : product.stockQuantity <= product.lowStockThreshold ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{product.stockQuantity} Adet</span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <button disabled={isPassive} onClick={() => { setShowSaleModal(product.id); resetSaleState(); setSaleBaseUnitPrice(product.sellPrice); }} className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold uppercase ${isPassive ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white shadow-sm'}`}><ShoppingBag size={14} /> Satış Yap</button>
                        <button onClick={() => { setEditingProduct(product); setFormData(product); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18} /></button>
                        {currentUser?.role === UserRole.ADMIN && (<button onClick={() => handleArchive(product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Arşivle / Sil"><Archive size={18} /></button>)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SALES MODAL */}
      {showSaleModal && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
                <h2 className="text-xl font-bold mb-4 flex items-center border-b pb-3 text-slate-800 uppercase tracking-tighter">
                {isGiftMode ? <Gift className="mr-2 text-pink-600" /> : <ShoppingBag className="mr-2 text-emerald-600" />} 
                {isGiftMode ? 'Hediye / Test Ürün Çıkışı' : 'Satış Detayları'}
                </h2>
                
                <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-start mb-1">
                        <div>
                        <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">Seçili Ürün</div>
                        <div className="font-bold text-slate-900">{selectedProductForSale?.baseName} - {selectedProductForSale?.variantName}</div>
                        </div>
                        <div className="text-right">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedProductForSale!.stockQuantity <= selectedProductForSale!.lowStockThreshold ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>Stok Adedi: {selectedProductForSale?.stockQuantity}</span>
                        </div>
                    </div>
                    <div className="text-gray-400 font-bold text-sm mt-1">Liste Birim Fiyatı (KDV Hariç): {selectedProductForSale?.sellPrice.toLocaleString('tr-TR')} ₺</div>
                </div>

                {/* Gift Mode Toggle */}
                <div className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors mb-4 ${isGiftMode ? 'bg-pink-100 border-pink-300' : 'bg-gray-50 border-gray-200'}`} onClick={() => setIsGiftMode(!isGiftMode)}>
                    <div className="flex items-center">
                        <div className={`p-2 rounded-full mr-3 ${isGiftMode ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            <Gift size={20} />
                        </div>
                        <div>
                            <p className={`text-sm font-bold ${isGiftMode ? 'text-pink-800' : 'text-gray-600'}`}>Hediye / Bedelsiz Çıkış</p>
                            <p className="text-[10px] text-gray-500">Ürün fiyatı 0 TL olur, stoktan düşer.</p>
                        </div>
                    </div>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isGiftMode ? 'bg-pink-500' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${isGiftMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Müşteri Seçin</label>
                        <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-primary outline-none" value={saleCustomerId} onChange={e => setSaleCustomerId(e.target.value)}>
                        <option value="">Listeden Seçiniz...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-tight">Satış adedi</label>
                        <input type="number" min="1" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" value={saleQuantity} onChange={e => setSaleQuantity(Number(e.target.value))} />
                        </div>
                        {!isGiftMode && (
                            <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-tight">Birim Fiyat (KDV Hariç)</label>
                            <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" value={saleBaseUnitPrice} onChange={e => setSaleBaseUnitPrice(Number(e.target.value))} />
                            </div>
                        )}
                        {isGiftMode && (
                             <div className="flex items-center justify-center bg-pink-50 border border-pink-200 rounded-lg">
                                 <span className="text-pink-600 font-black text-sm uppercase">BEDELSİZ</span>
                             </div>
                        )}
                    </div>

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
                        {isGiftMode && saleShippingCost > 0 && (
                            <div className="mt-2 pt-2 border-t border-orange-200">
                                <label className="block text-[10px] font-bold text-orange-600 mb-1 uppercase">Kargoyu Kim Ödeyecek?</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setGiftShippingPayer('CUSTOMER')} className={`flex-1 text-[10px] py-1 rounded border ${giftShippingPayer === 'CUSTOMER' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-300'}`}>ALICI (BORÇ)</button>
                                    <button onClick={() => setGiftShippingPayer('COMPANY')} className={`flex-1 text-[10px] py-1 rounded border ${giftShippingPayer === 'COMPANY' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-300'}`}>BİZ (GİDER)</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight">Ödeme Tipi</label>
                            <div className="flex gap-2">
                                <button onClick={() => setSalePaymentStatus(PaymentStatus.PAID)} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${salePaymentStatus === PaymentStatus.PAID ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{isGiftMode ? 'KARGO PEŞİN' : 'PEŞİN'}</button>
                                <button onClick={() => setSalePaymentStatus(PaymentStatus.UNPAID)} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${salePaymentStatus === PaymentStatus.UNPAID ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{isGiftMode ? 'KARGO BORÇ' : 'VERESİYE'}</button>
                            </div>
                        </div>
                        
                        {salePaymentStatus === PaymentStatus.UNPAID && (
                            <div className="mt-2 animate-in slide-in-from-top-1">
                                <label className="block text-[10px] font-bold text-red-500 uppercase mb-1 flex items-center"><Calendar size={12} className="mr-1"/> Vade Tarihi</label>
                                <input type="date" className="w-full border border-red-200 bg-white rounded p-2 text-sm outline-none focus:ring-2 focus:ring-red-500" value={saleDueDate} onChange={e => setSaleDueDate(e.target.value)} />
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-200">
                        <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                        <span>Ara Toplam (KDV Hariç):</span>
                        <span>{productTotalBase.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</span>
                        </div>
                        {!isGiftMode && (
                            <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                            <span>KDV (%20):</span>
                            <span>{taxAmount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</span>
                            </div>
                        )}
                        {saleShippingCost > 0 && (
                             <div className="flex justify-between text-[10px] text-orange-600 font-bold uppercase tracking-tight">
                             <span>+ Kargo Ücreti:</span>
                             <span>{saleShippingCost.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</span>
                             </div>
                        )}
                        <div className="flex justify-between items-center pt-2 font-bold text-slate-800 border-t border-gray-200">
                        <span className="text-xs uppercase tracking-tighter">GENEL TOPLAM (MÜŞTERİ):</span>
                        <span className={`text-2xl ${isGiftMode ? 'text-pink-600' : 'text-primary'}`}>{grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</span>
                        </div>
                    </div>

                    {saleError && (<div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-start gap-2 border border-red-200"><AlertCircle size={20} className="flex-shrink-0" /><p className="text-xs font-bold leading-relaxed uppercase">{saleError}</p></div>)}

                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowSaleModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all hover:bg-gray-200">İptal</button>
                        <button onClick={handleCompleteSale} className={`flex-1 py-3 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all ${isGiftMode ? 'bg-pink-600 hover:bg-pink-700 shadow-pink-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}>
                           {isGiftMode ? 'Hediye Çıkışı Yap' : 'Satışı Onayla'}
                        </button>
                    </div>
                </div>
            </div>
         </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
             <h2 className="text-xl font-bold mb-6 border-b pb-4 flex items-center"><Box className="mr-2 text-primary" /> {editingProduct ? 'Ürün Detaylarını Düzenle' : 'Yeni Ürün Kaydı'}</h2>
             <form onSubmit={handleSubmit} className="space-y-5">
                {currentUser?.role === UserRole.ADMIN && editingProduct?.createdBy && (<div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center text-xs text-indigo-700 font-bold"><UserCheck size={14} className="mr-2" /> Ekleyen Personel: {editingProduct.createdBy}</div>)}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Ürün Grubu</label>
                  <select required className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.baseName} onChange={e => setFormData({...formData, baseName: e.target.value})}>{settings.productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Paket / Varyant</label>
                  <select required className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.variantName} onChange={e => setFormData({...formData, variantName: e.target.value})}>{settings.variantOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-tighter">Birim Fiyat (KDV Hariç) ₺</label>
                    <input type="number" step="0.01" required className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.sellPrice} onChange={e => setFormData({...formData, sellPrice: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-tighter">Mevcut Stok</label>
                    <input type="number" required className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.stockQuantity} onChange={e => setFormData({...formData, stockQuantity: Number(e.target.value)})} />
                    {editingProduct && currentUser?.role !== UserRole.ADMIN && (<p className="text-[9px] text-orange-600 font-bold mt-1 uppercase flex items-center"><ShieldAlert size={10} className="mr-1" /> Sadece stok artırımı yapabilirsiniz</p>)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center">
                  <div><p className="text-xs font-bold text-slate-700 uppercase">Satış Durumu</p><p className="text-[10px] text-gray-500">Bu ürün listede aktif görünsün mü?</p></div>
                  <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div></label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-xs uppercase text-gray-600 hover:bg-gray-200">İptal</button>
                  <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">Değişiklikleri Kaydet</button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

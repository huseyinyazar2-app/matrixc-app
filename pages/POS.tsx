
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, CustomerType, PaymentStatus, Sale, SaleStatus } from '../types';
import { Search, Plus, Minus, Trash2, CheckCircle, ShoppingCart, Package, Gift, Truck } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const POS: React.FC = () => {
  const { products, customers, addSale, currentUser, cart, addToCart, removeFromCart, updateCartQuantity, clearCart } = useStore();
  
  // State
  const [activeTab, setActiveTab] = useState<'QUICK' | 'CORPORATE'>('QUICK');
  const [quickSaleType, setQuickSaleType] = useState<'GUEST' | 'REGISTERED'>('GUEST'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [paymentType, setPaymentType] = useState<PaymentStatus>(PaymentStatus.PAID);
  
  // Shipping & Gift Mode
  const [isGiftMode, setIsGiftMode] = useState(false);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [giftShippingPayer, setGiftShippingPayer] = useState<'CUSTOMER' | 'COMPANY' | 'NONE'>('NONE');

  // Filtered Products (Hide archived)
  const filteredProducts = products.filter(p => 
    (p.isActive !== false && !p.isArchived) && (
      p.baseName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.variantName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const corporateCustomers = customers.filter(c => c.type === CustomerType.CORPORATE);
  const individualCustomers = customers.filter(c => c.type === CustomerType.INDIVIDUAL);

  useEffect(() => {
    setSelectedCustomerId('');
    setQuickSaleType('GUEST');
    setPaymentType(PaymentStatus.PAID);
    setShippingCost(0);
    setGiftShippingPayer('NONE');
  }, [activeTab]);

  // Handle gift shipping logic on toggle
  useEffect(() => {
      if (isGiftMode) {
          if (shippingCost > 0 && giftShippingPayer === 'NONE') {
              setGiftShippingPayer('CUSTOMER'); // Default to customer if cost added
          }
      } else {
          setGiftShippingPayer('NONE');
      }
  }, [isGiftMode, shippingCost]);

  // --- CALCULATION LOGIC UPDATE ---
  // sellPrice is now BASE PRICE (Excl Tax)
  const rawProductsTotalBase = cart.reduce((acc, item) => acc + (item.sellPrice * item.cartQuantity), 0);
  const productsTotalBase = isGiftMode ? 0 : rawProductsTotalBase;
  
  const taxAmount = productsTotalBase * 0.20;
  
  // Final Total Display Logic (Base + Tax + Shipping)
  let displayTotal = productsTotalBase + taxAmount + shippingCost;
  
  if (isGiftMode) {
      if (giftShippingPayer === 'COMPANY' || giftShippingPayer === 'NONE') {
          displayTotal = 0; // Customer pays nothing
      } else if (giftShippingPayer === 'CUSTOMER') {
          displayTotal = shippingCost; // Customer pays only shipping
      }
  }

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    if (activeTab === 'CORPORATE' && !selectedCustomerId) {
      alert("Lütfen bir kurumsal müşteri seçin!");
      return;
    }
    if (activeTab === 'CORPORATE' && paymentType === PaymentStatus.UNPAID && !dueDate && !isGiftMode) {
       alert("Veresiye satışlarda vade tarihi girilmelidir!");
       return;
    }
    if (activeTab === 'QUICK' && quickSaleType === 'REGISTERED' && !selectedCustomerId) {
      alert("Lütfen listeden bir bireysel müşteri seçin veya 'Misafir' seçeneğini kullanın.");
      return;
    }

    const lowStockItems = cart.filter(item => item.cartQuantity > item.stockQuantity);
    if (lowStockItems.length > 0) {
        const confirmStock = window.confirm(
            `UYARI: Aşağıdaki ürünlerde stok yetersiz. Yine de satış yapılsın mı?\n\n` + 
            lowStockItems.map(i => `- ${i.baseName} (${i.variantName}): Stok ${i.stockQuantity}, Satılan ${i.cartQuantity}`).join('\n')
        );
        if (!confirmStock) return;
    }

    let finalCustomerId: string | null = null;
    let finalCustomerName = '';

    if (activeTab === 'CORPORATE') {
       const customer = customers.find(c => c.id === selectedCustomerId);
       finalCustomerId = selectedCustomerId;
       finalCustomerName = customer?.name || 'Bilinmiyor';
    } else {
       if (quickSaleType === 'REGISTERED') {
         const customer = customers.find(c => c.id === selectedCustomerId);
         finalCustomerId = selectedCustomerId;
         finalCustomerName = customer?.name || 'Bireysel Müşteri';
       } else {
         finalCustomerId = null;
         finalCustomerName = 'Hızlı Satış (Misafir)';
       }
    }

    // Determine Final Payment Status for Gift
    let finalPaymentStatus = paymentType;
    if (isGiftMode) {
        if (giftShippingPayer === 'CUSTOMER' && shippingCost > 0) {
            finalPaymentStatus = paymentType;
        } else {
            finalPaymentStatus = PaymentStatus.PAID;
        }
    } else {
        if (activeTab === 'QUICK' && quickSaleType === 'GUEST') finalPaymentStatus = PaymentStatus.PAID;
    }

    const newSale: Sale = {
      id: generateId(),
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      type: isGiftMode ? 'GIFT' : 'SALE',
      items: cart.map(item => ({
        productId: item.id,
        productName: `${item.baseName} - ${item.variantName}`,
        quantity: item.cartQuantity,
        unitPrice: isGiftMode ? 0 : item.sellPrice, // Base Price
        originalPrice: item.sellPrice, // Base Price
        totalPrice: isGiftMode ? 0 : (item.sellPrice * item.cartQuantity) // Base Total
      })),
      totalAmount: productsTotalBase, // Total Base Price
      shippingCost: shippingCost,
      shippingPayer: isGiftMode ? giftShippingPayer : undefined,
      date: new Date().toISOString(),
      paymentStatus: finalPaymentStatus,
      status: SaleStatus.ACTIVE,
      dueDate: (finalPaymentStatus !== PaymentStatus.PAID) ? dueDate : undefined,
      personnelName: currentUser?.name || 'Bilinmiyor'
    };

    addSale(newSale);
    alert(isGiftMode ? "Hediye/Test ürün çıkışı kaydedildi!" : "Satış başarıyla tamamlandı!");
    clearCart();
    setPaymentType(PaymentStatus.PAID);
    setDueDate('');
    setSelectedCustomerId('');
    setQuickSaleType('GUEST');
    setIsGiftMode(false);
    setShippingCost(0);
    setGiftShippingPayer('NONE');
  };

  const getProductVisuals = (name: string) => {
    switch(name) {
      case 'Booster': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-100' };
      case 'Deodizer Duo': return { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', iconBg: 'bg-teal-100' };
      case 'Health Detect': return { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', iconBg: 'bg-pink-100' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', iconBg: 'bg-gray-100' };
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden">
      
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="bg-white p-4 border-b border-gray-200 flex space-x-4">
           <button onClick={() => setActiveTab('QUICK')} className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-colors ${activeTab === 'QUICK' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>👤 Bireysel Satış</button>
           <button onClick={() => setActiveTab('CORPORATE')} className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-colors ${activeTab === 'CORPORATE' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>🏢 Kurumsal Satış</button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
            <input type="text" className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm" placeholder="Ürün adı ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
               const visuals = getProductVisuals(product.baseName);
               return (
                <div key={product.id} onClick={() => addToCart(product)} className={`rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-all group relative flex flex-col justify-between h-full ${visuals.bg} ${visuals.border}`}>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className={`p-2 rounded-lg ${visuals.iconBg}`}><Package size={24} className={visuals.text} /></div>
                      <span className={`text-xs px-2 py-1 rounded-full bg-white/80 backdrop-blur border ${product.stockQuantity <= product.lowStockThreshold ? 'text-red-600 border-red-200' : 'text-gray-600 border-gray-200'}`}>Stok: {product.stockQuantity}</span>
                    </div>
                    <h3 className={`font-bold text-lg leading-tight mb-1 ${visuals.text}`}>{product.baseName}</h3>
                    <p className="text-slate-600 font-medium text-sm mb-2">{product.variantName}</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200/50 flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-lg">{product.sellPrice} ₺</span>
                        <span className="text-[9px] text-gray-400 font-bold">+ KDV</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors shadow-sm"><Plus size={16} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart / Sidebar */}
      <div className={`w-full lg:w-96 bg-white shadow-xl border-l border-gray-200 flex flex-col z-10 ${isGiftMode ? 'border-l-4 border-l-pink-400' : ''}`}>
        <div className={`p-4 border-b border-gray-200 flex justify-between items-center ${isGiftMode ? 'bg-pink-50' : 'bg-gray-50'}`}>
           <h2 className={`text-lg font-bold flex items-center ${isGiftMode ? 'text-pink-700' : 'text-slate-800'}`}>
             {isGiftMode ? <Gift className="mr-2" size={20} /> : <ShoppingCart className="mr-2" size={20} />} 
             {isGiftMode ? 'Hediye Sepeti' : 'Sepet'}
           </h2>
           <button onClick={clearCart} className="text-xs text-red-600 hover:underline">Temizle</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400"><ShoppingCart size={48} className="mb-2 opacity-20" /><p>Sepet boş</p></div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white border border-gray-100 p-2 rounded-lg shadow-sm">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900">{item.baseName}</h4>
                  <p className="text-xs text-slate-500">{item.variantName}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${isGiftMode ? 'text-pink-500 line-through' : 'text-primary'}`}>
                    {item.sellPrice} ₺ x {item.cartQuantity}
                  </p>
                  {isGiftMode && <p className="text-[10px] text-pink-600 font-bold uppercase">Bedelsiz</p>}
                </div>
                <div className="flex items-center space-x-2">
                   <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200"><Minus size={14} /></button>
                   <span className="text-sm font-bold w-4 text-center">{item.cartQuantity}</span>
                   <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200"><Plus size={14} /></button>
                   <button onClick={() => removeFromCart(item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded ml-2"><Trash2 size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-200 space-y-4">
          
          {/* GIFT MODE TOGGLE */}
          <div className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${isGiftMode ? 'bg-pink-100 border-pink-300' : 'bg-gray-50 border-gray-200'}`} onClick={() => setIsGiftMode(!isGiftMode)}>
             <div className="flex items-center">
                <div className={`p-2 rounded-full mr-3 ${isGiftMode ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                   <Gift size={20} />
                </div>
                <div>
                   <p className={`text-sm font-bold ${isGiftMode ? 'text-pink-800' : 'text-gray-600'}`}>Hediye / Test Ürünü</p>
                   <p className="text-[10px] text-gray-500">Stoktan düşer, ücret yansımaz.</p>
                </div>
             </div>
             <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isGiftMode ? 'bg-pink-500' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${isGiftMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
             </div>
          </div>

          {/* SHIPPING COST INPUT & GIFT OPTIONS */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-3">
             <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                    <Truck size={18} className="mr-2" />
                    <span className="text-xs font-bold uppercase">Kargo Ücreti</span>
                </div>
                <div className="flex items-center bg-white rounded border border-gray-300 px-2 py-1 w-24">
                    <input 
                    type="number" min="0" 
                    className="w-full text-sm text-right font-bold outline-none text-slate-800"
                    value={shippingCost} onChange={(e) => setShippingCost(Number(e.target.value))}
                    />
                    <span className="text-xs text-gray-400 ml-1">₺</span>
                </div>
             </div>
             {isGiftMode && (
                 <div className="text-[10px] space-y-1 pt-2 border-t border-gray-200">
                     <p className="font-bold text-gray-500 uppercase">Kargo Ücretini Kim Ödeyecek?</p>
                     <div className="flex flex-wrap gap-2">
                         <button onClick={() => setGiftShippingPayer('CUSTOMER')} className={`px-2 py-1 rounded border ${giftShippingPayer === 'CUSTOMER' ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-gray-600 border-gray-200'}`}>Alıcı (Borç)</button>
                         <button onClick={() => setGiftShippingPayer('COMPANY')} className={`px-2 py-1 rounded border ${giftShippingPayer === 'COMPANY' ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-gray-600 border-gray-200'}`}>Biz (Gider)</button>
                         <button onClick={() => {setGiftShippingPayer('NONE'); setShippingCost(0);}} className={`px-2 py-1 rounded border ${giftShippingPayer === 'NONE' ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-gray-600 border-gray-200'}`}>Elden/Yok</button>
                     </div>
                 </div>
             )}
          </div>

          {!isGiftMode && activeTab === 'QUICK' && (
             <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex rounded-md shadow-sm" role="group">
                  <button type="button" onClick={() => setQuickSaleType('GUEST')} className={`flex-1 px-4 py-2 text-xs font-medium border rounded-l-lg ${quickSaleType === 'GUEST' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>Misafir</button>
                  <button type="button" onClick={() => setQuickSaleType('REGISTERED')} className={`flex-1 px-4 py-2 text-xs font-medium border rounded-r-lg ${quickSaleType === 'REGISTERED' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>Kayıtlı</button>
                </div>
                {quickSaleType === 'REGISTERED' && (
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 mb-1">Müşteri Seç</label>
                    <select className="w-full p-2 border border-blue-200 rounded bg-white text-sm" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                      <option value="">Müşteri Seçiniz...</option>
                      {individualCustomers.map(c => <option key={c.id} value={c.id}>{c.name} (Bakiye: {c.currentBalance} ₺)</option>)}
                    </select>
                    <div className="flex space-x-2 mt-2">
                      <button onClick={() => setPaymentType(PaymentStatus.PAID)} className={`flex-1 py-1 text-xs rounded border ${paymentType === PaymentStatus.PAID ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-gray-300'}`}>Peşin</button>
                      <button onClick={() => setPaymentType(PaymentStatus.UNPAID)} className={`flex-1 py-1 text-xs rounded border ${paymentType === PaymentStatus.UNPAID ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-600 border-gray-300'}`}>Veresiye</button>
                    </div>
                  </div>
                )}
             </div>
          )}

          {(!isGiftMode && activeTab === 'CORPORATE') || (isGiftMode && (giftShippingPayer === 'CUSTOMER' || selectedCustomerId)) ? (
            <div className={`space-y-3 p-3 rounded-lg border ${isGiftMode ? 'bg-pink-50 border-pink-100' : 'bg-purple-50 border-purple-100'}`}>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isGiftMode ? 'text-pink-900' : 'text-purple-900'}`}>
                    {isGiftMode ? 'Gönderilecek Müşteri' : 'Kurumsal Müşteri Seç'}
                </label>
                <select className={`w-full p-2 border rounded bg-white text-sm ${isGiftMode ? 'border-pink-200' : 'border-purple-200'}`} value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                  <option value="">Müşteri Seçiniz...</option>
                  {[...individualCustomers, ...corporateCustomers].map(c => <option key={c.id} value={c.id}>{c.name} (Bakiye: {c.currentBalance} ₺)</option>)}
                </select>
              </div>
              {!isGiftMode && (
                  <div className="flex space-x-2">
                    <button onClick={() => setPaymentType(PaymentStatus.PAID)} className={`flex-1 py-1 text-xs rounded border ${paymentType === PaymentStatus.PAID ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-gray-300'}`}>Peşin</button>
                    <button onClick={() => setPaymentType(PaymentStatus.UNPAID)} className={`flex-1 py-1 text-xs rounded border ${paymentType === PaymentStatus.UNPAID ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-600 border-gray-300'}`}>Veresiye</button>
                  </div>
              )}
              {((!isGiftMode && paymentType === PaymentStatus.UNPAID) || (isGiftMode && giftShippingPayer === 'CUSTOMER' && paymentType === PaymentStatus.UNPAID)) && (
                <div>
                  <label className="block text-xs font-semibold text-purple-900 mb-1">Vade Tarihi</label>
                  <input type="date" className="w-full p-2 border border-purple-200 rounded bg-white text-sm" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              )}
              {isGiftMode && giftShippingPayer === 'CUSTOMER' && (
                  <div className="flex space-x-2 mt-2">
                    <button onClick={() => setPaymentType(PaymentStatus.PAID)} className={`flex-1 py-1 text-xs rounded border ${paymentType === PaymentStatus.PAID ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-slate-600 border-gray-300'}`}>Kargo Peşin</button>
                    <button onClick={() => setPaymentType(PaymentStatus.UNPAID)} className={`flex-1 py-1 text-xs rounded border ${paymentType === PaymentStatus.UNPAID ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-600 border-gray-300'}`}>Kargo Borç</button>
                  </div>
              )}
            </div>
          ) : null}

          <div className="flex flex-col gap-1 pt-2">
            <div className="flex justify-between items-center text-xs text-gray-500">
               <span>Ürün Ara Toplam (Ham)</span>
               <span>{productsTotalBase.toLocaleString('tr-TR')} ₺</span>
            </div>
            {!isGiftMode && (
                <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>KDV (%20)</span>
                    <span>+ {taxAmount.toLocaleString('tr-TR')} ₺</span>
                </div>
            )}
            {shippingCost > 0 && (
               <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Kargo Ücreti ({isGiftMode ? (giftShippingPayer === 'COMPANY' ? 'Biz' : giftShippingPayer === 'CUSTOMER' ? 'Müşteri' : '-') : '+'})</span>
                  <span>+ {shippingCost.toLocaleString('tr-TR')} ₺</span>
               </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
               <span className="text-slate-800 font-bold">Genel Toplam (Müşteri)</span>
               <span className={`text-2xl font-bold ${isGiftMode ? 'text-pink-600' : 'text-slate-900'}`}>
                  {displayTotal.toLocaleString('tr-TR')} ₺
               </span>
            </div>
          </div>

          <button onClick={handleCheckout} disabled={cart.length === 0} className={`w-full py-3 text-white rounded-lg font-bold shadow-lg active:scale-95 transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed ${isGiftMode ? 'bg-pink-600 hover:bg-pink-700' : 'bg-primary hover:bg-indigo-700'}`}>
            {isGiftMode ? <Gift className="mr-2" size={20} /> : <CheckCircle className="mr-2" size={20} />}
            {isGiftMode ? 'Hediye/Test Çıkışını Onayla' : 'Satışı Tamamla'}
          </button>
        </div>
      </div>
    </div>
  );
};

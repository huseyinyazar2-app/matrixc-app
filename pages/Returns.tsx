
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Sale, SaleStatus, ReturnDetails, PaymentStatus, ReturnItem } from '../types';
import { 
  RotateCcw, Search, User, Calendar, Box, CheckCircle, 
  Truck, CreditCard, XCircle, AlertCircle, ArrowRight, Wallet, Edit2, CheckSquare, ShieldAlert, UserCheck, Info
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export const Returns: React.FC = () => {
  const { sales, customers, settings, processReturn, updateReturnPayment, currentUser } = useStore();

  // Main UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter State (Default: PENDING)
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('PENDING');
  
  // Wizard State in Return Creation Modal
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  
  // Return Form State
  const [returnReason, setReturnReason] = useState('');
  const [returnShippingCompany, setReturnShippingCompany] = useState('');
  const [returnTrackingNumber, setReturnTrackingNumber] = useState('');
  const [refundAmount, setRefundAmount] = useState<number>(0);

  // Updated: Track quantities for Resellable and Defective separately
  // Key format: `${productId}_resellable` or `${productId}_defective`
  const [returnQuantities, setReturnQuantities] = useState<{[key: string]: number}>({});

  // Refund Payment Update State
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [refundStatus, setRefundStatus] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'CREDIT_CARD' | 'IBAN' | 'WALLET'>('CASH');
  const [refundDescription, setRefundDescription] = useState('');

  // Filter returned sales based on search term and payment status
  const returnedSales = useMemo(() => {
    return sales.filter(s => {
      const isReturned = s.status === SaleStatus.RETURNED;
      const matchesSearch = s.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesFilter = true;
      if (filterStatus === 'PENDING') {
        matchesFilter = s.returnDetails?.refundStatus === 'PENDING';
      } else if (filterStatus === 'COMPLETED') {
        matchesFilter = s.returnDetails?.refundStatus === 'COMPLETED';
      }

      return isReturned && matchesSearch && matchesFilter;
    });
  }, [sales, searchTerm, filterStatus]);

  // AKILLI FİLTRE: Sadece son 17 gün içinde AKTİF satışı olan müşterileri getir.
  const customersWithReturnableSales = useMemo(() => {
    const validSales = sales.filter(s => 
      s.status === SaleStatus.ACTIVE && 
      differenceInDays(new Date(), new Date(s.date)) <= 17
    );
    const customerIdsWithSales = new Set(validSales.map(s => s.customerId));
    return customers.filter(c => customerIdsWithSales.has(c.id));
  }, [sales, customers]);

  // For Wizard Step 2: Customer Sales
  const customerSales = useMemo(() => {
    if (!selectedCustomerId) return [];
    return sales.filter(s => s.customerId === selectedCustomerId && s.status === SaleStatus.ACTIVE);
  }, [sales, selectedCustomerId]);

  const selectedSale = useMemo(() => {
    return sales.find(s => s.id === selectedSaleId);
  }, [sales, selectedSaleId]);

  const handleOpenModal = () => {
    setStep(1);
    setSelectedCustomerId(null);
    setSelectedSaleId(null);
    setReturnQuantities({});
    setIsModalOpen(true);
  };

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setStep(2);
  };

  const handleSelectSale = (sale: Sale) => {
    const daysSinceSale = differenceInDays(new Date(), new Date(sale.date));
    if (daysSinceSale > 17) return; 

    setSelectedSaleId(sale.id);
    setReturnQuantities({}); // Reset quantites
    
    // Tutar hesabı (Default 0, user selects qty to increase)
    setRefundAmount(0); 
    setReturnShippingCompany(settings.shippingCompanies[0] || '');
    setStep(3);
  };

  // Miktar değiştiğinde iade tutarını otomatik hesapla
  useEffect(() => {
    if (selectedSale) {
        let calculatedRefund = 0;
        selectedSale.items.forEach(item => {
            const resellableQty = returnQuantities[`${item.productId}_resellable`] || 0;
            const defectiveQty = returnQuantities[`${item.productId}_defective`] || 0;
            const totalQty = resellableQty + defectiveQty;
            
            calculatedRefund += (item.unitPrice * 1.20) * totalQty;
        });
        setRefundAmount(Number(calculatedRefund.toFixed(2)));
    }
  }, [returnQuantities, selectedSale]);

  const handleQuantityChange = (productId: string, type: 'resellable' | 'defective', newQty: number, maxQty: number) => {
      // Calculate current total for this product to prevent exceeding bought quantity
      const currentResellable = type === 'resellable' ? newQty : (returnQuantities[`${productId}_resellable`] || 0);
      const currentDefective = type === 'defective' ? newQty : (returnQuantities[`${productId}_defective`] || 0);
      
      if (currentResellable + currentDefective > maxQty) {
          // Prevent change if total exceeds
          return; 
      }

      setReturnQuantities(prev => ({ ...prev, [`${productId}_${type}`]: Math.max(0, newQty) }));
  };

  const handleSubmitReturn = async () => {
    if (!selectedSaleId || !selectedSale) return;
    
    // Prepare items list
    const itemsToReturn: ReturnItem[] = [];
    
    selectedSale.items.forEach(item => {
        const resellableQty = returnQuantities[`${item.productId}_resellable`] || 0;
        const defectiveQty = returnQuantities[`${item.productId}_defective`] || 0;
        
        if (resellableQty > 0) {
            itemsToReturn.push({ productId: item.productId, quantity: resellableQty, condition: 'RESELLABLE' });
        }
        if (defectiveQty > 0) {
            itemsToReturn.push({ productId: item.productId, quantity: defectiveQty, condition: 'DEFECTIVE' });
        }
    });

    if (itemsToReturn.length === 0) {
        alert("Lütfen iade edilecek en az bir ürün seçin.");
        return;
    }

    const isUnpaid = selectedSale.paymentStatus === PaymentStatus.UNPAID;

    const details: ReturnDetails = {
      date: new Date().toISOString(),
      reason: returnReason,
      returnShippingCompany: returnShippingCompany || undefined,
      returnTrackingNumber: returnTrackingNumber || undefined,
      refundAmount: refundAmount,
      processedBy: currentUser?.name || 'Bilinmiyor',
      refundStatus: isUnpaid ? 'COMPLETED' : 'PENDING', 
      refundMethod: isUnpaid ? 'WALLET' : undefined,
      refundDescription: isUnpaid ? 'Veresiye satış iadesi - Borç silindi' : undefined,
      refundDate: isUnpaid ? new Date().toISOString() : undefined
    };

    await processReturn(selectedSaleId, details, itemsToReturn);
    
    alert('İade işlemi başarıyla tamamlandı.');
    setIsModalOpen(false);
    
    setReturnReason('');
    setReturnTrackingNumber('');
    setReturnShippingCompany('');
    setRefundAmount(0);
  };

  const handleOpenPaymentModal = (sale: Sale) => {
    if (!sale.returnDetails) return;
    setEditingSale(sale);
    setRefundStatus(sale.returnDetails.refundStatus || 'PENDING');
    setRefundMethod(sale.returnDetails.refundMethod || 'CASH');
    setRefundDescription(sale.returnDetails.refundDescription || '');
    setIsPaymentModalOpen(true);
  };

  const handleUpdatePayment = async () => {
    if (!editingSale) return;
    await updateReturnPayment(editingSale.id, {
      refundStatus,
      refundMethod,
      refundDescription,
      refundDate: refundStatus === 'COMPLETED' ? new Date().toISOString() : undefined
    });
    alert('İade ödeme bilgileri güncellendi.');
    setIsPaymentModalOpen(false);
    setEditingSale(null);
  };

  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const filteredWizardCustomers = customersWithReturnableSales.filter(c => 
    c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto mb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <RotateCcw size={28} className="mr-3 text-red-600" /> İade ve İptal Yönetimi
        </h1>
        <button 
          onClick={handleOpenModal}
          className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-red-700 shadow-sm transition-all text-sm font-bold uppercase tracking-wider"
        >
          <RotateCcw size={18} className="mr-2" /> Yeni İade Kaydı
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="İadelerde ara (Müşteri Adı)..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Filter Buttons */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
           <button onClick={() => setFilterStatus('PENDING')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterStatus === 'PENDING' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>ÖDEME BEKLEYENLER</button>
           <button onClick={() => setFilterStatus('COMPLETED')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterStatus === 'COMPLETED' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>TAMAMLANANLAR</button>
           <button onClick={() => setFilterStatus('ALL')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterStatus === 'ALL' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>TÜMÜ</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-red-50 text-red-800 font-bold text-[10px] uppercase border-b border-red-100">
              <tr>
                <th className="p-4">İade Tarihi</th>
                <th className="p-4">Müşteri</th>
                <th className="p-4">İade Nedeni</th>
                <th className="p-4 text-right">İade Tutarı</th>
                <th className="p-4 text-center">Ödeme Durumu</th>
                <th className="p-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {returnedSales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 whitespace-nowrap text-xs font-medium text-gray-600">
                    <div>{sale.returnDetails?.date ? format(new Date(sale.returnDetails.date), 'dd.MM.yyyy HH:mm') : '-'}</div>
                    <div className="flex items-center text-[10px] text-indigo-600 mt-1 font-bold">
                       <UserCheck size={12} className="mr-1" />
                       {sale.returnDetails?.processedBy || 'Bilinmiyor'}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-slate-800">{sale.customerName}</td>
                  <td className="p-4 text-xs text-slate-600 italic">"{sale.returnDetails?.reason}"</td>
                  <td className="p-4 text-right font-black text-red-600">{sale.returnDetails?.refundAmount.toLocaleString('tr-TR')} ₺</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${sale.returnDetails?.refundStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {sale.returnDetails?.refundStatus === 'COMPLETED' ? 'ÖDENDİ / DÜŞÜLDÜ' : 'ÖDEME BEKLİYOR'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleOpenPaymentModal(sale)}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      title="Ödeme Bilgisini Düzenle"
                    >
                      <Wallet size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {returnedSales.length === 0 && (
                <tr>
                   <td colSpan={6} className="p-10 text-center text-gray-400 italic">Kayıt yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Wizard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                <h2 className="text-lg font-bold text-slate-800 flex items-center uppercase tracking-tight">
                   <RotateCcw className="mr-2 text-red-600" size={20} /> İade İşlemi Sihirbazı
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm">✕</button>
             </div>

             <div className="p-6">
                {/* Steps Indicator */}
                <div className="flex items-center justify-center mb-8">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                   <div className={`w-16 h-1 ${step >= 2 ? 'bg-red-600' : 'bg-gray-200'}`}></div>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                   <div className={`w-16 h-1 ${step >= 3 ? 'bg-red-600' : 'bg-gray-200'}`}></div>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                </div>

                {step === 1 && (
                  <div className="space-y-4">
                     <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">Müşteri Seçimi</h3>
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                           type="text" placeholder="Müşteri ara..." 
                           className="w-full pl-10 p-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                           value={customerSearchTerm}
                           onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        />
                     </div>
                     <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl">
                        {filteredWizardCustomers.map(c => (
                           <div key={c.id} onClick={() => handleSelectCustomer(c.id)} className="p-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 flex justify-between items-center group">
                              <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                              <ArrowRight size={16} className="text-gray-300 group-hover:text-red-600" />
                           </div>
                        ))}
                     </div>
                  </div>
                )}

                {step === 2 && (
                   <div className="space-y-4">
                      <div className="flex justify-between items-center">
                         <h3 className="text-sm font-bold text-gray-700 uppercase">Geçmiş Siparişler</h3>
                         <button onClick={() => setStep(1)} className="text-xs text-gray-500 hover:text-red-600 underline">Geri Dön</button>
                      </div>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                            {customerSales.map(sale => {
                               const daysSinceSale = differenceInDays(new Date(), new Date(sale.date));
                               const isExpired = daysSinceSale > 17;
                               return (
                                 <div key={sale.id} onClick={() => !isExpired && handleSelectSale(sale)} className={`border rounded-xl p-4 transition-all ${isExpired ? 'bg-gray-50 opacity-70' : 'bg-white cursor-pointer hover:border-red-500'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                       <div className="text-xs text-gray-500 font-bold">{format(new Date(sale.date), 'dd.MM.yyyy HH:mm')}</div>
                                       <div className="font-black text-slate-800 text-sm">{(sale.totalAmount * 1.20).toLocaleString('tr-TR')} ₺</div>
                                    </div>
                                    <div className="text-sm text-slate-700 mb-1">{sale.items.map(i => i.productName).join(', ')}</div>
                                 </div>
                               );
                            })}
                         </div>
                   </div>
                )}

                {step === 3 && selectedSale && (
                   <div className="space-y-5 animate-in slide-in-from-right duration-300">
                      <div className="flex justify-between items-center border-b pb-2">
                         <h3 className="text-sm font-bold text-gray-700 uppercase">İade Miktarları & Durum</h3>
                         <button onClick={() => setStep(2)} className="text-xs text-gray-500 hover:text-red-600 underline">Listeye Dön</button>
                      </div>

                      {/* ITEM SELECTION WITH CONDITION */}
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                         <div className="flex justify-between items-center mb-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Ürün Listesi</p>
                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">Arızalı ürünler stoka girmez</span>
                         </div>
                         <div className="space-y-3">
                             {selectedSale.items.map(item => (
                                 <div key={item.productId} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3 rounded shadow-sm gap-3">
                                     <div className="flex-1">
                                         <p className="text-xs font-bold text-slate-700">{item.productName}</p>
                                         <p className="text-[10px] text-gray-500">Satılan: {item.quantity} Adet</p>
                                     </div>
                                     <div className="flex items-center gap-4">
                                         <div className="flex flex-col items-center">
                                            <label className="text-[9px] font-bold text-emerald-600 mb-1">SAĞLAM</label>
                                            <input 
                                                type="number" min="0" max={item.quantity}
                                                className="w-16 p-1 border border-emerald-200 bg-emerald-50 rounded text-center text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                                value={returnQuantities[`${item.productId}_resellable`] || 0}
                                                onChange={(e) => handleQuantityChange(item.productId, 'resellable', parseInt(e.target.value) || 0, item.quantity)}
                                                placeholder="0"
                                            />
                                         </div>
                                         <div className="flex flex-col items-center">
                                            <label className="text-[9px] font-bold text-red-600 mb-1">ARIZALI</label>
                                            <input 
                                                type="number" min="0" max={item.quantity}
                                                className="w-16 p-1 border border-red-200 bg-red-50 rounded text-center text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"
                                                value={returnQuantities[`${item.productId}_defective`] || 0}
                                                onChange={(e) => handleQuantityChange(item.productId, 'defective', parseInt(e.target.value) || 0, item.quantity)}
                                                placeholder="0"
                                            />
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                      </div>

                      {/* Payment Warning */}
                      {(selectedSale.paymentStatus === PaymentStatus.UNPAID) ? (
                        <div className="bg-red-50 p-3 rounded-xl border border-red-200 flex items-start">
                          <ShieldAlert className="text-red-600 mt-0.5 mr-2" size={16} />
                          <p className="text-xs text-red-700">Bu satış <strong>VERESİYE</strong>. Onaylandığında tutar bakiyeden düşülecek.</p>
                        </div>
                      ) : (
                         <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-start">
                           <Info className="text-blue-600 mt-0.5 mr-2" size={16} />
                           <p className="text-xs text-blue-800">Sadece <strong>SAĞLAM</strong> olarak işaretlenen ürünler stoka eklenecektir.</p>
                         </div>
                      )}

                      <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">İade Nedeni *</label>
                         <textarea 
                            rows={2}
                            className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                            value={returnReason} onChange={(e) => setReturnReason(e.target.value)}
                         />
                      </div>

                      <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">İade Tutarı (Otomatik) *</label>
                         <div className="relative">
                           <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                           <input 
                              type="number" 
                              className="w-full pl-10 p-3 border border-gray-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                              value={refundAmount} onChange={(e) => setRefundAmount(Number(e.target.value))}
                           />
                         </div>
                      </div>

                      <button 
                         onClick={handleSubmitReturn}
                         disabled={!returnReason || refundAmount <= 0}
                         className="w-full py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center uppercase tracking-wider text-sm"
                      >
                         <CheckCircle className="mr-2" size={20} /> İadeyi Onayla
                      </button>
                   </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Payment Update Modal */}
      {isPaymentModalOpen && editingSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
             <h2 className="text-xl font-bold mb-6 border-b pb-4 flex items-center uppercase tracking-tighter text-slate-800">
              <Wallet className="mr-3 text-indigo-600" /> Ödeme Bilgisi Güncelle
            </h2>
            <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Ödeme Durumu</label>
                  <div className="flex rounded-md shadow-sm" role="group">
                    <button type="button" onClick={() => setRefundStatus('PENDING')} className={`flex-1 px-4 py-3 text-xs font-bold border rounded-l-lg ${refundStatus === 'PENDING' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200'}`}>BEKLİYOR</button>
                    <button type="button" onClick={() => setRefundStatus('COMPLETED')} className={`flex-1 px-4 py-3 text-xs font-bold border rounded-r-lg ${refundStatus === 'COMPLETED' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}>ÖDENDİ / DÜŞÜLDÜ</button>
                  </div>
               </div>
               {refundStatus === 'COMPLETED' && (
                 <div>
                       <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Ödeme Yöntemi</label>
                       <select className="w-full p-3 border border-gray-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as any)}>
                          <option value="CASH">Nakit Ödeme</option>
                          <option value="IBAN">Banka Havalesi (IBAN)</option>
                          <option value="CREDIT_CARD">Kredi Kartına İade</option>
                          <option value="WALLET">Cari Hesaba Alacak Kaydı</option>
                       </select>
                       {refundMethod === 'WALLET' && (
                           <p className="text-[10px] text-green-600 mt-1 font-bold">Bu seçenek seçildiğinde tutar müşteri bakiyesine (Alacak) olarak eklenecektir.</p>
                       )}
                 </div>
               )}
            </div>
            <div className="flex gap-4 mt-8">
               <button onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase hover:bg-gray-200">İptal</button>
               <button onClick={handleUpdatePayment} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-indigo-700">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

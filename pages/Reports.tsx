
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { PaymentStatus, Sale, UserRole, SaleStatus } from '../types';
import { 
  Search, Filter, Receipt, Download, FileSpreadsheet, Calendar, 
  Tag, ShoppingBag, Clock, Eye, Truck, UserCheck, CheckCircle, RotateCcw, Edit2, ChevronRight, Gift, Save
} from 'lucide-react';
import { 
  format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, 
  subWeeks, startOfMonth, endOfMonth, subMonths, startOfYear, 
  endOfYear, subYears, isWithinInterval 
} from 'date-fns';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

type DatePreset = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'LAST_YEAR' | 'ALL';

export const Reports: React.FC = () => {
  const { sales, customers, settings, updateSalePaymentStatus, editSale, currentUser } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<DatePreset>('TODAY');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [productFilter, setProductFilter] = useState<string>('ALL');
  
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null); 
  const [isEditingPayment, setIsEditingPayment] = useState(false); // To toggle payment status edit mode
  
  // Full Edit Mode States
  const [isFullEditing, setIsFullEditing] = useState(false);
  const [editQuantities, setEditQuantities] = useState<{[key: string]: number}>({});
  const [editPrices, setEditPrices] = useState<{[key: string]: number}>({}); // Unit Price (Excl. Tax)

  const productOptions = useMemo(() => {
    const names = new Set<string>();
    sales.forEach(s => s.items.forEach(i => names.add(i.productName)));
    return Array.from(names).sort();
  }, [sales]);

  const getDateInterval = (preset: DatePreset) => {
    const now = new Date();
    switch (preset) {
      case 'TODAY': return { start: startOfDay(now), end: endOfDay(now) };
      case 'YESTERDAY': { const yesterday = subDays(now, 1); return { start: startOfDay(yesterday), end: endOfDay(yesterday) }; }
      case 'THIS_WEEK': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'LAST_WEEK': { const lastWeek = subWeeks(now, 1); return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) }; }
      case 'THIS_MONTH': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'LAST_MONTH': { const lastMonth = subMonths(now, 1); return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }; }
      case 'THIS_YEAR': return { start: startOfYear(now), end: endOfYear(now) };
      case 'LAST_YEAR': { const lastYear = subYears(now, 1); return { start: startOfYear(lastYear), end: endOfYear(lastYear) }; }
      default: return null;
    }
  };

  const getCustomerChannel = (customerId: string | null) => { const c = customers.find(cust => cust.id === customerId); return c?.salesChannel || '-'; };

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSearch = sale.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || sale.paymentStatus === statusFilter;
      const chan = getCustomerChannel(sale.customerId);
      const matchesChannel = channelFilter === 'ALL' || chan === channelFilter;
      const matchesProduct = productFilter === 'ALL' || sale.items.some(i => i.productName === productFilter);
      let matchesDate = true;
      const interval = getDateInterval(datePreset);
      if (interval) matchesDate = isWithinInterval(new Date(sale.date), interval);
      return matchesSearch && matchesStatus && matchesChannel && matchesProduct && matchesDate;
    });
  }, [sales, searchTerm, statusFilter, datePreset, channelFilter, productFilter, customers]);

  // Calculations
  const totalSalesAmountExclTax = filteredSales.filter(s => s.status === SaleStatus.ACTIVE && s.type !== 'GIFT').reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalSalesAmountInclTax = filteredSales.filter(s => s.status === SaleStatus.ACTIVE && s.type !== 'GIFT').reduce((sum, sale) => sum + (sale.totalAmount * 1.20) + (sale.shippingCost || 0), 0);

  const calculateDifferencePercent = (unitPrice: number, originalPrice?: number) => { if (!originalPrice) return 0; const diff = unitPrice - originalPrice; return Math.round((diff / originalPrice) * 100); };

  const handleDownloadPDF = () => { /* ... existing ... */ };
  const handleDownloadExcel = () => { /* ... existing ... */ };

  const handleChangePaymentStatus = async (newStatus: PaymentStatus) => {
      if (selectedSale) {
          await updateSalePaymentStatus(selectedSale.id, newStatus);
          setSelectedSale({ ...selectedSale, paymentStatus: newStatus });
          setIsEditingPayment(false);
      }
  };

  const startFullEdit = () => {
      if (!selectedSale) return;
      const qtys: any = {};
      const prices: any = {};
      selectedSale.items.forEach(item => {
          qtys[item.productId] = item.quantity;
          prices[item.productId] = item.unitPrice; // Editing Tax Exclusive
      });
      setEditQuantities(qtys);
      setEditPrices(prices);
      setIsFullEditing(true);
  };

  const saveFullEdit = async () => {
      if (!selectedSale) return;
      
      // Reconstruct Sale Object
      let newTotalAmount = 0;
      const newItems = selectedSale.items.map(item => {
          const newQty = editQuantities[item.productId];
          const newPriceExcl = editPrices[item.productId];
          
          newTotalAmount += newPriceExcl * newQty;

          return {
              ...item,
              quantity: newQty,
              unitPrice: newPriceExcl,
              totalPrice: newPriceExcl * newQty
          };
      });

      const updatedSale = {
          ...selectedSale,
          items: newItems,
          totalAmount: newTotalAmount
      };

      await editSale(updatedSale);
      alert('Satış güncellendi.');
      setSelectedSale(updatedSale);
      setIsFullEditing(false);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto mb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <h1 className="text-xl font-bold text-slate-800 flex items-center">
          <Receipt size={24} className="mr-2 text-primary" /> Satış Listesi
        </h1>
        {/* Buttons... */}
      </div>

      <div className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold flex justify-between items-center shadow-md mb-4">
        <div><span className="text-[10px] uppercase tracking-widest opacity-80 block">Aktif Ciro (Ürün + Kargo + KDV)</span><span className="text-2xl tracking-tight">{totalSalesAmountInclTax.toLocaleString('tr-TR')} ₺</span></div>
        <div className="text-right"><span className="text-[10px] uppercase opacity-70 block">Ham Ciro (KDV Hariç)</span><span className="text-sm font-medium">{totalSalesAmountExclTax.toLocaleString('tr-TR')} ₺</span></div>
      </div>

      {/* Filter Panel (Same as before) */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <select className="w-full pl-9 pr-2 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:ring-2 focus:ring-primary outline-none appearance-none" value={datePreset} onChange={(e) => setDatePreset(e.target.value as DatePreset)}>
                <option value="ALL">Tüm Zamanlar</option>
                <option value="TODAY">Bugün</option>
                <option value="YESTERDAY">Dün</option>
                <option value="THIS_WEEK">Bu Hafta</option>
                <option value="THIS_MONTH">Bu Ay</option>
                <option value="THIS_YEAR">Bu Yıl</option>
              </select>
            </div>
          </div>
          <div className="relative"><div className="relative"><Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="Müşteri Ara..." className="w-full pl-9 pr-2 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:ring-2 focus:ring-primary outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
          <div className="relative"><div className="relative"><Tag className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} /><select className="w-full pl-9 pr-2 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:ring-2 focus:ring-primary outline-none appearance-none" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}><option value="ALL">Tüm Kanallar</option>{settings.salesChannels?.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
          <div className="relative"><div className="relative"><ShoppingBag className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} /><select className="w-full pl-9 pr-2 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:ring-2 focus:ring-primary outline-none appearance-none" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}><option value="ALL">Tüm Ürünler</option>{productOptions.map(name => <option key={name} value={name}>{name}</option>)}</select></div></div>
          <div className="relative"><div className="relative"><Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} /><select className="w-full pl-9 pr-2 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:ring-2 focus:ring-primary outline-none appearance-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="ALL">Tüm Durumlar</option><option value={PaymentStatus.PAID}>Ödendi</option><option value={PaymentStatus.UNPAID}>Veresiye</option></select></div></div>
        </div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredSales.map(sale => {
           const inclTax = sale.totalAmount * 1.20;
           const grandTotal = inclTax + (sale.shippingCost || 0);
           const isReturned = sale.status === SaleStatus.RETURNED;
           const isGift = sale.type === 'GIFT';

           // Gift Total Display Logic
           let displayTotal = grandTotal;
           if (isGift) {
                if (sale.shippingPayer === 'COMPANY' || sale.shippingPayer === 'NONE') displayTotal = 0;
                else if (sale.shippingPayer === 'CUSTOMER') displayTotal = (sale.shippingCost || 0);
           }

           return (
             <div key={sale.id} className={`bg-white p-3 rounded-xl border shadow-sm ${isGift ? 'border-pink-200 bg-pink-50/30' : 'border-gray-200'}`}>
                <div className="flex justify-between items-start mb-2">
                   <div>
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold text-gray-400">{format(new Date(sale.date), 'dd.MM.yyyy HH:mm')}</span>
                         {isGift && <span className="text-[9px] px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-bold uppercase flex items-center"><Gift size={10} className="mr-1"/> HEDİYE</span>}
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm">{sale.customerName}</h3>
                   </div>
                   <div className="text-right">
                      {isGift && displayTotal === 0 ? (
                         <span className="font-black text-pink-600 text-sm uppercase">BEDELSİZ</span>
                      ) : (
                         <span className={`font-black text-sm ${isReturned ? 'line-through text-gray-400' : 'text-slate-900'}`}>{displayTotal.toLocaleString('tr-TR')} ₺</span>
                      )}
                   </div>
                </div>
                <div className="text-xs text-gray-500 mb-2 truncate">
                   {sale.items.map(i => i.productName).join(', ')}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${isReturned ? 'bg-red-100 text-red-600' : (isGift && displayTotal===0 || sale.paymentStatus === PaymentStatus.PAID) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isReturned ? 'İADE' : sale.paymentStatus}
                   </span>
                   <button onClick={() => { setSelectedSale(sale); setIsEditingPayment(false); }} className="flex items-center text-xs font-bold text-primary">
                      Detay <ChevronRight size={14} />
                   </button>
                </div>
             </div>
           )
        })}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-[10px] font-bold uppercase border-b tracking-tight">
              <tr>
                <th className="p-3 whitespace-nowrap">Tarih</th>
                <th className="p-3 whitespace-nowrap">Kanal</th>
                <th className="p-3 whitespace-nowrap">Müşteri</th>
                <th className="p-3 whitespace-nowrap">Ürün Detayı</th>
                <th className="p-3 text-center whitespace-nowrap">Adet</th>
                <th className="p-3 text-right whitespace-nowrap">B.Fiyat (Ham)</th>
                <th className="p-3 text-right whitespace-nowrap">Tutar (KDV Dahil)</th>
                <th className="p-3 text-center whitespace-nowrap">Durum</th>
                <th className="p-3 text-center whitespace-nowrap">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSales.map(sale => {
                const totalQty = sale.items.reduce((acc, i) => acc + i.quantity, 0);
                // unitPrice stored in item is Base Price (Excl Tax)
                const unitBasePrice = totalQty > 0 ? (sale.totalAmount / totalQty) : 0;
                
                const grandTotal = (sale.totalAmount * 1.20) + (sale.shippingCost || 0);
                const isReturned = sale.status === SaleStatus.RETURNED;
                const isGift = sale.type === 'GIFT';

                let displayTotal = grandTotal;
                if (isGift) {
                    if (sale.shippingPayer === 'COMPANY' || sale.shippingPayer === 'NONE') displayTotal = 0;
                    else if (sale.shippingPayer === 'CUSTOMER') displayTotal = (sale.shippingCost || 0);
                }

                return (
                  <tr key={sale.id} className={`hover:bg-gray-50 transition-colors text-[11px] group ${isReturned ? 'bg-red-50/50' : isGift ? 'bg-pink-50/40' : ''}`}>
                    <td className="p-3 whitespace-nowrap"><div className="font-bold text-slate-700">{format(new Date(sale.date), 'dd.MM.yyyy')}</div><div className="flex items-center text-[9px] text-gray-400 mt-0.5"><Clock size={9} className="mr-1" />{format(new Date(sale.date), 'HH:mm')}</div></td>
                    <td className="p-3 font-bold text-slate-500 uppercase tracking-tighter whitespace-nowrap">{getCustomerChannel(sale.customerId)}</td>
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{sale.customerName}</td>
                    <td className="p-3 text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">{sale.items.map(i => i.productName).join(', ')}</td>
                    <td className="p-3 text-center font-medium whitespace-nowrap">{totalQty}</td>
                    <td className="p-3 text-right font-medium text-slate-600 whitespace-nowrap">
                       {isGift && unitBasePrice === 0 ? <span className="text-pink-400 text-[10px] font-bold">HEDİYE</span> : `${unitBasePrice.toLocaleString('tr-TR')} ₺`}
                    </td>
                    <td className={`p-3 text-right whitespace-nowrap ${isReturned ? 'line-through text-gray-400' : ''}`}>
                       {isGift && displayTotal === 0 ? (
                          <span className="font-black text-pink-600 text-[10px] px-2 py-0.5 bg-pink-100 rounded">BEDELSİZ</span>
                       ) : (
                          <div className="font-bold text-slate-900">{displayTotal.toLocaleString('tr-TR')} ₺</div>
                       )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">{isReturned ? <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700 uppercase">İADE EDİLDİ</span> : <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${sale.paymentStatus === PaymentStatus.PAID ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{sale.paymentStatus}</span>}</td>
                    <td className="p-3 text-center whitespace-nowrap"><button onClick={() => { setSelectedSale(sale); setIsEditingPayment(false); }} className="p-1.5 bg-indigo-50 text-primary rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"><Eye size={14} /></button></td>
                  </tr>
                );
              })}
              {filteredSales.length === 0 && (<tr><td colSpan={9} className="p-10 text-center text-gray-400 italic">Kayıt bulunamadı.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl p-0 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
              <div className={`p-5 border-b border-gray-100 flex justify-between items-center rounded-t-2xl ${selectedSale.type === 'GIFT' ? 'bg-pink-50' : 'bg-gray-50'}`}>
                 <div>
                    <h2 className={`text-lg font-bold flex items-center uppercase tracking-tight ${selectedSale.type === 'GIFT' ? 'text-pink-700' : 'text-slate-800'}`}>
                       {selectedSale.type === 'GIFT' ? <Gift className="mr-2" size={20} /> : <Receipt className="mr-2 text-primary" size={20} />} 
                       {selectedSale.type === 'GIFT' ? 'Hediye / Test Gönderimi' : 'Satış Fişi Detayı'}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">Fiş ID: #{selectedSale.id.substring(0,8)}</p>
                 </div>
                 <button onClick={() => setSelectedSale(null)} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm">✕</button>
              </div>
              <div className="p-6 space-y-6">
                 {/* ... (Existing Info Grid) ... */}
                 
                 <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                       <thead className="bg-slate-100 text-[10px] text-slate-500 font-bold uppercase"><tr><th className="p-3">Ürün</th><th className="p-3 text-center">Adet</th><th className="p-3 text-right">Birim Fiyat (Ham)</th><th className="p-3 text-right">Toplam (Ham)</th></tr></thead>
                       <tbody className="divide-y divide-gray-100 text-xs">
                          {selectedSale.items.map((item, idx) => {
                             if (isFullEditing) {
                                return (
                                    <tr key={idx}>
                                        <td className="p-3 font-medium text-slate-700">{item.productName}</td>
                                        <td className="p-3"><input type="number" min="1" className="w-16 p-1 border rounded text-center" value={editQuantities[item.productId]} onChange={e => setEditQuantities({...editQuantities, [item.productId]: Number(e.target.value)})} /></td>
                                        <td className="p-3 text-right"><input type="number" min="0" className="w-20 p-1 border rounded text-right" value={editPrices[item.productId]} onChange={e => setEditPrices({...editPrices, [item.productId]: Number(e.target.value)})} /></td>
                                        <td className="p-3 text-right text-gray-400">-</td>
                                    </tr>
                                )
                             }
                             return (
                                <tr key={idx}>
                                   <td className="p-3 font-medium text-slate-700">{item.productName}</td>
                                   <td className="p-3 text-center font-bold">{item.quantity}</td>
                                   <td className="p-3 text-right font-bold text-slate-800">{item.unitPrice.toLocaleString('tr-TR')} ₺</td>
                                   <td className="p-3 text-right font-bold text-slate-900">{item.totalPrice.toLocaleString('tr-TR')} ₺</td>
                                </tr>
                             )
                          })}
                       </tbody>
                    </table>
                 </div>

                 {isFullEditing && (
                     <div className="flex justify-end gap-2">
                         <button onClick={() => setIsFullEditing(false)} className="px-4 py-2 bg-gray-100 rounded text-xs font-bold uppercase">İptal</button>
                         <button onClick={saveFullEdit} className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold uppercase flex items-center"><Save size={14} className="mr-1"/> Kaydet</button>
                     </div>
                 )}

                 {/* Totals Section */}
                 
                 <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        {currentUser?.role === UserRole.ADMIN && !isFullEditing && selectedSale.status === SaleStatus.ACTIVE && (
                            <button onClick={startFullEdit} className="text-xs text-indigo-600 font-bold underline flex items-center">
                                <Edit2 size={12} className="mr-1"/> Satışı Düzenle
                            </button>
                        )}
                    </div>
                    {/* Payment Status Switcher (Same as before) */}
                    {isEditingPayment ? (
                        <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg animate-in fade-in">
                            <select 
                                className="text-xs p-1 border rounded"
                                value={selectedSale.paymentStatus}
                                onChange={(e) => handleChangePaymentStatus(e.target.value as PaymentStatus)}
                            >
                                <option value={PaymentStatus.PAID}>ODENDI</option>
                                <option value={PaymentStatus.UNPAID}>VERESIYE</option>
                            </select>
                            <button onClick={() => setIsEditingPayment(false)} className="text-xs text-gray-500 underline">Kapat</button>
                        </div>
                    ) : (
                        <div className={`px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 ${selectedSale.paymentStatus === PaymentStatus.PAID ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            Ödeme Durumu: {selectedSale.paymentStatus}
                            <button onClick={() => setIsEditingPayment(true)} className="p-1 hover:bg-white/50 rounded-full transition-colors" title="Durumu Değiştir">
                                <Edit2 size={12} />
                            </button>
                        </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

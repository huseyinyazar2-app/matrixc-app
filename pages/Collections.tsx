
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Sale, SaleStatus, PaymentStatus, TransactionType, Customer } from '../types';
import { 
  Banknote, Search, Calendar, Wallet, CheckCircle, 
  AlertTriangle, Clock, ArrowRight, UserCheck, History, AlertCircle, FileText, PlusCircle, Tag
} from 'lucide-react';
import { format, differenceInDays, isBefore, isSameDay, startOfDay } from 'date-fns';

export const Collections: React.FC = () => {
  const { sales, transactions, processCollection, processGeneralCollection, currentUser, customers } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'DEBT' | 'OVERDUE' | 'UPCOMING' | 'HISTORY'>('DEBT');
  
  // Sale Collection Modal State
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [collectionAmount, setCollectionAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('Nakit');
  const [description, setDescription] = useState('');
  
  // General Collection Modal State
  const [showGeneralModal, setShowGeneralModal] = useState(false);
  const [generalCustomerId, setGeneralCustomerId] = useState('');
  const [generalAmount, setGeneralAmount] = useState('');
  const [generalDesc, setGeneralDesc] = useState('');
  
  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState<Sale | null>(null);

  // Helper
  const getGrandTotal = (sale: Sale) => {
      let total = (sale.totalAmount * 1.20) + (sale.shippingCost || 0);
      if (sale.type === 'GIFT') {
          if (sale.shippingPayer === 'COMPANY' || sale.shippingPayer === 'NONE') total = 0;
          else if (sale.shippingPayer === 'CUSTOMER') total = (sale.shippingCost || 0);
      }
      return total;
  };

  // Filter Logic (Same as before)
  const filteredSales = useMemo(() => {
    return sales
      .filter(sale => sale.status === SaleStatus.ACTIVE)
      .filter(sale => {
        const matchesSearch = sale.customerName.toLowerCase().includes(searchTerm.toLowerCase());
        const total = getGrandTotal(sale);
        const paid = sale.paidAmount || 0;
        const isFullyPaid = paid >= total - 1; 
        
        const today = startOfDay(new Date());
        const dueDate = sale.dueDate ? new Date(sale.dueDate) : null;
        const isOverdue = dueDate && isBefore(dueDate, today) && !isFullyPaid;

        if (!matchesSearch) return false;

        switch (filterStatus) {
            case 'DEBT': return !isFullyPaid; 
            case 'OVERDUE': return isOverdue; 
            case 'UPCOMING': return !isFullyPaid && !isOverdue; 
            case 'HISTORY': return isFullyPaid; 
            default: return !isFullyPaid;
        }
      })
      .sort((a, b) => {
          if (filterStatus === 'HISTORY') return new Date(b.date).getTime() - new Date(a.date).getTime();
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : new Date(a.date).getTime();
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : new Date(b.date).getTime();
          return dateA - dateB;
      });
  }, [sales, searchTerm, filterStatus]);

  const getDueStatus = (sale: Sale, isPaid: boolean) => {
     if (isPaid) return { color: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'TAHSİLAT TAMAM' };
     if (sale.paymentStatus === PaymentStatus.PARTIAL) return { color: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', label: 'KISMİ ÖDEME' };
     if (!sale.dueDate) return { color: 'bg-gray-50 border-gray-200', text: 'text-gray-600', label: 'VADE YOK' };
     const today = startOfDay(new Date());
     const due = new Date(sale.dueDate);
     if (isBefore(due, today)) return { color: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'GECİKMİŞ BORÇ' };
     if (isSameDay(due, today)) return { color: 'bg-orange-50 border-orange-200', text: 'text-orange-700', label: 'BUGÜN ÖDENMELİ' };
     return { color: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', label: 'GELECEK T.' };
  };

  const openCollectionModal = (sale: Sale) => {
      const total = getGrandTotal(sale);
      const paid = sale.paidAmount || 0;
      const remaining = total - paid;
      setSelectedSale(sale);
      setCollectionAmount(remaining.toFixed(2));
      setPaymentMethod('Nakit');
      setDescription('');
  };

  const handleCollectionSubmit = async () => {
      if (!selectedSale || !collectionAmount) return;
      const amount = parseFloat(collectionAmount);
      const remainingDebt = getGrandTotal(selectedSale) - (selectedSale.paidAmount || 0);
      if (amount <= 0) { alert('Geçersiz tutar'); return; }
      if (amount > remainingDebt + 1) { 
          if (!window.confirm(`DİKKAT: Girilen tutar (${amount} ₺), kalan borçtan fazla. Devam?`)) return;
      }
      await processCollection(selectedSale.id, amount, paymentMethod, description);
      alert('Tahsilat başarıyla kaydedildi.');
      setSelectedSale(null);
  };

  const handleGeneralCollectionSubmit = async () => {
      if (!generalCustomerId || !generalAmount) { alert('Müşteri ve tutar seçiniz.'); return; }
      const amount = parseFloat(generalAmount);
      if (amount <= 0) { alert('Geçersiz tutar'); return; }
      
      await processGeneralCollection(generalCustomerId, amount, 'Nakit', generalDesc);
      alert('Genel tahsilat kaydedildi ve müşteri bakiyesinden düşüldü.');
      setShowGeneralModal(false);
      setGeneralAmount(''); setGeneralDesc(''); setGeneralCustomerId('');
  };

  const getTransactionHistory = (customerId: string) => transactions.filter(t => t.customerId === customerId && t.type === TransactionType.COLLECTION);

  return (
    <div className="p-6 max-w-7xl mx-auto mb-20">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <Banknote size={28} className="mr-3 text-red-600" /> Tahsilat Yönetimi
        </h1>
        
        {/* Scrollable Filter Group */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-w-full no-scrollbar">
           <div className="flex gap-1 min-w-max px-1">
               <button onClick={() => setFilterStatus('DEBT')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center ${filterStatus === 'DEBT' ? 'bg-slate-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
                  <AlertCircle size={14} className="mr-1.5" /> TÜM BORÇLAR
               </button>
               <button onClick={() => setFilterStatus('OVERDUE')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center ${filterStatus === 'OVERDUE' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
                  <AlertTriangle size={14} className="mr-1.5" /> GECİKENLER
               </button>
               <button onClick={() => setFilterStatus('UPCOMING')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center ${filterStatus === 'UPCOMING' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
                  <Clock size={14} className="mr-1.5" /> VADESİ GELENLER
               </button>
               <button onClick={() => setFilterStatus('HISTORY')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center ${filterStatus === 'HISTORY' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
                  <History size={14} className="mr-1.5" /> TAHSİLAT GEÇMİŞİ
               </button>
           </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" placeholder="Borçlu Müşteri ara..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <button onClick={() => setShowGeneralModal(true)} className="bg-emerald-600 text-white px-6 py-4 rounded-xl font-bold text-sm shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center whitespace-nowrap">
              <PlusCircle size={20} className="mr-2" /> Genel Tahsilat
          </button>
      </div>

      <div className="space-y-3">
        {filteredSales.map(sale => {
           const total = getGrandTotal(sale);
           const paid = sale.paidAmount || 0;
           const remaining = total - paid;
           const isFullyPaid = paid >= total - 1;
           const statusStyle = getDueStatus(sale, isFullyPaid);
           const daysDiff = sale.dueDate ? differenceInDays(new Date(), new Date(sale.dueDate)) : 0;

           return (
             <div key={sale.id} className={`bg-white rounded-xl border-l-4 shadow-sm p-4 transition-all hover:shadow-md ${statusStyle.color.replace('bg-', 'border-l-').split(' ')[0]} border-gray-100`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                         <h3 className="font-bold text-slate-800 text-lg">{sale.customerName}</h3>
                         <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${statusStyle.color} ${statusStyle.text}`}>{statusStyle.label}</span>
                         {!isFullyPaid && sale.dueDate && daysDiff > 0 && <span className="text-[9px] px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold animate-pulse">{daysDiff} GÜN GECİKTİ!</span>}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-3">
                         <span className="flex items-center"><Calendar size={12} className="mr-1"/> Satış: {format(new Date(sale.date), 'dd.MM.yyyy')}</span>
                         {sale.dueDate && <span className={`flex items-center font-bold ${isFullyPaid ? 'text-gray-400' : 'text-slate-700'}`}><Clock size={12} className="mr-1"/> Vade: {format(new Date(sale.dueDate), 'dd.MM.yyyy')}</span>}
                      </div>
                   </div>
                   <div className="flex gap-6 text-sm bg-gray-50 p-2 rounded-lg border border-gray-100 w-full md:w-auto justify-between md:justify-start">
                      <div className="text-right"><p className="text-[10px] text-gray-400 font-bold uppercase">Toplam</p><p className="font-bold text-slate-800">{total.toLocaleString('tr-TR')} ₺</p></div>
                      <div className="text-right"><p className="text-[10px] text-gray-400 font-bold uppercase">Tahsil Edilen</p><p className="font-bold text-emerald-600">{paid.toLocaleString('tr-TR')} ₺</p></div>
                      <div className="text-right min-w-[90px] border-l border-gray-200 pl-4"><p className="text-[10px] text-gray-400 font-bold uppercase">Kalan</p><p className={`font-black text-xl ${remaining > 0 ? 'text-red-600' : 'text-gray-400'}`}>{remaining.toLocaleString('tr-TR')} ₺</p></div>
                   </div>
                   <div className="flex items-center gap-2 w-full md:w-auto">
                      {!isFullyPaid && <button onClick={() => openCollectionModal(sale)} className="flex-1 md:flex-none bg-red-600 text-white px-5 py-3 rounded-lg font-bold text-xs uppercase hover:bg-red-700 shadow-sm transition-all flex items-center justify-center"><Wallet size={18} className="mr-2" /> Tahsilat</button>}
                      <button onClick={() => setShowHistoryModal(sale)} className="bg-gray-100 text-gray-600 px-3 py-3 rounded-lg hover:bg-gray-200 transition-colors" title="İşlem Geçmişi"><FileText size={18} /></button>
                   </div>
                </div>
             </div>
           );
        })}
      </div>

      {/* Sale Collection Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
              <h2 className="text-xl font-bold mb-6 border-b pb-4 flex items-center uppercase tracking-tighter text-slate-800"><Banknote className="mr-3 text-emerald-600" /> Tahsilat Girişi</h2>
              <div className="bg-red-50 p-4 rounded-xl border border-red-200 mb-6">
                 <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-red-400 uppercase">Borçlu Müşteri</span><span className="text-sm font-bold text-slate-800">{selectedSale.customerName}</span></div>
                 <div className="flex justify-between items-center text-red-700"><span className="text-xs font-bold uppercase">Toplam Kalan Borç</span><span className="text-2xl font-black">{(getGrandTotal(selectedSale) - (selectedSale.paidAmount || 0)).toLocaleString('tr-TR')} ₺</span></div>
              </div>
              <div className="space-y-4">
                 <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tahsil Edilen Tutar</label><input type="number" className="w-full p-3 border border-gray-300 rounded-xl text-lg font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500" value={collectionAmount} onChange={(e) => setCollectionAmount(e.target.value)} placeholder="0.00" /></div>
                 <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Ödeme Yöntemi</label><select className="w-full p-3 border border-gray-300 rounded-xl text-sm bg-white outline-none" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="Nakit">Nakit</option><option value="Kredi Kartı">Kredi Kartı</option><option value="Havale/EFT">Havale / EFT</option><option value="Çek/Senet">Çek / Senet</option></select></div>
                 <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Açıklama / Not</label><textarea rows={2} className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none" placeholder="Opsiyonel..." value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              </div>
              <div className="flex gap-4 mt-8"><button onClick={() => setSelectedSale(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase hover:bg-gray-200">İptal</button><button onClick={handleCollectionSubmit} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-emerald-700">Kaydet</button></div>
           </div>
        </div>
      )}

      {/* General Collection Modal */}
      {showGeneralModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
              <h2 className="text-xl font-bold mb-6 border-b pb-4 flex items-center uppercase tracking-tighter text-slate-800"><Banknote className="mr-3 text-blue-600" /> Genel Tahsilat (Fişsiz)</h2>
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Müşteri Seçin</label>
                    <select className="w-full p-3 border border-gray-300 rounded-xl text-sm bg-white outline-none" value={generalCustomerId} onChange={(e) => setGeneralCustomerId(e.target.value)}>
                        <option value="">Seçiniz...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} (Bakiye: {c.currentBalance} TL)</option>)}
                    </select>
                 </div>
                 <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tutar</label><input type="number" className="w-full p-3 border border-gray-300 rounded-xl text-lg font-bold text-blue-600 outline-none" value={generalAmount} onChange={(e) => setGeneralAmount(e.target.value)} placeholder="0.00" /></div>
                 <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Açıklama</label><textarea rows={2} className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none" placeholder="Cariye mahsuben..." value={generalDesc} onChange={(e) => setGeneralDesc(e.target.value)} /></div>
              </div>
              <div className="flex gap-4 mt-8"><button onClick={() => setShowGeneralModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase hover:bg-gray-200">İptal</button><button onClick={handleGeneralCollectionSubmit} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-blue-700">Tahsil Et</button></div>
           </div>
        </div>
      )}

      {/* History Modal (Same as before) */}
      {showHistoryModal && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 flex flex-col max-h-[80vh]">
               <div className="flex justify-between items-center mb-6 pb-4 border-b"><h2 className="text-lg font-bold text-slate-800 uppercase flex items-center"><History size={20} className="mr-2 text-gray-500" /> Tahsilat Geçmişi</h2><button onClick={() => setShowHistoryModal(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">✕</button></div>
               <div className="overflow-y-auto flex-1 pr-2">
                  {getTransactionHistory(showHistoryModal.customerId || '').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(trans => (
                        <div key={trans.id} className="mb-3 border-l-4 border-green-500 bg-gray-50 p-3 rounded-r-lg shadow-sm">
                           <div className="flex justify-between items-center mb-2">
                               <div className="flex items-center gap-2">
                                   <span className="text-xs text-gray-500 font-bold flex items-center"><Calendar size={12} className="mr-1"/> {format(new Date(trans.date), 'dd.MM.yyyy HH:mm')}</span>
                                   {/* Etiket Ekleme */}
                                   {trans.saleId ? (
                                       <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase">FİŞ NO: {trans.saleId.substring(0,6)}</span>
                                   ) : (
                                       <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 uppercase flex items-center"><Tag size={10} className="mr-1"/> GENEL</span>
                                   )}
                               </div>
                               <span className="font-black text-green-600">{trans.amount.toLocaleString('tr-TR')} ₺</span>
                           </div>
                           <p className="text-xs text-slate-600 mb-2 italic">"{trans.description}"</p>
                           <div className="flex items-center justify-end text-[10px] text-indigo-600 font-bold border-t border-gray-200 pt-2 mt-1"><UserCheck size={12} className="mr-1" /> İşlemi Yapan: {trans.personnelName}</div>
                        </div>
                     ))}
                  {getTransactionHistory(showHistoryModal.customerId || '').length === 0 && <p className="text-center text-gray-400 text-sm py-8 italic">Henüz bir tahsilat kaydı bulunmuyor.</p>}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

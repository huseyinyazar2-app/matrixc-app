
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCost, RawMaterialCost, OtherCost } from '../types';
import { Calculator, Save, Plus, Trash2, Box, Package, AlertCircle, Scale } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const Costs: React.FC = () => {
  const { products, productCosts, saveProductCost } = useStore();
  
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productNetWeight, setProductNetWeight] = useState<string>(''); // Ürünün toplam ağırlığı
  
  // Current Calculation State
  const [rawMaterials, setRawMaterials] = useState<RawMaterialCost[]>([]);
  const [otherCosts, setOtherCosts] = useState<OtherCost[]>([]);
  
  // New Entry State
  const [newMaterial, setNewMaterial] = useState({ name: '', unitPrice: '', usagePercent: '' });
  const [newOtherCost, setNewOtherCost] = useState({ name: '', unitCost: '' });
  
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Load existing cost data when product is selected
  useEffect(() => {
    if (selectedProductId) {
      const existingCost = productCosts.find(c => c.productId === selectedProductId);
      if (existingCost) {
        setRawMaterials(existingCost.rawMaterials);
        setOtherCosts(existingCost.otherCosts);
        setProductNetWeight(existingCost.productNetWeight?.toString() || '');
      } else {
        setRawMaterials([]);
        setOtherCosts([]);
        setProductNetWeight('');
      }
    } else {
      setRawMaterials([]);
      setOtherCosts([]);
      setProductNetWeight('');
    }
  }, [selectedProductId, productCosts]);

  // --- CALCULATIONS ---

  const calculateMaterialCost = (material: RawMaterialCost) => {
    const netWeight = parseFloat(productNetWeight) || 0;
    if (netWeight <= 0) return 0;
    
    // Formül: (Toplam Ağırlık * (Yüzde / 100)) * Birim Fiyat
    const usedAmount = netWeight * (material.usagePercent / 100);
    return usedAmount * material.unitPrice;
  };

  const totalMaterialCost = rawMaterials.reduce((sum, m) => sum + calculateMaterialCost(m), 0);
  const totalOtherCost = otherCosts.reduce((sum, o) => sum + o.unitCost, 0);
  const totalProductionCost = totalMaterialCost + totalOtherCost;
  
  const sellingPrice = selectedProduct?.sellPrice || 0; // Sell Price is now Base Price (Excl Tax)
  const profit = sellingPrice - totalProductionCost;
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  // --- HANDLERS ---

  const addRawMaterial = () => {
    if (!productNetWeight || parseFloat(productNetWeight) <= 0) {
        alert('Lütfen önce sol menüden ürünün net ağırlığını/hacmini giriniz.');
        return;
    }
    if (!newMaterial.name || !newMaterial.unitPrice || !newMaterial.usagePercent) {
       alert('Lütfen tüm hammadde bilgilerini doldurun.');
       return;
    }
    const mat: RawMaterialCost = {
      id: generateId(),
      name: newMaterial.name,
      unitPrice: parseFloat(newMaterial.unitPrice),
      usagePercent: parseFloat(newMaterial.usagePercent)
    };
    setRawMaterials([...rawMaterials, mat]);
    setNewMaterial({ name: '', unitPrice: '', usagePercent: '' });
  };

  const removeRawMaterial = (id: string) => {
    setRawMaterials(prev => prev.filter(m => m.id !== id));
  };

  const addOtherCost = () => {
    if (!newOtherCost.name || !newOtherCost.unitCost) {
      alert('Lütfen gider adı ve maliyetini girin.');
      return;
    }
    const cost: OtherCost = {
      id: generateId(),
      name: newOtherCost.name,
      unitCost: parseFloat(newOtherCost.unitCost)
    };
    setOtherCosts([...otherCosts, cost]);
    setNewOtherCost({ name: '', unitCost: '' });
  };

  const removeOtherCost = (id: string) => {
    setOtherCosts(prev => prev.filter(o => o.id !== id));
  };

  const handleSave = async () => {
    if (!selectedProductId) return;
    if (!productNetWeight || parseFloat(productNetWeight) <= 0) {
        alert('Lütfen ürünün net ağırlığını giriniz.');
        return;
    }

    const costRecord: ProductCost = {
      productId: selectedProductId,
      productNetWeight: parseFloat(productNetWeight),
      rawMaterials,
      otherCosts,
      totalCost: totalProductionCost,
      lastUpdated: new Date().toISOString()
    };

    await saveProductCost(costRecord);
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 3000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto mb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <Calculator size={28} className="mr-3 text-indigo-600" /> Ürün Maliyet Hesaplama
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: SELECTION & SUMMARY */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Hesaplama Yapılacak Ürün</label>
              <select 
                className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedProductId} 
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="">Ürün Seçiniz...</option>
                {products.map(p => (
                   <option key={p.id} value={p.id}>{p.baseName} - {p.variantName}</option>
                ))}
              </select>
              
              {selectedProduct && (
                 <div className="mt-6 space-y-4">
                    {/* ÜRÜN AĞIRLIĞI GİRİŞİ */}
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                        <label className="block text-xs font-bold text-orange-700 uppercase mb-2 flex items-center">
                           <Scale size={14} className="mr-1.5" /> Ürün Net Ağırlığı / Hacmi
                        </label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                className="w-full p-2 text-sm font-bold text-slate-800 border border-orange-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Örn: 5, 20, 0.5"
                                value={productNetWeight}
                                onChange={(e) => setProductNetWeight(e.target.value)}
                            />
                            <span className="text-xs font-bold text-orange-600">KG / LT</span>
                        </div>
                        <p className="text-[10px] text-orange-600 mt-2 leading-tight">
                            * Hammadde kullanım miktarları buraya girdiğiniz toplama göre yüzde (%) üzerinden hesaplanacaktır.
                        </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                       <p className="text-xs text-gray-500 uppercase font-bold">Mevcut Satış Fiyatı (KDV Hariç)</p>
                       <p className="text-2xl font-black text-slate-800">{selectedProduct.sellPrice.toLocaleString('tr-TR')} ₺</p>
                    </div>

                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                       <p className="text-xs text-indigo-500 uppercase font-bold">Hesaplanan Maliyet</p>
                       <p className="text-2xl font-black text-indigo-700">{totalProductionCost.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</p>
                    </div>

                    <div className={`p-4 rounded-lg border ${profit > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                       <p className={`text-xs uppercase font-bold ${profit > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          Tahmini Kâr / Zarar
                       </p>
                       <div className="flex items-end gap-2">
                          <p className={`text-2xl font-black ${profit > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                             {profit.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
                          </p>
                          <p className={`text-sm font-bold mb-1 ${profit > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                             (%{margin.toFixed(1)})
                          </p>
                       </div>
                    </div>

                    <button 
                       onClick={handleSave}
                       className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 flex justify-center items-center gap-2 uppercase text-xs tracking-wider"
                    >
                       <Save size={16} /> Maliyeti Kaydet
                    </button>
                    {showSavedMsg && (
                      <div className="text-center bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold text-xs uppercase animate-pulse border border-green-200">
                        Başarıyla Kaydedildi
                      </div>
                    )}
                 </div>
              )}
           </div>
           
           {!selectedProduct && (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                 <Package size={48} className="mx-auto mb-3 opacity-20" />
                 <p className="text-sm">Maliyet hesabı yapmak için lütfen listeden bir ürün seçin.</p>
              </div>
           )}
        </div>

        {/* RIGHT COLUMN: DETAILS */}
        {selectedProduct && (
          <div className="lg:col-span-2 space-y-6">
             
             {/* 1. HAMMADDE GİDERLERİ */}
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                   <h3 className="font-bold text-slate-800 flex items-center">
                      <Box className="mr-2 text-indigo-600" size={20} /> Hammadde Maliyetleri (% Bazlı)
                   </h3>
                   <span className="text-xs font-black text-slate-500 bg-white px-2 py-1 rounded border">TOPLAM: {totalMaterialCost.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</span>
                </div>
                
                <div className="p-4">
                   <table className="w-full text-left mb-4">
                      <thead className="text-[10px] uppercase text-gray-500 bg-gray-50">
                         <tr>
                            <th className="p-2 rounded-l-lg">Hammadde Adı</th>
                            <th className="p-2 text-right">Birim Fiyat (KG/LT)</th>
                            <th className="p-2 text-right">Kullanım Oranı (%)</th>
                            <th className="p-2 text-right">Kullanılan Miktar</th>
                            <th className="p-2 text-right">Maliyet</th>
                            <th className="p-2 rounded-r-lg w-10"></th>
                         </tr>
                      </thead>
                      <tbody className="text-xs">
                         {rawMaterials.map(m => {
                            const netWeight = parseFloat(productNetWeight) || 0;
                            const usedAmount = netWeight * (m.usagePercent / 100);
                            return (
                                <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                <td className="p-3 font-bold text-slate-700">{m.name}</td>
                                <td className="p-3 text-right text-gray-500">{m.unitPrice.toLocaleString()} ₺</td>
                                <td className="p-3 text-right font-bold text-blue-600">%{m.usagePercent}</td>
                                <td className="p-3 text-right font-medium text-gray-600">
                                    {netWeight > 0 ? `${usedAmount.toFixed(3)} birim` : '-'}
                                </td>
                                <td className="p-3 text-right font-black text-slate-800">
                                    {calculateMaterialCost(m).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
                                </td>
                                <td className="p-3 text-right">
                                    <button onClick={() => removeRawMaterial(m.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                </td>
                                </tr>
                            );
                         })}
                         {rawMaterials.length === 0 && (
                            <tr><td colSpan={6} className="p-4 text-center text-gray-400 italic">Henüz hammadde eklenmedi.</td></tr>
                         )}
                      </tbody>
                   </table>

                   {/* Add New Material Form */}
                   <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                      <div className="md:col-span-1">
                         <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Hammadde Adı</label>
                         <input type="text" className="w-full p-2 text-xs border border-indigo-200 rounded outline-none" placeholder="Örn: X Kimyasalı" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} />
                      </div>
                      <div>
                         <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Birim Alış Fiyatı (1 KG/LT)</label>
                         <input type="number" className="w-full p-2 text-xs border border-indigo-200 rounded outline-none" placeholder="1000 TL" value={newMaterial.unitPrice} onChange={e => setNewMaterial({...newMaterial, unitPrice: e.target.value})} />
                      </div>
                      <div>
                         <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Kullanım Oranı (%)</label>
                         <input type="number" className="w-full p-2 text-xs border border-indigo-200 rounded outline-none" placeholder="%10" value={newMaterial.usagePercent} onChange={e => setNewMaterial({...newMaterial, usagePercent: e.target.value})} />
                      </div>
                      <button onClick={addRawMaterial} className="md:col-span-1 bg-indigo-600 text-white p-2 rounded text-xs font-bold uppercase hover:bg-indigo-700 flex justify-center items-center">
                         <Plus size={14} className="mr-1"/> Listeye Ekle
                      </button>
                   </div>
                   {!productNetWeight && (
                     <div className="mt-2 text-[10px] text-red-500 font-bold flex items-center">
                        <AlertCircle size={12} className="mr-1"/> Önce sol taraftan ürün ağırlığı girilmelidir.
                     </div>
                   )}
                </div>
             </div>

             {/* 2. SABİT GİDERLER (AMBALAJ VB) */}
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                   <h3 className="font-bold text-slate-800 flex items-center">
                      <Package className="mr-2 text-orange-600" size={20} /> Ambalaj ve Sabit Giderler
                   </h3>
                   <span className="text-xs font-black text-slate-500 bg-white px-2 py-1 rounded border">TOPLAM: {totalOtherCost.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</span>
                </div>
                
                <div className="p-4">
                   <table className="w-full text-left mb-4">
                      <thead className="text-[10px] uppercase text-gray-500 bg-gray-50">
                         <tr>
                            <th className="p-2 rounded-l-lg">Gider Kalemi</th>
                            <th className="p-2 text-right">Birim Maliyet</th>
                            <th className="p-2 rounded-r-lg w-10"></th>
                         </tr>
                      </thead>
                      <tbody className="text-xs">
                         {otherCosts.map(o => (
                            <tr key={o.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                               <td className="p-3 font-bold text-slate-700">{o.name}</td>
                               <td className="p-3 text-right font-black text-slate-800">{o.unitCost.toLocaleString('tr-TR')} ₺</td>
                               <td className="p-3 text-right">
                                  <button onClick={() => removeOtherCost(o.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                               </td>
                            </tr>
                         ))}
                         {otherCosts.length === 0 && (
                            <tr><td colSpan={3} className="p-4 text-center text-gray-400 italic">Ekstra gider eklenmedi.</td></tr>
                         )}
                      </tbody>
                   </table>

                   <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                      <div className="md:col-span-2">
                         <label className="block text-[10px] font-bold text-orange-400 uppercase mb-1">Gider Adı (Şişe, Etiket vb.)</label>
                         <input type="text" className="w-full p-2 text-xs border border-orange-200 rounded outline-none" placeholder="Örn: 1L Plastik Şişe" value={newOtherCost.name} onChange={e => setNewOtherCost({...newOtherCost, name: e.target.value})} />
                      </div>
                      <div>
                         <label className="block text-[10px] font-bold text-orange-400 uppercase mb-1">Birim Maliyet (TL)</label>
                         <input type="number" className="w-full p-2 text-xs border border-orange-200 rounded outline-none" placeholder="5.50" value={newOtherCost.unitCost} onChange={e => setNewOtherCost({...newOtherCost, unitCost: e.target.value})} />
                      </div>
                      <button onClick={addOtherCost} className="md:col-span-3 bg-orange-600 text-white p-2 rounded text-xs font-bold uppercase hover:bg-orange-700 flex justify-center items-center mt-2">
                         <Plus size={14} className="mr-1"/> Listeye Ekle
                      </button>
                   </div>
                </div>
             </div>

          </div>
        )}
      </div>
    </div>
  );
};


import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { AlertTriangle, TrendingUp, Wallet, Box, Truck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { generateBusinessInsights } from '../services/geminiService';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { UserRole, SaleStatus } from '../types';

export const Dashboard: React.FC = () => {
  const { products, sales, customers, currentUser } = useStore();
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  // --- CALCULATIONS ---

  // 1. Total Revenue (Sales are already filtered by StoreContext for Personnel)
  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);

  // 2. Total Receivables (Conditional Logic)
  const totalReceivables = useMemo(() => {
      if (currentUser?.role === UserRole.ADMIN) {
          // Admin: Sees Global Debt from Customer Ledger balances
          return customers.reduce((acc, c) => acc + (c.currentBalance < 0 ? Math.abs(c.currentBalance) : 0), 0);
      } else {
          // Personnel: Sees only outstanding debt from THEIR OWN sales
          return sales.reduce((acc, sale) => {
              if (sale.status !== SaleStatus.ACTIVE) return acc;

              // Calculate Grand Total for this specific sale
              let saleTotal = (sale.totalAmount * 1.20) + (sale.shippingCost || 0);
              
              // Handle Gift Logic
              if (sale.type === 'GIFT') {
                  if (sale.shippingPayer === 'COMPANY' || sale.shippingPayer === 'NONE') saleTotal = 0;
                  else if (sale.shippingPayer === 'CUSTOMER') saleTotal = (sale.shippingCost || 0);
              }

              const paid = sale.paidAmount || 0;
              const remaining = Math.max(0, saleTotal - paid);
              
              return acc + remaining;
          }, 0);
      }
  }, [customers, sales, currentUser]);

  const lowStockProducts = products.filter(p => p.stockQuantity <= p.lowStockThreshold);
  const pendingShipments = sales.filter(s => s.deliveryStatus === 'BEKLIYOR');

  // Chart Data (Last 7 sales)
  const chartData = sales.slice(0, 7).reverse().map(s => ({
    date: format(new Date(s.date), 'dd MMM', { locale: tr }),
    tutar: s.totalAmount
  }));

  const handleAIAnalysis = async () => {
    setLoadingInsight(true);
    // For AI, if personnel, we might want to filter customers strictly associated with their sales, 
    // but typically AI needs context. For now, passing data as is (sales is filtered).
    const result = await generateBusinessInsights(sales, products, customers);
    setInsight(result);
    setLoadingInsight(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto mb-20 sm:mb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Gösterge Paneli</h1>
        <button 
          onClick={handleAIAnalysis}
          disabled={loadingInsight}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center"
        >
          {loadingInsight ? 'Analiz Yapılıyor...' : '✨ Yapay Zeka Analizi'}
        </button>
      </div>

      {insight && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-100 shadow-sm">
          <h3 className="font-semibold text-purple-800 mb-2 flex items-center">
            <span className="text-xl mr-2">🤖</span> Gemini İş Analizi
          </h3>
          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line">
            {insight}
          </div>
        </div>
      )}

      {/* Bekleyen Kargo Uyarı Bannerı */}
      {pendingShipments.length > 0 && (
        <Link to="/shipping" className="block">
          <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between hover:bg-indigo-700 transition-all group">
            <div className="flex items-center">
              <div className="p-2 bg-white/20 rounded-lg mr-4">
                <Truck className="animate-bounce" size={24} />
              </div>
              <div>
                <p className="font-bold text-lg leading-tight">Teslimat Bekleyen Siparişler!</p>
                <p className="text-indigo-100 text-sm">Şu an gönderilmeyi bekleyen <span className="font-black text-white">{pendingShipments.length}</span> adet kargo bulunuyor.</p>
              </div>
            </div>
            <div className="hidden sm:block font-black text-xs uppercase bg-white/10 px-3 py-1 rounded-full group-hover:bg-white/20">Hemen Yönet →</div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Toplam Ciro (Siz)</p>
              <p className="text-2xl font-bold text-slate-900">{totalRevenue.toLocaleString('tr-TR')} ₺</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full text-green-600">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                  {currentUser?.role === UserRole.ADMIN ? 'Toplam Alacak (Tümü)' : 'Tahsil Edilecek (Siz)'}
              </p>
              <p className="text-2xl font-bold text-red-600">{totalReceivables.toLocaleString('tr-TR')} ₺</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full text-red-600">
              <Wallet size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Stok Kalemi (Varyant)</p>
              <p className="text-2xl font-bold text-slate-900">{products.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <Box size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Kritik Stok</p>
              <p className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full text-orange-600">
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Son Satışlar Grafiği</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`${value} ₺`, 'Tutar']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="tutar" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center text-orange-600">
             <AlertTriangle className="mr-2" size={20} />
             Kritik Stok Uyarısı
          </h2>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {lowStockProducts.length === 0 ? (
              <p className="text-gray-500 text-sm">Stok sorunu olan ürün yok.</p>
            ) : (
              lowStockProducts.map(product => (
                <div key={product.id} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div>
                    <p className="font-medium text-slate-800">{product.baseName}</p>
                    <p className="text-xs text-slate-500">{product.variantName}</p>
                  </div>
                  <span className="bg-white text-orange-600 font-bold px-2 py-1 rounded shadow-sm text-sm">
                    {product.stockQuantity} Adet
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

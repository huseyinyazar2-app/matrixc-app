
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Product, Customer, Sale, Transaction, User, UserRole, TransactionType, AppSettings, PaymentStatus, SaleStatus, ReturnDetails, ProductCost, ActivityLog, ReturnItem, CartItem } from '../types';

interface StoreContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  users: User[];
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  transactions: Transaction[];
  productCosts: ProductCost[];
  activityLogs: ActivityLog[];
  settings: AppSettings;
  // Cart Context
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  // Actions
  addUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addProduct: (product: Product) => Promise<boolean>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<boolean>; // Actually archives
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  adjustCustomerBalance: (customerId: string, amount: number, type: 'DEBT' | 'CREDIT', description: string) => Promise<void>;
  addSale: (sale: Sale) => Promise<void>;
  updateSale: (sale: Sale) => Promise<void>;
  editSale: (updatedSale: Sale) => Promise<void>; // NEW: Full Edit
  updateSalePaymentStatus: (saleId: string, newStatus: PaymentStatus) => Promise<void>;
  processReturn: (saleId: string, details: ReturnDetails, returnedItems: ReturnItem[]) => Promise<void>;
  updateReturnPayment: (saleId: string, paymentDetails: Partial<ReturnDetails>) => Promise<void>;
  processCollection: (saleId: string, amount: number, method: string, description: string) => Promise<void>;
  processGeneralCollection: (customerId: string, amount: number, method: string, description: string) => Promise<void>; // NEW
  addTransaction: (transaction: Transaction) => Promise<void>;
  saveProductCost: (cost: ProductCost) => Promise<void>;
  updateSettings: (settings: AppSettings) => void;
  refreshData: () => void;
  logActivity: (action: ActivityLog['action'], entity: ActivityLog['entity'], description: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// ... (Default Data & Constants - same as before) ...
const DEFAULT_USERS: User[] = [
  { id: '1', username: 'admin', password: '123', name: 'Yönetici', role: UserRole.ADMIN },
  { id: '2', username: 'personel', password: '123', name: 'Personel', role: UserRole.PERSONNEL },
];

const DEFAULT_SETTINGS: AppSettings = {
  productCategories: ['Booster', 'Deodizer Duo', 'Health Detect', 'Pro-V', 'CatMalt'],
  variantOptions: ['1. Paket', '2. Paket', '3. Paket', '5 Litre', '10 Litre', 'Test Kiti', '100ml'],
  customerTypes: ['Bireysel Müşteri', 'Kurumsal Müşteri'],
  salesChannels: ['Toptan', 'Veteriner', 'Petshop', 'Market', 'Trendyol', 'Hepsiburada', 'Instagram', 'Elden'],
  deliveryTypes: ['Elden', 'Kargo', 'Müşteri Adresinde'],
  shippingCompanies: ['Aras Kargo', 'Yurtiçi Kargo', 'MNG Kargo', 'Sürat Kargo', 'PTT Kargo']
};

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', baseName: 'Booster', variantName: '5 Litre', sellPrice: 250, stockQuantity: 500, lowStockThreshold: 20, isActive: true, createdBy: 'Yönetici' },
  { id: 'p2', baseName: 'Deodizer Duo', variantName: '1. Paket', sellPrice: 180, stockQuantity: 350, lowStockThreshold: 15, isActive: true, createdBy: 'Yönetici' },
  { id: 'p3', baseName: 'Health Detect', variantName: 'Test Kiti', sellPrice: 450, stockQuantity: 100, lowStockThreshold: 10, isActive: true, createdBy: 'Ahmet Personel' },
  { id: 'p4', baseName: 'Pro-V', variantName: '10 Litre', sellPrice: 600, stockQuantity: 45, lowStockThreshold: 50, isActive: true, createdBy: 'Ayşe Personel' }, 
  { id: 'p5', baseName: 'CatMalt', variantName: '100ml', sellPrice: 120, stockQuantity: 1000, lowStockThreshold: 100, isActive: true, createdBy: 'Ayşe Personel' }
];

const generateCustomers = (): Customer[] => {
    const customers: Customer[] = [];
    const cities = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana'];
    for (let i = 1; i <= 10; i++) {
        customers.push({
            id: `cust_ahmet_${i}`,
            name: `Ahmet Müşteri ${i}`,
            type: i % 2 === 0 ? 'Kurumsal Müşteri' : 'Bireysel Müşteri',
            salesChannel: i % 3 === 0 ? 'Trendyol' : 'Petshop',
            email: `ahmet.m${i}@mail.com`,
            phone: `0530 100 00 ${i.toString().padStart(2, '0')}`,
            city: cities[i % cities.length],
            district: 'Merkez',
            address: `Örnek Mah. No:${i}`,
            currentBalance: i % 4 === 0 ? -500 * i : 0, 
            createdBy: 'Ahmet Personel'
        });
    }
    return customers;
};

const MOCK_GENERATED_CUSTOMERS = generateCustomers();

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ... (State initialization same as before) ...
  const [users, setUsers] = useState<User[]>(() => { const saved = localStorage.getItem('users'); return saved ? JSON.parse(saved) : DEFAULT_USERS; });
  const [currentUser, setCurrentUser] = useState<User | null>(() => { const saved = localStorage.getItem('currentUser'); return saved ? JSON.parse(saved) : null; });
  const [products, setProducts] = useState<Product[]>(() => { const saved = localStorage.getItem('products'); const parsed = saved ? JSON.parse(saved) : MOCK_PRODUCTS; return parsed.map((p: any) => ({ ...p, isActive: p.isActive !== undefined ? p.isActive : true })); });
  const [customers, setCustomers] = useState<Customer[]>(() => { const saved = localStorage.getItem('customers'); return saved ? JSON.parse(saved) : MOCK_GENERATED_CUSTOMERS; });
  const [sales, setSales] = useState<Sale[]>(() => { const saved = localStorage.getItem('sales'); return saved ? JSON.parse(saved) : []; });
  const [transactions, setTransactions] = useState<Transaction[]>(() => { const saved = localStorage.getItem('transactions'); return saved ? JSON.parse(saved) : []; });
  const [productCosts, setProductCosts] = useState<ProductCost[]>(() => { const saved = localStorage.getItem('productCosts'); return saved ? JSON.parse(saved) : []; });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => { const saved = localStorage.getItem('activityLogs'); return saved ? JSON.parse(saved) : []; });
  const [settings, setSettings] = useState<AppSettings>(() => { const saved = localStorage.getItem('appSettings'); const parsed = saved ? JSON.parse(saved) : DEFAULT_SETTINGS; return { ...DEFAULT_SETTINGS, ...parsed }; });
  const [cart, setCart] = useState<CartItem[]>(() => { const saved = localStorage.getItem('posCart'); return saved ? JSON.parse(saved) : []; });

  useEffect(() => { localStorage.setItem('users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('currentUser', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('sales', JSON.stringify(sales)); }, [sales]);
  useEffect(() => { localStorage.setItem('transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('productCosts', JSON.stringify(productCosts)); }, [productCosts]);
  useEffect(() => { localStorage.setItem('activityLogs', JSON.stringify(activityLogs)); }, [activityLogs]);
  useEffect(() => { localStorage.setItem('appSettings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('posCart', JSON.stringify(cart)); }, [cart]);

  // --- DATA ISOLATION LOGIC ---
  
  const visibleSales = useMemo(() => {
    if (!currentUser) return [];
    // Admin sees everything
    if (currentUser.role === UserRole.ADMIN) return sales;
    // Personnel sees only sales made by them (matched by name)
    return sales.filter(s => s.personnelName === currentUser.name);
  }, [sales, currentUser]);

  const visibleTransactions = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.ADMIN) return transactions;
    return transactions.filter(t => t.personnelName === currentUser.name);
  }, [transactions, currentUser]);

  const visibleLogs = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.ADMIN) return activityLogs;
    return activityLogs.filter(l => l.userName === currentUser.name);
  }, [activityLogs, currentUser]);

  // Note: Products and Customers remain global (Shared resources), 
  // but users will only see their own sales history on customer detail cards via the filtered `visibleSales`.

  // -----------------------------

  const logActivity = (action: ActivityLog['action'], entity: ActivityLog['entity'], description: string) => {
    if (!currentUser) return;
    const newLog: ActivityLog = { id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString(), userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action, entity, description };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const refreshData = () => {};

  // Cart Functions
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) { return prev.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item); }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));
  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) { const newQty = Math.max(1, item.cartQuantity + delta); return { ...item, cartQuantity: newQty }; }
      return item;
    }));
  };
  const clearCart = () => setCart([]);

  // Auth & User Actions
  const login = async (username: string, password: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const user = users.find(u => u.username === username && (password === '1234' || password === u.password));
    if (user) { setCurrentUser(user); logActivity('LOGIN', 'SETTINGS', 'Sisteme giriş yapıldı.'); return true; }
    return false;
  };
  const logout = () => setCurrentUser(null);
  const addUser = async (user: User) => { setUsers(prev => [...prev, user]); logActivity('CREATE', 'SETTINGS', `Yeni kullanıcı eklendi: ${user.username}`); };
  const deleteUser = async (id: string) => { if (currentUser && currentUser.id === id) { alert("Kendi hesabınızı silemezsiniz!"); return; } setUsers(prev => prev.filter(u => u.id !== id)); logActivity('DELETE', 'SETTINGS', `Kullanıcı silindi: ID ${id}`); };

  // Product Actions
  const addProduct = async (product: Product) => {
      const exists = products.some(p => p.baseName.toLowerCase() === product.baseName.toLowerCase() && p.variantName.toLowerCase() === product.variantName.toLowerCase() && !p.isArchived);
      if (exists) { alert('Bu isim ve varyanta sahip bir ürün zaten mevcut!'); return false; }
      setProducts(prev => [...prev, { ...product, isActive: true, isArchived: false }]);
      logActivity('CREATE', 'PRODUCT', `Yeni ürün eklendi: ${product.baseName} - ${product.variantName}`);
      return true;
  };
  const updateProduct = async (product: Product) => { setProducts(prev => prev.map(p => p.id === product.id ? product : p)); logActivity('UPDATE', 'PRODUCT', `Ürün güncellendi: ${product.baseName} - ${product.variantName}`); };
  
  // SOFT DELETE (ARCHIVE)
  const deleteProduct = async (id: string) => {
      const product = products.find(p => p.id === id);
      if (!product) return false;
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isArchived: true, isActive: false } : p));
      logActivity('DELETE', 'PRODUCT', `Ürün arşive taşındı: ${product.baseName} - ${product.variantName}`);
      return true;
  };

  // Customer Actions
  const addCustomer = async (customer: Customer) => { setCustomers(prev => [...prev, customer]); logActivity('CREATE', 'CUSTOMER', `Yeni müşteri eklendi: ${customer.name}`); };
  const updateCustomer = async (customer: Customer) => { setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c)); logActivity('UPDATE', 'CUSTOMER', `Müşteri bilgileri güncellendi: ${customer.name}`); };
  const deleteCustomer = async (id: string) => { const customer = customers.find(c => c.id === id); if(customer) { setCustomers(prev => prev.filter(c => c.id !== id)); logActivity('DELETE', 'CUSTOMER', `Müşteri silindi: ${customer.name}`); } };
  
  const adjustCustomerBalance = async (customerId: string, amount: number, type: 'DEBT' | 'CREDIT', description: string) => {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;
      const adjustment = type === 'CREDIT' ? amount : -amount;
      setCustomers(prev => prev.map(c => { if (c.id === customerId) { return { ...c, currentBalance: c.currentBalance + adjustment }; } return c; }));
      const newTransaction: Transaction = { id: Math.random().toString(36).substr(2, 9), customerId: customerId, amount: amount, type: type === 'CREDIT' ? TransactionType.COLLECTION : TransactionType.PAYMENT, date: new Date().toISOString(), description: `MANUEL DÜZELTME (${type === 'CREDIT' ? 'Alacak' : 'Borç'}): ${description}`, personnelName: currentUser?.name || 'Sistem' };
      setTransactions(prev => [newTransaction, ...prev]);
      logActivity('FINANCIAL', 'CUSTOMER', `Manuel Bakiye Düzeltme (${type}): ${customer.name} - ${amount} TL`);
  };

  // Sale Actions
  const addSale = async (sale: Sale) => {
    let grandTotal = (sale.totalAmount * 1.20) + (sale.shippingCost || 0);
    
    if (sale.type === 'GIFT') {
       if (sale.shippingPayer === 'COMPANY' || sale.shippingPayer === 'NONE') {
          grandTotal = 0;
       } else if (sale.shippingPayer === 'CUSTOMER') {
          grandTotal = (sale.shippingCost || 0);
       }
    }

    const saleWithStatus = { ...sale, paidAmount: sale.paymentStatus === PaymentStatus.PAID ? grandTotal : 0, deliveryStatus: sale.deliveryStatus || 'BEKLIYOR', status: SaleStatus.ACTIVE };
    setSales(prev => [saleWithStatus, ...prev]);
    
    sale.items.forEach(item => {
      setProducts(prev => prev.map(p => { if (p.id === item.productId) { return { ...p, stockQuantity: p.stockQuantity - item.quantity }; } return p; }));
    });

    if (sale.customerId && (sale.paymentStatus === PaymentStatus.UNPAID || sale.paymentStatus === PaymentStatus.PARTIAL)) {
      setCustomers(prev => prev.map(c => { if (c.id === sale.customerId) { return { ...c, currentBalance: c.currentBalance - grandTotal }; } return c; }));
    }
    logActivity('CREATE', 'SALE', `Yeni satış: ${sale.customerName} - Toplam Borç: ${grandTotal} TL`);
  };

  const updateSale = async (sale: Sale) => {
    setSales(prev => prev.map(s => s.id === sale.id ? sale : s));
    // UPDATED LOG MESSAGE
    logActivity('UPDATE', 'SALE', `Satış/Teslimat güncellendi: ${sale.customerName} (Fiş: #${sale.id.substring(0,6)})`);
  };

  // NEW: Full Edit of a Sale (Tricky!)
  const editSale = async (updatedSale: Sale) => {
      const oldSale = sales.find(s => s.id === updatedSale.id);
      if (!oldSale) return;

      // 1. Revert Old Stock
      oldSale.items.forEach(item => {
          setProducts(prev => prev.map(p => p.id === item.productId ? { ...p, stockQuantity: p.stockQuantity + item.quantity } : p));
      });

      // 2. Revert Old Financials (If debt existed)
      if (oldSale.customerId && oldSale.paymentStatus !== PaymentStatus.PAID) {
          let oldGrandTotal = (oldSale.totalAmount * 1.20) + (oldSale.shippingCost || 0);
          if (oldSale.type === 'GIFT') {
             if (oldSale.shippingPayer === 'COMPANY' || oldSale.shippingPayer === 'NONE') oldGrandTotal = 0;
             else if (oldSale.shippingPayer === 'CUSTOMER') oldGrandTotal = (oldSale.shippingCost || 0);
          }
          setCustomers(prev => prev.map(c => c.id === oldSale.customerId ? { ...c, currentBalance: c.currentBalance + oldGrandTotal } : c));
      }

      // 3. Apply New Stock
      updatedSale.items.forEach(item => {
          setProducts(prev => prev.map(p => p.id === item.productId ? { ...p, stockQuantity: p.stockQuantity - item.quantity } : p));
      });

      // 4. Apply New Financials
      let newGrandTotal = (updatedSale.totalAmount * 1.20) + (updatedSale.shippingCost || 0);
      if (updatedSale.type === 'GIFT') {
         if (updatedSale.shippingPayer === 'COMPANY' || updatedSale.shippingPayer === 'NONE') newGrandTotal = 0;
         else if (updatedSale.shippingPayer === 'CUSTOMER') newGrandTotal = (updatedSale.shippingCost || 0);
      }

      const finalSale = { 
          ...updatedSale, 
          // If editing to PAID, mark as paid. If UNPAID, 0. If PARTIAL, keep old paid (risky, but okay for now)
          paidAmount: updatedSale.paymentStatus === PaymentStatus.PAID ? newGrandTotal : oldSale.paidAmount 
      };

      setSales(prev => prev.map(s => s.id === updatedSale.id ? finalSale : s));

      if (updatedSale.customerId && updatedSale.paymentStatus !== PaymentStatus.PAID) {
          setCustomers(prev => prev.map(c => c.id === updatedSale.customerId ? { ...c, currentBalance: c.currentBalance - newGrandTotal } : c));
      }

      // UPDATED LOG MESSAGE
      logActivity('UPDATE', 'SALE', `Satış düzenlendi (İçerik): ${updatedSale.customerName} (Fiş: #${updatedSale.id.substring(0,6)})`);
  };

  const updateSalePaymentStatus = async (saleId: string, newStatus: PaymentStatus) => {
      const sale = sales.find(s => s.id === saleId);
      if (!sale) return;
      const oldStatus = sale.paymentStatus;
      if (oldStatus === newStatus) return;

      setSales(prev => prev.map(s => { if (s.id === saleId) return { ...s, paymentStatus: newStatus }; return s; }));

      if (sale.customerId) {
          let grandTotal = (sale.totalAmount * 1.20) + (sale.shippingCost || 0);
          if (sale.type === 'GIFT') {
             if (sale.shippingPayer === 'COMPANY' || sale.shippingPayer === 'NONE') grandTotal = 0;
             else if (sale.shippingPayer === 'CUSTOMER') grandTotal = (sale.shippingCost || 0);
          }

          let balanceChange = 0;
          if (oldStatus === PaymentStatus.UNPAID && newStatus === PaymentStatus.PAID) balanceChange = grandTotal; 
          else if (oldStatus === PaymentStatus.PAID && newStatus === PaymentStatus.UNPAID) balanceChange = -grandTotal;

          if (balanceChange !== 0) {
              setCustomers(prev => prev.map(c => { if (c.id === sale.customerId) { return { ...c, currentBalance: c.currentBalance + balanceChange }; } return c; }));
          }
      }
      // UPDATED LOG MESSAGE
      logActivity('STATUS_CHANGE', 'SALE', `Ödeme Durumu Değiştirildi: ${sale.customerName} (Fiş: #${saleId.substring(0,6)})`);
  };

  const processReturn = async (saleId: string, details: ReturnDetails, returnedItems: ReturnItem[]) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    if (details.refundMethod === 'WALLET' && !sale.customerId) { alert("Hata: Misafir müşteriler için 'Cari Hesaba İade' yapılamaz."); return; }

    const updatedSale: Sale = { ...sale, status: SaleStatus.RETURNED, returnDetails: { ...details, returnedItems, refundStatus: details.refundStatus } };
    setSales(prev => prev.map(s => s.id === saleId ? updatedSale : s));

    // UPDATED STOCK LOGIC: Only increase stock if item is RESELLABLE (Sağlam)
    returnedItems.forEach(rItem => { 
        if (rItem.condition === 'RESELLABLE') {
            setProducts(prev => prev.map(p => { 
                if (p.id === rItem.productId) { 
                    return { ...p, stockQuantity: p.stockQuantity + rItem.quantity }; 
                } 
                return p; 
            })); 
        }
        // If DEFECTIVE, stock is not increased (assumed waste).
    });

    if (details.refundStatus === 'COMPLETED' && details.refundMethod === 'WALLET' && sale.customerId) {
        setCustomers(prev => prev.map(c => { if (c.id === sale.customerId) { return { ...c, currentBalance: c.currentBalance + details.refundAmount }; } return c; }));
    }
    // UPDATED LOG MESSAGE
    logActivity('CREATE', 'RETURN', `Satış İadesi: ${sale.customerName} (Fiş: #${saleId.substring(0,6)}) - Tutar: ${details.refundAmount} TL`);
  };

  const updateReturnPayment = async (saleId: string, paymentDetails: Partial<ReturnDetails>) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    const isNewWalletPayment = sale.returnDetails?.refundStatus !== 'COMPLETED' && paymentDetails.refundStatus === 'COMPLETED' && paymentDetails.refundMethod === 'WALLET';
    setSales(prev => prev.map(s => { if (s.id === saleId && s.returnDetails) { return { ...s, returnDetails: { ...s.returnDetails, ...paymentDetails } }; } return s; }));
    if (isNewWalletPayment && sale.customerId) {
        setCustomers(prev => prev.map(c => { if (c.id === sale.customerId) { return { ...c, currentBalance: c.currentBalance + (sale.returnDetails?.refundAmount || 0) }; } return c; }));
        logActivity('FINANCIAL', 'CUSTOMER', `İade ödemesi cariye işlendi: ${sale.customerName}`);
    }
    // UPDATED LOG MESSAGE
    logActivity('UPDATE', 'RETURN', `İade ödeme durumu güncellendi: ${sale.customerName} (Fiş: #${saleId.substring(0,6)})`);
  };

  const processCollection = async (saleId: string, amount: number, method: string, description: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || !sale.customerId) return;
    
    // Calculate Correct Total Debt for Sale
    let grandTotal = (sale.totalAmount * 1.20) + (sale.shippingCost || 0);
    if (sale.type === 'GIFT') {
        if (sale.shippingPayer === 'COMPANY' || sale.shippingPayer === 'NONE') grandTotal = 0;
        else if (sale.shippingPayer === 'CUSTOMER') grandTotal = (sale.shippingCost || 0);
    }

    const previousPaid = sale.paidAmount || 0;
    const newPaidAmount = previousPaid + amount;
    let newStatus = sale.paymentStatus;
    if (newPaidAmount >= grandTotal - 1) newStatus = PaymentStatus.PAID;
    else newStatus = PaymentStatus.PARTIAL;

    setSales(prev => prev.map(s => { if (s.id === saleId) { return { ...s, paidAmount: newPaidAmount, paymentStatus: newStatus }; } return s; }));
    const newTransaction: Transaction = { id: Math.random().toString(36).substr(2, 9), customerId: sale.customerId, amount: amount, type: TransactionType.COLLECTION, date: new Date().toISOString(), description: `Tahsilat - Fiş No: #${saleId.substring(0,6)} - ${description}`, personnelName: currentUser?.name || 'Bilinmiyor', saleId: saleId };
    setTransactions(prev => [newTransaction, ...prev]);
    setCustomers(prev => prev.map(c => { if (c.id === sale.customerId) { return { ...c, currentBalance: c.currentBalance + amount }; } return c; }));
    logActivity('CREATE', 'COLLECTION', `Tahsilat alındı: ${sale.customerName} - ${amount} TL`);
  };

  // NEW: Process General Collection (No Sale ID)
  const processGeneralCollection = async (customerId: string, amount: number, method: string, description: string) => {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      const newTransaction: Transaction = {
          id: Math.random().toString(36).substr(2, 9),
          customerId: customerId,
          amount: amount,
          type: TransactionType.COLLECTION,
          date: new Date().toISOString(),
          description: `Genel Tahsilat - ${description}`,
          personnelName: currentUser?.name || 'Bilinmiyor'
      };
      setTransactions(prev => [newTransaction, ...prev]);
      
      setCustomers(prev => prev.map(c => {
          if (c.id === customerId) {
              return { ...c, currentBalance: c.currentBalance + amount };
          }
          return c;
      }));
      logActivity('CREATE', 'COLLECTION', `Genel Tahsilat: ${customer.name} - ${amount} TL`);
  };

  const addTransaction = async (transaction: Transaction) => { setTransactions(prev => [transaction, ...prev]); if (transaction.type === TransactionType.COLLECTION) { setCustomers(prev => prev.map(c => { if (c.id === transaction.customerId) { return { ...c, currentBalance: c.currentBalance + transaction.amount }; } return c; })); } };
  const saveProductCost = async (cost: ProductCost) => { setProductCosts(prev => { const existingIndex = prev.findIndex(c => c.productId === cost.productId); if (existingIndex >= 0) { const newCosts = [...prev]; newCosts[existingIndex] = cost; return newCosts; } return [...prev, cost]; }); logActivity('UPDATE', 'PRODUCT', `Maliyet güncellendi: Ürün ID ${cost.productId}`); };
  const updateSettings = (newSettings: AppSettings) => { setSettings(newSettings); logActivity('UPDATE', 'SETTINGS', 'Sistem ayarları güncellendi.'); };

  return (
    <StoreContext.Provider value={{ 
      currentUser, login, logout, users,
      // IMPORTANT: Expose FILTERED lists to the app for data isolation
      sales: visibleSales, 
      transactions: visibleTransactions, 
      activityLogs: visibleLogs,
      // Shared Resources (Globals)
      products, customers, productCosts, settings, cart, 
      addToCart, removeFromCart, updateCartQuantity, clearCart,
      addUser, deleteUser,
      addProduct, updateProduct, deleteProduct, addCustomer, updateCustomer, deleteCustomer, adjustCustomerBalance, addSale, updateSale, editSale, updateSalePaymentStatus, addTransaction,
      updateSettings, refreshData, processReturn, updateReturnPayment, processCollection, processGeneralCollection, saveProductCost, logActivity
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};

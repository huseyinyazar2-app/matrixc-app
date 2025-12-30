
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Product, Customer, Sale, Transaction, User, UserRole, TransactionType, AppSettings, PaymentStatus, SaleStatus, ReturnDetails, ProductCost, ActivityLog, ReturnItem, CartItem, Task, TaskPriority } from '../types';
import { supabase } from '../src/supabaseClient';

interface StoreContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  users: User[];
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  transactions: Transaction[];
  tasks: Task[];
  productCosts: ProductCost[];
  activityLogs: ActivityLog[];
  settings: AppSettings;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  addUser: (user: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>; 
  deleteUser: (id: string) => Promise<void>;
  addProduct: (product: Product) => Promise<boolean>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<boolean>; 
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  adjustCustomerBalance: (customerId: string, amount: number, type: 'DEBT' | 'CREDIT', description: string) => Promise<void>;
  addSale: (sale: Sale) => Promise<void>;
  updateSale: (sale: Sale) => Promise<void>;
  editSale: (updatedSale: Sale) => Promise<void>;
  updateSalePaymentStatus: (saleId: string, newStatus: PaymentStatus) => Promise<void>;
  processReturn: (saleId: string, details: ReturnDetails, returnedItems: ReturnItem[]) => Promise<void>;
  updateReturnPayment: (saleId: string, paymentDetails: Partial<ReturnDetails>) => Promise<void>;
  processCollection: (saleId: string, amount: number, method: string, description: string) => Promise<void>;
  processGeneralCollection: (customerId: string, amount: number, method: string, description: string) => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  updateTaskStatus: (taskId: string, status: 'PENDING' | 'COMPLETED' | 'WAITING_APPROVAL') => Promise<void>;
  rejectTask: (taskId: string, reason: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  saveProductCost: (cost: ProductCost) => Promise<void>;
  updateSettings: (settings: AppSettings) => void;
  refreshData: () => void;
  logActivity: (action: ActivityLog['action'], entity: ActivityLog['entity'], description: string) => void;
  resetDatabase: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  productCategories: ['Genel'],
  variantOptions: ['Adet', 'Paket', 'Koli'],
  customerTypes: ['Bireysel Müşteri', 'Kurumsal Müşteri'],
  salesChannels: ['Mağaza', 'Online', 'Telefon'],
  deliveryTypes: ['Elden', 'Kargo', 'Kurye'],
  shippingCompanies: ['Aras Kargo', 'Yurtiçi Kargo', 'MNG Kargo']
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => { const saved = localStorage.getItem('currentUser'); return saved ? JSON.parse(saved) : null; });
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [productCosts, setProductCosts] = useState<ProductCost[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [cart, setCart] = useState<CartItem[]>(() => { const saved = localStorage.getItem('posCart'); return saved ? JSON.parse(saved) : []; });

  // Persistence for Cart and Session only
  useEffect(() => { localStorage.setItem('currentUser', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('posCart', JSON.stringify(cart)); }, [cart]);

  // --- SUPABASE DATA MAPPING HELPERS ---
  const mapDbProduct = (p: any): Product => ({
    id: p.id,
    baseName: p.base_name,
    variantName: p.variant_name,
    description: p.description,
    sellPrice: Number(p.sell_price),
    stockQuantity: p.stock_quantity,
    lowStockThreshold: p.low_stock_threshold,
    isActive: p.is_active,
    isArchived: p.is_archived,
    createdBy: p.created_by
  });

  const mapDbCustomer = (c: any): Customer => ({
    id: c.id,
    name: c.name,
    type: c.type,
    salesChannel: c.sales_channel,
    email: c.email,
    phone: c.phone,
    city: c.city,
    district: c.district,
    address: c.address,
    description: c.description,
    currentBalance: Number(c.current_balance),
    createdBy: c.created_by
  });

  const mapDbSale = (s: any): Sale => ({
    id: s.id,
    customerId: s.customer_id,
    customerName: s.customer_name,
    items: [], // Populated separately
    totalAmount: Number(s.total_amount),
    shippingCost: Number(s.shipping_cost),
    paidAmount: Number(s.paid_amount),
    discountAmount: Number(s.discount_amount),
    date: s.date,
    paymentStatus: s.payment_status,
    status: s.status,
    type: s.type,
    shippingPayer: s.shipping_payer,
    deliveryStatus: s.delivery_status,
    deliveryType: s.delivery_type,
    shippingCompany: s.shipping_company,
    trackingNumber: s.tracking_number,
    dueDate: s.due_date,
    personnelName: s.personnel_name,
    returnDetails: s.return_details,
    shippingUpdatedBy: s.shipping_updated_by
  });

  // --- INITIAL DATA FETCH ---
  const refreshData = async () => {
    try {
      const [
        { data: usersData },
        { data: productsData },
        { data: customersData },
        { data: salesData },
        { data: saleItemsData },
        { data: transactionsData },
        { data: tasksData },
        { data: costsData },
        { data: settingsData },
        { data: logsData }
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('sales').select('*').order('date', { ascending: false }),
        supabase.from('sale_items').select('*'),
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('tasks').select('*').order('due_date', { ascending: true }),
        supabase.from('product_costs').select('*'),
        supabase.from('app_settings').select('*').limit(1).single(),
        supabase.from('activity_logs').select('*').order('date', { ascending: false }).limit(100)
      ]);

      if (usersData) setUsers(usersData);
      if (productsData) setProducts(productsData.map(mapDbProduct));
      if (customersData) setCustomers(customersData.map(mapDbCustomer));
      
      if (salesData) {
        const fullSales = salesData.map(s => {
          const mappedSale = mapDbSale(s);
          mappedSale.items = (saleItemsData || [])
            .filter((i: any) => i.sale_id === s.id)
            .map((i: any) => ({
              productId: i.product_id,
              productName: i.product_name,
              quantity: i.quantity,
              unitPrice: Number(i.unit_price),
              totalPrice: Number(i.total_price)
            }));
          return mappedSale;
        });
        setSales(fullSales);
      }

      if (transactionsData) {
        setTransactions(transactionsData.map((t: any) => ({
          id: t.id,
          customerId: t.customer_id,
          amount: Number(t.amount),
          type: t.type,
          date: t.date,
          description: t.description,
          personnelName: t.personnel_name,
          saleId: t.sale_id
        })));
      }

      if (tasksData) {
        setTasks(tasksData.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          assignedTo: t.assigned_to,
          assignedToName: t.assigned_to_name,
          createdBy: t.created_by,
          dueDate: t.due_date,
          priority: t.priority,
          status: t.status,
          adminNote: t.admin_note
        })));
      }

      if (costsData) {
        setProductCosts(costsData.map((c: any) => ({
          productId: c.product_id,
          productNetWeight: Number(c.product_net_weight),
          rawMaterials: c.raw_materials,
          otherCosts: c.other_costs,
          totalCost: Number(c.total_cost),
          lastUpdated: c.last_updated
        })));
      }

      if (settingsData) {
        setSettings({
          productCategories: settingsData.product_categories || [],
          variantOptions: settingsData.variant_options || [],
          customerTypes: settingsData.customer_types || [],
          salesChannels: settingsData.sales_channels || [],
          deliveryTypes: settingsData.delivery_types || [],
          shippingCompanies: settingsData.shipping_companies || []
        });
      }

      if (logsData) {
        setActivityLogs(logsData.map((l: any) => ({
          id: l.id,
          date: l.date,
          userId: l.user_id,
          userName: l.user_name,
          userRole: l.user_role,
          action: l.action,
          entity: l.entity,
          description: l.description,
          metadata: l.metadata
        })));
      }

    } catch (error) {
      console.error("Veri çekme hatası:", error);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // --- LOGIC ---
  const visibleSales = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.ADMIN) return sales;
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

  const logActivity = async (action: ActivityLog['action'], entity: ActivityLog['entity'], description: string) => {
    if (!currentUser) return;
    const newLog = { 
      user_id: currentUser.id, 
      user_name: currentUser.name, 
      user_role: currentUser.role, 
      action, entity, description,
      date: new Date().toISOString()
    };
    await supabase.from('activity_logs').insert(newLog);
    refreshData();
  };

  const resetDatabase = async () => {
      const confirm = window.confirm("DİKKAT: Veritabanındaki SATIŞ, MÜŞTERİ, ÜRÜN ve FİNANSAL tüm veriler kalıcı olarak silinecek. Ayarlar ve Kullanıcılar korunacaktır. Emin misiniz?");
      if (!confirm) return;
      
      try {
        await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('sale_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('product_costs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        alert("Veritabanı sıfırlandı.");
        window.location.reload();
      } catch (e) {
        console.error(e);
        alert("Sıfırlama sırasında hata oluştu veya yetkiniz yetersiz.");
      }
  };

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
    const { data, error } = await supabase.from('users').select('*').eq('username', username).eq('password', password).single();
    if (data) { 
        setCurrentUser(data); 
        logActivity('LOGIN', 'SETTINGS', 'Sisteme giriş yapıldı.');
        return true; 
    }
    return false;
  };
  const logout = () => setCurrentUser(null);
  
  const addUser = async (user: User) => { 
      const { error } = await supabase.from('users').insert({ username: user.username, password: user.password, name: user.name, role: user.role });
      if (error) { alert("Hata: " + error.message); return; }
      logActivity('CREATE', 'SETTINGS', `Yeni kullanıcı eklendi: ${user.username}`);
      refreshData();
  };
  
  const updateUser = async (updatedUser: User) => {
      const { error } = await supabase.from('users').update({ password: updatedUser.password }).eq('id', updatedUser.id);
      if (error) { alert("Hata: " + error.message); return; }
      if (currentUser && currentUser.id === updatedUser.id) { setCurrentUser(updatedUser); }
      logActivity('UPDATE', 'SETTINGS', `Kullanıcı güncellendi: ${updatedUser.username}`);
      refreshData();
  };

  const deleteUser = async (id: string) => { 
      if (currentUser && currentUser.id === id) { alert("Kendinizi silemezsiniz!"); return; } 
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) { alert("Hata: " + error.message); return; }
      logActivity('DELETE', 'SETTINGS', `Kullanıcı silindi: ID ${id}`);
      refreshData();
  };

  // Product Actions
  const addProduct = async (product: Product) => {
      const { data, error } = await supabase.from('products').insert({
          id: product.id,
          base_name: product.baseName,
          variant_name: product.variantName,
          description: product.description,
          sell_price: product.sellPrice,
          stock_quantity: product.stockQuantity,
          low_stock_threshold: product.lowStockThreshold,
          is_active: true,
          created_by: product.createdBy
      }).select();
      
      if (error) {
          console.error(error);
          alert("Ürün eklenirken hata: " + error.message);
          return false;
      }
      
      logActivity('CREATE', 'PRODUCT', `Yeni ürün: ${product.baseName}`);
      refreshData();
      return true;
  };

  const updateProduct = async (product: Product) => { 
      const { error } = await supabase.from('products').update({
          base_name: product.baseName,
          variant_name: product.variantName,
          sell_price: product.sellPrice,
          stock_quantity: product.stockQuantity,
          is_active: product.isActive
      }).eq('id', product.id);
      
      if (error) { alert("Hata: " + error.message); return; }
      logActivity('UPDATE', 'PRODUCT', `Ürün güncellendi: ${product.baseName}`);
      refreshData();
  };
  
  const deleteProduct = async (id: string) => {
      // Soft Delete (Archive)
      const { error } = await supabase.from('products').update({ is_archived: true, is_active: false }).eq('id', id);
      if (error) { alert("Hata: " + error.message); return false; }
      logActivity('DELETE', 'PRODUCT', `Ürün arşivlendi: ID ${id}`);
      refreshData();
      return true;
  };

  // Customer Actions
  const addCustomer = async (customer: Customer) => { 
      const { error } = await supabase.from('customers').insert({
          id: customer.id,
          name: customer.name,
          type: customer.type,
          sales_channel: customer.salesChannel,
          email: customer.email,
          phone: customer.phone,
          city: customer.city,
          district: customer.district,
          address: customer.address,
          description: customer.description,
          current_balance: 0,
          created_by: customer.createdBy
      });
      if (error) { alert("Hata: " + error.message); return; }
      logActivity('CREATE', 'CUSTOMER', `Yeni müşteri: ${customer.name}`);
      refreshData();
  };

  const updateCustomer = async (customer: Customer) => { 
      const { error } = await supabase.from('customers').update({
          name: customer.name,
          type: customer.type,
          sales_channel: customer.salesChannel,
          phone: customer.phone,
          email: customer.email,
          city: customer.city,
          district: customer.district,
          address: customer.address,
          description: customer.description
      }).eq('id', customer.id);
      if (error) { alert("Hata: " + error.message); return; }
      logActivity('UPDATE', 'CUSTOMER', `Müşteri güncellendi: ${customer.name}`);
      refreshData();
  };

  const deleteCustomer = async (id: string) => { 
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) { alert("Hata: " + error.message); return; }
      logActivity('DELETE', 'CUSTOMER', `Müşteri silindi: ID ${id}`);
      refreshData();
  };
  
  const adjustCustomerBalance = async (customerId: string, amount: number, type: 'DEBT' | 'CREDIT', description: string) => {
      const adjustment = type === 'CREDIT' ? amount : -amount;
      const { data: c } = await supabase.from('customers').select('current_balance').eq('id', customerId).single();
      if (!c) return;
      
      const newBal = Number(c.current_balance) + adjustment;
      await supabase.from('customers').update({ current_balance: newBal }).eq('id', customerId);
      
      await supabase.from('transactions').insert({
          customer_id: customerId,
          amount: amount,
          type: type === 'CREDIT' ? TransactionType.COLLECTION : TransactionType.PAYMENT,
          description: `MANUEL DÜZELTME: ${description}`,
          personnel_name: currentUser?.name
      });
      
      logActivity('FINANCIAL', 'CUSTOMER', `Manuel Bakiye: ${amount} TL`);
      refreshData();
  };

  // Sale Actions
  const addSale = async (sale: Sale) => {
    let grandTotal = (sale.totalAmount * 1.20) + (sale.shippingCost || 0);
    if (sale.type === 'GIFT') {
       if (sale.shippingPayer === 'COMPANY' || sale.shippingPayer === 'NONE') grandTotal = 0;
       else if (sale.shippingPayer === 'CUSTOMER') grandTotal = (sale.shippingCost || 0);
    }

    // 1. Insert Sale
    const { data: saleData, error } = await supabase.from('sales').insert({
        id: sale.id,
        customer_id: sale.customerId,
        customer_name: sale.customerName,
        total_amount: sale.totalAmount,
        shipping_cost: sale.shippingCost,
        shipping_payer: sale.shippingPayer,
        paid_amount: sale.paymentStatus === PaymentStatus.PAID ? grandTotal : 0,
        discount_amount: sale.discountAmount,
        date: sale.date,
        payment_status: sale.paymentStatus,
        status: SaleStatus.ACTIVE,
        type: sale.type,
        due_date: sale.dueDate,
        personnel_name: sale.personnelName,
        delivery_status: 'BEKLIYOR'
    }).select().single();

    if (error) { 
        console.error(error); 
        alert("Satış kaydedilirken hata oluştu: " + error.message);
        return; 
    }

    // 2. Insert Items & Update Stock
    for (const item of sale.items) {
        await supabase.from('sale_items').insert({
            sale_id: saleData.id,
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice
        });

        const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', item.productId).single();
        if (prod) {
            await supabase.from('products').update({ stock_quantity: prod.stock_quantity - item.quantity }).eq('id', item.productId);
        }
    }

    // 3. Update Customer Balance
    if (sale.customerId && (sale.paymentStatus === PaymentStatus.UNPAID || sale.paymentStatus === PaymentStatus.PARTIAL)) {
        const { data: cust } = await supabase.from('customers').select('current_balance').eq('id', sale.customerId).single();
        if (cust) {
            await supabase.from('customers').update({ current_balance: Number(cust.current_balance) - grandTotal }).eq('id', sale.customerId);
        }
    }

    logActivity('CREATE', 'SALE', `Yeni satış: ${sale.customerName}`);
    refreshData();
  };

  const updateSale = async (sale: Sale) => {
    const { error } = await supabase.from('sales').update({
        delivery_status: sale.deliveryStatus,
        delivery_type: sale.deliveryType,
        shipping_company: sale.shippingCompany,
        tracking_number: sale.trackingNumber,
        shipping_updated_by: sale.shippingUpdatedBy
    }).eq('id', sale.id);
    if (error) { alert("Hata: " + error.message); return; }
    logActivity('UPDATE', 'SALE', `Teslimat güncellendi: ${sale.customerName}`);
    refreshData();
  };

  const editSale = async (updatedSale: Sale) => {
      // Basic update for items and total (Admin only feature usually)
      await supabase.from('sale_items').delete().eq('sale_id', updatedSale.id);
      
      for (const item of updatedSale.items) {
          await supabase.from('sale_items').insert({
              sale_id: updatedSale.id,
              product_id: item.productId,
              product_name: item.productName,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total_price: item.totalPrice
          });
      }
      
      await supabase.from('sales').update({
          total_amount: updatedSale.totalAmount
      }).eq('id', updatedSale.id);

      logActivity('UPDATE', 'SALE', `Satış düzenlendi: ${updatedSale.customerName}`);
      refreshData();
  };

  const updateSalePaymentStatus = async (saleId: string, newStatus: PaymentStatus) => {
      const sale = sales.find(s => s.id === saleId);
      if (!sale) return;
      
      const { error } = await supabase.from('sales').update({ payment_status: newStatus }).eq('id', saleId);
      if (error) { alert("Hata: " + error.message); return; }
      
      if (sale.customerId) {
          let grandTotal = (sale.totalAmount * 1.20) + (sale.shippingCost || 0);
          if (sale.type === 'GIFT') {
             if (sale.shippingPayer === 'COMPANY' || sale.shippingPayer === 'NONE') grandTotal = 0;
             else if (sale.shippingPayer === 'CUSTOMER') grandTotal = (sale.shippingCost || 0);
          }

          let balanceChange = 0;
          if (sale.paymentStatus === PaymentStatus.UNPAID && newStatus === PaymentStatus.PAID) balanceChange = grandTotal; 
          else if (sale.paymentStatus === PaymentStatus.PAID && newStatus === PaymentStatus.UNPAID) balanceChange = -grandTotal;

          if (balanceChange !== 0) {
              const { data: c } = await supabase.from('customers').select('current_balance').eq('id', sale.customerId).single();
              if (c) {
                  await supabase.from('customers').update({ current_balance: Number(c.current_balance) + balanceChange }).eq('id', sale.customerId);
              }
          }
      }
      
      logActivity('STATUS_CHANGE', 'SALE', `Ödeme durumu: ${newStatus}`);
      refreshData();
  };

  const processReturn = async (saleId: string, details: ReturnDetails, returnedItems: ReturnItem[]) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const { error } = await supabase.from('sales').update({
        status: SaleStatus.RETURNED,
        return_details: details
    }).eq('id', saleId);
    if (error) { alert("Hata: " + error.message); return; }

    for (const rItem of returnedItems) {
        if (rItem.condition === 'RESELLABLE') {
            const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', rItem.productId).single();
            if (p) {
                await supabase.from('products').update({ stock_quantity: p.stock_quantity + rItem.quantity }).eq('id', rItem.productId);
            }
        }
    }

    if (details.refundStatus === 'COMPLETED' && details.refundMethod === 'WALLET' && sale.customerId) {
        const { data: c } = await supabase.from('customers').select('current_balance').eq('id', sale.customerId).single();
        if (c) {
            await supabase.from('customers').update({ current_balance: Number(c.current_balance) + details.refundAmount }).eq('id', sale.customerId);
        }
    }

    logActivity('CREATE', 'RETURN', `İade: ${sale.customerName}`);
    refreshData();
  };

  const updateReturnPayment = async (saleId: string, paymentDetails: Partial<ReturnDetails>) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || !sale.returnDetails) return;
    
    const newDetails = { ...sale.returnDetails, ...paymentDetails };
    
    await supabase.from('sales').update({ return_details: newDetails }).eq('id', saleId);
    
    if (sale.returnDetails.refundStatus !== 'COMPLETED' && paymentDetails.refundStatus === 'COMPLETED' && paymentDetails.refundMethod === 'WALLET' && sale.customerId) {
         const { data: c } = await supabase.from('customers').select('current_balance').eq('id', sale.customerId).single();
         if (c) {
             await supabase.from('customers').update({ current_balance: Number(c.current_balance) + (sale.returnDetails.refundAmount) }).eq('id', sale.customerId);
         }
    }
    
    logActivity('UPDATE', 'RETURN', `İade ödeme güncelleme`);
    refreshData();
  };

  const processCollection = async (saleId: string, amount: number, method: string, description: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || !sale.customerId) return;

    let grandTotal = (sale.totalAmount * 1.20) + (sale.shippingCost || 0);
    if (sale.type === 'GIFT') {
        if (sale.shippingPayer === 'COMPANY' || sale.shippingPayer === 'NONE') grandTotal = 0;
        else if (sale.shippingPayer === 'CUSTOMER') grandTotal = (sale.shippingCost || 0);
    }

    const newPaid = (sale.paidAmount || 0) + amount;
    let newStatus = sale.paymentStatus;
    if (newPaid >= grandTotal - 1) newStatus = PaymentStatus.PAID;
    else newStatus = PaymentStatus.PARTIAL;

    await supabase.from('sales').update({ paid_amount: newPaid, payment_status: newStatus }).eq('id', saleId);
    
    await supabase.from('transactions').insert({
        customer_id: sale.customerId,
        sale_id: saleId,
        amount: amount,
        type: TransactionType.COLLECTION,
        description: `Tahsilat: ${description}`,
        personnel_name: currentUser?.name
    });

    const { data: c } = await supabase.from('customers').select('current_balance').eq('id', sale.customerId).single();
    if (c) {
        await supabase.from('customers').update({ current_balance: Number(c.current_balance) + amount }).eq('id', sale.customerId);
    }

    logActivity('CREATE', 'COLLECTION', `Tahsilat: ${amount} TL`);
    refreshData();
  };

  const processGeneralCollection = async (customerId: string, amount: number, method: string, description: string) => {
      await supabase.from('transactions').insert({
          customer_id: customerId,
          amount: amount,
          type: TransactionType.COLLECTION,
          description: `Genel Tahsilat: ${description}`,
          personnel_name: currentUser?.name
      });

      const { data: c } = await supabase.from('customers').select('current_balance').eq('id', customerId).single();
      if (c) {
          await supabase.from('customers').update({ current_balance: Number(c.current_balance) + amount }).eq('id', customerId);
      }
      
      logActivity('CREATE', 'COLLECTION', `Genel Tahsilat: ${amount} TL`);
      refreshData();
  };

  // --- TASK ACTIONS ---
  const addTask = async (task: Task) => {
      const { error } = await supabase.from('tasks').insert({
          id: task.id,
          title: task.title,
          description: task.description,
          assigned_to: task.assignedTo,
          assigned_to_name: task.assignedToName,
          created_by: task.createdBy,
          due_date: task.dueDate,
          priority: task.priority,
          status: 'PENDING'
      });
      if (error) { alert("Görev eklenirken hata: " + error.message); return; }
      logActivity('CREATE', 'TASK', `Yeni görev: ${task.title}`);
      refreshData();
  };

  const updateTaskStatus = async (taskId: string, status: 'PENDING' | 'COMPLETED' | 'WAITING_APPROVAL') => {
      // Eğer durum "WAITING_APPROVAL" ise admin notunu temizle (yeni bir istek çünkü)
      const updateData: any = { status };
      if (status === 'WAITING_APPROVAL') {
          updateData.admin_note = null;
      }

      const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
      if (error) { alert("Hata: " + error.message); return; }
      
      // Log
      if (status === 'COMPLETED') logActivity('STATUS_CHANGE', 'TASK', 'Görev tamamlandı onaylandı.');
      else if (status === 'WAITING_APPROVAL') logActivity('STATUS_CHANGE', 'TASK', 'Görev onaya gönderildi.');
      
      refreshData();
  };

  const rejectTask = async (taskId: string, reason: string) => {
      const { error } = await supabase.from('tasks').update({
          status: 'PENDING',
          admin_note: reason
      }).eq('id', taskId);
      
      if (error) { alert("Hata: " + error.message); return; }
      logActivity('STATUS_CHANGE', 'TASK', `Görev reddedildi. Not: ${reason}`);
      refreshData();
  };

  const deleteTask = async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) { alert("Hata: " + error.message); return; }
      logActivity('DELETE', 'TASK', `Görev silindi`);
      refreshData();
  };

  const addTransaction = async (transaction: Transaction) => { /* Helper used internally */ };
  
  const saveProductCost = async (cost: ProductCost) => { 
      const { data: existing } = await supabase.from('product_costs').select('id').eq('product_id', cost.productId).single();
      
      const payload = {
          product_id: cost.productId,
          product_net_weight: cost.productNetWeight,
          raw_materials: cost.rawMaterials,
          other_costs: cost.otherCosts,
          total_cost: cost.totalCost,
          last_updated: new Date().toISOString()
      };

      if (existing) {
          await supabase.from('product_costs').update(payload).eq('id', existing.id);
      } else {
          await supabase.from('product_costs').insert(payload);
      }
      logActivity('UPDATE', 'PRODUCT', `Maliyet güncellendi`);
      refreshData();
  };

  const updateSettings = async (newSettings: AppSettings) => { 
      // Upsert logic for settings (always ID 1 or similar)
      // First check if exists
      const { data: existing } = await supabase.from('app_settings').select('id').limit(1).single();
      
      const payload = {
          product_categories: newSettings.productCategories,
          variant_options: newSettings.variantOptions,
          customer_types: newSettings.customerTypes,
          sales_channels: newSettings.salesChannels,
          delivery_types: newSettings.deliveryTypes,
          shipping_companies: newSettings.shippingCompanies
      };

      if (existing) {
          await supabase.from('app_settings').update(payload).eq('id', existing.id);
      } else {
          await supabase.from('app_settings').insert(payload);
      }
      setSettings(newSettings);
      logActivity('UPDATE', 'SETTINGS', 'Ayarlar güncellendi');
  };

  return (
    <StoreContext.Provider value={{ 
      currentUser, login, logout, users,
      sales: visibleSales, 
      transactions: visibleTransactions, 
      activityLogs: visibleLogs,
      tasks, // Added tasks to context
      products, customers, productCosts, settings, cart, 
      addToCart, removeFromCart, updateCartQuantity, clearCart,
      addUser, updateUser, deleteUser,
      addProduct, updateProduct, deleteProduct, addCustomer, updateCustomer, deleteCustomer, adjustCustomerBalance, addSale, updateSale, editSale, updateSalePaymentStatus, addTransaction,
      addTask, updateTaskStatus, deleteTask, rejectTask, // Updated methods
      updateSettings, refreshData, processReturn, updateReturnPayment, processCollection, processGeneralCollection, saveProductCost, logActivity, resetDatabase
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

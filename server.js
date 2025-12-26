const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --- ROUTES ---

// 1. Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    if (rows.length > 0) {
      res.json({ success: true, user: rows[0] });
    } else {
      res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get Products
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Add/Update Product
app.post('/api/products', async (req, res) => {
  const p = req.body;
  try {
    // Upsert (Insert or Update)
    await pool.execute(
      `INSERT INTO products (id, baseName, variantName, description, sellPrice, stockQuantity, lowStockThreshold) 
       VALUES (?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       baseName=VALUES(baseName), variantName=VALUES(variantName), description=VALUES(description), 
       sellPrice=VALUES(sellPrice), stockQuantity=VALUES(stockQuantity), lowStockThreshold=VALUES(lowStockThreshold)`,
      [p.id, p.baseName, p.variantName, p.description, p.sellPrice, p.stockQuantity, p.lowStockThreshold]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete Product
app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get Customers
app.get('/api/customers', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM customers');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Add Customer
app.post('/api/customers', async (req, res) => {
  const c = req.body;
  try {
    await pool.execute(
      `INSERT INTO customers (id, name, companyName, contactPerson, type, phone, city, district, address, description, platform, currentBalance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.name, c.companyName, c.contactPerson, c.type, c.phone, c.city, c.district, c.address, c.description, c.platform, c.currentBalance]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Create Sale (Transaction Handling)
app.post('/api/sales', async (req, res) => {
  const sale = req.body;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Insert Sale Header
    await connection.execute(
      `INSERT INTO sales (id, customerId, customerName, totalAmount, date, paymentStatus, dueDate, personnelName)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sale.id, sale.customerId, sale.customerName, sale.totalAmount, sale.date, sale.paymentStatus, sale.dueDate, sale.personnelName]
    );

    // Insert Items and Update Stock
    for (const item of sale.items) {
      await connection.execute(
        `INSERT INTO sale_items (saleId, productId, productName, quantity, unitPrice, totalPrice)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sale.id, item.productId, item.productName, item.quantity, item.unitPrice, item.totalPrice]
      );

      // Decrease Stock
      await connection.execute(
        `UPDATE products SET stockQuantity = stockQuantity - ? WHERE id = ?`,
        [item.quantity, item.productId]
      );
    }

    // Update Customer Balance if needed
    if (sale.customerId && (sale.paymentStatus === 'VERESIYE' || sale.paymentStatus === 'KISMI_ODENDI')) {
      // For simplicity, assuming full credit amount is debt.
      // In a real scenario, you'd subtract the paid amount.
      // Here we subtract totalAmount from balance (Balance goes negative for debt)
      await connection.execute(
        `UPDATE customers SET currentBalance = currentBalance - ? WHERE id = ?`,
        [sale.totalAmount, sale.customerId]
      );
    }

    await connection.commit();
    res.json({ success: true });

  } catch (err) {
    await connection.rollback();
    console.error("Sale Transaction Failed:", err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// 8. Get Sales
app.get('/api/sales', async (req, res) => {
  try {
    // Fetch sales headers
    const [sales] = await pool.execute('SELECT * FROM sales ORDER BY date DESC');
    
    // Fetch items for each sale (Simple N+1 for demo, better to use JOIN or second query)
    for (let sale of sales) {
      const [items] = await pool.execute('SELECT * FROM sale_items WHERE saleId = ?', [sale.id]);
      sale.items = items;
    }
    
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Add Transaction (Collection)
app.post('/api/transactions', async (req, res) => {
  const t = req.body;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO transactions (id, customerId, amount, type, date, description, personnelName)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [t.id, t.customerId, t.amount, t.type, t.date, t.description, t.personnelName]
    );

    if (t.type === 'TAHSILAT') {
      await connection.execute(
        `UPDATE customers SET currentBalance = currentBalance + ? WHERE id = ?`,
        [t.amount, t.customerId]
      );
    }

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// 10. Get Transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM transactions ORDER BY date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

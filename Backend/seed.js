require('dotenv').config();
const db = require('./Database/index.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'StarWars-OldCodesButTheyllWork';

async function seed() {
    try {
        console.log("Starting seed process...");

        // ==========================================
        // 1. SEED PRODUCTS
        // ==========================================
        // We must delete order_items and cart_items first because they reference products
        await db.query('DELETE FROM order_items');
        await db.query('DELETE FROM cart_items');
        await db.query('DELETE FROM products');
        
        // Insert exactly 4 products
        await db.query(`
            INSERT INTO products (name, description, price, image_url) 
            VALUES 
            ('Wireless Mouse', 'Ergonomic wireless mouse with RGB lighting.', 29.99, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=300&q=80'),
            ('Mechanical Keyboard', 'Clicky mechanical keyboard for gaming and typing.', 89.99, 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=300&q=80'),
            ('Noise-Cancelling Headphones', 'Over-ear headphones with active noise cancellation.', 199.99, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80'),
            ('27-inch 4K Monitor', 'Ultra HD monitor with vibrant colors.', 349.99, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80')
        `);
        console.log(`✅ Inserted fresh products.`);

        // ==========================================
        // 2. SEED USER & CART
        // ==========================================
        let userRes = await db.query("SELECT id, username FROM accounts WHERE username = 'testuser'");
        let user;
        const hashedPassword = await bcrypt.hash('password123', 10);

        if (userRes.rows.length === 0) {
            userRes = await db.query(
                `INSERT INTO accounts (username, email, password) 
                 VALUES ('testuser', 'test@test.com', $1) RETURNING id, username`,
                [hashedPassword]
            );
            user = userRes.rows[0];
            console.log(`✅ Created user: ${user.username} (ID: ${user.id})`);
        } else {
            user = userRes.rows[0];
            await db.query('UPDATE accounts SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
            console.log(`✅ Found existing user: ${user.username} (ID: ${user.id})`);
        }

        // Clear old carts and orders for this user
        await db.query('DELETE FROM carts WHERE account_id = $1', [user.id]);
        await db.query('DELETE FROM orders WHERE account_id = $1', [user.id]);
        
        // Create a fresh cart
        const cartRes = await db.query(
            'INSERT INTO carts (account_id) VALUES ($1) RETURNING id',
            [user.id]
        );
        const cart = cartRes.rows[0];
        console.log(`✅ Created new cart (ID: ${cart.id})`);

        // Add the fresh products to the cart
        const productsRes = await db.query('SELECT id, name, price FROM products LIMIT 3');
        for (let i = 0; i < productsRes.rows.length; i++) {
            const prod = productsRes.rows[i];
            await db.query(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)',
                [cart.id, prod.id, i + 1] // Qty 1, 2, 3
            );
            console.log(`✅ Added product: ${prod.name} (Qty: ${i + 1})`);
        }

        // ==========================================
        // 3. SEED ORDER HISTORY
        // ==========================================
        const orderRes = await db.query(
            `INSERT INTO orders (account_id, total_price, status) 
             VALUES ($1, $2, $3) RETURNING id`,
            [user.id, 149.97, 'Delivered'] // Dummy total and status
        );
        const order = orderRes.rows[0];
        console.log(`✅ Created dummy order (ID: ${order.id})`);

        // Add items to the order
        for (let i = 0; i < productsRes.rows.length; i++) {
            const prod = productsRes.rows[i];
            await db.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price) 
                 VALUES ($1, $2, $3, $4)`,
                [order.id, prod.id, i + 1, prod.price]
            );
            console.log(`✅ Added product to order: ${prod.name}`);
        }

        // Generate Token
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        console.log("\n=======================================================");
        console.log("🔥 TO LOG IN: Use username 'testuser' and password 'password123'");
        console.log("=======================================================\n");
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding data:", error);
        process.exit(1);
    }
}

seed();
const express = require('express'); // For session
const paymentsRouter = express.Router(); // Router creation
const Stripe = require('stripe'); // For payments
const db = require('../Database/index.js'); // Database
const authenticateToken = require('../Middleware/auth'); // For token authentication

// Stripe initialization (Uses secret key from .env to identify your account)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* CREATE PAYMENT INTENT
============================================================
Purpose: Creates a payment session with Stripe (Payment handler) BEFORE user enters card details
Called from: Frontend checkout page when it loads
What it does: Calculates total, tells Stripe "prepare to charge this amount"
Returns: clientSecret (used by frontend to complete payment) */

paymentsRouter.post('/create-payment-intent', authenticateToken, async (req, res) => { // For payment info taking
    /* Ownership verification - ensure the cart belongs to the logged-in user
    accountId comes from req.body, req.user comes from authenticateToken */
    const { cartId, accountId } = req.body;

    if (accountId !== req.user.id) { // If cart's accountId doesn't match userId
        return res.status(403).json({ error: 'Access denied. Cannot create payment for another user.' });
    }

    try {
        /* Get cart items with prices from database
        JOIN with products table to get price and name for each item*/
        const cartItems = await db.query(
            `SELECT 
        cart_items.id,
        cart_items.product_id,
        cart_items.quantity,
        products.price,
        products.name
        FROM cart_items
        JOIN products ON cart_items.product_id = products.id
        WHERE cart_items.cart_id = $1`,
            [cartId]
        );

        if (cartItems.rows.length === 0) { // If cart is empty, can't checkout
            return res.status(400).json({ error: 'Cart is empty' });
        }

        let total = 0; // To calculate total amount of the order
        cartItems.rows.forEach(item => { // Loops through each cart item and does price*quantity
            total += item.price * item.quantity;
        });

        const amountInCents = Math.round(total * 100); // Convert to cents (Stripe works in smallest currency unit)

        // Create PaymentIntent with Stripe
        // This tells Stripe: "Get ready to charge this amount from this user"
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            metadata: { // Extra data stored with payment
                account_id: accountId,
                cart_id: cartId
            }
        });

        res.json({ // Return clientSecret & id through response to frontend
            clientSecret: paymentIntent.client_secret, // clientSecret is like a "payment session key" - frontend needs it to complete the payment securely
            paymentIntentId: paymentIntent.id
        });

    } catch (error) { // If anything fails above, catch and log the error
        console.error('Payment intent error:', error);
        res.status(500).json({ error: error.message });
    }
});

// STRIPE WEBHOOK
// ============================================================
// Purpose: Listens for events from Stripe (payment success/failure) as Stripe handles the payment
// Called from: Stripe's servers (NOT from your frontend)
// What it does: When payment succeeds, creates order in database and clears cart

paymentsRouter.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => { // For Stripe answer-catching

    const sig = req.headers['stripe-signature']; // Get Stripe's signature from request headers, legitimizing Stripe orgin

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // Webhook secret from .env (verifies authenticity)

    let event; // Event holder

    try { // Verify the webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret); // Sends request
    } catch (err) { // If verification fails, the request is NOT from Stripe (security measure)
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // HANDLE PAYMENT SUCCESS EVENT
    if (event.type === 'payment_intent.succeeded') { // Im case of success
        const paymentIntent = event.data.object; // Extract payment details from the Stripe event

        // Get the metadata we stored when creating the PaymentIntent
        // This tells us which user and which cart this payment belongs to
        const { account_id, cart_id } = paymentIntent.metadata;

        try {
            const cartItems = await db.query( // Get cart items again to create the order
                `SELECT 
                    cart_items.product_id,
                    cart_items.quantity,
                    products.price
                 FROM cart_items
                 JOIN products ON cart_items.product_id = products.id
                 WHERE cart_items.cart_id = $1`,
                [cart_id]
            );

            let total = 0; // To calculate total

            cartItems.rows.forEach(item => { // Calculate total again (or could use payment amount)
                total += item.price * item.quantity;
            });

            const orderResult = await db.query( // Create the order record in database, with status completed (paid)
                `INSERT INTO orders (account_id, total_price, status)
                 VALUES ($1, $2, $3)
                 RETURNING id`,
                [account_id, total, 'completed']
            );

            const orderId = orderResult.rows[0].id; // Get the newly created order's ID

            for (const item of cartItems.rows) { // Create order_items records (one per product in cart, and by inserting, preserves prices in time)
                await db.query(
                    `INSERT INTO order_items (order_id, product_id, quantity, price)
                     VALUES ($1, $2, $3, $4)`,
                    [orderId, item.product_id, item.quantity, item.price]
                );
            }
            
            await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cart_id]); // Clear the cart after successful order

            console.log(`Order ${orderId} created successfully`); // Success message for server logs

        } catch (dbError) {
            /* If database operation fails, log error
            Note: Payment already succeeded, so this creates an orphaned payment
            In production, you'd want to handle this more carefully */
            console.error('Database error in webhook:', dbError);
        }
    }

    res.json({ received: true }); // Always acknowledge receipt of webhook to Stripe or it will retry the webhook
});

module.exports = paymentsRouter;
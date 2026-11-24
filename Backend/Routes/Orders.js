const express = require('express'); // For express.js
const ordersRouter = express.Router(); // Router gets created
const db = require('../Database/index.js'); // SQL access
const authenticateToken = require('../Middleware/auth'); // JWT verification middleware

// ORDER params handler
ordersRouter.param("id", async (req, res, next) => {
  const orderId = Number(req.params.id); // Makes Id from string into a number to make it workable
  try { // Expected scenarios
    const result = await db.query( // Retrieves result from executing SQL search with Id
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );
    if (result.rows.length === 0) { // If nothing comes back from SQL
      res.status(404).json({ error: 'Order not found' });
    } else { // If a result is retrieved
      // Order is assigned to global variables
      req.orderId = orderId;
      req.order = result.rows[0];
      
      next(); // Transition to next middleware
    };
  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

/* Get all orders (Kept for tradition. Possible leak risk)
(authenticateToken to protect this admin-level route) */
ordersRouter.get('/', authenticateToken, async (req, res) => {
  try { // Expected behaviors
    /*Requests from SQL (With username addition suggestion by deepseek)
    SELECT * FROM orders would've worked perfectly*/
    const result = await db.query(
      `SELECT 
        orders.id, 
        orders.account_id,
        orders.total_price,
        orders.created_at,
        accounts.username 
      FROM orders 
      LEFT JOIN accounts ON orders.account_id = accounts.id 
      ORDER BY orders.id`
    );
    res.json(result.rows); // Sends success response
  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get orders by user
ordersRouter.get('/user/:account_id', authenticateToken, async (req, res) => {
  const accountId = Number(req.params.account_id); // Extracts accountId from req string

  /* Ownership verification before allowing retrieval 
  req.params.account_id comes from params handler, req.user comes from authenticateToken */
  if (accountId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. Cannot view another user\'s orders.' });
  }

  try { // Expected behaviors
    const result = await db.query( // SQL request
      `SELECT 
        id, 
        total_price, 
        status, 
        created_at
       FROM orders 
       WHERE account_id = $1 
       ORDER BY created_at DESC`,
      [accountId]
    );
    res.json(result.rows); // Integrates SQL rows into response
  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error fetching user orders' });
  }
});

// Get a single order
/* Since .params is the middleware for specifics, this is a success handler,
using the previously stored req.order as the order */
ordersRouter.get('/:id', authenticateToken, (req, res) => {
  /* Ownership verification before allowing retrieval 
  req.order comes with params handler, and req.user with authenticateToken */
  if (req.order.account_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. This order does not belong to you.' });
  }
  res.json(req.order); // Response is sent
});

// Update an order (Only status should be updateable)
ordersRouter.put('/:id', authenticateToken, async (req, res) => {
  /* Ownership verification before allowing update 
  req.order comes with params handler, and req.user with authenticateToken */
  if (req.order.account_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. This order does not belong to you.' });
  }
  try { // Expected scenarios
    const { status } = req.body; // Extract data from entry
    if (!status) { // Verifies a status exists
      return res.status(400).json({ error: 'status is required' });
    };
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']; // Array of valid statuses preset
    if (!validStatuses.includes(status)) { // If status isn't valid
      return res.status(400).json({ error: 'Invalid status' })
    };
    // SQL command is sent with values
    const result = await db.query(`
      UPDATE orders 
      SET status = $1 
      WHERE id = $2 
      RETURNING id, account_id, total_price, status, created_at
      `, [status, req.orderId]);
    res.json(result.rows[0]); // Result is sent through API for confirmation - could also be res.status(200).json(message: 'Success string')
  } catch (error) { //In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error during update' });
  }
});

// Create an order
ordersRouter.post('/', authenticateToken, async (req, res) => {
  try { // Expected behavior
    const { account_id } = req.body; // Extracts Id from request
    /* Ownership verification before allowing creation 
    req.order comes with params handler, and req.user with authenticateToken */
    if (account_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Cannot create order for another user.' });
    };

    if (!account_id) { // If no account is provided
      return res.status(400).json({ error: 'account_id is required' });
    };

    // Retrieve cart
    const cartSetup = await db.query(`
      SELECT id
      FROM carts
      WHERE account_id = $1
      `, [account_id]);
    if (cartSetup.rows.length === 0) { // If no cart exists
      return res.status(400).json({ error: 'Cart does not exist' });
    };

    const cartId = cartSetup.rows[0].id; // Cart Id extraction

    const accountCheck = await db.query( // Check if user exists with SQL command
      'SELECT id FROM accounts WHERE id = $1',
      [account_id]
    );

    if (accountCheck.rows.length === 0) { // If no matching user exists
      return res.status(400).json({ error: 'User does not exist' });
    };

    const cartItems = await db.query( // Retrieves cart items
      `SELECT
        cart_items.product_id,
        cart_items.quantity,
        products.price
       FROM cart_items
       JOIN products ON cart_items.product_id = products.id
       WHERE cart_items.cart_id = $1
       `, [cartId]
    );

    if (cartItems.rows.length === 0) { // If cart is empty
      return res.status(400).json({ error: 'Cart is empty' });
    };

    let totalPrice = 0; // To calculate total order price

    for (const item of cartItems.rows) { // Calculation of price product*quantity and adding to total
      totalPrice += Number(item.price) * item.quantity;
    };

    const order = await db.query( // Assemble order
      `INSERT INTO orders (account_id, total_price, status) 
       VALUES ($1, $2, 'pending') 
       RETURNING id, account_id, total_price, status, created_at`,
      [account_id, totalPrice]
    );

    const orderId = order.rows[0].id // Obtain orderId after it get automatically created by order creation

    for (const item of cartItems.rows) { // Solidify order items
      await db.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price) 
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.price]
      );
    };

    await db.query(`DELETE FROM carts WHERE id = $1`, [cartId]); // Clear cart
    
    res.status(201).json(order.rows[0]); // Sends success response
  } catch (error) { //In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error during order creation' });
  }
});

//Delete an order
ordersRouter.delete('/:id', authenticateToken, async (req, res) => {
  /* Ownership verification before allowing deletion 
  req.order comes with params handler, and req.user with authenticateToken */
  if (req.order.account_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. This order does not belong to you.' });
  }
  try { // Expected behavior
    /*Delete order by order_id in request
    (Order_items will be deleted due to ON DELETE CASCADE)*/
    await db.query('DELETE FROM orders WHERE id = $1', [req.orderId]);
    res.status(204).send(); // Successful deletion notice
  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error during deletion' });
  }
});

//--------------------------------------------------------------------

// SPECIFIC params handler
ordersRouter.param("itemId", async (req, res, next) => {
  const itemId = Number(req.params.itemId);
  try { // Expected scenarios
    
    const result = await db.query( // Requests from SQL with itemId
      'SELECT * FROM order_items WHERE id = $1',
      [itemId]
    );
    
    if (result.rows.length === 0) { // In case no results are retrieved from SQL
      res.status(404).json({ error: 'Order item not found' });
    } else { // If a result is retrieved
      // Results is assigned to global variables
      req.itemId = itemId;
      req.orderItem = result.rows[0];
      next(); // Transition to next middleware
    }
  } catch (error) { //In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single item
ordersRouter.get('/items/:itemId', authenticateToken, async (req, res) => {
  const itemCheck = await db.query( // First get the order that contains this item (req.itemId gotten with params handler)
    'SELECT order_id FROM order_items WHERE id = $1',
    [req.itemId]
  );
  
  if (itemCheck.rows.length === 0) { // If no result is retrieved
    return res.status(404).json({ error: 'Order item not found' });
  };

  //Extraction from retrieval (AccountID needs to be extracted through chain search to ensure connection)
  const orderId = itemCheck.rows[0].order_id; // orderId from item results
  const accountResult = await db.query( // AccountId from orderId
    'SELECT account_id FROM orders WHERE id = $1',
    [orderId]
  );

  // Ownership verification before allowing retrieval - req.user comes from authenticateToken
  if (accountResult.rows.length === 0 || accountResult.rows[0].account_id !== req.user.id) {
    return res.status(403).json({
      error: 'Access denied. This order item does not belong to you.'
    });
  }
  
  res.json(req.orderItem); // Product was already retrieved in .params handler, so we just send
});

/* SPECIFIC goes FIRST to avoid error in case of id match
  FUTURE PROOFING*/

// Get all items in an order
ordersRouter.get('/:id/items', authenticateToken, async (req, res) => {
  /* Ownership verification before allowing retrieval 
  req.order comes with the order params handler, and req.user with authenticateToken */
  if (req.order.account_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. This order does not belong to you.' });
  };
  
  try { // Expected behavior
    /*Requests from SQL (With product name and id addition suggestion by deepseek)
    SELECT * FROM order_items would've worked perfectly*/
    const result = await db.query(
      `SELECT
        order_items.order_id,
        order_items.product_id,
        products.name,
        order_items.quantity,
        order_items.price,
        orders.status
      FROM order_items
      JOIN orders ON order_items.order_id = orders.id
      -- Due to restriction, just JOIN would work, but LEFT JOIN future proofs edge cases
      LEFT JOIN products ON order_items.product_id = products.id
      WHERE order_items.order_id = $1
      ORDER BY order_items.id`,
      [req.orderId]
    );
    
    res.json(result.rows); // Sends success response
  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = ordersRouter;
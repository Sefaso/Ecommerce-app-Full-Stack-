const express = require('express'); // For express.js
const cartsRouter = express.Router(); // Router gets created
const db = require('../Database/index.js'); // SQL access
const authenticateToken = require('../Middleware/auth'); // JWT verification middleware

// CART params handler
cartsRouter.param("id", async (req, res, next) => { // request, response, pass to next middleware
  const cartId = Number(req.params.id); // Makes Id from string into a number to make it workable
  try { // Expected scenarios
    const result = await db.query( // Retrieves result from executing SQL search with Id
      'SELECT * FROM carts WHERE id = $1', // '$1' -> Dependency array retrieval
      [cartId] // Dependency array
    );

    if (result.rows.length === 0) { // If nothing comes back from SQL
      res.status(404).json({ error: 'Cart not found' });
    } else { // If a result is retrieved
      // Cart is assigned to global variables
      req.cartId = cartId;
      req.cart = result.rows[0];
      next(); // Transition to next middleware
    };
  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all carts
// (authenticateToken to protect this admin-level route)
cartsRouter.get('/', authenticateToken, async (req, res) => { // request, response
  try { // Expected behaviors
    /* Requests from SQL (With username addition suggestion by deepseek for admin-level handling)
    SELECT * FROM carts would've worked perfectly */
    const result = await db.query(
      `SELECT 
        carts.id, 
        carts.account_id,
        carts.created_at,
        accounts.username 
      FROM carts 
      LEFT JOIN accounts ON carts.account_id = accounts.id 
      ORDER BY carts.id`
    );
    res.json(result.rows); // Sends success response
  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single cart
/* Since .params is the middleware for specifics, this is a success handler,
using the previously stored req.cart as the cart */
cartsRouter.get('/:id', authenticateToken, (req, res) => {
  /* Ownership verification before allowing deletion 
  req.cart comes with SQL, and req.user with authenticateToken */
  if (req.cart.account_id !== req.user.id) { // If there's no account and cart match
    return res.status(403).json({ error: 'Access denied. This cart does not belong to you.' }); // Error message
  }
  res.json(req.cart); // Successful Retrieval
});

// Update a cart (Only account_id)
cartsRouter.put('/:id', authenticateToken, async (req, res) => {
  /* Ownership verification before allowing update 
  req.cart is loaded by the param("id") handler; req.user comes from authenticateToken */
  if (req.cart.account_id !== req.user.id) { // If there's no account and cart match
    return res.status(403).json({ error: 'Access denied. This cart does not belong to you.' }); // Error message
  }

  try { // Expected scenarios
    const { account_id } = req.body; // Id is extracted from request
    if (!account_id) { // In case there's no ID
      return res.status(400).json({ error: 'account_id is required' });
    };

    const userCheck = await db.query( // Check if there's a cart of user, and retrieves it
      'SELECT id FROM accounts WHERE id = $1', // '$1' -> Dependency array retrieval syntax
      [account_id] // Dependency array
    );

    if (userCheck.rows.length === 0) { // In case there's no matches
      return res.status(400).json({ error: 'User does not exist' });
    };

    const result = await db.query( // Updates carts table (account_id only, items are updated on the item specific)
      `UPDATE carts 
       SET account_id = $1 
       WHERE id = $2 
       RETURNING id, account_id, created_at`,
      [account_id, req.cartId]
    );
    res.json(result.rows[0]); // Sends success response
  } catch (error) { // In case or error
    console.error(error);
    res.status(500).json({ error: 'Database error during update' });
  }
});

// Create cart
cartsRouter.post('/', authenticateToken, async (req, res) => {
  try { // Expected behaviors
    const { account_id } = req.body; // Extracts Id from request
    /* Ownership verification before allowing creation 
    account_id comes from req.body; req.user comes from authenticateToken */
    if (account_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Cannot create cart for another user.' });
    };

    if (!account_id) { // If no user is provided
      return res.status(400).json({ error: 'account_id is required' });
    };
    
    const userCheck = await db.query( // Check if user exists with SQL command
      'SELECT id FROM accounts WHERE id = $1',
      [account_id]
    );

    if (userCheck.rows.length === 0) { // If no matching user exists
      return res.status(400).json({ error: 'User does not exist' });
    };

    const existingCart = await db.query( // Check if user already has a cart
      'SELECT id FROM carts WHERE account_id = $1',
      [account_id]
    );

    if (existingCart.rows.length > 0) { // If a cart exists
      return res.status(400).json({
        error: 'User already has a cart. Use existing cart or delete it first.'
      });
    };

    const result = await db.query( // Create new cart with Id
      `INSERT INTO carts (account_id) 
       VALUES ($1) 
       RETURNING id, account_id, created_at`,
      [account_id]
    );

    res.status(201).json(result.rows[0]); //Sends success response
  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error during cart creation' });
  }
});

// Delete a cart
cartsRouter.delete('/:id', authenticateToken, async (req, res) => {
  /* Ownership verification before allowing deletion 
  req.cart is set by the param("id") handler above; req.user comes from authenticateToken */
  if (req.cart.account_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. This cart does not belong to you.' });
  }

  try { // Expected behavior
    /*Delete cart by Cart id in request (Cart_items will be deleted due to ON DELETE CASCADE)*/
    await db.query('DELETE FROM carts WHERE id = $1', [req.cartId]);
    res.status(204).send(); // Successful deletion notice
  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error during deletion' });
  }
});

//----------------------------------------------------------------------------------------

// SPECIFIC params handler
cartsRouter.param("itemId", async (req, res, next) => { // request, response, pass to next middleware
  const itemId = Number(req.params.itemId); // Makes itemId from string into a number to make it workable
  try { // Expected scenarios
    const result = await db.query( // Requests from SQL with itemId
      'SELECT * FROM cart_items WHERE id = $1',
      [itemId]
    );

    if (result.rows.length === 0) { // In case no results are retrieved from SQL
      res.status(404).json({ error: 'Cart item not found' });
    } else { // If a result is retrieved
      // Results is assigned to global variables
      req.itemId = itemId;
      req.cartItem = result.rows[0];
      next(); // Transition to next middleware
    }
  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single item
cartsRouter.get('/items/:itemId', authenticateToken, async (req, res) => {
  const itemCheck = await db.query( // First get the cart item that contains the .param specified id
    'SELECT cart_id FROM cart_items WHERE id = $1',
    [req.itemId]
  );

  if (itemCheck.rows.length === 0) { // If no result is retrieved
    return res.status(404).json({ error: 'Cart item not found' });
  }
  // Extraction from retrieval (AccountID needs to be extracted through chain search to ensure connection)
  const cartResult = itemCheck.rows[0].cart_id; // cartId from item results
  const accountResult = await db.query( // AccountId from cartId
    'SELECT account_id FROM carts WHERE id = $1',
    [cartResult]
  );
  // Ownership verification before allowing retrieval - req.user comes from authenticateToken
  if (accountResult.rows.length === 0 || accountResult.rows[0].account_id !== req.user.id) {
    return res.status(403).json({
      error: 'Access denied. This cart item does not belong to you.'
    });
  }
  res.json(req.cartItem); // Response is sent
});

/* SPECIFIC goes FIRST to avoid error in case of id coincidence
  FUTURE PROOFING*/

// Get all items in a cart
cartsRouter.get('/:id/items', authenticateToken, async (req, res) => {
  /* Verify the requested account_id matches the logged-in user
  req.cart is set by the param("id") handler above; req.user comes from authenticateToken */
  if (req.cart.account_id !== req.user.id) { // Verify this cart belongs to the logged-in user
    return res.status(403).json({ error: 'Access denied. This cart does not belong to you.' });
  };
  try { // Expected behavior
    /*Requests from SQL (With product name and id addition suggestion by deepseek)
    SELECT * FROM cart_items would've worked perfectly*/
    const result = await db.query(
      `SELECT
        cart_items.id, 
        cart_items.cart_id,
        cart_items.product_id,
        cart_items.quantity, 
        products.name,
        products.price,
        products.image_url
      FROM cart_items
      -- Due to restriction, just JOIN would work, but LEFT JOIN future proofs edge cases
      LEFT JOIN products ON cart_items.product_id = products.id
      WHERE cart_items.cart_id = $1
      ORDER BY cart_items.id`,
      [req.cartId]
    );
    res.json(result.rows); // Sends success response
  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get cart by account_id
cartsRouter.get('/user/:account_id', authenticateToken, async (req, res) => {
  const accountId = Number(req.params.account_id);
  /* Verify the requested account_id matches the logged-in user
  req.cart comes with req, and req.user with authenticateToken */
  if (accountId !== req.user.id) { // Verify this cart belongs to the logged-in user
    return res.status(403).json({ error: 'Access denied. Cannot view another user\'s cart.' });
  }
  const result = await db.query( // SQL retrieval
    'SELECT id FROM carts WHERE account_id = $1',
    [accountId]
  );
  if (result.rows.length === 0) { // If there are no results
    return res.status(404).json({ error: 'No cart found for this user' });
  }
  res.json(result.rows[0]); // Send result
});

// Add item to cart
cartsRouter.post('/:id/items', authenticateToken, async (req, res) => {
  /* Verify the needed account_id matches the logged-in user
  req.cart is set by the param("id") handler above; req.user comes from authenticateToken */
  if (req.cart.account_id !== req.user.id) { // Verify this cart belongs to the logged-in user
    return res.status(403).json({ error: 'Access denied. This cart does not belong to you.' });
  };
  try { // Expected behaviors
    const { product_id, quantity } = req.body; // Extract new item info
    if (!product_id || !quantity) { // In case there's no new info
      return res.status(400).json({ error: 'product_id and quantity are required' });
    };

    if (quantity <= 0) { // In case quantity is invalid
      return res.status(400).json({ error: 'Quantity must be positive' });
    }

    const productCheck = await db.query( // Checks if product exists in stock (products table), retrieving from SQL
      'SELECT id, price FROM products WHERE id = $1',
      [product_id]
    );

    if (productCheck.rows.length === 0) { // If it doesn't exist in stock
      return res.status(400).json({ error: 'Product does not exist in stock' });
    };

    const existingItem = await db.query( // If it does, checks if item already exists in cart
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [req.cartId, product_id]
    );

    // Update quantity instead of inserting new (In case of quantity > 0 and double "Add")
    if (existingItem.rows.length > 0) {
      const newQuantity = existingItem.rows[0].quantity + quantity; // Adds new quantity to existing quantity
      const result = await db.query( // Updates table through SQL command
        `UPDATE cart_items 
         SET quantity = $1 
         WHERE id = $2 
         RETURNING id, cart_id, product_id, quantity`,
        [newQuantity, existingItem.rows[0].id]
      );
      return res.json(result.rows[0]); // Sends success response
    };

    const result = await db.query( // Insert new cart item through SQL command
      `INSERT INTO cart_items (cart_id, product_id, quantity) 
       VALUES ($1, $2, $3) 
       RETURNING id, cart_id, product_id, quantity`,
      [req.cartId, product_id, quantity]
    );

    res.status(201).json(result.rows[0]); // Sends success response

  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error adding item to cart' });
  };
});

// Update item in cart
cartsRouter.put('/items/:itemId', authenticateToken, async (req, res) => {
  const cartCheck = await db.query( // Ensure correct cartId (itemId comes from params handler)
    'SELECT cart_id FROM cart_items WHERE id = $1',
    [req.itemId]
  );
  
  if (cartCheck.rows.length === 0) { // If there's no matching cart
    return res.status(404).json({ error: 'Cart item not found' });
  }

  // Extraction from retrieval (AccountID needs to be extracted through chain search to ensure connection)
  const cartResult = cartCheck.rows[0].cart_id; // cartId from itemId
  const accountResult = await db.query( // accountId from cartID
    'SELECT account_id FROM carts WHERE id = $1',
    [cartResult]
  );

  // Verify this cart item belongs to the logged-in user (req.user given by authenticateToken)
  if (accountResult.rows.length === 0 || accountResult.rows[0].account_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. This cart item does not belong to you.' });
  };

  try { // Expected scenarios
    const { quantity } = req.body; // New quantity (Only updateable attribute) is obtained
    if (!quantity) { // If there isn't a quantity for update
      return res.status(400).json({ error: 'quantity is required' });
    }
    if (quantity <= 0) { // If quantity isn't valid
      return res.status(400).json({ error: 'Quantity must be positive' });
    }
    const result = await db.query( // If not stopped by previous checks, updates through SQL command
      `UPDATE cart_items 
       SET quantity = $1 
       WHERE id = $2 
       RETURNING id, cart_id, product_id, quantity`,
      [quantity, req.itemId]
    );
    res.json(result.rows[0]); // Sends success response
  } catch (error) { //In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error updating item' });
  }
});

// Remove item from cart
cartsRouter.delete('/items/:itemId', authenticateToken, async (req, res) => {
  const cartCheck = await db.query( // Ensure correct cartId (itemId comes from params handler)
    'SELECT cart_id FROM cart_items WHERE id = $1',
    [req.itemId]
  );

  if (cartCheck.rows.length === 0) { // If there's no matching cart
    return res.status(404).json({ error: 'Cart item not found' });
  };

  // Extraction from retrieval (AccountID needs to be extracted through chain search to ensure connection)
  const cartResult = cartCheck.rows[0].cart_id; // cartId from itemId
  const accountResult = await db.query( // accountId from cartId
    'SELECT account_id FROM carts WHERE id = $1',
    [cartResult]
  );
  
  // Verify this cart item belongs to the logged-in user (req.user given by authenticateToken)
  if (accountResult.rows.length === 0 || accountResult.rows[0].account_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. This cart item does not belong to you.' });
  }
  try { // Expected behaviors    
    await db.query('DELETE FROM cart_items WHERE id = $1', [req.itemId]); // Request deletion through SQL command
    res.status(204).send(); // Successful deletion notice
  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error removing item' }); // Edit error
  }
});

module.exports = cartsRouter;
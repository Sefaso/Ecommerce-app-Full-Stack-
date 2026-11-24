const express = require('express'); // For router creation
const productsRouter = express.Router(); // Router creation
const db = require('../Database/index.js'); // Database connection
const authenticateToken = require('../Middleware/auth'); // JWT verification middleware

//PRODUCTS param handler
productsRouter.param("id", async (req, res, next) => {
  const productId = Number(req.params.id); // Converts id to number so it can be worked
  try { // Expected behaviors
    const result = await db.query( // Retrieves result from executing SQL search with Id
      'SELECT * FROM products WHERE id = $1',
      [productId]
    );
    if (result.rows.length === 0) { // If nothing comes back from SQL
      res.status(404).json({ error: 'Product not found' });
    } else { // If a result is retrieved
      // Product details are assigned to global variables
      req.productId = productId;
      req.product = result.rows[0];
      next(); // Transition to next middleware
    };
  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

//MIDDLEWARE

// Get all products
productsRouter.get('/', async (req, res) => {
  try { // Expected behaviors
    const result = await db.query( // Requests from SQL
      'SELECT id, name, price, description, image_url FROM products ORDER BY id'
    );
    console.log('Products query successful, rows:', result.rows.length); // Debugging line
    res.json(result.rows); // Sends to API
  } catch (error) {  // In case of error
    console.error(error); // Debugging line
    res.status(500).json({ error: 'Database error' });
  };
});

// Get single product
productsRouter.get('/:id', (req, res) => { 
  res.json(req.product); // Sends result already obtained in .params handler
});

// Update a product - (authenticateToken to protect this admin-level route)
productsRouter.put('/:id', authenticateToken, async (req, res) => {
  try { // Expected behaviors
    const { name, price, description, image_url } = req.body; // Extract data from entry
    // Utilities
    const updates = []; // Through method, for final SQL query assembly
    const values = []; // Array of actual contained values, synced to updates
    let valueCounter = 1; // To increase on each updated piece of data, so at the end, id remains last no matter the length

    // Build dynamic UPDATE query
    
    if (name) { // Update name alone
      updates.push(`name = $${valueCounter++}`);
      values.push(name);
    };
    if (price) { // Update price alone
      updates.push(`price = $${valueCounter++}`);
      values.push(price);
    };
    if (description) { // Update description alone
      updates.push(`description = $${valueCounter++}`);
      values.push(description);
    };
    if (image_url) { // Update image_url alone
      updates.push(`image_url = $${valueCounter++}`);
      values.push(image_url);
    };
    if (updates.length === 0) { // If no updates are made
      return res.status(400).json({ error: 'No fields to update' });
    };
    values.push(req.productId); // Id is added to info array

    // Assembly of update for SQL command
    const command = `
      UPDATE products 
      SET ${updates.join(', ')} 
      WHERE id = $${valueCounter} 
      RETURNING id, name, price
    `;
    const result = await db.query(command, values); // SQL response is caught

    /* Result is sent through API for confirmation
    Could also with be res.status(200).json(message: 'Success string')*/
    res.json(result.rows[0]);
  }  catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error during update' });
  }
});

// Create product - (authenticateToken to protect this admin-level route)
productsRouter.post('/', authenticateToken, async (req, res) => {
  try { // Expected behaviors
    const { name, price, description, image_url } = req.body; // Extracts product creation data from request

    if (!name || !price || !description || !image_url) { // In case ANY field is not filled
      return res.status(400).json({
        error: 'Name, price, description or image link are required'
      });
    };
    
    const checkProduct = await db.query( // Check if product already exists
      'SELECT id FROM products WHERE name = $1',
      [name]
    );

    
    if (checkProduct.rows.length > 0) { // If any result is retrieved (Result exists)
      return res.status(400).json({
        error: 'Product with this name already exists'
      });
    };
    
    const result = await db.query( // Insert new product through SQL command
      `INSERT INTO products (name, price, description, image_url) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, price, description, image_url`,
      [name, price, description, image_url]
    );
    
    res.status(201).json(result.rows[0]); // Notify success and enter trough SQL array

  } catch (error) { // In case of error*/
    console.error(error);
    res.status(500).json({ error: 'Database error during product creation' });
  }
});

// Delete a product - (authenticateToken to protect this admin-level route)
productsRouter.delete('/:id', authenticateToken, async (req, res) => {
  try { // Expected results
    await db.query('DELETE FROM products WHERE id = $1', [req.productId]); // Send request to SQL (already taken by .params handler)
    res.status(204).send(); //Successful deletion
  }  catch (error) { // In case of errors
    console.error(error);
    res.status(500).json({ error: 'Database error during deletion' });
  }
});

module.exports = productsRouter;
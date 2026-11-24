const express = require('express'); // For express.js
const accountsRouter = express.Router(); // Creates router
const db = require('../Database/index.js'); //I mport DB connection
const bcrypt = require('bcrypt'); // For encryption
const jwt = require('jsonwebtoken'); // For token generation
const authenticateToken = require('../Middleware/auth'); //JWT verification middleware

const JWT_SECRET = process.env.JWT_SECRET || 'StarWars-OldCodesButTheyllWork'; // Token password

// ACCOUNT Params handler
accountsRouter.param("id", async (req, res, next) => {
  const accountId = Number(req.params.id); // Makes account_id workable
  try { // Scenarios with a valid Id
    const result = await db.query( // Retrieves result from executing SQL search with Id
      'SELECT * FROM accounts WHERE id = $1',
      [accountId]
    );
    if (result.rows.length === 0) { // If not found (0 rows)
      res.status(404).json({ error: 'Account not found' });
    } else { // If a result is retrieved
      // If found, assign info for rest of routes
      req.accountId = accountId;
      req.account = result.rows[0];

      next(); // Transition to next middleware
    }
  } catch (error) { // Scenario with an invalid Id
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

//MIDDLEWARE

// Get all accounts (Kept for tradition. Possible leak risk) (authenticateToken to protect this admin-level route)
accountsRouter.get('/', authenticateToken, async (req, res) => {
  try { // Expected behaviors
    const result = await db.query( // Retrieves from SQL tables
      'SELECT id, username, email, created_at FROM accounts ORDER BY id'
    );
    res.json(result.rows); // Sends result
  } catch (error) { //In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get current user from token (No additional authenticateToken needed - this route verifies token internally)
accountsRouter.get('/me', async (req, res) => {
  try { // Expected behaviors
    const authHeader = req.headers.authorization; // Get token from Authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) { // If authorization header doesn't exist, or if it doesn't start with 'Bearer'
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1]; // Token is extracted from authorization header
    const decoded = jwt.verify(token, JWT_SECRET); // Verify token, recovering the payload initially provided to '/login'

    const result = await db.query( // Get user from database
      'SELECT id, username, email, created_at FROM accounts WHERE id = $1',
      [decoded.id] // Decoded is the initially provided '/login' data, so .id is user id
    );
    
    if (result.rows.length === 0) { // If no result is retrieved
      return res.status(404).json({ error: 'User not found' });
    };
    res.json(result.rows[0]); // Result is sent to API
  } catch (error) { // In case of error 
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    };
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    };
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

/* SPECIFIC (current user) goes FIRST to avoid error in case of id match
  FUTURE PROOFING*/

// Get single account
accountsRouter.get('/:id', authenticateToken, (req, res) => {
  /* Ownership verification before allowing retrieval 
  req.account comes with params (function on line 11), and req.user with authenticateToken */
  if (req.account.id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. This account does not belong to you.' });
  }

  const { password, ...accountWithoutPassword } = req.account; // Account is deconstructed once obtained
  
  res.json(accountWithoutPassword); // And sent with the password excluded
});

// Update an account
accountsRouter.put('/:id', authenticateToken, async (req, res) => {
  /* Ownership verification before allowing update 
  req.account comes with params, and req.user with authenticateToken */
  if (req.account.id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. Cannot update another user\'s account.' });
  }

  
  try { // Expected behaviors
    const { username, email, password } = req.body; // Extract data from entry

    //Utilities
    const updates = []; // Through method, for final SQL query assembly
    const values = []; // Array of actual contained values, synced to updates
    
    let valueCounter = 1; //To increase on each updated piece of data, so at the end, id remains last no matter the length

    //Build dynamic UPDATE query
    if (username) { // Update username alone
      updates.push(`username = $${valueCounter++}`);
      values.push(username);
    };
    
    if (email) { // Update email alone
      updates.push(`email = $${valueCounter++}`);
      values.push(email);
    };
    
    if (password) { // Update password alone
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password = $${valueCounter++}`);
      values.push(hashedPassword);
    };
    
    if (updates.length === 0) { // If no updates are made
      return res.status(400).json({ error: 'No fields to update' });
    };

    values.push(req.accountId); // Id is added to info array

    // Assembly of update for SQL command
    const command = `
      UPDATE accounts 
      SET ${updates.join(', ')} 
      WHERE id = $${valueCounter} 
      RETURNING id, username, email, created_at
    `;

    const result = await db.query(command, values); // SQL command is sent with values

    /*Result is sent through API for confirmation
    Could also be res.status(200).json(message: 'Success string')*/
    res.json(result.rows[0]);
  } catch (error) { //In case of error
    console.error(error);
    res.status(500).json({ error: 'Database error during update' });
  }
});

// Register new user (dedicated registration endpoint)
accountsRouter.post('/register', async (req, res) => {
  try { // Expected behaviors
    const { username, email, password } = req.body; // Extracts account creation data
    if (!username || !email || !password) { // In case ANY field is not filled
      return res.status(400).json({
        error: 'Username, email, and password are required'
      });
    };

    const checkUser = await db.query( // Check if user already exists
      'SELECT id FROM accounts WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (checkUser.rows.length > 0) { // If any result is retrieved (Result exists)
      return res.status(400).json({
        error: 'Username or email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password (cost factor 10)
    
    const result = await db.query( // Insert new user through SQL command
      `INSERT INTO accounts (username, email, password) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email, created_at`,
      [username, email, hashedPassword]
    );
    
    res.status(201).json({ // Notify success and enter trough SQL array
      message: 'User registered successfully',
      user: result.rows[0]
    });
  } catch (error) { // In case of error
    console.error(error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

//Account login
accountsRouter.post('/login', async (req, res) => {
  try { // Expected behaviors
    const { username, password } = req.body; // Extracts needed attributes
    const result = await db.query( // Finds by username in db
      'SELECT * FROM accounts WHERE username = $1',
      [username]
    );
    if (result.rows.length === 0) { // If user doesn't exist
      return res.status(401).json({ error: "User doesn't exist" });
    }
  
    const user = result.rows[0]; // Assign user to operation
    const verified = await bcrypt.compare(password, user.password); // Compare password with stored hash
    if (!verified) { // If password isn't valid
      return res.status(401).json({ error: 'Invalid password' });
    };
    const token = jwt.sign( // Generate JWT token and it's expiration
      { id: user.id, username: user.username },
      JWT_SECRET, // The token pass is applied
      { expiresIn: '1d' /*Expires in 1 day (Expressed this way for jwt)*/ }
    );
    // Return success notification
    const { password: _, ...userWithoutPassword } = user; //'_,' means "Ignore value": Useful for password skipping
    res.json({
      message: 'Login successful',
      token, //Token is applied
      user: userWithoutPassword // Extracted through deconstruction (Look above)
    });
  } catch (error) {  //In case of error
    console.error(error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

//Delete an account
accountsRouter.delete('/:id', authenticateToken, async (req, res) => {
  /* Ownership verification before allowing deletion 
  req.account comes with params (function on line 11), and req.user with authenticateToken */
  if (req.account.id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. Cannot delete another user\'s account.' });
  }
  try { // Expected behaviors
    await db.query('DELETE FROM accounts WHERE id = $1', [req.accountId]); // Send request to SQL
    res.status(204).send(); //Successful deletion
  } catch (error) { //In case of errors
    console.error(error);
    res.status(500).json({ error: 'Database error during deletion' });
  }
});

module.exports = accountsRouter;
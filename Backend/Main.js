// BACKEND LANDING POINT FOR FRONTEND REQUESTS and behavior setting

require('dotenv').config(); // .env enabling
// console.log('DB_PASSWORD from .env:', process.env.DB_PASSWORD); // Should print 'postgres'

const passport = require('./passportConfig'); // Import passport config
const express = require('express'); // To enable server creation
const session = require('express-session');// For session setting
const app = express(); console.log('2. app created'); // Server creation
const swaggerJSDoc = require('swagger-jsdoc'); // To interpret swagger configuration
const swaggerUi = require('swagger-ui-express'); // To enter swagger configuration interpretation
const cors = require('cors'); // For CORS

// Routes (Routers for elements)
const productsRouter = require('./Routes/Products.js');
const accountsRouter = require('./Routes/Accounts.js');
const cartsRouter = require('./Routes/Carts.js');
const ordersRouter = require('./Routes/Orders.js');
const paymentsRouter = require('./Routes/Payments.js');

app.use(cors({ // CORS implementation
  origin: 'http://localhost:3000',
  credentials: true
}));

// MIDDLEWARE (from middleware example)
app.use(express.json()); // Parse JSON bodies

// Session building
app.use(session({
  secret: process.env.SESSION_SECRET || 'Op3n5354m3',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,  // Set to true if using HTTPS
    maxAge: 1000 * 60 * 60 * 24  // 24 hours
  }
}));

// Initialize Passport and restore session state
app.use(passport.initialize());
app.use(passport.session());

// Designate port
const PORT = 2999; // 2999 so it doesn't clash with frontend

// Swagger configuration
const swaggerOptions = {
  definition: { // Kind of API
    openapi: '3.0.0',
    info: { // Info about project
      title: 'E-Commerce API',
      version: '1.0.0',
      description: 'REST API for e-commerce application',
    },
    servers: [ // Server options
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./Routes/*.js'], // Path to your route files
};

const swaggerSpec = swaggerJSDoc(swaggerOptions); // Applies the configuration to a variable
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec)); // Lets the app pick up the configuration

// These are for API routing (JSON structure)
app.use('/api/products', productsRouter); // Products
app.use('/api/users', accountsRouter); // Accounts (Including register, login, and sesion)
app.use('/api/carts', cartsRouter); // Cart and cart_items
app.use('/api/orders', ordersRouter); // Orders and order_items
app.use('/api/payments', paymentsRouter); // Payments

// OAuth routes
// Google
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('http://localhost:3001');  // React front-end URL
  }
);

// Facebook
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('http://localhost:3001'); // React front-end URL
  }
);

// Test route - add this BEFORE app.listen
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!', time: new Date().toISOString() });
});

// Logout - Session destruction
app.get('/logout', (req, res) => {
  req.logout((err) => { // In case of error or already logged out
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Logout failed' });
    };

    req.session.destroy((err) => { // Session destruction
      if (err) {
        console.error(err);
      };
      res.clearCookie('connect.sid'); // Clear the session cookie
      res.redirect('http://localhost:3001'); // Redirect to React's front-end
    });
  });
});

app.use(express.static('Client/build')); // For REACT front end integration (Placed last as all back-end need to be sorted out first)

// Start server to receive fetches from frontend
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
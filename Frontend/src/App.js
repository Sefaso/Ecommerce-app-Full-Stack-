import './App.css'; // Aesthetic
import { useState, useEffect } from 'react'; //Method variables manipulation and initial trigger
import {
  BrowserRouter, // Page container
  Routes, // Routes' container
  Route, // For individual routes
  Link, // For Routes' link's on page
  // useNavigate, //For JS-led navigation
} from 'react-router-dom';

// Different front-facing pages' routes
import Home from './Pages/Home';
import Products from './Pages/Products';
import ProductDetail from './Pages/ProductDetails';
import Cart from './Pages/Cart';
import Register from './Pages/Register';
import Login from './Pages/Login';
import OrderHistory from './Pages/OrderHistory';
import Checkout from './Pages/Checkout';

function App() {
  const [user, setUser] = useState(null);
  //const navigate = useNavigate();

  useEffect(() => { // Initial behavior
    const storedUser = localStorage.getItem('user'); // Checks if user is logged in on page load (LocalStorage)
    if (storedUser) { // If user IS logged-in
      setUser(JSON.parse(storedUser)); // setUser according to login
    }
    const token = localStorage.getItem('token'); // Token extraction from LocalStorage
    if (!token) { // If no stored user (manual login), check for active session (OAuth login)
      const checkSession = async () => {
        try {
          const response = await fetch('http://localhost:2999/api/users/me', {
            credentials: 'include' // Sends session cookie from OAuth login
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          }
        } catch (error) {
          // No active session - do nothing
        }
      };
      checkSession();
    }
  }, []);

  // Invoke Logout method from Main.js as it's session-related, not account-related
  const handleLogout = async () => {
    try { // Process backend logout
      await fetch('http://localhost:2999/logout', {
        method: 'GET',
        credentials: 'include'
      });
    } catch (error) { // In case of error
      console.error('Logout backend error:', error);
    } finally { // ALWAYS clear local storage and redirect, even if the backend failed
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      window.location.href = '/';
    }
  };

  return ( // Render
    <BrowserRouter>
      <div className="App">
        <nav className="App-nav">
          <div className="App-nav-links">
            <Link className="App-link" to="/">Home</Link>
            <Link className="App-link" to="/products">Products</Link>
            <Link className="App-link" to="/cart">Cart</Link>
          </div>

          {/*Ternary operator for display depending of log state*/}
          {user ? (
            <div className="App-nav-user">
              <span className="App-username">Welcome, {user.username}</span>
              {user && <Link className="App-link" to="/orders">Orders</Link>}
              <button className="App-logout" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div className="App-nav-user">
              <Link className="App-link" to="/login">Login</Link>
              <Link className="App-link" to="/register">Register</Link>
            </div>
          )}
        </nav>

        <main className="App-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login setUser={setUser} />} /> {/*setUser is sent as a prop to Login.js*/}
            <Route path="/register" element={<Register setUser={setUser} />} /> {/*setUser is sent as a prop to Register.js*/}
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/checkout" element={<Checkout />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
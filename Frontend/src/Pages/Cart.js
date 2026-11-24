// Necessary imports
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrCreateCart, getCartItems, updateCartItem, removeCartItem } from '../Utilities/CartBehavior.js';
import './Cart.css';

function Cart() {
    const [cartItems, setCartItems] = useState([]); //List of items
    const [loading, setLoading] = useState(true); //Set by default to 'true' (Loading cart)
    const [error, setError] = useState(''); //In case of errors
    const [updating, setUpdating] = useState(null); //When modifying cart items

    // Loads cart if there's a session going
    const loadCart = async () => {
        const token = localStorage.getItem('token'); //Gets token
        const user = JSON.parse(localStorage.getItem('user') || '{}'); //Gets user

        // If no token or ID
        if (!token || !user.id) {
            setLoading(false); //Cart won't be loaded
            return;
        }

        // Cart gets retrieved
        try {
            //Uses cart methods from '../Utilities/Cart (behavior).js'
            const cart = await getOrCreateCart(user.id, token);
            const items = await getCartItems(cart.id, token);
            // Cart gets filled
            setCartItems(items);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Implementation of loading request
    useEffect(() => {
        loadCart();
    }, []);

    // For quantity change
    const handleQuantityChange = async (itemId, newQuantity) => {
        if (newQuantity < 1) return;

        setUpdating(itemId);
        try {
            const token = localStorage.getItem('token');
            await updateCartItem(itemId, newQuantity, token);
            await loadCart(); // Refresh cart
        } catch (err) {
            setError(err.message);
        } finally {
            setUpdating(null);
        }
    };

    // Logic of removal
    const handleRemoveItem = async (itemId) => {
        setUpdating(itemId);
        try {
            const token = localStorage.getItem('token');
            await removeCartItem(itemId, token);
            await loadCart(); // Refresh cart
        } catch (err) {
            setError(err.message);
        } finally {
            setUpdating(null);
        }
    };

    // Logic of removal
    const calculateTotal = () => {
        return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
    };

    // When loading
    if (loading) return <div className="products-status loading">Loading cart...</div>;

    // Token is obtained
    const token = localStorage.getItem('token');
    // If there isn't a token (Session not started)
    if (!token) {
        return (
            <div className="cart-container">
                <h1 className="cart-title">Your Cart</h1>
                <div className="cart-empty-message">
                    <p>Please <Link to="/login" className="cart-link">log in</Link> to view your cart.</p>
                </div>
            </div>
        );
    }

    // Render
    return (
        <div className="cart-container">
            <h1 className="cart-title">Your Cart</h1>
            {error && <div className="products-status error">{error}</div>}

            {cartItems.length === 0 ? (
                // If there isn't products in cart
                <div className="cart-empty-message">
                    <p>Your cart is empty.</p>
                    <p><Link to="/products" className="cart-link">Continue shopping</Link></p>
                </div>
            ) : (
                <>
                    <div className="cart-items">
                        {/*For each item in cart*/}
                        {cartItems.map(item => (
                            <div key={item.id} className="cart-item">
                                {/*Name and price*/}
                                <div className="cart-item-info">
                                    <img src={item.image_url} alt={item.name} className="cart-item-image" />
                                    <div className="cart-item-details">
                                        <h3>{item.name}</h3>
                                        <p>${item.price} each</p>
                                    </div>
                                </div>
                                {/*Controls*/}
                                <div className="cart-item-controls">
                                    <div className="quantity-controls">
                                        {/*Decrease*/}
                                        <button
                                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                            disabled={updating === item.id}
                                        >
                                            -
                                        </button>
                                        <span>{item.quantity}</span>
                                        {/*Increase*/}
                                        <button
                                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                            disabled={updating === item.id}
                                        >
                                            +
                                        </button>
                                    </div>

                                    {/*Subtotal per item*/}
                                    <p className="item-subtotal">
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </p>

                                    {/*Remove button*/}
                                    <button
                                        className="remove-btn"
                                        onClick={() => handleRemoveItem(item.id)}
                                        disabled={updating === item.id}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total and checkout button*/}
                    <div className="cart-summary">
                        <h2>Total: <span className="cart-total-price">${calculateTotal()}</span></h2>
                        <Link to="/checkout" className="checkout-link">
                            <button className="checkout-btn">
                                Proceed to Checkout
                            </button>
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}

export default Cart;
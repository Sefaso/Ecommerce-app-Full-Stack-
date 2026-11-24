// NECESSARY IMPORTS
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js'; // Loads Stripe SDK asynchronously
import {
    Elements, // Wrapper component that provides Stripe context
    PaymentElement, // Stripe's pre-built form for card details
    useStripe, // Hook to access Stripe instance
    useElements, // Hook to access Elements instance (form state)
} from '@stripe/react-stripe-js';
import { useNavigate, Link } from 'react-router-dom';
import { getOrCreateCart, getCartItems } from '../Utilities/CartBehavior';
import './Checkout.css';

// STRIPE INITIALIZATION
// Load Stripe outside of component to avoid recreating on each render
// Uses publishable key from .env (safe to expose in frontend)
// This creates a Promise that resolves to Stripe instance
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// CHECKOUT FORM COMPONENT - Renders the payment form and handles form submission
// Props:
//   cartItems: Array of items in cart (for order summary display)
//   total: Total amount to charge
//   cartId: ID of current cart (for reference)
//   onSuccess: Callback when payment succeeds
//   onError: Callback when payment fails
function CheckoutForm({ cartItems, total, cartId, onSuccess, onError }) {
    const stripe = useStripe(); // Access Stripe instance (set up by Elements wrapper)
    const elements = useElements(); // Access Elements instance (manages payment form state)

    // Local state for UI feedback
    const [isProcessing, setIsProcessing] = useState(false); // Disables button during processing
    const [errorMessage, setErrorMessage] = useState(''); // Shows error to user

    // Handle from submission (User clicks "Pay" button)
    const handleSubmit = async (event) => {
        event.preventDefault(); // Prevent default browser form submission

        // Wait for Stripe and Elements to be ready
        if (!stripe || !elements) return; // Still loading, can't submit yet

        setIsProcessing(true); // Show loading state on button

        // Tell Stripe to complete the payment
        // stripe.confirmPayment() sends card details to Stripe servers
        // Stripe processes the payment WITHOUT your backend involved
        const { error } = await stripe.confirmPayment({
            elements, // Contains the card data user entered
            confirmParams: {
                return_url: `${window.location.origin}/order-confirmation`, // Where to redirect after payment
            },  // ACA ARRIBA?
            redirect: 'if_required', // Only redirect if Stripe requires it (3D Secure, etc.)
        });

        // Handle the result
        if (error) {
            // Payment failed (declined card, insufficient funds, etc.)
            setErrorMessage(error.message);
            onError(error.message);
            setIsProcessing(false);
        } else {
            onSuccess(); // Navigate to confirmation page
        }
    };

    // RENDER CHECKOUT FORM
    return (
        <form onSubmit={handleSubmit} className="checkout-form">
            {/* ORDER SUMMARY SECTION (Read-only, shows what user is buying) */}
            <div className="order-summary">
                <h3>Order Summary</h3>
                <div className="summary-items-list">
                    {cartItems.map(item => (
                        <div key={item.id} className="summary-item">
                            <span>{item.name} <span className="summary-qty">x{item.quantity}</span></span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <div className="summary-total">
                    <strong>Total:</strong>
                    <strong className="total-price">${total.toFixed(2)}</strong>
                </div>
            </div>

            {/* PAYMENT SECTION (Stripe handles security) */}
            <div className="payment-section">
                <h3>Payment Details</h3>

                {/* Stripe's pre-built form for card number, expiry, CVC
                    Credit card data goes DIRECTLY to Stripe, NEVER to your server */}
                <div className="stripe-element-wrapper">
                    <PaymentElement />
                </div>

                {/* Show error message if payment fails */}
                {errorMessage && <div className="products-status error">{errorMessage}</div>}

                {/* Submit button (disabled while processing or Stripe not ready) */}
                <button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="pay-button"
                >
                    {isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
                </button>
            </div>
        </form>
    );
};

// MAIN CHECKOUT PAGE - Loads cart data, creates PaymentIntent, renders Stripe Elements
function Checkout() {
    // State variables
    const [cartItems, setCartItems] = useState([]); // Items in cart
    const [clientSecret, setClientSecret] = useState(''); // Stripe's payment session key
    const [loading, setLoading] = useState(true); // Loading state
    const [error, setError] = useState(''); // Error message
    const [cartId, setCartId] = useState(null); // Current cart ID
    const navigate = useNavigate(); // For redirecting

    // LOAD CHECKOUT DATA WHEN PAGE MOUNTS
    const loadCheckoutData = async () => {
        // Get authentication from localStorage
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        // If not logged in, redirect to login page
        if (!token || !user.id) {
            navigate('/login');
            return;
        }

        try {
            // Get or create user's cart
            const cart = await getOrCreateCart(user.id, token);
            setCartId(cart.id);

            // Get all items in the cart
            const items = await getCartItems(cart.id, token);
            setCartItems(items);

            // If cart is empty, show error
            if (items.length === 0) {
                setError('Your cart is empty');
                setLoading(false);
                return;
            }

            //  Calculate total amount
            const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // ==========================================
            // 🚧 TEMPORARY DEV BYPASS FOR STYLING 🚧
            // ==========================================
            setClientSecret('pi_fake_secret_for_testing_purposes_only');
            setLoading(false);
            return; // Stop here! Don't hit the backend.
            // ==========================================

            // // Create PaymentIntent on YOUR backend
            // // This tells Stripe "expect a payment of $X"
            // const response = await fetch('http://localhost:2999/api/payments/create-payment-intent', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //         'Authorization': `Bearer ${token}` // Identifies the user
            //     },
            //     body: JSON.stringify({
            //         cartId: cart.id,
            //         accountId: user.id,
            //         amount: total
            //     })
            // });

            // const data = await response.json(); // Response catching

            // if (!response.ok) {// If backend fails, show error
            //     throw new Error(data.error || 'Failed to initialize payment');
            // }

            // // Store clientSecret for Stripe
            // // clientSecret is like a "payment session token"
            // // Frontend needs this to complete the payment
            // setClientSecret(data.clientSecret);

        } catch (err) {
            setError(err.message);
        } finally { // Either way
            setLoading(false);
        }
    };

    useEffect(() => { // Implement Checkout Data loading
        loadCheckoutData();
    }, []); // Empty dependency array = runs once when component mounts

    // CALLBACKS FOR CHECKOUT FORM (Handlers)
    const handlePaymentSuccess = () => { // Payment succeeded! Redirect to confirmation page
        navigate('/orders');
    };

    const handlePaymentError = (errMsg) => {
        console.error('Payment error:', errMsg);  // Payment failed (will be shown in form)
    };

    // RENDER LOADING STATE
    if (loading) {
        return <div className="products-status loading">Loading checkout...</div>;
    }

    // RENDER ERROR STATE
    if (error) {
        return (
            <div className="checkout-container">
                <h1 className="checkout-title">Checkout</h1>
                <div className="cart-empty-message">
                    <p className="products-status error">{error}</p>
                    <Link to="/cart" className="shop-now-link">Back to Cart</Link>
                </div>
            </div>
        );
    }

    // STRIPE element's color preferences
    const styleOptions = {
        clientSecret: clientSecret,
        appearance: {
            theme: 'night',
            variables: {
                colorPrimary: 'hsl(180, 100%, 25%)',
                colorBackground: 'hsl(180, 10%, 10%)',
                colorText: 'hsl(180, 100%, 50%)',
                fontFamily: 'system-ui, sans-serif',
                borderRadius: '10px',
            },
            rules: {
                // Target the container of the input field
                '.Input': {
                    border: '1px solid hsl(180, 100%, 25%)',
                    boxShadow: '0 0 3px hsla(0, 0, 0%, 0.25)',
                },
                // Target the input field when the user clicks into it
                '.Input:focus': {
                    border: '1px solid #00ffff',
                    boxShadow: '0 0 5px hsla(0, 0, 0%, 0.25)',
                },
                // Target the label (e.g., "Card number")
                '.Label': {
                    color: 'hsl(180, 100%, 50%)',
                    fontWeight: 'bold',
                },
                // Target the error text
                '.Error': {
                    color: 'hsl(0, 100%, 50%)',
                }
            }
        },
    };

    // Recalculate total (could also use clientSecret amount)
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // RENDER OF SUCCESS
    return (
        <div className="checkout-container">
            <h1 className="checkout-title">Checkout</h1>

            {/* Only render Stripe Elements if we have clientSecret */}
            {clientSecret && (
                // Elements wrapper provides Stripe context to all children
                <Elements stripe={stripePromise} options={styleOptions}>
                    <CheckoutForm
                        cartItems={cartItems}
                        total={total}
                        cartId={cartId}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                    />
                </Elements>
            )}
        </div>
    );
}

export default Checkout;
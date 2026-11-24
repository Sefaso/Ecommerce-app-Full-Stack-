// Necessary imports
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './OrderHistory.css';

function OrderHistory() { // Orders history element
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null); // For specific order details
    const [orderItems, setOrderItems] = useState([]);

    // Fetch user's orders
    const fetchOrders = async () => {
        // Token and user taken from session
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (!token || !user.id) { // Redirect if not logged in (user and token not found)
            setError('Please log in to view your order history');
            setLoading(false);
            return;
        }

        try { // Expected behavior
            // Requests to orders router through route
            const response = await fetch(`http://localhost:2999/api/orders/user/${user.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) { // If there's no approval
                throw new Error('Failed to fetch orders');
            }
            const data = await response.json(); // Response gets translated into readable data
            setOrders(data); // Data gets sorted into orders
        } catch (err) { // In case of error
            setError(err.message);
        } finally { // Either way
            setLoading(false);
        }
    };

    // Fetch item in for a specific order
    const fetchOrderItems = async (orderId) => {
        const token = localStorage.getItem('token'); // Token is taken from session

        try { // Expected behavior
            // Request to orders through route
            const response = await fetch(`http://localhost:2999/api/orders/${orderId}/items`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) { // If there's no approval
                throw new Error('Failed to fetch order items');
            }

            const data = await response.json(); // Response get translated into readable data
            setOrderItems(data); // Data gets sorted into orders
        } catch (err) { // In case of error
            console.error('Error fetching order items:', err);
            setOrderItems([]);
        }
    };

    // View details-click handler
    const handleOrderClick = async (order) => {
        if (selectedOrder === order.id) { // If selected order matches requested one 
            setSelectedOrder(null); // Close if already open
            setOrderItems([]); // Set Order empty
        } else {
            setSelectedOrder(order.id); // Assign selected
            await fetchOrderItems(order.id); // Retrieve order elements
        }
    };

    // Load orders on page mount
    useEffect(() => {
        fetchOrders();
    }, []);

    // render loading state
    if (loading) {
        return <div className="loading">Loading order history...</div>;
    }

    // Render Authentication-required state   
    const token = localStorage.getItem('token'); // Token is retrieved, if it exists
    if (!token) { // If there isn't one
        return (
            <div className="order-history-container">
                <h1 className="order-history-title">Order History</h1>
                <div className="cart-empty-message">
                    <p>Please <Link to="/login" className="cart-link">log in</Link> to view your order history.</p>
                </div>
            </div>
        );
    }

    // Render eror state
    if (error) {
        return (
            <div className="order-history-container">
                <h1 className="order-history-title">Order History</h1>
                <div className="products-status error">{error}</div>
            </div>
        );
    }

    // Date format helper
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Render order history
    return (
        <div className="order-history-container">
            <h1 className="order-history-title">Order History</h1>

            {/*Ternary operator for render*/}
            {orders.length === 0 ? ( // In case there's no orders
                <div className="no-orders">
                    <p>You haven't placed any orders yet.</p>
                    <Link to="/products" className="shop-now-link">
                        Start Shopping
                    </Link>
                </div>
            ) : ( // In case there's 1 or more orders
                <div className="orders-list">
                    {/*For each order*/}
                    {orders.map(order => (
                        <div key={order.id} className="order-card">
                            <div
                                className="order-header"
                                onClick={() => handleOrderClick(order)}
                            >
                                <div className="order-info">
                                    <span className="order-number">Order #{order.id}</span>
                                    <span className="order-date">{formatDate(order.created_at)}</span>
                                    <span className={`order-status ${order.status.toLowerCase()}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="order-total">
                                    <strong>Total: ${parseFloat(order.total_price).toFixed(2)}</strong>
                                </div>
                            </div>

                            {/* Expandable order items section */}
                            {selectedOrder === order.id && (
                                <div className="order-items">
                                    <h4>Order Items</h4>
                                    <table className="order-items-table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Quantity</th>
                                                <th>Price</th>
                                                <th>Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orderItems.map(item => (
                                                <tr key={item.product_id}>
                                                    <td>{item.name}</td>
                                                    <td>{item.quantity}</td>
                                                    <td>${parseFloat(item.price).toFixed(2)}</td>
                                                    <td>${(item.quantity * parseFloat(item.price)).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default OrderHistory;
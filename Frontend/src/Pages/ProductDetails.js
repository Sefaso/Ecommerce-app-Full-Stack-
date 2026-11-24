// Necessary imports
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrCreateCart, addToCart } from '../Utilities/CartBehavior.js';
import './ProductDetails.css';

function ProductDetail() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);
    const [cartMessage, setCartMessage] = useState('');

    // Fetch to back-end for product's details 
    const fetchProduct = async () => {
        try {
            const response = await fetch(`http://localhost:2999/api/products/${id}`);
            if (!response.ok) {
                throw new Error('Product not found');
            }
            const data = await response.json();
            // Stores for manipulation
            setProduct(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Implementation of fetch request
    useEffect(() => {
        fetchProduct();
    }, [id]);

    // To add products to cart
    const handleAddToCart = async () => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (!token || !user.id) {
            setCartMessage('Please log in to add items to cart');
            setTimeout(() => setCartMessage(''), 3000);
            return;
        }

        setAddingToCart(true);
        setCartMessage('');

        try {
            // Get or create user's cart
            const cart = await getOrCreateCart(user.id, token);
            // Add item to cart
            await addToCart(cart.id, parseInt(id), quantity, token);
            setCartMessage('Item added to cart successfully!');
            setTimeout(() => setCartMessage(''), 3000);
        } catch (err) {
            setCartMessage(err.message);
            setTimeout(() => setCartMessage(''), 3000);
        } finally {
            setAddingToCart(false);
        }
    };

    // Status handlers
    if (loading) return <div className="products-status loading">Loading product...</div>;
    if (error) return <div className="products-status error">Error: {error}</div>;
    if (!product) return null;

    //Render
    return (
        <div className="product-detail-container">

            {/*Link back to products' list*/}
            <Link to="/products" className="back-link">← Back to Products</Link>

            {/*Message of addition to cart*/}
            {cartMessage && (
                <div className={`cart-message ${cartMessage.includes('success') ? 'success' : 'error'}`}>
                    {cartMessage}
                </div>
            )}

            {/*Product details (In 2 sections for readability)*/}
            <div className="product-detail">
                <img
                    src={product.image_url}
                    alt={product.name}
                    className="product-detail-image"
                    onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/500x400?text=No+Image';
                    }}
                />
                <div className="product-detail-info">
                    <h1>{product.name}</h1>
                    <p className="product-detail-price">${product.price}</p>
                    <p className="product-detail-description">{product.description}</p>
                    {/*Quantity selector for product*/}
                    <div className="quantity-selector">
                        <label>Quantity: </label>
                        <input
                            type="number"
                            min="1"
                            className="quantity-input"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        />
                    </div>
                    {/*Button for initial addition*/}
                    <button
                        className="add-to-cart-btn"
                        onClick={handleAddToCart}
                        disabled={addingToCart}
                    >
                        {addingToCart ? 'Adding...' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProductDetail;
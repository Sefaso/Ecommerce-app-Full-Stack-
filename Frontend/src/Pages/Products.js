//Necessary imports
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Products.css';

function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    //Fetch to back-end for products' list 
    const fetchProducts = async () => {
        try {
            const response = await fetch('http://localhost:2999/api/products');
            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }
            const data = await response.json();
            setProducts(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    //Implementation of fetch request
    useEffect(() => {
        fetchProducts();
    }, []);

    //Status handlers
    if (loading) return <div className="products-status loading">Loading products...</div>;
    if (error) return <div className="products-status error">Error: {error}</div>;

    //Render
    return (
        <div className="products-container">
            <h1 className="products-title">Our Products</h1>
            <div className="products-grid">
                {/*For each product in the products' array*/}
                {products.map(product => (
                    <div key={product.id} className="product-card">
                        {/*Image*/}
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="product-image"
                            onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                            }}
                        />
                        {/*Data*/}
                        <div className="product-info">
                            <h3 className="product-name">{product.name}</h3>
                            <p className="product-description">{product.description}</p>
                            <p className="product-price">${product.price}</p>
                        </div>
                        <Link to={`/products/${product.id}`} className="product-link">
                            <button className="view-details-btn">
                                View Details
                            </button>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Products;
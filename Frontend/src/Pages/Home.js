import './Home.css';
import { Link } from 'react-router-dom';

function Home() {
    return (
        <div className="home-container">

            {/* Hero section */}
            <section className="home-hero">
                <h1 className="home-title">Welcome to the Store</h1>
                <p className="home-subtitle">
                    Browse products, build your cart, and check out in seconds.
                </p>

                <div className="home-cta-group">
                    <Link className="home-cta home-cta-primary" to="/products">
                        Browse Products
                    </Link>
                    <Link className="home-cta home-cta-secondary" to="/cart">
                        View Cart
                    </Link>
                </div>
            </section>

            {/* Feature cards — placeholders, edit freely */}
            <section className="home-features">
                <div className="home-feature-card">
                    <h3>Fast Shipping</h3>
                    <p>Get your orders delivered quickly and reliably.</p>
                </div>
                <div className="home-feature-card">
                    <h3>Secure Checkout</h3>
                    <p>Your payment and account data stay protected.</p>
                </div>
                <div className="home-feature-card">
                    <h3>Easy Returns</h3>
                    <p>Not satisfied? Return items with no hassle.</p>
                </div>
            </section>

        </div>
    );
}
export default Home;
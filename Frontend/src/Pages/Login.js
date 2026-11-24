// Necessary imports
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { handleGoogleAuth, handleFacebookAuth } from '../Utilities/Oauth';
import './Register.css'; // Same style

function Login({ setUser }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // For form submission (Already takes 'Enter' into consideration)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Logic
        try {
            // fetch to back-end throught API route
            const response = await fetch('http:// localhost:2999/api/users/login', {
                // Nature of request
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Adds credentials from form into JSON response
                body: JSON.stringify({ username, password }),
            });

            // Response is stored for manipulation
            const data = await response.json();

            if (response.ok) {
                // Store token and user info
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user); // For user to be taken or removed (Logout)
                navigate('/'); // Redirect to home page
            } else { // In case login fails
                setError(data.error || 'Login failed');
            }
        } catch (err) { // In case of error
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Element render
    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Login</h2>

                {error && <div className="auth-error">{error}</div>}

                {/* Form */}
                <form onSubmit={handleSubmit} className="auth-form">
                    {/* Username placing */}
                    <div className="form-group">
                        <label>Username:</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="auth-input"
                        />
                    </div>
                    {/* Password placing */}
                    <div className="form-group">
                        <label>Password:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="auth-input"
                        />
                    </div>
                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="auth-button"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                {/* Oauth options */}
                <div className="oauth-section">
                    <p className="oauth-divider">Or login with:</p>
                    <div className="oauth-buttons">
                        {/*Google button*/}
                        <button onClick={handleGoogleAuth} className="oauth-btn google-btn">
                            <img src="https://www.freepnglogos.com/uploads/google-logo-png/google-logo-png-google-icon-logo-png-transparent-svg-vector-bie-supply-14.png"></img>
                            Google
                        </button>
                        {/*Facebook button*/}
                        <button onClick={handleFacebookAuth} className="oauth-btn facebook-btn">
                            <img src="https://static.vecteezy.com/system/resources/previews/020/964/386/original/facebook-circle-icon-for-web-design-free-png.png"></img>
                            Facebook
                        </button>
                    </div>
                </div>

                {/* Register option */}
                <p className="auth-link">
                    Don't have an account? <Link to="/register">Register here</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;
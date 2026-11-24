// Necessary imports
import { useState } from 'react'; // Mutating variables
import { Link, useNavigate } from 'react-router-dom'; // For dynamic page render
import { handleGoogleAuth, handleFacebookAuth } from '../Utilities/Oauth'; // 3rd-party authorizations
import './Register.css';

function Register({ setUser }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
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
            // Fetch to back-end throught API route
            const response = await fetch('http: // localhost:2999/api/users/register', {
                // Nature of request (HTTP verb)
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Specifies type
                },
                // Adds credentials from form into JSON response
                body: JSON.stringify({ username, email, password }),
            });

            // Response is stored for manipulation
            const data = await response.json();

            if (response.ok) {
                // After registration, it automatically logs in
                const loginResponse = await fetch('http: // localhost:2999/api/users/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // Specifies type
                    },
                    // Takes the login credentials
                    body: JSON.stringify({ username, password }),
                });

                // Stores the login data for manipulation
                const loginData = await loginResponse.json();

                // If login is successful
                if (loginResponse.ok) {
                    // Store token and user info
                    localStorage.setItem('token', loginData.token);
                    localStorage.setItem('user', JSON.stringify(loginData.user));
                    setUser(loginData.user); // Update App.js user state
                    navigate('/'); // Go to home page
                } else {
                    // Registration worked but login failed (unlikely)
                    alert('Registration successful! Please log in manually.');
                    navigate('/login');
                }
            } else { // In case registration fails
                setError(data.error || 'Registration failed');
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
                <h2>Register</h2>
                {error && <div className="auth-error">{error}</div>}

                {/* Form */}
                <form onSubmit={handleSubmit} className="auth-form">
                    {/* Username setting */}
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
                    {/* Email setting */}
                    <div className="form-group">
                        <label>Email:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="auth-input"
                        />
                    </div>
                    {/* Password setting */}
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
                    <button type="submit" disabled={loading} className="auth-button">
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>

                {/* Oauth options */}
                <div className="oauth-section">
                    <p className="oauth-divider">Or register with:</p>
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

                {/* Login option */}
                <p className="auth-link">
                    Already have an account? <Link to="/login">Login here</Link>
                </p>
            </div>
        </div>
    );
}

export default Register;
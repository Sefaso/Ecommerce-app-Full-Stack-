// Get or create cart for the logged-in user
export const getOrCreateCart = async (accountId, token) => {
    try {
        // First, try to get existing cart
        const response = await fetch(`http://localhost:2999/api/carts/user/${accountId}`, {
            headers: {
                'Authorization': `Bearer ${token}` //Specifies type
            }
        });

        // If there's a cart, retrieves it
        if (response.ok) {
            const cart = await response.json();
            return cart;
        }

        if (response.status === 404) {
            // Cart doesn't exist, create one
            const createResponse = await fetch('http://localhost:2999/api/carts', {
                method: 'POST', //SQL request HTTP verb
                headers: {
                    'Content-Type': 'application/json', //Specifies type
                    'Authorization': `Bearer ${token}` //Provides token for verification
                },
                body: JSON.stringify({ account_id: accountId }) //Info for SQL request 
            });

            //JSON response is reformatted
            if (createResponse.ok) {
                const newCart = await createResponse.json();
                return newCart;
            }
        }
        // In case of error
        throw new Error('Failed to get or create cart');
    } catch (error) {
        console.error('Cart error:', error);
        throw error;
    }
};

// Add item to cart
export const addToCart = async (cartId, productId, quantity, token) => {
    const response = await fetch(`http://localhost:2999/api/carts/${cartId}/items`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', //Specifies type
            'Authorization': `Bearer ${token}` //Provides token for verification
        },
        body: JSON.stringify({ product_id: productId, quantity })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add item to cart');
    }

    return response.json();
};

// Get cart items
export const getCartItems = async (cartId, token) => {
    const response = await fetch(`http://localhost:2999/api/carts/${cartId}/items`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch cart items');
    }

    return response.json();
};

// Update cart item quantity
export const updateCartItem = async (itemId, quantity, token) => {
    const response = await fetch(`http://localhost:2999/api/carts/items/${itemId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
    });

    if (!response.ok) {
        throw new Error('Failed to update cart item');
    }

    return response.json();
};

// Remove item from cart
export const removeCartItem = async (itemId, token) => {
    const response = await fetch(`http://localhost:2999/api/carts/items/${itemId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to remove cart item');
    }

    return true;
};
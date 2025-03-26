import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './signin.css';
import { AuthState } from '../app'; // This should now work

export async function logoutUser() {
  await fetch('/api/auth/logout', {
    method: 'DELETE',
  });
  
  // Remove token
  localStorage.removeItem('token');
  
  // Also remove these for backward compatibility
  localStorage.removeItem('authState');
  localStorage.removeItem('username');
}

export async function checkAuthStatus() {
  const response = await fetch('/api/auth/status', {
    method: 'GET',
    credentials: 'include',
  });

  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('authState', 'Authenticated');
    localStorage.setItem('username', data.email);
    return data.email;
  } else {
    localStorage.removeItem('authState');
    localStorage.removeItem('username');
    return null;
  }
}

export function Signin({ onAuthChange }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [createError, setCreateError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.email);
        
        console.log('Token stored in localStorage:', data.token.substring(0, 5) + '...');
        
        // Update auth state
        onAuthChange(data.email, AuthState.Authenticated);
        
        // Navigate to home
        navigate('/');
      } else {
        setLoginError('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Login failed. Please try again.');
    }
  };

  const registerUser = async (email, password) => {
    const response = await fetch('/api/auth/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('authState', 'Authenticated');
      localStorage.setItem('username', data.email);
      return data.email;
    } else {
      const error = await response.json();
      throw new Error(error.msg);
    }
  };

  const loginUser = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('authState', 'Authenticated');
      localStorage.setItem('username', data.email);
      return data.email;
    } else {
      const error = await response.json();
      throw new Error(error.msg);
    }
  };

  const handleSignUp = async () => {
    try {
      const userName = await registerUser(email, password);
      onAuthChange(userName, 'Authenticated');
      navigate('/');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.email);
        
        console.log('Token stored in localStorage:', data.token.substring(0, 5) + '...');
        
        // Update auth state
        onAuthChange(data.email, AuthState.Authenticated);
        
        // Navigate to home
        navigate('/');
      } else {
        setLoginError('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Login failed. Please try again.');
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/auth/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // IMPORTANT: Store the token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.email);
        
        console.log('[CreateAccount] Token stored in localStorage:', data.token.substring(0, 5) + '...');
        
        // Tell the app the user is authenticated
        onAuthChange(data.email, AuthState.Authenticated);
        
        // Navigate to home page
        navigate('/');
      } else {
        const errorData = await response.json();
        setCreateError(errorData.msg || 'Failed to create account');
      }
    } catch (error) {
      console.error('Create account error:', error);
      setCreateError('Failed to create account. Please try again.');
    }
  };

  return (
    <main className="container-fluid bg-secondary text-center">
      <section className="signIn">
        <div className="card p-4 shadow-lg" style={{ maxWidth: '400px', width: '100%' }}>
          <h3 className="text-center">Welcome Back</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-3 input-group">
              <span className="input-group-text">@</span>
              <input 
                type="email" 
                className="form-control" 
                placeholder="your@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="mb-3 input-group">
              <span className="input-group-text">🔒</span>
              <input 
                type="password" 
                className="form-control" 
                placeholder="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <div className="d-grid gap-2">
              <button type="submit" className="btn btn-primary">Login</button>
              <button type="button" className="btn btn-outline-secondary" onClick={handleCreateAccount}>Create Account</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
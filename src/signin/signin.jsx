import React, { useState } from 'react';
import './signin.css';
import { useNavigate } from 'react-router-dom';

export async function logoutUser() {
  await fetch('/api/auth/logout', {
    method: 'DELETE',
  });
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
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userName = await loginUser(email, password);
      onAuthChange(userName, 'Authenticated');
      navigate('/');
    } catch (error) {
      alert(error.message);
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

  const handleLogin = async () => {
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
        // Store the token in local storage
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.email);
        setSignedIn(true);
        navigate('/pixels');
      } else {
        setError('Invalid credentials');
      }
    } catch (error) {
      setError('Login failed');
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
              <button type="button" className="btn btn-outline-secondary" onClick={handleSignUp}>Create Account</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
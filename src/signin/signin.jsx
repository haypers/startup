import React, { useState } from 'react';
import './signin.css';
import { useNavigate } from 'react-router-dom';

export function Signin({ onAuthChange }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[email] && users[email] === password) {
      // User exists and password matches
      onAuthChange(email, 'Authenticated');
      navigate('/');
    } else {
      alert('Invalid credentials');
    }
  };

  const handleSignUp = () => {
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[email]) {
      alert('User already exists');
    } else {
      users[email] = password;
      localStorage.setItem('users', JSON.stringify(users));
      onAuthChange(email, 'Authenticated');
      navigate('/');
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
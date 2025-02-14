import React, { useState } from 'react';
import './signin.css';

export function Signin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add your login logic here
    console.log('Login attempt with:', email, password);
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
                <button type="button" className="btn btn-outline-secondary">Create Account</button>
              </div>
            </form>
          </div>
      </section>
    </main>
  );
}
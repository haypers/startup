import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  // Update auth state when token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  }, [token]);

  // Update username in localStorage when it changes
  useEffect(() => {
    if (username) {
      localStorage.setItem('username', username);
    } else {
      localStorage.removeItem('username');
    }
  }, [username]);

  // Login function
  const login = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
    console.log(`Auth context: Logged in as ${newUsername} with token ${newToken.substring(0, 5)}...`);
  };

  // Logout function
  const logout = () => {
    setToken(null);
    setUsername(null);
    console.log('Auth context: Logged out');
  };

  return (
    <AuthContext.Provider value={{ token, username, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
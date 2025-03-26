import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app.css';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { Signin, logoutUser, checkAuthStatus } from './signin/signin'; // Import the checkAuthStatus function
import { Pixels } from './pixels/pixels';
import { History } from './history/history';
import { About } from './about/about';
import { AuthProvider } from './authContext';

const AuthState = {
  Unknown: 'Unknown',
  Authenticated: 'Authenticated',
  Unauthenticated: 'Unauthenticated',
};

export default function App() {
  const [authState, setAuthState] = useState(AuthState.Unknown);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const userName = await checkAuthStatus();
      if (userName) {
        setAuthState(AuthState.Authenticated);
        setUserName(userName);
      } else {
        setAuthState(AuthState.Unauthenticated);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    if (token && username) {
      console.log(`Found stored credentials for ${username}`);
      // Validate the token with the server
      fetch('/api/auth/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (response.ok) {
          setAuthState(AuthState.Authenticated); // Use authState instead of signedIn
          setUserName(username);
          console.log('Auto-login successful');
        } else {
          // Clear invalid credentials
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          setAuthState(AuthState.Unauthenticated); // Use authState instead of signedIn
          console.log('Stored credentials were invalid');
        }
      })
      .catch(error => {
        console.error('Error checking auth status:', error);
      });
    }
  }, []);

  const handleAuthChange = (userName, authState) => {
    setAuthState(authState);
    setUserName(userName);
  };

  const handleLogout = async () => {
    await logoutUser();
    setAuthState(AuthState.Unauthenticated);
    setUserName('');
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="body bg-dark text-light">
          <header>
            <h1>The Public Pixel</h1>
            <nav>
              <ul>
                <li className="nav-item">
                  <NavLink className="nav-link" to="">
                    The Pixels
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="about">
                    About
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="history">
                    Art History
                  </NavLink>
                </li>
                <li className="nav-item">
                  {authState === AuthState.Authenticated ? (
                    <NavLink
                      className="nav-link"
                      to=""
                      onClick={(e) => {
                        e.preventDefault();
                        handleLogout();
                      }}
                    >
                      Logout
                    </NavLink>
                  ) : (
                    <NavLink className="nav-link" to="signin">
                      Sign In
                    </NavLink>
                  )}
                </li>
              </ul>
            </nav>
          </header>

          <Routes>
            <Route
              path="/"
              element={<Pixels signedIn={authState === AuthState.Authenticated} />}
              exact
            />
            <Route
              path="/signin"
              element={
                <Signin
                  onAuthChange={handleAuthChange}
                />
              }
            />
            <Route path="/about" element={<About />} />
            <Route path="/history" element={<History />} />
            <Route path="*" element={<NotFound />} />
          </Routes>

          <footer>
            <span className="text-reset">Author Name:</span>
            <a href="https://github.com/haypers/startup">Hayden Perkes</a>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

function NotFound() {
  return <main className="container-fluid bg-secondary text-center">404: Return to sender. Address unknown.</main>;
}
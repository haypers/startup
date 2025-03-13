import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app.css';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { Signin, logoutUser } from './signin/signin'; // Import the logout function
import { Pixels } from './pixels/pixels';
import { History } from './history/history';
import { About } from './about/about';

const AuthState = {
  Unknown: 'Unknown',
  Authenticated: 'Authenticated',
  Unauthenticated: 'Unauthenticated',
};

export default function App() {
  const [authState, setAuthState] = useState(AuthState.Unauthenticated);
  const [userName, setUserName] = useState('');

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
                <NavLink className="nav-link" to="signin">
                  {authState === AuthState.Authenticated ? 'Account' : 'Sign In'}
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
              {authState === AuthState.Authenticated && (
                <li className="nav-item">
                  <button className="nav-link btn btn-link" onClick={handleLogout}>
                    Logout
                  </button>
                </li>
              )}
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
  );
}

function NotFound() {
  return <main className="container-fluid bg-secondary text-center">404: Return to sender. Address unknown.</main>;
}
import React, { useState, useEffect } from 'react';
import './pixels.css';

export function Pixels({ signedIn, setSignedIn }) {
  const [pixels, setPixels] = useState([]);
  const [colorOfTheDay, setColorOfTheDay] = useState('');
  const [colorPalette, setColorPalette] = useState([]);
  const [brushColor, setBrushColor] = useState('#FFFFFF'); // Set initial brush color to white
  const [isPainting, setIsPainting] = useState(false);
  const [timer, setTimer] = useState(15); // Timer starts at 15 seconds
  const [timerMessage, setTimerMessage] = useState("Draw a pixel in:");
  const [subMessage, setSubMessage] = useState(`${timer} seconds`);
  const [isPlanningMode, setIsPlanningMode] = useState(false); // New state for planning mode
  const [canPaint, setCanPaint] = useState(false);
  const username = localStorage.getItem('username'); // Retrieve username from local storage
  const [plannedPixels, setPlannedPixels] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false); // New state for auth modal
  const [notifications, setNotifications] = useState([]); // New state for notifications
  const [pendingUpdates, setPendingUpdates] = useState({}); // New state for pending updates
  const [wsReconnect, setWSReconnect] = useState(false); // New state for WebSocket reconnection
  

  useEffect(() => {
    if (signedIn && username) {
      const savedPlannedPixels = localStorage.getItem(`${username}-planned`);
      if (savedPlannedPixels) {
        // If the array exists, parse it and set it to plannedPixels
        setPlannedPixels(JSON.parse(savedPlannedPixels));
      } else {
        // If the array doesn't exist, create an empty array and save it to localStorage
        localStorage.setItem(`${username}-planned`, JSON.stringify([]));
      }
    }
  }, [signedIn, username]);

  // Fetch pixels from server
  const fetchPixels = async () => {
    try {
      const response = await fetch('/api/pixels');
      if (response.ok) {
        const data = await response.json();
        console.log(`Received ${data.length} pixels from API`);
        setPixels(data);
      } else {
        console.error('Failed to fetch pixels');
      }
    } catch (error) {
      console.error('Error fetching pixels:', error);
    }
  };

  useEffect(() => {
    fetchPixels();
  }, []);

  // Effect for fetching color of the day and palette from server
  useEffect(() => {
    const fetchColors = async () => {
      try {
        const response = await fetch('/api/colors');
        if (response.ok) {
          const data = await response.json();
          setColorOfTheDay(data.colorOfTheDay);
          setColorPalette(data.colorPalette);
        } else {
          console.error('Failed to fetch colors from server');
        }
      } catch (error) {
        console.error('Error fetching colors:', error);
      }
    };
    
    fetchColors();
  }, []); // Empty dependency array means this runs once on component mount

  // Effect for handling the timer countdown
  useEffect(() => {
    if (isPlanningMode) {
      setTimerMessage("You're in planning mode");
      setSubMessage("Change up to 30 pixels that other players can choose to help you paint!");
    } else if (signedIn && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer > 1) {
            setSubMessage(`${prevTimer - 1} seconds`);
            return prevTimer - 1;
          } else {
            clearInterval(interval);
            setTimerMessage("Draw a Pixel Now");
            setSubMessage("Select one of the daily colors!");
            setCanPaint(true); // Enable painting when timer reaches 0
            return 0;
          }
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [signedIn, timer, isPlanningMode]);


  // Utility functions that are still used elsewhere
  const hexToRgb = (hex) => {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = (bigint & 255);
    return { r, g, b };
  };

  const rgbToHex = (r, g, b) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const adjustLightness = (color, amount) => {
    const { r, g, b } = hexToRgb(color);
    const newR = Math.min(255, Math.max(0, r + amount));
    const newG = Math.min(255, Math.max(0, g + amount));
    const newB = Math.min(255, Math.max(0, b + amount));
    return rgbToHex(newR, newG, newB);
  };

  const handlePaletteClick = (color) => {
    if (isPlanningMode || (canPaint && timer === 0)) {
      setBrushColor(color);
      setIsPainting(true);
      setSubMessage("Now, Select A Pixel to Paint!");
      document.querySelector('.brush-icon').classList.add('selected');
    }
  };

  // Modify handlePixelClick function
const handlePixelClick = async (id) => {
  if (!signedIn) {
    setShowAuthModal(true);
    return;
  }

  if (!isPlanningMode && !canPaint) {
    //console.log('Cannot paint yet, timer is still running');
    return;
  }

  try {
    const newColor = brushColor;
    const newBorderColor = adjustLightness(newColor, -40);
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    //console.log('Token from localStorage:', token ? `${token.substring(0, 5)}...` : 'null');

    if (!token) {
      console.error('No authentication token found in localStorage');
      setShowAuthModal(true);
      return;
    }

    // Update the local state first for immediate feedback
    setPixels(currentPixels => {
      const updatedPixels = [...currentPixels];
      const pixel = updatedPixels.find(p => p.id === id);
      if (pixel) {
        pixel.color = newColor;
        pixel.borderColor = newBorderColor;
        pixel.lastChangedBy = username;
      }
      return updatedPixels;
    });

    // Send the request with the token in the Authorization header
    //console.log(`Sending request to update pixel ${id} with token ${token.substring(0, 5)}...`);
    const response = await fetch(`/api/pixels/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Include token in Authorization header
      },
      body: JSON.stringify({
        color: newColor,
        borderColor: newBorderColor,
        lastChangedBy: username
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    // Reset timer after successful pixel update
    setTimer(15);
    setCanPaint(false);
    setTimerMessage("Draw a pixel in:");
    setSubMessage("15 seconds");

    //console.log('Pixel updated successfully');
  } catch (error) {
    console.error('Failed to update pixel on the server', error);
    
    // Revert the local change if the server update fails
    fetchPixels();
  }
};

  const togglePlanningMode = () => {
    setIsPlanningMode((prevMode) => {
      if (prevMode) {
        setTimerMessage("Draw a pixel in:");
        setSubMessage(`${timer} seconds`);
        setBrushColor('#FFFFFF'); // Reset brush color to white
        document.querySelector('.brush-icon').classList.remove('selected');
        setIsPainting(false); // Exit painting state
      } else {
        setBrushColor('#FFFFFF'); // Reset brush color to white
        document.querySelector('.brush-icon').classList.remove('selected');
        setIsPainting(false); // Exit painting state
        setTimerMessage("You're in planning mode");
        setSubMessage("Change up to 30 pixels that other players can choose to help you paint!");
      }
      return !prevMode;
    });
  };

  // Add this to App.jsx or wherever you manage auth state
  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    if (token && username) {
      //console.log(`Found stored credentials for ${username}`);
      // Validate the token with the server
      fetch('/api/auth/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (response.ok) {
          setSignedIn(true);
          console.log('Auto-login successful');
        } else {
          // Clear invalid credentials
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          setSignedIn(false);
          console.log('Stored credentials were invalid');
        }
      })
      .catch(error => {
        console.error('Error checking auth status:', error);
      });
    }
  }, []);

  // In pixels.jsx - Update the WebSocket effect
useEffect(() => {
  const token = localStorage.getItem('token');
  //console.log('[WebSocket] Setting up connection with token:', token ? token.substring(0, 5) + '...' : 'null');
  
  if (!token) {
    console.warn('[WebSocket] No token available, skipping WebSocket setup');
    return;
  }

  // Get the correct WebSocket URL
  let wsUrl;
  if (window.location.protocol === 'https:') {
    wsUrl = `wss://${window.location.host}`;
  } else {
    wsUrl = `ws://${window.location.host}`;
  }
  
  //console.log(`[WebSocket] Connecting to ${wsUrl}`);
  
  // In development with Vite, we need to handle the proxy
  if (import.meta.env.DEV) {
    wsUrl = `ws://${window.location.hostname}:4000`;
    //console.log(`[WebSocket] Dev mode - using ${wsUrl}`);
  }

  // Initialize connection with token as protocol
  const ws = new WebSocket(wsUrl, token);
  
  ws.onopen = () => {
    //console.log('[WebSocket] Connection established successfully');
    // Send an initial message to identify the user
    ws.send(JSON.stringify({
      type: 'identify',
      email: localStorage.getItem('username')
    }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      //console.log('[WebSocket] Message received:', data);
      
      if (data.type === 'notification') {
        //console.log('[WebSocket] Notification received:', data.message);
        setNotifications((prev) => [...prev, data.message]);
      } 
      else if (data.type === 'pixelUpdate') {
        //console.log('[WebSocket] Pixel update received for ID:', data.pixelId);
        // Add to pending updates instead of immediately updating
        setPendingUpdates(prev => ({
          ...prev,
          [data.pixelId]: data.pixel
        }));
      }
      else if (data.type === 'fullSync') {
        console.log('[WebSocket] Full sync received with', data.pixels.length, 'pixels');
        // Full syncs still update immediately
        setPixels(data.pixels);
      }
      else if (data.type === 'connectionConfirmed') {
        //console.log('[WebSocket] Server confirmed connection for:', data.email);
      }
    } catch (error) {
      //console.error('[WebSocket] Error parsing message:', error, event.data);
    }
  };

  ws.onclose = (event) => {
    //console.log('[WebSocket] Connection closed with code:', event.code, 'reason:', event.reason);
    // Try to reconnect after a delay if the closure wasn't intentional
    if (event.code !== 1000) { // Normal closure
      //console.log('[WebSocket] Will attempt to reconnect in 5 seconds...');
      setTimeout(() => {
        //console.log('[WebSocket] Attempting to reconnect...');
        // This will trigger the useEffect again
        setWSReconnect(prev => !prev); // Add this state var to component
      }, 5000);
    }
  };

  ws.onerror = (error) => {
    console.error('[WebSocket] Error:', error);
  };

  // Store the WebSocket reference at component level
  // so we can use it elsewhere (requestGridSync)
  window.pixelGridWS = ws; 

  return () => {
    console.log('[WebSocket] Closing connection on cleanup');
    ws.close();
  };
}, [wsReconnect]); // Add wsReconnect as dependency

  // Add ability to request a sync if needed
  const requestGridSync = () => {
    if (window.pixelGridWS && window.pixelGridWS.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Requesting grid sync');
      window.pixelGridWS.send(JSON.stringify({ type: 'requestSync' }));
    } else {
      console.warn('[WebSocket] Cannot request sync: WebSocket not open');
    }
  };

  // Use a useEffect with a timer to batch updates
  useEffect(() => {
    if (Object.keys(pendingUpdates).length > 0) {
      const timer = setTimeout(() => {
        setPixels(currentPixels => {
          const newPixels = [...currentPixels];
          
          // Apply all pending updates
          Object.entries(pendingUpdates).forEach(([id, pixel]) => {
            const index = newPixels.findIndex(p => p.id === parseInt(id));
            if (index !== -1) {
              newPixels[index] = pixel;
            }
          });
          
          // Clear pending updates
          setPendingUpdates({});
          return newPixels;
        });
      }, 50); // Batch updates every 50ms
      
      return () => clearTimeout(timer);
    }
  }, [pendingUpdates]);

  return (
    <main className="container-fluid bg-secondary text-center">
      <div className="UI">
        <section className="Colors">
          <div>
            <h3>Colors of the Day:</h3>
            <div className="color-grid">
              {signedIn && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 576 512"
                  className="brush-icon"
                  fill={brushColor}
                >
                  <path d="M339.3 367.1c27.3-3.9 51.9-19.4 67.2-42.9L568.2 74.1c12.6-19.5 9.4-45.3-7.6-61.2S517.7-4.4 499.1 9.6L262.4 187.2c-24 18-38.2 46.1-38.4 76.1L339.3 367.1zm-19.6 25.4l-116-104.4C143.9 290.3 96 339.6 96 400c0 3.9 .2 7.8 .6 11.6C98.4 429.1 86.4 448 68.8 448L64 448c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0c61.9 0 112-50.1 112-112c0-2.5-.1-5-.2-7.5z"/>
                </svg>
              )}
              {colorPalette.map((color, index) => (
                <div
                  key={index}
                  className="color-box"
                  style={{ backgroundColor: color, cursor: isPlanningMode || timer === 0 ? 'pointer' : 'not-allowed' }}
                  onClick={() => (isPlanningMode || timer === 0) && handlePaletteClick(color)}
                ></div>
              ))}
            </div>
          </div>
        </section>

        {signedIn ? (
          <section className="InfoPanel">
            <section className="Timer">
              <div>
                <h3>{timerMessage}</h3>
                <p>{subMessage}</p>
              </div>
            </section>

            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <button
                className="btn"
                style={{ backgroundColor: isPlanningMode ? 'red' : 'blue', color: 'white' }}
                onClick={togglePlanningMode}
              >
                {isPlanningMode ? 'Exit Planning Mode' : 'Enter Planning Mode'}
              </button>
            </div>

            <section className="Notifications">
              <div>
                <h3>Notifications:</h3>
                <ul>
                  {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <li key={index}>{notification}</li>
                    ))
                  ) : (
                    <li>No notifications yet.</li>
                  )}
                </ul>
              </div>
            </section>            
          </section>
        ) : (
          <section className="InfoPanel">
            <h3>Log in to help build pixel art!</h3>
            <p>Users with accounts can change one of these pixels every 15 seconds!</p>
          </section>
        )}

        <section className="art-container">
          <div className={`grid ${isPlanningMode ? 'planning-mode' : ''}`}>
            {pixels.map((pixel) => (
              <div
                key={pixel.id}
                className={`pixel ${isPlanningMode ? 'dimmed' : ''}`}
                style={{
                  backgroundColor: pixel.color,
                  border: `1px solid ${pixel.borderColor}`,
                }}
                onClick={() => handlePixelClick(pixel.id)}
              ></div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
import React, { useState, useEffect } from 'react';
import './pixels.css';

export function Pixels({ signedIn }) {
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
  
  // Log the username to check if it is being retrieved correctly
  useEffect(() => {
    console.log('Username:', username);
  }, [username]);

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

  // Effect for checking and generating image every minute
  useEffect(() => {
    console.log('Image generation now handled by server');
    
    return () => {};
  }, []);  

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

  const handlePixelClick = async (id) => {
    // Check authentication
    if (!signedIn) {
      setShowAuthModal(true);
      return;
    }
  
    // Check if timer is not 0 and not in planning mode
    if (!isPlanningMode && !canPaint) {
      console.log('Cannot paint yet, timer is still running');
      return;
    }
  
    try {
      const newColor = brushColor;
      const newBorderColor = adjustLightness(newColor, -40);
      
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
      
      // If in planning mode, just update local state
      if (isPlanningMode) {
        // Handle planning mode logic
        return;
      }
      
      // Normal mode - update on the server
      const response = await fetch(`/api/pixels/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({
          color: newColor,
          borderColor: newBorderColor,
          lastChangedBy: username,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      // Reset timer after successful pixel update
      setTimer(15);
      setCanPaint(false);
      setTimerMessage("Draw a pixel in:");
      setSubMessage("15 seconds");
      
      console.log('Pixel updated successfully');
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
                  <li>I've got a timer built to simulate Notifications here, but it is super buggy, so I dissabled it by default for now.</li>
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
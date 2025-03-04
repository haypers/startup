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
  const username = localStorage.getItem('username'); // Retrieve username from local storage

  // Log the username to check if it is being retrieved correctly
  useEffect(() => {
    console.log('Username:', username);
  }, [username]);

  // Effect for generating or loading pixels
  useEffect(() => {
    const savedPixels = localStorage.getItem('pixels');
    if (savedPixels) {
      setPixels(JSON.parse(savedPixels));
    } else {
      const newPixels = [];
      for (let i = 0; i < 2500; i++) {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        const color = rgbToHex(r, g, b);
        const borderColor = adjustLightness(color, -40);
        
        newPixels.push({
          id: i,
          color: color,
          borderColor: borderColor,
          lastChangedBy: null // Initialize with null
        });
      }
      setPixels(newPixels);
      localStorage.setItem('pixels', JSON.stringify(newPixels));
    }
  }, []); // Empty dependency array means this runs once on mount

  // Effect for saving pixels to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('pixels', JSON.stringify(pixels));
  }, [pixels]);

  // Effect for fetching color of the day and generating color palette
  useEffect(() => {
    const fetchColorOfDay = async () => {
      const today = new Date().toISOString().split('T')[0];
      try { //sometimes this fetch fails, so when we move to backed design, let's have the server provide backup colors, and only ever have the backend make this call.
        const response = await fetch(
          `https://api.allorigins.win/get?url=${encodeURIComponent(
            `http://colors.zoodinkers.com/api`
          )}`
        );
        console.log(response);
        const data = await response.json();
        const parsedData = JSON.parse(data.contents);
        const color = parsedData.hex;
        setColorOfTheDay(color);
        generateColorPalette(color);
      } catch (error) {
        console.error('Error fetching color of the day:', error);
        console.log(error);
      }
    };

    fetchColorOfDay();
  }, []); // Empty dependency array means this runs once on mount

  // Effect for handling the timer countdown
  useEffect(() => {
    if (signedIn && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
        setSubMessage(`${timer - 1} seconds`);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setTimerMessage("Draw a Pixel Now");
      setSubMessage("Select one of the daily colors!");
    }
  }, [signedIn, timer]);

  // Effect for checking and generating image every minute
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndGenerateImage();
    }, 60000); // 60000 ms = 1 minute
    return () => clearInterval(interval);
  }, [pixels]);

  // Effect for simulating fake user changes, but it's super buggy
  /*
  setInterval(() => {
    // This will be replaced with WebSocket messages

    if (signedIn) {

      const logContainer = document.querySelector('.Notifications ul');
      const randomPixelIndex = Math.floor(Math.random() * 2500);
      const randomColorIndex = Math.floor(Math.random() * 5);
      const randomColor = colorPalette[randomColorIndex];
      const randomPixel = pixels[randomPixelIndex];
      const previousLastChangedBy = randomPixel.lastChangedBy;

      const updatedPixels = pixels.map((pixel) =>
        pixel.id === randomPixel.id ? { ...pixel, color: randomColor, borderColor: adjustLightness(randomColor, -40), lastChangedBy: 'Testuser' } : pixel
      );

      setPixels(updatedPixels);

      const logMessage = document.createElement('p');
      if (previousLastChangedBy === username) {
        logMessage.textContent = `Testuser destroyed your pixel at (${randomPixel.id % 50}, ${Math.floor(randomPixel.id / 50)})`;
      } else {
        logMessage.textContent = `Testuser changed a pixel at (${randomPixel.id % 50}, ${Math.floor(randomPixel.id / 50)})`;
      }
      logContainer.appendChild(logMessage);
    }
  }, 1000);*/
  

  const generateColorPalette = (color) => {
    const rgb = hexToRgb(color);
    const washedOut = rgbToHex(
      Math.min(255, rgb.r + 150),
      Math.min(255, rgb.g + 150),
      Math.min(255, rgb.b + 150)
    );
    const inverted = rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
    const rPlus128 = rgbToHex((rgb.r * 5) % 256, (rgb.g * -5) % 256, (rgb.b * 10) % 256);
    const opposite = rgbToHex(
      (255 - rgb.r) % 256,
      rgb.g,
      (rgb.b - 128 + 256) % 256
    );

    setColorPalette([color, washedOut, inverted, rPlus128, opposite]);
  };

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

  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setColorOfTheDay(newColor);
    generateColorPalette(newColor);
  };

  const handlePaletteClick = (color) => {
    if (timer === 0) {
      setBrushColor(color);
      setIsPainting(true);
      setSubMessage("Now, Select A Pixel to Paint!");
    }
  };

  const handlePixelClick = (id) => {
    if (isPainting) {
      const borderColor = adjustLightness(brushColor, -40);
      const updatedPixels = pixels.map((pixel) =>
        pixel.id === id ? { ...pixel, color: brushColor, borderColor: borderColor, lastChangedBy: username || pixel.lastChangedBy } : pixel
      );
      console.log('Updated Pixels:', updatedPixels);
      setPixels(updatedPixels);
      setBrushColor('#FFFFFF'); // Reset brush color to white
      setIsPainting(false); // Exit painting state
      setTimer(15); // Reset timer to 15 seconds
      setTimerMessage("Draw a pixel in:");
      setSubMessage(`${15} seconds`);
    }
  };

  const generateAndSaveImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');

    pixels.forEach((pixel) => {
      const x = pixel.id % 50;
      const y = Math.floor(pixel.id / 50);
      ctx.fillStyle = pixel.color;
      ctx.fillRect(x, y, 1, 1);
    });

    canvas.toBlob((blob) => {
      const timestamp = new Date().toISOString();
      const fileName = `pixel-art-${timestamp}.png`;
      const reader = new FileReader();
      reader.onloadend = () => {
        localStorage.setItem(fileName, reader.result);
      };
      reader.readAsDataURL(blob);
    });
  };

  const checkAndGenerateImage = () => {
    const keys = Object.keys(localStorage);
    const imageKeys = keys.filter(key => key.startsWith('pixel-art-'));
    if (imageKeys.length > 0) {
      const latestImageKey = imageKeys.sort().reverse()[0];
      const latestTimestamp = new Date(latestImageKey.replace('pixel-art-', '').replace('.png', ''));
      const now = new Date();
      const oneHour = 60 * 60 * 1000;
      if (now - latestTimestamp > oneHour) {
        generateAndSaveImage();
      }
    } else {
      generateAndSaveImage();
    }
  };

  const togglePlanningMode = () => {
    setIsPlanningMode((prevMode) => !prevMode);
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
                  style={{ backgroundColor: color, cursor: timer === 0 ? 'pointer' : 'not-allowed' }}
                  onClick={() => timer === 0 && handlePaletteClick(color)}
                ></div>
              ))}
            </div>
            {/* Color Picker for testing purposes */}
            {/*<input
              type="color"
              value={colorOfTheDay}
              onChange={handleColorChange}
              style={{ marginTop: '20px' }}
            />*/}
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
            {isPlanningMode && <div className="overlay"></div>}
            {pixels.map((pixel) => (
              <div
                key={pixel.id}
                className="pixel"
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
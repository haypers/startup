import React, { useState, useEffect } from 'react';
import './pixels.css';

export function Pixels({ signedIn }) {
  const [pixels, setPixels] = useState([]);
  const [colorOfTheDay, setColorOfTheDay] = useState('');
  const [colorPalette, setColorPalette] = useState([]);
  const [brushColor, setBrushColor] = useState('');
  const [isPainting, setIsPainting] = useState(false);

  // Effect for generating pixels
  useEffect(() => {
    const newPixels = [];
    for (let i = 0; i < 2500; i++) {
      const hue = Math.floor(Math.random() * 360);
      const saturation = 80;
      const lightness = 60;
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      const borderColor = `hsl(${hue}, ${saturation}%, ${lightness - 20}%)`;
      
      newPixels.push({
        id: i,
        color: color,
        borderColor: borderColor
      });
    }
    setPixels(newPixels);
  }, []); // Empty dependency array means this runs once on mount

  // Effect for fetching color of the day and generating color palette
  useEffect(() => {
    const fetchColorOfDay = async () => {
      const today = new Date().toISOString().split('T')[0];
      try {
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
    const hsl = rgbToHsl(r, g, b);
    hsl.l += amount;
    if (hsl.l > 100) hsl.l = 100;
    if (hsl.l < 0) hsl.l = 0;
    const { r: newR, g: newG, b: newB } = hslToRgb(hsl.h, hsl.s, hsl.l);
    return rgbToHex(newR, newG, newB);
  };

  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setColorOfTheDay(newColor);
    generateColorPalette(newColor);
  };

  const handlePaletteClick = (color) => {
    setBrushColor(color);
    setIsPainting(true);
  };

  const handlePixelClick = (id) => {
    if (isPainting) {
const borderColor = adjustLightness(brushColor, -20);
      setPixels((prevPixels) =>
        prevPixels.map((pixel) =>
          pixel.id === id ? { ...pixel, color: brushColor, borderColor: borderColor } : pixel
        )
      );
      setBrushColor('#000000'); // Reset brush color to black
      setIsPainting(false); // Exit painting state
    }
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
                  style={{ backgroundColor: color }}
                  onClick={() => handlePaletteClick(color)}
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

        {signedIn && (
          <section className="InfoPanel">
            <section className="Timer">
              <div>
                <h3>Draw A pixel in:</h3>
                <p>24 seconds</p>
              </div>
            </section>

            <section className="Notifications">
              <div>
                <h3>Notifications:</h3>
                <ul>
                  <li>Bob destroyed your pixel at 23, BD</li>
                  <li>Gusgus destroyed your pixel at 22, BH</li>
                  <li>Sarah followed your plan at pixel 32, BC</li>
                  <li>Norman ignored your plan at pixel 25, BA</li>
                </ul>
              </div>
            </section>
          </section>
        )}

        <section className="art-container">
          <div className="grid">
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
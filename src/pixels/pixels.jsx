import React, { useState, useEffect } from 'react';
import './pixels.css';

export function Pixels({ signedIn }) {
  const [pixels, setPixels] = useState([]);
  const [colorOfTheDay, setColorOfTheDay] = useState('');
  const [colorPalette, setColorPalette] = useState([]);

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
            `http://colors.zoodinkers.com/api?date=${today}`
          )}`
        );
        const data = await response.json();
        const parsedData = JSON.parse(data.contents);
        const color = parsedData.hex;
        setColorOfTheDay(color);
        generateColorPalette(color);
      } catch (error) {
        console.error('Error fetching color of the day:', error);
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
    const rPlus128 = rgbToHex((rgb.r + 128) % 256, rgb.g, rgb.b);
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

  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setColorOfTheDay(newColor);
    generateColorPalette(newColor);
  };

  return (
    <main className="container-fluid bg-secondary text-center">
      <div className="UI">
        <section className="Colors">
          <div>
            <h3>Colors of the Day:</h3>
            <div className="color-grid">
              {signedIn && <img src="brush.svg" alt="Brush icon" className="brush-icon" />}
              {colorPalette.map((color, index) => (
                <div
                  key={index}
                  className="color-box"
                  style={{ backgroundColor: color }}
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
              ></div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
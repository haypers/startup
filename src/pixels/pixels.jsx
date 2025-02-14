import React, { useState, useEffect } from 'react';
import './pixels.css';

export function Pixels() {
  const [pixels, setPixels] = useState([]);
  const [colorOfTheDay, setColorOfTheDay] = useState('');

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

  // Effect for fetching color of the day
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
        setColorOfTheDay(parsedData.hex);
      } catch (error) {
        console.error('Error fetching color of the day:', error);
      }
    };

    fetchColorOfDay();
  }, []); // Empty dependency array means this runs once on mount

  return (
    <main className="container-fluid bg-secondary text-center">
      <div className="UI">
        <section className="Colors">
          <div>
            <h3>Colors of the Day:</h3>
            <div className="color-grid">
              <img src="brush.svg" alt="Brush icon" className="brush-icon" />
              <div
                className="color-box"
                style={{ backgroundColor: colorOfTheDay }}
              ></div>
              <div className="color-box"></div>
              <div className="color-box"></div>
              <div className="color-box"></div>
              <div className="color-box"></div>
            </div>
          </div>
        </section>

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
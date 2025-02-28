import React, { useEffect, useState } from 'react';
import './history.css';

export function History() {
  const [images, setImages] = useState([]);

  useEffect(() => {
    const keys = Object.keys(localStorage);
    const imageKeys = keys.filter(key => key.startsWith('pixel-art-'));
    const imageEntries = imageKeys.map(key => {
      const timestamp = key.replace('pixel-art-', '').replace('.png', '');
      const date = new Date(timestamp);
      const imageData = localStorage.getItem(key);
      return { date, imageData };
    });
    setImages(imageEntries);
  }, []);

  return (
    <main className="container-fluid bg-secondary text-center">
      {images.length === 0 ? (
        <p>No history saved yet</p>
      ) : (
        images.map((image, index) => (
          <div key={index} className="image-container">
            <h3>{image.date.toLocaleString()}</h3>
            <img
              src={image.imageData}
              alt={`Pixel art from ${image.date.toLocaleString()}`}
              className="pixel-art-image"
            />
          </div>
        ))
      )}
    </main>
  );
}
import React, { useState, useEffect } from 'react';
import './history.css';

export function History() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch('/api/db-images');
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setImages(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching images:', err);
        setError(`Failed to load image history: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) 
      ? 'Unknown date' 
      : date.toLocaleString();
  };

  return (
    <main className="container-fluid bg-secondary text-center">
      <div className="history-page">
        <h1>Pixel Art History</h1>
        <p>See how our community artwork has evolved over time!</p>
        
        {loading ? (
          <div className="loading">Loading image history...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : images.length === 0 ? (
          <div className="no-images">No historical images available yet.</div>
        ) : (
          <div className="image-timeline">
            {images.map((image) => (
              <div key={image.id} className="timeline-item">
                <div className="timestamp">{formatDate(image.timestamp)}</div>
                <div className="image-container">
                  <img 
                    src={image.url} 
                    alt={`Pixel art at ${formatDate(image.timestamp)}`} 
                    className="pixel-history-image"
                    onError={(e) => {
                      e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
                      e.target.style.opacity = 0.5;
                      e.target.alt = 'Image failed to load';
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
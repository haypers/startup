import React, { useState, useEffect } from 'react';
import './history.css';

export function History() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch('/api/images');
        if (response.ok) {
          const data = await response.json();
          setImages(data);
        } else {
          console.error('Failed to fetch images');
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching images:', error);
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  const formatDate = (timestampStr) => {
    try {
      // Parse the ISO string directly
      const date = new Date(timestampStr);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date created from:', timestampStr);
        return 'Unknown date';
      }
      
      // Format with detailed output for debugging
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
      console.error('Date parsing error:', e, 'for timestamp:', timestampStr);
      return 'Unknown date';
    }
  };

  return (
    <main className="container-fluid bg-secondary text-center">
      <div className="history-page">
        <h1>Pixel Art History</h1>
        <p>See how our community artwork has evolved over time!</p>
        
        {loading ? (
          <div className="loading">Loading image history...</div>
        ) : images.length === 0 ? (
          <div className="no-images">No historical images available yet.</div>
        ) : (
          <div className="image-timeline">
            {images.map((image, index) => (
              <div key={index} className="timeline-item">
                <div className="timestamp">{formatDate(image.timestamp)}</div>
                <div className="image-container">
                  <img 
                    src={image.url} 
                    alt={`Pixel art at ${formatDate(image.timestamp)}`} 
                    className="pixel-history-image"
                    onError={(e) => {
                      console.error(`Error loading image: ${image.url}`);
                      // Retry loading with a delay
                      setTimeout(() => {
                        e.target.src = `${image.url}&retry=${Date.now()}`;
                      }, 1000);
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
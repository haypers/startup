const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const express = require('express');
const uuid = require('uuid');
const { createCanvas } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const { ObjectId } = require('mongodb');
const app = express();
const DB = require('./database.js');

//using simon code
let users = [];
const authCookieName = 'token';

// JSON body parsing using built-in middleware
app.use(express.json());

// Use the cookie parser middleware for tracking authentication tokens
app.use(cookieParser());

// from requirments.
const port = process.env.PORT || 4000; // Use environment variable or default to 4000
app.use(express.static(path.join(__dirname, '..', 'build')));

// Router for service endpoints
var apiRouter = express.Router();
app.use(`/api`, apiRouter);

// CreateAuth a new user
apiRouter.post('/auth/create', async (req, res) => {
  if (await findUser('email', req.body.email)) {
    res.status(409).send({ msg: 'Existing user' });
  } else {
    try {
      const user = await createUser(req.body.email, req.body.password);
      // Send the token in the response body
      res.send({ email: user.email, token: user.token });
    } catch (error) {
      console.error('Create User Error:', error);
      res.status(500).send({ msg: 'Failed to create user' });
    }
  }
});

// GetAuth login an existing user
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const user = await findUser('email', req.body.email);
    if (user) {
      if (await bcrypt.compare(req.body.password, user.password)) {
        const newToken = uuid.v4();
        
        // Update the token in the database
        await DB.updateUserToken(user.email, newToken);
        
        // Send the token in the response body
        console.log(`Login successful for ${user.email}, token: ${newToken.substring(0, 5)}...`);
        
        // Make sure to return the new token, not the old one
        res.send({ 
          email: user.email, 
          token: newToken
        });
        return;
      }
    }
    res.status(401).send({ msg: 'Unauthorized' });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).send({ msg: 'Login failed' });
  }
});

// DeleteAuth logout a user
apiRouter.delete('/auth/logout', async (req, res) => {
  try {
    const user = await findUser('token', req.cookies[authCookieName]);
    if (user) {
      delete user.token;
    }
    res.clearCookie(authCookieName);
    res.status(204).end();
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).send({ msg: 'Logout failed' });
  }
});

// Verify authentication status
apiRouter.get('/auth/status', async (req, res) => {
  try {
    // Try to get token from Authorization header
    const authHeader = req.headers.authorization;
    let token;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('Auth status: Got token from Authorization header');
    } else {
      // Fallback to cookie
      token = req.cookies[authCookieName];
      if (token) {
        console.log('Auth status: Got token from cookie');
      }
    }

    if (!token) {
      return res.status(401).send({ msg: 'Unauthorized' });
    }

    const user = await findUser('token', token);
    if (!user) {
      return res.status(401).send({ msg: 'Unauthorized' });
    }

    res.send({ email: user.email });
  } catch (error) {
    console.error('Auth Status Error:', error);
    res.status(500).send({ msg: 'Failed to check auth status' });
  }
});

// Add a debug route
apiRouter.get('/auth/debug', (req, res) => {
  const token = req.cookies[authCookieName];
  res.json({
    hasCookie: !!token,
    cookieValue: token ? token.substring(0, 5) + '...' : 'none',
    headers: req.headers,
  });
});

// Add this route to help debug token issues
apiRouter.get('/auth/debug', (req, res) => {
  const authHeader = req.headers.authorization || 'none';
  const token = req.headers.authorization?.split(' ')[1] || null;
  
  res.json({
    authHeader,
    token: token ? `${token.substring(0, 5)}...` : null,
    allHeaders: req.headers,
  });
});

// Middleware to verify authorization for API endpoints
async function verifyAuth(req, res, next) {
  try {
    // Try to get token from Authorization header
    const authHeader = req.headers.authorization;
    let token;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('verifyAuth: Got token from Authorization header');
    } else {
      // Fallback to cookie
      token = req.cookies[authCookieName];
      if (token) {
        console.log('verifyAuth: Got token from cookie');
      }
    }

    console.log('Token for auth check:', token ? token.substring(0, 5) + '...' : 'none');
    
    if (!token) {
      return res.status(401).send({ msg: 'Unauthorized - No token' });
    }

    const user = await findUser('token', token);
    if (!user) {
      return res.status(401).send({ msg: 'Unauthorized - Invalid token' });
    }

    // Authentication successful
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).send({ msg: 'Unauthorized - Error during auth check' });
  }
}

// In index.js - Initialize or load pixels from DB
let pixels = [];

// Load pixels from database on startup
async function initializePixels() {
  try {
    pixels = await DB.getPixels();
    
    // If no pixels found in the database, create a new grid
    if (pixels.length === 0) {
      console.log("No pixels found in DB, generating new grid");
      
      // Generate a 50x50 grid of pixels
      for (let i = 0; i < 2500; i++) {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        const color = rgbToHex(r, g, b);
        const borderColor = adjustLightness(color, -40);

        pixels.push({
          id: i,
          color: color,
          borderColor: borderColor,
          lastChangedBy: null,
        });
      }
      
      // Save the new grid to the database
      await DB.savePixels(pixels);
    } else {
      console.log(`Loaded ${pixels.length} pixels from database`);
    }
  } catch (error) {
    console.error('Error loading pixels from database:', error);
    
    // Fallback to an empty grid
    pixels = [];
  }
}

// Call initialization function at startup
initializePixels();

// Update the pixel update API endpoint
apiRouter.put('/pixels/:id', verifyAuth, async (req, res) => {
  try {
    const pixelId = parseInt(req.params.id);
    const { color, borderColor, lastChangedBy } = req.body;

    const pixel = pixels.find((p) => p.id === pixelId);
    if (!pixel) {
      return res.status(404).send({ msg: 'Pixel not found' });
    }

    // Update the pixel state in memory
    pixel.color = color;
    pixel.borderColor = borderColor;
    pixel.lastChangedBy = lastChangedBy;

    // Update the pixel in the database
    await DB.updatePixel(pixelId, {
      id: pixelId,
      color: color,
      borderColor: borderColor,
      lastChangedBy: lastChangedBy
    });

    res.status(200).send(pixel);
  } catch (error) {
    console.error('Error updating pixel:', error);
    res.status(500).send({ msg: 'Failed to update pixel' });
  }
});

// Endpoint to get all pixels
apiRouter.get('/pixels', async (req, res) => {
  try {
    // If pixels are already loaded in memory, return them
    if (pixels.length > 0) {
      return res.json(pixels);
    }
    
    // Otherwise fetch from database
    const dbPixels = await DB.getPixels();
    if (dbPixels && dbPixels.length > 0) {
      pixels = dbPixels; // Update the in-memory copy
      return res.json(dbPixels);
    }
    
    // If still no pixels, return empty array
    res.json([]);
  } catch (error) {
    console.error('Error fetching pixels:', error);
    res.status(500).send({ msg: 'Failed to fetch pixels' });
  }
});

// Color of the day management
let colorOfTheDay = '#FFFFFF'; // Default color
let colorPalette = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF']; // Default palette
let lastColorFetchTime = 0;
const COLOR_FETCH_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

// Helper function to convert hex to RGB
function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = (bigint & 255);
  return { r, g, b };
}

// Helper function to convert RGB to hex
function rgbToHex(r, g, b) {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Function to generate color palette from base color - EXACT MATCH to frontend logic
function generateColorPalette(color) {
  try {
    const rgb = hexToRgb(color);
    
    // Create the exact same variations as in the frontend
    const washedOut = rgbToHex(
      Math.min(255, rgb.r + 150),
      Math.min(255, rgb.g + 150),
      Math.min(255, rgb.b + 150)
    );
    
    const inverted = rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
    
    const rPlus128 = rgbToHex(
      (rgb.r * 5) % 256, 
      (rgb.g * -7) % 256, 
      (rgb.b * 10) % 256
    );
    
    const opposite = rgbToHex(
      (255 - rgb.r) % 256,
      rgb.g,
      (rgb.b - 128 + 256) % 256
    );

    colorPalette = [color, washedOut, inverted, rPlus128, opposite];
    console.log('Generated color palette:', colorPalette);
  } catch (error) {
    console.error('Error generating color palette:', error);
  }
}

// Function to fetch color of the day from zoodinkers using a CORS proxy
async function fetchColorOfTheDay() {
  try {
    const dbColors = await DB.getColors();
    if (dbColors) {
      const lastUpdated = new Date(dbColors.lastUpdated);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);

      if (hoursSinceUpdate < 24) {
        colorOfTheDay = dbColors.colorOfTheDay;
        colorPalette = dbColors.colorPalette;
        console.log('Using colors from database:', colorOfTheDay);
        return;
      }
    }

    const proxyUrl = 'https://api.allorigins.win/get?url=';
    const apiUrl = 'http://colors.zoodinkers.com/api';
    const encodedApiUrl = encodeURIComponent(apiUrl);

    const response = await fetch(`${proxyUrl}${encodedApiUrl}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.contents) {
        const parsedContents = JSON.parse(data.contents);
        const newColor = parsedContents.hex;

        if (newColor !== colorOfTheDay) {
          colorOfTheDay = newColor;
          generateColorPalette(colorOfTheDay);
          console.log('Updated color of the day:', colorOfTheDay);

          await DB.saveColors(colorOfTheDay, colorPalette);
        }
      } else {
        throw new Error('Invalid response format from proxy');
      }
    } else {
      console.error('Failed to fetch color of the day');
    }
  } catch (error) {
    console.error('Error fetching color of the day:', error);
  }
}

// Function to check and update the color if needed
async function checkAndUpdateColor() {
  const currentTime = Date.now();
  
  // Only fetch if the interval has passed since last fetch
  if (currentTime - lastColorFetchTime >= COLOR_FETCH_INTERVAL) {
    await fetchColorOfTheDay();
    lastColorFetchTime = currentTime;
  }
}

// Endpoint to get color of the day and palette
apiRouter.get('/colors', async (req, res) => {
  try {
    await checkAndUpdateColor(); // Ensure the color is up-to-date
    res.send({
      colorOfTheDay: colorOfTheDay,
      colorPalette: colorPalette,
    });
  } catch (error) {
    console.error('Error serving colors:', error);
    res.status(500).send({ msg: 'Failed to get colors' });
  }
});

// Initialize color of the day
fetchColorOfTheDay().then(() => {
  console.log('Initial color of the day loaded:', colorOfTheDay);
});

// Set up timer to check for color updates every 30 minutes
setInterval(checkAndUpdateColor, COLOR_FETCH_INTERVAL);

// Set up timer to check for color updates every day
const Hour = 60 * 60 * 1000;
setInterval(fetchColorOfTheDay, Hour);

// Function to generate and save image if needed - DATABASE ONLY VERSION
let lastSavedPixelState = null;

async function generateAndSaveImageIfNeeded() {
  try {
    if (pixels.length === 0) {
      console.log('Pixels array is not initialized. Skipping image generation.');
      return;
    }
    
    // Serialize current pixel state
    const currentPixelState = JSON.stringify(pixels);
    
    // Compare with last saved state
    if (currentPixelState === lastSavedPixelState) {
      console.log('No changes detected in pixel state. Skipping image generation.');
      return;
    }
    
    // Update the last saved state
    lastSavedPixelState = currentPixelState;
    
    // Create canvas and draw pixels
    const canvas = createCanvas(50, 50);
    const ctx = canvas.getContext('2d');
    
    pixels.forEach((pixel) => {
      const x = pixel.id % 50;
      const y = Math.floor(pixel.id / 50);
      ctx.fillStyle = pixel.color;
      ctx.fillRect(x, y, 1, 1);
    });
    
    // Convert to PNG buffer
    const buffer = canvas.toBuffer('image/png');
    
    // Save ONLY to database
    await DB.saveHistoryImage(buffer.toString('base64'));
    console.log('Generated and saved new history image to database');
    
    // Prune old images in database
    await DB.pruneHistoryImages(50);
  } catch (error) {
    console.error('Error generating or saving image:', error);
  }
}

// Initialize image generation on server start
generateAndSaveImageIfNeeded();

// Set up timer to generate images every 5 minutes
const FIVE_MINUTES = 5 * 60 * 1000;
setInterval(generateAndSaveImageIfNeeded, FIVE_MINUTES);

// API endpoint to get images from database
apiRouter.get('/db-images', async (req, res) => {
  try {
    const images = await DB.getHistoryImages();
    res.json(images.map(img => ({
      id: img._id.toString(),
      timestamp: img.timestamp,
      date: img.date,
      url: `/api/db-images/${img._id}`
    })));
  } catch (error) {
    console.error('Error retrieving images from database:', error);
    res.status(500).send({ msg: 'Failed to retrieve images' });
  }
});

// API endpoint to get a specific image from database
apiRouter.get('/db-images/:id', async (req, res) => {
  try {
    // Use DB method instead of direct collection access
    const image = await DB.getHistoryImage(req.params.id);
    if (!image) {
      return res.status(404).send({ msg: 'Image not found' });
    }
    
    // Convert base64 back to binary
    const buffer = Buffer.from(image.imageData, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (error) {
    console.error('Error retrieving image from database:', error);
    res.status(500).send({ msg: 'Failed to retrieve image', error: error.message });
  }
});

// Default error handler
app.use(function (err, req, res, next) {
  console.error('Express App Error:', err);
  res.status(500).send({ type: err.name, message: err.message });
});

// Optionally replace with a simple API response
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function createUser(email, password) {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    email: email,
    password: passwordHash,
    token: uuid.v4(),
  };
  
  return await DB.addUser(user);
}

async function findUser(field, value) {
  if (!value) return null;

  if (field === 'email') {
    return await DB.getUser(value);
  } else if (field === 'token') {
    return await DB.getUserByToken(value);
  }
  
  return null;
}

function adjustLightness(color, amount) {
  const num = parseInt(color.slice(1), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return rgbToHex(r, g, b);
}

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1); // Exit application
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1); // Exit application
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

const handlePixelClick = async (id) => {
  if (!signedIn) {
    setShowAuthModal(true);
    return;
  }

  if (!isPlanningMode && !canPaint) {
    console.log('Cannot paint yet, timer is still running');
    return;
  }

  try {
    const newColor = brushColor;
    const newBorderColor = adjustLightness(newColor, -40);
    const token = localStorage.getItem('token'); // Get token from local storage

    // Log the token to check if it is being retrieved
    console.log('Token from local storage:', token);

    // Update the local state first for immediate feedback
    setPixels((currentPixels) => {
      const updatedPixels = [...currentPixels];
      const pixel = updatedPixels.find((p) => p.id === id);
      if (pixel) {
        pixel.color = newColor;
        pixel.borderColor = newBorderColor;
        pixel.lastChangedBy = username;
      }
      return updatedPixels;
    });

    const response = await fetch(`/api/pixels/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Include token in Authorization header
      },
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

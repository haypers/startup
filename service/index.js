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
const WebSocket = require('ws');

// Using simon code
let users = [];
const authCookieName = 'token';

// JSON body parsing using built-in middleware
app.use(express.json());

// Use the cookie parser middleware for tracking authentication tokens
app.use(cookieParser());

// From requirements
const port = process.env.PORT || 4000; // Use environment variable or default to 4000

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
  const authHeader = req.headers.authorization || 'none';
  const token = req.headers.authorization?.split(' ')[1] || null;
  const cookieToken = req.cookies[authCookieName];
  
  res.json({
    authHeader,
    token: token ? `${token.substring(0, 5)}...` : null,
    cookieToken: cookieToken ? `${cookieToken.substring(0, 5)}...` : null,
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

    console.log(`[Pixel Update] User ${req.user.email} updating pixel ${pixelId}`);
    
    const pixel = pixels.find((p) => p.id === pixelId);
    if (!pixel) {
      return res.status(404).send({ msg: 'Pixel not found' });
    }

    // Store the previous state for notification
    const previousOwner = pixel.lastChangedBy;
    
    console.log(`[Pixel Update] Previous pixel owner: ${previousOwner || 'none'}`);

    // Notify the previous user if they are online
    if (previousOwner && previousOwner !== req.user.email) {
      const previousUserWs = onlineUsers.get(previousOwner);
      console.log(`[Notification] Checking if ${previousOwner} is online: ${!!previousUserWs}`);
      
      if (previousUserWs && previousUserWs.readyState === WebSocket.OPEN) {
        const notification = {
          type: 'notification',
          message: `${req.user.email} destroyed your pixel at position ${pixelId % 50}, ${Math.floor(pixelId / 50)}`
        };
        
        console.log(`[Notification] Sending to ${previousOwner}: ${notification.message}`);
        previousUserWs.send(JSON.stringify(notification));
      }
    }

    // Update the pixel state in memory
    pixel.color = color;
    pixel.borderColor = borderColor || adjustLightness(color, -40);
    pixel.lastChangedBy = req.user.email;

    console.log(`[Pixel Update] Updated pixel ${pixelId} in memory`);

    // Update the pixel in the database
    await DB.updatePixel(pixelId, {
      id: pixelId,
      color: color,
      borderColor: pixel.borderColor,
      lastChangedBy: req.user.email,
    });

    console.log(`[Pixel Update] Updated pixel ${pixelId} in database`);

    // Broadcast the updated pixel to all connected clients
    broadcastPixelUpdate(pixelId, pixel);

    res.status(200).send(pixel);
  } catch (error) {
    console.error('Error updating pixel:', error);
    res.status(500).send({ msg: 'Failed to update pixel' });
  }
});

// Add this function to broadcast pixel updates to all connected clients
function broadcastPixelUpdate(pixelId, updatedPixel) {
  const connectedClients = [...onlineUsers.entries()];
  console.log(`[WebSocket] Broadcasting pixel update for pixel ${pixelId} to ${connectedClients.length} clients`);
  
  // Create a more efficient update by just sending the changed pixel
  const update = {
    type: 'pixelUpdate',
    pixelId,
    pixel: updatedPixel
  };

  // Send the update to all connected clients except the one who made the change
  let sentCount = 0;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(update));
      sentCount++;
    }
  });
  
  console.log(`[WebSocket] Sent update to ${sentCount} clients`);
}

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

// Function to generate color palette from base color
function generateColorPalette(color) {
  try {
    const rgb = hexToRgb(color);
    
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

// Helper functions
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
  // Don't exit - in production this would restart the server
  // process.exit(1); 
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - in production this would restart the server
  // process.exit(1); 
});

// Serve static files from the React app build directory
// IMPORTANT: This must come AFTER API routes
app.use(express.static(path.join(__dirname, 'public')));

// Important: Catch-all route to return the React app for client-side routing
// This must be the LAST route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Track online users and their WebSocket connections
const onlineUsers = new Map(); // Map of `email -> WebSocket`

// Create a WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const email = req.email; // Attach the user's email to the WebSocket connection
  
  console.log(`[WebSocket] User connected: ${email}`);
  onlineUsers.set(email, ws);
  
  // Confirm connection to the client
  ws.send(JSON.stringify({
    type: 'connectionConfirmed',
    email: email
  }));
  
  // Send the full pixel grid to the newly connected client
  ws.send(JSON.stringify({
    type: 'fullSync',
    pixels: pixels
  }));
  console.log(`[WebSocket] Sent full sync to ${email}`);

  // Handle WebSocket disconnection
  ws.on('close', () => {
    onlineUsers.delete(email);
    console.log(`[WebSocket] User disconnected: ${email}`);
  });
  
  // Handle incoming messages from clients
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      //console.log(`[WebSocket] Received message of type ${data.type} from ${email}`);
      
      if (data.type === 'requestSync') {
        // Client is requesting a full sync
        //console.log(`[WebSocket] Sending full sync to ${email} upon request`);
        ws.send(JSON.stringify({
          type: 'fullSync',
          pixels: pixels
        }));
      } else if (data.type === 'identify') {
        //console.log(`[WebSocket] User identified as ${data.email}`);
        // Update the email if it was provided in the message
        if (data.email && data.email !== email) {
          onlineUsers.delete(email);
          onlineUsers.set(data.email, ws);
          //console.log(`[WebSocket] Updated user mapping from ${email} to ${data.email}`);
        }
      }
    } catch (error) {
      console.error('[WebSocket] Error processing message:', error);
    }
  });
});

// Upgrade HTTP requests to WebSocket connections
app.server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

app.server.on('upgrade', async (req, socket, head) => {
  const token = req.headers['sec-websocket-protocol']; // Use the token for authentication
  console.log(`[WebSocket] Upgrade request with token: ${token ? token.substring(0, 5) + '...' : 'undefined'}`);
  
  try {
    const user = await findUser('token', token);
    
    if (!user) {
      console.log('[WebSocket] Authentication failed: No user found for token');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    
    console.log(`[WebSocket] Authentication successful for ${user.email}`);
    req.email = user.email; // Attach the user's email to the request
    
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } catch (error) {
    console.error('[WebSocket] Error during WebSocket upgrade:', error);
    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    socket.destroy();
  }
});

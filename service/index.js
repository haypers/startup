const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const express = require('express');
const uuid = require('uuid');
const { createCanvas } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const app = express();

//using simon code
let users = [];
const authCookieName = 'token';

// JSON body parsing using built-in middleware
app.use(express.json());

// Use the cookie parser middleware for tracking authentication tokens
app.use(cookieParser());

// from requirments.
const port = process.env.PORT || 4000; // Use environment variable or default to 4000
app.use(express.static('public'));

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
      setAuthCookie(res, user.token);
      res.send({ email: user.email });
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
        user.token = uuid.v4();
        setAuthCookie(res, user.token);
        res.send({ email: user.email });
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
    const token = req.cookies[authCookieName];
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

// Middleware to verify that the user is authorized to call an endpoint
const verifyAuth = async (req, res, next) => {
  try {
    const user = await findUser('token', req.cookies[authCookieName]);
    if (user) {
      next();
    } else {
      res.status(401).send({ msg: 'Unauthorized' });
    }
  } catch (error) {
    console.error('Verify Auth Error:', error);
    res.status(500).send({ msg: 'Authentication failed' });
  }
};

let pixels = []; // Store the pixel grid on the server

// Fetch or initialize pixels
apiRouter.get('/pixels', (req, res) => {
  if (pixels.length === 0) {
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
        lastChangedBy: null, // No user has changed this pixel yet
      });
    }
  }
  res.send(pixels);
});

apiRouter.put('/pixels/:id', verifyAuth, (req, res) => {
  const pixelId = parseInt(req.params.id);
  const { color, borderColor } = req.body;

  const pixel = pixels.find((p) => p.id === pixelId);
  if (!pixel) {
    return res.status(404).send({ msg: 'Pixel not found' });
  }

  // Update the pixel state
  pixel.color = color;
  pixel.borderColor = borderColor;
  pixel.lastChangedBy = req.cookies[authCookieName]; // Track who changed it

  res.status(200).send(pixel); // Respond with the updated pixel
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

// Function to fetch color of the day from zoodinkers
async function fetchColorOfTheDay() {
  try {
    const response = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(
        'http://colors.zoodinkers.com/api'
      )}`
    );
    
    if (response.ok) {
      const data = await response.json();
      const parsedData = JSON.parse(data.contents);
      const newColor = parsedData.hex;
      
      // Only update if the color has changed
      if (newColor !== colorOfTheDay) {
        colorOfTheDay = newColor;
        generateColorPalette(colorOfTheDay);
        console.log('Updated color of the day:', colorOfTheDay);
      }
    } else {
      console.error('Failed to fetch color of the day');
    }
  } catch (error) {
    console.error('Error fetching color of the day:', error);
    // Set a fallback color if fetch fails
    if (colorOfTheDay === '#FFFFFF') {
      colorOfTheDay = '#3498DB'; // Fallback to a nice blue
      generateColorPalette(colorOfTheDay);
      console.log('Using fallback color:', colorOfTheDay);
    }
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
    // Check if we need to update the color
    await checkAndUpdateColor();
    
    res.send({
      colorOfTheDay: colorOfTheDay,
      colorPalette: colorPalette
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

// Function to generate and save image if needed
let lastSavedPixelState = null;

async function generateAndSaveImageIfNeeded() {
  try {
    if (!fs.existsSync(imageDir)) {
      console.log('Image directory not found, creating it...');
      fs.ensureDirSync(imageDir);
    }

    if (pixels.length === 0) {
      console.log('Pixels array is not initialized. Skipping image generation.');
      return;
    }

    const currentPixelState = JSON.stringify(pixels);

    if (currentPixelState === lastSavedPixelState) {
      console.log('No changes detected in pixel state. Skipping image generation.');
      return;
    }

    lastSavedPixelState = currentPixelState;

    const canvas = createCanvas(50, 50);
    const ctx = canvas.getContext('2d');

    pixels.forEach((pixel) => {
      const x = pixel.id % 50;
      const y = Math.floor(pixel.id / 50);
      ctx.fillStyle = pixel.color;
      ctx.fillRect(x, y, 1, 1);
    });

    const timestamp = Date.now();
    const fileName = `pixel-art-${timestamp}.png`;
    const filePath = path.join(imageDir, fileName);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);

    console.log(`Generated new image: ${fileName}`);

    pruneOldImages(50);
  } catch (error) {
    console.error('Error generating image:', error);
  }
}

// Prune old images
function pruneOldImages(keepCount) {
  try {
    const files = fs.readdirSync(imageDir)
      .filter(file => file.startsWith('pixel-art-'))
      .sort((a, b) => b.localeCompare(a));

    if (files.length > keepCount) {
      files.slice(keepCount).forEach(file => {
        fs.unlinkSync(path.join(imageDir, file));
        console.log(`Deleted old image: ${file}`);
      });
    }
  } catch (error) {
    console.error('Error pruning old images:', error);
  }
}

// Create image directory in a location that will work in production
const imageDir = path.join(process.cwd(), 'public', 'images');
fs.ensureDirSync(imageDir);
console.log(`Created/verified image directory at: ${imageDir}`);

// Initialize image generation on server start
generateAndSaveImageIfNeeded();

// Set up timer to generate images every 5 minutes
const FIVE_MINUTES = 30 * 60 * 1000; //1 should be a 5
setInterval(generateAndSaveImageIfNeeded, FIVE_MINUTES);

// Endpoint to get list of all saved images
apiRouter.get('/images', (req, res) => {
  try {
    const files = fs.readdirSync(imageDir)
      .filter(file => file.startsWith('pixel-art-'))
      .map(file => {
        const timestamp = parseInt(file.replace('pixel-art-', '').replace('.png', ''), 10);
        return {
          filename: file,
          timestamp: timestamp,
          url: `/images/${file}`
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json(files);
  } catch (error) {
    console.error('Error getting image list:', error);
    res.status(500).send({ msg: 'Failed to get image list' });
  }
});

// Endpoint to get a specific image by filename
apiRouter.get('/images/:filename', (req, res) => {
  try {
    const filePath = path.join(imageDir, req.params.filename);
    
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'image/png');
      res.sendFile(filePath);
    } else {
      res.status(404).send({ msg: 'Image not found' });
    }
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).send({ msg: 'Failed to serve image' });
  }
});

// Default error handler
app.use(function (err, req, res, next) {
  console.error('Express App Error:', err);
  res.status(500).send({ type: err.name, message: err.message });
});

// Return the application's default page if the path is unknown
app.use((_req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

async function createUser(email, password) {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    email: email,
    password: passwordHash,
    token: uuid.v4(),
  };
  users.push(user);

  return user;
}

async function findUser(field, value) {
  if (!value) return null;

  return users.find((u) => u[field] === value);
}

// setAuthCookie in the HTTP response
function setAuthCookie(res, authToken) {
  res.cookie(authCookieName, authToken, {
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
  });
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

const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const express = require('express');
const uuid = require('uuid');
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

function rgbToHex(r, g, b) {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
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

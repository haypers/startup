const { MongoClient } = require('mongodb');
const config = require('./dbConfig.json');

const url = `mongodb+srv://${config.userName}:${config.password}@${config.hostname}`;

const client = new MongoClient(url);
const db = client.db('publicpixel');
const userCollection = db.collection('users');
const artCollection = db.collection('currentArt');
const historyCollection = db.collection('historyImages');
const colorsCollection = db.collection('todaysColors');

// This will asynchronously test the connection and exit the process if it fails
(async function testConnection() {
  try {
    await client.connect();
    await db.command({ ping: 1 });
    console.log(`Connected to database successfully`);
  } catch (ex) {
    console.log(`Unable to connect to database with ${url} because ${ex.message}`);
    process.exit(1);
  }
})();

// ===== USER OPERATIONS =====

// Get user by email
function getUser(email) {
  return userCollection.findOne({ email: email });
}

// Get user by token
function getUserByToken(token) {
  return userCollection.findOne({ token: token });
}

// Add a new user
async function addUser(user) {
  await userCollection.insertOne(user);
  return user;
}

// Update an existing user
async function updateUser(user) {
  await userCollection.updateOne({ email: user.email }, { $set: user });
  return user;
}

// ===== PIXEL GRID OPERATIONS =====

// Get the current state of the pixel art grid
async function getPixels() {
  const artDoc = await artCollection.findOne({ _id: 'current' });
  return artDoc ? artDoc.pixels : [];
}

// Update a single pixel
async function updatePixel(id, pixelData) {
  // First, get the current art document or create it if it doesn't exist
  let artDoc = await artCollection.findOne({ _id: 'current' });
  
  if (!artDoc) {
    // Initialize the art document with empty pixels array
    artDoc = { _id: 'current', pixels: [] };
    await artCollection.insertOne(artDoc);
  }
  
  // Update the specific pixel in the pixels array
  const result = await artCollection.updateOne(
    { _id: 'current' },
    { $set: { [`pixels.${id}`]: pixelData } }
  );
  
  return result.modifiedCount > 0;
}

// Save the entire pixel grid
async function savePixels(pixels) {
  const result = await artCollection.updateOne(
    { _id: 'current' },
    { $set: { pixels: pixels } },
    { upsert: true }
  );
  
  return result.modifiedCount > 0 || result.upsertedCount > 0;
}

// ===== COLOR OPERATIONS =====

// Get the current colors of the day
async function getColors() {
  const colorDoc = await colorsCollection.findOne({ _id: 'todaysColors' });
  return colorDoc ? {
    colorOfTheDay: colorDoc.colorOfTheDay,
    colorPalette: colorDoc.colorPalette,
    lastUpdated: colorDoc.lastUpdated
  } : null;
}

// Save the new colors of the day
async function saveColors(colorOfTheDay, colorPalette) {
  const result = await colorsCollection.updateOne(
    { _id: 'todaysColors' },
    { 
      $set: { 
        colorOfTheDay: colorOfTheDay,
        colorPalette: colorPalette,
        lastUpdated: new Date()
      } 
    },
    { upsert: true }
  );
  
  return result.modifiedCount > 0 || result.upsertedCount > 0;
}

// ===== HISTORY IMAGE OPERATIONS =====

// Get all history images
async function getHistoryImages(limit = 50) {
  try {
    return await historyCollection
      .find({})
      .sort({ timestamp: -1 }) // Sort by newest first
      .limit(limit)
      .toArray();
  } catch (error) {
    console.error('Error getting history images:', error);
    return [];
  }
}

// Get a single history image by ID
async function getHistoryImage(id) {
  try {
    return await historyCollection.findOne({ _id: new ObjectId(id) });
  } catch (error) {
    console.error('Error getting history image:', error);
    return null;
  }
}

// Save a new history image
async function saveHistoryImage(imageData) {
  try {
    const result = await historyCollection.insertOne({
      timestamp: Date.now(),
      imageData: imageData,
      date: new Date()
    });
    
    return result.insertedId;
  } catch (error) {
    console.error('Error saving history image:', error);
    throw error;
  }
}

// Delete old history images, keeping only the most recent ones
async function pruneHistoryImages(keepCount) {
  try {
    // Find the timestamp of the Nth newest image
    const images = await historyCollection
      .find({})
      .sort({ timestamp: -1 })
      .skip(keepCount - 1)
      .limit(1)
      .toArray();
    
    if (images.length > 0) {
      const oldestToKeep = images[0].timestamp;
      const result = await historyCollection.deleteMany({ timestamp: { $lt: oldestToKeep } });
      console.log(`Pruned ${result.deletedCount} old images from database`);
      return result.deletedCount;
    }
    
    return 0;
  } catch (error) {
    console.error('Error pruning history images:', error);
    return 0;
  }
}

module.exports = {
  // User operations
  getUser,
  getUserByToken,
  addUser,
  updateUser,
  
  // Pixel grid operations
  getPixels,
  updatePixel,
  savePixels,
  
  // Color operations
  getColors,
  saveColors,
  
  // History image operations
  getHistoryImages,
  getHistoryImage,
  saveHistoryImage,
  pruneHistoryImages
};

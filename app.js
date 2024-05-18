// Import required modules
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config(); // Load environment variables from .env file


// Create Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + 'style.css'))

// MongoDB connection setup (using MongoDB Node.js driver)
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db, favoritePoems;

async function connectToDB() {
  try {
    await client.connect();
    db = client.db('Poetry_Info');
    favoritePoems = db.collection('favoritePoems');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
  }
}

connectToDB();

app.set('view engine', 'ejs');
app.use(express.static('public'));

// Home route
app.get('/', (req, res) => {
  res.render('index');
});

// Search route
app.post('/search', async (req, res) => {
  const searchTerm = req.body.searchTerm;
  const poemCount = req.body.poemCount || 10; // Default to 10 if not provided
  let apiUrl = `https://poetrydb.org/author,poemcount/${searchTerm};${poemCount}/title,author,lines`;

  try {
    const response = await axios.get(apiUrl);
    const poems = response.data;
    res.render('search', { poems: poems });
  } catch (error) {
    console.error('Error fetching data from PoetryDB:', error);
    res.status(500).send('Error fetching data from PoetryDB');
  }
});

// View poem route
app.get('/poem/:title', async (req, res) => {
  const title = req.params.title;

  try {
    // Make HTTP request using Axios to fetch the full text of the selected poem
    const response = await axios.get(`https://poetrydb.org/title/${title}`);
    const poem = response.data[0]; // Assuming the first entry contains the full poem
    res.render('poem', { poem: poem });
  } catch (error) {
    console.error('Error fetching poem from PoetryDB:', error);
    res.status(500).send('Error fetching poem from PoetryDB');
  }
});

// Add to favorites route
app.post('/favorites', async (req, res) => {
  const author = req.body.author;
  const title = req.body.title;
  const lines = req.body.lines.split('\n');

  try {
    // Save the poem details to MongoDB
    await favoritePoems.insertOne({ author: author, title: title, lines: lines });
    res.status(200).send('Poem added to favorites');
  } catch (error) {
    console.error('Error adding poem to favorites:', error);
    res.status(500).send('Error adding poem to favorites');
  }
});

// Favorites route
app.get('/favorites', async (req, res) => {
  try {
    // Retrieve favorite poems from MongoDB
    const poems = await favoritePoems.find({}).toArray();
    res.render('favorites', { favoritePoems: poems });
  } catch (error) {
    console.error('Error fetching favorite poems:', error);
    res.status(500).send('Error fetching favorite poems');
  }
});

// Remove all favorites route
app.post('/favorites/delete', async (req, res) => {
  try {
    // Delete all records from the MongoDB collection
    const result = await favoritePoems.deleteMany({});
    res.render('delete_result', { deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error removing all favorite poems:', error);
    res.status(500).send('Error removing all favorite poems');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

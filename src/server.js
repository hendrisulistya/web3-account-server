// src/server.js
const express = require('express');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config(); // Load environment variables

const app = express();

app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// Handle the POST request to store the MetaMask wallet address
app.post('/accounts', async (req, res) => {
    const walletAddress = req.body.address;

  // Connect to the MongoDB database using the environment variable
  const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();

    // Access the database and collection names
    const dbName = 'yourDatabaseName';
    const collectionName = 'yourCollectionName';

    // Create the database if it doesn't exist
    const db = client.db(dbName);
    const dbExists = await client
      .db()
      .admin()
      .listDatabases({ nameOnly: true })
      .then((dbs) => dbs.databases.map((db) => db.name).includes(dbName));
    if (!dbExists) {
      await db.createCollection(collectionName);
    }

    // Create the collection if it doesn't exist
    const collectionExists = await db
      .listCollections({ name: collectionName })
      .hasNext();
    if (!collectionExists) {
      await db.createCollection(collectionName);
    }

    // Check if the wallet address already exists in the collection
    const collection = db.collection(collectionName);
    const existingAccount = await collection.findOne({ walletAddress });

    if (existingAccount) {
      // Send a warning response if the account already exists
      res.status(409).json({ message: 'Account already exists' });
    } else {
      // Insert the wallet address into the collection
      const result = await collection.insertOne({ walletAddress });

      // Send a success response
      res.status(200).json({ message: 'Account stored successfully' });
    }
  } catch (error) {
    // Handle any errors and send an error response
    console.error('Error storing account:', error);
    res.status(500).json({ message: 'Error storing account' });
  } finally {
    // Close the MongoDB connection
    client.close();
  }
});

module.exports = app;
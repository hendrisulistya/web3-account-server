// src/server.js
const express = require('express');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config(); // Load environment variables
const sigUtils = require('eth-sig-util');
const jwt = require('jsonwebtoken');

const app = express();

app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// Handle the POST request to store the MetaMask wallet address
app.post('/accounts', async (req, res) => {
  const { address, user, signedData } = req.body;

  if (!address || !user || !signedData) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    // Verify the signature and recover the address
    const recoveredAddress = sigUtils.recoverPersonalSignature({
      data: signedData,
      sig: signedData,
    });

    // Connect to the MongoDB database
    const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();

    // Access the database and collection names from environment variables
    const dbName = process.env.MONGODB_DATABASE_NAME;
    const collectionName = process.env.MONGODB_COLLECTION_NAME;

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

    // Check if the address already exists in the collection
    const collection = db.collection(collectionName);
    let account = await collection.findOne({ address });

    // If the account doesn't exist, create a new user
    if (!account) {
      account = { address, user, recoveredAddress };
      await collection.insertOne(account);
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    const token = jwt.sign({ address }, jwtSecret);

    // Return the token in the response
    return res.status(200).json({ token });
  } catch (error) {
    console.error('Error storing account:', error);
    return res.status(500).json({ error: 'Error storing account' });
  }
});
  
  

// Handle the GET request to retrieve all accounts
app.get('/accounts', async (req, res) => {
    // Connect to the MongoDB database using the environment variable
    const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  
    try {
      await client.connect();
  
      // Access the database and collection names from environment variables
      const dbName = process.env.MONGODB_DATABASE_NAME;
      const collectionName = process.env.MONGODB_COLLECTION_NAME;
  
      // Retrieve all accounts from the collection
      const db = client.db(dbName);
      const collection = db.collection(collectionName);
      const accounts = await collection.find().toArray();
  
      // Format the accounts to use the "address" key instead of "walletAddress"
      const formattedAccounts = accounts.map(({ _id, address }) => ({
        _id,
        address: address,
      }));
  
      // Send the accounts as the response
      res.status(200).json({ accounts: formattedAccounts });
    } catch (error) {
      // Handle any errors and send an error response
      console.error('Error retrieving accounts:', error);
      res.status(500).json({ message: 'Error retrieving accounts' });
    } finally {
      // Close the MongoDB connection
      client.close();
    }
  });
  

module.exports = app;
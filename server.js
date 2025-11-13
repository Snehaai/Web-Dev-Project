require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const Entry = require('./models/Entry');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Health
app.get('/', (req,res)=>res.send({ok:true}));

// Create entry
app.post('/api/entries', async (req,res) => {
  try {
    const { text, mood } = req.body;
    if (!text || !mood) return res.status(400).json({error:'text and mood required'});
    const entry = new Entry({ text, mood });
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all entries (optionally support ?limit or date filter later)
app.get('/api/entries', async (req,res) => {
  try {
    const entries = await Entry.find().sort({ createdAt: 1 }); // ascending by time
    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete entry
app.delete('/api/entries/:id', async (req,res) => {
  try {
    await Entry.findByIdAndDelete(req.params.id);
    res.json({ ok:true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:'Server error' });
  }
});

// connect + start
const PORT = process.env.PORT || 9000;
const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/journal';

mongoose.connect(MONGO, { useNewUrlParser:true, useUnifiedTopology:true })
  .then(()=> {
    console.log('Mongo connected');
    app.listen(PORT, ()=> console.log('Server listening', PORT));
  })
  .catch(err=> {
    console.error('Mongo connection error', err);
  });

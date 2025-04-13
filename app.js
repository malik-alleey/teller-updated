const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Learning Schema
const learningSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Learning = mongoose.model('Learning', learningSchema);

// Masail Schema
const masailSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['salah', 'zakah', 'sawm', 'hajj', 'tahara', 'muamalat', 'other']
  },
  createdAt: { type: Date, default: Date.now }
});

const Masail = mongoose.model('Masail', masailSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Get all learnings
app.get('/api/learnings', async (req, res) => {
  try {
    const learnings = await Learning.find().sort({ createdAt: -1 });
    res.json(learnings);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching learnings' });
  }
});

// Add new learning
app.post('/api/learnings', async (req, res) => {
  try {
    const { question, answer } = req.body;
    const newLearning = new Learning({ question, answer });
    await newLearning.save();
    res.status(201).json(newLearning);
  } catch (error) {
    res.status(400).json({ error: 'Error saving learning' });
  }
});

// Get suggestions as user types
app.get('/api/suggestions', async (req, res) => {
  try {
    const query = req.query.q.toLowerCase();
    const suggestions = await Learning.find({
      question: { $regex: query, $options: 'i' }
    }).limit(5);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching suggestions' });
  }
});

// Search learnings
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q.toLowerCase();
    const learnings = await Learning.find({
      $or: [
        { question: { $regex: query, $options: 'i' } },
        { answer: { $regex: query, $options: 'i' } }
      ]
    });
    res.json(learnings);
  } catch (error) {
    res.status(500).json({ error: 'Error searching learnings' });
  }
});

// MASAIL ROUTES

// Get all masail with optional category filter
app.get('/api/masail', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    
    const masail = await Masail.find(filter).sort({ createdAt: -1 });
    res.json(masail);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching masail' });
  }
});

// Add new masail
app.post('/api/masail', async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    const newMasail = new Masail({ question, answer, category });
    await newMasail.save();
    res.status(201).json(newMasail);
  } catch (error) {
    res.status(400).json({ error: 'Error saving masail' });
  }
});

// Search masail
app.get('/api/masail/search', async (req, res) => {
  try {
    const query = req.query.q.toLowerCase();
    const category = req.query.category || '';
    
    let filter = {
      $or: [
        { question: { $regex: query, $options: 'i' } },
        { answer: { $regex: query, $options: 'i' } }
      ]
    };
    
    // Add category filter if provided
    if (category) {
      filter.category = category;
    }
    
    const masail = await Masail.find(filter);
    res.json(masail);
  } catch (error) {
    res.status(500).json({ error: 'Error searching masail' });
  }
});

// Delete learning
app.delete('/api/learnings/:id', async (req, res) => {
  try {
    // Check secret word
    const { secretWord } = req.body;
    if (secretWord !== process.env.secret_word) {
      return res.status(403).json({ error: 'Incorrect secret word' });
    }

    const learning = await Learning.findByIdAndDelete(req.params.id);
    if (!learning) {
      return res.status(404).json({ error: 'Learning not found' });
    }
    res.json({ message: 'Learning deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting learning' });
  }
});

// Update learning
app.put('/api/learnings/:id', async (req, res) => {
  try {
    const { question, answer, secretWord } = req.body;
    
    // Check secret word
    if (secretWord !== process.env.secret_word) {
      return res.status(403).json({ error: 'Incorrect secret word' });
    }

    const learning = await Learning.findByIdAndUpdate(
      req.params.id,
      { question, answer },
      { new: true }
    );
    if (!learning) {
      return res.status(404).json({ error: 'Learning not found' });
    }
    res.json(learning);
  } catch (error) {
    res.status(500).json({ error: 'Error updating learning' });
  }
});

// Delete masail
app.delete('/api/masail/:id', async (req, res) => {
  try {
    // Check secret word
    const { secretWord } = req.body;
    if (secretWord !== process.env.secret_word) {
      return res.status(403).json({ error: 'Incorrect secret word' });
    }

    const masail = await Masail.findByIdAndDelete(req.params.id);
    if (!masail) {
      return res.status(404).json({ error: 'Masail not found' });
    }
    res.json({ message: 'Masail deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting masail' });
  }
});

// Update masail
app.put('/api/masail/:id', async (req, res) => {
  try {
    const { question, answer, category, secretWord } = req.body;
    
    // Check secret word
    if (secretWord !== process.env.secret_word) {
      return res.status(403).json({ error: 'Incorrect secret word' });
    }

    const masail = await Masail.findByIdAndUpdate(
      req.params.id,
      { question, answer, category },
      { new: true }
    );
    if (!masail) {
      return res.status(404).json({ error: 'Masail not found' });
    }
    res.json(masail);
  } catch (error) {
    res.status(500).json({ error: 'Error updating masail' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 
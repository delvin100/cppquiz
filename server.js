const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());
app.use(express.static('public'));

console.log('🚀 Starting the server...');

// MongoDB Connection
const connectToMongoDB = async () => {
  try {
    mongoose.set('debug', true);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};
module.exports = connectToMongoDB;

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  scores: [{ level: String, score: Number, date: { type: Date, default: Date.now } }]
});
const User = mongoose.model('User', UserSchema);

// Quiz Data (10 questions per level)
const quizData = {
  easy: [
    { id: 1, question: "What is used to print in C++?", options: ["cout", "cin", "print"], correctAnswer: "cout", points: 1 },
    { id: 2, question: "Which operator is used for input?", options: ["<<", ">>", "=="], correctAnswer: ">>", points: 1 },
    { id: 3, question: "What ends a C++ statement?", options: [";", ":", "."], correctAnswer: ";", points: 1 },
    { id: 4, question: "Which keyword declares a variable?", options: ["int", "var", "let"], correctAnswer: "int", points: 1 },
    { id: 5, question: "What is the size of int?", options: ["2 bytes", "4 bytes", "8 bytes"], correctAnswer: "4 bytes", points: 1 },
    { id: 6, question: "Which loop runs at least once?", options: ["for", "while", "do-while"], correctAnswer: "do-while", points: 1 },
    { id: 7, question: "What symbol denotes a comment?", options: ["//", "##", "/*"], correctAnswer: "//", points: 1 },
    { id: 8, question: "Which is a logical operator?", options: ["&&", "+", "*"], correctAnswer: "&&", points: 1 },
    { id: 9, question: "What is 'true' in C++?", options: ["0", "1", "-1"], correctAnswer: "1", points: 1 },
    { id: 10, question: "Which header is for input/output?", options: ["<iostream>", "<stdio.h>", "<string>"], correctAnswer: "<iostream>", points: 1 }
  ],
  medium: [
    { id: 1, question: "What is a pointer?", options: ["Variable", "Memory address", "Function"], correctAnswer: "Memory address", points: 2 },
    { id: 2, question: "What does 'new' do?", options: ["Deletes memory", "Allocates memory", "Prints"], correctAnswer: "Allocates memory", points: 2 },
    { id: 3, question: "What is dereferencing?", options: ["Accessing value", "Setting address", "Deleting"], correctAnswer: "Accessing value", points: 2 },
    { id: 4, question: "What is a reference?", options: ["Alias", "Copy", "Pointer"], correctAnswer: "Alias", points: 2 },
    { id: 5, question: "What keyword defines a class?", options: ["class", "struct", "type"], correctAnswer: "class", points: 2 },
    { id: 6, question: "What is a constructor?", options: ["Destructor", "Initializer", "Function"], correctAnswer: "Initializer", points: 2 },
    { id: 7, question: "What does 'delete' do?", options: ["Frees memory", "Allocates memory", "Prints"], correctAnswer: "Frees memory", points: 2 },
    { id: 8, question: "What is an array?", options: ["Single variable", "Collection", "Function"], correctAnswer: "Collection", points: 2 },
    { id: 9, question: "What is 'this' pointer?", options: ["Current object", "Next object", "Null"], correctAnswer: "Current object", points: 2 },
    { id: 10, question: "What is a namespace?", options: ["Scope", "Class", "Variable"], correctAnswer: "Scope", points: 2 }
  ],
  hard: [
    { id: 1, question: "What is polymorphism?", options: ["Many forms", "Single form", "Memory"], correctAnswer: "Many forms", points: 3 },
    { id: 2, question: "What is a virtual function?", options: ["Static", "Overridable", "Constant"], correctAnswer: "Overridable", points: 3 },
    { id: 3, question: "What is inheritance?", options: ["Code reuse", "Encapsulation", "Overloading"], correctAnswer: "Code reuse", points: 3 },
    { id: 4, question: "What is an abstract class?", options: ["No objects", "All objects", "Static"], correctAnswer: "No objects", points: 3 },
    { id: 5, question: "What is a template?", options: ["Generic type", "Specific type", "Function"], correctAnswer: "Generic type", points: 3 },
    { id: 6, question: "What is exception handling?", options: ["Error management", "Memory allocation", "Looping"], correctAnswer: "Error management", points: 3 },
    { id: 7, question: "What is 'const'?", options: ["Constant", "Variable", "Pointer"], correctAnswer: "Constant", points: 3 },
    { id: 8, question: "What is operator overloading?", options: ["Redefining", "Deleting", "Copying"], correctAnswer: "Redefining", points: 3 },
    { id: 9, question: "What is a friend function?", options: ["Access private", "Public only", "Static"], correctAnswer: "Access private", points: 3 },
    { id: 10, question: "What is RAII?", options: ["Resource management", "Memory leak", "Function call"], correctAnswer: "Resource management", points: 3 }
  ]
};

// Middleware to Verify Token
const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ msg: 'No token provided' });

  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'mysecret123');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Invalid token' });
  }
};

// Signup Route
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ msg: 'Please provide username and password' });

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ msg: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET || 'mysecret123');
    res.json({ token });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ msg: 'Server error during signup' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ msg: 'Please provide username and password' });

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: 'Invalid username' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid password' });

    const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET || 'mysecret123');
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ msg: 'Server error during login' });
  }
});

// Get Quiz Data
app.get('/quiz/:level', (req, res) => {
  const level = req.params.level;
  if (quizData[level]) res.json(quizData[level]);
  else res.status(404).json({ msg: 'Level not found' });
});

// Submit Score
app.post('/submit-score', authMiddleware, async (req, res) => {
  const { level, score } = req.body;
  try {
    const user = await User.findById(req.user.id);
    user.scores.push({ level, score });
    await user.save();
    res.json({ msg: 'Score saved successfully' });
  } catch (err) {
    console.error('Score submission error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get User Data
app.get('/user', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error('User data error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get Leaderboard
app.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('username scores');
    const leaderboard = users.map(user => ({
      username: user.username,
      totalScore: user.scores.reduce((sum, s) => sum + s.score, 0)
    })).sort((a, b) => b.totalScore - a.totalScore);
    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Start Server
connectToMongoDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Server is live on port ${PORT}!`);
    console.log(`🌐 URL: http://localhost:${PORT} (local)`);
  });
});
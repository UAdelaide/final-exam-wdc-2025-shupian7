const express = require('express');
const path = require('path');
require('dotenv').config();

const session = require('express-session'); 

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing form submissions

// --- Add session configuration ---
app.use(session({
  secret: 'your-session-secret', // Replace with your own random string
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set true if using HTTPS
}));
// ----------------------------------

app.use(express.static(path.join(__dirname, '/public')));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');
const dogRoutes = require('./routes/dogRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dogs', dogRoutes);

// Export the app instead of listening here
module.exports = app;
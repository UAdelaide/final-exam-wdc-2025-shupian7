// routes/dogRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../models/db'); 

// GET /api/dogs - Get all dogs in the database
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Dogs');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

module.exports = router;

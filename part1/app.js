const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 8080;

// Database configuration (replace with your own password if needed)
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'DogWalkService'
};

let pool;

// Insert demo data on startup
async function insertTestData() {
    const conn = await pool.getConnection();
    try {
        // Clean up all related tables (to prevent duplicate insertions on restart)
        await conn.query('DELETE FROM WalkRatings');
        await conn.query('DELETE FROM WalkApplications');
        await conn.query('DELETE FROM WalkRequests');
        await conn.query('DELETE FROM Dogs');
        await conn.query('DELETE FROM Users');

        // Insert five users
        await conn.query(`
            INSERT INTO Users (username, email, password_hash, role) VALUES
            ('alice123', 'alice@example.com', 'hashed123', 'owner'),
            ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
            ('carol123', 'carol@example.com', 'hashed789', 'owner'),
            ('davidw', 'david@example.com', 'hashed111', 'walker'),
            ('eveowner', 'eve@example.com', 'hashed222', 'owner');
        `);

        // Insert five dogs (owner_id is referenced using a subquery)
        await conn.query(`
            INSERT INTO Dogs (owner_id, name, size)
            VALUES
            ((SELECT user_id FROM Users WHERE username='alice123'), 'Max', 'medium'),
            ((SELECT user_id FROM Users WHERE username='carol123'), 'Bella', 'small'),
            ((SELECT user_id FROM Users WHERE username='alice123'), 'Rocky', 'large'),
            ((SELECT user_id FROM Users WHERE username='eveowner'), 'Milo', 'medium'),
            ((SELECT user_id FROM Users WHERE username='carol123'), 'Coco', 'small');
        `);

        // Insert five walk requests (dog_id is referenced using a subquery)
        await conn.query(`
            INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
            VALUES
            ((SELECT dog_id FROM Dogs WHERE name='Max' AND owner_id=(SELECT user_id FROM Users WHERE username='alice123')), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
            ((SELECT dog_id FROM Dogs WHERE name='Bella' AND owner_id=(SELECT user_id FROM Users WHERE username='carol123')), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
            ((SELECT dog_id FROM Dogs WHERE name='Rocky' AND owner_id=(SELECT user_id FROM Users WHERE username='alice123')), '2025-06-11 10:00:00', 60, 'City Park', 'completed'),
            ((SELECT dog_id FROM Dogs WHERE name='Milo' AND owner_id=(SELECT user_id FROM Users WHERE username='eveowner')), '2025-06-12 15:00:00', 20, 'Riverside', 'open'),
            ((SELECT dog_id FROM Dogs WHERE name='Coco' AND owner_id=(SELECT user_id FROM Users WHERE username='carol123')), '2025-06-13 18:30:00', 50, 'Hilltop', 'cancelled');
        `);

    } finally {
        conn.release();
    }
}

/**
 * Route: /api/dogs
 * Returns all dogs with their size and the owner's username
 */
app.get('/api/dogs', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.name AS dog_name, d.size, u.username AS owner_username
            FROM Dogs d
            JOIN Users u ON d.owner_id = u.user_id
        `);
        res.json(rows);
    } catch (err) {
        // Error handling with status code and message
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

/**
 * Route: /api/walkrequests/open
 * Returns all walk requests with status 'open', including dog info and owner's username
 */
app.get('/api/walkrequests/open', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT wr.request_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username AS owner_username
            FROM WalkRequests wr
            JOIN Dogs d ON wr.dog_id = d.dog_id
            JOIN Users u ON d.owner_id = u.user_id
            WHERE wr.status = 'open'
        `);
        res.json(rows);
    } catch (err) {
        // Error handling with status code and message
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

/**
 * Route: /api/walkers/summary
 * Returns summary for each walker: total ratings, average rating, and number of completed walks
 * (If no ratings/completed walks, returns zero or null accordingly)
 */
app.get('/api/walkers/summary', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                u.username AS walker_username,
                COUNT(r.rating_id) AS total_ratings,
                AVG(r.rating) AS average_rating,
                (
                    SELECT COUNT(*)
                    FROM WalkRequests wr
                    JOIN WalkApplications wa ON wr.request_id = wa.request_id
                    WHERE wa.walker_id = u.user_id AND wr.status = 'completed'
                ) AS completed_walks
            FROM Users u
            LEFT JOIN WalkRatings r ON r.walker_id = u.user_id
            WHERE u.role = 'walker'
            GROUP BY u.user_id
        `);
        res.json(rows);
    } catch (err) {
        // Error handling with status code and message
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Start the server and insert demo data
app.listen(PORT, async () => {
    pool = mysql.createPool(dbConfig);
    await insertTestData();
    console.log(`Server running at http://localhost:${PORT}`);
});

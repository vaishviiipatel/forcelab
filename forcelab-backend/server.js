const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Dynamic production connection database pooling
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

dbPool.connect((err) => {
  if (err) console.error('Cloud Database sync failed:', err.message);
  else console.log('Database synced properly on operational engine.');
});

app.get('/', (req, res) => res.send('Operational engine active.'));

app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing parameters.' });
  }

  try {
    const costFactor = 10;
    const securePasswordHash = await bcrypt.hash(password, costFactor);

    const insertionQuery = 'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)';
    dbPool.query(insertionQuery, [username, email, securePasswordHash], (dbError, result) => {
      if (dbError) {
        console.error("Signup Database Error details:", dbError.message);
        if (dbError.code === '23505' || dbError.message.includes('unique constraint')) {
          return res.status(400).json({ error: 'This email is already in use.' });
        }
        return res.status(500).json({ error: 'Storage failure.' });
      }
      res.status(201).json({ message: 'Profile initialized.' });
    });
  } catch (processError) {
    res.status(500).json({ error: 'Password processing error.' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Both fields are required.' });
  }

  const lookupProfileQuery = 'SELECT * FROM users WHERE email = $1';
  dbPool.query(lookupProfileQuery, [email], async (dbError, recordMatches) => {
    if (dbError) return res.status(500).json({ error: 'Database request failed.' });
    if (recordMatches.rows.length === 0) return res.status(400).json({ error: 'No user record found.' });

    // FIXED: Added [0] so it extracts the actual profile object perfectly!
    const matchingProfile = recordMatches.rows[0];

    const credentialsMatch = await bcrypt.compare(password, matchingProfile.password_hash);
    if (!credentialsMatch) return res.status(400).json({ error: 'Incorrect credentials.' });

    const sessionToken = jwt.sign(
      { id: matchingProfile.id, username: matchingProfile.username }, 
      'FORCELAB_SECRET_KEY', 
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Access granted.',
      token: sessionToken,
      user: { 
        id: matchingProfile.id, 
        username: matchingProfile.username, 
        email: matchingProfile.email 
      }
    });
  });
});


app.get('/services/experiments', (req, res) => {
  dbPool.query('SELECT * FROM experiments ORDER BY createdat DESC', (err, results) => {
    if (err) {
      console.error('Error fetching data from database:', err.message);
      return res.status(500).json({ error: 'Database read failed' });
    }
    res.json(results.rows);
  });
});

app.post('/services/experiments', (req, res) => {
  const { name, note, gameId, settings, result, shot, score } = req.body;
  const cleanName = (name || '').trim() || 'Unnamed Experiment';

  dbPool.query('SELECT id FROM experiments WHERE LOWER(name) = LOWER($1) LIMIT 1', [cleanName], (err, recordMatches) => {
    if (err) {
      console.error('Error checking name:', err.message);
      return res.status(500).json({ error: 'Database read failed' });
    }
    if (recordMatches.rows.length > 0) return res.status(409).json({ error: 'duplicate' });

    const generatedId = String(Date.now());
    const systemTimestamp = new Date().toISOString();
    const databaseInsertionQuery = `
      INSERT INTO experiments (id, name, note, gameId, settings, result, score, createdAt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    const configurationValues = [
      generatedId,
      cleanName,
      note || '',
      gameId || 'unknown',
      JSON.stringify(settings || {}),
      JSON.stringify(result || shot || {}),
      score || 0,
      systemTimestamp,
    ];

    dbPool.query(databaseInsertionQuery, configurationValues, (insertionError) => {
      if (insertionError) {
        console.error('Error inserting data into database table:', insertionError.message);
        return res.status(500).json({ error: 'Database save failed' });
      }
      res.json({ id: generatedId, createdAt: systemTimestamp, name: cleanName, note, gameId });
    });
  });
});

const TARGET_PORT = process.env.PORT || 5000;
app.listen(TARGET_PORT, () => {
  console.log(`Backend running on port ${TARGET_PORT}`);
});

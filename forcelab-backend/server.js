const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const labConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'forcelab_db',
});

labConnection.connect((connectionError) => {
  if (connectionError) console.error('Database connection failed:', connectionError.message);
  else console.log('Database synced properly.');
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

    const checkDuplicateQuery = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
    labConnection.query(checkDuplicateQuery, [username, email, securePasswordHash], (dbError, databaseResult) => {
      if (dbError) {
        if (dbError.code === 'ER_DUP_ENTRY') {
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

    // FIX: Pull the first matching profile object out of the rows array array!
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
  labConnection.query('SELECT * FROM experiments ORDER BY createdAt DESC', (err, results) => {
    if (err) {
      console.error('Error fetching data from database:', err.message);
      return res.status(500).json({ error: 'Database read failed' });
    }
    res.json(results);
  });
});

app.post('/services/experiments', (req, res) => {
  const { name, note, gameId, settings, result, shot, score } = req.body;
  const cleanName = (name || '').trim() || 'Unnamed Experiment';

  labConnection.query('SELECT id FROM experiments WHERE LOWER(name) = LOWER(?) LIMIT 1', [cleanName], (err, rows) => {
    if (err) {
      console.error('Error checking name:', err.message);
      return res.status(500).json({ error: 'Database read failed' });
    }
    if (rows.length > 0) return res.status(409).json({ error: 'duplicate' });

    const generatedId = Date.now();
    const systemTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const databaseInsertionQuery = `
      INSERT INTO experiments (id, name, note, gameId, settings, result, score, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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

    labConnection.query(databaseInsertionQuery, configurationValues, (insertionError) => {
      if (insertionError) {
        console.error('Error inserting data into database table:', insertionError.message);
        return res.status(500).json({ error: 'Database save failed' });
      }
      res.json({ id: generatedId, createdAt: systemTimestamp, name: cleanName, note, gameId });
    });
  });
});

const TARGET_PORT = 5000;
app.listen(TARGET_PORT, () => {
  console.log(`Backend running on port ${TARGET_PORT}`);
});

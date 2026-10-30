// HARDCODED TO TALK TO THE LIVE ENGINE DIRECTLY 🌌
const BACKEND_BASE = 'https://forcelab-79sc.onrender.com';
const SERVICES_URL = `${BACKEND_BASE}/services/experiments`;

const parse = (v) => {
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return {}; }
  }
  return v || {};
};

function normalize(row) {
  const lower = {};
  Object.keys(row).forEach((k) => { lower[k.toLowerCase()] = row[k]; });
  return {
    id: lower.id,
    name: lower.name,
    note: lower.note || '',
    gameId: lower.gameid,
    score: lower.score,
    createdAt: lower.createdat,
    settings: parse(lower.settings),
    result: parse(lower.result),
  };
}

export async function getExperiments() {
  try {
    const response = await fetch(SERVICES_URL);
    if (!response.ok) throw new Error('Network error encountered during communication');
    const rows = await response.json();
    return rows.map(normalize);
  } catch (error) {
    console.error('Frontend failed to fetch state entries data:', error);
    return [];
  }
}

// returns the saved experiment, { duplicate: true } if the name is taken, or null on failure
export async function saveExperiment(experiment) {
  try {
    const response = await fetch(SERVICES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(experiment),
    });
    if (response.status === 409) return { duplicate: true };
    if (!response.ok) throw new Error('Network error encountered while saving system state');
    return await response.json();
  } catch (error) {
    console.error('Frontend failed to save current state config data:', error);
    return null;
  }
}
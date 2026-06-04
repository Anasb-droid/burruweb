const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const START_PORT = Number(process.env.PORT) || 3000;
let PORT = START_PORT;
const MAX_PORT_FALLBACK = START_PORT + 5;
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'openrouter/free';
const OPENROUTER_API_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_STATUS_URL = `${OPENROUTER_API_BASE_URL}/models`;
let openRouterReachable = false;

if (!AI_API_KEY) {
  console.warn('Warning: AI_API_KEY is not set. Create a .env file from .env.example.');
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const checkOpenRouterConnectivity = async () => {
  if (!AI_API_KEY) {
    openRouterReachable = false;
    return;
  }

  try {
    const response = await fetch(OPENROUTER_STATUS_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`
      }
    });
    openRouterReachable = response.ok;
  } catch (error) {
    openRouterReachable = false;
  }

  console.log(`OpenRouter connectivity: ${openRouterReachable ? 'available' : 'unavailable'}`);
};

const startConnectivityPolling = () => {
  checkOpenRouterConnectivity();
  setInterval(checkOpenRouterConnectivity, 60000);
};

app.get('/api/status', (req, res) => {
  res.json({
    aiKeyConfigured: Boolean(AI_API_KEY),
    aiModel: AI_MODEL,
    openRouterReachable,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

app.post('/api/chat', async (req, res) => {
  if (!AI_API_KEY) {
    return res.status(500).json({ error: 'AI API key is not configured.' });
  }

  if (!openRouterReachable) {
    return res.status(503).json({ error: 'OpenRouter connectivity is currently unavailable. Please try again later.' });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages is required and must be a non-empty array.' });
  }

  try {
    const response = await fetch(`${OPENROUTER_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        temperature: 0.8,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('AI request failed:', error);
    return res.status(500).json({ error: 'AI request failed.' });
  }
});

const bindToPort = port => new Promise((resolve, reject) => {
  const server = app.listen(port, () => resolve(server));
  server.on('error', reject);
});

const startServer = async () => {
  let server;

  while (PORT <= MAX_PORT_FALLBACK) {
    try {
      server = await bindToPort(PORT);
      break;
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        console.warn(`Port ${PORT} is already in use, trying ${PORT + 1}...`);
        PORT += 1;
        continue;
      }

      console.error('Server failed to start:', error);
      process.exit(1);
    }
  }

  if (!server) {
    console.error(`Could not bind the server to any port between ${START_PORT} and ${MAX_PORT_FALLBACK}.`);
    process.exit(1);
  }

  startConnectivityPolling();
  console.log(`Server running on http://localhost:${PORT}`);

  server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other service or set a different PORT in your .env file.`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });
};

startServer();

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { crawl } = require('./crawler');
const { analyzeTrackingRequests, isConfigured } = require('./lib/anthropic');

const app = express();
const port = 3000;

// Enable CORS for React frontend
// Enable CORS for React frontend (Local + Vercel)
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Auto-allow any Vercel deployment preview or production URL
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/crawl', async (req, res) => {
  const { url, journeyType = 'ecommerce', useAI = false } = req.body;
  if (!url) {
    return res.status(400).send('URL is required');
  }

  console.log(`[API] Crawl request: url=${url}, journeyType=${journeyType}, useAI=${useAI}`);

  try {
    const results = await crawl(url, { journeyType, useAI });
    res.json(results);
  } catch (error) {
    console.error('Crawl error:', error);
    const errorMessage = error.message || 'An error occurred while crawling the URL.';
    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// AI-powered audit analysis endpoint
app.post('/analyze', async (req, res) => {
  const { requests, vendor } = req.body;

  if (!requests || !Array.isArray(requests)) {
    return res.status(400).json({ error: 'requests array is required' });
  }

  if (!vendor) {
    return res.status(400).json({ error: 'vendor is required (meta, ga4, or gads)' });
  }

  if (!isConfigured()) {
    return res.status(503).json({
      error: 'Anthropic API not configured',
      message: 'Please add your ANTHROPIC_API_KEY to the .env file'
    });
  }

  try {
    console.log(`[Analyze] Starting AI analysis for ${requests.length} ${vendor} requests`);
    const auditReport = await analyzeTrackingRequests(requests, vendor);
    console.log(`[Analyze] Analysis complete for ${vendor}`);
    res.json(auditReport);
  } catch (error) {
    console.error('[Analyze] Error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/results', (req, res) => {
  res.sendFile(__dirname + '/results.html');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

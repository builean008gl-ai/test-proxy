// File: api/proxy.js
// Make sure to create 'package.json' with: { "dependencies": { "node-fetch": "^3.3.2" } }

import fetch from 'node-fetch';

export default async function handler(req, res) {
  // 1. Enable CORS for ALL requests
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning, Authorization');

  // 2. Handle OPTIONS (Browser Preflight)
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 3. Handle GET (Heartbeat test for browser)
  if (req.method === 'GET') {
      return res.status(200).json({ 
          status: 'alive', 
          message: 'Veo Proxy is READY! Go back to the app and use this URL.' 
      });
  }

  // 4. Handle POST (Real proxying)
  if (req.method === 'POST') {
      try {
        const { cookie } = req.body || {};
        if (!cookie) return res.status(400).json({ error: 'Missing cookie in body' });

        const googleRes = await fetch('https://labs.google/api/auth/session', {
          method: 'GET',
          headers: {
            'Cookie': cookie,
            'User-Agent': 'Mozilla/5.0 (compatible; VeoFlowProxy/1.0)'
          }
        });

        const data = await googleRes.json();
        res.status(googleRes.status).json(data);
      } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
      }
      return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}

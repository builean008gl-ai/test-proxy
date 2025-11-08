// api/proxy.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // 1. Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 2. Accept Cookie via POST body (safer than headers for browsers)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const { cookie } = req.body || {};
    if (!cookie) return res.status(400).json({ error: 'Missing cookie in body' });

    // 3. Forward to Google
    const googleRes = await fetch('https://labs.google/api/auth/session', {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (compatible; VeoFlow/1.0)'
      }
    });

    res.status(googleRes.status).json(await googleRes.json());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
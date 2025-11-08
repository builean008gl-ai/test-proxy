// api/proxy.js
export default async function handler(req, res) {
    // 1. Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // 2. Handle Preflight
    if (req.method === 'OPTIONS') return res.status(200).end();

    // 3. Handle Heartbeat
    if (req.method === 'GET') {
        return res.status(200).json({ status: '✅ Proxy Online', msg: 'Ready for POST requests from Veo Studio' });
    }

    // 4. Handle Main Proxy Request
    if (req.method === 'POST') {
        try {
            // Robust body parsing (handles cases where Vercel doesn't auto-parse)
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) {}
            }
            const { cookie } = body || {};

            if (!cookie) return res.status(400).json({ error: 'Missing cookie in request body' });

            // Fetch from Google with realistic headers
            const response = await fetch('https://labs.google/api/auth/session', {
                method: 'GET',
                headers: {
                    'Cookie': cookie,
                    // Use a real browser UA to avoid simple blocking
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://labs.google/fx/vi/tools/flow'
                }
            });

            // Handle non-JSON responses gracefully (prevents 500 crashes)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                return res.status(response.status).json(data);
            } else {
                const text = await response.text();
                console.error('Google returned non-JSON:', text.substring(0, 100));
                return res.status(response.status).json({ 
                    error: 'Google returned unexpected data (likely blocked or login page)', 
                    details: text.substring(0, 200) 
                });
            }
        } catch (error) {
            console.error('Proxy error:', error);
            return res.status(500).json({ error: error.message, type: 'ProxyInternalError' });
        }
    }
    res.status(405).json({ error: 'Method Not Allowed' });
}

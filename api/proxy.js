// api/proxy.js
// NO package.json needed for Vercel Node.js 18+

export default async function handler(req, res) {
    // Setup CORS to allow YOUR web app to call this function
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        return res.status(200).json({ status: '✅ Proxy Online', msg: 'Append /api/proxy to use in Veo Studio' });
    }

    if (req.method === 'POST') {
        try {
            const { cookie } = req.body;
             // Use built-in fetch (Node 18+)
            const response = await fetch('https://labs.google/api/auth/session', {
                method: 'GET',
                headers: {
                    'Cookie': cookie,
                    'User-Agent': 'Mozilla/5.0 (compatible; VeoProxy/1.0)'
                }
            });
            const data = await response.json();
            return res.status(response.status).json(data);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    res.status(405).json({ error: 'Method Not Allowed' });
}

// api/proxy.js
export default async function handler(req, res) {
    // 1. CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. Heartbeat
    if (req.method === 'GET') return res.json({ status: '✅ Online (HTML-Check Mode)' });

    // 3. Proxy Logic (Matching User Script)
    if (req.method === 'POST') {
        try {
            let { cookie } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            if (!cookie) return res.status(400).json({ error: 'Missing cookie' });

            // Target URL from user script
            const URL = "https://labs.google/fx/vi/tools/flow";

            const response = await fetch(URL, {
                method: 'GET',
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                    "Referer": "https://labs.google/fx/vi/tools/flow",
                    "Cookie": cookie
                },
                redirect: 'manual' // Don't auto-follow redirects to login page
            });

            const text = await response.text();
            const lowerText = text.toLowerCase();
            
            // Exact check logic from user script
            const isLoginPage = lowerText.includes('login') || lowerText.includes('sign in');
            // Also check for 302 redirect which often means auth failed
            const isRedirect = response.status === 302 || response.status === 307;

            if (!response.ok || isLoginPage || isRedirect) {
                 return res.status(401).json({ 
                     error: 'Authentication Failed', 
                     details: isRedirect ? 'Redirected (likely to login)' : 'Page contains "login"/"sign in"'
                 });
            }

            // Success! Extract meaningful data if possible, or just confirm success.
            return res.status(200).json({ 
                user: { email: 'Authorized User' }, // Mock user since we just checked HTML
                expires: 'Active Session'
            });

        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    res.status(405).json({ error: 'Method Not Allowed' });
}

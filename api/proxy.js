// api/proxy.js
export default async function handler(req, res) {
    // 1. CORS setup
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. Heartbeat check
    if (req.method === 'GET') return res.json({ status: '✅ Online (Exact-Match Mode)' });

    // 3. Proxy Logic
    if (req.method === 'POST') {
        try {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) {}
            }
            const { cookie } = body || {};
            if (!cookie) return res.status(400).json({ error: 'Missing cookie' });

            const URL = "https://labs.google/fx/vi/tools/flow";

            // Exact headers from your working local script
            const headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
                "Referer": "https://labs.google/fx/vi/tools/flow",
                "Cookie": cookie
            };

            const response = await fetch(URL, {
                method: 'GET',
                headers: headers,
                redirect: 'manual' // Important: Don't follow redirects to login page automatically
            });

            console.log("Proxy got status:", response.status);

            // If it's a redirect (302/303/307) it usually means auth failed and it's sending us to login
            if (response.status >= 300 && response.status < 400) {
                 return res.status(401).json({ error: 'Session Invalid (Redirected)' });
            }

            if (!response.ok) {
                 return res.status(response.status).json({ error: 'Google returned error status' });
            }

            const text = await response.text();
            const lowerText = text.toLowerCase();
            // Check for login indicators in the HTML
            if (lowerText.includes('sign in') || lowerText.includes('đăng nhập')) {
                 return res.status(401).json({ error: 'Session Expired (Login detected in HTML)' });
            }

            // If we got here, we are likely logged in
            return res.status(200).json({ 
                success: true,
                status: response.status,
                message: "Authenticated successfully"
            });

        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    res.status(405).json({ error: 'Method Not Allowed' });
}

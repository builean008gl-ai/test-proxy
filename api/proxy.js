// api/proxy.js
export default async function handler(req, res) {
    // 1. CORS setup
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. Heartbeat check
    if (req.method === 'GET') return res.json({ status: '✅ Online (Advanced Mode)' });

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

            // Full browser headers to mimic a real user and bypass 401 checks from cloud IPs
            const response = await fetch(URL, {
                method: 'GET',
                headers: {
                    "Host": "labs.google",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://labs.google/",
                    "Upgrade-Insecure-Requests": "1",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-User": "?1",
                    "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"Windows"',
                    "Cookie": cookie
                },
                redirect: 'manual'
            });

            const text = await response.text();
            const lowerText = text.toLowerCase();
            const isLoginPage = lowerText.includes('login') || lowerText.includes('sign in') || lowerText.includes('signin');
            const isRedirect = response.status >= 300 && response.status < 400;

            if (!response.ok || isLoginPage || isRedirect) {
                 console.log("Proxy Auth Failed:", response.status, isRedirect ? "Redirected" : "Login Page Detected");
                 return res.status(401).json({ 
                     error: 'Authentication Failed', 
                     details: isRedirect ? 'Redirected (likely to login)' : 'Page content indicates login required'
                 });
            }

            return res.status(200).json({ 
                user: { email: 'Authorized User' },
                expires: 'Active Session',
                status: response.status
            });

        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    res.status(405).json({ error: 'Method Not Allowed' });
}

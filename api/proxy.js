// api/proxy.js
// STRICT Residential Mode: Forces traffic through your proxy if provided.

export default async function handler(req, res) {
    // Enable CORS for your Web App
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') return res.status(200).json({ status: '✅ Proxy Online' });

    if (req.method === 'POST') {
        try {
            const { cookie, residentialProxy } = req.body || {};
            if (!cookie) return res.status(400).json({ error: 'Missing cookie' });

            const targetURL = "https://labs.google/fx/vi/tools/flow";
            
            // HEADERS identical to a real Chrome browser
            const headers = {
                "Host": "labs.google",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
                "Referer": "https://labs.google/",
                "Cookie": cookie,
                "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
                "Cache-Control": "max-age=0",
                "Connection": "keep-alive"
            };

            // Load dependencies securely
            let fetch, HttpsProxyAgent;
            try { fetch = require('node-fetch'); } catch (e) { /* ignore */ }
            try { HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent; } catch (e) { /* ignore */ }

            const doFetch = fetch || global.fetch;
            let agent = undefined;

            // STRICT RESIDENTIAL PROXY SETUP
            if (residentialProxy) {
                if (!HttpsProxyAgent) {
                    return res.status(500).json({ error: 'Missing dependency', details: 'Please add "https-proxy-agent" to package.json on Vercel.' });
                }
                try {
                    // Handle various formats: IP:Port:User:Pass OR http://User:Pass@IP:Port
                    let proxyUrl = residentialProxy.trim();
                    if (!proxyUrl.startsWith('http')) {
                         const parts = proxyUrl.split(':');
                         if (parts.length === 4) {
                             // Format: IP:PORT:USER:PASS -> http://USER:PASS@IP:PORT
                             proxyUrl = `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`;
                         } else if (parts.length === 2) {
                             // Format: IP:PORT -> http://IP:PORT
                             proxyUrl = `http://${parts[0]}:${parts[1]}`;
                         }
                    }
                    console.log("Connecting via Residential Proxy...");
                    agent = new HttpsProxyAgent(proxyUrl);
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid Proxy Format', details: e.message });
                }
            } else {
                 console.log("⚠️ Warning: Using Vercel IP (High chance of 401 Block)");
            }

            // EXECUTE REQUEST
            // If agent is set, node-fetch WILL use it. If it fails, it throws an error (good).
            const response = await doFetch(targetURL, { 
                method: 'GET', 
                headers, 
                agent, // Important: undefined if no proxy, properly set if proxy exists
                redirect: 'follow',
                timeout: 30000 // 30s timeout for slow residential proxies
            });

            const text = await response.text();
            const lowerText = text.toLowerCase();
            
            // Check for login redirects (Google's way of saying "Token Invalid" or "Blocked")
            const isLoginPage = lowerText.includes('signin/v2/identifier') || 
                                lowerText.includes('accounts.google.com') ||
                                (lowerText.includes('sign in') && lowerText.includes('google'));

            if (response.status === 403 || response.status === 401 || isLoginPage) {
                 console.log("❌ Blocked by Google (401/Login Redirect)");
                 return res.status(401).json({ 
                     error: 'Session refused. Your Residential Proxy might be detected or the cookie is expired.',
                     details: isLoginPage ? 'Redirected to Login Page' : `Status ${response.status}`
                 });
            }

            return res.status(200).json({ success: true, message: "Authenticated successfully via Proxy" });

        } catch (error) {
            console.error("🔥 Proxy Connection Failed:", error.message);
            return res.status(502).json({ 
                error: 'Proxy Connection Failed', 
                details: error.message.includes('timeout') ? 'Residential Proxy timed out (too slow)' : error.message 
            });
        }
    }
    res.status(405).json({ error: 'Method Not Allowed' });
}

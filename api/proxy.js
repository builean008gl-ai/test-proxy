// api/proxy.js
// Ultimate Hybrid Version (Supports optional Residential Proxy & Advanced Headers)

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') return res.status(200).json({ status: '✅ Online', mode: 'Hybrid' });

    if (req.method === 'POST') {
        try {
            const { cookie, residentialProxy } = req.body || {};
            if (!cookie) return res.status(400).json({ error: 'Missing cookie' });

            const targetURL = "https://labs.google/fx/vi/tools/flow";
            
            // FULL CHROME HEADERS mimicking a real navigation request
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

            let response;
            // Dynamic require for optional dependencies
            let fetch, HttpsProxyAgent;
            try { fetch = require('node-fetch'); } catch (e) { /* ignore, might use global fetch if node 18 */ }
            try { HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent; } catch (e) { /* ignore */ }

            // Use global fetch if node-fetch not found (basic mode fallback)
            const doFetch = fetch || global.fetch;

            if (residentialProxy && HttpsProxyAgent) {
                // --- ADVANCED MODE ---
                try {
                    let proxyUrl = residentialProxy;
                    if (!residentialProxy.startsWith('http')) {
                         const parts = residentialProxy.trim().split(':');
                         if (parts.length === 4) proxyUrl = `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`;
                    }
                    const agent = new HttpsProxyAgent(proxyUrl);
                    console.log("Using Residential Proxy...");
                    response = await doFetch(targetURL, { method: 'GET', headers, agent, redirect: 'follow', timeout: 25000 });
                } catch (e) {
                    return res.status(500).json({ error: 'Residential Proxy Failed', details: e.message });
                }
            } else {
                // --- BASIC VERCEL MODE ---
                console.log("Using Vercel Direct IP...");
                response = await doFetch(targetURL, { method: 'GET', headers, redirect: 'follow' });
            }

            const text = await response.text();
            const lowerText = text.toLowerCase();
            
            // Robust check for login page indicators
            const isLoginPage = lowerText.includes('signin/v2/identifier') || 
                                lowerText.includes('accounts.google.com') ||
                                (lowerText.includes('sign in') && lowerText.includes('google'));

            if (response.status === 403 || response.status === 401 || isLoginPage) {
                 console.log("Blocked or Redirected to Login");
                 return res.status(401).json({ 
                     error: 'Session refused by Google (IP mismatch or expired). Try a Residential Proxy matching your cookie location.' 
                 });
            }

            return res.status(200).json({ success: true, message: "Authenticated successfully" });

        } catch (error) {
            console.error("Proxy error:", error);
            return res.status(500).json({ error: error.message });
        }
    }
    res.status(405).json({ error: 'Method Not Allowed' });
}

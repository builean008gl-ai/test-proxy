// api/proxy.js
// Node.js 18+ Native Fetch Version

export default async function handler(req, res) {
    // 1. CORS setup
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Health check
    if (req.method === 'GET') return res.status(200).json({ status: '✅ Online', mode: 'Hybrid' });

    if (req.method === 'POST') {
        try {
            const { cookie, residentialProxy } = req.body || {};
            if (!cookie) return res.status(400).json({ error: 'Missing cookie' });

            const targetURL = "https://labs.google/fx/vi/tools/flow";
            // Headers mimicking a real browser to avoid 401/403
            const headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://labs.google/",
                "Cookie": cookie,
                "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Upgrade-Insecure-Requests": "1"
            };

            let response;
            if (residentialProxy) {
                // --- ADVANCED MODE: Residential Proxy (Requires package.json) ---
                try {
                    // Dynamic require to avoid crashing if dependencies are missing in basic mode
                    const fetch = require('node-fetch');
                    const { HttpsProxyAgent } = require('https-proxy-agent');

                    // Parse IP:Port:User:Pass format if necessary
                    let proxyUrl = residentialProxy;
                    if (!residentialProxy.startsWith('http')) {
                         const parts = residentialProxy.trim().split(':');
                         if (parts.length === 4) {
                             proxyUrl = `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`;
                         }
                    }
                    
                    const agent = new HttpsProxyAgent(proxyUrl);
                    console.log("Attempting with Residential Proxy...");
                    response = await fetch(targetURL, { 
                        method: 'GET', 
                        headers, 
                        agent, 
                        redirect: 'manual',
                        timeout: 15000
                    });
                } catch (e) {
                    console.error("Residential proxy error:", e);
                    return res.status(500).json({ 
                        error: 'Residential Proxy failed. Ensure package.json is deployed.', 
                        details: e.message 
                    });
                }
            } else {
                // --- BASIC MODE: Native Fetch (No dependencies needed on Node 18+) ---
                console.log("Attempting with Direct Vercel IP...");
                response = await fetch(targetURL, {
                    method: 'GET',
                    headers,
                    redirect: 'manual'
                });
            }

            console.log("Google Status:", response.status);

            if (response.status === 403 || response.status === 401) {
                 return res.status(401).json({ error: 'Google blocked Vercel IP (401/403). Please use a Residential Proxy.' });
            }

            if (response.status >= 300 && response.status < 400) {
                 // Redirect usually means auth failed and is going to /login
                 return res.status(401).json({ error: 'Session invalid (Redirected by Google)' });
            }

            const text = await response.text();
            // Check for common login indicators in English and Vietnamese
            const lowerText = text.toLowerCase();
            if (lowerText.includes('sign in') || lowerText.includes('đăng nhập') || lowerText.includes('continue with google')) {
                 return res.status(401).json({ error: 'Session expired (Login page detected)' });
            }

            return res.status(200).json({ success: true, message: "Authenticated successfully" });

        } catch (error) {
            console.error("Proxy internal error:", error);
            return res.status(500).json({ error: error.message, details: "Check Vercel Logs" });
        }
    }
    res.status(405).json({ error: 'Method Not Allowed' });
}

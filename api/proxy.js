// api/proxy.js
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

export default async function handler(req, res) {
    // 1. CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') return res.json({ status: '✅ Online (Residential-Ready)' });

    if (req.method === 'POST') {
        try {
            const { cookie, residentialProxy } = req.body || {};
            if (!cookie) return res.status(400).json({ error: 'Missing cookie' });

            const URL = "https://labs.google/fx/vi/tools/flow";
            const headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
                "Referer": "https://labs.google/fx/vi/tools/flow",
                "Cookie": cookie
            };

            // 2. Configure Agent if Residential Proxy is provided
            let agent = undefined;
            if (residentialProxy) {
                // Format: IP:Port:User:Pass -> http://User:Pass@IP:Port
                try {
                    const parts = residentialProxy.trim().split(':');
                    if (parts.length === 4) {
                        const [ip, port, user, pass] = parts;
                        const proxyUrl = `http://${user}:${pass}@${ip}:${port}`;
                        agent = new HttpsProxyAgent(proxyUrl);
                        console.log("Using residential proxy:", ip);
                    } else if (residentialProxy.startsWith('http')) {
                         agent = new HttpsProxyAgent(residentialProxy);
                    }
                } catch (e) {
                    console.error("Invalid residential proxy format", e);
                     return res.status(400).json({ error: 'Invalid Residential Proxy Format' });
                }
            }

            // 3. Fetch with (or without) agent
            const response = await fetch(URL, {
                method: 'GET',
                headers: headers,
                redirect: 'manual',
                agent: agent // Use the chained proxy agent if validated
            });

            console.log("Google status:", response.status);

            if (response.status >= 300 && response.status < 400) {
                 return res.status(401).json({ error: 'Session Invalid (Redirected to login)' });
            }

            if (!response.ok) {
                 return res.status(response.status).json({ error: `Google returned status ${response.status}` });
            }

            const text = await response.text();
            if (text.toLowerCase().includes('sign in') || text.toLowerCase().includes('đăng nhập')) {
                 return res.status(401).json({ error: 'Session Expired (Login detected in HTML)' });
            }

            return res.status(200).json({ success: true, message: "Authenticated via Proxy" });

        } catch (error) {
            return res.status(500).json({ error: error.message, details: 'Proxy connection failed' });
        }
    }
    res.status(405).json({ error: 'Method Not Allowed' });
}

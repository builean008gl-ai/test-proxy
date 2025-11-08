// api/proxy.js
// KHÔNG CẦN package.json. Vercel tự hỗ trợ fetch.

export default async function handler(req, res) {
    // Cấu hình CORS để Web App gọi được
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Xử lý preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Test nhanh trên trình duyệt xem proxy sống chưa
    if (req.method === 'GET') {
        return res.status(200).json({
            status: '✅ Proxy Online',
            message: 'Copy URL này dán vào Veo Flow Studio, thêm đuôi /api/proxy'
        });
    }

    // Xử lý chính: Gọi sang Google Labs
    if (req.method === 'POST') {
        try {
            const { cookie } = req.body;
            // Dùng fetch mặc định của Node.js 18+
            const response = await fetch('https://labs.google/api/auth/session', {
                method: 'GET',
                headers: {
                    'Cookie': cookie,
                    'User-Agent': 'Mozilla/5.0 (compatible; VeoProxy/2.0)'
                }
            });

            const data = await response.json();
            return res.status(response.status).json(data);
        } catch (error) {
            return res.status(500).json({ error: error.message, details: 'Proxy fetch failed' });
        }
    }

    res.status(405).json({ error: 'Method Not Allowed' });
}

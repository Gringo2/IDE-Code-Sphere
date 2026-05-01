const http = require('http');

const PORT = 8080;

const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'POST' && req.url === '/chat') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const data = JSON.parse(body);
            console.log(`[Daemon] Received chat request: ${data.text}`);
            
            // Return a simple response
            res.writeHead(200);
            res.end(JSON.stringify({
                id: Math.random().toString(36).substring(7),
                response: `[Native Daemon] Received your message: ${data.text}`
            }));
        });
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`CodeSphere Native AI Daemon stub running on http://localhost:${PORT}`);
});

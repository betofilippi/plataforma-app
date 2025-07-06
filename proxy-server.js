const http = require('http');
const https = require('https');
const url = require('url');

const API_BASE = 'https://erp-api-clean-r88y1fdz9-nxt-9032fd74.vercel.app';
const PORT = 3001;

const server = http.createServer((req, res) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Proxy para API
    const apiUrl = API_BASE + req.url;
    const parsedUrl = url.parse(apiUrl);
    
    console.log(`Proxying to: ${apiUrl}`);
    
    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.path,
        method: req.method,
        headers: {
            ...req.headers,
            host: parsedUrl.hostname
        }
    };
    
    delete options.headers['host'];
    
    const proxyReq = https.request(options, (proxyRes) => {
        console.log(`API Response: ${proxyRes.statusCode}`);
        
        // Copiar headers da resposta
        Object.keys(proxyRes.headers).forEach(key => {
            res.setHeader(key, proxyRes.headers[key]);
        });
        
        // Manter CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        res.writeHead(proxyRes.statusCode);
        proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
        console.error('Proxy Error:', err.message);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
            success: false,
            error: 'PROXY_ERROR',
            message: err.message
        }));
    });
    
    // Pipe request body
    req.pipe(proxyReq);
});

server.listen(PORT, () => {
    console.log('🚀 Proxy Server rodando!');
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`🎯 Proxy para: ${API_BASE}`);
    console.log('');
    console.log('✅ Use este URL no frontend:');
    console.log(`   const API_URL = 'http://localhost:${PORT}'`);
    console.log('');
    console.log('🔧 Teste:');
    console.log(`   curl http://localhost:${PORT}/health`);
});

server.on('error', (err) => {
    console.error('Server Error:', err.message);
});
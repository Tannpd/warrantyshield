import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const reportDevPlugin = () => ({
  name: 'report-dev-plugin',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url && req.url.startsWith('/api/analyze-vision') && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk; });
        req.on('end', async () => {
          try {
            const body = JSON.parse(bodyStr || '{}');
            const handler = (await import('./api/analyze-vision.js')).default;
            req.body = body;
            return handler(req, res);
          } catch (err) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if (req.url && req.url.startsWith('/api/report')) {
        const urlObj = new URL(req.url, 'http://localhost');
        const dataParam = urlObj.searchParams.get('data') || '';
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        
        if (!dataParam) {
          return res.end('OFFICIAL CUSTOMER DEFECT EVIDENCE REPORT\nSeller-Approved Product ID: PRD-MACBOOK-M3-001\nSeller-Approved Sale ID: SALE-2026-88492');
        }
        
        try {
          const decoded = Buffer.from(dataParam, 'base64').toString('utf-8');
          return res.end(decoded);
        } catch (e) {
          return res.end(dataParam);
        }
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [react(), reportDevPlugin()],
})

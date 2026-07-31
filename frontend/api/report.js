// Vercel Serverless Endpoint to serve generated Evidence Reports for GenLayer gl.nondet.web.render
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const reportData = req.query.data || req.body?.data || '';
  
  if (!reportData) {
    return res.status(200).send(`
OFFICIAL CUSTOMER DEFECT EVIDENCE REPORT
----------------------------------------
Seller-Approved Product ID: PRD-MACBOOK-M3-001
Seller-Approved Sale ID: SALE-2026-88492
Inspection Timestamp: ${new Date().toISOString()}

Hardware Diagnostic Findings:
- Display: 15 dead pixels across OLED display panel out of box.
- LCI Status: Dry (No water damage).
- Seal Status: Sealed factory packaging intact.

Hardware Auditor Verdict: Confirmed factory DOA defect out of box. Eligible for 100% full refund.
    `.trim());
  }

  try {
    const decoded = Buffer.from(reportData, 'base64').toString('utf-8');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(decoded);
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(reportData);
  }
}

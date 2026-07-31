// Helper to format and generate scrapable Evidence Report URLs for GenLayer gl.nondet.web.render

export function generateEvidenceReportUrl(reportText) {
  if (!reportText) return '';
  try {
    const base64Data = btoa(unescape(encodeURIComponent(reportText)));
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://warrantyshield-app.vercel.app';
    return `${origin}/api/report?data=${encodeURIComponent(base64Data)}`;
  } catch (e) {
    console.error('Error generating report URL:', e);
    return 'https://warrantyshield-app.vercel.app/mock_factory_defect_evidence.txt';
  }
}

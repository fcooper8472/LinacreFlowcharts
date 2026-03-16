#!/usr/bin/env node
// Usage: node render-pdf.js input.svg output.pdf [scale]

const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  if (process.argv.length < 4) {
    console.error('Usage: node render-pdf.js input.svg output.pdf [scale]');
    process.exit(2);
  }

  const svgPath = process.argv[2];
  const pdfPath = process.argv[3];
  const scale = Number(process.argv[4] || 1);

  const svg = fs.readFileSync(svgPath, 'utf8');
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';

  const browser = await puppeteer.launch({
    ...(fs.existsSync(executablePath) ? { executablePath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"/><style>html,body{margin:0}@page{margin:0}svg{display:block}</style></head><body>${svg}</body></html>`, { waitUntil: 'networkidle0' });

  await page.evaluateHandle('document.fonts ? document.fonts.ready : Promise.resolve()');

  const bbox = await page.evaluate(() => {
    const s = document.querySelector('svg');
    if (!s) return { width: 0, height: 0 };
    try { const b = s.getBBox(); if (b.width && b.height) return { width: b.width, height: b.height }; } catch (e) {}
    const r = s.getBoundingClientRect(); return { width: r.width, height: r.height };
  });

  const width = Math.max(1, Math.ceil(bbox.width * scale));
  const height = Math.max(1, Math.ceil(bbox.height * scale));

  await page.setViewport({ width, height });
  await page.pdf({ path: pdfPath, width: `${width}px`, height: `${height}px`, printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true });

  await browser.close();
  console.log(`Wrote PDF: ${pdfPath} (${width}x${height}px)`);
})();

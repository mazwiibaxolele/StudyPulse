import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  console.log("Navigating to app...");
  const response = await page.goto('https://study-pulseo.vercel.app', { waitUntil: 'networkidle0' });
  
  console.log("Status:", response.status());
  
  await browser.close();
})();

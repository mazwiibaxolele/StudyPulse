import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  console.log("Navigating to auth page...");
  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle0' });
  
  console.log("Switching to Sign Up...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const signupBtn = btns.find(b => b.textContent.includes('Sign Up'));
    if (signupBtn) signupBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  const email = 'test' + Date.now() + '@example.com';
  console.log("Filling form with", email);
  
  await page.type('input[placeholder="Enter your name"]', 'Test User');
  await page.type('input[type="email"]', email);
  
  const passInputs = await page.$$('input[type="password"]');
  await passInputs[0].type('Password123!');
  await passInputs[1].type('Password123!');
  
  console.log("Submitting...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => b.textContent.includes('Create Account') || b.textContent.includes('Sign Up'));
    if (submitBtn) submitBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 4000));
  
  console.log("Current URL:", page.url());
  
  const formError = await page.evaluate(() => {
    const p = document.querySelector('.auth-error');
    return p ? p.textContent : null;
  });
  if (formError) console.log("Form Error:", formError);
  
  await browser.close();
})();

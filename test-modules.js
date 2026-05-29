import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  
  console.log("Navigating to auth page...");
  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle0' });
  
  const email = 'test' + Date.now() + '@example.com';
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const signupBtn = btns.find(b => b.textContent.includes('Sign Up'));
    if (signupBtn) signupBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  await page.type('input[placeholder="Enter your name"]', 'Test User');
  await page.type('input[type="email"]', email);
  
  const passInputs = await page.$$('input[type="password"]');
  await passInputs[0].type('Password123!');
  await passInputs[1].type('Password123!');
  
  console.log("Submitting sign up...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => b.textContent.includes('Create Account'));
    if (submitBtn) submitBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 4000));
  console.log("Navigating to Modules...");
  await page.goto('http://localhost:5173/modules', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Clicking Add Module...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addBtn = btns.find(b => b.textContent.includes('Add Module'));
    if (addBtn) addBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  await page.type('input[placeholder="e.g. Introduction to Psychology"]', 'Test Module');
  
  console.log("Saving Module...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const saveBtn = btns.find(b => b.textContent.includes('Save Module'));
    if (saveBtn) saveBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();

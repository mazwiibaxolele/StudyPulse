import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  console.log("Navigating to auth page...");
  await page.goto('https://study-pulseo.vercel.app/auth', { waitUntil: 'networkidle0' });
  
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
  
  if (page.url().includes('dashboard') || page.url().includes('modules') || formError?.includes('check email') || formError?.includes('Account created')) {
    console.log("Successfully signed up!");
    
    // Switch to sign in just in case we are not auto-logged in
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const signinBtn = btns.find(b => b.textContent === 'Sign In');
      if (signinBtn) signinBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    await page.evaluate(() => {
      document.querySelector('input[type="email"]').value = '';
      const pass = document.querySelector('input[type="password"]');
      if (pass) pass.value = '';
    });
    
    await page.type('input[type="email"]', email);
    await page.type('input[type="password"]', 'Password123!');
    
    console.log("Clicking Sign In...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button.auth-submit'));
      if (btns[0]) btns[0].click();
    });
    
    await new Promise(r => setTimeout(r, 3000));
    console.log("Post-login URL:", page.url());
    
    console.log("Navigating to /coach...");
    await page.goto('https://study-pulseo.vercel.app/coach', { waitUntil: 'networkidle0' });
    
    console.log("Checking if AI is ready...");
    const isAiReady = await page.evaluate(() => {
      const btn = document.querySelector('.coach-suggestion');
      return btn && !btn.disabled;
    });
    console.log("AI Ready?", isAiReady);
    
    if (isAiReady) {
      console.log("Clicking suggestion...");
      await page.evaluate(() => {
        document.querySelector('.coach-suggestion').click();
      });
      await new Promise(r => setTimeout(r, 5000));
      
      const errorText = await page.evaluate(() => {
        const err = document.querySelector('.coach-error span');
        return err ? err.textContent : null;
      });
      console.log("Error Banner:", errorText);
      
      const chatMessages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.coach-message__content')).map(m => m.textContent);
      });
      console.log("Chat messages:", chatMessages);
    }
  } else {
    console.log("Failed to log in.");
  }
  
  await browser.close();
})();

const { chromium } = require('playwright');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  await page.goto('https://tail-star-map.vercel.app/', {waitUntil:'networkidle',timeout:60000});
  await page.screenshot({path:'assets/projects/tail-star-map-live.png',fullPage:true});
  console.log((await page.locator('body').innerText()).slice(0,14000));
  fs.writeFileSync('docs/tail-live-inspection.json', JSON.stringify({url:page.url(),capturedAt:new Date().toISOString(),title:await page.title(),text:await page.locator('body').innerText()},null,2));
  await browser.close();
})();

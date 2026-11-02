const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const results=[];
const sourceData=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const total=sourceData.pages.length;
const pageNumber=id=>String(sourceData.pages.findIndex(p=>p.id===id)+1).padStart(2,'0');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
const check=async(name,fn)=>{await fn();results.push({name,status:'passed'});console.log('PASS '+name);};
(async()=>{
  const browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await check('HTTP and private source exclusions',async()=>{
    assert.equal((await page.request.get(base)).status(),200);
    for(const route of ['/README.md','/docs/SOURCES.md','/package.json','/../DESIGN.md','/장미선의_이력서_및_자기소개.pdf'])assert.equal((await page.request.get(base+route)).status(),404);
  });
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('.slide-cover.active').waitFor();
  await check('Page navigation, boundaries, keyboard and progress',async()=>{
    assert.equal(await page.locator('.toc-link').count(),sourceData.pages.filter(p=>!['cover','contact'].includes(p.kind)).length);
    assert.equal(await page.locator('.slide:visible').count(),total);
    assert.equal(await page.locator('#previous').isDisabled(),true);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#current-page').innerText(),'02');
    assert.equal(await page.locator('.progress').getAttribute('aria-valuenow'),String(Math.round(2/total*100)));
    await page.locator('#next').click();
    assert.equal(await page.locator('#current-page').innerText(),'03');
    await page.locator('.sidebar-bottom a[href="#contact"]').click();
    assert.equal(await page.locator('#next').isDisabled(),true);
    assert.equal(await page.locator('.progress').getAttribute('aria-valuenow'),'100');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#current-page').innerText(),String(total).padStart(2,'0'));
    await page.locator('.toc-link[href="#career"]').click();
    await page.locator('.earlier summary').click();
    assert.equal(await page.locator('.earlier-row:visible').count(),5);
  });
  await check('All desktop pages, font minimum and horizontal fit',async()=>{
    for(const size of [{width:1024,height:768},{width:1440,height:1000},{width:1920,height:1080}]){
      await page.setViewportSize(size);
      for(const link of await page.locator('.toc-link').all()){
        await link.click();
        const issues=await page.evaluate(()=>{
          const section=document.querySelector('.slide.active');
          const small=[...section.querySelectorAll('*')].filter(el=>!el.closest('.portfolio-copyright,.page-eyebrow,.overview-label,.project-number,.contact-panel-label')&&el.textContent.trim()&&el.getClientRects().length&&parseFloat(getComputedStyle(el).fontSize)<16).map(el=>el.className);
          return {small,overflow:document.documentElement.scrollWidth>innerWidth,contentOverflow:section.scrollWidth>section.clientWidth+1};
        });
        assert.deepEqual(issues,{small:[],overflow:false,contentOverflow:false},JSON.stringify({size,link:await link.textContent(),issues}));
      }
    }
  });
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('.sidebar-name').click();
  await page.waitForTimeout(250);
  await page.screenshot({path:path.join(root,'test-results/desktop-cover.png')});
  await page.locator('.toc-link[href="#safenet-print"]').click();
  await page.waitForTimeout(250);
  await page.screenshot({path:path.join(root,'test-results/desktop-work.png')});
  await check('Actual site screenshot, dialog, scroll, Escape and focus restoration',async()=>{
    await page.locator('.toc-link[href="#tail"]').click();
    const trigger=page.locator('#tail [data-zoom]');
    assert.equal(await trigger.count(),1);
    await trigger.click();
    assert.equal(await page.locator('#image-dialog').evaluate(d=>d.open),true);
    await page.locator('#zoom-image').evaluate(img=>img.decode());
    assert.equal(await page.locator('.zoom-scroll').evaluate(el=>el.scrollHeight>el.clientHeight),true);
    await page.locator('.zoom-scroll').evaluate(el=>el.scrollTop=500);
    assert.ok(await page.locator('.zoom-scroll').evaluate(el=>el.scrollTop)>0);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#current-page').innerText(),pageNumber('tail'));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#image-dialog').evaluate(d=>d.open),false);
    assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
    await trigger.click();
    await page.locator('#close-dialog').click();
    assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
  });
  await page.screenshot({path:path.join(root,'test-results/desktop-project.png')});
  await check('Original 27436px work image and responsive project captures',async()=>{
    await page.locator('.toc-link[href="#rtm-online"]').click();
    const trigger=page.locator('#rtm-online [data-zoom]');
    await trigger.click();
    await page.locator('#zoom-image').evaluate(img=>img.decode());
    assert.equal(await page.locator('#zoom-image').evaluate(img=>img.naturalHeight),27436);
    await page.locator('.zoom-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
    assert.ok(await page.locator('.zoom-scroll').evaluate(el=>el.scrollTop)>1000);
    await page.keyboard.press('Escape');
    assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
    await page.screenshot({path:path.join(root,'test-results/desktop-rtm-detail.png')});
    await page.locator('.toc-link[href="#pulse-responsive"]').click();
    assert.equal(await page.locator('#pulse-responsive [data-zoom]').count(),3);
    await page.screenshot({path:path.join(root,'test-results/desktop-pulse-responsive.png')});
  });
  await check('Local Pretendard, source URLs and actual project PDF responses',async()=>{
    assert.equal(await page.evaluate(()=>document.fonts.check('16px Pretendard')),true);
    assert.ok(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('PretendardVariable.woff2')&&r.decodedBodySize>100000)));
    assert.equal(await page.locator('#tail .project-links a[href^="https:"]').getAttribute('href'),'https://tail-star-map.vercel.app/');
    assert.equal(await page.locator('#pulse .project-links a[href^="https:"]').getAttribute('href'),'https://health-dashboard-pearl-kappa.vercel.app/');
    for(const project of sourceData.projects){
      const pdf=await page.request.get(base+'/'+project.pdf);
      assert.equal(pdf.status(),200);
      assert.equal(pdf.headers()['content-type'],'application/pdf');
      assert.equal((await pdf.body()).subarray(0,4).toString(),'%PDF');
    }
    assert.equal(await page.locator('#intro .contact-panel').count(),0);
    assert.equal(await page.locator('#contact a[href="mailto:wkd7437@naver.com"]').count(),1);
    assert.equal(await page.locator('#contact a[href="tel:01050077746"]').count(),1);
    for(const id of ['contact']){
      const youtube=page.locator('#'+id+' .contact-channel[href^="https://youtube.com/"]');
      assert.equal(await youtube.getAttribute('href'),'https://youtube.com/@haneul-13-34?si=2cSscqpAFY22bGQy');
      assert.equal(await youtube.getAttribute('target'),'_blank');
      assert.ok((await youtube.getAttribute('rel')).includes('noopener'));
    }
  });
  await check('Mobile vertical reading, menu, current position and no overflow',async()=>{
    for(const size of [{width:360,height:800},{width:390,height:844},{width:768,height:1024}]){
      await page.setViewportSize(size);
      await page.goto(base,{waitUntil:'networkidle'});
      assert.equal(await page.locator('.slide:visible').count(),total);
      assert.equal(await page.locator('#contents').isVisible(),false);
      await page.locator('#menu-toggle').click();
      assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'true');
      await page.locator('.toc-link[href="#pulse"]').click();
      await page.waitForTimeout(900);
      assert.equal(await page.locator('#contents').isVisible(),false);
      assert.equal(await page.locator('#current-page').innerText(),pageNumber('pulse'));
      const issues=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,small:[...document.querySelectorAll('.slide *')].filter(el=>!el.closest('.portfolio-copyright,.page-eyebrow,.overview-label,.project-number,.contact-panel-label')&&el.textContent.trim()&&el.getClientRects().length&&parseFloat(getComputedStyle(el).fontSize)<16).map(el=>el.className),wide:[...document.querySelectorAll('.slide')].filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.id)}));
      assert.deepEqual(issues,{overflow:false,small:[],wide:[]},JSON.stringify({size,issues}));
      await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
      await page.waitForTimeout(200);
      assert.equal(await page.locator('#current-page').innerText(),String(total).padStart(2,'0'));
    }
    await page.setViewportSize({width:390,height:844});
    await page.goto(base,{waitUntil:'networkidle'});
    await page.screenshot({path:path.join(root,'test-results/mobile-cover.png')});
    await page.locator('#menu-toggle').click();
    await page.locator('.toc-link[href="#safenet-print"]').click();
    await page.waitForTimeout(900);
    await page.screenshot({path:path.join(root,'test-results/mobile-work.png')});
    await page.locator('#menu-toggle').click();
    await page.locator('.toc-link[href="#tail"]').click();
    await page.locator('#tail [data-zoom]').click();
    await page.locator('#zoom-image').evaluate(img=>img.decode());
    assert.equal(await page.locator('.zoom-scroll').evaluate(el=>el.scrollHeight>el.clientHeight),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.locator('#close-dialog').click();
    assert.equal(await page.locator('#tail [data-zoom]').evaluate(el=>el===document.activeElement),true);
  });
  await check('Reduced motion and direct hash entry',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setViewportSize({width:1440,height:900});
    await page.goto(base+'/#tail',{waitUntil:'networkidle'});
    assert.equal(await page.locator('#current-page').innerText(),pageNumber('tail'));
    assert.equal(await page.locator('#progress-fill').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  });
  await check('Replacement long detail image and unavailable image fallback',async()=>{
    const fixture=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
    fixture.works.find(w=>w.id==='angel-event').image='assets/projects/tail-star-map-live.png';
    fixture.works.find(w=>w.id==='angel-banner').image='assets/works/angel/missing.jpg';
    await page.route('**/data.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(fixture)}));
    await page.goto(base+'/?fixture=works#angel-online',{waitUntil:'networkidle'});
    const trigger=page.locator('#angel-online [data-zoom]');
    assert.equal(await trigger.count(),1);
    await trigger.click();
    await page.locator('#zoom-image').evaluate(img=>img.decode());
    assert.equal(await page.locator('.zoom-scroll').evaluate(el=>el.scrollHeight>el.clientHeight),true);
    await page.keyboard.press('Escape');
    assert.ok((await page.locator('#angel-online .asset-placeholder').innerText()).includes('이미지를 준비 중'));
    await page.unroute('**/data.json');
  });
  assert.deepEqual(errors,[]);
  await browser.close();
  fs.writeFileSync(path.join(root,'test-results/results.json'),JSON.stringify({checkedAt:new Date().toISOString(),base,results,errors},null,2));
  console.log(`Verified ${results.length} groups. Artifacts: test-results/`);
})().catch(error=>{console.error(error);fs.writeFileSync(path.join(root,'test-results/failure.txt'),String(error.stack));process.exit(1);});

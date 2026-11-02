const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const results=[];
const check=async(name,fn)=>{await fn();results.push(name);console.log('PASS '+name);};
(async()=>{
  const browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const settled=()=>page.waitForFunction(()=>!document.querySelector('#main').hasAttribute('data-scrolling'));
  const state=async id=>{
    const index=data.pages.findIndex(p=>p.id===id);
    assert.equal(await page.locator('.slide.active').getAttribute('id'),id);
    if(['cover','contact'].includes(id))assert.equal(await page.locator('.toc-link[aria-current]').count(),0);
    else assert.equal(await page.locator('.toc-link[aria-current]').getAttribute('href'),'#'+id);
    assert.equal(await page.locator('#current-page').innerText(),String(index+1).padStart(2,'0'));
    assert.equal(await page.locator('#total-pages').innerText(),String(data.pages.length));
    assert.equal(await page.locator('.slide:visible').count(),data.pages.length);
    assert.equal(await page.locator('#previous').isDisabled(),index===0);
    assert.equal(await page.locator('#next').isDisabled(),index===data.pages.length-1);
  };
  const aligned=async id=>{
    const geometry=await page.locator('#'+id).evaluate(section=>{
      const app=document.querySelector('#main');
      return {top:section.getBoundingClientRect().top-app.getBoundingClientRect().top,scroll:app.scrollTop,end:app.scrollTop+app.clientHeight>=app.scrollHeight-2,transform:getComputedStyle(section).transform};
    });
    assert.ok(Math.abs(geometry.top)<2||(id==='contact'&&geometry.end&&geometry.top>=0),JSON.stringify(geometry));
    assert.equal(geometry.transform,'none');
  };
  await page.goto(base,{waitUntil:'networkidle'});
  await check('Sidebar order, counters and uninterrupted section layout',async()=>{
    assert.equal(data.pages[0].id,'cover');assert.equal(data.pages.at(-1).id,'contact');
    assert.equal(await page.locator('.toc-number').count(),0);
    assert.deepEqual(await page.locator('.toc-link').allTextContents(),data.pages.filter(p=>!['cover','contact'].includes(p.kind)).map(p=>p.title));
    assert.deepEqual(await page.locator('.nav-group').allTextContents(),['PROFILE','EXPERIENCE','PROJECTS']);
    await state('cover');
  });
  await check('Menu click scrolls real content with acceleration and deceleration',async()=>{
    const samples=await page.evaluate(()=>new Promise(resolve=>{
      const main=document.querySelector('#main'),samples=[];
      const start=performance.now();
      document.querySelector('.toc-link[href="#profile"]').click();
      const record=now=>{
        samples.push({time:now-start,y:main.scrollTop});
        if(main.hasAttribute('data-scrolling'))requestAnimationFrame(record);else resolve(samples);
      };
      requestAnimationFrame(record);
    }));
    assert.ok(samples.length>8);
    const first=samples[0].y,last=samples.at(-1).y;
    assert.ok(last-first>300);
    assert.ok(samples.some(s=>s.y>first+5&&s.y<last-5));
    const slopes=samples.slice(1).map((s,i)=>({time:s.time,velocity:(s.y-samples[i].y)/(s.time-samples[i].time)}));
    const duration=samples.at(-1).time;
    const mean=part=>part.reduce((sum,s)=>sum+s.velocity,0)/part.length;
    const start=mean(slopes.filter(s=>s.time<duration*.2));
    const middle=mean(slopes.filter(s=>s.time>duration*.4&&s.time<duration*.6));
    const end=mean(slopes.filter(s=>s.time>duration*.85));
    assert.ok(middle>start*2&&middle>end*2,JSON.stringify({start,middle,end}));
    assert.ok(duration>=400&&duration<1500);
    await state('profile');await aligned('profile');
    fs.writeFileSync(path.join(root,'test-results/scroll-samples.json'),JSON.stringify(samples,null,2));
  });
  await check('Long menu jumps, reverse movement, buttons and arrow keys',async()=>{
    await page.locator('.sidebar-bottom a[href="#contact"]').click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#main').getAttribute('data-scrolling'),'true');
    await settled();await state('contact');await aligned('contact');
    await page.locator('#previous').click();await settled();await state('pulse-scope');
    await page.keyboard.press('ArrowRight');await settled();await state('contact');
    await page.locator('.sidebar-about').click();await settled();await state('intro');await aligned('intro');
    await page.keyboard.press('ArrowLeft');await settled();await state('cover');
  });
  await check('Rapid replacement navigation follows the latest requested section',async()=>{
    await page.evaluate(()=>{for(let i=0;i<3;i++)document.querySelector('#next').click();for(let i=0;i<2;i++)document.querySelector('#previous').click();});
    await settled();await state(data.pages[1].id);await aligned(data.pages[1].id);
    await page.evaluate(()=>{
      document.querySelector('.sidebar-bottom a[href="#contact"]').click();
      document.querySelector('.toc-link[href="#tail"]').click();
      document.querySelector('.toc-link[href="#career"]').click();
    });
    await settled();await state('career');await aligned('career');
  });
  await check('Wheel interruption stops animation and manual scroll updates navigation',async()=>{
    await page.locator('.sidebar-bottom a[href="#contact"]').click();await page.waitForTimeout(150);
    await page.locator('#main').dispatchEvent('wheel',{deltaY:150});await settled();
    const y=await page.locator('#main').evaluate(el=>el.scrollTop);
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#main').evaluate(el=>el.scrollTop),y);
    await page.locator('#main').evaluate(main=>{
      const section=document.querySelector('#tail');
      main.scrollTop+=section.getBoundingClientRect().top-main.getBoundingClientRect().top;
    });
    await page.waitForFunction(()=>document.querySelector('.slide.active')?.id==='tail');await state('tail');
  });
  await check('Resize and mobile section scrolling preserve state without overflow',async()=>{
    await page.locator('.sidebar-bottom a[href="#contact"]').click();await page.waitForTimeout(100);
    await page.setViewportSize({width:390,height:844});await settled();
    await page.locator('#menu-toggle').click();await page.locator('.mobile-shortcuts a[href="#contact"]').click();
    await page.waitForTimeout(80);assert.equal(await page.locator('#main').getAttribute('data-scrolling'),'true');
    await settled();
    await page.waitForFunction(()=>document.querySelector('.slide.active')?.id==='contact');await state('contact');
    assert.ok(await page.locator('#contact').evaluate(el=>el.getBoundingClientRect().top>=100));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#menu-toggle').click();await page.locator('.mobile-shortcuts [data-back-top]').click();await settled();
    assert.equal(await page.evaluate(()=>scrollY),0);await state('cover');
  });
  await check('Reduced motion and direct hash entry use immediate accurate positioning',async()=>{
    await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('.toc-link[href="#career"]').click();await state('career');await aligned('career');
    assert.equal(await page.locator('#main').getAttribute('data-scrolling'),null);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('.sidebar-bottom a[href="#contact"]').click();await page.emulateMedia({reducedMotion:'reduce'});await settled();await state('contact');await aligned('contact');
    await page.goto(base+'/?entry=scroll#pulse-responsive',{waitUntil:'networkidle'});await state('pulse-responsive');await aligned('pulse-responsive');
  });
  assert.deepEqual(errors,[]);await browser.close();
  fs.writeFileSync(path.join(root,'test-results/scrolling.json'),JSON.stringify({checkedAt:new Date().toISOString(),results,errors},null,2));
})().catch(error=>{console.error(error);process.exit(1);});

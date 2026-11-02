const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
assert.ok(data.pages.length>0);
assert.equal(data.pages[0].kind,'cover');
assert.ok(data.pages.some(p=>p.kind==='intro'));
assert.equal(data.pages.at(-1).kind,'contact');
for(const collection of ['pages','works','companies','projects'])assert.equal(new Set(data[collection].map(x=>x.id)).size,data[collection].length,`Duplicate ${collection} id`);
const asset=p=>{assert.match(p,/^assets\//);assert.ok(!p.includes('..'));assert.ok(fs.existsSync(path.join(root,p)),`Missing ${p}`);};
asset(data.coverPage.photo);
for(const work of data.works){for(const k of ['id','name','type','purpose','role','filename','description','required'])assert.ok(work[k],`${work.id}: ${k}`);assert.ok(!work.company||data.companies.some(c=>c.id===work.company));for(const k of ['image','preview'])if(work[k])asset(work[k]);}
for(const p of data.projects){for(const k of ['image','pdf'])if(p[k])asset(p[k]);if(p.url)assert.equal(new URL(p.url).protocol,'https:');}
for(const p of data.pages){if(p.company)assert.ok(data.companies.some(c=>c.id===p.company));if(p.project)assert.ok(data.projects.some(c=>c.id===p.project));for(const id of p.workIds||[])assert.ok(data.works.some(w=>w.id===id));}
assert.ok(fs.statSync(path.join(root,'assets/fonts/PretendardVariable.woff2')).size>100000);
const published=JSON.stringify(data);
assert.ok(!/[?]{2,}|\uFFFD/.test(published),'Content encoding corruption detected');
for(const secret of ['1989','성북구','4,000만원','3,600만원','총괄','121건','현업 기자'])assert.ok(!published.includes(secret),`Unexpected original/private content: ${secret}`);
for(const name of fs.readdirSync(path.join(root,'assets/documents')))assert.ok(!/이력서|resume/i.test(name),'Resume must not be published');
console.log(`PASS: ${data.pages.length} pages, content references, assets, local font, and publication exclusions`);

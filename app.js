const $ = (selector, root = document) => root.querySelector(selector);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = escapeHTML;
const pad = n => String(n).padStart(2, '0');
const safeAsset = path => typeof path === 'string' && /^assets\/[a-zA-Z0-9_./-]+$/.test(path) && !path.includes('..') ? path : null;
const safeURL = url => { try { const u = new URL(url); return u.protocol === 'https:' ? u.href : null; } catch { return null; } };
const external = (url, label) => safeURL(url) ? `<a class="button" href="${e(safeURL(url))}" target="_blank" rel="noopener noreferrer">${e(label)}</a>` : '';
const app = $('#main');
let data, current = 0, lastImageTrigger;
const mobile = matchMedia('(max-width: 1000px)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const SCROLL_MOTION = { minDuration: 420, maxDuration: 1000, distanceFactor: 6 };
let scrollRun = null, scrollFrame = 0;
const scrollRoot = () => mobile.matches ? window : app;
const scrollPosition = () => mobile.matches ? window.scrollY : app.scrollTop;
function observeCoverName() {
  const name = $('.cover-person-name');
  if (!name) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      name.classList.toggle('is-visible', entry.isIntersecting);
    }
  }, { threshold: 0.6, rootMargin: '0px 0px -80px 0px' });
  observer.observe(name);
}
function writeScroll(top) { scrollRoot().scrollTo({top,behavior:'instant'}); }
function cancelScroll() {
  if (!scrollRun) return;
  const run = scrollRun;
  scrollRun = null;
  cancelAnimationFrame(run.frame);
  app.removeAttribute('data-scrolling');
  setCurrent(current,false);
  run.resolve(false);
}
function destination(index, top = false) {
  if (top) return 0;
  const section = $('#'+data.pages[index].id);
  const offset = mobile.matches
    ? section.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(section).scrollMarginTop) || 0)
    : section.getBoundingClientRect().top - app.getBoundingClientRect().top + app.scrollTop;
  const max = mobile.matches ? document.documentElement.scrollHeight-innerHeight : app.scrollHeight-app.clientHeight;
  return Math.max(0,Math.min(max,offset));
}

function imageBlock(src, title, note, type = 'image', preview = null) {
  const full = safeAsset(src);
  if (!full) return `<div class="asset-placeholder ${e(type)}"><span class="asset-symbol" aria-hidden="true">＋</span><strong>${e(note || `${title} 이미지 추가 예정`)}</strong><span>실제 작업 이미지 준비 중</span></div>`;
  const dimensions=data.imageDimensions?.[safeAsset(preview)||full];
  const size=dimensions?` width="${dimensions.width}" height="${dimensions.height}"`:'';
  return `<button type="button" class="image-button ${e(type)}" data-zoom="${e(full)}" data-title="${e(title)}" aria-label="${e(title)} 전체 이미지 확대"><img src="${e(safeAsset(preview) || full)}" alt="${e(title)}"${size} loading="lazy"><span class="expand-label">전체 보기 ↗</span></button>`;
}
function workBlock(id) {
  const w = data.works.find(x => x.id === id);
  return `<figure class="work work-${e(w.type)}">${imageBlock(w.image, w.name, w.description, w.type, w.preview)}<figcaption><div class="work-caption-top"><h3>${e(w.name)}</h3><span class="muted">${e(({online:'온라인',editorial:'편집·인쇄',detail:'상세페이지',banner:'배너',poster:'인쇄물',photo:'촬영·온라인',sign:'사인·POP'})[w.type])}</span></div><p>${e(w.purpose)}</p><p class="work-role"><span>담당</span> ${e(w.role)}</p>${!safeAsset(w.image) ? `<p class="asset-needed">필요 자료 · ${e(w.required)}</p>` : ''}</figcaption></figure>`;
}
function projectLinks(p) {
  return `<div class="project-links">${external(p.url, '웹사이트 바로가기 ↗')}${safeAsset(p.pdf) ? `<a class="text-link" href="${e(p.pdf)}" target="_blank" rel="noopener">프로젝트 PDF 보기 ↗</a>` : '<span class="pending-link">상세 PDF 추가 예정</span>'}${!p.url ? '<span class="pending-link">배포 URL 확인 후 연결 예정</span>' : ''}</div>`;
}
function contactPanel(p, id) {
  const icon = content => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
  const phoneIcon=icon('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/>');
  const mailIcon=icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>');
  const videoIcon=icon('<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>');
  const kakaoIcon=icon('<path d="M21 11c0 4.4-4 7-9 7-1 0-2-.1-3-.4L5 20l1-4C4 14.7 3 13 3 11c0-4 4-7 9-7s9 3 9 7z"/>');
  const kakaoCard=`<button type="button" class="contact-channel" data-copy-kakao="${e(p.kakaoId)}" aria-label="카카오톡 ID ${e(p.kakaoId)} 복사"><span class="contact-channel-icon">${kakaoIcon}</span><span class="contact-channel-copy"><span class="contact-channel-label">KAKAOTALK ID</span><strong>${e(p.kakaoId)}</strong><span class="contact-channel-description">아이디 복사하기</span></span></button>`;
  const card=(href,label,value,description,svg,external=false)=>`<a class="contact-channel" href="${e(href)}"${external?' target="_blank" rel="noopener noreferrer"':''}><span class="contact-channel-icon">${svg}</span><span class="contact-channel-copy"><span class="contact-channel-label">${e(label)}</span><strong>${e(value)}</strong><span class="contact-channel-description">${e(description)}</span></span></a>`;
  return `<section class="contact-panel" aria-labelledby="${id}"><span class="contact-panel-label">— Contact Me</span><h2 id="${id}">함께 일할 기회를 기다립니다</h2><p>브랜드의 메시지를 전하는 디자인,<br class="contact-mobile-break"> 함께 만들어갈 작업을 기다립니다.<br>채용과 협업에 관해 전화나 이메일로 편하게 연락 주세요.</p><div class="contact-channels">${card('tel:'+p.phone.replaceAll('-',''),'PHONE',p.phone,'전화로 연락하기',phoneIcon)}${card('mailto:'+p.email,'EMAIL',p.email,'채용·협업 문의',mailIcon)}${card(safeURL(p.youtube),'YOUTUBE CHANNEL',p.youtubeHandle,'유튜브 채널 방문하기 ↗',videoIcon,true)}${kakaoCard}</div></section>`;
}
function renderPage(page) {
  const p = data.profile;
  if (page.kind === 'cover') {
    const c=data.coverPage;
    return `<div class="cover-sheet"><header class="cover-heading"><p class="cover-tagline">${e(c.tagline)}</p><p class="cover-role">${e(c.role)}</p></header><div class="cover-stage"><img class="cover-portrait" src="${e(safeAsset(c.photo))}" alt="${e(p.name)} 흑백 프로필 사진" width="765" height="1024" fetchpriority="high"><h1 class="cover-handwritten">${e(c.title)}</h1><ul class="cover-keywords" aria-label="디자인 전문 분야">${c.keywords.map((word,i)=>`<li class="cover-keyword keyword-${i+1}">${e(word)}</li>`).join('')}</ul></div><div class="cover-signature"><p class="cover-english-name">JANG MI SEON</p><p class="cover-person-role">시각 디자이너</p><p class="cover-person-name">${e(p.name)}</p></div><div class="cover-end"><a class="cover-continue" href="#intro">About Me <span aria-hidden="true">↓</span></a></div></div>`;
  }
  if (page.kind === 'intro') return `
    <div class="overview-label">ABOUT ME</div>
    <div class="overview-hero">
      ${safeAsset(p.photo) ? `<img class="overview-photo" src="${e(p.photo)}" alt="${e(p.name)} 프로필 사진" width="320" height="415">` : '<div class="overview-monogram" aria-hidden="true"><span>JM<span class="indigo">.</span></span><span>VISUAL DESIGN</span></div>'}
      <div class="overview-intro"><h1 class="overview-name">${e(p.name)}</h1><p class="overview-role">Visual Designer</p><p class="overview-specialty">${e(p.cover.specialty)}</p><p class="overview-description">${e(p.cover.description).replaceAll('\n','<br>')}</p></div>
    </div>
    <div class="overview-facts overview-facts--two">
      <section class="overview-column"><h2>EDUCATION</h2><div class="overview-entries">${p.cover.education.map(item=>`<article><h3>${e(item.title)}</h3><p>${e(item.description)}</p></article>`).join('')}</div></section>
      <section class="overview-column"><h2>EXPERIENCE</h2><div class="overview-entries">${data.companies.map(c=>`<a href="#${c.id==='rtm'?'rtm-online':c.id==='angel'?'angel-online':'safenet-online'}"><h3>${e(c.name)} <span aria-hidden="true">↗</span></h3><p>${e(c.period)} · ${e(c.position)}</p></a>`).join('')}</div></section>
    </div>
    <section class="overview-tools"><h2>SKILLS & TOOLS</h2><div class="overview-tools-grid">${p.cover.tools.map(group=>`<article><h3>${e(group.title)}</h3><p>${e(group.items.join(' · '))}</p></article>`).join('')}</div></section>`;
  if (page.kind === 'profile') return `<div class="page-heading"><h2>매체는 달라도,<br>메시지는 명확하게.</h2><p>영업관리에서 쌓은 소통 경험과 마케팅 실무를 바탕으로,<br class="desktop-break"> 제작물의 목적과 쓰임을 먼저 생각합니다.</p></div><div class="capability-grid">${data.capabilities.map(c=>`<article class="capability"><span class="indigo">${c.number}</span><div><h3>${e(c.title)}</h3><p>${e(c.description)}</p><span class="muted">${e(c.tools)}</span></div></article>`).join('')}</div>`;
  if (page.kind === 'career') return `<div class="page-heading split-heading"><h2>현장에서 쌓고,<br>디자인으로 연결한 경험.</h2><p>전체 경력 <strong>14년 8개월</strong>은 이력서 기재 기준입니다.<br>아래 디자인 직무 3개사와 이전 경력을 구분했습니다.</p></div><div class="career-list">${data.companies.map(c=>`<a class="career-row" href="#${c.id==='rtm'?'rtm-online':c.id==='angel'?'angel-online':'safenet-online'}"><div class="career-period">${e(c.period)}<span>${e(c.duration)}</span></div><div><h3>${e(c.name)} <span aria-hidden="true">↗</span></h3><p class="muted">${e(c.position)} · ${e(c.job)}</p><p>${e(c.summary)}</p></div></a>`).join('')}</div><details class="earlier"><summary>이전 경력 · 영업관리와 운영 경험 <span aria-hidden="true">＋</span></summary><div>${data.earlierCareers.map(c=>`<article class="earlier-row"><span>${e(c.period)}</span><div><h3>${e(c.company)}</h3><p>${e(c.position)} · 주요직무 ${e(c.job)}</p><p class="muted">${e(c.description)}</p></div></article>`).join('')}</div></details>`;
  if (page.kind === 'company') {
    const c = data.companies.find(x=>x.id===page.company);
    return `<div class="company-heading"><span class="company-label">${e(c.name)} <span class="muted">/ ${e(c.period)}</span></span><h2>${e(page.headline).replace('\n','<br>')}</h2></div><div class="company-layout"><div class="company-info"><p class="position">${e(c.position)}<br><span class="muted">${e(c.job)}</span></p><p>${e(c.summary)}</p><h3>담당 업무</h3><ul class="scope-list">${c.scope.map(s=>`<li>${e(s)}</li>`).join('')}</ul><p class="source-note">회사 정보와 업무 범위는 이력서 기준입니다. 개별 작업의 확인 사항은 담당 설명에 표시했습니다.</p></div><div class="works-grid ${page.workIds.length>1?'two-works':''}">${page.workIds.map(workBlock).join('')}</div></div>`;
  }
  if (page.kind === 'unassigned') return `<div class="page-heading"><h2>더해질 작업의 자리.</h2><p>사인디자인과 상세페이지 작업입니다.<br>제작 회사와 개별 담당 범위를 확인한 뒤 경력에 연결합니다.</p></div><div class="unassigned-grid">${page.workIds.map(workBlock).join('')}</div>`;
  if (page.kind === 'project') {
    const pr = data.projects.find(x=>x.id===page.project);
    return `<div class="project-heading"><span class="project-number">PERSONAL PROJECT / ${pr.id==='tail'?'01':'02'}</span><h2>${e(pr.name)}<span>${e(pr.english)}</span></h2><p>${e(pr.subtitle)}</p></div><div class="project-layout"><div class="project-copy"><p class="lead">${e(pr.description)}</p><h3>기여도 100%</h3><p>${e(pr.role)}</p><p class="source-note">${e(pr.roleNote)}</p>${pr.id==='pulse'?'<p class="sample-notice">샘플 데이터 기반 프로토타입<br>실제 건강 데이터 연동·자동 측정·기기 간 자동 동기화를 완료한 서비스가 아닙니다.</p>':''}${projectLinks(pr)}</div><figure class="project-figure">${imageBlock(pr.image, pr.name+' 실제 전체 화면', pr.imageNote, pr.id==='tail'?'detail project-shot':'dashboard')}<figcaption>${e(pr.imageNote)}</figcaption></figure></div>`;
  }
  if (page.kind === 'tailFlow') {
    const pr=data.projects.find(x=>x.id==='tail');
    return `<div class="page-heading"><h2>발견한 공간을,<br>다음 목적지로 이어갑니다.</h2><p>지역·카테고리 검색 → 이용 조건 비교 → 로그인·하트 저장 → 찜 목록·지도</p></div><div class="flow-and-image"><div class="flow-vertical"><article><span class="indigo">01 / FIND</span><h3>지역과 공간 선택</h3><p>시설명은 선택 사항으로 두고, 이름을 몰라도 지역·유형으로 장소를 찾도록 했습니다.</p></article><article><span class="indigo">02 / COMPARE</span><h3>동반 조건 살펴보기</h3><p>실내·실외 동반과 주차 배지, 제한사항을 비교합니다. 불명확한 정보는 확인 필요로 안내합니다.</p></article><article><span class="indigo">03 / SAVE & LOCATE</span><h3>저장한 공간을 지도에서</h3><p>계정별 찜 목록과 카테고리 필터를 제공하고, 카드 전체 클릭으로 지도 탐색을 연결했습니다.</p></article></div><figure>${imageBlock(pr.flowImage,'꼬리별지도 찜 목록·지도 화면 예시',null,'image')}<figcaption class="source-note">${e(pr.flowImageNote)}</figcaption></figure></div>${projectLinks(pr)}`;
  }
  if (page.kind === 'tailProcess') {
    const pr=data.projects.find(x=>x.id==='tail');
    return `<div class="page-heading"><h2>장소의 데이터를,<br>탐색의 경험으로 바꾸는 과정.</h2><p>“우리 아이도 함께 갈 수 있을까?”라는 질문에서 출발했습니다.<br>기획부터 데이터·디자인·구현을 하나의 흐름으로 연결했습니다.</p></div><div class="scope-grid">${pr.process.map((s,i)=>`<article><span class="indigo">${pad(i+1)}</span><h3>${e(s.title)}</h3><p>${e(s.description)}</p></article>`).join('')}</div><div class="implementation-line"><span>구현 환경</span><p>${e(pr.tech)}</p></div><div class="sample-notice"><strong>다음 검증 과제</strong><p>${e(pr.next)}</p></div><p class="source-note">제공 Tail Star Map PDF 2–5·14p 기준. 실제 사용자 인터뷰·사용성 조사나 정량적 성과를 주장하지 않습니다.</p>${projectLinks(pr)}`;
  }
  if (page.kind === 'pulseResponsive') {
    const pr=data.projects.find(x=>x.id==='pulse');
    return `<div class="page-heading"><h2>같은 정보, 다른 화면.<br>기기에 맞춰 다시 배치합니다.</h2><p>모바일 중심 Stitch 시안을 PC·태블릿·모바일 웹 경험으로 확장했습니다.<br>아래는 제공 PDF의 실제 구현 캡처이며, 모든 건강 수치는 샘플입니다.</p></div><div class="responsive-gallery">${pr.screens.map(s=>`<figure>${imageBlock(s.image,'PulseHealth '+s.name+' 실제 캡처',null,'image')}<figcaption><h3>${e(s.name)}</h3><p>${e(s.note)}</p></figcaption></figure>`).join('')}</div><div class="implementation-line"><span>유지한 시각 요소</span><p>어두운 배경 · 민트·라벤더·오렌지 · 둥근 카드 · 원형 진행률 · 정보 계층</p></div><p class="source-note">출처: PulseHealth PDF 2–3p. 캡처 크기와 기존 프로젝트의 자동 검증 너비는 서로 다릅니다.</p>${projectLinks(pr)}`;
  }
  if (page.kind === 'pulseScope') {
    const pr=data.projects.find(x=>x.id==='pulse');
    return `<div class="page-heading"><h2>화면을 넘어,<br>저장과 복원까지 연결합니다.</h2><p>React·TypeScript·Vite 기반 구현 범위입니다.<br>제공 PulseHealth PDF 2·4·5p를 기준으로 정리했습니다.</p></div><div class="scope-grid">${pr.requestedScope.map((s,i)=>`<article><span class="indigo">${pad(i+1)}</span><h3>${e(s.title)}</h3><p>${e(s.description)}</p></article>`).join('')}</div><div class="sample-notice wide-notice"><strong>샘플 데이터로 동작하는 프로토타입</strong><p>기록은 사용 중인 브라우저에 저장됩니다. 실제 스마트폰 건강 데이터 연동, 자동 측정, 기기 간 자동 동기화, 의학적 진단 기능은 제공하지 않습니다.</p></div><div class="next-step"><span>향후 확장</span><p>${e(pr.next)}</p></div>`;
  }
  return `<div class="contact-page contact-page--panel">${contactPanel(p,'final-contact-title')}<footer class="portfolio-copyright">© 2026 Jang Mi Seon Portfolio. All Rights Reserved.</footer></div>`;
}

function closeMenu(focus = false) {
  const wasOpen = $('#menu-toggle').getAttribute('aria-expanded') === 'true';
  $('#menu-toggle').setAttribute('aria-expanded','false');
  document.body.classList.remove('menu-open');
  if (focus && wasOpen) $('#menu-toggle').focus();
}
function setCurrent(index, hash = true) {
  current = Math.max(0,Math.min(data.pages.length-1,index));
  const page=data.pages[current];
  document.body.classList.toggle('on-cover',page.kind==='cover');
  document.querySelectorAll('.slide').forEach((slide,i)=> {slide.hidden=false;slide.classList.toggle('active',i===current);});
  document.querySelectorAll('.toc-link').forEach(a=> {if(a.getAttribute('href')==='#'+page.id) a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  $('#current-page').textContent=pad(current+1);
  $('#page-title').textContent=page.title;
  const navigationIndex=scrollRun?.target??current;
  $('#previous').disabled=navigationIndex===0;
  $('#next').disabled=navigationIndex===data.pages.length-1;
  const pct=Math.round((current+1)/data.pages.length*100);
  $('#progress-fill').style.width=pct+'%';
  $('.progress').setAttribute('aria-valuenow',pct);
  if(hash) history.replaceState(null,'','#'+page.id);
}
async function go(index, focus = true, options = {}) {
  cancelScroll();
  closeMenu();
  const target = Math.max(0, Math.min(data.pages.length - 1, index));
  const section=$('#'+data.pages[target].id);
  const from = scrollPosition();
  const distance = destination(target,options.top)-from;
  if (!reducedMotion.matches && options.animate!==false && Math.abs(distance)>2) {
    const duration = Math.min(SCROLL_MOTION.maxDuration,SCROLL_MOTION.minDuration+Math.sqrt(Math.abs(distance))*SCROLL_MOTION.distanceFactor);
    const completed = await new Promise(resolve=>{
      const run = {target,focus,top:options.top,resolve,frame:0,started:performance.now()};
      scrollRun=run;
      app.dataset.scrolling='true';
      setCurrent(current,false);
      const step=now=>{
        if(scrollRun!==run)return;
        const t=Math.min(1,(now-run.started)/duration);
        // Smootherstep: zero velocity and acceleration at both ends.
        const eased=t*t*t*(t*(t*6-15)+10);
        writeScroll(from+(destination(target,options.top)-from)*eased);
        syncCurrent();
        if(t<1){run.frame=requestAnimationFrame(step);return;}
        scrollRun=null;
        app.removeAttribute('data-scrolling');
        resolve(true);
      };
      run.frame=requestAnimationFrame(step);
    });
    if(!completed)return false;
  } else writeScroll(destination(target,options.top));
  setCurrent(target);
  if(focus) section.focus({preventScroll:true});
  $('#announcer').textContent=`${current+1} / ${data.pages.length}, ${data.pages[current].title}`;
  return true;
}
function syncCurrent() {
  if(!data || document.body.classList.contains('menu-open'))return;
  const reference=mobile.matches?parseFloat(getComputedStyle($('.sidebar')).height)+30:app.getBoundingClientRect().top+Math.min(120,app.clientHeight*.2);
  const atEnd=mobile.matches?scrollY+innerHeight>=document.documentElement.scrollHeight-2:app.scrollTop+app.clientHeight>=app.scrollHeight-2;
  const index=atEnd?data.pages.length-1:data.pages.findIndex(p=>{const r=$('#'+p.id).getBoundingClientRect();return r.top<=reference && r.bottom>reference;});
  if(index!==-1 && index!==current)setCurrent(index);
}
function scheduleSync() {
  if(scrollFrame)return;
  scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;syncCurrent();});
}
function openZoom(button) {
  lastImageTrigger=button;
  $('#zoom-image').src=button.dataset.zoom;
  $('#zoom-image').alt=button.dataset.title;
  $('#zoom-title').textContent=button.dataset.title;
  $('#image-dialog').showModal();
  document.body.classList.add('dialog-open');
  $('.zoom-scroll').scrollTop=0;
  $('#close-dialog').focus();
}
function missingImage(img) {
  const button=img.closest('.image-button');
  if(!button)return;
  const placeholder=document.createElement('div');
  placeholder.className='asset-placeholder';
  const title=document.createElement('strong'); title.textContent=button.dataset.title+' 이미지를 준비 중입니다.';
  placeholder.append(title); button.replaceWith(placeholder);
}
async function init() {
  const response=await fetch('data.json');
  if(!response.ok)throw new Error('콘텐츠 파일을 불러오지 못했습니다.');
  data=await response.json();
  const nav=$('#contents');
  let group='';
  data.pages.forEach((page,i)=> {
    if(!['cover','contact'].includes(page.kind)){
      if(group!==page.group) {const label=document.createElement('div');label.className='nav-group';label.textContent=page.group==='ABOUT'?'PROFILE':page.group;nav.append(label);group=page.group;}
      const a=document.createElement('a');a.className='toc-link';a.href='#'+page.id;a.textContent=page.title;nav.append(a);
    }
    const section=document.createElement('section');section.className='slide slide-'+page.kind;section.id=page.id;section.tabIndex=-1;section.setAttribute('aria-label',`${i+1}. ${page.title}`);
    section.innerHTML=`${['cover','intro','contact'].includes(page.kind)?'':`<div class="page-eyebrow"><span>${e(page.groupLabel)}</span></div>`}${renderPage(page)}`;
    app.append(section);
  });
  $('#total-pages').textContent=pad(data.pages.length);
  const mobileShortcuts=$('.sidebar-shortcuts').cloneNode(true);
  mobileShortcuts.className='mobile-shortcuts sidebar-shortcuts';
  nav.append(mobileShortcuts);
  app.addEventListener('error',event=> {if(event.target.tagName==='IMG')missingImage(event.target);},true);
  document.querySelectorAll('.image-button img').forEach(img=>{if(img.complete && img.naturalWidth===0)missingImage(img);});
  document.addEventListener('click',async event=> {
    const copy=event.target.closest('[data-copy-kakao]');
    if(copy){
      const description=$('.contact-channel-description',copy);
      try{await navigator.clipboard.writeText(copy.dataset.copyKakao);description.textContent='복사되었습니다';$('#announcer').textContent='카카오톡 ID가 복사되었습니다.';}
      catch{const range=document.createRange();range.selectNodeContents($('strong',copy));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);description.textContent='선택된 ID를 복사해 주세요';$('#announcer').textContent='자동 복사가 지원되지 않습니다. 선택된 카카오톡 ID를 복사해 주세요.';}
      setTimeout(()=>{description.textContent='아이디 복사하기';},3500);
      return;
    }
    const zoom=event.target.closest('[data-zoom]'); if(zoom){openZoom(zoom);return;}
    const anchor=event.target.closest('a[href^="#"]');
    if(!anchor || anchor.classList.contains('skip-link'))return;
    const i=data.pages.findIndex(p=>'#'+p.id===anchor.getAttribute('href'));
    if(i!==-1){event.preventDefault();await go(i,true,{top:anchor.hasAttribute('data-back-top')});}
    else if(mobile.matches && document.body.classList.contains('menu-open')&&!event.target.closest('.sidebar')) closeMenu();
  });
  $('#previous').addEventListener('click',()=>go((scrollRun?.target??current)-1));
  $('#next').addEventListener('click',()=>go((scrollRun?.target??current)+1));
  $('#menu-toggle').addEventListener('click',()=> {const open=!document.body.classList.contains('menu-open');document.body.classList.toggle('menu-open',open);$('#menu-toggle').setAttribute('aria-expanded',String(open));});
  $('#close-dialog').addEventListener('click',()=>$('#image-dialog').close());
  $('#image-dialog').addEventListener('click',event=>{if(event.target===$('#image-dialog'))$('#image-dialog').close();});
  $('#image-dialog').addEventListener('close',()=> {document.body.classList.remove('dialog-open');lastImageTrigger?.focus({preventScroll:true});$('#zoom-image').removeAttribute('src');});
  $('#zoom-image').addEventListener('error',()=> {$('#zoom-title').textContent='이미지를 불러오지 못했습니다. 닫은 후 다시 시도해 주세요.';});
  document.addEventListener('keydown',event=> {
    if($('#image-dialog').open)return;
    if(event.key==='Escape'){cancelScroll();closeMenu(true);return;}
    if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))cancelScroll();
    if(mobile.matches || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    if(event.key==='ArrowRight'){event.preventDefault();go((scrollRun?.target??current)+1);}
    if(event.key==='ArrowLeft'){event.preventDefault();go((scrollRun?.target??current)-1);}
  });
  window.addEventListener('hashchange',()=> {const i=data.pages.findIndex(p=>'#'+p.id===location.hash);if(i!==-1)go(i);});
  app.addEventListener('scroll',scheduleSync,{passive:true});
  window.addEventListener('scroll',scheduleSync,{passive:true});
  window.addEventListener('wheel',()=>{cancelScroll();scheduleSync();},{passive:true});
  window.addEventListener('touchstart',()=>{cancelScroll();scheduleSync();},{passive:true});
  window.addEventListener('pointerdown',event=>{if(!event.target.closest('a[href^="#"],#previous,#next')){cancelScroll();scheduleSync();}},{passive:true});
  window.addEventListener('resize',()=>{cancelScroll();scheduleSync();});
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches&&scrollRun){const run=scrollRun;go(run.target,run.focus,{animate:false,top:run.top});}});
  mobile.addEventListener('change',()=> {cancelScroll();closeMenu();go(current,false,{animate:false});});
  current=Math.max(0,data.pages.findIndex(p=>'#'+p.id===location.hash));
  setCurrent(current,false);
  observeCoverName();
  requestAnimationFrame(()=>go(current,false,{animate:false,top:!location.hash}));
}
init().catch(error=> {app.innerHTML=`<div class="load-error"><h1>포트폴리오를 불러오지 못했습니다.</h1><p>로컬 서버를 실행한 뒤 다시 접속해 주세요.</p><p>${e(error.message)}</p><a href="mailto:wkd7437@naver.com">이메일로 연락하기</a></div>`;});

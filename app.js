(() => {
  'use strict';
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let manualReduced = params.get('motion') === 'reduce';
  root.classList.toggle('reduce-motion', manualReduced);
  let lang = params.get('lang') === 'en' ? 'en' : params.get('lang') === 'ko' ? 'ko' : (navigator.language || '').startsWith('ko') ? 'ko' : 'en';
  // Pricing follows the display language; discard obsolete currency overrides.
  if(params.has('currency')){const url=new URL(location.href);url.searchParams.delete('currency');history.replaceState(null,'',url);}
  let feature = 'practice';
  let transitionRevision = 0;
  let screenAnimations = [];
  let screenGhost;
  const motionOff = () => reduced.matches || manualReduced;
  function stopScreenTransition() {
    screenAnimations.forEach(animation => animation.cancel());
    screenAnimations = [];
    screenGhost?.remove();
    screenGhost = undefined;
  }
  const descriptions = {
    practice: {ko:'연습 시간과 녹음, 메모를 함께 사용하는 Graphite 연습 화면',en:'Graphite practice screen with an elapsed timer, notes and recording'},
    recordings: {ko:'곡별 테이크를 모아 듣고 비교하는 Graphite 녹음 화면',en:'Graphite recordings screen with takes organized by piece'},
    journal: {ko:'주간 연습 시간과 기록을 보여주는 Graphite 연습 기록 화면',en:'Graphite journal showing weekly practice time and session history'}
  };
  function applyLanguage() {
    root.lang = lang;
    document.querySelectorAll('[data-ko][data-en]').forEach(el => { el.textContent = el.dataset[lang].replace(/\\n/g, '\n'); });
    document.querySelectorAll('[data-alt-ko]').forEach(el => {el.alt = el.dataset[lang === 'ko' ? 'altKo' : 'altEn'];});
    document.querySelectorAll('.translation').forEach(el => {el.hidden = el.lang !== lang;});
    document.querySelectorAll('.language').forEach(el => {el.textContent = lang === 'ko' ? 'EN' : 'KO';el.setAttribute('aria-label',lang === 'ko' ? 'Switch to English' : '한국어로 변경');});
    document.querySelectorAll('a[href^="/"]').forEach(el => {const u = new URL(el.getAttribute('href'),location.origin);if(!/\.[a-z]+$/i.test(u.pathname)) {u.searchParams.set('lang',lang);if(manualReduced)u.searchParams.set('motion','reduce');else u.searchParams.delete('motion');el.setAttribute('href',u.pathname+u.search+u.hash);}});
    document.querySelectorAll('[data-src-ko][data-src-en]').forEach(el => {const next = el.dataset[lang === 'ko' ? 'srcKo' : 'srcEn']; if(el.getAttribute('src') !== next) el.src = next;});
    const img = document.getElementById('feature-image');
    if(img) img.alt = descriptions[feature][lang];
    document.querySelectorAll('[data-krw][data-usd]').forEach(el => {el.textContent = el.dataset[lang === 'ko' ? 'krw' : 'usd'];});
    document.title = document.body.classList.contains('privacy-page') ? (lang==='ko'?'개인정보처리방침':'Privacy policy')+' — Practice Note' : document.body.classList.contains('support-page') ? (lang==='ko'?'지원':'Support')+' — Practice Note' : 'Practice Note — Music practice, organized';
  }
  document.querySelectorAll('.language').forEach(btn => btn.addEventListener('click',() => {lang = lang === 'ko' ? 'en' : 'ko';const u=new URL(location.href);u.searchParams.set('lang',lang);history.replaceState(null,'',u);applyLanguage();updateMotionLabel();}));
  applyLanguage();
  function updateMotionLabel(){const btn=document.querySelector('.motion-control');if(!btn)return;const isReduced=manualReduced||reduced.matches;btn.setAttribute('aria-pressed',String(isReduced));btn.disabled=reduced.matches;btn.textContent=reduced.matches?(lang==='ko'?'기기 설정에 따라 움직임 줄임':'Motion reduced by device setting'):isReduced?(lang==='ko'?'움직임 줄임 · 기본값으로':'Motion reduced · Reset'):(lang==='ko'?'움직임 줄이기':'Reduce motion');}
  document.querySelector('.motion-control')?.addEventListener('click',()=>{manualReduced=!manualReduced;root.classList.toggle('reduce-motion',manualReduced);const u=new URL(location.href);if(manualReduced)u.searchParams.set('motion','reduce');else u.searchParams.delete('motion');history.replaceState(null,'',u);stopScreenTransition();applyLanguage();updateMotionLabel();});
  reduced.addEventListener('change',()=>{if(motionOff())stopScreenTransition();updateMotionLabel();});updateMotionLabel();
  // Native navigation remains intact, including Back, new tabs and direct links.
  function handlePageTransition(event){
    const transition=event.viewTransition;
    if(!transition)return;
    // Cancellation is expected for reduced motion, interruptions and history restores.
    transition.ready.catch(()=>{});
    if(motionOff())transition.skipTransition();
  }
  addEventListener('pageswap',handlePageTransition);
  addEventListener('pagereveal',handlePageTransition);
  addEventListener('pagehide',stopScreenTransition);
  if('IntersectionObserver' in window){root.classList.add('motion-ready');const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});},{threshold:0.08});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}
  const tabs=[...document.querySelectorAll('[data-feature]')];
  async function selectFeature(next){
    if(next===feature)return;
    const revision=++transitionRevision;
    feature=next;
    stopScreenTransition();
    tabs.forEach(btn=>{const active=btn.dataset.feature===next;btn.setAttribute('aria-selected',String(active));btn.tabIndex=active?0:-1;const panel=document.getElementById('panel-'+btn.dataset.feature);if(panel)panel.hidden=!active;});
    const img=document.getElementById('feature-image');if(!img)return;
    // Decode first so slow connections never reveal an empty phone frame.
    const ready=new Image();ready.src='/assets/'+next+'.webp';
    try{await ready.decode();}catch{return;}
    if(revision!==transitionRevision)return;
    const ghost=img.cloneNode();
    ghost.removeAttribute('id');ghost.alt='';ghost.setAttribute('aria-hidden','true');ghost.className='screen-previous';
    img.src=ready.src;img.alt=descriptions[next][lang];
    if(motionOff()||!img.animate)return;
    img.parentElement.append(ghost);screenGhost=ghost;
    const timing={duration:520,easing:'cubic-bezier(.22,1,.36,1)'};
    screenAnimations=[
      img.animate([{opacity:0},{opacity:1}],timing),
      ghost.animate([{opacity:1},{opacity:0}],timing)
    ];
    Promise.all(screenAnimations.map(animation=>animation.finished)).catch(()=>{}).finally(()=>{ghost.remove();if(revision===transitionRevision){screenAnimations=[];screenGhost=undefined;}});
  }
  tabs.forEach((btn,index)=>{btn.addEventListener('click',()=>selectFeature(btn.dataset.feature));btn.addEventListener('keydown',e=>{let target;if(e.key==='ArrowRight')target=(index+1)%tabs.length;else if(e.key==='ArrowLeft')target=(index-1+tabs.length)%tabs.length;else if(e.key==='Home')target=0;else if(e.key==='End')target=tabs.length-1;else return;e.preventDefault();tabs[target].focus();selectFeature(tabs[target].dataset.feature);});});
  let scheduled=false;
  function updateScroll(){scheduled=false;const max=document.documentElement.scrollHeight-innerHeight;root.style.setProperty('--scroll',max>0?String(scrollY/max):'0');}
  addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateScroll);}},{passive:true});updateScroll();
})();

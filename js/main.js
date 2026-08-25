const introSplash = document.getElementById('introSplash');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const introDebug = new URLSearchParams(window.location.search).get('intro-debug') === '1';
  let introFinished = false;

  const finishIntro = () => {
    if(introFinished) return;
    introFinished = true;
    document.body.classList.remove('splash-active','splash-revealing');
    introSplash?.remove();
  };

  if(introDebug && introSplash){
    introSplash.classList.add('intro-debug');
    introSplash.title = 'Usa la rueda para avanzar o retroceder la animación';
    window.requestAnimationFrame(() => {
      const introAnimations = introSplash.getAnimations({subtree:true});
      let introProgress = 0;
      introAnimations.forEach(animation => {
        animation.pause();
        animation.currentTime = 0;
      });
      window.addEventListener('wheel',event => {
        event.preventDefault();
        introProgress = Math.max(0,Math.min(1,introProgress + event.deltaY * 0.00045));
        const animationTime = introProgress * 3200;
        introAnimations.forEach(animation => { animation.currentTime = animationTime; });
        document.body.classList.toggle('splash-revealing',introProgress >= .42);
      },{passive:false});
    });
  }
  else if(reducedMotion) finishIntro();
  else if(introSplash){
    const revealTimer = window.setTimeout(() => {
      document.body.classList.add('splash-revealing');
    },1400);
    const skipIntro = () => {
      window.clearTimeout(revealTimer);
      finishIntro();
    };
    introSplash.addEventListener('click',skipIntro,{once:true});
    window.addEventListener('keydown',skipIntro,{once:true});
    introSplash.addEventListener('animationend', event => {
      if(event.target === introSplash) finishIntro();
    });
    window.setTimeout(finishIntro,3500);
  } else {
    document.body.classList.remove('splash-active');
  }

  const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  });

  // --- Menú móvil ---
  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');

  function setMobileMenu(isOpen){
    siteNav.classList.toggle('open', isOpen);
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    document.body.classList.toggle('nav-open', isOpen);
    if(isOpen) siteNav.querySelector('a')?.focus();
  }

  // --- Apartado activo en la navegación ---
  const sectionNavLinks = [...siteNav.querySelectorAll('a[href^="#"]')];
  const navigableSections = sectionNavLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  let lockedSectionId = null;
  let activeScrollFrame = null;

  function setActiveSection(sectionId){
    sectionNavLinks.forEach(link => {
      const isActive = link.getAttribute('href') === `#${sectionId}`;
      link.classList.toggle('active', isActive);
      if(isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function syncActiveSection(){
    if(lockedSectionId) return;
    const referenceY = 150;
    const current = navigableSections
      .filter(section => section.getBoundingClientRect().top <= referenceY)
      .at(-1);
    setActiveSection(current ? current.id : '');
  }

  const sectionObserver = new IntersectionObserver(entries => {
    if(lockedSectionId) return;
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
    if(visible) setActiveSection(visible.target.id);
  }, { rootMargin:'-25% 0px -55% 0px', threshold:[0, .1, .25, .5] });

  navigableSections.forEach(section => sectionObserver.observe(section));
  sectionNavLinks.forEach(link => link.addEventListener('click', () => {
    lockedSectionId = link.getAttribute('href').slice(1);
    setActiveSection(lockedSectionId);
  }));

  document.querySelector('.brand').addEventListener('click', () => {
    lockedSectionId = 'inicio';
    setActiveSection('');
  });

  window.addEventListener('scroll', () => {
    if(activeScrollFrame) return;
    activeScrollFrame = requestAnimationFrame(() => {
      syncActiveSection();
      activeScrollFrame = null;
    });
  }, {passive:true});

  function unlockAutomaticNavigation(){ lockedSectionId = null; }
  window.addEventListener('scrollend', () => {
    lockedSectionId = null;
    syncActiveSection();
  });
  window.addEventListener('wheel', unlockAutomaticNavigation, {passive:true});
  window.addEventListener('touchstart', unlockAutomaticNavigation, {passive:true});
  window.addEventListener('keydown', event => {
    if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) {
      unlockAutomaticNavigation();
    }
  });

  navToggle.addEventListener('click', ()=>{
    const isOpen = !siteNav.classList.contains('open');
    setMobileMenu(isOpen);
  });
  siteNav.querySelectorAll('a').forEach(link=>{
    link.addEventListener('click', ()=>{
      setMobileMenu(false);
    });
  });
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape' && siteNav.classList.contains('open')){
      setMobileMenu(false);
      navToggle.focus();
    }
  });
  window.addEventListener('resize', ()=>{
    if(window.innerWidth > 1024 && siteNav.classList.contains('open')) setMobileMenu(false);
  });

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('in'); });
  }, {threshold:0.15});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  // --- Galería deslizable ---
  const track = document.getElementById('galTrack');
  const prevBtn = document.getElementById('galPrev');
  const nextBtn = document.getElementById('galNext');
  const progressBar = document.getElementById('galProgress');

  function slideWidth(){
    const slide = track.querySelector('.slide');
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return slide.getBoundingClientRect().width + gap;
  }
  function updateProgress(){
    const max = track.scrollWidth - track.clientWidth;
    const ratio = max > 0 ? track.scrollLeft / max : 0;
    const visibleRatio = track.clientWidth / track.scrollWidth;
    progressBar.style.width = (visibleRatio*100) + '%';
    progressBar.style.transform = `translateX(${ratio * (100/visibleRatio - 100)}%)`;
    prevBtn.disabled = track.scrollLeft <= 4;
    nextBtn.disabled = track.scrollLeft >= max - 4;
  }
  prevBtn.addEventListener('click', ()=> track.scrollBy({left:-slideWidth(), behavior:'smooth'}));
  nextBtn.addEventListener('click', ()=> track.scrollBy({left:slideWidth(), behavior:'smooth'}));
  track.addEventListener('scroll', ()=> requestAnimationFrame(updateProgress));
  window.addEventListener('resize', updateProgress);
  updateProgress();

  // Arrastre con ratón (touch funciona nativo con scroll-snap)
  let isDown = false, startX = 0, startScroll = 0;
  track.addEventListener('mousedown', (e)=>{
    isDown = true; track.classList.add('dragging');
    startX = e.pageX; startScroll = track.scrollLeft;
  });
  window.addEventListener('mouseup', ()=>{ isDown = false; track.classList.remove('dragging'); });
  window.addEventListener('mouseleave', ()=>{ isDown = false; track.classList.remove('dragging'); });
  track.addEventListener('mousemove', (e)=>{
    if(!isDown) return;
    e.preventDefault();
    track.scrollLeft = startScroll - (e.pageX - startX);
  });

  // --- Carrusel de festivales ---
  const festTrack = document.getElementById('festTrack');
  const festPrev = document.getElementById('festPrev');
  const festNext = document.getElementById('festNext');
  const festProgress = document.getElementById('festProgress');

  function festivalStep(){
    const slide = festTrack.querySelector('.festival-slide');
    const gap = parseFloat(getComputedStyle(festTrack).columnGap) || 0;
    return slide.getBoundingClientRect().width + gap;
  }
  function updateFestivalProgress(){
    const max = festTrack.scrollWidth - festTrack.clientWidth;
    const ratio = max > 0 ? festTrack.scrollLeft / max : 0;
    const visibleRatio = Math.min(1, festTrack.clientWidth / festTrack.scrollWidth);
    festProgress.style.width = (visibleRatio * 100) + '%';
    festProgress.style.transform = `translateX(${ratio * (100 / visibleRatio - 100)}%)`;
    festPrev.disabled = festTrack.scrollLeft <= 4;
    festNext.disabled = festTrack.scrollLeft >= max - 4;
  }
  festPrev.addEventListener('click', ()=> festTrack.scrollBy({left:-festivalStep(), behavior:'smooth'}));
  festNext.addEventListener('click', ()=> festTrack.scrollBy({left:festivalStep(), behavior:'smooth'}));
  festTrack.addEventListener('scroll', ()=> requestAnimationFrame(updateFestivalProgress));
  window.addEventListener('resize', updateFestivalProgress);
  updateFestivalProgress();

  let festDown=false, festStartX=0, festStartScroll=0, festMoved=false;
  festTrack.addEventListener('mousedown', (e)=>{
    festDown=true; festMoved=false; festStartX=e.pageX; festStartScroll=festTrack.scrollLeft;
    festTrack.classList.add('dragging');
  });
  window.addEventListener('mouseup', ()=>{ festDown=false; festTrack.classList.remove('dragging'); });
  festTrack.addEventListener('mousemove', (e)=>{
    if(!festDown) return;
    const dx=e.pageX-festStartX;
    if(Math.abs(dx)>5) festMoved=true;
    if(festMoved) e.preventDefault();
    festTrack.scrollLeft=festStartScroll-dx;
  });

  document.querySelectorAll('.festival-slide').forEach(slide=>{
    slide.removeAttribute('tabindex');
    slide.removeAttribute('role');
    slide.removeAttribute('aria-label');
    slide.removeAttribute('data-image');
    slide.classList.remove('zoomable');

  });

  // Evita la ampliación, el arrastre y la descarga directa habitual de imágenes.
  document.querySelectorAll('img, .clase-card, .hero').forEach(element=>{
    if(element.tagName === 'IMG') element.draggable = false;
    element.addEventListener('dragstart', (event)=> event.preventDefault());
    element.addEventListener('contextmenu', (event)=> event.preventDefault());
  });

  const classCards = document.querySelectorAll('.clase-card');
  let lastTouchCardActivation = 0;

  const expandCard = card => {
    classCards.forEach(otherCard => {
      const isActive = otherCard === card;
      otherCard.classList.toggle('is-expanded',isActive);
      otherCard.setAttribute('aria-expanded',String(isActive));
    });
  };

  classCards.forEach(card=>{
    card.removeAttribute('title');
    card.removeAttribute('aria-label');
    card.setAttribute('tabindex','0');
    card.setAttribute('aria-expanded','false');

    const toggleCard = () => {
      if(!window.matchMedia('(hover:none)').matches) return;
      const willOpen = !card.classList.contains('is-expanded');
      if(willOpen) expandCard(card);
      else {
        card.classList.remove('is-expanded');
        card.setAttribute('aria-expanded','false');
      }
    };

    card.addEventListener('click', event => {
      if(event.target.closest('a')) return;
      if(Date.now() - lastTouchCardActivation < 700) return;
      toggleCard();
    });
    card.addEventListener('keydown', event => {
      if((event.key === 'Enter' || event.key === ' ') && !event.target.closest('a')){
        event.preventDefault();
        toggleCard();
      }
    });
  });

  const expandCardUnderFinger = touch => {
    if(!window.matchMedia('(hover:none)').matches) return;
    const card = document.elementFromPoint(touch.clientX,touch.clientY)?.closest('.clase-card');
    if(!card) return;
    lastTouchCardActivation = Date.now();
    expandCard(card);
  };

  document.addEventListener('touchstart', event => {
    if(event.touches.length === 1) expandCardUnderFinger(event.touches[0]);
  },{passive:true});

  document.addEventListener('touchmove', event => {
    if(event.touches.length === 1) expandCardUnderFinger(event.touches[0]);
  },{passive:true});

  // --- Completar la disciplina desde cada tarjeta de clase ---
  const disciplinaSelect = document.getElementById('pv_disciplina');
  document.querySelectorAll('.clase-card .clase-actions a[href="#contacto"]').forEach(link => {
    link.addEventListener('click', () => {
      const disciplina = link.closest('.clase-card')?.querySelector('h3')?.textContent.trim();
      if(!disciplina || !disciplinaSelect) return;

      const matchingOption = [...disciplinaSelect.options]
        .find(option => option.textContent.trim() === disciplina);

      if(matchingOption){
        disciplinaSelect.value = matchingOption.value;
        disciplinaSelect.dispatchEvent(new Event('change', { bubbles:true }));
      }
    });
  });

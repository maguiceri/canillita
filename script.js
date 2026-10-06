// Intro: puesto cerrado → zoom a las puertas → se abren → detrás queda el interior dibujándose (inicio)
(function () {
  if (!document.getElementById('intro')) return;   // páginas internas: no hay intro ni portada

  // al recargar, siempre se arranca desde la portada (no desde donde había quedado el scroll)
  // excepción: si se llega desde otra página con un ancla (ej. index.html#activa), se va directo ahí sin intro
  const nav = performance.getEntriesByType('navigation')[0];
  const deepLink = !!location.hash && !(nav && nav.type === 'reload');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash && !deepLink) history.replaceState(null, '', location.pathname + location.search);
  const toTop = () => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    document.documentElement.style.scrollBehavior = '';
  };
  if (!deepLink) {
    toTop();
    window.addEventListener('load', toTop);
  }

  const intro = document.getElementById('intro');
  const stage = intro.querySelector('.intro__stage');
  const header = document.querySelector('.header');
  const hero = document.querySelector('.hero');
  const body = document.body;

  // cada trazo del hero se dibuja en orden (pathLength=1 permite animar con dashoffset)
  hero.querySelectorAll('.doodles path').forEach((path, i) => {
    path.setAttribute('pathLength', '1');
    path.style.setProperty('--i', i);
  });

  // header transparente sobre el hero, crema al scrollear
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onScroll = () => {
    header.classList.toggle('is-solid', window.scrollY > hero.offsetHeight - 80);
    // al scrollear, el canillita se agacha detrás del estante y "sale" del puesto
    if (!calm) hero.style.setProperty('--duck', Math.min(1, window.scrollY / (hero.offsetHeight * 0.45)).toFixed(3));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // en pantallas angostas el dibujo se recorta a los costados:
  // se achican los objetos del estante para que entren a lo ancho
  function fitProps() {
    const visible = 630 * hero.offsetWidth / hero.offsetHeight; // ancho visible en unidades del dibujo
    const k = Math.min(1, (visible * 0.94) / 600);              // los objetos ocupan 600 unidades
    hero.style.setProperty('--k', k.toFixed(3));
    hero.style.setProperty('--dx', k < 1 ? '53px' : '0px');           // al achicarse, se centran en pantalla
  }
  window.addEventListener('resize', fitProps);
  fitProps();

  // menú en celular
  const toggle = header.querySelector('.nav__toggle');
  const setMenu = open => {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.textContent = open ? 'Cerrar' : 'Menú';
  };
  const menuOpen = () => header.classList.contains('is-open');
  // se cierra al tocar afuera, al scrollear o con Escape
  document.addEventListener('click', e => { if (menuOpen() && !header.contains(e.target)) setMenu(false); });
  window.addEventListener('scroll', () => { if (menuOpen()) setMenu(false); }, { passive: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen()) setMenu(false); });
  toggle.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
  header.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  // zona de las puertas dentro de la imagen del puesto cerrado (en % de la imagen)
  const DOORS = { left: 0.1968, right: 0.8184, top: 0.3545, bottom: 0.7413 };

  function fitDoors() {
    const w = stage.offsetWidth;
    const h = stage.offsetHeight;
    const doorsW = (DOORS.right - DOORS.left) * w;
    const doorsH = (DOORS.bottom - DOORS.top) * h;
    const s = Math.max(innerWidth / doorsW, innerHeight / doorsH) * 1.02;
    // llevar el centro de las puertas al centro de la pantalla
    const cx = ((DOORS.left + DOORS.right) / 2 - 0.5) * w;
    const cy = ((DOORS.top + DOORS.bottom) / 2 - 0.5) * h;
    intro.style.setProperty('--s', s);
    intro.style.setProperty('--tx', `${-cx}px`);
    intro.style.setProperty('--ty', `${-cy}px`);
  }

  function draw() {
    body.classList.add('is-drawn');
  }

  function finish() {
    if (!intro.isConnected) return;
    intro.remove();
    body.classList.remove('is-loading');
    draw();
  }

  if (deepLink || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finish();
    return;
  }

  intro.querySelector('.intro__skip').addEventListener('click', finish);

  // espera las imágenes de la intro y las de la portada (máximo 4 s, para no trabar con mala conexión)
  const imgs = [...intro.querySelectorAll('img')];
  const ready = imgs.map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; })
  );
  hero.querySelectorAll('.doodles image').forEach(image => {
    ready.push(new Promise(r => {
      const pre = new Image();
      pre.onload = pre.onerror = r;
      pre.src = image.getAttribute('href');
    }));
  });
  const maxWait = new Promise(r => setTimeout(r, 4000));

  Promise.race([Promise.all(ready), maxWait]).then(() => {
    fitDoors();
    setTimeout(() => intro.classList.add('is-zooming'), 500);  // zoom a las puertas
    setTimeout(() => intro.classList.add('is-opening'), 1800); // se abren
    setTimeout(draw, 2000);                                     // se dibuja el interior
    setTimeout(finish, 2400);
  });
})();

// Videos en loop: se reproducen solo cuando están a la vista
(function () {
  const videos = document.querySelectorAll('.loop-video');
  if (!videos.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    videos.forEach(v => { if (v.dataset.poster) v.poster = v.dataset.poster; });
    return;
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) target.play().catch(() => {});
      else target.pause();
    });
  }, { threshold: 0.25 });

  // la imagen fija del video se pide recién cuando la sección está cerca
  const posters = new IntersectionObserver((entries, obs) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.poster = target.dataset.poster;
      obs.unobserve(target);
    });
  }, { rootMargin: '800px' });

  videos.forEach(v => {
    io.observe(v);
    if (v.dataset.poster) posters.observe(v);
  });
})();

// Números y Puestos: una sola secuencia que sigue al scroll (y vuelve atrás si subís).
//   1. El canillita, parado en el borde verde debajo de los números, los va señalando y aparecen de a uno.
//   2. Baja y desaparece.
//   3. Entra corriendo con la soga y trae los puestos desde la derecha.
(function () {
  const strip = document.querySelector('.stats');
  const section = document.querySelector('#puestos');
  if (!strip || !section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const stats = [...strip.querySelectorAll('.stat')];
  const places = [...section.querySelectorAll('.place')];
  const clamp = v => Math.max(0, Math.min(1, v));

  const pointer = document.createElement('div');
  pointer.className = 'puestos__pointer';
  pointer.setAttribute('aria-hidden', 'true');
  pointer.innerHTML = '<img src="canillita-entero.webp" alt="">';
  section.prepend(pointer);

  const runner = document.createElement('div');
  runner.className = 'place__runner';
  runner.setAttribute('aria-hidden', 'true');
  runner.innerHTML = '<img src="canillita-carrusel.webp" alt="">';
  places[0].prepend(runner);

  strip.classList.add('is-staged');
  section.classList.add('is-pulled');
  const grid = places[0].parentElement;

  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    const stripRect = strip.getBoundingClientRect();
    const oneRow = stats[stats.length - 1].offsetTop === stats[0].offsetTop;

    // 1. señalar: avanza mientras la tira de números sube por la pantalla
    // (empieza cuando el canillita, que está justo debajo de la tira, ya se ve entero)
    const a = clamp((vh - 130 - stripRect.bottom) / (vh * 0.25));
    let current = -1;
    stats.forEach((stat, i) => {
      const on = a > 0.05 + i * 0.25;
      stat.classList.toggle('is-in', on);
      if (on) current = i;
    });
    const target = stats[Math.max(0, current)];
    const x = oneRow
      ? target.offsetLeft + parseFloat(getComputedStyle(target).paddingLeft) + 90   // debajo del número
      : parseFloat(getComputedStyle(target).paddingLeft);                            // celular: fijo a la izquierda
    pointer.style.setProperty('--x', `${x}px`);

    // 2. bajar: cuando los puestos empiezan a asomar
    const gridTop = grid.getBoundingClientRect().top;
    const firstTop = gridTop + places[0].offsetTop - grid.offsetTop;
    const drop = clamp((vh * 1.02 - firstTop) / (vh * 0.2));
    pointer.style.setProperty('--drop', drop.toFixed(3));
    pointer.classList.toggle('is-in', stripRect.bottom < vh - 20 && drop < 1);

    // 3. traer los puestos (posición original de cada uno, sin contar el corrimiento)
    places.forEach((place, i) => {
      const top = gridTop + place.offsetTop - grid.offsetTop;
      const t = clamp((vh * 0.82 - top) / (vh * 0.5));
      place.style.setProperty('--pull', (1 - Math.pow(1 - t, 2)).toFixed(4));
      if (i === 0) runner.style.opacity = t > 0.94 || t === 0 ? 0 : 1;
    });
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
})();

// Centro de producción propio y Comunidad: un canillita corre tirando de la soga y trae las tarjetas.
// Cada sección entra del lado contrario a la de arriba (Puestos: derecha, Producción: izquierda,
// Comunidad: derecha). Sigue al scroll y vuelve atrás si subís.
// Los dos dibujos corren hacia la derecha; para traer desde la derecha se espejan.
[
  ['#productos', 'canillita-carrusel-cookie.webp', 760 / 650, 'left'],
  ['#comunidad', 'canillita-carrusel-comunidad.webp', 760 / 633, 'right'],
].forEach(function ([selector, image, ratio, from]) {
  const section = document.querySelector(selector);
  if (!section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const grid = section.querySelector('.grid');
  const cards = [...grid.children];
  const clamp = v => Math.max(0, Math.min(1, v));

  const runner = document.createElement('div');
  runner.className = 'grid__runner';
  runner.setAttribute('aria-hidden', 'true');
  runner.innerHTML = `<img src="${image}" alt="">`;
  if (from === 'right') runner.classList.add('is-flipped');
  grid.appendChild(runner);
  section.classList.add('is-pulled-x');
  section.style.setProperty('--dir', from === 'right' ? 1 : -1);

  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    const gridTop = grid.getBoundingClientRect().top;
    // el canillita va adelante de la primera fila: agarrado de la última tarjeta si vienen
    // desde la izquierda, o de la primera si vienen desde la derecha
    const firstRow = cards.filter(card => card.offsetTop === cards[0].offsetTop);
    const lead = from === 'right' ? firstRow[0] : firstRow[firstRow.length - 1];
    cards.forEach(card => {
      const top = gridTop + card.offsetTop;
      const t = clamp((vh * 0.82 - top) / (vh * 0.5));
      const pull = (1 - Math.pow(1 - t, 2)).toFixed(4);
      card.style.setProperty('--pull', pull);
      if (card === lead) {
        const h = Math.min(300, card.offsetHeight * 0.75);
        runner.style.height = `${h}px`;
        runner.style.width = `${h * ratio}px`;
        runner.style.left = from === 'right'
          ? `${card.offsetLeft - h * ratio + 2}px`
          : `${card.offsetLeft + card.offsetWidth - 2}px`;
        runner.style.top = `${card.offsetTop + (card.offsetHeight - h) / 2}px`;
        runner.style.setProperty('--pull', pull);
        runner.style.opacity = t > 0.94 || t === 0 ? 0 : 1;
      }
    });
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
});

// Títulos: aparecen subiendo desde abajo cuando entran en pantalla
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const titles = document.querySelectorAll('.headline, .subhead, .invest h2');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.2 });
  titles.forEach(title => {
    const inner = document.createElement('span');
    inner.className = 'rise__inner';
    while (title.firstChild) inner.appendChild(title.firstChild);
    title.appendChild(inner);
    title.classList.add('rise');
    io.observe(title);
  });
})();

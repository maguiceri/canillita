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

// Números y Puestos: una sola escena con un único canillita.
//   1. Parado en el verde, debajo de los números, los señala de a uno y van apareciendo.
//   2. Baja hasta la fila de puestos mientras cambia de pose (de señalar a correr con la soga).
//   3. Corre hacia la izquierda y trae los puestos desde la derecha.
// La escena sigue al scroll (y vuelve atrás si subís), pero avanza con una velocidad máxima:
// aunque scrollees rápido, cada paso se llega a ver.
(function () {
  const strip = document.querySelector('.stats');
  const section = document.querySelector('#puestos');
  if (!strip || !section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const stats = [...strip.querySelectorAll('.stat')];
  // celular: los puestos van en un carrusel de una fila, así que se trae la fila entera
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  const places = mobile ? [section.querySelector('.grid')] : [...section.querySelectorAll('.place')];
  places.forEach(place => { place.dataset.tx = ''; });
  const clamp = v => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const POINT_RATIO = 426 / 700;   // canillita-entero.webp
  const RUN_RATIO = 760 / 681;     // canillita-carrusel.webp

  const cani = document.createElement('div');
  cani.className = 'puestos__cani';
  cani.setAttribute('aria-hidden', 'true');
  cani.innerHTML = '<img class="puestos__cani-point" src="canillita-entero.webp" alt="">' +
                   '<img class="puestos__cani-run" src="canillita-carrusel.webp" alt="">';
  section.prepend(cani);
  const [pointImg, runImg] = cani.children;

  if (!mobile) strip.classList.add('is-staged');
  section.classList.add('is-pulled');

  // progreso de la escena: 0–1 señalar, 1–2 bajar y cambiar de pose, 2–3 traer los puestos
  let P = 0;
  const rowPull = places.map(() => 0);   // puestos de otras filas (celular): cada uno entra al llegar a él
  let running = false;
  let last = 0;

  function measure() {
    const vh = window.innerHeight;
    const secTop = section.getBoundingClientRect().top;
    const oneRow = !mobile;
    const hA = mobile ? 92 : 150;                  // alto del canillita mientras señala
    const a0 = vh - hA * 0.75;                     // empieza cuando ya se lo ve casi entero
    const a1 = a0 - vh * 0.3;
    const b1 = a1 - vh * 0.2;
    const target = clamp((a0 - secTop) / (vh * 0.3)) + clamp((a1 - secTop) / (vh * 0.2)) + clamp((b1 - secTop) / (vh * 0.5));
    const rows = places.map(place => (place.offsetTop === places[0].offsetTop
      ? null
      : clamp((vh * 0.9 - (secTop + place.offsetTop)) / (vh * 0.5))));
    return { target, rows, oneRow, hA };
  }

  function render(m) {
    const a = clamp(P);
    const e = smooth(clamp(P - 1));
    const pull = smooth(clamp(P - 2));

    // 1. números (en celular rotan solos en una barra, no dependen del scroll)
    if (!mobile) [0.05, 0.4, 0.75].forEach((at, i) => { if (stats[i]) stats[i].classList.toggle('is-in', a > at); });
    const wA = m.hA * POINT_RATIO;
    const pad = parseFloat(getComputedStyle(stats[0]).paddingLeft);
    const xs = stats.map(stat => (m.oneRow ? stat.offsetLeft + pad + 90 : pad) + wA / 2);
    let pos = 0;      // posición entre números (0, 1, 2), con un saltito al pasar de uno a otro
    let hop = 0;
    if (a > 0.25 && a < 0.4) { const f = (a - 0.25) / 0.15; pos = smooth(f); hop = Math.sin(Math.PI * f); }
    else if (a >= 0.4 && a <= 0.6) pos = 1;
    else if (a > 0.6 && a < 0.75) { const f = (a - 0.6) / 0.15; pos = 1 + smooth(f); hop = Math.sin(Math.PI * f); }
    else if (a >= 0.75) pos = 2;
    const i0 = Math.min(xs.length - 1, Math.floor(pos));
    const i1 = Math.min(xs.length - 1, i0 + 1);
    const cxA = lerp(xs[i0], xs[i1], pos - i0);
    const cyA = 14 + m.hA / 2 - hop * 16;

    // 3. puestos: todos se corren la misma distancia, la que deja al primero justo fuera de pantalla
    const first = places[0];
    const D = section.clientWidth - first.offsetLeft + 10;
    places.forEach((place, i) => {
      const t = m.rows[i] === null ? pull : smooth(rowPull[i]);
      place.style.setProperty('--tx', `${((1 - t) * D).toFixed(1)}px`);
    });

    // el canillita: de la posición de señalar a la de correr, agarrado del primer puesto
    const hR = m.oneRow ? Math.min(300, first.offsetHeight * 0.6) : 170;
    const wR = hR * RUN_RATIO;
    const cxH = first.offsetLeft + (1 - pull) * D - wR / 2 + 2;
    const cyH = first.offsetTop + (m.oneRow ? 48 : 24) + hR / 2;
    cani.style.transform = `translate(${lerp(cxA, cxH, e).toFixed(1)}px, ${lerp(cyA, cyH, e).toFixed(1)}px)`;
    cani.style.setProperty('--h', `${lerp(m.hA, hR, e).toFixed(1)}px`);
    const swap = clamp((e - 0.25) / 0.5);          // cambio de pose a mitad de la bajada
    pointImg.style.opacity = 1 - swap;
    runImg.style.opacity = swap;
    cani.classList.toggle('is-in', a > 0.01 && pull < 0.95);
  }

  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const m = measure();
    let moving = false;

    // velocidad máxima por etapa (unidades de progreso por segundo); si quedó muy atrás, se apura
    const d = m.target - P;
    if (Math.abs(d) > 0.0005) {
      let speed = P < 1 ? 0.85 : P < 2 ? 1.6 : 0.8;
      if (Math.abs(d) > 2) speed *= 1.6;
      P += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
      moving = true;
    }
    m.rows.forEach((t, i) => {
      if (t === null) return;
      const dr = t - rowPull[i];
      if (Math.abs(dr) > 0.0005) { rowPull[i] += Math.sign(dr) * Math.min(Math.abs(dr), 0.9 * dt); moving = true; }
    });

    render(m);
    if (moving) requestAnimationFrame(step);
    else running = false;
  }
  function kick() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(step);
  }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  render(measure());
  kick();
})();

// Centro de producción propio, Comunidad y Activá tu marca: un canillita corre tirando de la soga
// y trae las tarjetas. Cada sección entra del lado contrario a la de arriba (Puestos: derecha,
// Producción: izquierda, Comunidad: derecha, Activá tu marca: izquierda, Nosotros: derecha).
// Sigue al scroll y vuelve atrás si subís, con velocidad máxima para que siempre se llegue a ver.
// Los dibujos corren hacia la derecha; para traer desde la derecha se espejan.
[
  ['#productos', 'canillita-carrusel-cookie.webp', 760 / 650, 'left'],
  ['#comunidad', 'canillita-carrusel-comunidad.webp', 760 / 633, 'right'],
  ['#activa', 'canillita-marca.webp', 760 / 522, 'left'],
  // Nosotros: el canillita enamorado trae la foto de los fundadores
  ['#nosotros', 'canillita-enamorado.webp', 760 / 688, 'right', '.about', '.founders'],
].forEach(function ([selector, image, ratio, from, box, items]) {
  const section = document.querySelector(selector);
  if (!section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // celular: las tarjetas van en un carrusel de una fila y se trae la fila entera
  const mobile = !box && window.matchMedia('(max-width: 760px)').matches;
  const grid = mobile ? section : section.querySelector(box || '.grid');
  const cards = mobile ? [section.querySelector('.grid')]
    : items ? [...grid.querySelectorAll(items)] : [...grid.children];
  grid.dataset.pullBox = '';
  cards.forEach(card => { card.dataset.pull = ''; });
  const clamp = v => Math.max(0, Math.min(1, v));
  const smooth = t => t * t * (3 - 2 * t);

  const runner = document.createElement('div');
  runner.className = 'grid__runner';
  runner.setAttribute('aria-hidden', 'true');
  runner.innerHTML = `<img src="${image}" alt="">`;
  if (from === 'right') runner.classList.add('is-flipped');
  grid.appendChild(runner);
  section.classList.add('is-pulled-x');
  section.style.setProperty('--dir', from === 'right' ? 1 : -1);

  const state = cards.map(() => 0);
  let running = false;
  let last = 0;

  function render() {
    // el canillita va adelante de la primera fila: agarrado de la última tarjeta si vienen
    // desde la izquierda, o de la primera si vienen desde la derecha
    const firstRow = cards.filter(card => card.offsetTop === cards[0].offsetTop);
    const lead = from === 'right' ? firstRow[0] : firstRow[firstRow.length - 1];
    cards.forEach((card, i) => {
      const pull = smooth(state[i]).toFixed(4);
      card.style.setProperty('--pull', pull);
      if (card !== lead) return;
      const h = Math.min(mobile ? 180 : 300, card.offsetHeight * 0.75);
      runner.style.height = `${h}px`;
      runner.style.width = `${h * ratio}px`;
      runner.style.left = from === 'right'
        ? `${card.offsetLeft - h * ratio + 2}px`
        : `${card.offsetLeft + card.offsetWidth - 2}px`;
      runner.style.top = `${card.offsetTop + (card.offsetHeight - h) / 2}px`;
      runner.style.setProperty('--pull', pull);
      runner.style.opacity = state[i] > 0.96 || state[i] === 0 ? 0 : 1;
    });
  }

  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const vh = window.innerHeight;
    const gridTop = grid.getBoundingClientRect().top;
    let moving = false;
    cards.forEach((card, i) => {
      const target = clamp((vh * 0.9 - (gridTop + card.offsetTop)) / (vh * 0.55));
      const d = target - state[i];
      if (Math.abs(d) > 0.0005) { state[i] += Math.sign(d) * Math.min(Math.abs(d), 0.8 * dt); moving = true; }
    });
    render();
    if (moving) requestAnimationFrame(step);
    else running = false;
  }
  function kick() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(step);
  }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  render();
  kick();
});

// Títulos: cada palabra sube desde abajo, una tras otra, cuando el título entra en pantalla.
// Si volvés a subir y el título queda por debajo de la pantalla, se prepara para repetirse.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const titles = document.querySelectorAll('.headline, .subhead, .invest h2');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('is-in');
      else if (e.boundingClientRect.top > 0) e.target.classList.remove('is-in');
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.35 });
  titles.forEach(title => {
    const words = title.textContent.trim().split(/\s+/);
    title.setAttribute('aria-label', words.join(' '));
    title.textContent = '';
    words.forEach((word, i) => {
      const wrap = document.createElement('span');
      wrap.className = 'rise__word';
      wrap.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.className = 'rise__inner';
      inner.style.transitionDelay = `${i * 90}ms`;
      inner.textContent = word;
      wrap.appendChild(inner);
      title.appendChild(wrap);
      if (i < words.length - 1) title.appendChild(document.createTextNode(' '));
    });
    title.classList.add('rise');
    io.observe(title);
  });
})();

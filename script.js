// Intro: puesto cerrado → zoom a las puertas → se abren → detrás queda el interior dibujándose (inicio)
(function () {
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
  const onScroll = () => header.classList.toggle('is-solid', window.scrollY > hero.offsetHeight - 80);
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
  };
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

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finish();
    return;
  }

  intro.querySelector('.intro__skip').addEventListener('click', finish);

  const imgs = [...intro.querySelectorAll('img')];
  const ready = imgs.map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; })
  );

  Promise.all(ready).then(() => {
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
  if (!videos.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) target.play().catch(() => {});
      else target.pause();
    });
  }, { threshold: 0.25 });

  videos.forEach(v => io.observe(v));
})();

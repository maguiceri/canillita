// Carrusel 3D con loop automático: la foto del centro se adelanta y se agranda.
// Convierte cada .gallery en carrusel; sin JavaScript queda la grilla de fotos.
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INTERVAL = 3000;

  document.querySelectorAll('.gallery').forEach(gallery => {
    const items = [...gallery.children];
    const n = items.length;
    if (n < 2) return;

    let active = 0;
    let timer = null;
    let visible = false;
    let hovered = false;

    gallery.classList.add('is-carousel');
    gallery.setAttribute('role', 'group');
    gallery.setAttribute('aria-roledescription', 'carrusel');

    function render() {
      items.forEach((item, i) => {
        // distancia circular al centro: …, -2, -1, 0, 1, 2, …
        let o = (i - active) % n;
        if (o > n / 2) o -= n;
        if (o < -n / 2) o += n;
        const abs = Math.abs(o);
        item.style.setProperty('--o', o);
        item.style.setProperty('--abs', abs);
        item.style.zIndex = 10 - abs;
        item.classList.toggle('is-active', o === 0);
        item.classList.toggle('is-hidden', abs > 2);
      });
    }

    const go = i => { active = (i + n) % n; render(); };
    const next = () => go(active + 1);
    const prev = () => go(active - 1);

    function play() {
      stop();
      if (!reduced && visible && !hovered && !document.hidden) timer = setInterval(next, INTERVAL);
    }
    function stop() { clearInterval(timer); timer = null; }

    // flechas
    [['prev', '‹', 'Foto anterior', prev], ['next', '›', 'Foto siguiente', next]].forEach(([dir, label, text, fn]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `carousel__btn carousel__btn--${dir}`;
      btn.textContent = label;
      btn.setAttribute('aria-label', text);
      btn.addEventListener('click', () => { fn(); play(); });
      gallery.appendChild(btn);
    });

    // tocar una foto de costado la trae al centro
    items.forEach((item, i) => item.addEventListener('click', () => { if (i !== active) { go(i); play(); } }));

    // deslizar con el dedo
    let startX = null;
    gallery.addEventListener('pointerdown', e => { startX = e.clientX; });
    gallery.addEventListener('pointerup', e => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); play(); }
    });

    // se pausa con el mouse encima, fuera de pantalla o con la pestaña oculta
    gallery.addEventListener('mouseenter', () => { hovered = true; stop(); });
    gallery.addEventListener('mouseleave', () => { hovered = false; play(); });
    document.addEventListener('visibilitychange', play);
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; play(); }, { threshold: 0.3 }).observe(gallery);

    render();
    requestAnimationFrame(() => requestAnimationFrame(() => gallery.classList.add('is-ready')));
  });
})();

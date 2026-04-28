/* Recipe image lightbox.
   Click any .rh-photo or .step-figure to open a full-viewport overlay.
   Keyboard: ← → to navigate, Esc to close. Touch: swipe left/right.
*/
(function () {
  'use strict';

  const SELECTORS = '.rh-photo, .step-figure';
  const photos = Array.from(document.querySelectorAll(SELECTORS));
  if (!photos.length) return;

  // Build the image list once. Each entry: { srcset, src, sizes, alt, w, h }.
  function readImg(fig) {
    const pic = fig.querySelector('picture');
    const img = fig.querySelector('img');
    if (!img) return null;
    const sources = pic ? Array.from(pic.querySelectorAll('source')) : [];
    return {
      sources: sources.map(s => ({ type: s.type, srcset: s.srcset, sizes: s.sizes })),
      src: img.currentSrc || img.src,
      srcset: img.srcset,
      sizes: img.sizes,
      alt: img.alt || '',
      w: img.naturalWidth || img.width,
      h: img.naturalHeight || img.height,
    };
  }

  let overlay = null;
  let current = -1;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'lb-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image viewer');
    overlay.tabIndex = -1;
    overlay.innerHTML = `
      <button class="lb-close" type="button" aria-label="Close (Esc)">×</button>
      <button class="lb-nav lb-prev" type="button" aria-label="Previous image">‹</button>
      <button class="lb-nav lb-next" type="button" aria-label="Next image">›</button>
      <figure class="lb-stage">
        <picture class="lb-pic"></picture>
        <figcaption class="lb-cap" aria-live="polite"></figcaption>
      </figure>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', onOverlayClick);
    overlay.querySelector('.lb-close').addEventListener('click', close);
    overlay.querySelector('.lb-prev').addEventListener('click', (e) => { e.stopPropagation(); navigate(-1); });
    overlay.querySelector('.lb-next').addEventListener('click', (e) => { e.stopPropagation(); navigate(1); });

    // Touch swipe
    let tStartX = 0, tStartY = 0;
    overlay.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      tStartX = e.touches[0].clientX;
      tStartY = e.touches[0].clientY;
    }, { passive: true });
    overlay.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - tStartX;
      const dy = t.clientY - tStartY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) navigate(dx < 0 ? 1 : -1);
    });
    return overlay;
  }

  function onOverlayClick(e) {
    if (e.target === overlay || e.target.classList.contains('lb-stage') || e.target.tagName === 'FIGCAPTION') {
      close();
    }
  }

  function show(index) {
    if (index < 0 || index >= photos.length) return;
    const data = readImg(photos[index]);
    if (!data) return;
    current = index;
    const o = ensureOverlay();
    const pic = o.querySelector('.lb-pic');
    pic.innerHTML = '';
    for (const s of data.sources) {
      const el = document.createElement('source');
      el.type = s.type;
      el.srcset = s.srcset;
      if (s.sizes) el.sizes = '95vw';
      pic.appendChild(el);
    }
    const img = document.createElement('img');
    img.className = 'lb-img';
    img.src = data.src;
    if (data.srcset) img.srcset = data.srcset;
    img.sizes = '95vw';
    img.alt = data.alt;
    if (data.w && data.h) {
      img.width = data.w;
      img.height = data.h;
    }
    pic.appendChild(img);
    o.querySelector('.lb-cap').textContent = data.alt;
    o.querySelector('.lb-prev').hidden = photos.length <= 1;
    o.querySelector('.lb-next').hidden = photos.length <= 1;
    o.classList.add('open');
    document.body.classList.add('lb-locked');
    o.focus();
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.classList.remove('lb-locked');
    current = -1;
  }

  function navigate(dir) {
    if (current < 0) return;
    const next = (current + dir + photos.length) % photos.length;
    show(next);
  }

  function onKey(e) {
    if (current < 0) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); navigate(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1);  }
  }
  document.addEventListener('keydown', onKey);

  // Wire each photo
  photos.forEach((fig, i) => {
    fig.tabIndex = 0;
    fig.setAttribute('role', 'button');
    fig.setAttribute('aria-label', 'Open image (full size)');
    fig.addEventListener('click', (e) => { e.preventDefault(); show(i); });
    fig.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i); }
    });
  });
})();

/* ============================================================
   Storibooth — motion
   Lenis smooth scroll + GSAP ScrollTrigger + 3D parallax hero
   ============================================================ */
document.documentElement.classList.remove('no-js');
document.getElementById('yr').textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGSAP = typeof gsap !== 'undefined';
if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

/* ---------- Lenis smooth scroll (seamless) ---------- */
let lenis = null;
if (typeof Lenis !== 'undefined' && !reduceMotion) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.6 });
  window.lenis = lenis;
  // canonical Lenis + ScrollTrigger integration (reliable pinning)
  if (hasGSAP && window.ScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  // anchor links routed through Lenis for a smooth glide
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const el = document.querySelector(id);
        if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -70 }); }
      }
    });
  });
}

/* ---------- Nav shrink on scroll ---------- */
const nav = document.getElementById('nav');
const setNav = (y) => nav.classList.toggle('is-stuck', y > 40);
if (lenis) lenis.on('scroll', ({ scroll }) => setNav(scroll));
window.addEventListener('scroll', () => setNav(window.scrollY), { passive: true });
setNav(0);

/* ============================================================
   SCROLL ANIMATIONS
   ============================================================ */
if (hasGSAP && window.ScrollTrigger && !reduceMotion) {

  // ---- PINNED "lock-in": page 1 holds while the pieces align + the stroke draws ----
  // Desktop only: the pixel canvas is a desktop composition. On phones the hero is a
  // simple stacked layout, so pinning + the vw-based tweens must NOT run there.
  const pinEl = document.querySelector('[data-pin]');
  const isDesktopHero = window.matchMedia('(min-width:821px)').matches;
  if (pinEl && isDesktopHero) {
    // real trim-path: hide the line by dashing it, then draw it along its length
    const strokePath = document.querySelector('.stroke-main path');
    if (strokePath) {
      const SL = strokePath.getTotalLength();
      gsap.set(strokePath, { strokeDasharray: SL, strokeDashoffset: SL });
    }

    const lock = gsap.timeline({
      scrollTrigger: { trigger: pinEl, start: 'top top', end: '+=90%', pin: true, scrub: 0.5 }
    });
    // re-measure the pin once fonts + the booth image have loaded (avoids a bad pin size)
    const refresh = () => ScrollTrigger.refresh();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    window.addEventListener('load', refresh);
    const bImg = document.querySelector('.booth__img');
    if (bImg && !bImg.complete) bImg.addEventListener('load', refresh);
    lock
      .from('[data-wm]', { opacity: 0, ease: 'power1.out' }, 0)
      .from('[data-fl]', { opacity: 0, ease: 'power1.out' }, 0)
      .from('[data-fr]', { opacity: 0, ease: 'power1.out' }, 0)
      .from('[data-booth]', { y: '3.4vw', ease: 'none' }, 0)   // booth rises the 4% nudge as the stroke draws, then locks
      .to('.stroke-main path', { strokeDashoffset: 0, ease: 'none' }, 0)                // real trim-path: line traces itself
      .from('[data-side]', { opacity: 0, ease: 'none' }, 0)
      .from('[data-foot]', { opacity: 0, ease: 'power1.out' }, 0.35)
      .from('[data-p2l]', { opacity: 0, y: 34, ease: 'power2.out' }, 0.55)
      .from('[data-p2r]', { opacity: 0, y: 34, ease: 'power2.out' }, 0.62);

    // safety net: never leave content stuck hidden if the ticker was throttled
    setTimeout(() => {
      if (lock.progress() === 0) lock.progress(0.001).progress(0);   // nudge to force render
    }, 400);
  }

  // generic reveals
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.to(el, {
      y: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  // stagger groups
  const groups = [
    { sel: '.exp-grid', items: '.exp-card' },
    { sel: '.feat-grid', items: '.feat' },
    { sel: '.steps', items: '.step' },
    { sel: '.plans', items: '.plan' },
    { sel: '.masonry', items: 'figure' }
  ];
  groups.forEach(({ sel, items }) => {
    const parent = document.querySelector(sel);
    if (!parent) return;
    gsap.to(parent.querySelectorAll(items), {
      y: 0, opacity: 1, duration: 0.85, ease: 'power3.out', stagger: 0.1,
      scrollTrigger: { trigger: parent, start: 'top 82%' }
    });
  });

  // marquee: base loop + scroll-velocity nudge
  const track = document.querySelector('[data-marquee]');
  if (track) {
    const loop = gsap.to(track, { xPercent: -50, duration: 22, ease: 'none', repeat: -1 });
    ScrollTrigger.create({
      onUpdate: (self) => {
        const v = gsap.utils.clamp(-3, 3, self.getVelocity() / -260);
        gsap.to(loop, { timeScale: 1 + Math.abs(v), duration: 0.4, overwrite: true });
      }
    });
  }

  ScrollTrigger.refresh();

} else {
  // No GSAP / reduced motion → just show content
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    el.style.opacity = 1; el.style.transform = 'none';
  });
  const track = document.querySelector('[data-marquee]');
  if (track && !reduceMotion) track.style.animation = 'marqueeFallback 24s linear infinite';
}

/* ============================================================
   INTERACTIVE PHOTO BOOTH — live webcam + send to WhatsApp
   ============================================================ */
(function booth() {
  const screen = document.querySelector('[data-screen]');
  const controls = document.querySelector('[data-controls]');
  const polaroid = document.querySelector('[data-polaroid]');
  if (!screen || !controls || !polaroid) return;

  const video = screen.querySelector('[data-video]');
  const flash = screen.querySelector('[data-flash]');
  const countEl = screen.querySelector('[data-count]');
  const tapTarget = screen.querySelector('[data-act="snap"]');
  const btnStart = controls.querySelector('[data-act="start"]');
  const startLabel = btnStart && btnStart.querySelector('span');
  const setLabel = (t) => { if (startLabel) startLabel.textContent = t; };

  const printImg = polaroid.querySelector('[data-print]');
  const btnSend = polaroid.querySelector('[data-act="send"]');
  const btnRetake = polaroid.querySelector('[data-act="retake"]');
  const hintEl = polaroid.querySelector('.polaroid__hint');
  const setHint = (t) => { if (hintEl) hintEl.textContent = t; };

  const WA = 'https://wa.me/917356333965';
  const MSG = "Hi Storibooth! Here's my keepsake from the booth — I'd love to book Storibooth for my event.";
  // #6: when this upload endpoint is live, "Send" opens WhatsApp ALREADY ADDRESSED to our
  // number with a link to the uploaded Polaroid. If it's unavailable it silently falls back
  // to the phone's native share (image attached). Set to '' to disable and always use share.
  const UPLOAD_ENDPOINT = '/.netlify/functions/polaroid-upload';
  let stream = null, photoBlob = null, printURL = null, countTimer = null, armed = false, uploadedURL = null, starting = false;

  const show = (el, on) => { if (el) el.hidden = !on; };

  /* ---- camera on → auto 3-2-1 countdown → capture (one tap, or tap to snap now) ---- */
  async function start() {
    if (starting || screen.classList.contains('is-live')) return;   // guard double-start
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setLabel('Needs https'); setTimeout(() => setLabel('Click here'), 2600);
      return;
    }
    starting = true; btnStart.disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false
      });
      video.srcObject = stream;
      await video.play();
      show(polaroid, false); polaroid.classList.remove('is-in');
      screen.classList.add('is-live');
      armed = true;
      countdown(3);
    } catch (err) {
      const msg = (err && err.name === 'NotAllowedError') ? 'Allow camera' : 'No camera';
      setLabel(msg); setTimeout(() => setLabel('Click here'), 2600);
    } finally {
      starting = false; btnStart.disabled = false;
    }
  }

  function countdown(n) {
    clearTimeout(countTimer);
    if (!armed) return;
    if (n <= 0) { countEl.textContent = ''; capture(); return; }
    countEl.textContent = n;
    countEl.classList.remove('is-on'); void countEl.offsetWidth; countEl.classList.add('is-on');
    countTimer = setTimeout(() => countdown(n - 1), 850);
  }
  function snapNow() { if (armed) { clearTimeout(countTimer); countdown(0); } }

  async function capture() {
    if (!armed) return;
    armed = false;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw) { start(); return; }
    if (flash) { flash.style.opacity = '1'; setTimeout(() => { flash.style.opacity = '0'; }, 180); }

    const canvas = composePrint(video, vw, vh);
    await new Promise((res) => canvas.toBlob((b) => {
      photoBlob = b;
      if (printURL) URL.revokeObjectURL(printURL);
      printURL = URL.createObjectURL(b);
      printImg.src = printURL;
      res();
    }, 'image/jpeg', 0.92));

    screen.classList.remove('is-live');
    show(polaroid, true);
    polaroid.classList.remove('is-in'); void polaroid.offsetWidth; polaroid.classList.add('is-in');
    stopStream();

    // #6 — pre-upload the Polaroid in the background so, by the time they tap Send,
    // the photo link is ready to ride along. Send ALWAYS opens our number regardless
    // (never blocks on the upload) — the link is just a bonus when it's finished.
    uploadedURL = null;
    setHint('Send it straight to us on WhatsApp.');
    if (UPLOAD_ENDPOINT) {
      uploadPolaroid(photoBlob).then((u) => { uploadedURL = u; });
    }
  }

  /* ---- compose a classic POLAROID: white frame · colour photo · thick bottom strip ---- */
  function composePrint(srcEl, sw, sh) {
    const W = 1000, H = 1200;                 // polaroid proportions
    const B = 52;                             // thin top / left / right frame
    const STRIP = 236;                        // thick bottom strip (the polaroid signature)
    const photoW = W - B * 2;                 // 896
    const photoH = H - B - STRIP;             // 860
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // white polaroid stock with the faintest warm tint + edge
    ctx.fillStyle = '#fffef9';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,0,0,.05)'; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // photo window (colour, mirrored to match the selfie preview)
    const aspect = photoW / photoH;
    let cw = sw, ch = sw / aspect;
    if (ch > sh) { ch = sh; cw = sh * aspect; }
    const cx = (sw - cw) / 2, cy = (sh - ch) / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(B, B, photoW, photoH); ctx.clip();
    ctx.filter = 'contrast(1.05) saturate(1.06) brightness(1.01)';
    ctx.translate(B + photoW, B); ctx.scale(-1, 1);
    ctx.drawImage(srcEl, cx, cy, cw, ch, 0, 0, photoW, photoH);
    ctx.restore();
    // inset shadow line gives the print some depth
    ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 2;
    ctx.strokeRect(B, B, photoW, photoH);

    // caption on the bottom strip — "Storibooth" handwritten-style + date
    const stripTop = B + photoH;
    const cxc = W / 2;
    ctx.textAlign = 'center';
    const serif = fontsReady && document.fonts.check("40px 'Aphrodite'") ? 'Aphrodite' : 'Georgia';
    ctx.fillStyle = '#841515';
    ctx.font = `82px '${serif}', Georgia, serif`;
    ctx.fillText('Storibooth', cxc, stripTop + 128);

    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    ctx.fillStyle = '#b0a295';
    ctx.font = "700 21px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.save(); ctx.translate(cxc, stripTop + 172);
    letterspaced(ctx, `${dd} . ${mm} . ${yy}`, 4);
    ctx.restore();

    return canvas;
  }

  // draw centered, letter-spaced text (canvas has no letter-spacing before recent specs)
  function letterspaced(ctx, text, ls) {
    const widths = [...text].map((ch) => ctx.measureText(ch).width + ls);
    const total = widths.reduce((a, b) => a + b, 0) - ls;
    let x = -total / 2;
    const prev = ctx.textAlign; ctx.textAlign = 'left';
    for (let i = 0; i < text.length; i++) { ctx.fillText(text[i], x, 0); x += widths[i]; }
    ctx.textAlign = prev;
  }

  let fontsReady = false;
  if (document.fonts && document.fonts.ready) {
    Promise.all([
      document.fonts.load("96px 'Aphrodite'").catch(() => {}),
      document.fonts.load("600 24px 'Plus Jakarta Sans'").catch(() => {})
    ]).then(() => { fontsReady = true; });
  }

  function retake() { show(polaroid, false); polaroid.classList.remove('is-in'); start(); }

  // upload the Polaroid to our endpoint; returns a public image URL, or null on any failure
  async function uploadPolaroid(blob) {
    if (!UPLOAD_ENDPOINT || !blob) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(UPLOAD_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob, signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      return (data && data.url) ? data.url : null;
    } catch (_) { clearTimeout(timer); return null; }
  }

  // SYNCHRONOUS (no await) so iOS Safari actually opens WhatsApp.
  // ALWAYS opens our sales number chat — with the Polaroid link when the upload is ready.
  function send() {
    let text = MSG;
    if (uploadedURL) text += '\n\nHere’s my Storibooth polaroid: ' + uploadedURL;
    window.location.href = WA + '?text=' + encodeURIComponent(text);
  }

  function stopStream() { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } }

  btnStart && btnStart.addEventListener('click', start);
  // tapping anywhere on the idle booth screen also starts it (bigger, friendlier touch target)
  screen.addEventListener('click', (e) => {
    if (e.target.closest('[data-controls]')) return;                 // the button handles its own click
    if (!screen.classList.contains('is-live') && polaroid.hidden) start();
  });
  tapTarget && tapTarget.addEventListener('click', snapNow);
  btnRetake && btnRetake.addEventListener('click', retake);
  btnSend && btnSend.addEventListener('click', send);
  window.addEventListener('pagehide', stopStream);
})();

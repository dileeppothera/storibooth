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
  const pinEl = document.querySelector('[data-pin]');
  if (pinEl) {
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
  if (!screen || !controls) return;

  const video = screen.querySelector('[data-video]');
  const canvas = screen.querySelector('[data-canvas]');
  const flash = screen.querySelector('[data-flash]');
  const btnStart = controls.querySelector('[data-act="start"]');
  const btnCap = controls.querySelector('[data-act="capture"]');
  const after = controls.querySelector('[data-after]');
  const btnRetake = controls.querySelector('[data-act="retake"]');
  const btnSend = controls.querySelector('[data-act="send"]');
  const hint = controls.querySelector('[data-hint]') || {};   // in-screen button has no hint text
  const startLabel = btnStart && btnStart.querySelector('span');
  const setLabel = (t) => { if (startLabel) startLabel.textContent = t; };

  const WA = 'https://wa.me/917356333965';
  const MSG = "Hi Storibooth! Here's my photo booth snap — I'd love to book Storibooth for my event.";
  let stream = null, photoBlob = null;

  const show = (el, on) => { if (el) el.hidden = !on; };

  async function start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setLabel('Needs https'); setTimeout(() => setLabel('Click here'), 2600);
      return;
    }
    btnStart.disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false
      });
      video.srcObject = stream;
      await video.play();
      screen.classList.add('is-live'); screen.classList.remove('is-captured');
      show(btnStart, false); show(btnCap, true); show(after, false);
      hint.textContent = 'Strike a pose, then hit capture.';
    } catch (err) {
      const msg = (err && err.name === 'NotAllowedError') ? 'Allow camera' : 'No camera';
      hint.textContent = msg; setLabel(msg);
      setTimeout(() => setLabel('Click here'), 2600);
    } finally {
      btnStart.disabled = false;
    }
  }

  function capture() {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw) return;
    const aspect = screen.clientWidth / screen.clientHeight || 0.95;
    let cw = vw, ch = vw / aspect;
    if (ch > vh) { ch = vh; cw = vh * aspect; }
    const sx = (vw - cw) / 2, sy = (vh - ch) / 2;
    canvas.width = Math.round(cw); canvas.height = Math.round(ch);
    const ctx = canvas.getContext('2d');
    ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1);          // mirror to match the preview
    ctx.drawImage(video, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    if (flash) { flash.style.opacity = '1'; setTimeout(() => { flash.style.opacity = '0'; }, 170); }
    screen.classList.add('is-captured');
    canvas.toBlob((b) => { photoBlob = b; }, 'image/jpeg', 0.92);
    show(btnCap, false); show(after, true);
    hint.textContent = 'Love it? Send it straight to us on WhatsApp.';
  }

  function retake() {
    screen.classList.remove('is-captured'); screen.classList.add('is-live');
    show(after, false); show(btnCap, true);
    hint.textContent = 'Strike a pose, then hit capture.';
  }

  async function send() {
    const file = photoBlob ? new File([photoBlob], 'storibooth.jpg', { type: 'image/jpeg' }) : null;
    // best case (mostly mobile): share the actual photo into WhatsApp
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: MSG, title: 'Storibooth' }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    // fallback: save the photo, open the WhatsApp chat, ask them to attach it
    if (photoBlob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(photoBlob);
      a.download = 'storibooth-photo.jpg';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      hint.textContent = 'Photo saved — just attach it in the WhatsApp chat we opened.';
    }
    window.open(WA + '?text=' + encodeURIComponent(MSG), '_blank', 'noopener');
  }

  btnStart && btnStart.addEventListener('click', start);
  btnCap && btnCap.addEventListener('click', capture);
  btnRetake && btnRetake.addEventListener('click', retake);
  btnSend && btnSend.addEventListener('click', send);
  window.addEventListener('pagehide', () => { if (stream) stream.getTracks().forEach((t) => t.stop()); });
})();

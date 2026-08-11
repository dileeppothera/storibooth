# Storibooth — Website (developer handoff)

Marketing landing page for **Storibooth**, the photo-booth vertical of Storibod.
Single-page, **static** site — **no build step, no framework, no server code**. Just deploy the files.

---

## 1. Deploy (pick one)

The site is plain HTML/CSS/JS. Serve the contents of this folder from the web root.

- **Netlify (drag & drop):** go to <https://app.netlify.com/drop> and drag this whole folder in. Instant URL.
- **Netlify / Vercel (Git or CLI):** deploy this folder as-is. No build command, publish directory = this folder.
- **Any static host / Nginx / Apache / S3+CloudFront:** upload the files; `index.html` is the entry point.

### ⚠️ Must be served over HTTPS
The interactive photo booth uses the **camera (`getUserMedia`)**, which browsers only allow on **HTTPS** (or `localhost`). Any normal host (Netlify/Vercel/etc.) gives HTTPS automatically. Over plain `http://` the camera button will show "Needs https" and everything else still works.

### Local preview
```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

---

## 2. File structure
```
index.html          Entry point (all markup)
styles.css          All styles (design tokens in :root)
script.js           Lenis smooth-scroll, GSAP pinned "lock-in" hero, webcam booth
favicon.svg         Site icon
assets/
  booth.webp        The photo booth (transparent)
  print-*.webp      Gallery / experience prints
  flat-*.webp       Gallery flat-lays
  aphrodite.otf     Display font (self-hosted, used in the hero + logo only)
js/
  gsap.min.js       GSAP 3.12.5  (vendored, no CDN)
  scrolltrigger.min.js
  lenis.min.js      Lenis 1.0.42 (smooth scroll)
```

## 3. Dependencies
- **Vendored locally** (in `js/`): GSAP, ScrollTrigger, Lenis — no external JS calls.
- **Google Fonts (CDN):** Fraunces + Plus Jakarta Sans, loaded via the `<link>` in `<head>`. To fully self-host, download those two families and swap the link for `@font-face` rules.
- **Aphrodite** display font is already self-hosted (`assets/aphrodite.otf`).
- Images are **WebP** (supported by all modern browsers). No PNG fallback is included.

## 4. Fonts
- `Aphrodite` → hero wordmark, flanks, and the nav/footer logo **only**.
- `Fraunces` → all other section headings.
- `Plus Jakarta Sans` → body text, buttons, labels.

## 5. Common edits
- **WhatsApp number / links:** search `917356333965` in `index.html` and `script.js` (used by the nav button, hero booth "Send", per-plan buttons, and the contact block).
- **Email / Instagram:** in the Contact section of `index.html` (`storibodbooth@gmail.com`, `@storibod.moments`).
- **Prices / packages:** in the Pricing section of `index.html`.
- **Colors:** CSS custom properties at the top of `styles.css` (`--wine`, `--cream`, `--gold`, …).
- **Images:** replace files in `assets/` (keep the same names, or update the `src`s). Re-export replacements as WebP for performance.

## 6. How the hero works (so it isn't "fixed" by accident)
- The hero is a **pinned scroll sequence** (GSAP ScrollTrigger + Lenis): on scroll it holds page 1 while the booth rises, the white stroke draws itself (SVG `stroke-dashoffset` trim-path), and the text fades in — then it releases to "page 2". This is intentional; it needs `js/*.min.js` to load.
- The booth screen is a **live `<video>`** overlaid on the booth image. "Click here" → camera → capture → **Send to WhatsApp** (uses the Web Share API with the photo on mobile; on desktop it downloads the photo and opens the WhatsApp chat).
- Respects `prefers-reduced-motion` (animations reduced/disabled).

## 7. Notes / still worth doing (optional, non-blocking)
- **Test the camera** on a real phone + laptop over the live HTTPS URL.
- **Mobile QA** pass on small screens.
- **Social share:** add Open Graph / Twitter meta tags + an OG preview image for nicer link previews.
- **Perf (optional):** convert `aphrodite.otf` → `woff2` for a smaller font download.
- Gallery/Experience images are the client's brochure prints — swap for real event photos if desired.
# storibooth

# Storibooth — Website (developer handoff)

Marketing landing page for **Storibooth**, the photo-booth vertical of Storibod.
Single-page static site (HTML/CSS/JS) **plus two small Netlify functions** that let the
booth send a guest's Polaroid to WhatsApp (see §9). The site works fully as static files;
the functions are only needed to turn on the "WhatsApp pre-addressed **with** the photo" flow.

---

## 1. Deploy (pick one)

Serve the contents of this folder from the web root.

- **Netlify — recommended (Git):** connect this repo to Netlify. No build command; publish directory = repo root (`netlify.toml` is already set). This also deploys the `netlify/functions` that power the WhatsApp-with-photo flow (§9) and installs `@netlify/blobs`.
- **Netlify (drag & drop):** <https://app.netlify.com/drop> — fine for the static site, but **functions won't run** (so the booth falls back to the phone share sheet). Use the Git deploy to enable §9.
- **Vercel / any static host / Nginx / S3+CloudFront:** the static site works; the WhatsApp-with-photo endpoint (§9) would need porting to that host's functions + blob storage.

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
- **Calendly booking link:** the "Pick a time to talk" button (in the Book section) opens a Calendly popup. Set your own link once: in `index.html`, near the bottom, find `var CALENDLY_URL = '…'` and replace it with your Calendly event URL (e.g. `https://calendly.com/your-name/consultation`). See section 8 for how to get that link.
- **WhatsApp number / links:** search `917356333965` in `index.html` and `script.js` (used by the nav button, hero booth "Send", per-plan buttons, and the contact block).
- **Email / Instagram:** in the Contact section of `index.html` (`storibodbooth@gmail.com`, `@storibod.moments`).
- **Prices / packages:** in the Pricing section of `index.html`.
- **Colors:** CSS custom properties at the top of `styles.css` (`--wine`, `--cream`, `--gold`, …).
- **Images:** replace files in `assets/` (keep the same names, or update the `src`s). Re-export replacements as WebP for performance.

## 6. How the hero works (so it isn't "fixed" by accident)
- The hero is a **pinned scroll sequence** (GSAP ScrollTrigger + Lenis): on scroll it holds page 1 while the booth rises, the white stroke draws itself (SVG `stroke-dashoffset` trim-path), and the text fades in — then it releases to "page 2". This is intentional; it needs `js/*.min.js` to load. The pin runs **on desktop only** (≥821px); phones get a simple stacked hero.
- The booth screen is a **live `<video>`** overlaid on the booth image. Flow: **"Click here" → camera → auto 3-2-1 countdown (or tap the screen to snap now) → the photo is composed into a classic colour POLAROID** (white frame, thick bottom strip, "Storibooth" + date — drawn on a `<canvas>` in `script.js`, `composePrint()`; edit frame/caption/colours there) → **Send to WhatsApp** or **Retake**. How "Send" delivers the Polaroid is §9.
- Respects `prefers-reduced-motion` (animations reduced/disabled).

## 7. Notes / still worth doing (optional, non-blocking)
- **Test the camera** on a real phone + laptop over the live HTTPS URL.
- **Mobile QA** pass on small screens.
- **Social share:** add Open Graph / Twitter meta tags + an OG preview image for nicer link previews.
- **Perf (optional):** convert `aphrodite.otf` → `woff2` for a smaller font download.
- Gallery/Experience images are the client's brochure prints — swap for real event photos if desired.

## 8. Calendly setup (booking button)
The site loads Calendly's official popup widget (the `<link>`/`<script>` for `assets.calendly.com` in `<head>`). All you do is point it at your event:
1. Sign up (free) at <https://calendly.com> with the Storibooth email.
2. Create an **Event Type** (e.g. "Storibooth consultation — 15 min"). Set your availability, and under Location choose Phone / Google Meet / Zoom / WhatsApp as you like.
3. Open the event, click **Share → Copy link**. It looks like `https://calendly.com/your-name/consultation`.
4. In `index.html`, near the bottom, change `var CALENDLY_URL = '…'` to that link. Save and re-deploy.

**Current value:** `var CALENDLY_URL = 'https://calendly.com/storibodmoments'` (live). The "Pick a time to talk" button opens it in a popup; bookings/reminders handled by Calendly. No API key or backend needed.

## 9. "Send to WhatsApp with the Polaroid" (feature #6)
When the guest taps **Send to WhatsApp**, we want WhatsApp to open **addressed to the Storibooth number with the Polaroid ready**. WhatsApp's `wa.me` links can carry **text only, never an image**, so the site does this:

1. `script.js` POSTs the Polaroid JPEG to **`/.netlify/functions/polaroid-upload`** (see `UPLOAD_ENDPOINT` near the top of the booth code).
2. That function stores the image in **Netlify Blobs** and returns a public URL (served by `netlify/functions/polaroid.mjs` at `/p/:id`).
3. The site opens `wa.me/917356333965?text=…` with the message **plus a link to the Polaroid** — so the chat is pre-addressed to us and the guest just hits send; we open the link to view/save their photo.

**To turn it on:** deploy via **Netlify connected to Git** (not drag-and-drop) so the functions run and `@netlify/blobs` installs (it's in `package.json`; `netlify.toml` wires `publish=.` + `functions=netlify/functions`). Nothing else to configure — Netlify Blobs needs no keys.

**If the functions are not deployed**, `Send` **falls back automatically**: on a phone it uses the native share sheet (the actual image is attached to whatever app the guest picks, incl. WhatsApp); on desktop it downloads the Polaroid and opens the chat. So the button always works; the functions just make it pre-addressed with the image link.

- **Change the WhatsApp number:** `WA` in `script.js` **and** the `wa.me/…` links in `index.html`.
- **Use a different host's functions/storage:** re-point `UPLOAD_ENDPOINT` and port the two files in `netlify/functions/` to that host; keep the `{ "url": "…" }` JSON response shape.
- **Disable #6 entirely** (always use the share sheet): set `UPLOAD_ENDPOINT = ''` in `script.js`.

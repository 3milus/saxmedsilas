import { isFirebaseConfigured, loadFirebase } from './firebase.js';
import { isOwnDevice } from './own-device.js';
import { cacheTexts, readCachedTexts, readElementText, writeElementText } from './site-texts.js';

// ============================================================
// Mobile navigation toggle
// ============================================================
const navToggle = document.getElementById('navToggle');
const primaryNav = document.getElementById('primaryNav');

if (navToggle && primaryNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = primaryNav.classList.toggle('is-open');
    navToggle.classList.toggle('is-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  primaryNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      primaryNav.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ============================================================
// Visitor statistics (shown on admin.html)
//
// Stores one anonymous event per page view / booking / media play in
// the Firestore "events" collection. No cookies or personal data.
// Visits from the admins' own devices are flagged "internal".
// ============================================================
const isLocalPreview = ['localhost', '127.0.0.1', ''].includes(location.hostname);

function referrerHost() {
  try {
    const host = new URL(document.referrer).hostname;
    return host === location.hostname ? '' : host.slice(0, 200);
  } catch {
    return '';
  }
}

function deviceType() {
  if (window.matchMedia('(max-width: 760px)').matches) return 'mobile';
  if (window.matchMedia('(pointer: coarse)').matches) return 'tablet';
  return 'desktop';
}

async function trackEvent(type, item = '') {
  if (!isFirebaseConfigured || isLocalPreview) return;
  try {
    const { db, fs } = await loadFirebase();
    await fs.addDoc(fs.collection(db, 'events'), {
      type,
      item: item.slice(0, 100),
      path: location.pathname.slice(0, 200),
      referrer: referrerHost(),
      device: deviceType(),
      internal: isOwnDevice(),
      ts: fs.serverTimestamp(),
    });
  } catch (error) {
    console.warn('Could not record statistics:', error);
  }
}

trackEvent('pageview');

// ============================================================
// Texts, photos, videos and sound clips edited on admin.html
//
// Custom texts replace the original wording in index.html, and uploaded
// media replaces the placeholders. Anything not changed stays as it is.
// ============================================================
const editableElements = [...document.querySelectorAll('[data-edit]')];
const originalTexts = Object.fromEntries(editableElements.map((el) => [el.dataset.edit, readElementText(el)]));

function applyTexts(values) {
  editableElements.forEach((el) => {
    const custom = values[el.dataset.edit];
    const text = typeof custom === 'string' && custom.trim() ? custom : originalTexts[el.dataset.edit];
    if (readElementText(el) !== text) writeElementText(el, text);
  });
}

applyTexts(readCachedTexts());

const aboutPhoto = document.getElementById('aboutPhoto');
const mediaGrid = document.getElementById('mediaGrid');

function youtubeEmbedUrl(id) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
}

// Optimised videos come in 1080p (url) and 720p (urlSd). Phones, slow
// connections and data-saver mode get 720p; everyone else gets 1080p.
function pickVideoSource(item) {
  if (!item.urlSd) return item.url;
  const connection = navigator.connection;
  const slowConnection = connection && (
    connection.saveData
    || /2g|3g/.test(connection.effectiveType || '')
    || (connection.downlink > 0 && connection.downlink < 8)
  );
  const smallScreen = window.matchMedia('(max-width: 900px)').matches;
  return slowConnection || smallScreen ? item.urlSd : item.url;
}

// Full-size view of a photo, opened by clicking it in "Hør & se".
let lightbox;

function openLightbox(src, alt) {
  if (!lightbox) {
    lightbox = document.createElement('dialog');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('aria-label', 'Billede i fuld størrelse');
    const closeBtn = Object.assign(document.createElement('button'), {
      type: 'button', className: 'lightbox-close', textContent: '×',
    });
    closeBtn.setAttribute('aria-label', 'Luk');
    lightbox.append(closeBtn, document.createElement('img'));
    lightbox.addEventListener('click', () => lightbox.close());
    document.body.append(lightbox);
  }
  const img = lightbox.querySelector('img');
  img.src = src;
  img.alt = alt;
  lightbox.showModal();
}

function renderMediaCard(item) {
  const figure = document.createElement('figure');
  figure.className = `media-card media-card--${item.type}`;

  if (item.type === 'image') {
    // Whole image, letterboxed on a blurred copy of itself so any shape fits the 16:9 card.
    const frame = document.createElement('button');
    frame.type = 'button';
    frame.className = 'media-frame';
    const absoluteUrl = new URL(item.url, location.href).href;
    frame.style.setProperty('--media-bg', `url("${absoluteUrl.replace(/"/g, '%22')}")`);
    frame.setAttribute('aria-label', `Vis billedet i fuld størrelse${item.title ? `: ${item.title}` : ''}`);
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.title || 'Foto af Silas';
    img.loading = 'lazy';
    frame.append(img);
    frame.addEventListener('click', () => openLightbox(item.url, img.alt));
    figure.append(frame);
  } else if (item.type === 'video') {
    const video = document.createElement('video');
    video.src = pickVideoSource(item);
    video.controls = true;
    // With a cover image nothing is downloaded until the visitor presses play.
    if (item.poster) video.poster = item.poster;
    video.preload = item.poster ? 'none' : 'metadata';
    video.playsInline = true;
    // Discourage casual downloading: no download button, picture-in-picture or right-click menu.
    video.setAttribute('controlslist', 'nodownload');
    video.disablePictureInPicture = true;
    video.addEventListener('contextmenu', (event) => event.preventDefault());
    video.addEventListener('play', () => trackEvent('media_play', item.title || item.id), { once: true });
    figure.append(video);
  } else if (item.type === 'audio') {
    const cover = document.createElement('img');
    cover.src = 'assets/audio-cover.svg';
    cover.alt = '';
    const audio = document.createElement('audio');
    audio.src = item.url;
    audio.controls = true;
    audio.preload = 'none';
    audio.addEventListener('play', () => trackEvent('media_play', item.title || item.id), { once: true });
    figure.append(cover, audio);
  } else if (item.type === 'youtube') {
    const iframe = document.createElement('iframe');
    iframe.src = youtubeEmbedUrl(item.youtubeId);
    iframe.title = item.title || 'Video';
    iframe.loading = 'lazy';
    iframe.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    figure.append(iframe);
  } else {
    return null;
  }

  if (item.title) {
    const caption = document.createElement('figcaption');
    caption.textContent = item.title;
    figure.append(caption);
  }
  return figure;
}

async function loadSiteContent() {
  if (!isFirebaseConfigured) return;
  try {
    const { db, fs } = await loadFirebase();
    const [textsSnap, aboutSnap, itemsSnap] = await Promise.all([
      fs.getDoc(fs.doc(db, 'site', 'texts')),
      fs.getDoc(fs.doc(db, 'site', 'about')),
      fs.getDocs(fs.query(fs.collection(db, 'mediaItems'), fs.orderBy('order'))),
    ]);

    const texts = textsSnap.data()?.values || {};
    applyTexts(texts);
    cacheTexts(texts);

    const about = aboutSnap.data();
    if (about?.url && aboutPhoto) {
      aboutPhoto.src = about.url;
      aboutPhoto.alt = 'Foto af Silas Steengaard';
    }

    const cards = itemsSnap.docs
      .map((doc) => renderMediaCard({ id: doc.id, ...doc.data() }))
      .filter(Boolean);
    if (cards.length && mediaGrid) {
      mediaGrid.replaceChildren(...cards);
    }
  } catch (error) {
    console.warn('Could not load texts and media:', error);
  }
}

loadSiteContent();

// ============================================================
// Booking form (sent by email via FormSubmit.co)
//
// The first submission triggers an activation email to Silas from
// FormSubmit. Once he clicks "Activate", all bookings are delivered
// to the address below. See README.md.
// ============================================================
const BOOKING_ENDPOINT = 'https://formsubmit.co/ajax/silas.sax@live.com';

const form = document.getElementById('bookingForm');
const submitBtn = document.getElementById('submitBtn');
const statusEl = document.getElementById('formStatus');

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.classList.remove('is-success', 'is-error', 'is-pending');
  if (type) statusEl.classList.add(type);
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus('Udfyld venligst navn, en gyldig email og type af arrangement.', 'is-error');
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());

    submitBtn.disabled = true;
    setStatus('Sender din forespørgsel...', 'is-pending');

    try {
      const response = await fetch(BOOKING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Ny booking-forespørgsel fra ${data.name}`,
          _replyto: data.email,
          _template: 'table',
          _captcha: 'false',
          Navn: data.name,
          Email: data.email,
          Telefon: data.phone || '-',
          'Type af arrangement': data.eventType,
          Dato: data.eventDate || '-',
          Sted: data.location || '-',
          Besked: data.message || '-',
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || String(result.success) !== 'true') {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      form.reset();
      trackEvent('booking');
      setStatus('Tak! Din forespørgsel er sendt. Silas vender tilbage hurtigst muligt.', 'is-success');
    } catch (error) {
      console.error('Booking submission failed:', error);
      setStatus(
        'Der opstod en fejl. Kontakt venligst Silas direkte på telefon eller email herunder.',
        'is-error'
      );
    } finally {
      submitBtn.disabled = false;
    }
  });
}

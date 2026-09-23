import { isFirebaseConfigured, loadFirebase, sdkUrl } from './firebase.js';

// ============================================================
// Helpers
// ============================================================
const $ = (id) => document.getElementById(id);

const VIEWS = ['setupView', 'loadingView', 'loginView', 'deniedView', 'dashboardView'];

function showView(id) {
  VIEWS.forEach((view) => { $(view).hidden = view !== id; });
}

function setStatus(el, message, type) {
  el.textContent = message;
  el.classList.remove('is-success', 'is-error', 'is-pending');
  if (type) el.classList.add(type);
}

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const numberFormat = new Intl.NumberFormat('da-DK');
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const shortDate = (date) => date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
const longDate = (date) => date.toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'long' });

function errorText(error) {
  const messages = {
    'auth/invalid-credential': 'Forkert email eller adgangskode.',
    'auth/wrong-password': 'Forkert email eller adgangskode.',
    'auth/user-not-found': 'Forkert email eller adgangskode.',
    'auth/invalid-email': 'Emailen er ikke gyldig.',
    'auth/too-many-requests': 'For mange forsøg. Vent lidt, og prøv igen.',
    'auth/network-request-failed': 'Ingen forbindelse. Tjek internettet, og prøv igen.',
    'permission-denied': 'Ingen tilladelse. Er firestore.rules udrullet, og er du admin?',
    'storage/unauthorized': 'Ingen tilladelse til at uploade. Er storage.rules udrullet?',
    'storage/canceled': 'Upload blev annulleret.',
    'storage/quota-exceeded': 'Lagerpladsen i Firebase er brugt op.',
  };
  return messages[error?.code] || `Noget gik galt (${error?.code || error?.message || 'ukendt fejl'}).`;
}

// ============================================================
// Start
// ============================================================
if (!isFirebaseConfigured) {
  showView('setupView');
} else {
  init().catch((error) => {
    console.error(error);
    $('loadingView').textContent = 'Kunne ikke indlæse Firebase. Genindlæs siden, og prøv igen.';
  });
}

async function init() {
  const [{ app, db, fs }, authSdk, storageSdk] = await Promise.all([
    loadFirebase(),
    import(sdkUrl('auth')),
    import(sdkUrl('storage')),
  ]);
  const auth = authSdk.getAuth(app);
  const storage = storageSdk.getStorage(app);

  setupAuth({ auth, authSdk, db, fs });
  setupTabs();
  setupStats({ db, fs });
  setupMedia({ db, fs, storage, storageSdk });
}

// ============================================================
// Login
// ============================================================
let onAdminReady = () => {};

function setupAuth({ auth, authSdk, db, fs }) {
  const loginForm = $('loginForm');
  const loginStatus = $('loginStatus');

  authSdk.onAuthStateChanged(auth, async (user) => {
    if (!user) {
      $('userBox').hidden = true;
      showView('loginView');
      return;
    }

    $('userEmail').textContent = user.email || '';
    $('userBox').hidden = false;
    showView('loadingView');

    let isAdmin = false;
    try {
      isAdmin = (await fs.getDoc(fs.doc(db, 'admins', user.uid))).exists();
    } catch (error) {
      console.error('Admin check failed:', error);
    }

    if (!isAdmin) {
      $('deniedUid').textContent = user.uid;
      showView('deniedView');
      return;
    }

    showView('dashboardView');
    onAdminReady();
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!loginForm.checkValidity()) {
      loginForm.reportValidity();
      return;
    }

    $('loginBtn').disabled = true;
    setStatus(loginStatus, 'Logger ind…', 'is-pending');
    try {
      await authSdk.signInWithEmailAndPassword(auth, $('loginEmail').value.trim(), $('loginPassword').value);
      setStatus(loginStatus, '');
      loginForm.reset();
    } catch (error) {
      setStatus(loginStatus, errorText(error), 'is-error');
    } finally {
      $('loginBtn').disabled = false;
    }
  });

  $('resetBtn').addEventListener('click', async () => {
    const email = $('loginEmail').value.trim();
    if (!email) {
      setStatus(loginStatus, 'Skriv din email i feltet ovenfor, og tryk igen.', 'is-error');
      $('loginEmail').focus();
      return;
    }
    try {
      await authSdk.sendPasswordResetEmail(auth, email);
      setStatus(loginStatus, 'Hvis kontoen findes, er der sendt et link til at nulstille adgangskoden.', 'is-success');
    } catch (error) {
      setStatus(loginStatus, errorText(error), 'is-error');
    }
  });

  $('signOutBtn').addEventListener('click', () => authSdk.signOut(auth));
}

function setupTabs() {
  const tabs = [['statsTabBtn', 'statsTab'], ['mediaTabBtn', 'mediaTab']];
  tabs.forEach(([buttonId]) => {
    $(buttonId).addEventListener('click', () => {
      tabs.forEach(([otherButtonId, panelId]) => {
        const active = otherButtonId === buttonId;
        $(otherButtonId).classList.toggle('is-active', active);
        $(otherButtonId).setAttribute('aria-selected', String(active));
        $(panelId).hidden = !active;
      });
    });
  });
}

// ============================================================
// Statistics
// ============================================================
const DEVICE_LABELS = { mobile: 'Mobil', tablet: 'Tablet', desktop: 'Computer' };

function setupStats({ db, fs }) {
  const statsStatus = $('statsStatus');
  let rangeDays = 30;
  let requestId = 0;

  async function loadStats() {
    const thisRequest = ++requestId;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (rangeDays - 1));

    setStatus(statsStatus, 'Henter statistik…', 'is-pending');
    try {
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, 'events'),
        fs.where('ts', '>=', fs.Timestamp.fromDate(since)),
        fs.orderBy('ts')
      ));
      if (thisRequest !== requestId) return;
      renderStats(snap.docs.map((doc) => doc.data()).filter((event) => event.ts), since, rangeDays);
      setStatus(statsStatus, '');
    } catch (error) {
      if (thisRequest !== requestId) return;
      console.error(error);
      setStatus(statsStatus, `Kunne ikke hente statistik. ${errorText(error)}`, 'is-error');
    }
  }

  $('rangePicker').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-days]');
    if (!button) return;
    $('rangePicker').querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === button));
    rangeDays = Number(button.dataset.days);
    loadStats();
  });

  const previousReady = onAdminReady;
  onAdminReady = () => { previousReady(); loadStats(); };
}

function renderStats(events, since, rangeDays) {
  const views = events.filter((e) => e.type === 'pageview');
  const bookings = events.filter((e) => e.type === 'booking');
  const plays = events.filter((e) => e.type === 'media_play');

  $('statViews').textContent = numberFormat.format(views.length);
  $('statBookings').textContent = numberFormat.format(bookings.length);
  $('statPlays').textContent = numberFormat.format(plays.length);
  $('statConversion').textContent = views.length
    ? (bookings.length / views.length * 100).toLocaleString('da-DK', { maximumFractionDigits: 1 })
    : '–';

  const days = [];
  for (let i = 0; i < rangeDays; i++) {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    days.push({ date, key: dayKey(date), views: 0, bookings: 0 });
  }
  const dayByKey = new Map(days.map((day) => [day.key, day]));
  events.forEach((event) => {
    const day = dayByKey.get(dayKey(event.ts.toDate()));
    if (!day) return;
    if (event.type === 'pageview') day.views++;
    if (event.type === 'booking') day.bookings++;
  });

  renderChart(days);
  $('dailyTable').replaceChildren(...[...days].reverse().map((day) =>
    el('tr', {}, el('td', { textContent: longDate(day.date) }),
      el('td', { textContent: numberFormat.format(day.views) }),
      el('td', { textContent: numberFormat.format(day.bookings) }))
  ));

  renderRankList($('referrerList'), countBy(views, (e) => e.referrer || 'Direkte / ukendt'));
  renderRankList($('deviceList'), countBy(views, (e) => DEVICE_LABELS[e.device] || e.device));
  renderRankList($('playsList'), countBy(plays, (e) => e.item || 'Ukendt klip'), 'Ingen afspilninger endnu');
}

function countBy(items, keyFn) {
  const counts = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function niceMax(value) {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 2.5, 5, 10].map((step) => step * power).find((candidate) => candidate >= value);
}

function renderChart(days) {
  const bars = $('chartBars');
  const tooltip = $('chartTooltip');
  const chart = $('viewsChart');
  const max = niceMax(Math.max(0, ...days.map((day) => day.views)));
  const total = days.reduce((sum, day) => sum + day.views, 0);

  $('chartMax').textContent = numberFormat.format(max);
  bars.setAttribute('aria-label',
    `Sidevisninger pr. dag fra ${shortDate(days[0].date)} til ${shortDate(days.at(-1).date)}, i alt ${numberFormat.format(total)}. Se tabellen for tal.`);

  function showTooltip(bar, day) {
    tooltip.replaceChildren(
      el('strong', { textContent: longDate(day.date) }), el('br'),
      `${numberFormat.format(day.views)} sidevisninger · ${numberFormat.format(day.bookings)} bookinger`
    );
    tooltip.hidden = false;
    const chartRect = chart.getBoundingClientRect();
    const fillRect = bar.firstChild.getBoundingClientRect();
    const half = tooltip.offsetWidth / 2;
    const center = fillRect.left + fillRect.width / 2 - chartRect.left;
    tooltip.style.left = `${Math.min(Math.max(center, half), chartRect.width - half)}px`;
    tooltip.style.top = `${fillRect.top - chartRect.top}px`;
  }
  const hideTooltip = () => { tooltip.hidden = true; };

  bars.replaceChildren(...days.map((day) => {
    const fill = el('span');
    fill.style.height = `${(day.views / max) * 100}%`;
    const bar = el('div', { className: 'chart-bar', tabIndex: 0 }, fill);
    bar.setAttribute('aria-label', `${longDate(day.date)}: ${day.views} sidevisninger`);
    bar.addEventListener('mouseenter', () => showTooltip(bar, day));
    bar.addEventListener('focus', () => showTooltip(bar, day));
    bar.addEventListener('mouseleave', hideTooltip);
    bar.addEventListener('blur', hideTooltip);
    return bar;
  }));

  const middle = days[Math.floor(days.length / 2)];
  $('chartXLabels').replaceChildren(
    ...[days[0], middle, days.at(-1)].map((day) => el('span', { textContent: shortDate(day.date) }))
  );
}

function renderRankList(list, counts, emptyText = 'Ingen data endnu') {
  const entries = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!entries.length) {
    list.replaceChildren(el('li', { className: 'rank-empty', textContent: emptyText }));
    return;
  }
  const max = entries[0][1];
  list.replaceChildren(...entries.map(([name, count]) => {
    const meterFill = el('span');
    meterFill.style.width = `${(count / max) * 100}%`;
    return el('li', {},
      el('span', { className: 'rank-name', textContent: name, title: name }),
      el('span', { className: 'rank-count', textContent: numberFormat.format(count) }),
      el('span', { className: 'rank-meter' }, meterFill));
  }));
}

// ============================================================
// Photos, videos and sound clips
// ============================================================
const TYPE_LABELS = { image: 'Billede', video: 'Video', audio: 'Lyd', youtube: 'YouTube' };

function parseYoutubeId(url) {
  const match = String(url).match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return match ? match[1] : null;
}

function safeFileName(name) {
  return name.toLowerCase().normalize('NFKD').replace(/[^\w.-]+/g, '-').slice(-80);
}

function setupMedia({ db, fs, storage, storageSdk }) {
  let aboutData = null;
  let items = [];

  function uploadFile(file, progressEl) {
    const path = `media/${Date.now()}-${safeFileName(file.name)}`;
    const task = storageSdk.uploadBytesResumable(storageSdk.ref(storage, path), file, {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000',
    });
    progressEl.value = 0;
    progressEl.hidden = false;
    return new Promise((resolve, reject) => {
      task.on('state_changed',
        (snapshot) => { progressEl.value = (snapshot.bytesTransferred / snapshot.totalBytes) * 100; },
        reject,
        async () => resolve({ path, url: await storageSdk.getDownloadURL(task.snapshot.ref) }));
    }).finally(() => { progressEl.hidden = true; });
  }

  async function deleteStoredFile(path) {
    if (!path) return;
    try {
      await storageSdk.deleteObject(storageSdk.ref(storage, path));
    } catch (error) {
      if (error.code !== 'storage/object-not-found') console.warn('Could not delete file:', error);
    }
  }

  async function loadMedia() {
    const listStatus = $('listStatus');
    try {
      const [aboutSnap, itemsSnap] = await Promise.all([
        fs.getDoc(fs.doc(db, 'site', 'about')),
        fs.getDocs(fs.query(fs.collection(db, 'mediaItems'), fs.orderBy('order'))),
      ]);
      aboutData = aboutSnap.data() || null;
      if (aboutData?.url) $('aboutPreview').src = aboutData.url;
      items = itemsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderList();
      setStatus(listStatus, '');
    } catch (error) {
      console.error(error);
      setStatus(listStatus, `Kunne ikke hente medier. ${errorText(error)}`, 'is-error');
    }
  }

  // --- About photo ---
  $('aboutForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = $('aboutStatus');
    const file = $('aboutFile').files[0];
    if (!file || !file.type.startsWith('image/')) {
      setStatus(status, 'Vælg en billedfil først.', 'is-error');
      return;
    }

    const button = event.submitter;
    button.disabled = true;
    setStatus(status, 'Uploader…', 'is-pending');
    let uploaded = null;
    try {
      uploaded = await uploadFile(file, $('aboutProgress'));
      const newData = { url: uploaded.url, path: uploaded.path };
      await fs.setDoc(fs.doc(db, 'site', 'about'), { ...newData, updatedAt: fs.serverTimestamp() });
      const previousPath = aboutData?.path;
      aboutData = newData;
      await deleteStoredFile(previousPath);
      $('aboutPreview').src = uploaded.url;
      $('aboutForm').reset();
      setStatus(status, 'Fotoet er opdateret på forsiden.', 'is-success');
    } catch (error) {
      console.error(error);
      if (uploaded && uploaded.path !== aboutData?.path) await deleteStoredFile(uploaded.path);
      setStatus(status, errorText(error), 'is-error');
    } finally {
      button.disabled = false;
    }
  });

  // --- Add media ---
  const addForm = $('addMediaForm');
  addForm.addEventListener('change', (event) => {
    if (event.target.name !== 'source') return;
    const isYoutube = event.target.value === 'youtube';
    $('fileRow').hidden = isYoutube;
    $('youtubeRow').hidden = !isYoutube;
  });

  addForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = $('mediaStatus');
    const source = addForm.elements.source.value;
    const title = $('mediaTitle').value.trim();
    let item;

    if (source === 'youtube') {
      const youtubeId = parseYoutubeId($('mediaYoutube').value);
      if (!youtubeId) {
        setStatus(status, 'Indsæt et gyldigt YouTube-link.', 'is-error');
        return;
      }
      item = { type: 'youtube', youtubeId, url: `https://www.youtube.com/watch?v=${youtubeId}`, path: '' };
    } else {
      const file = $('mediaFile').files[0];
      const type = file?.type.split('/')[0];
      if (!file) {
        setStatus(status, 'Vælg en fil først.', 'is-error');
        return;
      }
      if (!['image', 'video', 'audio'].includes(type)) {
        setStatus(status, 'Filtypen understøttes ikke. Vælg en video, lydfil eller et billede.', 'is-error');
        return;
      }
      item = { type, file };
    }

    $('addMediaBtn').disabled = true;
    setStatus(status, item.file ? 'Uploader…' : 'Gemmer…', 'is-pending');
    let uploaded = null;
    try {
      if (item.file) {
        uploaded = await uploadFile(item.file, $('mediaProgress'));
        item = { type: item.type, url: uploaded.url, path: uploaded.path };
      }
      const order = items.length ? Math.max(...items.map((i) => i.order ?? 0)) + 1 : 0;
      const data = { ...item, title, order, createdAt: fs.serverTimestamp() };
      const ref = await fs.addDoc(fs.collection(db, 'mediaItems'), data);
      items.push({ id: ref.id, ...data });
      renderList();
      addForm.reset();
      $('fileRow').hidden = false;
      $('youtubeRow').hidden = true;
      setStatus(status, 'Tilføjet – det vises nu på forsiden.', 'is-success');
    } catch (error) {
      console.error(error);
      if (uploaded) await deleteStoredFile(uploaded.path);
      setStatus(status, errorText(error), 'is-error');
    } finally {
      $('addMediaBtn').disabled = false;
    }
  });

  // --- List: rename, reorder, delete ---
  async function moveItem(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    const batch = fs.writeBatch(db);
    reordered.forEach((item, position) => {
      if (item.order !== position) batch.update(fs.doc(db, 'mediaItems', item.id), { order: position });
    });
    try {
      await batch.commit();
      reordered.forEach((item, position) => { item.order = position; });
      items = reordered;
      renderList();
      setStatus($('listStatus'), '');
    } catch (error) {
      setStatus($('listStatus'), errorText(error), 'is-error');
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Slet “${item.title || TYPE_LABELS[item.type]}” fra forsiden? Det kan ikke fortrydes.`)) return;
    try {
      await fs.deleteDoc(fs.doc(db, 'mediaItems', item.id));
      await deleteStoredFile(item.path);
      items = items.filter((i) => i.id !== item.id);
      renderList();
      setStatus($('listStatus'), 'Slettet.', 'is-success');
    } catch (error) {
      setStatus($('listStatus'), errorText(error), 'is-error');
    }
  }

  async function renameItem(item, title) {
    try {
      await fs.updateDoc(fs.doc(db, 'mediaItems', item.id), { title });
      item.title = title;
      setStatus($('listStatus'), 'Titel gemt.', 'is-success');
    } catch (error) {
      setStatus($('listStatus'), errorText(error), 'is-error');
    }
  }

  function thumbnail(item) {
    if (item.type === 'video') {
      return el('video', { className: 'media-thumb', src: `${item.url}#t=0.5`, muted: true, preload: 'metadata' });
    }
    const src = {
      image: item.url,
      audio: 'assets/audio-cover.svg',
      youtube: `https://i.ytimg.com/vi/${encodeURIComponent(item.youtubeId)}/mqdefault.jpg`,
    }[item.type];
    return el('img', { className: 'media-thumb', src, alt: '', loading: 'lazy' });
  }

  function renderList() {
    $('mediaEmpty').hidden = items.length > 0;
    $('mediaList').replaceChildren(...items.map((item, index) => {
      const titleInput = el('input', { type: 'text', value: item.title || '', maxLength: 100, placeholder: 'Titel / billedtekst' });
      titleInput.setAttribute('aria-label', 'Titel');
      titleInput.addEventListener('change', () => renameItem(item, titleInput.value.trim()));

      const up = el('button', { type: 'button', className: 'icon-btn', textContent: '↑ Op', disabled: index === 0 });
      const down = el('button', { type: 'button', className: 'icon-btn', textContent: '↓ Ned', disabled: index === items.length - 1 });
      const remove = el('button', { type: 'button', className: 'icon-btn icon-btn--danger', textContent: 'Slet' });
      up.addEventListener('click', () => moveItem(index, -1));
      down.addEventListener('click', () => moveItem(index, 1));
      remove.addEventListener('click', () => deleteItem(item));

      return el('li', { className: 'media-row' },
        thumbnail(item),
        el('div', { className: 'media-info' },
          el('span', { className: 'media-type', textContent: TYPE_LABELS[item.type] || item.type }),
          titleInput),
        el('div', { className: 'media-actions' }, up, down, remove));
    }));
  }

  const previousReady = onAdminReady;
  onAdminReady = () => { previousReady(); loadMedia(); };
}

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
// Firebase booking form
//
// SETUP (see README.md for full instructions):
// 1. Create a Firebase project at https://console.firebase.google.com
// 2. Enable "Firestore Database" (production mode).
// 3. Register a Web App in Project Settings and paste the config below.
// 4. Set Firestore security rules to allow public "create" only
//    (rules provided in README.md).
// 5. Upgrade to the "Blaze" plan and install the official
//    "Trigger Email from Firestore" extension, configured to watch
//    the "mail" collection, so bookings trigger an email automatically.
// ============================================================
const firebaseConfig = {
  apiKey: "TODO_API_KEY",
  authDomain: "TODO_PROJECT_ID.firebaseapp.com",
  projectId: "TODO_PROJECT_ID",
  storageBucket: "TODO_PROJECT_ID.appspot.com",
  messagingSenderId: "TODO_SENDER_ID",
  appId: "TODO_APP_ID",
};

const isFirebaseConfigured = !Object.values(firebaseConfig).some((value) =>
  String(value).startsWith('TODO')
);

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

    if (!isFirebaseConfigured) {
      setStatus(
        'Booking-formularen er ved at blive sat op. Kontakt venligst Silas direkte på telefon eller email herunder.',
        'is-error'
      );
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());

    submitBtn.disabled = true;
    setStatus('Sender din forespørgsel...', 'is-pending');

    try {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const { getFirestore, collection, addDoc, serverTimestamp } = await import(
        'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
      );

      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);

      await addDoc(collection(db, 'bookings'), {
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        eventType: data.eventType,
        eventDate: data.eventDate || '',
        location: data.location || '',
        message: data.message || '',
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'mail'), {
        to: ['silas.sax@live.com'],
        message: {
          subject: `Ny booking-forespørgsel fra ${data.name}`,
          text: [
            `Navn: ${data.name}`,
            `Email: ${data.email}`,
            `Telefon: ${data.phone || '-'}`,
            `Type af arrangement: ${data.eventType}`,
            `Dato: ${data.eventDate || '-'}`,
            `Sted: ${data.location || '-'}`,
            '',
            'Besked:',
            data.message || '-',
          ].join('\n'),
        },
      });

      form.reset();
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

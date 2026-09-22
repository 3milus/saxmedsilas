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

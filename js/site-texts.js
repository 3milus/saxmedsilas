// ============================================================
// Editable texts on the front page
//
// Elements in index.html marked with data-edit="<key>" can be changed on
// admin.html. Custom texts are stored in Firestore (site/texts, field
// "values") and cached in localStorage so returning visitors don't see
// the original text flash first. Texts are always set as plain text.
// ============================================================
export const TEXTS_CACHE_KEY = 'saxmedsilas:texts';

// data-edit-type="paragraphs": one <p> per paragraph, separated by a blank line.
export function readElementText(el) {
  const clean = (text) => text.replace(/\s+/g, ' ').trim();
  if (el.dataset.editType === 'paragraphs') {
    return [...el.querySelectorAll('p')].map((p) => clean(p.textContent)).join('\n\n');
  }
  return clean(el.textContent);
}

export function writeElementText(el, value) {
  if (el.dataset.editType === 'paragraphs') {
    const paragraphs = value.split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean);
    el.replaceChildren(...paragraphs.map((text) => Object.assign(document.createElement('p'), { textContent: text })));
  } else {
    el.textContent = value;
  }
}

export function readCachedTexts() {
  try {
    return JSON.parse(localStorage.getItem(TEXTS_CACHE_KEY)) || {};
  } catch {
    return {};
  }
}

export function cacheTexts(values) {
  try {
    localStorage.setItem(TEXTS_CACHE_KEY, JSON.stringify(values));
  } catch {
    // Storage unavailable (private mode etc.) — texts still load from Firestore.
  }
}

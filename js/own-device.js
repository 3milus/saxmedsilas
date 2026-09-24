// ============================================================
// "Own device" mark
//
// Browsers that have logged in on admin.html are marked, so their visits
// to the front page are recorded as the admins' own visits and can be
// shown separately in the statistics. Stored only in this browser.
// ============================================================
const OWN_DEVICE_KEY = 'saxmedsilas:own-device';

function read() {
  try {
    return localStorage.getItem(OWN_DEVICE_KEY);
  } catch {
    return null;
  }
}

export function isOwnDevice() {
  return read() === '1';
}

// False until the device has been marked or unmarked at least once.
export function hasOwnDeviceChoice() {
  return read() !== null;
}

export function setOwnDevice(isOwn) {
  try {
    localStorage.setItem(OWN_DEVICE_KEY, isOwn ? '1' : '0');
    return true;
  } catch {
    return false;
  }
}

import { clipboard, island, language, ready, settings, storage } from '/__sdk/index.js';
import { showInIsland } from './island.js';
import { lookUpIpv6, lookUpPlace } from './lookup.js';
import { canDrawFlags, countryName, flag, moved } from './place.js';
import { formatAgo, formatTime, TEXTS } from './texts.js';

/** Opening the island checks again when the last check is older than this. */
const RECHECK_ON_OPEN = 20 * 1000;
/** After a failed check, the next try comes this soon even with a longer interval. */
const RETRY_AFTER_FAILURE = 60 * 1000;
/** How long the widget says where the computer was seen before. */
const CHANGE_SHOWN = 10 * 60 * 1000;
const COPIED_SHOWN = 1400;

const $ = (id) => document.getElementById(id);
const view = {
  card: $('card'),
  place: $('place'),
  flag: $('flag'),
  city: $('city'),
  region: $('region'),
  refresh: $('refresh'),
  ip: $('ip'),
  ipText: $('ip-text'),
  ipNote: $('ip-note'),
  ip6: $('ip6'),
  ip6Text: $('ip6-text'),
  ip6Note: $('ip6-note'),
  provider: $('provider'),
  footer: $('footer'),
  change: $('change'),
  status: $('status'),
  retry: $('retry'),
  empty: $('empty'),
  emptyTitle: $('empty-title'),
  emptyHint: $('empty-hint'),
  emptyRetry: $('empty-retry'),
};

let text = TEXTS.en;
let lang = 'en';
let options;

/** @type {import('./lookup.js').Place | null} The last place found, kept while checks fail. */
let place = null;
let ipv6 = '';
/** When `place` was found. */
let checkedAt = 0;
/** @type {{ from: { ip: string, countryCode: string, city: string, name: string }, at: number } | null} */
let change = null;
let checking = false;
/** @type {Promise<void> | null} */
let ipv6Lookup = null;
let failed = false;
/** When the last check started, successful or not. */
let lastAttempt = 0;
let islandOpen = false;

function placeName(p) {
  return p.city || p.region || countryName(lang, p) || '';
}

function save() {
  storage.set('last', { place, ipv6, checkedAt }).catch((error) => console.warn('could not save the place', error));
  storage.set('change', change).catch((error) => console.warn('could not save the change', error));
}

async function check() {
  if (checking) return;
  checking = true;
  lastAttempt = Date.now();
  render();
  checkIpv6();
  try {
    const next = await lookUpPlace();
    if (place && moved(place, next)) {
      change = { from: { ip: place.ip, countryCode: place.countryCode, city: place.city, name: placeName(place) }, at: Date.now() };
      view.place.classList.remove('flash');
      requestAnimationFrame(() => view.place.classList.add('flash'));
    }
    place = next;
    checkedAt = Date.now();
    failed = false;
    save();
  } catch (error) {
    console.warn('could not find the place', error);
    failed = true;
  } finally {
    checking = false;
    render();
  }
}

/**
 * Looks up the IPv6 address beside the place. It is shown when it comes, since a computer
 * without IPv6 may take a while to fail.
 */
function checkIpv6() {
  if (ipv6Lookup) return;
  if (!options.showIpv6) {
    ipv6 = '';
    return;
  }
  ipv6Lookup = lookUpIpv6().then((address) => {
    ipv6Lookup = null;
    if (failed) return;
    ipv6 = address;
    if (place) save();
    render();
  });
}

/**
 * Whether the periodic check is due, from timestamps so sleep and reloads do not matter. While
 * the island is closed it is only due when the closed island shows the place.
 */
function due(now) {
  if (!islandOpen && options.island === 'never') return false;
  const interval = options.interval * 60 * 1000;
  return now - lastAttempt >= (failed ? Math.min(interval, RETRY_AFTER_FAILURE) : interval);
}

function checkIfStale() {
  if (Date.now() - lastAttempt > RECHECK_ON_OPEN) check();
}

/** "Changed from 🇷🇺 Moscow", or the old IP when only the IP changed. */
function changeText() {
  if (!change || !place || failed || Date.now() - change.at > CHANGE_SHOWN) return '';
  const from = change.from;
  const samePlace = from.countryCode === place.countryCode && from.city === place.city;
  const where = samePlace ? from.ip : [canDrawFlags() ? flag(from.countryCode) : from.countryCode, from.name].filter(Boolean).join(' ');
  return text.changedFrom(where);
}

function renderStatus() {
  const now = Date.now();
  const note = changeText();
  view.change.textContent = note;
  view.change.hidden = !note;
  view.retry.hidden = !failed || checking;
  if (checking) view.status.textContent = text.checking;
  else if (failed) view.status.textContent = `${text.cantCheck} · ${text.lastKnown(formatTime(lang, checkedAt))}`;
  else view.status.textContent = note ? ` · ${formatAgo(text, checkedAt, now)}` : text.checked(formatAgo(text, checkedAt, now));
  view.footer.classList.toggle('failed', failed && !checking);
}

function renderFlag() {
  const code = place.countryCode;
  const drawn = code && canDrawFlags();
  view.flag.textContent = drawn ? flag(code) : code || '?';
  view.flag.className = drawn ? 'flag' : 'flag badge';
  view.flag.title = countryName(lang, place) || text.unknownPlace;
}

function render() {
  showInIsland({ mode: options.island, place, failed, change, placeName: place ? placeName(place) : '' });

  view.refresh.title = text.refresh;
  view.refresh.setAttribute('aria-label', text.refresh);
  view.refresh.classList.toggle('spinning', checking);
  view.refresh.disabled = checking;
  view.retry.textContent = text.retry;
  view.emptyRetry.textContent = text.retry;

  view.card.hidden = !place;
  view.empty.hidden = !!place;
  if (!place) {
    view.emptyTitle.textContent = checking || !failed ? text.checking : text.offline;
    view.emptyHint.textContent = checking || !failed ? '' : text.offlineHint;
    view.emptyRetry.hidden = checking || !failed;
    view.empty.classList.toggle('busy', checking || !failed);
    return;
  }

  view.card.classList.toggle('stale', failed && !checking);
  renderFlag();
  const country = countryName(lang, place);
  const name = placeName(place) || text.unknownPlace;
  view.city.textContent = name;
  view.city.title = name;
  const region = [place.region, country].filter((part) => part && part !== name);
  view.region.textContent = [...new Set(region)].join(', ');

  view.ipText.textContent = place.ip;
  view.ip.classList.toggle('long', place.ip.includes(':'));
  view.ip.title = text.copy;
  const showV6 = options.showIpv6 && ipv6 && ipv6 !== place.ip;
  view.ip6.hidden = !showV6;
  view.ip6Text.textContent = showV6 ? ipv6 : '';
  view.ip6.title = text.copy;

  const provider = [place.provider, place.asn].filter(Boolean).join(' · ');
  view.provider.textContent = provider;
  view.provider.title = provider;
  renderStatus();
}

/** Copies the address shown on `button`, with a short "Copied" in place of the copy icon. */
function copyOnClick(button, note, value) {
  let timer;
  button.addEventListener('click', async () => {
    const address = value();
    if (!address) return;
    try {
      await clipboard.writeText(address);
      note.textContent = text.copied;
    } catch (error) {
      console.warn('could not copy', error);
      note.textContent = text.copyFailed;
    }
    button.classList.add('noted');
    clearTimeout(timer);
    timer = setTimeout(() => button.classList.remove('noted'), COPIED_SHOWN);
  });
}

copyOnClick(view.ip, view.ipNote, () => place?.ip);
copyOnClick(view.ip6, view.ip6Note, () => ipv6);
view.refresh.addEventListener('click', () => check());
view.retry.addEventListener('click', () => check());
view.emptyRetry.addEventListener('click', () => check());
view.place.addEventListener('animationend', () => view.place.classList.remove('flash'));

// The pointer coming onto the widget is a look at it too, for example after the island stayed open.
document.documentElement.addEventListener('pointerenter', checkIfStale);

const context = await ready();
islandOpen = context.islandOpen === true;
island.subscribe(({ open }) => {
  islandOpen = open;
  if (open) checkIfStale();
});
lang = context.language;
text = TEXTS[lang] ?? TEXTS.en;
language.subscribe((next) => {
  lang = next;
  text = TEXTS[next] ?? TEXTS.en;
  render();
});
options = context.settings;
settings.subscribe((next) => {
  const wantsIpv6 = next.showIpv6 && !options.showIpv6;
  options = next;
  render();
  if (wantsIpv6) check();
});

const [last, storedChange] = await Promise.all([storage.get('last'), storage.get('change')]).catch(() => [null, null]);
if (last?.place?.ip) ({ place, ipv6 = '', checkedAt = 0 } = last);
if (storedChange?.from) change = storedChange;
render();
check();
setInterval(() => {
  if (!checking && due(Date.now())) check();
  else if (place) renderStatus();
}, 1000);

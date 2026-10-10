/** The widget's own texts by language; the manifest translates its name and settings. */
export const TEXTS = {
  en: {
    checking: 'Checking…',
    checked: (ago) => `checked ${ago}`,
    lastKnown: (time) => `last known ${time}`,
    cantCheck: 'Can’t check',
    changedFrom: (place) => `Changed from ${place}`,
    copy: 'Click to copy',
    copied: 'Copied',
    copyFailed: 'Could not copy',
    refresh: 'Check again',
    retry: 'Try again',
    offline: 'Can’t reach the IP services',
    offlineHint: 'Offline, or every service is busy.',
    unknownPlace: 'Unknown place',
    ago: { now: 'just now', seconds: (n) => `${n} s ago`, minutes: (n) => `${n} min ago`, hours: (n) => `${n} h ago` },
  },
  ru: {
    checking: 'Проверяю…',
    checked: (ago) => `проверено ${ago}`,
    lastKnown: (time) => `данные на ${time}`,
    cantCheck: 'Нет связи',
    changedFrom: (place) => `Было: ${place}`,
    copy: 'Нажмите, чтобы скопировать',
    copied: 'Скопировано',
    copyFailed: 'Не удалось скопировать',
    refresh: 'Проверить снова',
    retry: 'Повторить',
    offline: 'Сервисы IP недоступны',
    offlineHint: 'Нет сети, или все сервисы заняты.',
    unknownPlace: 'Место неизвестно',
    ago: { now: 'только что', seconds: (n) => `${n} с назад`, minutes: (n) => `${n} мин назад`, hours: (n) => `${n} ч назад` },
  },
};

/** "12 s ago", from a timestamp. */
export function formatAgo(text, at, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 5) return text.ago.now;
  if (seconds < 60) return text.ago.seconds(seconds);
  if (seconds < 3600) return text.ago.minutes(Math.floor(seconds / 60));
  return text.ago.hours(Math.floor(seconds / 3600));
}

/** "14:05", or a date and time when it was not today. */
export function formatTime(language, at) {
  const date = new Date(at);
  const today = date.toDateString() === new Date().toDateString();
  const time = { hour: 'numeric', minute: '2-digit' };
  return date.toLocaleString(language, today ? time : { day: 'numeric', month: 'short', ...time });
}

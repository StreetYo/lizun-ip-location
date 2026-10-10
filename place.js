/** How a place found by `lookUpPlace` is named and compared. */

/** The flag emoji of an ISO country code, made of two regional-indicator letters. */
export function flag(code) {
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

let flagsDrawn;

/**
 * Whether this computer draws flag emoji. Windows' emoji font has none: it draws the two
 * regional-indicator letters side by side instead, about twice as wide as one flag.
 */
export function canDrawFlags() {
  if (flagsDrawn !== undefined) return flagsDrawn;
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return (flagsDrawn = false);
  context.font = '32px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  const pair = context.measureText(flag('NL')).width;
  const letter = context.measureText(String.fromCodePoint(0x1f1f3)).width;
  return (flagsDrawn = pair < letter * 1.5);
}

/** The country's name in Lizun's language, or the service's name for it. */
export function countryName(language, place) {
  try {
    if (place.countryCode) return new Intl.DisplayNames([language], { type: 'region' }).of(place.countryCode) ?? place.country;
  } catch {
    // An unknown code; the service's own name will do.
  }
  return place.country;
}

/** The provider without its legal form: "M247 Europe SRL" → "M247 Europe". */
export function shortProvider(name) {
  const short = name
    .replace(/[,.]?\s+(ltd|limited|llc|inc|corp|corporation|co|gmbh|ag|srl|s\.r\.l|sa|s\.a|sas|bv|b\.v|oy|ab|as|plc|ooo|jsc|pjsc|sp\.? z o\.?o)\.?$/i, '')
    .trim();
  return short || name;
}

/** Whether the internet sees the computer somewhere else than before. */
export function moved(before, after) {
  return before.ip !== after.ip || before.countryCode !== after.countryCode;
}

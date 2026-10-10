/** The place in the closed island: always, for a while after it changed, or never. */
import { activity } from '/__sdk/index.js';
import { canDrawFlags, flag, shortProvider } from './place.js';

/** How long the closed island shows a change ("for 30 s after a change"), and colors it. */
export const CHANGE_SHOWN_IN_ISLAND = 30 * 1000;
const CHANGED_COLOR = '#ff9f0a';

/** What the closed island shows, to skip sending the same activity again. */
let shown;
let timer;

/**
 * Sets or clears the activity for the current state, and comes back by itself when a change
 * stops being new.
 * @param {{ mode: string, place: object | null, failed: boolean, change: { at: number } | null, placeName: string }} state
 */
export function showInIsland({ mode, place, failed, change, placeName }) {
  clearTimeout(timer);
  const sinceChange = change ? Date.now() - change.at : Infinity;
  const fresh = sinceChange < CHANGE_SHOWN_IN_ISLAND;
  if (fresh) timer = setTimeout(() => showInIsland({ mode, place, failed, change, placeName }), CHANGE_SHOWN_IN_ISLAND - sinceChange + 50);

  const visible = place && !failed && (mode === 'always' || (mode === 'change' && fresh));
  const code = place?.countryCode || '';
  const next = visible
    ? {
        leading: fresh ? { icon: 'map-pin', color: CHANGED_COLOR } : { icon: 'map-pin' },
        title: [placeName, shortProvider(place.provider)].filter(Boolean).join(' · ').slice(0, 100),
        trailing: code ? { text: canDrawFlags() ? `${flag(code)} ${code}` : code } : undefined,
      }
    : null;
  if (next && !next.title) next.title = place.ip;

  const key = JSON.stringify(next);
  if (key === shown) return;
  shown = key;
  const update = next ? activity.set(next) : activity.clear();
  update.catch((error) => console.warn('could not update the live activity', error));
}

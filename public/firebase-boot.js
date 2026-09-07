/* Firebase for Bach Office — loading and initialisation only.
 *
 * The app itself is one non-module <script>, so this module hands what it built
 * over on `window.BOFire` and announces itself with a `bofire-ready` event.
 * Nothing here reads or writes app data; that arrives in the sync layer.
 *
 * Failure is deliberately quiet. If gstatic is unreachable, or the project is
 * misconfigured, `window.BOFire.error` is set and the app carries on exactly as
 * it does today — one workspace in localStorage, no sync. Losing sync is worth
 * a warning; losing the app is not.
 *
 * The SDK comes from gstatic rather than public/vendor, unlike three.js. The
 * reasoning there was that a CDN is one more network that has to be reachable
 * and Tobby has to work offline; a database that lives on Google's network
 * cannot be reached without that network anyway, so vendoring the client would
 * buy nothing.
 */

const state = {
  ready: false,
  error: null,
  app: null,
  auth: null,
  db: null,
  /** The `firebase/auth` and `firebase/database` namespaces, for the sync layer. */
  authApi: null,
  dbApi: null,
};
window.BOFire = state;

function announce() {
  window.dispatchEvent(new CustomEvent('bofire-ready', { detail: state }));
}

try {
  const { firebaseConfig } = await import('./firebase-config.js');
  const { initializeApp } = await import('firebase/app');
  const authApi = await import('firebase/auth');
  const dbApi = await import('firebase/database');

  state.app = initializeApp(firebaseConfig);
  state.auth = authApi.getAuth(state.app);
  state.db = dbApi.getDatabase(state.app);

  /**
   * Keep the session across launches rather than across tabs.
   *
   * The default already tries this, but it picks IndexedDB first and falls back
   * silently — and an iPhone opened from the home screen is exactly where that
   * fallback lands, which would mean signing in again every single launch.
   * Asking for localStorage explicitly is the one storage iOS keeps for a
   * standalone web app. A refusal here is survivable: the session simply lasts
   * as long as the tab does.
   */
  try {
    await authApi.setPersistence(state.auth, authApi.browserLocalPersistence);
  } catch (e) {
    console.warn('[firebase] session will not outlive this tab:', e && e.message);
  }
  state.authApi = authApi;
  state.dbApi = dbApi;

  /**
   * `.info/connected` is a client-side flag the SDK maintains, so it answers
   * whether this browser currently has a live socket — which is what the sync
   * layer needs to decide between writing through and queueing.
   */
  state.connected = false;
  dbApi.onValue(dbApi.ref(state.db, '.info/connected'), (snap) => {
    state.connected = snap.val() === true;
    window.dispatchEvent(new CustomEvent('bofire-connection', { detail: { connected: state.connected } }));
  });

  state.ready = true;
  console.info('[firebase] ready —', firebaseConfig.projectId);
} catch (err) {
  state.error = err;
  console.warn('[firebase] unavailable, running on localStorage only:', err && err.message);
}

announce();

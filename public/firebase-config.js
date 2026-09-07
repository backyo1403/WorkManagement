/* Firebase project settings for Bach Office.
 *
 * These live in a file rather than an environment variable because public/ is
 * served exactly as it sits on disk — vercel.json builds nothing — so there is
 * no step that could substitute a variable into it.
 *
 * That is not a leak. A Firebase web config is meant to be public: it ships to
 * every browser that opens the app no matter where it is kept, and it grants
 * nothing on its own. Access is decided entirely by the Realtime Database
 * Security Rules and by Authentication. Keep the rules tight; this file is not
 * the thing protecting the data.
 *
 * To point the app at a different Firebase project, replace this one file.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyA3uA9nrX22btXH3vl4LyRmm5nuAniTFYo',
  authDomain: 'bach-office.firebaseapp.com',
  // Note the single 'd' in firebasedatabase: the host with two does not resolve.
  databaseURL: 'https://bach-office-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'bach-office',
  storageBucket: 'bach-office.firebasestorage.app',
  messagingSenderId: '613472353637',
  appId: '1:613472353637:web:36e02aac9944eee521b58c',
  measurementId: 'G-14ZKHEWYTM',
};

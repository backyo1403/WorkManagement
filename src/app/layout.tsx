import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/shell/AppShell';
import { AuthProvider } from '@/state/AuthProvider';
import { DataProvider } from '@/state/DataProvider';
import { NotebookLockProvider } from '@/state/NotebookLockProvider';
import { PrefsProvider } from '@/state/PrefsProvider';
import { ToastProvider } from '@/state/ToastProvider';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Bach Office',
  description: 'Làm việc thông minh hơn',
  appleWebApp: { capable: true, title: 'Bach Office', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2563EB',
};

/**
 * Applies the stored theme before the first paint. Without this the page would
 * render light and then flip to dark, which is very visible on load.
 */
/**
 * Resolves the bare `three` specifier that `GLTFLoader.js` imports, so Tobby's
 * renderer on the phone tab bar can load the vendored copy in `public/vendor`.
 *
 * It has to be declared in the document because an import map must exist before
 * the first module loads, and it has to be *these* files rather than a CDN: an
 * import map has no fallback syntax, so an unreachable CDN is a dead end, while
 * these ship with the app. Nothing is fetched until an orb actually mounts.
 * three@0.160.0, unmodified — the addons keep their original layout because
 * GLTFLoader reaches ../utils/BufferGeometryUtils.js by relative path.
 */
const IMPORT_MAP = JSON.stringify({
  imports: {
    three: '/vendor/three/build/three.module.js',
    'three/addons/': '/vendor/three/addons/',
  },
});

const THEME_BOOT = `
(function(){ try{
  var t = localStorage.getItem('bachoffice.theme');
  if(!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  var g = localStorage.getItem('bachoffice.group');
  if(g) document.documentElement.setAttribute('data-group', g);
}catch(e){} })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script type="importmap" dangerouslySetInnerHTML={{ __html: IMPORT_MAP }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className={inter.className}>
        <ToastProvider>
          <PrefsProvider>
            <DataProvider>
              <AuthProvider>
                <NotebookLockProvider>
                  <AppShell>{children}</AppShell>
                </NotebookLockProvider>
              </AuthProvider>
            </DataProvider>
          </PrefsProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

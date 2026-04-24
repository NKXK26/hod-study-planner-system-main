// preload.cjs — runs in the renderer BEFORE the page's scripts execute.
// We use this to pre-populate localStorage with a desktop-mode session so
// RequireAuth.jsx's first useEffect finds a userProfile and skips MSAL.

// CRITICAL: set window.desktopApp SYNCHRONOUSLY at preload top-level so that
// any React code running during initial render (which happens BEFORE
// DOMContentLoaded on deferred script tags) can see that it's running in
// Electron. Previously this was set inside the DOMContentLoaded handler,
// which meant React's RoleContext first-render saw window.desktopApp as
// undefined and took the non-Electron code path.
if (typeof window !== 'undefined') {
    window.desktopApp = { isElectron: true };
}

const jwt = require('jsonwebtoken');

const desktopUserProfile = {
  userId: 1,
  userProfileId: 1,
  email: 'developer@dev.local',
  roles: ['Superadmin'],
  msalAccount: {
    name: 'Developer (Desktop Mode)',
    username: 'developer@dev.local',
  },
};

function createSessionToken() {
  const secret = process.env.SESSION_SECRET || 'desktop-dev-session-secret-please-change';
  const appId = process.env.NEXT_PUBLIC_CLIENT_ID || 'desktop-dev-client';
  return jwt.sign(
    {
      email: desktopUserProfile.email,
      name: desktopUserProfile.msalAccount.name,
    },
    secret,
    { expiresIn: '24h', issuer: appId, audience: appId }
  );
}

function injectDesktopSession() {
  try {
    if (!['127.0.0.1', 'localhost'].includes(window.location.hostname)) {
      return;
    }

    localStorage.setItem('userProfile', JSON.stringify(desktopUserProfile));
    localStorage.setItem(
      'sessionUser',
      JSON.stringify({
        email: desktopUserProfile.email,
        name: desktopUserProfile.msalAccount.name,
      })
    );
    localStorage.setItem('sessionToken', createSessionToken());
    window.desktopApp = { isElectron: true };
    // eslint-disable-next-line no-console
    console.log('[preload] Desktop session injected for', window.location.hostname);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[preload] Failed to inject desktop session:', err);
  }
}

// DOMContentLoaded fires AFTER the HTML is parsed but BEFORE Next.js's deferred
// script bundles execute — which means localStorage is already populated by the
// time React runs RequireAuth's useEffect.
window.addEventListener('DOMContentLoaded', injectDesktopSession);

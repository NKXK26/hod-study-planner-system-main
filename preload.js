import { contextBridge } from 'electron';
import jwt from 'jsonwebtoken';

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

function createDesktopSessionToken() {
  const secret = process.env.SESSION_SECRET || 'desktop-dev-session-secret-please-change';
  const appId = process.env.NEXT_PUBLIC_CLIENT_ID || 'desktop-dev-client';

  return jwt.sign(
    {
      email: desktopUserProfile.email,
      name: desktopUserProfile.msalAccount.name,
    },
    secret,
    {
      expiresIn: '24h',
      issuer: appId,
      audience: appId,
    }
  );
}

window.addEventListener('DOMContentLoaded', () => {
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
    localStorage.setItem('sessionToken', createDesktopSessionToken());
  } catch (error) {
    console.error('Failed to initialize desktop session:', error);
  }
});

contextBridge.exposeInMainWorld('desktopApp', {
  isElectron: true,
});

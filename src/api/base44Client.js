import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Disable auth when running the Vite dev server so the app can load without
// logging in. This is useful for local UI development and testing.
const bypassAuth = import.meta.env.DEV;

export const base44 = createClient({
  appId: "685939ed073c7630dbe69779",
  requiresAuth: !bypassAuth
});

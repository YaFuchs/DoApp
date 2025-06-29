import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Disable auth when running the Vite dev server so the app can load without
// logging in. This is useful for local UI development and testing. The
// behaviour can also be toggled explicitly via the VITE_DISABLE_AUTH env
// variable.
const isDev = import.meta.env.DEV;
const disableAuth = isDev || import.meta.env.VITE_DISABLE_AUTH === 'true';

export const base44 = createClient({
  appId: "685939ed073c7630dbe69779",
  requiresAuth: !disableAuth
});

import { base44 } from './base44Client';


// ⚠️ Still makes real API calls even when auth is disabled
export const Task = base44.entities.Task;

// ⚠️ Still makes real API calls even when auth is disabled
export const Tab = base44.entities.Tab;

// ⚠️ Still makes real API calls even when auth is disabled
export const UserHabit = base44.entities.UserHabit;

// ⚠️ Still makes real API calls even when auth is disabled
export const UserHabitCompletion = base44.entities.UserHabitCompletion;

// ⚠️ Still makes real API calls even when auth is disabled
export const UserSettings = base44.entities.UserSettings;



// auth sdk:
const baseUser = base44.auth;

// When developing locally, bypass authentication by returning a mock user and
// stubbing out login/logout methods. This allows the app to run without hitting
// the real auth endpoints. Auth can be disabled either when running the Vite
// dev server or by setting the VITE_DISABLE_AUTH env variable to "true".
const devUser = {
  id: 'local-dev',
  email: 'test@example.com',
  name: 'Test User',
};

const isDev = import.meta.env.DEV;
const disableAuth = isDev || import.meta.env.VITE_DISABLE_AUTH === 'true';

// ✅ Returns a mock user and stubs login/logout when auth is disabled
export const User = disableAuth
  ? {
      async me() {
        window.user = devUser;
        return devUser;
      },
      async login() {
        console.log('Bypassing login for local dev');
        window.user = devUser;
        return devUser;
      },
      async logout() {
        console.log('Bypassing logout for local dev');
        window.user = null;
      },
    }
  : baseUser;

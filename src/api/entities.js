import { base44 } from './base44Client';

const authDisabled = import.meta.env.VITE_DISABLE_AUTH === 'true';


// ⚠️ Still makes real API calls even when auth is disabled
export const Task = base44.entities.Task;

// ⚠️ Still makes real API calls even when auth is disabled
export const Tab = base44.entities.Tab;

// UserTask entity
let mockTasks = [];

export const UserTask = authDisabled
  ? {
      async getTasks() {
        return mockTasks;
      },
      async createTask(data) {
        const newTask = {
          ...data,
          id: `mock-${Date.now()}`,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        mockTasks.push(newTask);
        return newTask;
      },
      async updateTask(id, changes) {
        const index = mockTasks.findIndex((t) => t.id === id);
        if (index !== -1) {
          mockTasks[index] = {
            ...mockTasks[index],
            ...changes,
            updated_date: new Date().toISOString(),
          };
        }
        return true;
      },
      async deleteTask(id) {
        mockTasks = mockTasks.filter((t) => t.id !== id);
        return true;
      },
    }
  : {
      getTasks: () => base44.entities.UserTask.getTasks(),
      createTask: (data) => base44.entities.UserTask.createTask(data),
      updateTask: (id, changes) => base44.entities.UserTask.updateTask(id, changes),
      deleteTask: (id) => base44.entities.UserTask.deleteTask(id),
    };

// UserHabit entity
let mockHabits = [
  {
    id: 'mock-1',
    name: 'Drink Water',
    emoji: '💧',
    frequency: 'Daily',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    name: 'Read Book',
    emoji: '📚',
    frequency: 'Daily',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
  },
];

export const UserHabit = authDisabled
  ? {
      async getHabits() {
        return mockHabits;
      },
      async createHabit(habitData) {
        const newHabit = {
          ...habitData,
          id: `mock-${Date.now()}`,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        mockHabits.push(newHabit);
        return newHabit;
      },
      async updateHabit(id, changes) {
        const index = mockHabits.findIndex((h) => h.id === id);
        if (index !== -1) {
          mockHabits[index] = {
            ...mockHabits[index],
            ...changes,
            updated_date: new Date().toISOString(),
          };
        }
        return true;
      },
      async deleteHabit(id) {
        mockHabits = mockHabits.filter((h) => h.id !== id);
        return true;
      },
    }
  : {
      getHabits: () => base44.entities.UserHabit.get(),
      createHabit: (data) => base44.entities.UserHabit.create(data),
      updateHabit: (id, changes) => base44.entities.UserHabit.update(id, changes),
      deleteHabit: (id) => base44.entities.UserHabit.delete(id),
    };

// ⚠️ Still makes real API calls even when auth is disabled
// UserHabitCompletion entity
let mockCompletions = [];

export const UserHabitCompletion = authDisabled
  ? {
      async getCompletionsByHabit(habitId) {
        return mockCompletions.filter((c) => c.user_habit_id === habitId);
      },
      async createCompletion(data) {
        const newCompletion = {
          ...data,
          id: `mock-${Date.now()}`,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        mockCompletions.push(newCompletion);
        return newCompletion;
      },
      async deleteCompletion(id) {
        mockCompletions = mockCompletions.filter((c) => c.id !== id);
        return true;
      },
    }
  : {
      getCompletionsByHabit: (habitId) =>
        base44.entities.UserHabitCompletion.getCompletionsByHabit(habitId),
      createCompletion: (data) =>
        base44.entities.UserHabitCompletion.createCompletion(data),
      deleteCompletion: (id) =>
        base44.entities.UserHabitCompletion.deleteCompletion(id),
    };

// UserSettings entity
let mockSettings = {
  dailyReminder: true,
  startOfWeek: 'Sunday',
  theme: 'light',
};

export const UserSettings = authDisabled
  ? {
      async getSettings() {
        return mockSettings;
      },
      async updateSettings(changes) {
        mockSettings = {
          ...mockSettings,
          ...changes,
        };
        return mockSettings;
      },
    }
  : base44.entities.UserSettings;



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

import { base44 } from './base44Client';

const authDisabled = import.meta.env.VITE_DISABLE_AUTH === 'true';

// Shared in-memory storage for tasks when auth is disabled
let mockTasks = [];

export const Task = authDisabled
  ? {
      async list() {
        return mockTasks;
      },
      async create(data) {
        const newTask = {
          ...data,
          id: `mock-${Date.now()}`,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        mockTasks.push(newTask);
        return newTask;
      },
      async update(id, changes) {
        const index = mockTasks.findIndex((t) => t.id === id);
        if (index !== -1) {
          mockTasks[index] = {
            ...mockTasks[index],
            ...changes,
            updated_date: new Date().toISOString(),
          };
          return mockTasks[index];
        }
        return null;
      },
      async delete(id) {
        mockTasks = mockTasks.filter((t) => t.id !== id);
        return true;
      },
    }
  : base44.entities.Task;

// Tab entity
let mockTabs = [
  { id: 'mock-tab-1', name: 'Inbox', sort_order: 0 },
  { id: 'mock-tab-2', name: 'Today', sort_order: 1 },
  { id: 'mock-tab-3', name: 'Upcoming', sort_order: 2 },
];

export const Tab = authDisabled
  ? {
      async list() {
        return mockTabs;
      },
      async getTabs() {
        return mockTabs;
      },
      async create(data) {
        const newTab = {
          ...data,
          id: `mock-${Date.now()}`,
        };
        mockTabs.push(newTab);
        return newTab;
      },
      async createTab(data) {
        return this.create(data);
      },
      async update(id, changes) {
        const index = mockTabs.findIndex((t) => t.id === id);
        if (index !== -1) {
          mockTabs[index] = {
            ...mockTabs[index],
            ...changes,
          };
        }
        return mockTabs.find((t) => t.id === id) || null;
      },
      async updateTab(id, changes) {
        return this.update(id, changes);
      },
      async delete(id) {
        mockTabs = mockTabs.filter((t) => t.id !== id);
        return true;
      },
      async deleteTab(id) {
        return this.delete(id);
      },
    }
  : {
      getTabs: () => base44.entities.Tab.list(),
      createTab: (data) => base44.entities.Tab.create(data),
      updateTab: (id, changes) => base44.entities.Tab.update(id, changes),
      deleteTab: (id) => base44.entities.Tab.delete(id),
    };

// UserTask entity

export const UserTask = authDisabled
  ? {
      async list() {
        return mockTasks;
      },
      async getTasks() {
        return mockTasks;
      },
      async create(data) {
        const newTask = {
          ...data,
          id: `mock-${Date.now()}`,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        mockTasks.push(newTask);
        return newTask;
      },
      async createTask(data) {
        return this.create(data);
      },
      async update(id, changes) {
        const index = mockTasks.findIndex((t) => t.id === id);
        if (index !== -1) {
          mockTasks[index] = {
            ...mockTasks[index],
            ...changes,
            updated_date: new Date().toISOString(),
          };
          return mockTasks[index];
        }
        return null;
      },
      async updateTask(id, changes) {
        return this.update(id, changes);
      },
      async delete(id) {
        mockTasks = mockTasks.filter((t) => t.id !== id);
        return true;
      },
      async deleteTask(id) {
        return this.delete(id);
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
      async list() {
        return mockHabits;
      },
      async getHabits() {
        return mockHabits;
      },
      async create(data) {
        const newHabit = {
          ...data,
          id: `mock-${Date.now()}`,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        mockHabits.push(newHabit);
        return newHabit;
      },
      async createHabit(data) {
        return this.create(data);
      },
      async update(id, changes) {
        const index = mockHabits.findIndex((h) => h.id === id);
        if (index !== -1) {
          mockHabits[index] = {
            ...mockHabits[index],
            ...changes,
            updated_date: new Date().toISOString(),
          };
          return mockHabits[index];
        }
        return null;
      },
      async updateHabit(id, changes) {
        return this.update(id, changes);
      },
      async delete(id) {
        mockHabits = mockHabits.filter((h) => h.id !== id);
        return true;
      },
      async deleteHabit(id) {
        return this.delete(id);
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
      async list() {
        return mockCompletions;
      },
      async getCompletionsByHabit(habitId) {
        return mockCompletions.filter((c) => c.user_habit_id === habitId);
      },
      async create(data) {
        const newCompletion = {
          ...data,
          id: `mock-${Date.now()}`,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        mockCompletions.push(newCompletion);
        return newCompletion;
      },
      async createCompletion(data) {
        return this.create(data);
      },
      async update(id, changes) {
        const index = mockCompletions.findIndex((c) => c.id === id);
        if (index !== -1) {
          mockCompletions[index] = {
            ...mockCompletions[index],
            ...changes,
            updated_date: new Date().toISOString(),
          };
          return mockCompletions[index];
        }
        return null;
      },
      async delete(id) {
        mockCompletions = mockCompletions.filter((c) => c.id !== id);
        return true;
      },
      async deleteCompletion(id) {
        return this.delete(id);
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
      async list() {
        return [mockSettings];
      },
      async getSettings() {
        return mockSettings;
      },
      async create(data) {
        mockSettings = {
          id: `mock-${Date.now()}`,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          ...data,
        };
        return mockSettings;
      },
      async update(id, changes) {
        Object.assign(mockSettings, changes);
        return mockSettings;
      },
      async updateSettings(changes) {
        mockSettings = {
          ...mockSettings,
          ...changes,
        };
        return mockSettings;
      },
      async delete(id) {
        mockSettings = {};
        return true;
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

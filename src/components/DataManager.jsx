
import { User } from '@/api/entities';
import { UserHabit } from '@/api/entities';
import { UserHabitCompletion } from '@/api/entities';
import { UserSettings } from '@/api/entities';
import { Task } from '@/api/entities';
import { Tab } from '@/api/entities';

// --- Constants for Local Storage Keys ---
const LOCAL_HABITS_KEY = 'anonymousHabits';
const LOCAL_COMPLETIONS_KEY = 'anonymousCompletions';
const LOCAL_TASKS_KEY = 'anonymousTasks';
const LOCAL_TABS_KEY = 'anonymousTabs';
const LOCAL_SETTINGS_KEY = 'anonymousSettings';

// --- UUID Generator ---
const generateUUID = () => {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// --- Local Storage Helpers ---
const getLocalData = (key, defaultValue = []) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return defaultValue;
  }
};

const setLocalData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
  }
};

// --- Authentication Helper ---
let currentUser = undefined;
let settingsCache = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_DURATION = 30000; // 30 seconds cache

const getUser = async () => {
    if (currentUser !== undefined) return currentUser;
    try {
        currentUser = await User.me();
        console.log('[DataManager] User authenticated:', currentUser?.email);
        return currentUser;
    } catch (e) {
        console.log('[DataManager] User not authenticated, using anonymous mode');
        currentUser = null;
        return null;
    }
};

const DataManager = {
  
  // --- User Helper ---
  getUser: getUser,
  
  // --- Merge Logic for Habits & Completions ---
  async mergeHabitDataOnLogin() {
    console.log('[DataManager] Starting habit data merge on login...');
    
    try {
      // 1. Read all anonymous habit and completion data from localStorage
      const localHabits = getLocalData(LOCAL_HABITS_KEY, []);
      const localCompletions = getLocalData(LOCAL_COMPLETIONS_KEY, []);
      
      console.log('[DataManager] Local habits to merge:', localHabits.length);
      console.log('[DataManager] Local completions to merge:', localCompletions.length);
      
      // If no local data, nothing to merge
      if (localHabits.length === 0 && localCompletions.length === 0) {
        console.log('[DataManager] No local data to merge');
        return;
      }
      
      // 2. Fetch existing UserHabit and UserHabitCompletion data from backend
      const [cloudHabits, cloudCompletions] = await Promise.all([
        UserHabit.list(),
        UserHabitCompletion.list()
      ]);
      
      console.log('[DataManager] Cloud habits found:', cloudHabits.length);
      console.log('[DataManager] Cloud completions found:', cloudCompletions.length);
      
      // 3. Merge habits data
      const habitMapping = new Map(); // Maps local habit ID to cloud habit ID
      const habitsToCreate = [];
      const habitsToUpdate = [];
      
      for (const localHabit of localHabits) {
        // Try to find matching cloud habit by name and emoji
        const matchingCloudHabit = cloudHabits.find(cloudHabit => 
          cloudHabit.name === localHabit.name && 
          cloudHabit.emoji === localHabit.emoji
        );
        
        if (matchingCloudHabit) {
          // Found match - "Local Always Wins" - update cloud habit with local data
          console.log(`[DataManager] Merging habit: ${localHabit.name} (local wins)`);
          habitMapping.set(localHabit.id, matchingCloudHabit.id);
          
          const updatedHabitData = {
            name: localHabit.name,
            emoji: localHabit.emoji,
            frequency: localHabit.frequency,
            reminder_enabled: localHabit.reminder_enabled || false,
            reminder_time: localHabit.reminder_time || "09:00",
            sort_order: localHabit.sort_order || 0,
            daily_goal_enabled: localHabit.daily_goal_enabled || false,
            daily_goal_target: localHabit.daily_goal_target || 3,
            daily_goal_unit: localHabit.daily_goal_unit || "Count"
          };
          
          habitsToUpdate.push({
            id: matchingCloudHabit.id,
            data: updatedHabitData
          });
        } else {
          // No match found - create new cloud habit
          console.log(`[DataManager] Creating new habit: ${localHabit.name}`);
          
          const newHabitData = {
            name: localHabit.name,
            emoji: localHabit.emoji,
            frequency: localHabit.frequency,
            reminder_enabled: localHabit.reminder_enabled || false,
            reminder_time: localHabit.reminder_time || "09:00",
            sort_order: localHabit.sort_order || 0,
            daily_goal_enabled: localHabit.daily_goal_enabled || false,
            daily_goal_target: localHabit.daily_goal_target || 3,
            daily_goal_unit: localHabit.daily_goal_unit || "Count"
          };
          
          habitsToCreate.push({
            localId: localHabit.id,
            data: newHabitData
          });
        }
      }
      
      // Execute habit updates
      const updatePromises = habitsToUpdate.map(habit => 
        UserHabit.update(habit.id, habit.data)
      );
      await Promise.all(updatePromises);
      console.log(`[DataManager] Updated ${habitsToUpdate.length} existing habits`);
      
      // Execute habit creations and map IDs
      for (const habitToCreate of habitsToCreate) {
        const createdHabit = await UserHabit.create(habitToCreate.data);
        habitMapping.set(habitToCreate.localId, createdHabit.id);
        console.log(`[DataManager] Created new habit: ${habitToCreate.data.name} with ID: ${createdHabit.id}`);
      }
      
      // 4. Merge completions data
      const completionsToCreate = [];
      
      for (const localCompletion of localCompletions) {
        const cloudHabitId = habitMapping.get(localCompletion.habit_id);
        
        if (!cloudHabitId) {
          console.warn(`[DataManager] No cloud habit found for local completion with habit_id: ${localCompletion.habit_id}`);
          continue;
        }
        
        // Check if completion already exists for this habit and date
        const existingCompletion = cloudCompletions.find(cloudCompletion =>
          cloudCompletion.user_habit_id === cloudHabitId &&
          cloudCompletion.completion_date === localCompletion.completion_date
        );
        
        if (!existingCompletion) {
          // No duplicate found - create new completion
          const newCompletionData = {
            user_habit_id: cloudHabitId,
            completion_date: localCompletion.completion_date,
            progress_count: localCompletion.progress_count || 1,
            completed: localCompletion.completed !== undefined ? localCompletion.completed : true
          };
          
          completionsToCreate.push(newCompletionData);
        } else {
          console.log(`[DataManager] Skipping duplicate completion for habit ${cloudHabitId} on ${localCompletion.completion_date}`);
        }
      }
      
      // Execute completion creations
      const completionPromises = completionsToCreate.map(completion => 
        UserHabitCompletion.create(completion)
      );
      await Promise.all(completionPromises);
      console.log(`[DataManager] Created ${completionsToCreate.length} new completions`);
      
      // 5. Clear local data after successful merge
      localStorage.removeItem(LOCAL_HABITS_KEY);
      localStorage.removeItem(LOCAL_COMPLETIONS_KEY);
      console.log('[DataManager] Cleared local habit and completion data');
      
      console.log('[DataManager] Habit data merge completed successfully');
      
    } catch (error) {
      console.error('[DataManager] Error during habit data merge:', error);
      throw error;
    }
  },
  
  // --- NEW: Merge Logic for ToDo Tasks & Tabs ---
  async mergeToDoDataOnLogin() {
    console.log('[DataManager] Starting ToDo data merge on login...');
    
    try {
      // 1. Read all anonymous task and tab data from localStorage
      const localTasks = getLocalData(LOCAL_TASKS_KEY, []);
      const localTabs = getLocalData(LOCAL_TABS_KEY, []);
      
      console.log('[DataManager] Local tasks to merge:', localTasks.length);
      console.log('[DataManager] Local tabs to merge:', localTabs.length);

      if (localTasks.length === 0 && localTabs.length === 0) {
        console.log('[DataManager] No local ToDo data to merge');
        return;
      }
      
      // 2. Fetch existing Task and Tab data from backend
      const [cloudTasks, cloudTabs] = await Promise.all([
        Task.list(),
        Tab.list()
      ]);
      
      console.log('[DataManager] Cloud tasks found:', cloudTasks.length);
      console.log('[DataManager] Cloud tabs found:', cloudTabs.length);

      // 3. Merge Tabs data (only custom tabs)
      const localCustomTabs = localTabs.filter(t => t.type === 'Custom');
      const tabPromises = localCustomTabs.map(localTab => {
        const matchingCloudTab = cloudTabs.find(cloudTab => cloudTab.name === localTab.name);
        
        if (matchingCloudTab) {
          // "Local Always Wins" for properties
          console.log(`[DataManager] Merging custom tab: ${localTab.name}`);
          return Tab.update(matchingCloudTab.id, {
            name: localTab.name,
            hidden: localTab.hidden,
            sort_order: localTab.sort_order
          });
        } else {
          // Create new custom tab
          console.log(`[DataManager] Creating new custom tab: ${localTab.name}`);
          return Tab.create({
            name: localTab.name,
            type: 'Custom',
            hidden: localTab.hidden,
            sort_order: localTab.sort_order
          });
        }
      });
      
      await Promise.all(tabPromises);
      console.log(`[DataManager] Processed ${localCustomTabs.length} custom tabs`);

      // 4. Merge Tasks data
      const taskPromises = localTasks.map(localTask => {
        // Match by name for simplicity
        const matchingCloudTask = cloudTasks.find(cloudTask => cloudTask.name === localTask.name);

        if (matchingCloudTask) {
          console.log(`[DataManager] Merging task: ${localTask.name}`);
          // "Local Always Wins" for properties
          const updatedData = { ...localTask };
          // "Union/Append" for tabs array
          updatedData.tabs = [...new Set([...(matchingCloudTask.tabs || []), ...(localTask.tabs || [])])];
          // Remove local-only fields
          delete updatedData.id;
          delete updatedData.uuid;
          delete updatedData.created_date;
          delete updatedData.updated_date;
          
          return Task.update(matchingCloudTask.id, updatedData);
        } else {
          console.log(`[DataManager] Creating new task: ${localTask.name}`);
          const newData = { ...localTask };
          // Remove local-only fields
          delete newData.id;
          delete newData.uuid;
          delete newData.created_date;
          delete newData.updated_date;

          return Task.create(newData);
        }
      });

      await Promise.all(taskPromises);
      console.log(`[DataManager] Processed ${localTasks.length} tasks`);
      
      // 5. Clear local data after successful merge
      localStorage.removeItem(LOCAL_TASKS_KEY);
      localStorage.removeItem(LOCAL_TABS_KEY);
      console.log('[DataManager] Cleared local task and tab data');

      console.log('[DataManager] ToDo data merge completed successfully');

    } catch (error) {
      console.error('[DataManager] Error during ToDo data merge:', error);
      throw error;
    }
  },

  // --- NEW: Merge Logic for App Settings ---
  async mergeSettingsDataOnLogin() {
    console.log('[DataManager] Starting settings data merge on login...');
    
    try {
      // 1. Read all anonymous settings data from localStorage
      const localSettings = getLocalData(LOCAL_SETTINGS_KEY, {});
      
      console.log('[DataManager] Local settings to merge:', Object.keys(localSettings).length);
      
      // If no local settings, nothing to merge
      if (Object.keys(localSettings).length === 0) {
        console.log('[DataManager] No local settings data to merge');
        return;
      }
      
      // 2. Fetch existing UserSettings record from backend (or create if doesn't exist)
      let cloudSettings = null;
      try {
        const existingSettings = await UserSettings.list();
        cloudSettings = existingSettings.length > 0 ? existingSettings[0] : null;
      } catch (error) {
        console.warn('[DataManager] Could not fetch existing settings:', error);
      }
      
      console.log('[DataManager] Cloud settings found:', !!cloudSettings);
      
      // 3. Merge the data
      const mergedSettings = {};
      
      // Apply "Local Always Wins" for individual settings properties
      if (localSettings.weekStart) {
        mergedSettings.weekStart = localSettings.weekStart;
      } else if (cloudSettings?.weekStart) {
        mergedSettings.weekStart = cloudSettings.weekStart;
      }
      
      if (localSettings.allowReminders !== undefined) {
        mergedSettings.allowReminders = localSettings.allowReminders;
      } else if (cloudSettings?.allowReminders !== undefined) {
        mergedSettings.allowReminders = cloudSettings.allowReminders;
      }
      
      // "Union/Append" for seenMilestones array
      const localMilestones = localSettings.seenMilestones || [];
      const cloudMilestones = cloudSettings?.seenMilestones || [];
      mergedSettings.seenMilestones = [...new Set([...cloudMilestones, ...localMilestones])];
      
      // "Local Always Wins" for todoSettings object and its sub-properties
      if (localSettings.todoSettings) {
        mergedSettings.todoSettings = {
          ...(cloudSettings?.todoSettings || {}),
          ...localSettings.todoSettings
        };
        
        // Merge nested objects within todoSettings
        if (localSettings.todoSettings.visibleFields) {
          mergedSettings.todoSettings.visibleFields = {
            ...(cloudSettings?.todoSettings?.visibleFields || {}),
            ...localSettings.todoSettings.visibleFields
          };
        }
        
        if (localSettings.todoSettings.cardFields) {
          mergedSettings.todoSettings.cardFields = {
            ...(cloudSettings?.todoSettings?.cardFields || {}),
            ...localSettings.todoSettings.cardFields
          };
        }
      } else if (cloudSettings?.todoSettings) {
        mergedSettings.todoSettings = cloudSettings.todoSettings;
      }
      
      // Include any other properties from cloud settings that aren't explicitly handled
      if (cloudSettings) {
        Object.keys(cloudSettings).forEach(key => {
          if (!mergedSettings.hasOwnProperty(key) && key !== 'id' && key !== 'created_date' && key !== 'updated_date') {
            mergedSettings[key] = cloudSettings[key];
          }
        });
      }
      
      console.log('[DataManager] Merged settings:', mergedSettings);
      
      // 4. Save the combined data to the UserSettings entity
      if (cloudSettings) {
        // Update existing settings
        await UserSettings.update(cloudSettings.id, mergedSettings);
        console.log('[DataManager] Updated existing UserSettings record');
      } else {
        // Create new settings record
        await UserSettings.create(mergedSettings);
        console.log('[DataManager] Created new UserSettings record');
      }
      
      // 5. Clear the settings data from localStorage
      localStorage.removeItem(LOCAL_SETTINGS_KEY);
      console.log('[DataManager] Cleared local settings data');
      
      // Invalidate settings cache after merge
      this.clearSettingsCache();
      
      console.log('[DataManager] Settings data merge completed successfully');
      
    } catch (error) {
      console.error('[DataManager] Error during settings data merge:', error);
      throw error;
    }
  },

  // --- NEW: Orchestrate all merging on login ---
  async onLoginSuccess() {
    console.log('[DataManager] Starting complete data merge on login...');
    
    try {
      // Check if there's any anonymous data to merge
      const localHabits = localStorage.getItem(LOCAL_HABITS_KEY);
      const localTasks = localStorage.getItem(LOCAL_TASKS_KEY);
      const localTabs = localStorage.getItem(LOCAL_TABS_KEY);
      const localSettings = localStorage.getItem(LOCAL_SETTINGS_KEY);
      
      const hasLocalData = localHabits || localTasks || localTabs || localSettings;
      
      if (!hasLocalData) {
        console.log('[DataManager] No anonymous data found to merge');
        return false; // Return false to indicate no merge was needed
      }
      
      console.log('[DataManager] Anonymous data found, proceeding with merge...');
      
      // Execute all merge functions in sequence
      const mergePromises = [];
      
      if (localHabits) {
        console.log('[DataManager] Merging habits and completions...');
        mergePromises.push(this.mergeHabitDataOnLogin());
      }
      
      if (localTasks || localTabs) {
        console.log('[DataManager] Merging tasks and tabs...');
        mergePromises.push(this.mergeToDoDataOnLogin());
      }
      
      if (localSettings) {
        console.log('[DataManager] Merging settings...');
        mergePromises.push(this.mergeSettingsDataOnLogin());
      }
      
      // Wait for all merges to complete
      await Promise.all(mergePromises);
      
      console.log('[DataManager] Complete data merge finished successfully!');
      return true; // Return true to indicate merge was completed
      
    } catch (error) {
      console.error('[DataManager] Error during complete data merge:', error);
      throw error;
    }
  },

  // --- Habits ---
  async getHabits() {
    const user = await getUser();
    console.log('[DataManager] getHabits - user:', user?.email || 'anonymous');
    if (user) return UserHabit.list('-sort_order');
    return getLocalData(LOCAL_HABITS_KEY, []);
  },

  async createHabit(habitData) {
    const user = await getUser();
    console.log('[DataManager] createHabit - user:', user?.email || 'anonymous', 'data:', habitData);
    if (user) {
      console.log('[DataManager] Creating habit via UserHabit.create');
      const result = await UserHabit.create(habitData);
      console.log('[DataManager] UserHabit.create result:', result);
      return result;
    }
    
    console.log('[DataManager] Creating habit in localStorage');
    const habits = getLocalData(LOCAL_HABITS_KEY, []);
    const newHabit = {
      ...habitData,
      id: generateUUID(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };
    habits.push(newHabit);
    setLocalData(LOCAL_HABITS_KEY, habits);
    return newHabit;
  },

  async updateHabit(habitId, habitData) {
    const user = await getUser();
    console.log('[DataManager] updateHabit - user:', user?.email || 'anonymous', 'habitId:', habitId);
    if (user) return UserHabit.update(habitId, habitData);

    let habits = getLocalData(LOCAL_HABITS_KEY, []);
    habits = habits.map(h => h.id === habitId ? { ...h, ...habitData, updated_date: new Date().toISOString() } : h);
    setLocalData(LOCAL_HABITS_KEY, habits);
  },

  async deleteHabit(habitId) {
    const user = await getUser();
    console.log('[DataManager] deleteHabit - user:', user?.email || 'anonymous', 'habitId:', habitId);
    if (user) return UserHabit.delete(habitId);

    let habits = getLocalData(LOCAL_HABITS_KEY, []);
    habits = habits.filter(h => h.id !== habitId);
    setLocalData(LOCAL_HABITS_KEY, habits);
  },
  
  // --- Completions ---
  async getCompletions() {
    const user = await getUser();
    console.log('[DataManager] getCompletions - user:', user?.email || 'anonymous');
    if (user) return UserHabitCompletion.list();
    return getLocalData(LOCAL_COMPLETIONS_KEY, []);
  },

  async createCompletion(completionData) {
    const user = await getUser();
    console.log('[DataManager] createCompletion - user:', user?.email || 'anonymous', 'data:', completionData);
    if (user) {
      console.log('[DataManager] Creating completion via UserHabitCompletion.create');
      const result = await UserHabitCompletion.create(completionData);
      console.log('[DataManager] UserHabitCompletion.create result:', result);
      return result;
    }
    
    console.log('[DataManager] Creating completion in localStorage');
    const completions = getLocalData(LOCAL_COMPLETIONS_KEY, []);
    const newCompletion = {
      ...completionData,
      // Convert user_habit_id to habit_id for local storage compatibility
      habit_id: completionData.user_habit_id || completionData.habit_id,
      id: generateUUID(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };
    // Remove user_habit_id for local storage
    delete newCompletion.user_habit_id;
    completions.push(newCompletion);
    setLocalData(LOCAL_COMPLETIONS_KEY, completions);
    return newCompletion;
  },

  async updateCompletion(completionId, completionData) {
    const user = await getUser();
    if (user) return UserHabitCompletion.update(completionId, completionData);

    let completions = getLocalData(LOCAL_COMPLETIONS_KEY, []);
    completions = completions.map(c => c.id === completionId ? { ...c, ...completionData, updated_date: new Date().toISOString() } : c);
    setLocalData(LOCAL_COMPLETIONS_KEY, completions);
  },

  async deleteCompletion(completionId) {
    const user = await getUser();
    if (user) return UserHabitCompletion.delete(completionId);

    let completions = getLocalData(LOCAL_COMPLETIONS_KEY, []);
    completions = completions.filter(c => c.id !== completionId);
    setLocalData(LOCAL_COMPLETIONS_KEY, completions);
  },

  // --- Tasks ---
  async getTasks() {
    const user = await getUser();
    if (user) return Task.list('-updated_date');
    return getLocalData(LOCAL_TASKS_KEY, []);
  },

  async createTask(taskData) {
    const user = await getUser();
    if (user) return Task.create(taskData);
    
    const tasks = getLocalData(LOCAL_TASKS_KEY, []);
    const newTask = {
      ...taskData,
      id: generateUUID(),
      uuid: generateUUID(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };
    tasks.push(newTask);
    setLocalData(LOCAL_TASKS_KEY, tasks);
    return newTask;
  },
  
  async updateTask(taskId, taskData) {
    const user = await getUser();
    if (user) return Task.update(taskId, taskData);

    let tasks = getLocalData(LOCAL_TASKS_KEY, []);
    tasks = tasks.map(t => t.id === taskId ? { ...t, ...taskData, updated_date: new Date().toISOString() } : t);
    setLocalData(LOCAL_TASKS_KEY, tasks);
  },

  async deleteTask(taskId) {
    const user = await getUser();
    if (user) return Task.delete(taskId);

    let tasks = getLocalData(LOCAL_TASKS_KEY, []);
    tasks = tasks.filter(t => t.id !== taskId);
    setLocalData(LOCAL_TASKS_KEY, tasks);
  },

  // --- Tabs ---
  async getTabs() {
    const user = await getUser();
    if (user) return Tab.list();
    return getLocalData(LOCAL_TABS_KEY, []);
  },

  async createTab(tabData) {
    const user = await getUser();
    if (user) return Tab.create(tabData);
    
    const tabs = getLocalData(LOCAL_TABS_KEY, []);
    const newTab = {
      ...tabData,
      id: generateUUID(),
      uuid: generateUUID(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };
    tabs.push(newTab);
    setLocalData(LOCAL_TABS_KEY, tabs);
    return newTab;
  },

  async updateTab(tabId, tabData) {
    const user = await getUser();
    if (user) return Tab.update(tabId, tabData);

    let tabs = getLocalData(LOCAL_TABS_KEY, []);
    tabs = tabs.map(t => t.id === tabId ? { ...t, ...tabData, updated_date: new Date().toISOString() } : t);
    setLocalData(LOCAL_TABS_KEY, tabs);
  },

  async deleteTab(tabId) {
    const user = await getUser();
    if (user) return Tab.delete(tabId);

    let tabs = getLocalData(LOCAL_TABS_KEY, []);
    tabs = tabs.filter(t => t.id !== tabId);
    setLocalData(LOCAL_TABS_KEY, tabs);
  },

  // --- Settings with caching ---
  async getSettings() {
    const user = await getUser();
    
    // Use cache if available and not expired
    const now = Date.now();
    if (settingsCache && (now - settingsCacheTime) < SETTINGS_CACHE_DURATION) {
      console.log('[DataManager] Returning settings from cache');
      return settingsCache;
    }
    
    if (user) {
      try {
        const settings = await UserSettings.list();
        const result = settings.length > 0 ? settings[0] : null;
        
        // Update cache
        settingsCache = result;
        settingsCacheTime = now;
        
        return result;
      } catch (error) {
        console.error('[DataManager] Error fetching user settings:', error);
        // Return cached data if available, even if expired, to prevent breaking
        if (settingsCache) {
          console.log('[DataManager] Returning cached settings due to API error');
          return settingsCache;
        }
        return null;
      }
    }
    
    const localSettings = getLocalData(LOCAL_SETTINGS_KEY, {});
    // Cache local settings too
    settingsCache = Object.keys(localSettings).length > 0 ? localSettings : null;
    settingsCacheTime = now;
    
    return settingsCache;
  },

  async updateSettings(settingsData) {
    const user = await getUser();
    
    if (user) {
      try {
        const existingSettings = await UserSettings.list();
        let result;
        
        if (existingSettings.length > 0) {
          result = await UserSettings.update(existingSettings[0].id, settingsData);
        } else {
          result = await UserSettings.create(settingsData);
        }
        
        // Update cache immediately
        settingsCache = result;
        settingsCacheTime = Date.now();
        
        return result;
      } catch (error) {
        console.error('[DataManager] Error updating user settings:', error);
        throw error;
      }
    }
    
    const currentSettings = getLocalData(LOCAL_SETTINGS_KEY, {});
    const updatedSettings = { ...currentSettings, ...settingsData };
    setLocalData(LOCAL_SETTINGS_KEY, updatedSettings);
    
    // Update cache
    settingsCache = updatedSettings;
    settingsCacheTime = Date.now();
    
    return updatedSettings;
  },

  // Clear settings cache when needed
  clearSettingsCache() {
    console.log('[DataManager] Clearing settings cache');
    settingsCache = null;
    settingsCacheTime = 0;
  }
};

export default DataManager;

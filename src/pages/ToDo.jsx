
import React, { useState, useEffect, useContext } from "react";
import { User } from "@/api/entities";
import DataManager from "../components/DataManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import TabList from "../components/todo/TabList";
import TaskItem from "../components/todo/TaskItem";
import EditTaskModal from "../components/todo/EditTaskModal";
import TabManagementModal from "../components/todo/TabManagementModal";
import AddTabModal from "../components/todo/AddTabModal";
import { calculateSortValue, mapEnumsToValues } from "../components/todo/sortValueCalculator";
import UnifiedLoader from "../components/UnifiedLoader";
import { LayoutContext } from "./Layout";

const DEFAULT_TODO_SETTINGS = {
  cardFields: {
    description: false,
    priority: false,
    effort: false,
    timeEstimation: false,
    dueDate: false,
    scheduledTime: false
  }
};

// Smart Tab Utilities
const isToday = (dueDate) => {
  if (!dueDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate === today;
};

const isTomorrow = (dueDate) => {
  if (!dueDate) return false;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return dueDate === tomorrow;
};

const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today;
};

const isDoneToday = (doneDate) => {
    if (!doneDate) return false;
    const todayStr = new Date().toISOString().slice(0, 10);
    const doneDateObj = new Date(doneDate);
    // Ensure doneDate is a valid date before slicing
    if (isNaN(doneDateObj.getTime())) return false; 
    const doneDateStr = doneDateObj.toISOString().slice(0, 10);
    return doneDateStr === todayStr;
};

export default function ToDo({ setPageTitle, setPageActions }) {
  const { setPageTitle: ctxSetPageTitle, setPageActions: ctxSetPageActions } = useContext(LayoutContext);
  const pageTitleSetter = setPageTitle || ctxSetPageTitle;
  const pageActionsSetter = setPageActions || ctxSetPageActions;
  const [tasks, setTasks] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTabManagement, setShowTabManagement] = useState(false);
  const [showAddTab, setShowAddTab] = useState(false);
  const [user, setUser] = useState(null);
  const [taskSettings, setTaskSettings] = useState(DEFAULT_TODO_SETTINGS);

  useEffect(() => {
    // Set page title and actions for the Layout
    if (pageTitleSetter) {
      pageTitleSetter(activeTab ? activeTab.name : "ToDo");
    }
    if (pageActionsSetter) {
      pageActionsSetter(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-11 h-11 hover:bg-slate-100"
              aria-label="Open ToDo options"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleManageTabs}>
              Manage Tabs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  }, [pageTitleSetter, pageActionsSetter, activeTab]);

  // Add a more controlled settings update listener
  useEffect(() => {
    const handleSettingsUpdate = async () => {
      // Clear cache and refresh settings
      DataManager.clearSettingsCache();
      await refreshSettings();
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, []);

  useEffect(() => {
    const checkUserAndLoadData = async () => {
        try {
            const currentUser = await User.me();
            setUser(currentUser);

            // Check for local ToDo data and merge if it exists
            const localTasks = localStorage.getItem('anonymousTasks');
            if (localTasks) {
                console.log('[ToDo] Local task data found, initiating merge...');
                await DataManager.mergeToDoDataOnLogin();
                console.log('[ToDo] Merge complete.');
            }
        } catch (error) {
            setUser(null);
        }
        // ALWAYS call fetchData, which will get from cloud if authenticated, or local if not.
        fetchData();
    };
    checkUserAndLoadData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Use Promise.allSettled to handle individual failures gracefully
      const results = await Promise.allSettled([
        DataManager.getTabs(),
        DataManager.getTasks(),
        DataManager.getSettings()
      ]);

      // Handle tabs
      let fetchedTabs = [];
      if (results[0].status === 'fulfilled') {
        fetchedTabs = results[0].value;
      } else {
        console.error("Failed to fetch tabs:", results[0].reason);
      }

      // Handle tasks  
      let fetchedTasks = [];
      if (results[1].status === 'fulfilled') {
        fetchedTasks = results[1].value;
      } else {
        console.error("Failed to fetch tasks:", results[1].reason);
      }

      // Handle settings
      let fetchedSettings = null;
      if (results[2].status === 'fulfilled') {
        fetchedSettings = results[2].value;
      } else {
        console.error("Failed to fetch settings:", results[2].reason);
      }
      
      // Load and apply settings
      if (fetchedSettings && fetchedSettings.todoSettings) {
        setTaskSettings(fetchedSettings.todoSettings);
      } else {
        setTaskSettings(DEFAULT_TODO_SETTINGS);
      }
      
      // Ensure all essential preset tabs exist
      const requiredTabs = [
        { name: 'Inbox', type: 'Preset' },
        { name: 'Today', type: 'Preset' },
        { name: 'Tomorrow', type: 'Preset' },
        { name: 'Archive', type: 'Preset' }
      ];

      for (const requiredTab of requiredTabs) {
        const exists = fetchedTabs.some(tab => tab.name === requiredTab.name);
        if (!exists) {
          await DataManager.createTab(requiredTab);
          // Add the newly created tab to fetchedTabs so it's included in subsequent processing
          fetchedTabs.push({ ...requiredTab, id: Math.random().toString(36).substring(7), sort_order: fetchedTabs.length }); // Dummy ID for immediate client-side use
        }
      }

      // Clean up any existing "Today" or "Tomorrow" labels from task.tabs
      const tasksToClean = [];
      fetchedTasks.forEach(task => {
        if (task.tabs && (task.tabs.includes("Today") || task.tabs.includes("Tomorrow"))) {
          let cleanedTabs = task.tabs.filter(t => t !== "Today" && t !== "Tomorrow");
          if (cleanedTabs.length === 0) {
            cleanedTabs = ["Inbox"];
          }
          tasksToClean.push(DataManager.updateTask(task.id, { tabs: cleanedTabs }));
        }
      });

      if (tasksToClean.length > 0) {
        await Promise.all(tasksToClean);
        // Re-fetch tasks to ensure latest state after cleanup, only if tasksToClean was not empty
        fetchedTasks = await DataManager.getTasks();
      }

      // Ensure all tasks have at least one tab, defaulting to Inbox
      const tasksToUpdate = [];
      fetchedTasks.forEach(task => {
        if (!task.tabs || task.tabs.length === 0) {
          tasksToUpdate.push(DataManager.updateTask(task.id, { tabs: ["Inbox"] }));
        }
      });

      if (tasksToUpdate.length > 0) {
        await Promise.all(tasksToUpdate);
        // Re-fetch tasks to ensure latest state after updates, only if tasksToUpdate was not empty
        fetchedTasks = await DataManager.getTasks();
      }
      
      const sortedTabs = fetchedTabs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setTabs(sortedTabs);
      setTasks(fetchedTasks);
      
      if (sortedTabs.length > 0) {
        // NEW LOGIC: First look for the first visible tab, then fallback to Inbox
        const firstVisibleTab = sortedTabs.find(t => !t.hidden);
        const inboxTab = sortedTabs.find(t => t.name === 'Inbox');
        
        setActiveTab(firstVisibleTab || inboxTab || sortedTabs[0]);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      // Don't completely fail - use default/cached data if all fetches failed
      setTaskSettings(DEFAULT_TODO_SETTINGS);
    }
    setIsLoading(false);
  };

  // Add function to refresh settings when they're updated
  const refreshSettings = async () => {
    try {
      const fetchedSettings = await DataManager.getSettings();
      if (fetchedSettings && fetchedSettings.todoSettings) {
        setTaskSettings(fetchedSettings.todoSettings);
      } else {
        setTaskSettings(DEFAULT_TODO_SETTINGS);
      }
    } catch (error) {
      console.error("Failed to refresh settings:", error);
      // Don't update settings on error to prevent fields from disappearing
    }
  };

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    const originalTasks = [...tasks];
    const updatedTasks = tasks.map(t => 
        t.id === taskId ? { 
          ...t, 
          status: newStatus, 
          doneDate: newStatus === 'Done' ? new Date().toISOString() : null 
        } : t
    );
    
    // Update local state immediately for responsive UI
    setTasks(updatedTasks);

    try {
        await DataManager.updateTask(taskId, { 
          status: newStatus, 
          doneDate: newStatus === 'Done' ? new Date().toISOString() : null 
        });
        
        // Refresh tasks from DataManager to ensure consistency
        const refreshedTasks = await DataManager.getTasks();
        setTasks(refreshedTasks);
    } catch (error) {
        console.error("Failed to update task status:", error);
        // Revert to original state if update failed
        setTasks(originalTasks);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleSaveTask = async (taskId, updatedTaskData) => {
    try {
      await DataManager.updateTask(taskId, updatedTaskData);
      
      // Refresh tasks
      const updatedTasks = await DataManager.getTasks();
      setTasks(updatedTasks);
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error; // Re-throw so EditTaskModal can handle the error
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await DataManager.deleteTask(taskId);
      
      // Refresh tasks
      const updatedTasks = await DataManager.getTasks();
      setTasks(updatedTasks);
    } catch (error) {
      console.error("Failed to delete task:", error);
      throw error;
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingTask(null);
  };

  // --- REFACTORED QUICK ADD LOGIC ---

  // Central function to create a task from the quick add input
  const createTaskFromQuickAdd = async (name) => {
    if (!name.trim() || !activeTab) return;

    let currentSettings = { capacityCalculation: "Effort" };
    try {
      const savedSettings = await DataManager.getSettings();
      if (savedSettings && savedSettings.todoSettings) {
        currentSettings = savedSettings.todoSettings;
      }
    } catch (error) {
      console.error("Failed to load settings for task creation:", error);
    }
    
    const baseTask = { name: name.trim() };
    const valueMappings = mapEnumsToValues(baseTask);
    const sortValue = calculateSortValue(valueMappings, currentSettings);

    const newTaskData = {
      ...baseTask,
      ...valueMappings,
      sortValue,
      tabs: ['Today', 'Tomorrow', 'Done', 'Archive'].includes(activeTab.name) ? ["Inbox"] : [activeTab.name],
      dueDate: activeTab.name === 'Today' ? new Date().toISOString().slice(0, 10) :
               activeTab.name === 'Tomorrow' ? new Date(Date.now() + 86400000).toISOString().slice(0, 10) : 
               null,
      capacityScoreType: currentSettings.capacityCalculation
    };
    
    try {
        await DataManager.createTask(newTaskData);
        const updatedTasks = await DataManager.getTasks();
        setTasks(updatedTasks);
    } catch (error) {
        console.error("Failed to create task:", error);
    }
  };

  // Handles Enter key press in the form for continuous input
  const handleQuickAddSubmit = async () => {
    await createTaskFromQuickAdd(quickAddValue);
    setQuickAddValue(""); // Reset for next input
  };

  // Handles clicking the 'X' button or pressing 'Escape'
  const handleQuickAddCancel = () => {
    setShowQuickAdd(false);
    setQuickAddValue("");
  };

  // Handles clicking outside the form (blur)
  const handleQuickAddBlur = async (e) => {
    // If focus moves to a child element (like the X button), do nothing.
    // This prevents the blur action when the user intends to cancel.
    if (e.currentTarget.contains(e.relatedTarget)) {
      return;
    }
    
    // If there's text, create the task.
    await createTaskFromQuickAdd(quickAddValue);
    
    // Always close the form on blur.
    setShowQuickAdd(false);
    setQuickAddValue("");
  };

  const handleAddTab = async (tabName) => {
    try {
      const newTab = {
        name: tabName,
        type: "Custom",
        sort_order: Math.max(...tabs.map(t => t.sort_order || 0), 0) + 1
      };
      
      const createdTab = await DataManager.createTab(newTab);
      const freshTabs = await DataManager.getTabs();
      const sortedTabs = freshTabs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setTabs(sortedTabs);
      setActiveTab(createdTab);
      setShowAddTab(false);
    } catch (error) {
      console.error("Failed to create tab:", error);
    }
  };

  const handleManageTabs = () => {
    setShowTabManagement(true);
  };

  const handleSaveTabs = async (updatedTabsConfig) => {
    try {
        // Identify which tabs are being deleted or hidden
        const deletedTabNames = [];
        
        // Find custom tabs that are being deleted (not in updated config)
        const deletedCustomTabs = tabs.filter(t => 
          t.type === 'Custom' && !updatedTabsConfig.some(ut => ut.id === t.id)
        );
        deletedTabNames.push(...deletedCustomTabs.map(t => t.name));
        
        // Find preset tabs that are being hidden (excluding smart tabs)
        const hiddenPresetTabs = tabs.filter(t => {
          if (t.type === 'Preset' && t.name !== 'Inbox' && t.name !== 'Today' && t.name !== 'Tomorrow' && t.name !== 'Archive') { 
            const updatedTab = updatedTabsConfig.find(ut => ut.id === t.id);
            return updatedTab && updatedTab.hidden && !t.hidden;
          }
          return false;
        });
        deletedTabNames.push(...hiddenPresetTabs.map(t => t.name));

        // Update existing tabs
        const updatePromises = updatedTabsConfig.map(tab => DataManager.updateTab(tab.id, tab));
        
        // Delete custom tabs
        const deletePromises = deletedCustomTabs.map(tab => DataManager.deleteTab(tab.id));
        
        await Promise.all([...updatePromises, ...deletePromises]);

        // Update tasks that were assigned to deleted/hidden tabs
        if (deletedTabNames.length > 0) {
            const allTasks = await DataManager.getTasks();
            const taskUpdatePromises = [];
            
            for (const task of allTasks) {
                let taskTabs = task.tabs ? [...task.tabs] : [];
                const originalTabs = [...taskTabs];
                
                // Remove deleted/hidden tabs from task
                taskTabs = taskTabs.filter(tabName => !deletedTabNames.includes(tabName));
                
                // If task has no tabs left, assign to Inbox
                if (taskTabs.length === 0) {
                    taskTabs = ["Inbox"];
                }
                
                // Only update if there were changes
                if (JSON.stringify(taskTabs) !== JSON.stringify(originalTabs)) {
                    taskUpdatePromises.push(DataManager.updateTask(task.id, { tabs: taskTabs }));
                }
            }
            
            if (taskUpdatePromises.length > 0) {
                await Promise.all(taskUpdatePromises);
            }
        }
        
        await fetchData();
        setShowTabManagement(false);
    } catch (error) {
        console.error("Failed to save tabs:", error);
    }
  };

  // Smart filtering logic
  const getVisibleTasks = () => {
    if (!activeTab) return { active: [], completedToday: [] };

    const sortTasks = (tasksToSort) => {
        return tasksToSort.sort((a, b) => {
            // Primary sort by sortValue (descending)
            const sortOrder = (b.sortValue || 0) - (a.sortValue || 0);
            if (sortOrder !== 0) return sortOrder;
            // Secondary sort by updated_date (newest first)
            return new Date(b.updated_date) - new Date(a.updated_date);
        });
    };

    // The "Done" tab has its own simple logic and is not partitioned
    if (activeTab.name === 'Done') {
      const doneTasks = tasks
        .filter(task => task.status === 'Done')
        .sort((a, b) => new Date(b.doneDate) - new Date(a.doneDate)); // Keep existing Done sort
      return { active: doneTasks, completedToday: [] }; 
    }
    // The "Archive" tab
    if (activeTab.name === 'Archive') {
      const archivedTasks = tasks
        .filter(task => task.status === 'Archive')
        .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date)); 
      return { active: archivedTasks, completedToday: [] }; 
    }
    
    // Filter for all other tabs
    const filteredTasks = tasks.filter(task => {
        // Universal exclusion rules for non-"Done" and non-"Archive" tabs
        if (task.status === 'Archive') return false;
        if (task.status === 'Done' && !isDoneToday(task.doneDate)) return false;

        // Inclusion rules based on active tab
        if (activeTab.name === 'Today') {
            return isToday(task.dueDate) || isOverdue(task.dueDate);
        }
        if (activeTab.name === 'Tomorrow') {
            return isTomorrow(task.dueDate);
        }
        // Default to regular tab check
        return task.tabs && task.tabs.includes(activeTab.name);
    });

    // Partition into active and completed today, then sort
    const active = sortTasks(filteredTasks.filter(t => t.status !== 'Done'));
    const completedToday = sortTasks(filteredTasks.filter(t => t.status === 'Done'));
    
    return { active, completedToday };
  };

  const { active: activeTasks, completedToday: completedTodayTasks } = getVisibleTasks();

  return (
    <div className="min-h-screen bg-[#f4f8fc]">
      {/* The TabList is now sticky and positioned relative to the main viewport */}
      <div className="sticky top-[72px] z-20 bg-[#f4f8fc]/90 backdrop-blur-sm">
        <TabList 
          tabs={tabs} 
          activeTab={activeTab} 
          onSelectTab={handleSelectTab}
          onAddTabClick={() => setShowAddTab(true)}
        />
      </div>
      
      {/* Main content with padding to clear the sticky tab list */}
      <main className="px-4 pb-24">
        {/* Quick Add Form */}
        <AnimatePresence>
          {showQuickAdd && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.2 }}
              className="pt-4 pb-2"
            >
              <form
                onSubmit={(e) => { e.preventDefault(); handleQuickAddSubmit(); }}
                onBlur={handleQuickAddBlur}
                className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-3 shadow-sm"
              >
                <Input
                  value={quickAddValue}
                  onChange={(e) => setQuickAddValue(e.target.value)}
                  placeholder={`Add task to ${activeTab?.name || 'current tab'}...`}
                  className="flex-1 border-0 shadow-none focus-visible:ring-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      handleQuickAddCancel();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleQuickAddCancel}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <UnifiedLoader />
        ) : (activeTasks.length === 0 && completedTodayTasks.length === 0) ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-slate-600">No tasks in {activeTab?.name || ''} yet. Add your first task!</p>
          </motion.div>
        ) : (
          <div className="space-y-3 pt-4">
            <AnimatePresence>
              {activeTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onStatusChange={handleTaskStatusChange}
                  onEdit={handleEditTask}
                  cardSettings={taskSettings.cardFields}
                />
              ))}
            </AnimatePresence>
            
            {completedTodayTasks.length > 0 && (
              <div className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-grow border-t border-slate-300"></div>
                  <h3 className="text-sm font-semibold text-slate-500 tracking-wide">Completed Today</h3>
                  <div className="flex-grow border-t border-slate-300"></div>
                </div>
                <div className="space-y-3">
                  <AnimatePresence>
                    {completedTodayTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onStatusChange={handleTaskStatusChange}
                        onEdit={handleEditTask}
                        cardSettings={taskSettings.cardFields}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

       <Button
        onClick={() => setShowQuickAdd(true)}
        variant="default"
        size="icon"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-6 z-40 rounded-full bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-8"
        style={{ boxShadow: '0 15px 20px -3px rgb(0 0 0 / 0.25)' }}
        aria-label="Add New Task"
      >
        <Plus className="w-8 h-8" strokeWidth={2.5} />
        <span className="sr-only">Add New Task</span>
      </Button>

      {/* Edit Task Modal */}
      <EditTaskModal
        task={editingTask}
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        tabs={tabs}
        settings={taskSettings}
      />

      {/* Tab Management Modal */}
      <TabManagementModal
        isOpen={showTabManagement}
        onClose={() => setShowTabManagement(false)}
        tabs={tabs}
        onSaveTabs={handleSaveTabs}
      />

      {/* Add Tab Modal */}
      <AnimatePresence>
        {showAddTab && (
          <AddTabModal
            isOpen={showAddTab}
            onClose={() => setShowAddTab(false)}
            onAddTab={handleAddTab}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

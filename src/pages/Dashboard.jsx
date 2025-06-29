
import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
import { User } from '@/api/entities'; // Import User entity
import DataManager from "../components/DataManager"; // Import DataManager
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import HabitItem from "../components/HabitItem";
import HabitForm from "../components/HabitForm";
import CompletionLog from "../components/CompletionLog";
import GlobalConfetti from "../components/GlobalConfetti";
import celebrationManager from "../components/celebrationManager";
import CelebrationCard from "../components/CelebrationCard";
import notificationManager from "../components/NotificationManager";
import ReorderHabitsModal from "../components/ReorderHabitsModal";
import UnifiedLoader from "../components/UnifiedLoader";
import { LayoutContext } from "./Layout";

export default function Dashboard({ setPageTitle, setPageActions }) {
  const { setPageTitle: ctxSetPageTitle, setPageActions: ctxSetPageActions } = useContext(LayoutContext);
  const pageTitleSetter = setPageTitle || ctxSetPageTitle;
  const pageActionsSetter = setPageActions || ctxSetPageActions;
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [viewingLogForHabit, setViewingLogForHabit] = useState(null);
  const [deleteHabitId, setDeleteHabitId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGlobalConfetti, setShowGlobalConfetti] = useState(false);
  const [weekStart, setWeekStart] = useState('monday');
  const [celebrationQueue, setCelebrationQueue] = useState([]);
  const [currentCelebration, setCurrentCelebration] = useState(null);
  const [user, setUser] = useState(null); // Add user state
  const [showReorderModal, setShowReorderModal] = useState(false);

  // Simple debouncing for habit interactions (replaces previous complex debouncing)
  const interactionTimeoutRef = useRef(null);
  const INTERACTION_DELAY = 300; // 300ms delay

  const today = new Date().toLocaleDateString('en-CA');

  useEffect(() => {
    // Set page title and actions for the Layout
    if (pageTitleSetter) pageTitleSetter("Today");
    if (pageActionsSetter) {
      pageActionsSetter(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-11 h-11 hover:bg-slate-100"
              aria-label="Open habit options"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowReorderModal(true)}>
              Reorder Habits
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  }, [pageTitleSetter, pageActionsSetter]);

  const loadData = useCallback(async () => { // Renamed from loadLocalData and made async
    setIsLoading(true);
    try {
      // Use Promise.allSettled to handle individual failures gracefully
      const results = await Promise.allSettled([
        DataManager.getHabits(),
        DataManager.getCompletions(),
        DataManager.getSettings()
      ]);

      // Handle habits
      if (results[0].status === 'fulfilled') {
        setHabits(results[0].value);
      } else {
        console.error("Failed to fetch habits:", results[0].reason);
        setHabits([]);
      }

      // Handle completions
      if (results[1].status === 'fulfilled') {
        setCompletions(results[1].value);
      } else {
        console.error("Failed to fetch completions:", results[1].reason);
        setCompletions([]);
      }

      // Handle settings
      if (results[2].status === 'fulfilled') {
        const settings = results[2].value;
        if (settings) {
          setWeekStart(settings.weekStart || 'monday');
          if (settings.seenMilestones) {
            celebrationManager.loadStateFromData(settings.seenMilestones);
          }
        } else {
          setWeekStart('monday');
        }
      } else {
        console.error("Failed to fetch settings:", results[2].reason);
        setWeekStart('monday');
      }
      
      celebrationManager.loadStateFromData();
    } catch (error) {
      console.error("Error loading data:", error);
      // Set defaults on error
      setHabits([]);
      setCompletions([]);
      setWeekStart('monday');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const checkUserAndLoadData = async () => {
        try {
            const currentUser = await User.me();
            setUser(currentUser);

            // Check for local data and merge if it exists
            const localHabits = localStorage.getItem('anonymousHabits');
            const localSettings = localStorage.getItem('anonymousSettings');
            
            if (localHabits) {
                console.log('[Dashboard] Local habit data found, initiating merge...');
                await DataManager.mergeHabitDataOnLogin();
                console.log('[Dashboard] Habit merge complete.');
            }
            
            if (localSettings) {
                console.log('[Dashboard] Local settings data found, initiating merge...');
                await DataManager.mergeSettingsDataOnLogin();
                console.log('[Dashboard] Settings merge complete.');
            }

        } catch (error) {
            setUser(null);
        }
        // ALWAYS call loadData, which will get from cloud if authenticated, or local if not.
        loadData(); 
    };
    checkUserAndLoadData();
  }, [loadData]); // loadData is a dependency.

  useEffect(() => {
    if (!currentCelebration && celebrationQueue.length > 0) {
      const timer = setTimeout(() => {
        const [next, ...rest] = celebrationQueue;
        setCurrentCelebration(next);
        setCelebrationQueue(rest);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [celebrationQueue, currentCelebration]);

  useEffect(() => {
    const permissionStatus = notificationManager.getPermissionStatus();
    
    if (permissionStatus === 'granted') {
      habits.forEach(habit => {
        if (habit.reminder_enabled && habit.reminder_time) {
          notificationManager.scheduleNotification(
            habit.id,
            habit.name,
            habit.emoji,
            habit.reminder_time
          );
        } else {
          notificationManager.clearNotification(habit.id);
        }
      });
    } else {
      notificationManager.clearAllNotifications();
    }
  }, [habits]);

  const isHabitCompleted = (habitId) => {
    return completions.some(c => 
      (c.user_habit_id === habitId || c.habit_id === habitId) && 
      c.completion_date === today && 
      c.completed
    );
  };
  
  const getHabitProgress = (habitId) => {
    const completion = completions.find(c =>
      (c.user_habit_id === habitId || c.habit_id === habitId) && c.completion_date === today
    );
    return completion ? completion.progress_count : 0;
  };

  // The actual habit interaction logic that performs API calls and updates state
  const processHabitInteraction = async (habitId) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const existingCompletion = completions.find(c =>
      (c.user_habit_id === habitId || c.habit_id === habitId) && c.completion_date === today
    );

    let justCompleted = false;
    let currentCompletionsStateForOptimisticUpdate = [...completions];

    try {
      if (habit.daily_goal_enabled) {
        if (existingCompletion?.completed) {
          // Un-checking a completed daily goal habit - remove from UI immediately
          currentCompletionsStateForOptimisticUpdate = completions.filter(c => c.id !== existingCompletion.id);
          setCompletions(currentCompletionsStateForOptimisticUpdate);
          
          // Then sync with backend, ONLY if ID is real (not temporary)
          if (existingCompletion && existingCompletion.id && !String(existingCompletion.id).startsWith('temp-')) {
            try {
              await DataManager.deleteCompletion(existingCompletion.id);
            } catch (deleteError) {
              console.warn(`Completion record ${existingCompletion.id} may have already been deleted or failed to delete:`, deleteError);
              const freshCompletions = await DataManager.getCompletions();
              setCompletions(freshCompletions);
            }
          }
        } else {
          const currentProgress = existingCompletion?.progress_count || 0;
          const newProgress = currentProgress + 1; // Corrected typo here
          const isNowComplete = newProgress >= habit.daily_goal_target;
          
          if (isNowComplete) justCompleted = true;
          
          let tempId = null;
          // Optimistic UI update
          if (existingCompletion) {
            const updatedCompletion = { ...existingCompletion, progress_count: newProgress, completed: isNowComplete, updated_date: new Date().toISOString() };
            currentCompletionsStateForOptimisticUpdate = completions.map(c => c.id === existingCompletion.id ? updatedCompletion : c);
          } else {
            tempId = `temp-${Date.now()}`;
            const newCompletion = { id: tempId, user_habit_id: habitId, completion_date: today, progress_count: newProgress, completed: isNowComplete, created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
            currentCompletionsStateForOptimisticUpdate = [...completions, newCompletion];
          }
          setCompletions(currentCompletionsStateForOptimisticUpdate);
          
          // Backend sync
          if (existingCompletion && !String(existingCompletion.id).startsWith('temp-')) {
            await DataManager.updateCompletion(existingCompletion.id, { progress_count: newProgress, completed: isNowComplete });
          } else {
            const realCompletion = await DataManager.createCompletion({ user_habit_id: habitId, completion_date: today, progress_count: newProgress, completed: isNowComplete });
            if (tempId) {
                // Reconcile temp id with real id from the backend
                setCompletions(prev => prev.map(c => c.id === tempId ? realCompletion : c));
            } else {
                // Fallback: if somehow no tempId was set but we created a new record, refresh.
                // This scenario should be rare with proper tempId assignment.
                const freshCompletions = await DataManager.getCompletions();
                setCompletions(freshCompletions);
            }
          }
        }
      } else {
        // Regular habit logic (no daily goal)
        if (existingCompletion) {
          // Deleting
          currentCompletionsStateForOptimisticUpdate = completions.filter(c => c.id !== existingCompletion.id);
          setCompletions(currentCompletionsStateForOptimisticUpdate);
          
          // Then sync with backend, ONLY if ID is real (not temporary)
          if (existingCompletion.id && !String(existingCompletion.id).startsWith('temp-')) {
            try {
              await DataManager.deleteCompletion(existingCompletion.id);
            } catch (deleteError) {
              console.warn(`Completion record ${existingCompletion.id} may have already been deleted or failed to delete:`, deleteError);
              const freshCompletions = await DataManager.getCompletions();
              setCompletions(freshCompletions);
            }
          }
        } else {
          // Creating
          justCompleted = true;
          const tempId = `temp-${Date.now()}`;
          const newCompletion = { id: tempId, user_habit_id: habitId, completion_date: today, progress_count: 1, completed: true, created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
          currentCompletionsStateForOptimisticUpdate = [...completions, newCompletion];
          setCompletions(currentCompletionsStateForOptimisticUpdate);
          
          const realCompletion = await DataManager.createCompletion({ user_habit_id: habitId, completion_date: today, progress_count: 1, completed: true });
          
          // Reconcile temp id with real id from the backend
          setCompletions(prev => prev.map(c => (c.id === tempId ? realCompletion : c)));
        }
      }
      
      // Handle celebrations and confetti only if habit was just completed
      if (justCompleted) {
          setShowGlobalConfetti(true);
          setTimeout(() => setShowGlobalConfetti(false), 3000);
          
          // Fetch final state for accurate celebration checking
          const finalCompletionsForCelebrationCheck = await DataManager.getCompletions(); 
          const newCelebrations = await celebrationManager.check(habit, habits, finalCompletionsForCelebrationCheck, weekStart);
          if (newCelebrations.length > 0) {
              setCelebrationQueue(q => [...q, ...newCelebrations]);
          }
      }
    } catch (error) {
      console.error("Error during habit interaction:", error);
      
      // Always refresh completions data to recover from any inconsistent state
      try {
        const recoveryCompletions = await DataManager.getCompletions();
        setCompletions(recoveryCompletions);
        console.log("Successfully recovered completion data after error");
      } catch (recoveryError) {
        console.error("Failed to recover completion data:", recoveryError);
        // As a last resort, reload all data
        loadData();
      }
    }
  };

  // Simple debounced habit interaction handler. This is the function called by HabitItem.
  const handleHabitInteraction = (habitId) => {
    // Clear any existing timeout for this interaction to ensure only the last click processes
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }

    // Set a new timeout to delay the actual processing
    interactionTimeoutRef.current = setTimeout(() => {
      processHabitInteraction(habitId);
    }, INTERACTION_DELAY);
  };

  const handleCreateNewHabit = async (habitData) => {
    const newHabit = {
      ...habitData,
      sort_order: habits.length,
    };
    
    try {
      const createdHabit = await DataManager.createHabit(newHabit);

      if (habitData.reminder_enabled && habitData.reminder_time) {
        await handleReminderToggle(createdHabit.id, createdHabit.name, createdHabit.emoji, createdHabit.reminder_time, true);
      }

      const freshHabits = await DataManager.getHabits();
      setHabits(freshHabits);
      setShowForm(false);
      setEditingHabit(null);
    } catch (error) {
      console.error("Failed to create habit:", error);
    }
  };

  const handleSaveReorder = async (reorderedHabits) => {
    try {
      // Create a new array with updated sort_order properties. This is the source of truth.
      const habitsWithNewOrder = reorderedHabits.map((habit, index) => ({
        ...habit,
        sort_order: index,
      }));

      // Create promises to update the backend using the new sort_order values.
      const updatePromises = habitsWithNewOrder.map(habit =>
        DataManager.updateHabit(habit.id, { sort_order: habit.sort_order })
      );
      
      // Wait for all backend updates to complete.
      await Promise.all(updatePromises);
      
      // Update the local state with the new array that has the correct sort_order values.
      // This ensures the render logic will sort correctly.
      setHabits(habitsWithNewOrder);
      
      // Close the modal only after the state is ready to be updated.
      setShowReorderModal(false);
    } catch (error) {
      console.error("Error saving habit order:", error);
      // On error, revert to the server's state to prevent UI inconsistency.
      loadData();
    }
  };

  const handleSaveHabit = async (habitData) => {
    if (!editingHabit) return;
    
    try {
      await DataManager.updateHabit(editingHabit.id, habitData);
      
      if (habitData.reminder_enabled && habitData.reminder_time) {
        await handleReminderToggle(editingHabit.id, habitData.name, habitData.emoji, habitData.reminder_time, true);
      } else {
        notificationManager.clearNotification(editingHabit.id);
      }
      
      const updatedHabits = habits.map(h => 
        h.id === editingHabit.id 
        ? { ...h, ...habitData, updated_date: new Date().toISOString() } 
        : h
      );
      setHabits(updatedHabits);
      setShowForm(false);
      setEditingHabit(null);
    } catch (error) {
      console.error("Failed to update habit:", error);
    }
  };

  const handleDeleteHabit = async (habitIdToDelete) => {
    try {
      await DataManager.deleteHabit(habitIdToDelete);
      
      // Delete associated completions
      const associatedCompletions = completions.filter(c => (c.user_habit_id === habitIdToDelete || c.habit_id === habitIdToDelete));
      await Promise.all(associatedCompletions.map(c => DataManager.deleteCompletion(c.id)));
      
      notificationManager.clearNotification(habitIdToDelete);

      const updatedHabits = habits.filter(h => h.id !== habitIdToDelete);
      const updatedCompletions = completions.filter(c => (c.user_habit_id !== habitIdToDelete && c.habit_id !== habitIdToDelete));
      
      setHabits(updatedHabits);
      setCompletions(updatedCompletions);
      setDeleteHabitId(null);
      setShowForm(false);
      setEditingHabit(null);
    } catch (error) {
      console.error("Failed to delete habit:", error);
    }
  };

  const handleEditHabit = (habit) => {
    setEditingHabit(habit);
    setShowForm(true);
  };
  
  const handleViewLog = (habit) => {
    setViewingLogForHabit(habit);
  };

  const handleCloseLog = () => {
    setViewingLogForHabit(null);
    loadData(); // Refetch data after log interactions
  };

  const handleCloseCelebration = () => {
    setCurrentCelebration(null);
  };

  const getCompletionsForHabit = (habitId) => {
    return completions.filter(completion => 
      (completion.user_habit_id === habitId || completion.habit_id === habitId)
    );
  };

  const handleWeekStartChange = async (newWeekStart) => {
    // Update UI immediately for responsive feel
    setWeekStart(newWeekStart);
    
    // Save to backend asynchronously without blocking UI
    try {
      const currentSettings = await DataManager.getSettings() || {};
      await DataManager.updateSettings({ 
        ...currentSettings, 
        weekStart: newWeekStart 
      });
    } catch (error) {
      console.error("Failed to update week start setting:", error);
      // Could optionally revert UI state here if save failed
    }
  };

  const handleReminderToggle = async (habitId, habitName, habitEmoji, reminderTime, isEnabled) => {
    if (!isEnabled) {
      notificationManager.clearNotification(habitId);
      return;
    }

    if (!notificationManager.isSupported()) {
      alert('Notifications are not supported in this browser or device.');
      return;
    }

    let permission = notificationManager.getPermissionStatus();
    
    if (permission !== 'granted') {
      permission = await notificationManager.requestPermission();
    }

    if (permission === 'granted') {
      notificationManager.scheduleNotification(habitId, habitName, habitEmoji, reminderTime);
    } else if (permission === 'denied') {
      alert('Notification permission was denied. Please enable notifications in your browser settings to receive reminders.');
    }
  };

  // Clean up timeout on unmount for the new debouncing mechanism
  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <GlobalConfetti isActive={showGlobalConfetti} />
      <CelebrationCard celebration={currentCelebration} onClose={handleCloseCelebration} />
      
      {/* The header is now in Layout.js. This is the main page content */}
      <div className="bg-[#f4f8fc] px-4">
          {!isLoading && habits.length > 0 && (
            <Button
              onClick={() => setShowForm(true)}
              variant="default"
              size="icon"
              className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-6 z-40 rounded-full bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-8"
              style={{ boxShadow: '0 15px 20px -3px rgb(0 0 0 / 0.25)' }}
              aria-label="Add New Habit"
            >
              <Plus className="w-8 h-8" strokeWidth={2.5} />
              <span className="sr-only">Add New Habit</span>
            </Button>
          )}

          <div className="pb-safe-bottom">
            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-white z-50"
                >
                  <HabitForm
                    habit={editingHabit}
                    onSave={editingHabit ? handleSaveHabit : handleCreateNewHabit}
                    onCancel={() => {
                      setShowForm(false);
                      setEditingHabit(null);
                    }}
                    onDelete={setDeleteHabitId}
                  />
                </motion.div>
              )}

              {viewingLogForHabit && (
                <CompletionLog
                  habit={viewingLogForHabit}
                  initialCompletions={getCompletionsForHabit(viewingLogForHabit.id)}
                  weekStart={weekStart}
                  onClose={handleCloseLog}
                />
              )}

              {showReorderModal && (
                <ReorderHabitsModal
                  isOpen={showReorderModal}
                  onClose={() => setShowReorderModal(false)}
                  onSave={handleSaveReorder}
                  initialHabits={habits}
                />
              )}
            </AnimatePresence>

            <div className="pb-32 pt-4">
              {isLoading ? (
                <UnifiedLoader />
              ) : habits.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="text-8xl mb-6">🌱</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    Build lasting habits
                  </h3>
                  <p className="text-slate-600 mb-8 px-4 leading-relaxed">
                    Track your progress and stay consistent
                  </p>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 h-12 px-8 text-lg"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Your First Habit
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-4 sm:max-w-sm sm:mx-auto lg:max-w-3xl lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                  <AnimatePresence>
                    {[...habits].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)).map((habit) => (
                      <HabitItem
                        key={habit.id}
                        habit={habit}
                        isCompleted={isHabitCompleted(habit.id)}
                        progressCount={getHabitProgress(habit.id)}
                        onToggleComplete={handleHabitInteraction}
                        onEdit={handleEditHabit}
                        onViewLog={handleViewLog}
                        completions={getCompletionsForHabit(habit.id)}
                        weekStart={weekStart}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <AlertDialog open={!!deleteHabitId} onOpenChange={() => setDeleteHabitId(null)}>
              <AlertDialogContent className="w-[90vw] max-w-sm rounded-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg">Delete Habit</AlertDialogTitle>
                  <AlertDialogDescription className="text-base">
                    Are you sure you want to delete this habit? This action cannot be undone and will remove all progress data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2">
                  <AlertDialogAction
                    onClick={() => handleDeleteHabit(deleteHabitId)}
                    className="w-full bg-red-600 hover:bg-red-700 h-11"
                  >
                    Delete Habit
                  </AlertDialogAction>
                  <AlertDialogCancel className="w-full h-11">Cancel</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
    </>
  );
}

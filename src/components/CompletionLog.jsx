import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recomputeStreak } from "./streakCalculator";
import DataManager from "./DataManager";

// Removed STORAGE_KEY as DataManager handles storage

export default function CompletionLog({ habit, initialCompletions, weekStart, onClose }) {
  // Filter completions to only show actually completed ones for the log
  const [completions, setCompletions] = useState(
    initialCompletions.filter(c => c.completed) // Only show completed entries initially
  );
  // Track all completions (for the current habit) for streak calculation
  const [allCompletions, setAllCompletions] = useState(initialCompletions); 
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingCompletion, setEditingCompletion] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD in local time
    time: new Date().toTimeString().slice(0, 5)
  });

  const todayMaxDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

  // useEffect to refresh data on mount, ensuring DataManager's latest state is reflected
  // and filtering for the specific habit's completions.
  useEffect(() => {
    updateAndResortCompletions();
  }, [habit.id]); // Dependency on habit.id to refetch if habit changes

  const streakInfo = useMemo(() => {
    if (!habit || !allCompletions) {
      return { streakStartDate: null };
    }
    
    // Filter allCompletions to only include completed entries for the current habit for streak calculation
    const habitCompletionsAsStrings = allCompletions
      .filter(c => (c.user_habit_id === habit.id || c.habit_id === habit.id) && c.completed)
      .map(c => c.completion_date);

    const habitWithCompletions = {
      ...habit,
      completions: habitCompletionsAsStrings
    };
    
    return recomputeStreak(habitWithCompletions, weekStart === 'sunday' ? 0 : 1);
  }, [habit, allCompletions, weekStart]);

  const formatCompletionParts = (completion) => {
    const dateToFormat = completion.created_date || completion.completion_date;
    const date = new Date(dateToFormat);
    
    const datePart = date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
    
    const timePart = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit', hour12: false 
    });
    
    return { datePart, timePart };
  };

  // Removed generateId as DataManager handles ID generation

  const updateAndResortCompletions = async () => {
    try {
      // Refresh completions from DataManager (fetches all completions stored)
      const freshCompletions = await DataManager.getCompletions();
      
      // Filter completions relevant to the current habit only
      const currentHabitCompletions = freshCompletions.filter(c => (c.user_habit_id === habit.id || c.habit_id === habit.id));

      // Update completions state for display (only completed ones, sorted)
      const displayCompletions = currentHabitCompletions
        .filter(c => c.completed) // Only completed ones for display in the log
        .sort((a, b) => new Date(b.created_date || b.completion_date) - new Date(a.created_date || a.completion_date));
      
      setCompletions(displayCompletions);

      // Update allCompletions state for streak calculation (all completions for this habit)
      setAllCompletions(currentHabitCompletions); 
    } catch (error) {
      console.error("Error refreshing completions:", error);
    }
  };

  const handleAddLog = async () => {
    try {
      await DataManager.createCompletion({
        user_habit_id: habit.id,
        completion_date: formData.date,
        completed: true,
        progress_count: 1, // Added as per outline
        created_date: new Date(`${formData.date}T${formData.time}`).toISOString()
      });
      
      await updateAndResortCompletions(); // Refresh data after adding
      setShowAddForm(false);
      setFormData({
        date: new Date().toLocaleDateString('en-CA'),
        time: new Date().toTimeString().slice(0, 5)
      });
    } catch (error) {
      console.error("Error adding completion:", error);
    }
  };

  const handleEditLog = (completion) => {
    setEditingCompletion(completion);
    const completionDate = new Date(completion.created_date || completion.completion_date);
    setFormData({
      date: completionDate.toLocaleDateString('en-CA'),
      time: completionDate.toTimeString().slice(0, 5)
    });
    setShowEditForm(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCompletion) return;

    try {
      await DataManager.updateCompletion(editingCompletion.id, {
        completion_date: formData.date,
        created_date: new Date(`${formData.date}T${formData.time}`).toISOString(),
        updated_date: new Date().toISOString(), // Ensure updated_date is set
      });
      
      await updateAndResortCompletions(); // Refresh data after updating
      setShowEditForm(false);
      setEditingCompletion(null);
    } catch (error) {
      console.error("Error updating completion:", error);
    }
  };

  const handleDeleteLog = async () => {
    if (!editingCompletion) return;

    try {
      await DataManager.deleteCompletion(editingCompletion.id);
      await updateAndResortCompletions(); // Refresh data after deleting
      setShowEditForm(false);
      setEditingCompletion(null);
    } catch (error) {
      console.error("Error deleting completion:", error);
    }
  };
  
  const hasFormChanges = () => {
    if (!editingCompletion) return false;
    const originalDate = new Date(editingCompletion.created_date || editingCompletion.completion_date);
    const originalDateStr = originalDate.toLocaleDateString('en-CA');
    const originalTimeStr = originalDate.toTimeString().slice(0, 5);
    return formData.date !== originalDateStr || formData.time !== originalTimeStr;
  };

  const formatWeekHeader = (weekStartDateString) => {
    const startDate = new Date(weekStartDateString);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    const formatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
    const startStr = startDate.toLocaleDateString('en-US', formatOptions);
    const endStr = endDate.toLocaleDateString('en-US', formatOptions);
    return `Week of ${startStr} – ${endStr}`;
  };

  const groupedLogs = useMemo(() => {
    if (completions.length === 0) return {};
    const getWeekStartForDate = (date) => {
      const d = new Date(date);
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - day + (weekStart === 'monday' ? (day === 0 ? -6 : 1) : 0);
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
    };
    
    const grouped = completions.reduce((acc, completion) => {
        const completionDate = new Date(completion.created_date || completion.completion_date);
        const weekStartKey = getWeekStartForDate(completionDate).toISOString();
        if (!acc[weekStartKey]) acc[weekStartKey] = [];
        acc[weekStartKey].push(completion);
        return acc;
    }, {});

    // Sort completions within each week by date (latest first)
    Object.keys(grouped).forEach(weekKey => {
      grouped[weekKey].sort((a, b) => {
        const dateA = new Date(a.created_date || a.completion_date);
        const dateB = new Date(b.created_date || b.completion_date);
        return dateB - dateA; // Latest first
      });
    });

    return grouped;
  }, [completions, weekStart]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-50 overflow-y-auto"
    >
      <div className="min-h-screen">
        <motion.header
          className="sticky top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-sm border-b border-slate-200"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="flex items-center justify-between px-4"
            style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 0.5rem)`, paddingBottom: '0.5rem' }}
          >
            <Button variant="ghost" size="icon" onClick={onClose} className="touch-manipulation">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{habit.emoji}</span>
              <h1 className="text-xl font-bold text-slate-900 truncate">{habit.name}</h1>
            </div>
            <div className="w-10" />
          </div>
        </motion.header>

        <Button
          onClick={() => setShowAddForm(true)}
          className="fixed bottom-[calc(3rem+env(safe-area-inset-bottom))] right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-14 px-6 rounded-full flex items-center gap-2 text-base font-semibold"
          style={{ boxShadow: '0 15px 20px -3px rgb(0 0 0 / 0.25)' }}
        >
          <Plus className="w-5 h-5" />
          Add Log
        </Button>

        <div className="px-4 pb-safe-bottom">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="pt-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Completion Log ({completions.length} entries)
            </h2>
            {completions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-slate-600">No completions recorded yet</p>
              </div>
            ) : (
              <div className="pb-32">
                {Object.keys(groupedLogs).sort((a, b) => new Date(b) - new Date(a)).map(weekStartKey => (
                  <div key={weekStartKey}>
                    <div className="sticky z-10 bg-white" style={{ top: `calc(env(safe-area-inset-top, 0px) + 4rem)` }}>
                      <div className="py-4 border-t border-b border-slate-200">
                        <h3 className="text-center text-xs font-medium uppercase text-slate-500 tracking-wider">
                            {formatWeekHeader(weekStartKey)}
                        </h3>
                      </div>
                    </div>
                    <div className="space-y-3 py-3">
                      {groupedLogs[weekStartKey].map((completion, index) => {
                        const { datePart, timePart } = formatCompletionParts(completion);
                        
                        let isInStreak = false;
                        if (streakInfo.streakStartDate) {
                          // YYYY-MM-DD string comparison works correctly
                          isInStreak = completion.completion_date >= streakInfo.streakStartDate;
                        }

                        return (
                          <motion.button key={completion.id || index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }} className="w-full bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 text-left" onClick={() => handleEditLog(completion)}>
                            <div className="flex items-center justify-between w-full gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${isInStreak ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                <span className="font-bold text-slate-900 truncate">{datePart}</span>
                              </div>
                              <span className="text-slate-500 font-regular flex-shrink-0">{timePart}</span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Add/Edit Modals */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowAddForm(false)}>
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-white rounded-t-2xl w-full p-6 pb-safe-bottom" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Add Log Entry</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}><X className="w-6 h-6" /></Button>
                </div>
                <div className="space-y-4 mb-6">
                  <div><Label htmlFor="date" className="text-base font-medium">Date</Label><Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="h-12 text-lg mt-2" max={todayMaxDate} /></div>
                  <div><Label htmlFor="time" className="text-base font-medium">Time</Label><Input id="time" type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="h-12 text-lg mt-2" /></div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1 h-12 text-base">Cancel</Button>
                  <Button onClick={handleAddLog} className="flex-1 h-12 text-base bg-blue-600 hover:bg-blue-700"><Check className="w-5 h-5 mr-2" />Add Log</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
          {showEditForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => { setShowEditForm(false); setEditingCompletion(null); }}>
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-white rounded-t-2xl w-full p-6 pb-safe-bottom" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Edit Log Entry</h3>
                  <Button variant="ghost" size="icon" onClick={() => { setShowEditForm(false); setEditingCompletion(null); }}><X className="w-6 h-6" /></Button>
                </div>
                <div className="space-y-4 mb-6">
                  <div><Label htmlFor="edit-date" className="text-base font-medium">Date</Label><Input id="edit-date" type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="h-12 text-lg mt-2" max={todayMaxDate} /></div>
                  <div><Label htmlFor="edit-time" className="text-base font-medium">Time</Label><Input id="edit-time" type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="h-12 text-lg mt-2" /></div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleDeleteLog} className="flex-1 h-12 text-base border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300">Delete</Button>
                  <Button onClick={handleSaveEdit} disabled={!hasFormChanges()} className={`flex-1 h-12 text-base ${hasFormChanges() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}><Check className="w-5 h-5 mr-2" />Save</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
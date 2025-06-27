
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { X, Calendar as CalendarIcon, Clock, Flag, Zap, Timer, AlertCircle, ArrowLeft, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { calculateSortValue, mapEnumsToValues } from './sortValueCalculator';

const Toast = ({ message, show, onDismiss }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => { onDismiss(); }, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onDismiss]);

    if (!show) return null;
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-[9999]"
        >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span>{message}</span>
        </motion.div>
    );
};

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", confirmVariant = "default" }) => {
    if (!isOpen) return null;
    
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-600 mb-6">{message}</p>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                    <Button 
                        onClick={onConfirm} 
                        variant={confirmVariant} // Use variant prop for styling
                        className="flex-1" // Keep flex-1 for layout
                    >
                        {confirmText}
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
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

const DEFAULT_SETTINGS = { 
  visibleFields: { 
    description: true, 
    priority: true, 
    effort: false, 
    timeEstimation: false, 
    dueDate: true, 
    scheduledTime: false 
  },
  cardFields: {
    description: false,
    priority: false,
    effort: false,
    timeEstimation: false,
    dueDate: false,
    scheduledTime: false
  },
  capacityCalculation: "Effort"
};

export default function EditTaskModal({ task, isOpen, onClose, onSave, onDelete, tabs = [], settings = DEFAULT_SETTINGS, onSettingsChange }) {
  const [originalTask, setOriginalTask] = useState({});
  const [formData, setFormData] = useState({});
  const [toast, setToast] = useState({ show: false, message: "" });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (task) {
      const taskData = {
        name: "", description: "", status: "To Do", tabs: [], dueDate: "",
        scheduledTime: "", priority: "", effort: "", timeEstimation: "",
        ...task
      };
      setOriginalTask(taskData);
      setFormData(taskData);
    }
  }, [task]);

  // Track changes
  useEffect(() => {
    if (task) {
      const isChanged = JSON.stringify(formData) !== JSON.stringify(originalTask);
      setHasChanges(isChanged);
    }
  }, [formData, originalTask, task]);

  // The problematic effect that was causing API spam has been removed.
  // It was:
  // useEffect(() => {
  //   if (isOpen && onSettingsChange) {
  //     onSettingsChange();
  //   }
  // }, [isOpen, onSettingsChange]);

  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      setToast({ show: true, message: "Task name is required." });
      return;
    }

    if (!hasChanges) {
      onClose();
      return;
    }

    try {
      const valueMappings = mapEnumsToValues(formData);
      const sortValue = calculateSortValue({ ...formData, ...valueMappings }, settings);

      const taskData = {
        ...formData,
        ...valueMappings,
        sortValue,
      };
      
      // Ensure task has at least one regular tab if no smart tabs are active
      const isAnySmartTabActive = isToday(formData.dueDate) || isOverdue(formData.dueDate) || isTomorrow(formData.dueDate);
      let regularTabs = taskData.tabs ? taskData.tabs.filter(t => t !== "Today" && t !== "Tomorrow") : [];
      
      if (regularTabs.length === 0 && !isAnySmartTabActive) {
        regularTabs = ["Inbox"]; // Default to Inbox if no regular tabs and no smart tabs are active
      }
      taskData.tabs = regularTabs;

      await onSave(task.id, taskData);
      onClose();
    } catch (error) {
      console.error("Failed to save task:", error);
      setToast({ show: true, message: "Couldn't save. Try again." });
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowConfirmDialog(false);
    onClose();
  };

  const handleDelete = async () => {
    try {
      if (onDelete) {
        await onDelete(task.id);
        setShowDeleteDialog(false);
        onClose();
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      setToast({ show: true, message: "Couldn't delete task. Try again." });
    }
  };

  const handleTabToggle = (tabName) => {
    const currentTabs = formData.tabs || [];
    
    // Handle smart tabs (Today/Tomorrow)
    if (tabName === "Today") {
      if (isToday(formData.dueDate) || isOverdue(formData.dueDate)) {
        // Remove Today by clearing dueDate if it's today or overdue
        const regularTabs = currentTabs.filter(t => t !== "Today" && t !== "Tomorrow");
        const wouldHaveTomorrow = isTomorrow(""); // false since we're clearing dueDate
        
        if (regularTabs.length === 0 && !wouldHaveTomorrow) {
          setToast({ show: true, message: "A task must be included in at least one tab." });
          return;
        }
        updateFormData({ dueDate: "" });
      } else {
        // Add Today by setting dueDate to today
        updateFormData({ dueDate: new Date().toISOString().slice(0, 10) });
      }
      return;
    }
    
    if (tabName === "Tomorrow") {
      if (isTomorrow(formData.dueDate)) {
        // Remove Tomorrow by clearing dueDate
        const regularTabs = currentTabs.filter(t => t !== "Today" && t !== "Tomorrow");
        const wouldHaveToday = isToday("") || isOverdue(""); // false since we're clearing dueDate
        
        if (regularTabs.length === 0 && !wouldHaveToday) {
          setToast({ show: true, message: "A task must be included in at least one tab." });
          return;
        }
        updateFormData({ dueDate: new Date().toISOString().slice(0, 10) });
        updateFormData({ dueDate: "" });
      } else {
        // Add Tomorrow by setting dueDate to tomorrow
        updateFormData({ dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10) });
      }
      return;
    }
    
    // Handle regular tabs
    const regularTabs = currentTabs.filter(t => t !== "Today" && t !== "Tomorrow");
    
    if (regularTabs.includes(tabName)) {
      // Trying to remove a regular tab - check if task would still be visible somewhere
      const remainingRegularTabs = regularTabs.filter(t => t !== tabName);
      
      // Check if task would still be active in smart tabs after removal
      const wouldHaveToday = isToday(formData.dueDate) || isOverdue(formData.dueDate);
      const wouldHaveTomorrow = isTomorrow(formData.dueDate);
      
      // Prevent removal if task would have no tabs at all
      if (remainingRegularTabs.length === 0 && !wouldHaveToday && !wouldHaveTomorrow) {
        setToast({ show: true, message: "A task must be included in at least one tab." });
        return;
      }
      
      // Safe to remove - update tabs
      updateFormData({ tabs: remainingRegularTabs });
    } else {
      // Adding a regular tab
      updateFormData({ tabs: [...regularTabs, tabName] });
    }
  };

  const handleDateSelect = (date) => {
    updateFormData({ dueDate: date ? format(date, 'yyyy-MM-dd') : "" });
    // Close the popover after selecting a date
    setDatePickerOpen(false);
  };

  const handleClearDate = () => {
    updateFormData({ dueDate: "" });
  };

  // Get smart tab status
  const getSmartTabStatus = () => {
    const result = [];
    
    // Add regular tabs
    const regularTabs = (formData.tabs || []).filter(t => t !== "Today" && t !== "Tomorrow");
    result.push(...regularTabs);
    
    // Add smart tabs based on dueDate
    if (isToday(formData.dueDate) || isOverdue(formData.dueDate)) {
      result.push("Today");
    }
    if (isTomorrow(formData.dueDate)) {
      result.push("Tomorrow");
    }
    
    return result;
  };

  const isFormValid = formData.name?.trim();

  if (!isOpen || !task) return null;

  const displayTabs = getSmartTabStatus();

  return (
    <>
      <Toast message={toast.message} show={toast.show} onDismiss={() => setToast({ show: false, message: "" })} />
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmDiscard}
        title="Discard changes?"
        message="You have unsaved changes. Are you sure you want to discard them?"
        confirmText="Discard"
        confirmVariant="destructive"
      />
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete this task?"
        message="This action is permanent and cannot be undone."
        confirmText="Delete"
        confirmVariant="destructive"
      />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-white z-50 flex flex-col"
      >
        {/* Header */}
        <motion.header
          className="flex-shrink-0 z-30 bg-white/90 backdrop-blur-sm border-b border-slate-200"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="flex items-center justify-between px-4"
            style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 0.5rem)`, paddingBottom: '0.5rem' }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            
            <h2 className="text-xl font-bold text-slate-900">Edit Task</h2>
            
            <button
              onClick={handleSave}
              disabled={!hasChanges || !isFormValid}
              className={`
                text-sm font-medium transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center
                ${(hasChanges && isFormValid) ? 'text-blue-600 hover:text-blue-700' : 'text-slate-400 cursor-not-allowed'}
              `}
              style={{ fontSize: '14px' }}
            >
              SAVE
            </button>
          </div>
        </motion.header>

        {/* Content */}
        <div className="flex-grow overflow-y-auto">
          <div className="px-4 pb-safe-bottom pt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <Label htmlFor="taskName" className="text-base font-medium">Task Name</Label>
                <Input id="taskName" value={formData.name || ''} onChange={(e) => updateFormData({ name: e.target.value })} className="mt-2 h-12 text-lg" placeholder="Enter task name..." />
              </div>
              {(settings?.visibleFields?.description) && (
                <div>
                  <Label htmlFor="description" className="text-base font-medium">Description</Label>
                  <Textarea id="description" value={formData.description || ""} onChange={(e) => updateFormData({ description: e.target.value })} className="mt-2 min-h-[100px]" placeholder="Add details about this task..." />
                </div>
              )}
              <div>
                <Label className="text-base font-medium">Status</Label>
                <Select value={formData.status} onValueChange={(value) => updateFormData({ status: value })}>
                  <SelectTrigger className="mt-2 h-12"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To Do">To Do</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                    <SelectItem value="Archive">Archive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-base font-medium">Tags</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {/* Smart tabs first - only show if not hidden */}
                  {["Today", "Tomorrow"].filter(smartTabName => {
                    const smartTab = tabs.find(t => t.name === smartTabName);
                    return !smartTab?.hidden;
                  }).map(smartTab => {
                    const isActive = displayTabs.includes(smartTab);
                    
                    return (
                      <Badge
                        key={smartTab}
                        variant={isActive ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${
                          isActive 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'hover:bg-slate-100'
                        }`}
                        onClick={() => handleTabToggle(smartTab)}
                      >
                        {smartTab}
                      </Badge>
                    );
                  })}
                  
                  {/* Regular tabs */}
                  {tabs.filter(tab => !tab.hidden && tab.name !== 'Done' && tab.name !== 'Today' && tab.name !== 'Tomorrow').map(tab => {
                    const isSelected = displayTabs.includes(tab.name);
                    
                    return (
                      <Badge
                        key={tab.id}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'hover:bg-slate-100'
                        }`}
                        onClick={() => handleTabToggle(tab.name)}
                      >
                        {tab.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              {(settings?.visibleFields?.dueDate) && (
                <div>
                  <Label className="text-base font-medium flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Due Date
                  </Label>
                  <div className="mt-2">
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-12 justify-between text-left font-normal"
                          aria-haspopup="dialog"
                          aria-label={formData.dueDate ? `Due date: ${format(new Date(formData.dueDate), 'PPP')}` : 'Select due date'}
                        >
                          <span className={formData.dueDate ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                            {formData.dueDate ? format(new Date(formData.dueDate), 'PPP') : 'Select date'}
                          </span>
                          <div className="flex items-center gap-2">
                            {formData.dueDate && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClearDate();
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                                aria-label="Clear due date"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            <CalendarIcon className="w-4 h-4 text-slate-400" />
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.dueDate ? new Date(formData.dueDate) : undefined}
                          onSelect={handleDateSelect}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
              {(settings?.visibleFields?.scheduledTime) && formData.dueDate && (
                <div>
                  <Label htmlFor="scheduledTime" className="text-base font-medium flex items-center gap-2"><Clock className="w-4 h-4" />Scheduled Time</Label>
                  <Input id="scheduledTime" type="time" value={formData.scheduledTime || ""} onChange={(e) => updateFormData({ scheduledTime: e.target.value })} className="mt-2 h-12" />
                </div>
              )}
              {(settings?.visibleFields?.priority) && (
                <div>
                  <Label className="text-base font-medium flex items-center gap-2"><Flag className="w-4 h-4" />Priority</Label>
                  <Select value={formData.priority || ""} onValueChange={(value) => updateFormData({ priority: value })}>
                    <SelectTrigger className="mt-2 h-12"><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(settings?.visibleFields?.effort) && (
                <div>
                  <Label className="text-base font-medium flex items-center gap-2"><Zap className="w-4 h-4" />Effort</Label>
                  <Select value={formData.effort || ""} onValueChange={(value) => updateFormData({ effort: value })}>
                    <SelectTrigger className="mt-2 h-12"><SelectValue placeholder="Select effort" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem><SelectItem value="S">S - Small</SelectItem><SelectItem value="M">M - Medium</SelectItem><SelectItem value="L">L - Large</SelectItem><SelectItem value="XL">XL - Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(settings?.visibleFields?.timeEstimation) && (
                <div>
                  <Label className="text-base font-medium flex items-center gap-2"><Timer className="w-4 h-4" />Time Estimation</Label>
                  <Select value={formData.timeEstimation || ""} onValueChange={(value) => updateFormData({ timeEstimation: value })}>
                    <SelectTrigger className="mt-2 h-12"><SelectValue placeholder="Select time estimation" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem><SelectItem value="15m">15 minutes</SelectItem><SelectItem value="30m">30 minutes</SelectItem><SelectItem value="1h">1 hour</SelectItem><SelectItem value="1.5h">1.5 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Delete Task Button */}
              <div className="flex flex-col gap-3 pt-6 pb-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteDialog(true)}
                  className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-lg font-semibold"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Delete Task
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

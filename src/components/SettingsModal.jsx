
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import DataManager from "./DataManager";
import { calculateSortValue, mapEnumsToValues } from "./todo/sortValueCalculator";

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

export default function SettingsModal({ isOpen, onClose, onSettingsSaved }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  // Track changes
  useEffect(() => {
    if (originalSettings) {
      const isChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
      setHasChanges(isChanged);
    }
  }, [settings, originalSettings]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const userSettings = await DataManager.getSettings();
      const currentSettings = (userSettings && userSettings.todoSettings) ? userSettings.todoSettings : DEFAULT_SETTINGS;
      
      setSettings(currentSettings);
      setOriginalSettings(JSON.parse(JSON.stringify(currentSettings))); // Deep copy for comparison
    } catch (error) {
      console.error("Failed to load settings:", error);
      setSettings(DEFAULT_SETTINGS);
      setOriginalSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    try {
      const currentSettings = await DataManager.getSettings() || {};
      const updatedSettings = {
        ...currentSettings,
        todoSettings: settings
      };
      
      await DataManager.updateSettings(updatedSettings);
      
      // Update all existing tasks with the new capacity calculation method if it changed
      if (originalSettings?.capacityCalculation !== settings.capacityCalculation) {
        try {
          const allTasks = await DataManager.getTasks();
          const updatePromises = allTasks.map(task => {
            const valueMappings = mapEnumsToValues(task);
            const taskWithMappedValues = { ...task, ...valueMappings };
            const newSortValue = calculateSortValue(taskWithMappedValues, settings);
            
            return DataManager.updateTask(task.id, { 
              capacityScoreType: settings.capacityCalculation,
              sortValue: newSortValue 
            });
          });
          await Promise.all(updatePromises);
        } catch (taskUpdateError) {
          console.warn("Failed to update some tasks with new capacity calculation:", taskUpdateError);
          // Don't block the settings save if task updates fail
        }
      }

      // Notify that settings were saved
      if (onSettingsSaved) {
        onSettingsSaved();
      }

      onClose();
    } catch (error) {
      console.error("Failed to save settings:", error);
      // Could show a toast/error message here
    }
  };

  const updateVisibleField = (field, enabled) => {
    const newSettings = {
      ...settings,
      visibleFields: {
        ...settings.visibleFields,
        [field]: enabled
      },
      // Auto-disable card field if visible field is disabled
      cardFields: {
        ...settings.cardFields,
        [field]: enabled ? settings.cardFields[field] : false
      }
    };
    
    setSettings(newSettings);
  };

  const updateCardField = (field, enabled) => {
    const newSettings = {
      ...settings,
      cardFields: {
        ...settings.cardFields,
        [field]: enabled
      }
    };
    
    setSettings(newSettings);
  };

  const updateCapacityCalculation = (method) => {
    const newSettings = {
      ...settings,
      capacityCalculation: method
    };
    
    setSettings(newSettings);
  };

  const fieldLabels = {
    description: "Description",
    priority: "Priority",
    effort: "Effort",
    timeEstimation: "Time Estimation",
    dueDate: "Due Date",
    scheduledTime: "Scheduled Time"
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-50 flex flex-col"
    >
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
            onClick={onClose}
            className="touch-manipulation"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-slate-900">Settings</h1>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`
              text-sm font-medium transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center
              ${hasChanges ? 'text-blue-600 hover:text-blue-700' : 'text-slate-400 cursor-not-allowed'}
            `}
            style={{ fontSize: '14px' }}
          >
            SAVE
          </button>
        </div>
      </motion.header>

      <div className="flex-grow overflow-y-auto">
        <div className="px-4 pb-8 pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-600">Loading settings...</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Visible Fields Section */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Visible Fields</h2>
                <p className="text-slate-600 text-sm mb-6">Choose which fields to show when editing tasks</p>
                <div className="space-y-4">
                  {Object.entries(fieldLabels).map(([field, label]) => (
                    <div key={field} className="flex items-center justify-between">
                      <Label htmlFor={`visible-${field}`} className="text-base">
                        {label}
                      </Label>
                      <Switch
                        id={`visible-${field}`}
                        checked={settings.visibleFields[field]}
                        onCheckedChange={(checked) => updateVisibleField(field, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Fields Section */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Task Card Display</h2>
                <p className="text-slate-600 text-sm mb-6">Choose which fields to show on task cards in the list</p>
                <div className="space-y-4">
                  {Object.entries(fieldLabels).map(([field, label]) => (
                    <div key={field} className="flex items-center justify-between">
                      <Label htmlFor={`card-${field}`} className="text-base">
                        {label}
                      </Label>
                      <Switch
                        id={`card-${field}`}
                        checked={settings.cardFields[field]}
                        disabled={!settings.visibleFields[field]}
                        onCheckedChange={(checked) => updateCardField(field, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Capacity Calculation Section */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Task Sorting</h2>
                <p className="text-slate-600 text-sm mb-6">Choose how tasks are prioritized and sorted</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="capacity-calculation" className="text-base">
                      Capacity Calculation Method
                    </Label>
                    <Select
                      value={settings.capacityCalculation}
                      onValueChange={updateCapacityCalculation}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Effort">Based on Effort</SelectItem>
                        <SelectItem value="Estimated Time">Based on Time Estimation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-slate-500">
                    This determines how tasks are scored and sorted in your lists. 
                    {settings.capacityCalculation === "Effort" 
                      ? " Tasks with higher effort levels will be prioritized."
                      : " Tasks with longer time estimates will be prioritized."
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

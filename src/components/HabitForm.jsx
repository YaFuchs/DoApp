
import React, { useState, useRef, useEffect, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, X, Check, ArrowLeft, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Lazy load the emoji picker
const EmojiPicker = React.lazy(() => import('./EmojiPicker'));

const PRESET_HABITS = [
  { name: "Drink water", emoji: "💧", frequency: 7 },
  { name: "Exercise", emoji: "🏃‍♂️", frequency: 5 },
  { name: "Read", emoji: "📚", frequency: 5 },
  { name: "Meditate", emoji: "🧘‍♀️", frequency: 7 },
  { name: "Take vitamins", emoji: "💊", frequency: 7 },
  { name: "Walk", emoji: "🚶‍♂️", frequency: 6 },
  { name: "Sleep early", emoji: "😴", frequency: 7 },
  { name: "Write journal", emoji: "📝", frequency: 5 },
];

const COMMON_EMOJIS = [
  "💧", "🏃‍♂️", "🧘‍♀️", "💊", "🚶‍♂️", "😴", "🥗", "🏋️‍♂️", "📚", "📝", "💻", "🎓",
  "🧠", "📖", "✏️", "📊", "💼", "📧", "📞", "📋", "💡", "🎯", "📈", "⏰",
  "❤️", "🎨", "🎵", "🌱", "☀️", "🌟", "🎉", "🙏", "😊", "👍", "💪", "💡"
];

const getRandomEmoji = () => COMMON_EMOJIS[Math.floor(Math.random() * COMMON_EMOJIS.length)];

export default function HabitForm({ habit, onSave, onCancel, onDelete }) {
  const [step, setStep] = useState(habit ? 'form' : 'presets');
  const [formData, setFormData] = useState(() => {
    const initialData = habit || {
      name: "",
      emoji: "",
      frequency: 5,
      reminder_enabled: false,
      reminder_time: "09:00",
      daily_goal_enabled: false,
      daily_goal_target: 3,
      daily_goal_unit: "Count",
    };
    if (!initialData.emoji && !habit) {
      initialData.emoji = getRandomEmoji();
    }
    return initialData;
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const emojiButtonRef = useRef(null);
  
  // Track changes for edit mode
  useEffect(() => {
    if (!habit) return; // Only track changes in edit mode
    
    const isChanged = JSON.stringify(formData) !== JSON.stringify(habit);
    setHasChanges(isChanged);
  }, [formData, habit]);

  useEffect(() => {
    if (step === 'form' && !habit && !formData.emoji) {
      setFormData(prev => ({ ...prev, emoji: getRandomEmoji() }));
    }
  }, [step, habit, formData.emoji]);

  const handlePresetSelect = (preset) => {
    setFormData({
        ...formData,
        ...preset,
        emoji: preset.emoji || getRandomEmoji(),
        daily_goal_enabled: false // Presets don't have daily goals by default
    });
    setStep('form');
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission if triggered by <form>
    if (formData.name && formData.emoji) {
      onSave(formData);
    }
  };

  const handleSaveClick = () => {
    if (formData.name && formData.emoji && hasChanges) {
      onSave(formData);
    }
  };

  const adjustFrequency = (delta) => {
    const newFreq = Math.max(1, Math.min(7, formData.frequency + delta));
    setFormData({ ...formData, frequency: newFreq });
  };

  const handleEmojiButtonClick = () => {
    setShowEmojiPicker(true);
  };

  const handleEmojiSelect = (emoji) => {
    setFormData(prev => ({ ...prev, emoji }));
    setShowEmojiPicker(false);
  };

  // Determine if form is valid
  const isFormValid = formData.name && formData.emoji && (!formData.daily_goal_enabled || (formData.daily_goal_target >= 1 && formData.daily_goal_unit.trim() !== ""));

  if (step === 'presets') {
    return (
      <div className="flex flex-col h-full">
        {/* Header - now a non-scrolling flex item */}
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
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-6 h-6" />
            </Button>
            <h2 className="text-xl font-bold text-slate-900">New Habit</h2>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </motion.header>

        {/* Content - now the scrolling area */}
        <div className="flex-grow overflow-y-auto">
          <div className="px-4 pb-24 pt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {PRESET_HABITS.map((preset, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handlePresetSelect(preset)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left bg-white"
                >
                  <span className="text-3xl">{preset.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-lg">{preset.name}</p>
                    <p className="text-slate-500">{preset.frequency}x per week</p>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Floating Action Button for Custom Habit */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="fixed bottom-8 left-4 right-4 z-50 flex justify-center"
          style={{ bottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
        >
          <Button
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                name: "",
                emoji: getRandomEmoji(),
                daily_goal_enabled: false, // Ensure daily_goal is off for new custom habits
              }));
              setStep('form');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-14 px-6 rounded-full flex items-center gap-2 text-base font-semibold max-w-full"
          >
            <Plus className="w-5 h-5" />
            Create Custom Habit
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - now a non-scrolling flex item */}
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
            onClick={step === 'form' && !habit ? () => setStep('presets') : onCancel}
          >
            {step === 'form' && !habit ? <ArrowLeft className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </Button>
          
          {/* Dynamic title for edit mode, static for new habit */}
          <h2 className="text-xl font-bold text-slate-900">
            {habit ? `${formData.emoji} ${formData.name}` : 'New Habit'}
          </h2>
          
          {/* SAVE button for both edit mode AND new habit mode */}
          <button
            onClick={habit ? handleSaveClick : handleSubmit}
            disabled={habit ? (!hasChanges || !isFormValid) : !isFormValid}
            className={`
              text-sm font-medium transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center
              ${habit 
                ? (hasChanges && isFormValid ? 'text-blue-600 hover:text-blue-700' : 'text-slate-400 cursor-not-allowed')
                : (isFormValid ? 'text-blue-600 hover:text-blue-700' : 'text-slate-400 cursor-not-allowed')
              }
            `}
            style={{ fontSize: '14px' }}
          >
            SAVE
          </button>
        </div>
      </motion.header>

      {/* Content - now the scrolling area */}
      <div className="flex-grow overflow-y-auto">
        <div className="px-4 pb-safe-bottom pt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-lg font-semibold">Habit Details</Label>
                <div className="flex items-center gap-3">
                  <Button
                    ref={emojiButtonRef}
                    type="button"
                    variant="outline"
                    className="p-3 h-12 w-14 flex-shrink-0 text-2xl hover:bg-slate-100"
                    onClick={handleEmojiButtonClick}
                    title="Click to choose emoji"
                  >
                    {formData.emoji || "❓"}
                  </Button>
                  <div className="habit-form-field flex-grow border border-slate-300 rounded-md focus-within:border-blue-500 transition-colors duration-200">
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Drink 8 glasses of water"
                      className="text-lg h-12 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                      autoFocus={!habit}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 px-1">
                  Click the emoji button to open the emoji picker.
                </p>
              </div>

              <div className="space-y-4">
                <Label className="text-lg font-semibold">Weekly Frequency</Label>
                <div className="flex items-center justify-center gap-6 py-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustFrequency(-1)}
                    disabled={formData.frequency <= 1}
                    className="w-12 h-12"
                  >
                    <Minus className="w-5 h-5" />
                  </Button>
                  <div className="text-center">
                    <span className="text-4xl font-bold text-slate-900 block">
                      {formData.frequency}
                    </span>
                    <span className="text-slate-600">times per week</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustFrequency(1)}
                    disabled={formData.frequency >= 7}
                    className="w-12 h-12"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reminder" className="text-lg font-semibold">Daily Reminder</Label>
                  <Switch
                    id="reminder"
                    checked={formData.reminder_enabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, reminder_enabled: checked })
                    }
                  />
                </div>
                {formData.reminder_enabled && (
                  <div className="space-y-2">
                    <div className="habit-form-field border border-slate-300 rounded-md focus-within:border-blue-500 transition-colors duration-200">
                      <Input
                        type="time"
                        value={formData.reminder_time}
                        onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                        className="w-full h-12 text-lg border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                      />
                    </div>
                    <p className="text-sm text-slate-500 px-1">
                      You'll receive a browser notification at this time each day.
                    </p>
                  </div>
                )}
              </div>

              {/* Daily Goal Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="daily_goal_enabled" className="text-lg font-semibold">Set a Daily Goal</Label>
                  <Switch
                    id="daily_goal_enabled"
                    checked={formData.daily_goal_enabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, daily_goal_enabled: checked })
                    }
                  />
                </div>
                {formData.daily_goal_enabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 pt-2 overflow-hidden"
                  >
                    <p className="text-xs text-slate-500 -mt-2 mb-2">
                      Toggle on to log partial progress toward today's target (e.g. track multiple glasses of water or minutes of exercise).
                    </p>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label htmlFor="daily_goal_target">Target</Label>
                        <div className="habit-form-field mt-1 border border-slate-300 rounded-md focus-within:border-blue-500 transition-colors duration-200">
                          <Input
                            id="daily_goal_target"
                            type="number"
                            value={formData.daily_goal_target}
                            onChange={(e) => setFormData({ ...formData, daily_goal_target: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="h-12 text-lg border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                            min="1"
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          How many units you want to complete each day (for example: `7` for seven glasses, `30` for thirty minutes).
                        </p>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="daily_goal_unit">Unit</Label>
                        <div className="habit-form-field mt-1 border border-slate-300 rounded-md focus-within:border-blue-500 transition-colors duration-200">
                          <Input
                            id="daily_goal_unit"
                            value={formData.daily_goal_unit}
                            onChange={(e) => setFormData({ ...formData, daily_goal_unit: e.target.value })}
                            placeholder="e.g., glasses, km"
                            className="h-12 text-lg border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          What you're counting—your unit of measure (for example: "glasses of water," "minutes of meditation," "km," or "reps").
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Delete button for existing habits only */}
              {habit && onDelete && (
                <div className="flex flex-col gap-3 pt-6 pb-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onDelete(habit.id)}
                    className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-lg font-semibold"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Delete Habit
                  </Button>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      </div>

      {/* Emoji Picker */}
      <Suspense fallback={null}>
        <EmojiPicker
          isOpen={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onEmojiSelect={handleEmojiSelect}
        />
      </Suspense>
    </div>
  );
}

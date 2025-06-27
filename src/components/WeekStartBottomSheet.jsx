import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export default function WeekStartBottomSheet({ 
  isOpen, 
  onClose, 
  currentWeekStart, 
  onWeekStartChange 
}) {
  const options = [
    { value: 'monday', label: 'Monday', description: 'Week starts on Monday' },
    { value: 'sunday', label: 'Sunday', description: 'Week starts on Sunday' }
  ];

  const handleOptionSelect = (value) => {
    onWeekStartChange(value);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Week Start</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Options */}
            <div className="p-4 space-y-3">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect(option.value)}
                  className={`
                    w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200
                    ${currentWeekStart === option.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="text-left">
                    <p className="font-medium text-slate-900">{option.label}</p>
                    <p className="text-sm text-slate-500">{option.description}</p>
                  </div>
                  {currentWeekStart === option.value && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </button>
              ))}
            </div>

            {/* Safe area padding for bottom */}
            <div className="pb-safe-bottom" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
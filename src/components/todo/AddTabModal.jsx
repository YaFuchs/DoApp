import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

export default function AddTabModal({ isOpen, onClose, onAddTab }) {
  const [tabName, setTabName] = useState("");
  const inputRef = useRef(null);

  // Reset tab name when modal is closed AND autofocus on open
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setTabName(""), 200); // Delay to prevent flicker on exit animation
    } else {
      // Focus the input when the modal opens.
      // Increased delay to ensure it happens after animation completes
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!tabName.trim()) return;

    onAddTab(tabName.trim());
    // Parent component will handle closing the modal.
  };

  if (!isOpen) return null;

  const isFormValid = tabName.trim() !== "";

  return (
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
            onClick={onClose}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <h2 className="text-xl font-bold text-slate-900">Add New Tab</h2>
          
          <button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className={`
              text-sm font-medium transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center
              ${isFormValid ? 'text-blue-600 hover:text-blue-700' : 'text-slate-400 cursor-not-allowed'}
            `}
            style={{ fontSize: '14px' }}
          >
            SAVE
          </button>
        </div>
      </motion.header>

      {/* Content */}
      <div className="flex-grow overflow-y-auto">
        <div className="px-4 pb-8 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tabName" className="text-base font-medium">Tab Name</Label>
                <Input
                  id="tabName"
                  ref={inputRef}
                  value={tabName}
                  onChange={(e) => setTabName(e.target.value)}
                  placeholder="Enter tab name..."
                  className="mt-2 h-12"
                />
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
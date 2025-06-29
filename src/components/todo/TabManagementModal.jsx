
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Plus, ArrowLeft } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function TabManagementModal({ isOpen, onClose, tabs, onSaveTabs }) {
  const [activeTabs, setActiveTabs] = useState([]);
  const [hiddenTabs, setHiddenTabs] = useState([]);
  const [originalTabsState, setOriginalTabsState] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmingDeleteTabId, setConfirmingDeleteTabId] = useState(null);
  const tabRefs = useRef({});

  useEffect(() => {
    if (isOpen && tabs.length > 0) {
      const active = tabs.filter(tab => !tab.hidden).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const hidden = tabs.filter(tab => tab.hidden && tab.type === 'Preset' && tab.name !== 'Inbox');
      setActiveTabs(active);
      setHiddenTabs(hidden);
      
      // Store original state for change detection
      setOriginalTabsState({
        active: JSON.stringify(active),
        hidden: JSON.stringify(hidden)
      });
    }
  }, [isOpen, tabs]);

  // Track changes
  useEffect(() => {
    if (originalTabsState) {
      const currentState = {
        active: JSON.stringify(activeTabs),
        hidden: JSON.stringify(hiddenTabs)
      };
      
      const isChanged = currentState.active !== originalTabsState.active || 
                       currentState.hidden !== originalTabsState.hidden;
      setHasChanges(isChanged);
    }
  }, [activeTabs, hiddenTabs, originalTabsState]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(activeTabs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update sort_order
    const reorderedTabs = items.map((tab, index) => ({
      ...tab,
      sort_order: index
    }));

    setActiveTabs(reorderedTabs);
  };

  const startDelete = (tabId) => {
    setConfirmingDeleteTabId(tabId);
  };

  const cancelDelete = () => {
    setConfirmingDeleteTabId(null);
  };

  const confirmDelete = (tab) => {
    handleDeleteTab(tab);
    setConfirmingDeleteTabId(null);
  };

  const handleDeleteTab = (tabToDelete) => {
    if (tabToDelete.name === 'Inbox') return; // Inbox cannot be deleted or hidden

    if (tabToDelete.type === 'Custom') {
      // Permanently delete custom tabs - remove from active tabs list
      setActiveTabs(activeTabs.filter(tab => tab.id !== tabToDelete.id));
    } else {
      // Move preset tabs to hidden (except Inbox)
      setActiveTabs(activeTabs.filter(tab => tab.id !== tabToDelete.id));
      setHiddenTabs([...hiddenTabs, { ...tabToDelete, hidden: true }]);
    }
  };

  const handleRestoreTab = (tabToRestore) => {
    setHiddenTabs(hiddenTabs.filter(tab => tab.id !== tabToRestore.id));
    const newSortOrder = Math.max(...activeTabs.map(t => t.sort_order || 0), 0) + 1;
    setActiveTabs([...activeTabs, { ...tabToRestore, hidden: false, sort_order: newSortOrder }]);
  };

  // Close delete confirmation when clicking outside the confirming tab
  useEffect(() => {
    if (!confirmingDeleteTabId) return;

    const handleMouseDown = (e) => {
      const currentRef = tabRefs.current[confirmingDeleteTabId];
      if (currentRef && !currentRef.contains(e.target)) {
        cancelDelete();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [confirmingDeleteTabId]);

  const handleSave = () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    // Prepare the tabs data for saving
    const allTabsToSave = [
      ...activeTabs.map((tab, index) => ({
        ...tab,
        sort_order: index,
        hidden: false
      })),
      ...hiddenTabs.map(tab => ({
        ...tab,
        hidden: true
      }))
    ];

    onSaveTabs(allTabsToSave);
  };

  if (!isOpen) return null;

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
          
          <h2 className="text-xl font-bold text-slate-900">Manage Tabs</h2>
          
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

      {/* Content */}
      <div className="flex-grow overflow-y-auto">
        <div className="px-4 pb-8 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Active Tabs */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-3">Active Tabs</h3>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="active-tabs">
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`space-y-2 min-h-[40px] rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : ''
                      }`}
                    >
                      {activeTabs.map((tab, index) => (
                        <Draggable
                          key={tab.id}
                          draggableId={tab.id}
                          index={index}
                          isDragDisabled={confirmingDeleteTabId === tab.id}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={(el) => {
                                provided.innerRef(el);
                                tabRefs.current[tab.id] = el;
                              }}
                              {...provided.draggableProps}
                              className="relative"
                            >
                              <AnimatePresence>
                                {confirmingDeleteTabId === tab.id && (
                                  <motion.div
                                    initial={{ opacity: 0, x: 40 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 40 }}
                                    transition={{ type: 'tween', duration: 0.2 }}
                                    className="absolute inset-y-0 right-0 flex justify-end items-center pr-4 pl-6 bg-red-500 rounded-lg z-0"
                                  >
                                    <button
                                      onClick={() => confirmDelete(tab)}
                                      className="px-2 py-1 text-sm font-medium text-white"
                                      aria-label={`Approve delete ${tab.name}`}
                                    >
                                      Approve Delete
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              <motion.div
                                className={`relative z-10 flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg ${snapshot.isDragging ? 'shadow-lg rotate-2' : 'shadow-sm'}`}
                                animate={{ x: confirmingDeleteTabId === tab.id ? -120 : 0 }}
                                transition={{ type: 'tween', duration: 0.2 }}
                                onClick={() => {
                                  if (confirmingDeleteTabId === tab.id) cancelDelete();
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape' && confirmingDeleteTabId === tab.id) {
                                    cancelDelete();
                                  }
                                }}
                                tabIndex={confirmingDeleteTabId === tab.id ? 0 : -1}
                              >
                                <div
                                  {...provided.dragHandleProps}
                                  className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>

                                <span className="flex-1 font-medium text-slate-900">{tab.name}</span>

                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                  {tab.type}
                                </span>

                                {tab.name !== 'Inbox' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => startDelete(tab.id)}
                                    className={`w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-50 ${confirmingDeleteTabId === tab.id ? 'invisible' : ''}`}
                                    aria-label={`Delete ${tab.name}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </motion.div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {/* Available Presets */}
            {hiddenTabs.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-3">Available Presets</h3>
                <div className="space-y-2">
                  {hiddenTabs.map(tab => (
                    <div key={tab.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="flex-1 font-medium text-slate-700">{tab.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRestoreTab(tab)}
                        className="w-8 h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

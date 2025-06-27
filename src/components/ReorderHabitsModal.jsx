import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GripVertical } from "lucide-react";
import { motion } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function ReorderHabitsModal({ isOpen, onClose, onSave, initialHabits }) {
  const [habits, setHabits] = useState([]);
  const [originalOrder, setOriginalOrder] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && initialHabits) {
      const sortedHabits = [...initialHabits].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setHabits(sortedHabits);
      setOriginalOrder(sortedHabits.map(h => h.id));
      setHasChanges(false);
    }
  }, [isOpen, initialHabits]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(habits);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setHabits(items);

    const newOrder = items.map(h => h.id);
    const orderChanged = JSON.stringify(newOrder) !== JSON.stringify(originalOrder);
    setHasChanges(orderChanged);
  };

  const handleSaveClick = () => {
    if (hasChanges) {
      onSave(habits);
    }
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
          <h1 className="text-xl font-bold text-slate-900">Reorder Habits</h1>
          <button
            onClick={handleSaveClick}
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
        <div className="px-4 pt-6 pb-8">
            <p className="text-slate-600 text-center mb-6">
              Drag and drop to reorder your habits
            </p>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="habits">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-3 transition-colors duration-200 ${
                      snapshot.isDraggingOver ? 'bg-blue-50/50 rounded-xl p-2' : ''
                    }`}
                  >
                    {habits.map((habit, index) => (
                      <Draggable key={habit.id} draggableId={String(habit.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`
                              bg-white rounded-xl border border-slate-200 p-4 
                              flex items-center gap-4 transition-all duration-200
                              ${snapshot.isDragging 
                                ? 'shadow-lg scale-105 rotate-2 bg-white border-blue-300' 
                                : 'shadow-sm hover:shadow-md'
                              }
                            `}
                          >
                            <span className="text-2xl flex-shrink-0">
                              {habit.emoji}
                            </span>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 truncate">
                                {habit.name}
                              </h3>
                              <p className="text-sm text-slate-500">
                                {habit.frequency}x per week
                              </p>
                            </div>
                            <div
                              {...provided.dragHandleProps}
                              className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-grab active:cursor-grabbing touch-manipulation"
                            >
                              <GripVertical className="w-5 h-5 text-slate-400" />
                            </div>
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
      </div>
    </motion.div>
  );
}
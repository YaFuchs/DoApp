import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Flag, Zap, Timer } from "lucide-react";
import {
  getTodayString,
  isToday,
  isTomorrow,
  isDateInRange,
  compareDateStrings,
  formatDateForDisplay,
} from "@/components/dateUtils";

const DEFAULT_CARD_SETTINGS = {
  description: false,
  priority: false,
  effort: false,
  timeEstimation: false,
  dueDate: false,
  scheduledTime: false
};

export default function TaskItem({ task, onStatusChange, onEdit, cardSettings = DEFAULT_CARD_SETTINGS }) {
  const isDone = task.status === "Done";

  const handleCheckChange = (checked) => {
    onStatusChange(task.id, checked ? 'Done' : 'To Do');
  };

  const handleTaskClick = () => {
    if (onEdit) {
      onEdit(task);
    }
  };

  const priorityColors = {
    Low: "bg-blue-100 text-blue-800",
    Medium: "bg-yellow-100 text-yellow-800", 
    High: "bg-red-100 text-red-800"
  };

  const effortLabels = {
    S: "Small",
    M: "Medium",
    L: "Large",
    XL: "Extra Large"
  };

  function getDueDateBadgeProps(dueDate) {
    if (!dueDate) return null;

    const today = getTodayString();

    if (isToday(dueDate)) {
      return {
        label: "Due today",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        hover: "hover:bg-yellow-100 hover:text-yellow-800 hover:border-yellow-200",
      };
    }

    if (isTomorrow(dueDate)) {
      return {
        label: "Due tomorrow",
        color: "bg-blue-100 text-blue-800 border-blue-200",
        hover: "hover:bg-blue-100 hover:text-blue-800 hover:border-blue-200",
      };
    }

    if (compareDateStrings(dueDate, today) < 0) {
      return {
        label: "Overdue",
        color: "bg-red-100 text-red-800 border-red-200",
        hover: "hover:bg-red-100 hover:text-red-800 hover:border-red-200",
      };
    }

    const daysUntilDue =
      (new Date(dueDate) - new Date(today)) / (1000 * 60 * 60 * 24);

    if (daysUntilDue <= 5) {
      return {
        label: `Due in ${Math.round(daysUntilDue)} day${
          daysUntilDue === 1 ? "" : "s"
        }`,
        color: "bg-green-100 text-green-800 border-green-200",
        hover: "hover:bg-green-100 hover:text-green-800 hover:border-green-200",
      };
    }

    return {
      label: formatDateForDisplay(dueDate, { month: "short", day: "numeric" }),
      color: "bg-slate-100 text-slate-800 border-slate-200",
      hover: "hover:bg-slate-100 hover:text-slate-800 hover:border-slate-200",
    };
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
    >
      <Card className="p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 border-slate-200">
        <div className="flex items-start gap-4">
          <Checkbox
            id={`task-${task.id}`}
            checked={isDone}
            onCheckedChange={handleCheckChange}
            className="w-6 h-6 rounded-full mt-0.5 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white data-[state=checked]:border-blue-600 transition-all"
            aria-label={`Mark "${task.name}" as ${isDone ? 'not done' : 'done'}`}
          />
          <div className="flex-1 cursor-pointer" onClick={handleTaskClick}>
            <div
              className={`text-slate-800 transition-colors font-medium ${
                isDone ? "line-through text-slate-400" : ""
              }`}
            >
              {task.name}
            </div>
            
            {/* Description */}
            {cardSettings.description && task.description && (
              <div className="text-sm text-slate-500 mt-1">
                {task.description}
              </div>
            )}

            {/* Additional Fields */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Priority */}
              {cardSettings.priority && task.priority && (
                <Badge className={priorityColors[task.priority]} variant="secondary">
                  <Flag className="w-3 h-3 mr-1" />
                  {task.priority}
                </Badge>
              )}

              {/* Effort */}
              {cardSettings.effort && task.effort && (
                <Badge variant="outline">
                  <Zap className="w-3 h-3 mr-1" />
                  {task.effort}
                </Badge>
              )}

              {/* Time Estimation */}
              {cardSettings.timeEstimation && task.timeEstimation && (
                <Badge variant="outline">
                  <Timer className="w-3 h-3 mr-1" />
                  {task.timeEstimation}
                </Badge>
              )}

              {/* Due Date */}
              {cardSettings.dueDate && task.dueDate && (() => {
                const badge = getDueDateBadgeProps(task.dueDate);
                return badge ? (
                  <Badge className={`border ${badge.color} ${badge.hover} cursor-default`}>
                    <Calendar className="w-3 h-3 mr-1" />
                    {badge.label}
                  </Badge>
                ) : null;
              })()}

              {/* Scheduled Time */}
              {cardSettings.scheduledTime && task.scheduledTime && (
                <Badge variant="outline">
                  {task.scheduledTime}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
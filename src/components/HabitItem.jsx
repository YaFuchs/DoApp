
import React from "react";
import { motion } from "framer-motion";
import { calculateHabitStreak } from "./streakCalculator";
import { Flame, Plus } from "lucide-react";
import DonutButton from "./DonutButton";

export default function HabitItem({
  habit,
  isCompleted,
  progressCount,
  onToggleComplete,
  onEdit,
  onViewLog,
  completions = [],
  weekStart = 'monday'
}) {

  const handleToggle = () => {
    onToggleComplete(habit.id);
  };

  const handleNameClick = () => {
    onEdit(habit);
  };

  const getWeekStart = (date) => {
    // Create a date string in YYYY-MM-DD format from the local date.
    // 'en-CA' reliably gives the YYYY-MM-DD format.
    // This step is crucial to prevent timezone shift errors.
    const localDateString = date.toLocaleDateString('en-CA');

    // Create a new Date object interpreted as UTC midnight for that local date.
    const d = new Date(localDateString + 'T00:00:00Z');

    const dayOfWeekUTC = d.getUTCDay(); // 0 for Sunday, 6 for Saturday

    if (weekStart === 'sunday') {
      d.setUTCDate(d.getUTCDate() - dayOfWeekUTC);
    } else { // weekStart is 'monday'
      const daysToSubtract = dayOfWeekUTC === 0 ? 6 : dayOfWeekUTC - 1;
      d.setUTCDate(d.getUTCDate() - daysToSubtract);
    }

    return d.toISOString().split('T')[0];
  };

  const getCompletionsForWeek = (weekStartDate) => {
    if (window.location.hostname === 'localhost') {
      console.log(`[DEBUG HabitItem] getCompletionsForWeek for week starting: ${weekStartDate}`, { weekStartProp: weekStart, allCompletionsForHabit: completions });
    }

    const weekStartDt = new Date(weekStartDate + 'T00:00:00Z');
    const weekEnd = new Date(weekStartDt);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    return completions.filter(completion => {
      // Handle both user_habit_id (authenticated) and habit_id (anonymous)
      const completionHabitId = completion.user_habit_id || completion.habit_id;
      if (completionHabitId !== habit.id || !completion.completed) return false;

      const completionDate = new Date(completion.completion_date + 'T00:00:00Z');

      const isInWeek = completionDate >= weekStartDt && completionDate <= weekEnd;

      if (window.location.hostname === 'localhost' && completionDate.getUTCDay() === 6) { // 6 = Saturday
          console.log(`%c[DEBUG HabitItem] Checking SATURDAY: ${completion.completion_date}`, 'color: orange; font-weight: bold;', {
              completionDateUTC: completionDate.toUTCString(),
              weekStartUTC: weekStartDt.toUTCString(),
              weekEndUTC: weekEnd.toUTCString(),
              isInWeek: isInWeek
          });
      }

      return isInWeek;
    }).length;
  };

  const renderGridVisualization = () => {
    const totalWeeks = 14;
    const rowsPerWeek = habit.frequency;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentWeekStart = getWeekStart(today);
    const weeks = [];
    
    for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
      const weekStartForIteration = new Date(currentWeekStart);
      weekStartForIteration.setDate(weekStartForIteration.getDate() - (totalWeeks - 1 - weekIndex) * 7);
      const weekStartStr = weekStartForIteration.toISOString().split('T')[0];
      
      const isCurrentWeek = weekStartStr === currentWeekStart;
      const completionsThisWeek = getCompletionsForWeek(weekStartStr);

      if (window.location.hostname === 'localhost') {
        console.log(`[DEBUG HabitItem] Visualizing Week: ${weekStartStr}`, { weekIndex, completionsThisWeek });
      }

      const cells = [];
      
      for (let rowIndex = 0; rowIndex < rowsPerWeek; rowIndex++) {
        const isCompletedCell = rowIndex < completionsThisWeek;
        let cellBgColor = isCompletedCell ? '#10B981' : (isCurrentWeek ? '#DBEAFE' : '#F5F5F5');
        let borderStyle = isCompletedCell || isCurrentWeek ? '0.5px solid #E2E8F0' : 'none';
        
        cells.push(
          <div
            key={`w${weekIndex}-r${rowIndex}`}
            style={{ 
              backgroundColor: cellBgColor, 
              height: 'calc(8px - 1px)', // Changed from 0.5px to 1px
              border: borderStyle
            }}
          />
        );
      }
      weeks.push(<div key={`week-${weekIndex}`} className="flex flex-col-reverse" style={{ gap: '1px' }}>{cells}</div>);
    }
    
    return (
      <div 
        className="mt-3 w-full" 
        style={{ 
          '--block-gap': '1px', // Changed from 0.5px to 1px
          display: 'grid', 
          gridTemplateColumns: `repeat(${totalWeeks}, 1fr)`, 
          gridAutoFlow: 'column',
          gap: 'var(--block-gap)'
        }}
      >
        {weeks}
      </div>
    );
  };

  const actualStreak = calculateHabitStreak(habit, completions, weekStart);

  const renderTitle = () => {
    return (
      <div className="flex-1 min-w-0">
        <button
          onClick={handleNameClick}
          className="w-full text-left"
          aria-label={`Edit "${habit.name}"`}
        >
          <h3 className={`
            truncate text-md transition-colors duration-200 ease-in-out hover:text-blue-600 cursor-pointer
            ${isCompleted ? 'font-normal text-gray-500' : 'font-semibold text-gray-900'}
          `}>
            {habit.name}
          </h3>
          {/* Daily Goal Progress - only show when goal is enabled and not completed */}
          {habit.daily_goal_enabled && !isCompleted && (
            <div className="habit-goal-progress text-xs font-normal text-gray-600 mt-1 leading-4">
              {progressCount}/{habit.daily_goal_target} {habit.daily_goal_unit}
            </div>
          )}
        </button>
      </div>
    );
  };
  
  const renderActionButton = () => {
    if (habit.daily_goal_enabled && !isCompleted) {
        return (
          <DonutButton
            progressCount={progressCount}
            dailyGoalTarget={habit.daily_goal_target}
            emoji={habit.emoji}
            onClick={handleToggle}
            size={44}
            strokeWidth={2.5}
            aria-label={`Increment "${habit.name}"`}
          />
        );
    }
    return (
        <motion.button
            whileTap={{ scale: 1.15 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={handleToggle}
            aria-label={`Mark "${habit.name}" as ${isCompleted ? 'incomplete' : 'complete'}`}
            className={`
              flex-shrink-0 rounded-full w-11 h-11 md:w-12 md:h-12
              flex items-center justify-center
              transition-colors duration-150
              ${isCompleted
                ? 'bg-[#c8f8c8] hover:bg-[#b8e8b8] border-2 border-[#0fb981]'
                : 'bg-transparent hover:bg-slate-100 text-slate-800 border-2 border-slate-300'
              }
            `}
          >
            <span className="text-2xl md:text-3xl select-none">{habit.emoji}</span>
          </motion.button>
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`
        bg-white rounded-2xl p-4 transition-all duration-150
        ${!isCompleted 
          ? 'shadow-sm hover:shadow-md' 
          : ''
        }
      `}
      style={{
        boxShadow: !isCompleted 
          ? '0 2px 2px rgba(0,0,0,0.05), 0 4px 8px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.12)'
          : '0px 4px 0px #0fb981'
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {renderActionButton()}
          {renderTitle()}
        </div>

        <button
          onClick={() => onViewLog(habit)}
          className="flex items-center bg-[#fff1d0] rounded-full px-2 py-1 ml-2 hover:bg-[#fae5b9] transition-colors duration-200 cursor-pointer"
          aria-label={`View completion log for ${habit.name}`}
        >
          <Flame size={12} color="#990000" strokeWidth={2} />
          <span className="text-xs font-medium text-[#990000] ml-0.5">{actualStreak}</span>
        </button>
      </div>

      {renderGridVisualization()}

    </motion.div>
  );
}


import React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

export default function DonutButton({
  progressCount = 0,
  dailyGoalTarget = 1,
  emoji = "⚡",
  size = 44,
  strokeWidth = 2.5,
  onClick,
  className = "",
  ...props
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.min(Math.max(progressCount / dailyGoalTarget, 0), 1); // Clamp to [0,1]
  const dashArray = circumference;
  const dashOffset = circumference * (1 - fraction);
  const completed = progressCount >= dailyGoalTarget;

  // Badge placement: polar → cartesian
  // angle = 45° (closer to 1:30 o'clock) in radians
  const angle = (45 * Math.PI) / 180;
  const badgeRadius = radius + strokeWidth / 2; // sit on outer edge
  const badgeX = size / 2 + badgeRadius * Math.cos(angle);
  const badgeY = size / 2 - badgeRadius * Math.sin(angle);
  const badgeSize = 18; // increased from 14px to 16px

  return (
    <div className="relative flex-shrink-0 w-11 h-11 md:w-12 md:h-12">
      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        onClick={onClick}
        className={`
          w-full h-full rounded-full
          flex items-center justify-center
          transition-colors duration-150
          bg-transparent hover:bg-slate-100 text-slate-800
          focus:outline-none
          ${className}
        `}
        aria-label={`Add progress for habit`}
        {...props}
      >
        {/* SVG Donut */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0"
        >
          {/* Background ring (light gray) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#10B981"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: 'stroke-dashoffset 300ms ease-out'
            }}
          />
        </svg>

        {/* Centre symbol */}
        <span
          className="absolute inset-0 z-10 flex items-center justify-center select-none pointer-events-none text-gray-600"
          style={{ fontSize: size * 0.4 }}
        >
          {completed ? emoji : <Plus className="w-5 h-5" strokeWidth={2.5} />}
        </span>
      </motion.button>

      {/* Rim emoji badge (always visible when not completed) - positioned relative to container */}
      {!completed && (
        <div
          aria-hidden="true"
          className="absolute select-none pointer-events-none flex items-center justify-center z-20"
          style={{
            left: badgeX - badgeSize / 2,
            top: badgeY - badgeSize / 2,
            width: badgeSize,
            height: badgeSize,
            // Reduce font size to make white background more visible
            fontSize: badgeSize * 0.8, // Make emoji smaller than badge container
            borderRadius: "50%",
            background: "white",
            // Revert boxShadow to a subtle dark outline for better separation
            boxShadow: "0 0 1px rgba(0,0,0,0.15)",
          }}
        >
          {emoji}
        </div>
      )}
    </div>
  );
}

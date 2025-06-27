import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const confettiColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const ConfettiParticle = ({ initialX, initialY, delay }) => {
  const duration = Math.random() * 1.5 + 1; // Random duration between 1 and 2.5 seconds
  const finalX = initialX + (Math.random() - 0.5) * 300; // Spread horizontally
  const rotate = Math.random() * 360;

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${initialX}%`,
        top: `${initialY}%`,
        width: Math.random() * 8 + 4, // Random size between 4px and 12px
        height: Math.random() * 8 + 4,
        backgroundColor: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        borderRadius: '2px',
      }}
      initial={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      animate={{
        y: window.innerHeight + 50, // Fall to bottom of screen + a bit more
        x: finalX - initialX + '%', // Relative X movement
        opacity: [1, 1, 0], // Fade out at the end
        scale: [1, 1, 0.5],
        rotate: rotate + Math.random() * 180,
      }}
      transition={{ duration, ease: 'linear', delay }}
    />
  );
};

export default function GlobalConfetti({ isActive }) {
  const numParticles = 70; // Number of confetti particles

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-[9999]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }} // Quick fade in/out for the container itself
        >
          {Array.from({ length: numParticles }).map((_, i) => (
            <ConfettiParticle
              key={i}
              initialX={Math.random() * 100} // Random horizontal start position (0-100%)
              initialY={-5} // Start slightly above the screen
              delay={Math.random() * 0.5} // Staggered start times
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
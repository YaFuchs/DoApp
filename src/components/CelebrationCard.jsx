import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, PartyPopper, Sun, Flame, Trophy, Target, Sparkles, Rocket } from 'lucide-react';
import GlobalConfetti from './GlobalConfetti';

const ICONS = {
  PartyPopper: <PartyPopper size={48} className="text-pink-500" />,
  Sun: <Sun size={48} className="text-yellow-500" />,
  Flame: <Flame size={48} className="text-orange-500" />,
  Trophy: <Trophy size={48} className="text-amber-500" />,
  Target: <Target size={48} className="text-blue-500" />,
  Sparkles: <Sparkles size={48} className="text-purple-500" />,
  Rocket: <Rocket size={48} className="text-indigo-500" />,
  Default: <Sparkles size={48} className="text-green-500" />,
};

const BACKGROUNDS = {
  PartyPopper: 'bg-pink-50',
  Sun: 'bg-yellow-50',
  Flame: 'bg-orange-50',
  Trophy: 'bg-amber-50',
  Target: 'bg-blue-50',
  Sparkles: 'bg-purple-50',
  Rocket: 'bg-indigo-50',
  Default: 'bg-green-50',
};

export default function CelebrationCard({ celebration, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const hasConfetti = ['PartyPopper', 'Trophy', 'Rocket'].includes(celebration?.icon);

  return (
    <AnimatePresence>
      {celebration && (
        <>
          {hasConfetti && <GlobalConfetti isActive={true} />}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }}
              className="w-[90vw] max-w-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`relative ${BACKGROUNDS[celebration.icon] || BACKGROUNDS.Default} rounded-2xl p-6 text-center shadow-2xl flex flex-col items-center`}>
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-500" onClick={onClose}>
                  <X />
                </Button>

                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4">
                  {ICONS[celebration.icon] || ICONS.Default}
                </div>
                
                <h2 className="text-xl font-semibold text-slate-800 mb-2">
                  {celebration.title}
                </h2>
                
                <p className="text-slate-600 mb-6">
                  {celebration.body}
                </p>

                <Button
                  onClick={onClose}
                  className="w-full h-11 bg-slate-800 hover:bg-slate-900 uppercase tracking-wider font-semibold"
                >
                  {celebration.buttonText}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
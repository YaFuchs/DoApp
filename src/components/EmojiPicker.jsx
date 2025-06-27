
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMOJI_CATEGORIES = {
  'Common': ["💧", "🏃‍♂️", "🧘‍♀️", "💊", "🚶‍♂️", "😴", "🥗", "🏋️‍♂️", "📚", "📝", "💻", "🎓", "🧠", "📖", "✏️", "📊", "💼", "📧", "📞", "📋", "💡", "🎯", "📈", "⏰", "❤️", "🎨", "🎵", "🌱", "☀️", "🌟", "🎉", "🙏", "😊", "👍", "💪"],
  'Activities': ["⚽️", "🏀", "🏈", "⚾️", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥅", "🏒", "🏑", "🏏", "🏹", "🎣", "🥊", "🥋", "🛹", "🏂", "🏋️‍♀️", "🤸‍♂️", "🤼‍♀️", "🤽‍♂️", "🤺", "🤾‍♀️", "🧗‍♀️", "🏇", "🏊‍♀️", "🏄‍♂️", "🚣‍♀️", "🚴‍♂️", "🚵‍♀️", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖", "🏵", "🎗", "🎫", "🎟", "🎪", "🤹‍♀️", "🎭", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🎻", "🎮", "🎯", "🎲", "🎳", "♟️"],
  'Food & Drink': ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🧆", "🌮", "🌯", "🥗", "🥘", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "☕️", "🍵", "🧃", "🥤", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🧉", "🍾", "🧊", "🥄", "🍴", "🍽"],
};

const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flat();

export default function EmojiPicker({ isOpen, onClose, onEmojiSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmojis, setFilteredEmojis] = useState(ALL_EMOJIS);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEmojis(ALL_EMOJIS);
    } else {
      // Basic search logic
      setFilteredEmojis(ALL_EMOJIS.filter(emoji => 
        emoji.includes(searchTerm) // This is a very basic search
      ));
    }
  }, [searchTerm]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleEmojiClick = (emoji) => {
    onEmojiSelect(emoji);
  };
  
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-sm h-auto bg-white rounded-2xl shadow-2xl flex flex-col"
            style={{ maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-900">Choose Emoji</h3>
              <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8 text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-4 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                <Input 
                  placeholder="Search emoji (not working yet)"
                  className="pl-10 h-11"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={true} // Disabling search as it's not effective
                />
              </div>
            </div>

            <div className="p-4 pt-0 flex-grow overflow-y-auto">
              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider my-3 sticky top-0 bg-white py-1">{category}</h4>
                  <div className="grid grid-cols-7 sm:grid-cols-8 gap-2">
                    {emojis.map(emoji => (
                      <motion.button
                        key={emoji}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEmojiClick(emoji)}
                        className="text-3xl p-1 rounded-lg hover:bg-slate-100"
                        aria-label={`Select emoji ${emoji}`}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

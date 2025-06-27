import React from "react";
import { motion } from "framer-motion";

export default function UnifiedLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f8fc] -mt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        <h1 
          className="text-6xl font-bold mb-6"
          style={{ color: '#56c630ff' }}
        >
          Do.
        </h1>
        <p className="text-lg text-slate-600">Getting things ready...</p>
        <div className="space-y-4 mt-8">
          {[...Array(3)].map((_, i) => (
            <motion.div 
              key={i} 
              className="h-16 w-80 bg-slate-200 animate-pulse rounded-xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
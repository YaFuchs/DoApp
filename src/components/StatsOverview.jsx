import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp, Target, Flame, Calendar } from "lucide-react";

export default function StatsOverview({ habits, completions }) {
  const totalHabits = habits.length;
  const todayCompletions = completions.filter(c => {
    const today = new Date().toISOString().split('T')[0];
    return c.completion_date === today && c.completed;
  }).length;
  
  const completionRate = totalHabits > 0 ? Math.round((todayCompletions / totalHabits) * 100) : 0;
  const currentStreak = 5; // This would be calculated from actual data

  const stats = [
    {
      title: "Today",
      value: `${todayCompletions}/${totalHabits}`,
      subtitle: `${completionRate}%`,
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Streak",
      value: `${currentStreak}`,
      subtitle: "days",
      icon: Flame,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</p>
                  <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                  <p className="text-xs text-slate-500">{stat.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
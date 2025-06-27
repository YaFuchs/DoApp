import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RotateCcw, TrendingUp, Calendar, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import DataManager from "./DataManager";

const STATS_STORAGE_KEY = 'todoStats'; // This should ideally be moved into DataManager later

export default function StatisticsModal({ isOpen, onClose }) {
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState({ capacityCalculation: 'Effort' });
  const [stats, setStats] = useState({ averageCapacity: 0, totalDays: 0 });
  const [dailyStats, setDailyStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load settings via DataManager for consistency
      const userSettings = await DataManager.getSettings();
      const currentSettings = (userSettings && userSettings.todoSettings) 
        ? userSettings.todoSettings 
        : { capacityCalculation: 'Effort' };
      setSettings(currentSettings);

      // Load stats from local storage (maintaining original logic)
      const savedStats = localStorage.getItem(STATS_STORAGE_KEY);
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }

      // Load tasks via DataManager
      const fetchedTasks = await DataManager.getTasks();
      setTasks(fetchedTasks);

      // Calculate daily stats using the loaded tasks and settings
      calculateDailyStats(fetchedTasks, currentSettings.capacityCalculation);
    } catch (error) {
      console.error("Failed to load stats data:", error);
    }
    setIsLoading(false);
  };

  const calculateDailyStats = (taskList, calculationMethod) => {
    const doneTasks = taskList.filter(task => task.status === 'Done' && task.doneDate);
    
    const dailyGroups = doneTasks.reduce((acc, task) => {
      const date = new Date(task.doneDate).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(task);
      return acc;
    }, {});

    const dailyData = Object.entries(dailyGroups)
      .map(([date, dayTasks]) => {
        let totalEffort = 0;
        let totalTime = 0;
        
        dayTasks.forEach(task => {
          totalEffort += task.effortValue || 0;
          totalTime += task.timeEstimationValue || 0;
        });

        return {
          date,
          taskCount: dayTasks.length,
          totalEffort,
          totalTime,
          capacity: calculationMethod === 'Effort' ? totalEffort : totalTime,
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 30);

    setDailyStats(dailyData);

    if (dailyData.length > 0) {
      const totalCapacity = dailyData.reduce((sum, day) => sum + day.capacity, 0);
      const average = totalCapacity / dailyData.length;
      
      const newStats = { averageCapacity: average, totalDays: dailyData.length };
      setStats(newStats);
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(newStats));
    }
  };

  const handleResetAverage = () => {
    if (confirm('Are you sure you want to reset the average capacity? This action cannot be undone.')) {
      const resetStats = { averageCapacity: 0, totalDays: 0 };
      setStats(resetStats);
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(resetStats));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getCapacityLabel = () => settings.capacityCalculation === 'Effort' ? 'effort points' : 'hours';

  const formatCapacity = (value) => {
    if (settings.capacityCalculation === 'Effort') return Math.round(value * 10) / 10;
    return `${value}h`;
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
          <Button variant="ghost" size="icon" onClick={onClose} className="touch-manipulation">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-slate-900">Statistics</h1>
          <div className="w-10" />
        </div>
      </motion.header>

      <div className="flex-grow overflow-y-auto">
        <div className="px-4 pb-8 pt-6">
          {isLoading ? (
            <div className="text-center py-16">
              <p className="text-slate-600">Loading statistics...</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-white rounded-xl p-6 shadow-sm">
                <CardHeader className="p-0 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Average Daily Capacity
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={handleResetAverage} className="text-xs">
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="text-center pt-4">
                    <div className="text-4xl font-bold text-slate-900 mb-2">
                      {formatCapacity(stats.averageCapacity)}
                    </div>
                    <p className="text-slate-600">{getCapacityLabel()} per day</p>
                    <p className="text-sm text-slate-500 mt-1">Based on {stats.totalDays} days of data</p>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Daily Completions
                </h2>
                {dailyStats.length === 0 ? (
                  <Card className="bg-white rounded-xl shadow-sm">
                    <CardContent className="text-center py-12">
                      <CheckCircle2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No completed tasks yet</p>
                      <p className="text-sm text-slate-500">Complete some tasks to see your daily stats</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {dailyStats.map((day, index) => (
                      <motion.div
                        key={day.date}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-slate-900">{formatDate(day.date)}</h3>
                                <p className="text-sm text-slate-600">{day.taskCount} task{day.taskCount !== 1 ? 's' : ''} completed</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-slate-900">{formatCapacity(day.capacity)}</div>
                                <p className="text-xs text-slate-500">{getCapacityLabel()}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
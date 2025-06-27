import { calculateHabitStreak } from "./streakCalculator";
import DataManager from "./DataManager";

// This function needs to be self-contained as it's used before instantiation
const getWeekStartForDate = (dateString, weekStartSetting) => {
    const d = new Date(dateString + 'T00:00:00Z');
    const dayOfWeekUTC = d.getUTCDay(); // 0 for Sunday
    const isSundayStart = weekStartSetting === 'sunday';

    if (isSundayStart) {
        d.setUTCDate(d.getUTCDate() - dayOfWeekUTC);
    } else { // Monday start
        const daysToSubtract = dayOfWeekUTC === 0 ? 6 : dayOfWeekUTC - 1;
        d.setUTCDate(d.getUTCDate() - daysToSubtract);
    }
    return d.toISOString().split('T')[0];
};

class CelebrationManager {
  constructor() {
    this.queue = [];
    this.seenMilestones = new Set();
  }

  async loadStateFromData(milestonesArray = null) {
    try {
      if (milestonesArray) {
        this.seenMilestones = new Set(milestonesArray);
        return;
      }
      
      const settings = await DataManager.getSettings();
      if (settings && settings.seenMilestones) {
        this.seenMilestones = new Set(settings.seenMilestones);
      }
    } catch (e) {
      console.error("Failed to load celebration manager state:", e);
    }
  }

  async saveState() {
    try {
      const currentSettings = await DataManager.getSettings() || {};
      await DataManager.updateSettings({
        ...currentSettings,
        seenMilestones: Array.from(this.seenMilestones)
      });
    } catch (e) {
      console.error("Failed to save celebration manager state:", e);
    }
  }

  getCompletionsForWeek(completions, weekStartDateStr) {
    const weekStartDt = new Date(weekStartDateStr + 'T00:00:00Z');
    const weekEnd = new Date(weekStartDt);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

    return completions.filter(c => {
      const completionDate = new Date(c.completion_date + 'T00:00:00Z');
      return completionDate >= weekStartDt && completionDate <= weekEnd;
    });
  }
  
  async check(toggledHabit, allHabits, allCompletions, weekStart) {
    this.queue = [];
    
    const completionsForToggled = allCompletions.filter(c => c.habit_id === toggledHabit.id);

    const oldStreak = calculateHabitStreak(toggledHabit, completionsForToggled.slice(0, -1), weekStart);
    const newStreak = calculateHabitStreak(toggledHabit, completionsForToggled, weekStart);

    this._checkFirstHabitCheck(allCompletions);
    this._checkFirstWeeklyGoal(toggledHabit, allCompletions, weekStart);
    this._checkNewPersonalRecord(toggledHabit, newStreak, allHabits);
    this._checkStreakMilestone(toggledHabit, newStreak, oldStreak);
    this._checkWeeklySingleHabit(toggledHabit, allCompletions, weekStart);
    this._checkWeeklyAllHabits(allHabits, allCompletions, weekStart);
    this._checkDailyGoalComplete(allHabits, allCompletions);

    await this.saveState();
    return this.queue;
  }
  
  _enqueue(celebration) {
    if (!this.queue.some(c => c.id === celebration.id)) {
      this.queue.push(celebration);
    }
  }

  _checkFirstHabitCheck(allCompletions) {
    const milestoneId = 'global-first-habit-check';
    if (allCompletions.length === 1 && !this.seenMilestones.has(milestoneId)) {
      this._enqueue({
        id: 'first-habit-check',
        title: 'You\'re On the Board!',
        body: 'Nice work—your first habit is checked. Keep that momentum going!',
        buttonText: 'Let\'s Go',
        icon: 'PartyPopper'
      });
      this.seenMilestones.add(milestoneId);
    }
  }

  _checkDailyGoalComplete(allHabits, allCompletions) {
    if (allHabits.length < 2) return;
    
    const todayStr = new Date().toLocaleDateString('en-CA');
    
    const allHabitsCompleted = allHabits.every(habit => {
      const todaysCompletion = allCompletions.find(c => 
        c.habit_id === habit.id && 
        c.completion_date === todayStr
      );
      
      return todaysCompletion && todaysCompletion.completed === true;
    });

    if (allHabitsCompleted) {
      this._enqueue({
        id: 'daily-goal-complete',
        title: 'Daily Goal Achieved!',
        body: 'You\'ve knocked out every habit today. See you tomorrow!',
        buttonText: 'Great!',
        icon: 'Sun'
      });
    }
  }

  _checkWeeklySingleHabit(habit, allCompletions, weekStart) {
    if (habit.frequency < 2) return;

    const todayStr = new Date().toLocaleDateString('en-CA');
    const currentWeekStart = getWeekStartForDate(todayStr, weekStart);
    const weekCompletions = this.getCompletionsForWeek(allCompletions.filter(c => c.habit_id === habit.id), currentWeekStart);

    if (weekCompletions.length >= habit.frequency) {
        const milestoneId = `habit-${habit.id}-week-${currentWeekStart}`;
        if (!this.seenMilestones.has(milestoneId)) {
            this._enqueue({
                id: 'weekly-single-habit',
                title: 'Weekly Win!',
                body: `You've completed ${habit.frequency}/${habit.frequency} for ${habit.name} this week. Well done!`,
                buttonText: 'Sweet!',
                icon: 'Flame'
            });
            this.seenMilestones.add(milestoneId);
        }
    }
  }
  
  _checkWeeklyAllHabits(allHabits, allCompletions, weekStart) {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const currentWeekStart = getWeekStartForDate(todayStr, weekStart);
      
      const allWeeklyGoalsMet = allHabits.every(habit => {
          const weekCompletions = this.getCompletionsForWeek(allCompletions.filter(c => c.habit_id === habit.id), currentWeekStart);
          return weekCompletions.length >= habit.frequency;
      });

      if (allWeeklyGoalsMet && allHabits.length > 0) {
          const milestoneId = `global-all-habits-week-${currentWeekStart}`;
          if (!this.seenMilestones.has(milestoneId)) {
              this._enqueue({
                  id: 'weekly-all-habits',
                  title: 'All-Around Champion!',
                  body: 'Every habit is in the green this week. Keep the streak alive!',
                  buttonText: 'Awesome!',
                  icon: 'Trophy'
              });
              this.seenMilestones.add(milestoneId);
          }
      }
  }
  
  _checkStreakMilestone(habit, newStreak, oldStreak) {
    if (newStreak > oldStreak && newStreak > 0 && newStreak % 5 === 0) {
      const milestoneId = `habit-${habit.id}-streak-${newStreak}`;
      if (!this.seenMilestones.has(milestoneId)) {
        this._enqueue({
          id: 'streak-milestone',
          title: `${newStreak}-Day Streak!`,
          body: `You're crushing ${habit.name} ${newStreak} days straight! Onwards!`,
          buttonText: 'Keep It Up',
          icon: 'Target'
        });
        this.seenMilestones.add(milestoneId);
      }
    }
  }

  _checkNewPersonalRecord(habit, newStreak, allHabits) {
    const findHabit = allHabits.find(h => h.id === habit.id);
    const personalBest = findHabit.personalBestStreak || 0;
    if (newStreak > personalBest) {
      findHabit.personalBestStreak = newStreak; 
      if (newStreak > 3) { 
        this._enqueue({
          id: 'new-personal-record',
          title: 'New Record!',
          body: `Your longest ever for ${habit.name}—${newStreak} days!`,
          buttonText: 'Woohoo!',
          icon: 'Sparkles'
        });
      }
    }
  }

  _checkFirstWeeklyGoal(habit, allCompletions, weekStart) {
    const milestoneId = 'global-first-weekly-goal';
    if (this.seenMilestones.has(milestoneId)) return;

    const todayStr = new Date().toLocaleDateString('en-CA');
    const currentWeekStart = getWeekStartForDate(todayStr, weekStart);
    const weekCompletions = this.getCompletionsForWeek(allCompletions.filter(c => c.habit_id === habit.id), currentWeekStart);

    if (weekCompletions.length >= habit.frequency) {
        this._enqueue({
            id: 'first-weekly-goal',
            title: 'First Weekly Win!',
            body: `First time finishing ${habit.frequency}/${habit.frequency} on ${habit.name}. Way to start strong!`,
            buttonText: 'Let\'s Roll',
            icon: 'Rocket'
        });
        this.seenMilestones.add(milestoneId);
    }
  }
}

const celebrationManager = new CelebrationManager();
export default celebrationManager;
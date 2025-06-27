import DataManager from './DataManager';

// Notification management utility
class NotificationManager {
  constructor() {
    this.scheduledNotifications = new Map();
    this.loadScheduledNotifications();
  }

  // Check if notifications are supported
  isSupported() {
    return 'Notification' in window;
  }

  // Get current permission status
  getPermissionStatus() {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported()) return 'unsupported';
    
    const permission = await Notification.requestPermission();
    return permission;
  }

  // Schedule a notification for a specific time
  scheduleNotification(habitId, habitName, habitEmoji, time) {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    // Clear existing notification for this habit
    this.clearNotification(habitId);

    // Calculate milliseconds until the target time today
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const targetTime = new Date();
    targetTime.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    const timeUntilNotification = targetTime.getTime() - now.getTime();

    // Schedule the notification
    const timeoutId = setTimeout(() => {
      this.showNotification(habitName, habitEmoji);
      // Reschedule for next day
      this.scheduleNotification(habitId, habitName, habitEmoji, time);
    }, timeUntilNotification);

    // Store the timeout ID
    this.scheduledNotifications.set(habitId, {
      timeoutId,
      habitName,
      habitEmoji,
      time,
      scheduledFor: targetTime.toISOString()
    });

    this.saveScheduledNotifications();
    return true;
  }

  // Show immediate notification
  showNotification(habitName, habitEmoji) {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(`It's time to ${habitEmoji} ${habitName}`, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `habit-${habitName}`, // Prevents duplicate notifications
      requireInteraction: false
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  // Clear notification for a specific habit
  clearNotification(habitId) {
    const scheduled = this.scheduledNotifications.get(habitId);
    if (scheduled) {
      clearTimeout(scheduled.timeoutId);
      this.scheduledNotifications.delete(habitId);
      this.saveScheduledNotifications();
    }
  }

  // Clear all notifications
  clearAllNotifications() {
    this.scheduledNotifications.forEach((scheduled) => {
      clearTimeout(scheduled.timeoutId);
    });
    this.scheduledNotifications.clear();
    this.saveScheduledNotifications();
  }

  // Get all scheduled notifications
  getScheduledNotifications() {
    return Array.from(this.scheduledNotifications.entries()).map(([habitId, data]) => ({
      habitId,
      ...data
    }));
  }

  // Save scheduled notifications using DataManager
  async saveScheduledNotifications() {
    try {
      const data = {};
      this.scheduledNotifications.forEach((value, key) => {
        // Don't save timeoutId, we'll recreate it on load
        data[key] = {
          habitName: value.habitName,
          habitEmoji: value.habitEmoji,
          time: value.time,
          scheduledFor: value.scheduledFor
        };
      });
      
      const currentSettings = await DataManager.getSettings() || {};
      await DataManager.updateSettings({
        ...currentSettings,
        scheduledNotifications: data
      });
    } catch (error) {
      console.error('Error saving scheduled notifications:', error);
    }
  }

  // Load scheduled notifications using DataManager
  async loadScheduledNotifications() {
    try {
      const settings = await DataManager.getSettings();
      if (settings && settings.scheduledNotifications) {
        Object.entries(settings.scheduledNotifications).forEach(([habitId, notificationData]) => {
          // Reschedule based on saved data
          this.scheduleNotification(
            habitId,
            notificationData.habitName,
            notificationData.habitEmoji,
            notificationData.time
          );
        });
      }
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
    }
  }

  // Reschedule all notifications (useful after permission changes)
  rescheduleAll(habits) {
    this.clearAllNotifications();
    
    habits.forEach(habit => {
      if (habit.reminder_enabled && habit.reminder_time) {
        this.scheduleNotification(
          habit.id,
          habit.name,
          habit.emoji,
          habit.reminder_time
        );
      }
    });
  }
}

// Create singleton instance
const notificationManager = new NotificationManager();

export default notificationManager;
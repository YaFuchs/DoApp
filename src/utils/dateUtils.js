import {
  format,
  isToday,
  isTomorrow,
  isBefore,
  differenceInCalendarDays,
  parseISO,
} from 'date-fns'

export function getDueDateInfo(dueDateStr) {
  if (!dueDateStr) return { label: "", variant: "outline" };

  const dueDate = parseISO(dueDateStr)
  const today = new Date()

  if (isToday(dueDate)) {
    return { label: "Due today", variant: "destructive" }
  }

  if (isTomorrow(dueDate)) {
    return { label: "Due tomorrow", variant: "warning" }
  }

  if (isBefore(dueDate, today)) {
    return { label: "Overdue", variant: "destructive" }
  }

  const daysUntilDue = differenceInCalendarDays(dueDate, today)

  if (daysUntilDue <= 5) {
    return {
      label: `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`,
      variant: "default",
    }
  }

  return {
    label: format(dueDate, "MMM d"),
    variant: "outline",
  }
}

const priorityMap = { Low: 1, Medium: 2, High: 3 };
const effortMap = { S: 1, M: 2, L: 3, XL: 4 };
const timeEstimationMap = { "15m": 0.25, "30m": 0.5, "1h": 1, "1.5h": 1.5 };

export const mapEnumsToValues = (task) => {
  return {
    priorityValue: priorityMap[task.priority] || 1,    // Changed from 2 to 1
    effortValue: effortMap[task.effort] || 4,          // Changed from 2 to 4
    timeEstimationValue: timeEstimationMap[task.timeEstimation] || 1.5,  // Changed from 1 to 1.5
  };
};

export const calculateSortValue = (taskWithValues, settings) => {
  const { priorityValue, effortValue, timeEstimationValue } = taskWithValues;
  const capacityType = settings?.capacityCalculation || "Effort";

  if (capacityType === "Effort") {
    const denominator = effortValue > 0 ? effortValue : 4; // Changed default from 2 to 4
    return priorityValue / denominator;
  }
  
  // Assumes 'Estimated Time'
  const denominator = timeEstimationValue > 0 ? timeEstimationValue : 1.5; // Changed default from 1 to 1.5
  return priorityValue / denominator;
};
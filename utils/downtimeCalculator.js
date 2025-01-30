// utils/downtimeCalculator.js
const calculateDowntime = (start, end) => {
  if (!start) return 0; // If start is missing, return 0

  const now = new Date(); // Current time
  const endTime = end || now; // Use current time if end is null

  const diffInMs = endTime - start;
  return Math.floor(diffInMs / (1000 * 60)); // Return downtime in minutes
};

module.exports = { calculateDowntime };

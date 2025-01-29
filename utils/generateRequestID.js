export const generateRequestID = () => {
  const month = new Date().getMonth(); // Get the current month (0 to 11)
  let letter;

  // Assign letter based on the current month
  if (month >= 0 && month <= 3) {
    // Jan - Apr
    letter = "A";
  } else if (month >= 4 && month <= 7) {
    // May - Aug
    letter = "B";
  } else {
    // Sep - Dec
    letter = "C";
  }

  // Generate 3 random digits (e.g., 123, 001)
  const randomDigits = Math.floor(100 + Math.random() * 900);

  return `${letter}${randomDigits}`;
};

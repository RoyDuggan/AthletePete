/**
 * id → question label (+ section) for the intake questionnaire. Used to render
 * a client's saved answers into a readable block for the plan-generation prompt.
 * Kept in step with the frontend lib/intakeQuestions.ts.
 */
export const INTAKE_LABELS: { id: string; label: string; section: string }[] = [
  { id: "fullName", label: "Full name", section: "The Basics" },
  { id: "ageDob", label: "Age & date of birth", section: "The Basics" },
  { id: "heightWeight", label: "Height & current weight", section: "The Basics" },
  { id: "handedness", label: "Shot hand & stronger side", section: "The Basics" },
  { id: "position", label: "Position(s)", section: "The Basics" },
  { id: "level", label: "Level / league", section: "The Basics" },

  { id: "seasonDates", label: "Season end & camp start dates", section: "Summer & Timeline" },
  { id: "availability", label: "Weeks available & days per week", section: "Summer & Timeline" },
  { id: "commitments", label: "Fixed commitments", section: "Summer & Timeline" },
  { id: "onIceAccess", label: "On-ice access this summer", section: "Summer & Timeline" },

  { id: "trainingExperience", label: "Training experience", section: "Training Background" },
  { id: "lastOffseason", label: "Last off-season training week", section: "Training Background" },
  { id: "whatWorked", label: "What's worked / what hasn't", section: "Training Background" },
  { id: "exercisesLovedHated", label: "Exercises loved & disliked", section: "Training Background" },
  { id: "recoveryResponse", label: "Recovery response & volume tolerance", section: "Training Background" },

  { id: "equipment", label: "Equipment & environment", section: "Equipment & Environment" },

  { id: "strengthNumbers", label: "Current strength numbers (~5 reps)", section: "Strength/Power/Conditioning Baselines" },
  { id: "jumpPower", label: "Jump / power numbers", section: "Strength/Power/Conditioning Baselines" },
  { id: "speed", label: "Speed profile", section: "Strength/Power/Conditioning Baselines" },
  { id: "agility", label: "Agility & change of direction", section: "Strength/Power/Conditioning Baselines" },
  { id: "anaerobic", label: "Anaerobic capacity", section: "Strength/Power/Conditioning Baselines" },
  { id: "aerobic", label: "Aerobic base", section: "Strength/Power/Conditioning Baselines" },
  { id: "pullGrip", label: "Pull-ups & grip", section: "Strength/Power/Conditioning Baselines" },

  { id: "ankles", label: "Ankle mobility", section: "Movement, Mobility & Asymmetry" },
  { id: "hips", label: "Hip mobility", section: "Movement, Mobility & Asymmetry" },
  { id: "groin", label: "Groin & adductors", section: "Movement, Mobility & Asymmetry" },
  { id: "shoulders", label: "Upper back & shoulders", section: "Movement, Mobility & Asymmetry" },
  { id: "balance", label: "Single-leg balance & weaker side", section: "Movement, Mobility & Asymmetry" },
  { id: "coreBack", label: "Core & lower back", section: "Movement, Mobility & Asymmetry" },

  { id: "injuryHistory", label: "Injury history & clearance", section: "Injury & Health" },
  { id: "movementsToAvoid", label: "Movements to avoid", section: "Injury & Health" },
  { id: "niggles", label: "Current niggles", section: "Injury & Health" },
  { id: "concussion", label: "Concussion history", section: "Injury & Health" },

  { id: "topGoals", label: "Top 3 ranked goals", section: "Your Game" },
  { id: "strengths", label: "On-ice strengths", section: "Your Game" },
  { id: "weaknesses", label: "On-ice weaknesses", section: "Your Game" },
  { id: "styleRole", label: "Style of play & role", section: "Your Game" },
  { id: "skating", label: "Skating self-assessment", section: "Your Game" },
  { id: "physicalDemands", label: "Physical demands of their game", section: "Your Game" },

  { id: "successDefinition", label: "Definition of success", section: "Success & Mindset" },
  { id: "inspiration", label: "What inspires / drives them", section: "Success & Mindset" },
  { id: "mantra", label: "Personal mantra", section: "Success & Mindset" },
  { id: "routine", label: "Pre-performance routine & visualization", section: "Success & Mindset" },
  { id: "pressure", label: "Response to pressure & confidence", section: "Success & Mindset" },

  { id: "whatToInclude", label: "Pillars to include", section: "What to Include & Your Life" },
  { id: "sleepStress", label: "Sleep, stress & schedule", section: "What to Include & Your Life" },
  { id: "recoveryTools", label: "Recovery tools & tracking", section: "What to Include & Your Life" },
  { id: "nutrition", label: "Current nutrition, hydration & direction", section: "What to Include & Your Life" },
  { id: "nutritionSpecifics", label: "Nutrition specifics", section: "What to Include & Your Life" },
  { id: "anythingElse", label: "Anything else", section: "What to Include & Your Life" },
];

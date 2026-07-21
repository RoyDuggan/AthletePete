/**
 * Athlete intake questionnaire — 10 sections / 50 questions (ice-hockey
 * off-season), from the sponsor's spec. Optional questions are excluded from
 * the progress bar; "key"/"safety"/"optional" flags mirror the mockup.
 */
export type IntakeFlag = "key" | "safety" | "optional";

export type IntakeQuestion = {
  id: string;
  n: number;
  label: string;
  hint?: string;
  type: "text" | "textarea" | "checkbox";
  options?: string[];
  flag?: IntakeFlag;
  /** Excluded from the progress calculation (baseline "give what you know"). */
  optional?: boolean;
  placeholder?: string;
};

export type IntakeSection = {
  n: string;
  title: string;
  sub: string;
  note?: string;
  questions: IntakeQuestion[];
};

export const INTAKE_SECTIONS: IntakeSection[] = [
  {
    n: "01",
    title: "The Basics",
    sub: "Let's start with who you are",
    questions: [
      { id: "fullName", n: 1, label: "Full name", type: "text", placeholder: "Your name" },
      { id: "ageDob", n: 2, label: "Age & date of birth", type: "text", placeholder: "e.g. 24 — 14 March 2002" },
      { id: "heightWeight", n: 3, label: "Height & current weight", type: "text", placeholder: "e.g. 6'1\", 185 lb" },
      { id: "handedness", n: 4, label: "Shot hand, and your stronger side", type: "text", hint: "Left or right shot — and which foot you push off / turn more confidently on.", placeholder: "e.g. Left shot, turn stronger to my left" },
      { id: "position", n: 5, label: "Position(s) you play", type: "text", placeholder: "e.g. Left Wing / Centre" },
      { id: "level", n: 6, label: "What level / league do you currently play at?", type: "text", hint: "Pro, semi-pro, junior, college, recreational — be honest, it shapes everything.", placeholder: "e.g. Pro — Elite League" },
    ],
  },
  {
    n: "02",
    title: "Your Summer & Timeline",
    sub: "This sets your whole training calendar",
    questions: [
      { id: "seasonDates", n: 7, label: "When does your season end, and when does pre-season / camp start?", type: "textarea", flag: "key", hint: "Exact dates if you have them — this determines how your phases are built.", placeholder: "e.g. Season ended mid-April, camp starts August 10" },
      { id: "availability", n: 8, label: "How many weeks do you have, and how many days a week can you realistically train?", type: "textarea", hint: "Be honest about your real availability, not your ideal week.", placeholder: "e.g. ~11 weeks, 4–5 days a week" },
      { id: "commitments", n: 9, label: "Any fixed commitments to build around this summer?", type: "textarea", hint: "Camps, holidays, work, weddings, family — with rough dates.", placeholder: "e.g. Holiday first week of July, newborn at home" },
      { id: "onIceAccess", n: 10, label: "What does your on-ice access look like this summer?", type: "textarea", hint: "How many skates per week, and when do they ramp up? Skills sessions, stickhandling, public skates — whatever you'll be doing.", placeholder: "e.g. Skate Tue & Thu from mid-June, ramping to 4x by late July" },
    ],
  },
  {
    n: "03",
    title: "Training Background",
    sub: "Where you're at right now",
    questions: [
      { id: "trainingExperience", n: 11, label: "How many years have you trained seriously with weights, and how many days a week currently?", type: "textarea", placeholder: "e.g. 6 years, currently 4 days a week" },
      { id: "lastOffseason", n: 12, label: "What did a typical training week look like last off-season?", type: "textarea", placeholder: "Walk me through it" },
      { id: "whatWorked", n: 13, label: "What's worked well for you in past programs — and what didn't you stick to, or didn't respond to?", type: "textarea", hint: "The honest version. I'd rather build something you'll actually follow than something perfect on paper.", placeholder: "What clicked, and what fell off" },
      { id: "exercisesLovedHated", n: 14, label: "Exercises you love — and ones you hate or that don't agree with you.", type: "textarea", hint: "e.g. \"back squats wreck my lower back,\" \"I love trap bar pulls.\"", placeholder: "Loves:\nHates / avoid:" },
      { id: "recoveryResponse", n: 15, label: "How do you respond to training?", type: "textarea", hint: "Recover fast and thrive on volume, or do you need more rest between hard sessions to feel good?", placeholder: "Be honest about how your body handles load" },
    ],
  },
  {
    n: "04",
    title: "Equipment & Environment",
    sub: "What you've got to work with",
    questions: [
      { id: "equipment", n: 16, label: "What equipment & environment will you have this summer?", type: "textarea", hint: "List everything — full gym, home setup, and specifics: trap bar, Hammer Strength / glute drive, bands, sled, plyo boxes, sprint/turf space, bike or rower, ice.", placeholder: "e.g. Full commercial gym with trap bar, sled and turf; bands + a box at home" },
    ],
  },
  {
    n: "05",
    title: "Strength, Power & Conditioning Baselines",
    sub: "Your numbers — the more I have, the sharper the build",
    note: "Give what you know — skip the rest. If you've never tested something, leave it blank and we'll benchmark it in Week 1. Best honest estimates only — don't round up.",
    questions: [
      { id: "strengthNumbers", n: 17, label: "Your best recent lifts — roughly 5 clean reps each", type: "textarea", flag: "key", hint: "If you don't know one, just say so.", placeholder: "Trap bar / squat:\nBench / DB press:\nChin-up (bodyweight or +load):\nSingle-leg movement:\nHip thrust / glute drive:" },
      { id: "jumpPower", n: 18, label: "Lower-body power — vertical jump and/or standing broad jump", type: "textarea", flag: "optional", optional: true, hint: "If you've ever measured it. This tells me how explosive you are and how to peak it.", placeholder: "e.g. Vertical ~26\", broad jump ~8'6\" — or 'never measured'" },
      { id: "speed", n: 19, label: "Speed — sprint times, or your sense of it", type: "textarea", flag: "optional", optional: true, hint: "Any 10m/30m times, or just: are you a quick-first-step player or more top-end?", placeholder: "e.g. Explosive first few strides, top speed is average" },
      { id: "agility", n: 20, label: "Change of direction & agility", type: "textarea", flag: "optional", optional: true, hint: "Pro-agility (5-10-5) time if you know it — and do you feel quicker cutting one direction than the other?", placeholder: "e.g. Much sharper cutting left than right" },
      { id: "anaerobic", n: 21, label: "Anaerobic gas — your tank", type: "textarea", flag: "optional", optional: true, hint: "How do you feel in the back half of shifts and in third periods? Ever done a Wingate / bike test?", placeholder: "e.g. Strong early, fade on long shifts" },
      { id: "aerobic", n: 22, label: "Aerobic base", type: "textarea", flag: "optional", optional: true, hint: "Steady cardio you can hold (bike/run), plus resting HR or any wearable / VO2 data.", placeholder: "e.g. Comfortable 40-min bike, resting HR ~52" },
      { id: "pullGrip", n: 23, label: "Upper pulling & grip", type: "textarea", flag: "optional", optional: true, hint: "Max strict pull-ups, and a sense of your grip strength.", placeholder: "e.g. 12 strict pull-ups, strong grip" },
    ],
  },
  {
    n: "06",
    title: "Movement, Mobility & Asymmetry",
    sub: "A quick self-screen — keeps you safe and balanced",
    questions: [
      { id: "ankles", n: 24, label: "Ankles", type: "textarea", hint: "Can you sit into a deep squat with knees over your toes, heels flat on the floor?", placeholder: "e.g. Heels lift in a deep squat" },
      { id: "hips", n: 25, label: "Hips", type: "textarea", hint: "How's your hip rotation and depth — any pinching or restriction in deep positions?", placeholder: "e.g. Tight right hip, pinch at the bottom of a squat" },
      { id: "groin", n: 26, label: "Groin & adductors", type: "textarea", hint: "Any tightness or history of groin issues? How's your inner-thigh (Copenhagen-style) strength?", placeholder: "e.g. Tweaked groin twice last season, feels tight" },
      { id: "shoulders", n: 27, label: "Upper back & shoulders", type: "textarea", hint: "Can you reach overhead cleanly without arching your lower back? Any rounding or tightness?", placeholder: "e.g. Shoulders feel tight pressing overhead" },
      { id: "balance", n: 28, label: "Single-leg balance", type: "textarea", hint: "Steady standing on one leg, eyes open? Notice one side is clearly weaker or wobblier?", placeholder: "e.g. Left leg noticeably less stable" },
      { id: "coreBack", n: 29, label: "Core & lower back", type: "textarea", hint: "How's your core control under load, and any lower-back issues when lifting heavy?", placeholder: "e.g. Lower back fatigues before legs on deadlifts" },
    ],
  },
  {
    n: "07",
    title: "Injury & Health",
    sub: "Please be thorough — this keeps you safe",
    questions: [
      { id: "injuryHistory", n: 30, label: "Any injuries, surgeries, or recurring pain — past or present?", type: "textarea", flag: "safety", hint: "Include rough dates, and whether you're currently cleared to train fully by a physio or doctor.", placeholder: "List anything relevant, and your current clearance status" },
      { id: "movementsToAvoid", n: 31, label: "Any movements that cause you pain, or that you've been told to avoid?", type: "textarea", flag: "safety", placeholder: "e.g. Deep squatting bothers my lower back" },
      { id: "niggles", n: 32, label: "Any current niggles or areas you're managing that aren't full injuries?", type: "textarea", flag: "safety", hint: "The little things — a cranky knee, a stiff shoulder. Lets me program around them before they become problems.", placeholder: "e.g. Right knee aches after heavy jumping" },
      { id: "concussion", n: 33, label: "Concussion history?", type: "textarea", flag: "safety", hint: "Rough dates and recovery. Helps me set conditioning intensity and mental-work load sensibly.", placeholder: "e.g. One concussion, 2022, fully recovered" },
    ],
  },
  {
    n: "08",
    title: "Your Game",
    sub: "What makes you the player you are",
    questions: [
      { id: "topGoals", n: 34, label: "If you could only improve THREE things this off-season, what would they be — ranked?", type: "textarea", hint: "e.g. top speed, first-step quickness, shot power, strength, size, conditioning, mobility, durability.", placeholder: "1.\n2.\n3." },
      { id: "strengths", n: 35, label: "What are your biggest strengths on the ice?", type: "textarea", hint: "The things you do well and want to keep sharp.", placeholder: "What's your edge right now?" },
      { id: "weaknesses", n: 36, label: "What are your biggest weaknesses, or what you most want to improve on the ice?", type: "textarea", placeholder: "Where do you want to be better?" },
      { id: "styleRole", n: 37, label: "Describe your style of play and your role on the team.", type: "textarea", hint: "e.g. power forward who plays heavy and shoots; speedy playmaker; shutdown D.", placeholder: "A few sentences" },
      { id: "skating", n: 38, label: "Rate your own skating.", type: "textarea", hint: "Acceleration, top speed, edges / agility, backwards skating — and which needs the most work?", placeholder: "e.g. Explosive acceleration, average top end, edges need work" },
      { id: "physicalDemands", n: 39, label: "What are the physical demands of YOUR game specifically?", type: "textarea", hint: "Board battles, net-front, hitting, forechecking, shot volume & type — what does your role physically ask of you?", placeholder: "e.g. Heavy net-front presence, lots of board battles, one-timer from the dot" },
    ],
  },
  {
    n: "09",
    title: "Success & Mindset",
    sub: "What drives you, and how your mind works",
    questions: [
      { id: "successDefinition", n: 40, label: "What does a successful off-season look like to you?", type: "textarea", hint: "How will you know it worked when you step on the ice for pre-season?", placeholder: "Paint the picture" },
      { id: "inspiration", n: 41, label: "What inspires you to put the work in when it's hard?", type: "textarea", hint: "Family, a goal, a setback, a rival, a contract, proving someone wrong — whatever's real for you.", placeholder: "Be honest — this shapes the mental side of your plan" },
      { id: "mantra", n: 42, label: "Do you have a personal motto or mantra? If not, want help creating one?", type: "textarea", placeholder: "Your words, or 'help me find one'" },
      { id: "routine", n: 43, label: "Do you have a pre-game or pre-training routine — and do you already visualize?", type: "textarea", hint: "Lets me tailor the mental work to what you already do, not bolt on something generic.", placeholder: "e.g. Music + a few minutes alone; never really visualized" },
      { id: "pressure", n: 44, label: "How do you respond to mistakes and pressure moments — and how's your confidence right now?", type: "textarea", hint: "No wrong answer. This tells me where the mental work should actually focus.", placeholder: "e.g. Dwell on mistakes a bit too long; confidence is solid" },
    ],
  },
  {
    n: "10",
    title: "What to Include & Your Life",
    sub: "Build it to match — and to fit your real world",
    questions: [
      { id: "whatToInclude", n: 45, label: "Which of these do you want built into your program?", type: "checkbox", hint: "Tick all that apply — your plan only includes what you choose.", options: ["Nutrition guidance", "Mental performance", "Recovery & sleep", "Coordination & reaction drills", "At-home / minimal-kit days"] },
      { id: "sleepStress", n: 46, label: "Tell me about your sleep, stress, and schedule.", type: "textarea", hint: "Rough hours and quality, plus anything affecting when you train or recover — young kids, shift work, travel, a demanding job, study.", placeholder: "Be real — this is what makes a plan you'll actually stick to" },
      { id: "recoveryTools", n: 47, label: "What recovery tools do you have access to, and do you track anything?", type: "textarea", hint: "Wearable / HRV, sauna, cold, massage, physio access — whatever you've got.", placeholder: "e.g. Whoop, occasional sauna, physio once a month" },
      { id: "nutrition", n: 48, label: "Describe your current nutrition and hydration honestly — and are you trying to add size, lean out, or maintain?", type: "textarea", hint: "No judgement — just the truth, and any habits you already want to fix.", placeholder: "Honest picture + your goal direction" },
      { id: "nutritionSpecifics", n: 49, label: "Any nutrition specifics I should know?", type: "textarea", hint: "Restrictions, allergies, foods you won't eat, and how your cooking / food access realistically looks.", placeholder: "e.g. Lactose intolerant, cook most meals, eat out 2-3x/week" },
      { id: "anythingElse", n: 50, label: "Anything I haven't asked but you think I should know?", type: "textarea", hint: "About you, your body, your game, your goals, your preferences. The best details often come from here.", placeholder: "Tell me anything" },
    ],
  },
];

/** Question ids that count toward the progress bar (all non-optional). */
export const REQUIRED_IDS: string[] = INTAKE_SECTIONS.flatMap((s) =>
  s.questions.filter((q) => !q.optional).map((q) => q.id)
);

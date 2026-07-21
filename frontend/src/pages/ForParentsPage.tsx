import React from "react";

import AudiencePage, {
  type AudiencePageData,
} from "../components/marketing/AudiencePage";

const DATA: AudiencePageData = {
  eyebrow: "For Parents",
  title: "Making Every",
  titleAccent: "Lap Count",
  intro: [
    { p: "Karting represents a significant investment." },
    {
      bullets: [
        "Tyres",
        "Fuel",
        "Engines",
        "Practice sessions",
        "Race entries",
        "Travel",
        "Equipment",
      ],
    },
    { p: "The cost of helping a young driver develop quickly adds up." },
    {
      p: "Yet one of the most valuable assets produced during every session is often underused: the data.",
    },
    {
      p: "AthletePete helps ensure that every test day, practice session and race meeting continues to deliver value long after the kart has been loaded back into the van.",
    },
  ],
  sections: [
    {
      title: "Understand Progress",
      blocks: [
        { p: "Many parents find themselves asking:" },
        {
          bullets: [
            "Is my child improving?",
            "Which skills need work?",
            "Are coaching sessions delivering results?",
            "Is new equipment making a difference?",
            "Are setup changes helping or hurting performance?",
          ],
        },
        {
          p: "AthletePete helps answer those questions using evidence rather than guesswork.",
        },
      ],
    },
    {
      title: "Single Driver Package",
      blocks: [
        { p: "Perfect for families supporting one driver." },
        { p: "Features include:" },
        {
          bullets: [
            "Driver performance history",
            "Session-by-session analysis",
            "Progress tracking",
            "Coaching summaries",
            "Driver development reports",
            "Comparison against personal best laps",
          ],
        },
        { p: "A complete development record that grows with the driver." },
      ],
    },
    {
      title: "Multi-Kart Family Package",
      blocks: [
        {
          p: "Many karting families quickly find themselves supporting more than one kart.",
        },
        { p: "Perhaps:" },
        {
          bullets: [
            "Two siblings racing",
            "One driver competing in multiple classes",
            "Practice and race karts",
            "Different chassis configurations",
          ],
        },
        {
          p: "AthletePete allows multiple karts and drivers to be managed under a single family account.",
        },
        { p: "Benefits include:" },
        {
          bullets: [
            "Separate driver profiles",
            "Multiple kart configurations",
            "Shared family dashboard",
            "Centralised session history",
            "Development tracking across all drivers",
          ],
        },
        { p: "Everything organised in one place." },
      ],
    },
    {
      title: "Build A Racing Diary",
      blocks: [
        {
          p: "Over time, AthletePete becomes much more than a telemetry system.",
        },
        { p: "It becomes a record of a driver's development." },
        { p: "A place where families can look back and see:" },
        {
          bullets: [
            "First races",
            "Personal bests",
            "Major breakthroughs",
            "Championship campaigns",
            "Driver progression over time",
          ],
        },
        { p: "A racing journey documented through data." },
      ],
    },
    {
      title: "Protect Your Investment",
      blocks: [
        { p: "You already invest heavily in karting." },
        {
          p: "AthletePete helps maximise the value of every session by ensuring the lessons hidden within the data are not lost.",
        },
        { p: "Don't just collect data. Learn from it.", emphasis: true },
      ],
    },
  ],
};

const ForParentsPage: React.FC = () => <AudiencePage data={DATA} />;

export default ForParentsPage;

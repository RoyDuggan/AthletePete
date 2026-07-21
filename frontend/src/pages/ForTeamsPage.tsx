import React from "react";

import AudiencePage, {
  type AudiencePageData,
} from "../components/marketing/AudiencePage";

const DATA: AudiencePageData = {
  eyebrow: "For Teams",
  title: "Develop Drivers.",
  titleAccent: "Not Just Karts.",
  intro: [
    { p: "Successful kart teams manage far more than equipment." },
    { p: "They develop drivers." },
    {
      p: "AthletePete provides a central platform for analysing performance, tracking progress and delivering consistent coaching across an entire team operation.",
    },
  ],
  sections: [
    {
      title: "One Platform For The Entire Team",
      blocks: [
        { p: "Manage:" },
        {
          bullets: [
            "Multiple drivers",
            "Multiple karts",
            "Multiple classes",
            "Multiple championships",
            "Multiple circuits",
          ],
        },
        { p: "All from a single platform." },
        {
          p: "Whether supporting three drivers or thirty, AthletePete scales to fit the organisation.",
        },
      ],
    },
    {
      title: "Driver Development Hub",
      blocks: [
        { p: "Create a structured coaching environment." },
        { p: "Track:" },
        {
          bullets: [
            "Driver progress",
            "Strengths and weaknesses",
            "Consistency metrics",
            "Coaching priorities",
            "Historical development trends",
          ],
        },
        {
          p: "Ensure every driver receives consistent, evidence-based feedback.",
        },
      ],
    },
    {
      title: "Kart Configuration Management",
      blocks: [
        { p: "Performance often depends on more than the driver." },
        { p: "AthletePete allows teams to maintain records for:" },
        {
          bullets: [
            "Chassis configurations",
            "Axle choices",
            "Ride heights",
            "Track widths",
            "Tyres",
            "Gearing",
            "Engine configurations",
            "Weather conditions",
          ],
        },
        { p: "Build a knowledge base that grows with every event." },
      ],
    },
    {
      title: "Compare Drivers",
      blocks: [
        { p: "Identify:" },
        {
          bullets: [
            "Best braking performance",
            "Corner speed differences",
            "Consistency leaders",
            "Areas requiring coaching",
            "Performance trends across the team",
          ],
        },
        { p: "Turn team data into coaching opportunities." },
      ],
    },
    {
      title: "Standardise Coaching",
      blocks: [
        {
          p: "Different coaches often communicate performance in different ways.",
        },
        {
          p: "AthletePete provides a consistent analytical framework that allows:",
        },
        {
          bullets: [
            "Drivers",
            "Mechanics",
            "Engineers",
            "Team managers",
            "Coaches",
          ],
        },
        { p: "to work from the same information." },
        { p: "Everyone sees the same evidence." },
        { p: "Everyone focuses on the same priorities." },
      ],
    },
    {
      title: "Build Organisational Knowledge",
      blocks: [
        { p: "Every event produces valuable information." },
        { p: "Without a structured process, much of that knowledge is lost." },
        { p: "AthletePete creates a permanent record of:" },
        {
          bullets: [
            "Driver development",
            "Kart setups",
            "Circuit performance",
            "Weather effects",
            "Successful configurations",
            "Coaching outcomes",
          ],
        },
        {
          p: "Over time, this becomes one of the team's most valuable assets.",
        },
      ],
    },
  ],
  closing: {
    title: "From Club Teams To",
    titleAccent: "Championship Campaigns",
    paragraphs: [
      "Whether you're supporting local club racers or competing at national level, AthletePete provides a scalable platform for driver development, performance analysis and knowledge management.",
    ],
    taglines: ["Develop drivers.", "Capture knowledge.", "Find your edge."],
  },
};

const ForTeamsPage: React.FC = () => <AudiencePage data={DATA} />;

export default ForTeamsPage;

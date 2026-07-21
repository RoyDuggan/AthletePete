import React from "react";

import AudiencePage, {
  type AudiencePageData,
} from "../components/marketing/AudiencePage";

const DATA: AudiencePageData = {
  eyebrow: "For Drivers",
  title: "Your Data.",
  titleAccent: "Your Development.",
  intro: [
    { p: "Every lap contains opportunities to improve." },
    {
      p: "AthletePete transforms complex telemetry into clear coaching insights, helping drivers understand not only where time is being lost but why.",
    },
    {
      p: "Whether you're competing in Bambino, Cadet, Junior, Senior or Gearbox classes, AthletePete adapts its coaching to your stage of development.",
    },
  ],
  sections: [
    {
      title: "Start With The Fundamentals",
      blocks: [
        { p: "New drivers don't need advanced telemetry jargon." },
        { p: "AthletePete can be configured to focus on:" },
        {
          bullets: [
            "Braking points",
            "Racing lines",
            "Corner speed",
            "Consistency",
            "Smooth driving inputs",
            "Building confidence",
          ],
        },
        {
          p: "Instead of being overwhelmed by data, drivers learn the habits that create speed.",
        },
      ],
    },
    {
      title: "Progress To Advanced Analysis",
      blocks: [
        { p: "As experience grows, coaching becomes more detailed:" },
        {
          bullets: [
            "Entry speed optimisation",
            "Apex speed management",
            "Exit acceleration",
            "Comparative lap analysis",
            "Braking efficiency",
            "Sector performance",
            "Driver consistency trends",
          ],
        },
        {
          p: "The system grows with the driver, providing increasingly sophisticated insights as skills develop.",
        },
      ],
    },
    {
      title: "Chasing Hundredths",
      blocks: [
        {
          p: "At the highest level, winning margins are often measured in hundredths of a second.",
        },
        { p: "AthletePete helps experienced drivers identify:" },
        {
          bullets: [
            "Tiny variations in braking technique",
            "Minimum speed differences",
            "Corner-to-corner performance changes",
            "Consistency across race distances",
            "Opportunities hidden within telemetry traces",
          ],
        },
      ],
    },
    {
      title: "Build Data Skills For The Future",
      blocks: [
        { p: "Modern motorsport is built on data." },
        {
          p: "Professional drivers work alongside engineers to understand performance and make evidence-based decisions.",
        },
        {
          p: "AthletePete helps young drivers develop those skills from the start, creating habits that can support progression through karting and beyond.",
        },
      ],
    },
  ],
  closing: {
    title: "Learn From Every Lap.",
    titleAccent: "Find Your Edge.",
    paragraphs: [
      "AthletePete grows with the driver — from first laps to future championships.",
    ],
  },
};

const ForDriversPage: React.FC = () => <AudiencePage data={DATA} />;

export default ForDriversPage;

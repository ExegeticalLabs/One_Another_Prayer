import React from "react";
import { Home, Briefcase, Wind, Heart, Users, Book } from "lucide-react";

export const CAT: Record<string, string> = {
  Health: "#e06060",
  Family: "#5b8db8",
  Work: "#c9a227",
  Gratitude: "#2ea97a",
  Spiritual: "#8b6caf",
  Struggles: "#7a8a9a",
  Other: "#a0a0a0",
};

export const PROMPTS = [
  { icon: React.createElement(Home, { size: 22 }), q: "Family", desc: "Home life", bullets: ["What's been weighing on your family lately?", "Any specific needs for your spouse or children?", "Is there a conflict needing peace?"] },
  { icon: React.createElement(Briefcase, { size: 22 }), q: "Work", desc: "Career", bullets: ["Any work struggles you need to bring before God?", "Pray for wisdom in upcoming decisions.", "Are there colleagues who need encouragement?"] },
  { icon: React.createElement(Wind, { size: 22 }), q: "Spiritual", desc: "Trusting", bullets: ["How has your personal time in God's word been?", "Where are you struggling to trust Him?", "What is He teaching you right now?"] },
  { icon: React.createElement(Heart, { size: 22 }), q: "Gratitude", desc: "Blessings", bullets: ["What do you have to be thankful for right now?", "Name three small blessings from today.", "How has His provision been evident?"] },
  { icon: React.createElement(Users, { size: 22 }), q: "Other", desc: "Community", bullets: ["Any friends or neighbors on your heart?", "Pray for an opportunity to serve someone.", "Ask for a heart of compassion for those around you."] },
  { icon: React.createElement(Book, { size: 22 }), q: "Struggles", desc: "Strength", bullets: ["What personal struggle needs God's strength today?", "Ask for endurance in a difficult season.", "Pray for a breakthrough in a specific area?"] },
];

import React from "react";

export function FitnessRing({ size = 120, stroke = 12, percentage = 0, color = "#ff4d4d", index = 0, bgOpacity = 0.2 }: { size?: number; stroke?: number; percentage?: number; color?: string; index?: number; bgOpacity?: number }) {
  const radius = (size / 2) - (index * (stroke + 4)) - (stroke / 2);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke={color} strokeWidth={stroke} strokeOpacity={bgOpacity} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)" }} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </>
  );
}

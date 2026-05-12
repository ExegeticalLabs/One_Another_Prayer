import React from "react";

export const Screen: React.FC<{ children: React.ReactNode, prayingActive?: boolean }> = ({ children, prayingActive }) => {
  return <section className={`screen ${prayingActive ? 'praying-screen' : ''}`}>{children}</section>;
}

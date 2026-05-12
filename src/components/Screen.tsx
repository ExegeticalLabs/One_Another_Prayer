import React from "react";

export function Screen({ children, prayingActive, key }: { children: React.ReactNode, prayingActive?: boolean, key?: React.Key }) {
  return <section className={`screen ${prayingActive ? 'praying-screen' : ''}`}>{children}</section>;
}

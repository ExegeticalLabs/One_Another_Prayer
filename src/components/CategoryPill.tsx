import React from "react";
import { CAT } from "../lib/constants";

export function CategoryPill({ category }: { category: string }) {
  const c = CAT[category] || CAT.Other;
  return (
    <div className="pill" style={{ borderColor: `${c}44`, background: `${c}10` }}>
      <span className="dot" style={{ background: c }} />
      <span className="pillText" style={{ color: c }}>{category}</span>
    </div>
  );
}

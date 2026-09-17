"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * A blinking inline cursor appended to the end of in-flight streamed text.
 */
export function StreamingCursor() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.span
      animate={shouldReduceMotion ? undefined : { opacity: [1, 0] }}
      aria-hidden="true"
      className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-current align-middle"
      transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
    />
  );
}

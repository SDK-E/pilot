"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Fades and lifts a message into place on mount. Skips the vertical motion
 * (keeps only the fade) when the user has requested reduced motion.
 */
export function MessageAppear({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

"use client";

import { motion, useReducedMotion } from "motion/react";

const DOT_DELAYS = [0, 0.12, 0.24];

/**
 * Three dots pulsing in sequence — the "Pilot is working" indicator, in
 * place of a spinner + status text. Falls back to a static (non-pulsing)
 * set of dots under reduced motion.
 */
export function TypingDots({ className }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <span aria-hidden="true" className={className} role="presentation">
      <span className="flex items-center gap-1">
        {DOT_DELAYS.map((delay, index) => (
          <motion.span
            animate={
              shouldReduceMotion ? undefined : { opacity: [0.3, 1, 0.3] }
            }
            className="size-1.5 rounded-full bg-current"
            key={index}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </span>
    </span>
  );
}

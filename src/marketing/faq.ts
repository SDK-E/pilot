export interface FaqItem {
  question: string;
  answer: string;
}

export const HOME_FAQ: readonly FaqItem[] = [
  {
    question: "What is Pilot?",
    answer:
      "Pilot is an AI workspace for teams, built around three modes: Chat for quick answers, Work for multi-step tasks Pilot plans and executes, and Code for reading and proposing code changes as reviewable diffs.",
  },
  {
    question: "Is Pilot open source?",
    answer:
      "No. Pilot is a closed-source, hosted product built by SDK Enterprises.",
  },
  {
    question: "How is my data handled?",
    answer:
      "Conversations, projects, and files are private to the person who created them within your organization — membership alone does not grant access to another member's data. See the Privacy Policy for the full detail.",
  },
  {
    question: "Do I need a credit card to try Pilot?",
    answer:
      "No. Pilot is free to use during early access while billing is being built. See the Pricing page for what each tier will include.",
  },
];

export const PRICING_FAQ: readonly FaqItem[] = [
  {
    question: "Will I be charged automatically once billing launches?",
    answer:
      "No. Pilot has no payment integration yet, so nothing is charged automatically. When paid billing ships, you'll be notified before any charge applies to your account.",
  },
  {
    question:
      "What's the difference between the Work and Chat + Work + Code plans?",
    answer:
      "Work adds the Work mode's planning and task execution on top of Chat. The full plan additionally unlocks Code mode, for reading, explaining, and proposing code changes as reviewable diffs.",
  },
  {
    question: "Can I switch plans later?",
    answer:
      "Yes. Once billing is live, you'll be able to change your plan from Settings at any time.",
  },
];

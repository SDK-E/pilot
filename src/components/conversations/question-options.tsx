"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

interface Option {
  label: string;
  description?: string;
}

interface QuestionOptionsProps {
  options: Option[];
  mode: "single_select" | "multi_select";
  disabled: boolean;
  onAnswer: (text: string) => void;
}

/**
 * The choices of an Ask User question. Single select answers on click;
 * multi select collects checks and submits them as one message.
 */
export function QuestionOptions({
  options,
  mode,
  disabled,
  onAnswer,
}: QuestionOptionsProps) {
  const [selected, setSelected] = useState<string[]>([]);

  if (mode === "single_select") {
    return (
      <div
        aria-label="Select an answer, or write a reply"
        className="mt-3 flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <Button
            disabled={disabled}
            key={option.label}
            onClick={() => {
              onAnswer(option.label);
            }}
            size="sm"
            title={option.description}
            type="button"
            variant="outline"
          >
            {option.label}
          </Button>
        ))}
      </div>
    );
  }

  const toggle = (label: string) => {
    setSelected((current) =>
      current.includes(label)
        ? current.filter((value) => value !== label)
        : [...current, label],
    );
  };

  return (
    <fieldset className="mt-3 space-y-2" disabled={disabled}>
      <legend className="text-xs text-muted-foreground">
        Select one or more answers, or write a reply.
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            key={option.label}
            title={option.description}
          >
            <input
              checked={selected.includes(option.label)}
              className="size-4 accent-primary"
              onChange={() => {
                toggle(option.label);
              }}
              type="checkbox"
            />
            {option.label}
          </label>
        ))}
      </div>
      <Button
        disabled={disabled || selected.length === 0}
        onClick={() => {
          onAnswer(selected.join("\n"));
        }}
        size="sm"
        type="button"
      >
        Submit selected answers
      </Button>
    </fieldset>
  );
}

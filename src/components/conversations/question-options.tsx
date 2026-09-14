"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";

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

function MultiSelectOption({
  option,
  isSelected,
  disabled,
  onToggle,
}: {
  option: Option;
  isSelected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  return (
    <FieldLabel
      className="inline-flex w-fit rounded-md border px-2 py-1.5"
      htmlFor={id}
      title={option.description}
    >
      <Checkbox
        checked={isSelected}
        disabled={disabled}
        id={id}
        onCheckedChange={onToggle}
      />
      {option.label}
    </FieldLabel>
  );
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
    <div className="mt-3 space-y-2">
      <p className="text-xs text-muted-foreground">
        Select one or more answers, or write a reply.
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <MultiSelectOption
            disabled={disabled}
            isSelected={selected.includes(option.label)}
            key={option.label}
            onToggle={() => {
              toggle(option.label);
            }}
            option={option}
          />
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
    </div>
  );
}

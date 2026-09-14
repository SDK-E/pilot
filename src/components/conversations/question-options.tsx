"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
 * A free-text answer inline with the option buttons, so replying with your
 * own words doesn't mean leaving the question to find the main composer.
 */
function CustomAnswerField({
  disabled,
  onAnswer,
}: {
  disabled: boolean;
  onAnswer: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const id = useId();

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onAnswer(text);
    setDraft("");
  };

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={id}>
        Write your own answer
      </label>
      <Input
        disabled={disabled}
        id={id}
        onChange={(event) => {
          setDraft(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          submit();
        }}
        placeholder="Or write your own answer…"
        value={draft}
      />
      <Button
        disabled={disabled || !draft.trim()}
        onClick={submit}
        size="sm"
        type="button"
        variant="outline"
      >
        Send
      </Button>
    </div>
  );
}

function SingleSelectQuestion({
  options,
  disabled,
  onAnswer,
}: Omit<QuestionOptionsProps, "mode">) {
  return (
    <div
      aria-label="Select an answer, or write your own"
      className="mt-3 space-y-2"
    >
      <div className="flex flex-wrap gap-2">
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
      <CustomAnswerField disabled={disabled} onAnswer={onAnswer} />
    </div>
  );
}

function MultiSelectQuestion({
  options,
  disabled,
  onAnswer,
}: Omit<QuestionOptionsProps, "mode">) {
  const [selected, setSelected] = useState<string[]>([]);

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
        Select one or more answers, or write your own below.
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
      <CustomAnswerField disabled={disabled} onAnswer={onAnswer} />
    </div>
  );
}

/**
 * The choices of an Ask User question. Single select answers on click;
 * multi select collects checks and submits them as one message. Either mode
 * also takes a free-text answer inline, so replying in your own words never
 * requires leaving the question to find the composer.
 */
export function QuestionOptions({
  options,
  mode,
  disabled,
  onAnswer,
}: QuestionOptionsProps) {
  if (mode === "single_select") {
    return (
      <SingleSelectQuestion
        disabled={disabled}
        onAnswer={onAnswer}
        options={options}
      />
    );
  }
  return (
    <MultiSelectQuestion
      disabled={disabled}
      onAnswer={onAnswer}
      options={options}
    />
  );
}

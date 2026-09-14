"use client";

import { useId, useRef, useState } from "react";

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

const OPTION_ROW_CLASSNAME =
  "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

function OptionBadge({ index }: { index: number }) {
  return (
    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
      {index + 1}
    </span>
  );
}

function OptionText({ option }: { option: Option }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-sm font-medium">{option.label}</span>
      {option.description ? (
        <span className="text-xs text-muted-foreground">
          {option.description}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Arrow-key roving focus across a list of option rows, so the question
 * behaves like a real listbox instead of a row of disconnected buttons.
 */
function useRovingFocus(count: number) {
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    let delta = 0;
    if (event.key === "ArrowDown") delta = 1;
    else if (event.key === "ArrowUp") delta = -1;
    if (delta === 0) return;
    event.preventDefault();
    const next = (index + delta + count) % count;
    rowRefs.current[next]?.focus();
  };
  return { rowRefs, onKeyDown };
}

/**
 * A free-text answer inline with the option rows, so replying with your own
 * words doesn't mean leaving the question to find the main composer.
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
    <div className="flex items-center gap-2 border-t bg-muted/20 p-2">
      <label className="sr-only" htmlFor={id}>
        Write your own answer
      </label>
      <Input
        className="border-transparent bg-transparent shadow-none focus-visible:border-ring focus-visible:bg-background"
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
  const { rowRefs, onKeyDown } = useRovingFocus(options.length);
  return (
    <div className="mt-3 overflow-hidden rounded-xl border bg-card shadow-sm">
      <div aria-label="Select an answer, or write your own" role="radiogroup">
        {options.map((option, index) => (
          <button
            aria-checked={false}
            className={OPTION_ROW_CLASSNAME}
            disabled={disabled}
            key={option.label}
            onClick={() => {
              onAnswer(option.label);
            }}
            onKeyDown={(event) => {
              onKeyDown(event, index);
            }}
            ref={(el) => {
              rowRefs.current[index] = el;
            }}
            role="radio"
            tabIndex={index === 0 ? 0 : -1}
            title={option.description}
            type="button"
          >
            <OptionBadge index={index} />
            <OptionText option={option} />
          </button>
        ))}
      </div>
      <CustomAnswerField disabled={disabled} onAnswer={onAnswer} />
      <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        <kbd className="font-sans">↑↓</kbd> to navigate ·{" "}
        <kbd className="font-sans">Enter</kbd> to select
      </p>
    </div>
  );
}

function MultiSelectRow({
  option,
  index,
  isSelected,
  disabled,
  onToggle,
  rowRef,
  onKeyDown,
}: {
  option: Option;
  index: number;
  isSelected: boolean;
  disabled: boolean;
  onToggle: () => void;
  rowRef: (el: HTMLElement | null) => void;
  onKeyDown: (event: React.KeyboardEvent, index: number) => void;
}) {
  const id = useId();
  return (
    <FieldLabel
      className={OPTION_ROW_CLASSNAME}
      htmlFor={id}
      ref={rowRef}
      tabIndex={index === 0 ? 0 : -1}
      title={option.description}
      onKeyDown={(event: React.KeyboardEvent) => {
        onKeyDown(event, index);
      }}
    >
      <Checkbox
        checked={isSelected}
        className="mt-0.5"
        disabled={disabled}
        id={id}
        onCheckedChange={onToggle}
      />
      <OptionText option={option} />
    </FieldLabel>
  );
}

function MultiSelectQuestion({
  options,
  disabled,
  onAnswer,
}: Omit<QuestionOptionsProps, "mode">) {
  const [selected, setSelected] = useState<string[]>([]);
  const { rowRefs, onKeyDown } = useRovingFocus(options.length);

  const toggle = (label: string) => {
    setSelected((current) =>
      current.includes(label)
        ? current.filter((value) => value !== label)
        : [...current, label],
    );
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border bg-card shadow-sm">
      <div aria-label="Select one or more answers, or write your own">
        {options.map((option, index) => (
          <MultiSelectRow
            disabled={disabled}
            index={index}
            isSelected={selected.includes(option.label)}
            key={option.label}
            onKeyDown={onKeyDown}
            onToggle={() => {
              toggle(option.label);
            }}
            option={option}
            rowRef={(el) => {
              rowRefs.current[index] = el;
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
        <p className="text-[11px] text-muted-foreground">
          <kbd className="font-sans">Space</kbd> to toggle
        </p>
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
      <CustomAnswerField disabled={disabled} onAnswer={onAnswer} />
    </div>
  );
}

/**
 * The choices of an Ask User question, rendered as a distinct card so a
 * question reads as something to answer rather than more prose - numbered,
 * keyboard-navigable rows for single select, checkable rows for multi
 * select, and either mode takes a free-text answer inline so replying in
 * your own words never requires leaving the question to find the composer.
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

"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepMeta = {
  id: string;
  label: string;
};

export function Stepper({
  steps,
  currentIndex,
}: {
  steps: StepMeta[];
  currentIndex: number;
}) {
  return (
    <div className="w-full">
      {/* Masaüstü: tam etiketli yatay stepper */}
      <ol className="hidden items-center gap-2 md:flex">
        {steps.map((step, index) => {
          const isDone = index < currentIndex;
          const isActive = index === currentIndex;
          return (
            <li key={step.id} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    isDone
                      ? "bg-brand-500 text-white"
                      : isActive
                        ? "bg-navy-900 text-white"
                        : "bg-navy-100 text-navy-400"
                  )}
                >
                  {isDone ? <Check size={15} /> : index + 1}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-xs font-semibold",
                    isActive ? "text-navy-900" : isDone ? "text-navy-600" : "text-navy-400"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <span
                  className={cn(
                    "mx-1 h-px flex-1 rounded-full",
                    isDone ? "bg-brand-400" : "bg-navy-100"
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Mobil: taşmayan kompakt gösterge — nokta + "Adım X / N" */}
      <div className="flex items-center gap-3 md:hidden">
        <div className="flex shrink-0 items-center gap-1.5">
          {steps.map((step, index) => (
            <span
              key={step.id}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === currentIndex
                  ? "w-5 bg-brand-500"
                  : index < currentIndex
                    ? "w-1.5 bg-brand-300"
                    : "w-1.5 bg-navy-100"
              )}
              aria-hidden
            />
          ))}
        </div>
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-navy-500">
          <span className="text-navy-400">
            {currentIndex + 1}/{steps.length}
          </span>
          <span className="ml-1.5 text-navy-800">{steps[currentIndex]?.label}</span>
        </p>
      </div>
    </div>
  );
}

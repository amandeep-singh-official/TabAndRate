"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { number: 1, label: "Your Business" },
  { number: 2, label: "Profile Info" },
  { number: 3, label: "Get Your Link" },
];

interface StepperProps {
  current: 1 | 2 | 3;
}

export function OnboardingStepper({ current }: StepperProps) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const done = step.number < current;
        const active = step.number === current;

        return (
          <div key={step.number} className="flex items-center">
            {/* Step circle */}
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors",
                  done &&
                    "bg-primary border-primary text-primary-foreground",
                  active &&
                    "bg-primary border-primary text-primary-foreground",
                  !done &&
                    !active &&
                    "bg-background border-border text-muted-foreground"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : step.number}
              </div>
              <span
                className={cn(
                  "text-sm hidden sm:block",
                  active ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-10 sm:w-16 mx-3 transition-colors",
                  done ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

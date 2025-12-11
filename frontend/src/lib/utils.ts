import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseSteps(text?: string): string[] {
  if (!text) return [];
  const normalized = text.replace(/\r\n/g, "\n");
  let steps = normalized
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (steps.length > 1) return steps;

  // Try splitting by sentence boundaries
  steps = normalized
    .split(/\. (?=[A-ZА-ЯЁ])/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean);
  if (steps.length > 1) return steps;

  // Fallback: semicolons
  steps = normalized
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  return steps.length ? steps : [normalized.trim()];
}
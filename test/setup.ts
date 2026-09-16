import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock navigator.clipboard
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
  configurable: true,
});

// Mock window.open
window.open = vi.fn();

import { describe, it, expect } from "vitest";
import { generateSlug, formatCount, calcPercent, getInitials } from "@/lib/utils";

describe("lib/utils unit tests", () => {
  describe("generateSlug", () => {
    it("converts strings to lowercase, trimmed, hyphenated slugs", () => {
      expect(generateSlug("D-Hangout Cafe")).toBe("d-hangout-cafe");
      expect(generateSlug("  Spice & Garden   ")).toBe("spice-garden");
      expect(generateSlug("The 100% Best Bakery!")).toBe("the-100-best-bakery");
    });

    it("collapses multiple spaces and hyphens", () => {
      expect(generateSlug("Awesome---Cafe   Bar")).toBe("awesome-cafe-bar");
    });

    it("truncates to maximum 50 characters", () => {
      const longName = "A".repeat(80);
      expect(generateSlug(longName).length).toBe(50);
    });

    it("strips leading and trailing hyphens and whitespace", () => {
      expect(generateSlug(" - Hello World - ")).toBe("hello-world");
      expect(generateSlug("---Special---Store---")).toBe("special-store");
      expect(generateSlug("  - - Test - -  ")).toBe("test");
    });

    it("normalizes accented Latin characters cleanly", () => {
      expect(generateSlug("Café & Crêpe")).toBe("cafe-crepe");
      expect(generateSlug("Naïve Résumé Büfé")).toBe("naive-resume-bufe");
      expect(generateSlug("Jalapeño & Piñata")).toBe("jalapeno-pinata");
    });

    it("generates valid URL-safe fallback slug for non-Latin business names", () => {
      const nonLatinNames = [
        "चाय कैफ़े",       // Hindi
        "مطعم الشرق",      // Arabic
        "北京烤鸭",         // Chinese
        "Кафе Бар",        // Cyrillic
        "すし 居酒屋",      // Japanese
        "סלון יופי",       // Hebrew
      ];

      for (const name of nonLatinNames) {
        const slug = generateSlug(name);
        expect(slug).toBeDefined();
        expect(slug.length).toBeGreaterThan(0);
        expect(slug).toMatch(/^business-[a-z0-9]+$/);
      }
    });

    it("generates valid URL-safe fallback slug for emoji-only business names", () => {
      const emojiNames = [
        "🍕🎉🚀",
        "🔥☕️",
        "🌮🥑✨",
        "💈✂️",
      ];

      for (const name of emojiNames) {
        const slug = generateSlug(name);
        expect(slug).toBeDefined();
        expect(slug.length).toBeGreaterThan(0);
        expect(slug).toMatch(/^business-[a-z0-9]+$/);
      }
    });

    it("generates valid fallback slug for empty string or whitespace-only inputs", () => {
      expect(generateSlug("")).toMatch(/^business-[a-z0-9]+$/);
      expect(generateSlug("   ")).toMatch(/^business-[a-z0-9]+$/);
      expect(generateSlug("\t\n")).toMatch(/^business-[a-z0-9]+$/);
    });

    it("generates valid fallback slug for special symbols-only inputs", () => {
      expect(generateSlug("!@#$%^&*()_+=~`{}[]:;'<>,.?/")).toMatch(/^business-[a-z0-9]+$/);
      expect(generateSlug("---")).toMatch(/^business-[a-z0-9]+$/);
    });

    it("preserves Latin alphanumeric characters when mixed with non-Latin or emoji", () => {
      expect(generateSlug("Tokyo Sushi 東京")).toBe("tokyo-sushi");
      expect(generateSlug("Pizza 🍕 Palace")).toBe("pizza-palace");
      expect(generateSlug("Cafe 123 서울")).toBe("cafe-123");
    });
  });

  describe("formatCount", () => {
    it("formats standard numbers below 1000", () => {
      expect(formatCount(0)).toBe("0");
      expect(formatCount(42)).toBe("42");
      expect(formatCount(999)).toBe("999");
    });

    it("formats numbers in thousands with K suffix", () => {
      expect(formatCount(1000)).toBe("1.0K");
      expect(formatCount(2500)).toBe("2.5K");
      expect(formatCount(999999)).toBe("1000.0K");
    });

    it("formats numbers in millions with M suffix", () => {
      expect(formatCount(1000000)).toBe("1.0M");
      expect(formatCount(3750000)).toBe("3.8M");
    });
  });

  describe("calcPercent", () => {
    it("calculates percentage correctly and rounds to nearest integer", () => {
      expect(calcPercent(5, 10)).toBe("50%");
      expect(calcPercent(1, 3)).toBe("33%");
      expect(calcPercent(2, 3)).toBe("67%");
      expect(calcPercent(10, 10)).toBe("100%");
    });

    it("gracefully handles division by zero", () => {
      expect(calcPercent(5, 0)).toBe("0%");
      expect(calcPercent(0, 0)).toBe("0%");
    });
  });

  describe("getInitials", () => {
    it("extracts up to 2 uppercase initials", () => {
      expect(getInitials("Amandeep Singh")).toBe("AS");
      expect(getInitials("D-Hangout")).toBe("D");
      expect(getInitials("Spice Garden Restaurant & Bar")).toBe("SG");
      expect(getInitials("Single")).toBe("S");
    });

    it("handles empty or single char strings", () => {
      expect(getInitials("")).toBe("");
      expect(getInitials("A")).toBe("A");
    });
  });
});

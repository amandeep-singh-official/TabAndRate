import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import OnboardingStep3 from "@/app/onboarding/step3/page";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

describe("OnboardingStep3 Component & Semantic HTML Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // Mock global fetch for QR code generation endpoint
    global.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(["mock-qr-png"], { type: "image/png" })),
    } as any);
  });

  it("renders preview funnel button as a clean <a> element without type='button' or nested buttons", async () => {
    sessionStorage.setItem("onboarding_slug", "d-hangout-cafe");

    const { container } = render(<OnboardingStep3 />);

    const previewLink = screen.getByRole("link", { name: /preview funnel/i });
    expect(previewLink).toBeInTheDocument();

    // 1. Tag name must be A (clean anchor element)
    expect(previewLink.tagName).toBe("A");

    // 2. Must NOT have invalid type="button" attribute (common Base UI render prop artifact)
    expect(previewLink.getAttribute("type")).toBeNull();

    // 3. Must link to the public funnel route with target="_blank"
    expect(previewLink).toHaveAttribute("href", "/r/d-hangout-cafe");
    expect(previewLink).toHaveAttribute("target", "_blank");

    // 4. Strict DOM nesting checks:
    // <a> cannot be inside a <button>
    const linksInsideButtons = container.querySelectorAll("button a");
    expect(linksInsideButtons.length).toBe(0);

    // <button> cannot be inside an <a>
    const buttonsInsideLinks = container.querySelectorAll("a button");
    expect(buttonsInsideLinks.length).toBe(0);

    // <button> cannot be inside another <button>
    const nestedButtons = container.querySelectorAll("button button");
    expect(nestedButtons.length).toBe(0);
  });

  it("redirects to /onboarding/step1 if no slug is in sessionStorage", () => {
    render(<OnboardingStep3 />);
    expect(mockReplace).toHaveBeenCalledWith("/onboarding/step1");
  });

  it("navigates to /dashboard and cleans up session storage when clicking Go to Dashboard", async () => {
    sessionStorage.setItem("onboarding_slug", "test-bakes");

    render(<OnboardingStep3 />);

    const dashboardBtn = screen.getByRole("button", { name: /go to dashboard/i });
    expect(dashboardBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(dashboardBtn);
    });

    expect(sessionStorage.getItem("onboarding_slug")).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("copies funnel URL to clipboard when clicking Copy button", async () => {
    sessionStorage.setItem("onboarding_slug", "artisan-pizza");

    render(<OnboardingStep3 />);

    const copyBtn = screen.getByRole("button", { name: /copy/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("/r/artisan-pizza")
    );
  });
});

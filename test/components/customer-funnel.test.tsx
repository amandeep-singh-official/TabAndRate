import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CustomerFunnel } from "@/components/funnel/customer-funnel";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";

const mockBusiness = {
  id: "biz-123",
  name: "D-Hangout",
  slug: "d-hangout",
  address: "Sector 32, Chandigarh",
  reviewUrl: "https://maps.app.goo.gl/bWz9yJeUPqzy1boZ7",
  category: "Cafe",
  tags: ["Cozy Ambiance", "Great Coffee", "Fast Wi-Fi"],
  customDescription: "Specialty cafe",
  logoUrl: null,
};

describe("CustomerFunnel Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "/api/generate") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              reviews: [
                "Loved the cozy ambiance and great coffee at D-Hangout!",
                "Amazing experience at D-Hangout, will definitely visit again.",
              ],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });
    });
  });

  it("renders initial star selection screen and tracks visit on mount", () => {
    render(<CustomerFunnel business={mockBusiness} />);

    expect(screen.getByText("How was your experience?")).toBeInTheDocument();
    expect(screen.getByText("D-Hangout")).toBeInTheDocument();

    // Check visit event tracked
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/analytics",
      expect.objectContaining({
        body: JSON.stringify({ slug: "d-hangout", type: "visit" }),
      })
    );
  });

  it("intercepts 1, 2, or 3 star ratings and directs to private feedback form with compulsory feedback", async () => {
    render(<CustomerFunnel business={mockBusiness} />);

    // Click 2nd star
    const star2 = screen.getByRole("button", { name: "2 star" });
    fireEvent.click(star2);

    // Should display private feedback screen
    await waitFor(() => {
      expect(screen.getByText("We're sorry it wasn't perfect")).toBeInTheDocument();
    });
    const textarea = screen.getByPlaceholderText("Tell us what happened (required)…");
    expect(textarea).toBeInTheDocument();
    
    const submitBtn = screen.getByRole("button", { name: /send feedback/i });
    expect(submitBtn).toBeInTheDocument();
    // Must be disabled initially when feedback is empty (compulsory feedback)
    expect(submitBtn).toBeDisabled();

    // Verify 'intercepted' event was NOT prematurely tracked upon clicking the star
    expect(global.fetch).not.toHaveBeenCalledWith(
      "/api/analytics",
      expect.objectContaining({
        body: JSON.stringify({
          slug: "d-hangout",
          type: "intercepted",
          metadata: { starRating: 2 },
        }),
      })
    );

    // Google review redirect must NOT be opened
    expect(window.open).not.toHaveBeenCalled();

    // Type feedback and verify submit button becomes enabled
    fireEvent.change(textarea, { target: { value: "The coffee was lukewarm and service was slow." } });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    // Verify feedback comment was tracked with starRating & feedback
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/analytics",
        expect.objectContaining({
          body: JSON.stringify({
            slug: "d-hangout",
            type: "intercepted",
            metadata: {
              starRating: 2,
              feedback: "The coffee was lukewarm and service was slow.",
            },
          }),
        })
      );
    });

    // Ensure only 1 intercepted event was sent (no duplicate empty event)
    const interceptedCalls = (global.fetch as any).mock.calls.filter((call: any[]) => {
      try {
        const body = JSON.parse(call[1]?.body);
        return body?.type === "intercepted";
      } catch {
        return false;
      }
    });
    expect(interceptedCalls).toHaveLength(1);
  });

  it("advances to tag selection when 4 or 5 stars are selected", async () => {
    render(<CustomerFunnel business={mockBusiness} />);

    // Click 5th star
    const star5 = screen.getByRole("button", { name: "5 star" });
    fireEvent.click(star5);

    await waitFor(() => {
      expect(screen.getByText("What stood out?")).toBeInTheDocument();
    });

    // Verify tag chips are visible
    expect(screen.getByText("Cozy Ambiance")).toBeInTheDocument();
    expect(screen.getByText("Great Coffee")).toBeInTheDocument();
  });

  it("allows selecting tags, generates review drafts, and handles draft selection", async () => {
    render(<CustomerFunnel business={mockBusiness} />);

    // Click 5 stars
    const star5 = screen.getByRole("button", { name: "5 star" });
    fireEvent.click(star5);

    // Click a tag chip
    const tagChip = await screen.findByText("Great Coffee");
    fireEvent.click(tagChip);

    // Click Generate button
    const generateBtn = screen.getByRole("button", { name: /generate my review/i });
    fireEvent.click(generateBtn);

    // Expect reviews screen to render drafts
    const draftReview = await screen.findByText(
      "Loved the cozy ambiance and great coffee at D-Hangout!"
    );
    expect(draftReview).toBeInTheDocument();

    // Click draft card
    const draftCard = draftReview.closest(".cursor-pointer") ?? draftReview;
    fireEvent.click(draftCard);

    // Verify clipboard copy called
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "Loved the cozy ambiance and great coffee at D-Hangout!"
    );

    // Await async state and analytics tracking
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/analytics",
        expect.objectContaining({
          body: expect.stringContaining('"type":"redirect"'),
        })
      );
    });
  });

  it("only provides English and Hinglish language options", async () => {
    render(<CustomerFunnel business={mockBusiness} />);

    // Advance to tags screen
    const star5 = screen.getByRole("button", { name: "5 star" });
    fireEvent.click(star5);

    await waitFor(() => {
      expect(screen.getByText("Review language")).toBeInTheDocument();
    });

    expect(SUPPORTED_LANGUAGES).toEqual([
      { label: "English", value: "English" },
      { label: "Hinglish", value: "Hinglish" },
    ]);
  });
});

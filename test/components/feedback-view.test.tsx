import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FeedbackView } from "@/components/dashboard/feedback-view";
import type { AnalyticsEvent } from "@prisma/client";

const mockFeedbackEvents: AnalyticsEvent[] = [
  {
    id: "evt-1",
    businessId: "biz-1",
    type: "intercepted",
    metadata: {
      starRating: 2,
      feedback: "The iced coffee was sour and waiter forgot my order.",
    },
    createdAt: new Date("2026-09-13T10:00:00Z"),
  },
  {
    id: "evt-2",
    businessId: "biz-1",
    type: "intercepted",
    metadata: {
      starRating: 1,
      feedback: "Very loud music, could not talk to anyone.",
    },
    createdAt: new Date("2026-09-13T09:00:00Z"),
  },
  {
    id: "evt-3",
    businessId: "biz-1",
    type: "intercepted",
    metadata: {
      starRating: 3,
    },
    createdAt: new Date("2026-09-13T08:00:00Z"),
  },
];

describe("FeedbackView Component Tests", () => {
  it("renders summary statistics correctly", () => {
    render(<FeedbackView events={mockFeedbackEvents} businessName="D-Hangout" />);

    expect(screen.getByText("Private Customer Feedback")).toBeInTheDocument();
    expect(screen.getByText("Total Bad Reviews Saved")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // total intercepted
    expect(screen.getByText("2")).toBeInTheDocument(); // with comments
    expect(screen.getByText("2.0★")).toBeInTheDocument(); // avg: (2+1+3)/3 = 2.0
  });

  it("renders feedback cards with customer comments and star ratings", () => {
    render(<FeedbackView events={mockFeedbackEvents} businessName="D-Hangout" />);

    expect(
      screen.getByText(/The iced coffee was sour and waiter forgot my order/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Very loud music, could not talk to anyone/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Customer selected 3 stars and exited without typing a written note/i)
    ).toBeInTheDocument();
  });

  it("filters items when clicking filter buttons", () => {
    render(<FeedbackView events={mockFeedbackEvents} businessName="D-Hangout" />);

    // Click "With Comments"
    const withCommentsBtn = screen.getByRole("button", { name: /with comments/i });
    fireEvent.click(withCommentsBtn);

    expect(
      screen.getByText(/The iced coffee was sour and waiter forgot my order/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Customer selected 3 stars and exited/i)
    ).not.toBeInTheDocument();

    // Click "1 Star"
    const oneStarBtn = screen.getByRole("button", { name: /1 star/i });
    fireEvent.click(oneStarBtn);

    expect(
      screen.getByText(/Very loud music, could not talk to anyone/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/The iced coffee was sour/i)
    ).not.toBeInTheDocument();
  });

  it("renders reassuring empty state when no intercepted feedback exists", () => {
    render(<FeedbackView events={[]} businessName="D-Hangout" />);

    expect(screen.getByText("No feedback found")).toBeInTheDocument();
    expect(
      screen.getByText(/Your business currently has 0 negative reviews/i)
    ).toBeInTheDocument();
  });
});

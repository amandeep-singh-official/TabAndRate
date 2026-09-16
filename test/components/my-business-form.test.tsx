import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyBusinessForm } from "@/components/dashboard/my-business-form";
import { toast } from "sonner";
import type { Business } from "@prisma/client";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockBusiness: Business = {
  id: "biz-test-1",
  userId: "user-1",
  name: "Brew & Co",
  slug: "brew-and-co",
  reviewUrl: "https://maps.app.goo.gl/abcdef",
  address: "456 Market St, San Francisco",
  phone: "+1 555-0199",
  website: "https://brewandco.example.com",
  category: "Café",
  customIndustry: null,
  monthlyCustomers: "500-1000",
  hearAboutUs: "Google",
  customDescription: "Specialty cold brew and organic pastries.",
  primaryColor: "#4F46E5",
  ctaText: "Rate your visit on Google",
  logoUrl: null,
  isActive: true,
  tags: ["Cold Brew", "Cozy Seating", "Friendly Baristas"],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("MyBusinessForm Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
  });

  it("renders business profile form fields populated with existing data", () => {
    render(<MyBusinessForm business={mockBusiness} />);

    expect(screen.getByLabelText("Business Name")).toHaveValue("Brew & Co");
    expect(screen.getByLabelText("Phone Number")).toHaveValue("+1 555-0199");
    expect(screen.getByLabelText("Google Review URL")).toHaveValue("https://maps.app.goo.gl/abcdef");
    expect(screen.getByLabelText("Address")).toHaveValue("456 Market St, San Francisco");
    expect(screen.getByLabelText("Website")).toHaveValue("https://brewandco.example.com");
    expect(screen.getByLabelText("Business Description for AI")).toHaveValue(
      "Specialty cold brew and organic pastries."
    );
    expect(screen.getByLabelText("Call-to-action text on QR posters")).toHaveValue(
      "Rate your visit on Google"
    );

    // Initial tags
    expect(screen.getByText("Cold Brew")).toBeInTheDocument();
    expect(screen.getByText("Cozy Seating")).toBeInTheDocument();
    expect(screen.getByText("Friendly Baristas")).toBeInTheDocument();
  });

  it("adds a new tag via input and Add button", async () => {
    const user = userEvent.setup();
    render(<MyBusinessForm business={mockBusiness} />);

    const tagInput = screen.getByPlaceholderText("Add custom tag…");
    const addButton = screen.getByRole("button", { name: /add/i });

    await user.type(tagInput, "Artisan Croissants");
    await user.click(addButton);

    expect(screen.getByText("Artisan Croissants")).toBeInTheDocument();
    expect(tagInput).toHaveValue("");
  });

  it("prevents adding duplicate or empty tags", async () => {
    const user = userEvent.setup();
    render(<MyBusinessForm business={mockBusiness} />);

    const tagInput = screen.getByPlaceholderText("Add custom tag…");
    const addButton = screen.getByRole("button", { name: /add/i });

    // Try adding empty
    expect(addButton).toBeDisabled();

    // Try adding duplicate
    await user.type(tagInput, "Cold Brew");
    await user.click(addButton);

    // Count badges with Cold Brew - should still be only 1
    const matchingBadges = screen.getAllByText("Cold Brew");
    expect(matchingBadges.length).toBe(1);
  });

  it("removes an existing tag when clicking its remove icon", async () => {
    const user = userEvent.setup();
    render(<MyBusinessForm business={mockBusiness} />);

    expect(screen.getByText("Cozy Seating")).toBeInTheDocument();

    // Find the remove button inside the Cozy Seating badge span
    const badge = screen.getByText("Cozy Seating").closest("span")!;
    const removeBtn = badge.querySelector("button")!;
    await user.click(removeBtn);

    expect(screen.queryByText("Cozy Seating")).not.toBeInTheDocument();
  });

  it("caps tag list at 12 items and disables Add button", () => {
    const twelveTagsBiz: Business = {
      ...mockBusiness,
      tags: Array.from({ length: 12 }, (_, i) => `Tag ${i + 1}`),
    };

    render(<MyBusinessForm business={twelveTagsBiz} />);

    const addButton = screen.getByRole("button", { name: /add/i });
    expect(addButton).toBeDisabled();
  });

  it("submits PATCH /api/business with updated fields and shows success toast", async () => {
    const user = userEvent.setup();
    render(<MyBusinessForm business={mockBusiness} />);

    const descInput = screen.getByLabelText("Business Description for AI");
    await user.clear(descInput);
    await user.type(descInput, "Updated bakery & cafe description.");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/business",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("Updated bakery & cafe description."),
        })
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Business profile saved!");
    });
  });

  it("validates required fields before submitting and shows error toast", async () => {
    const user = userEvent.setup();
    render(<MyBusinessForm business={mockBusiness} />);

    const nameInput = screen.getByLabelText("Business Name");
    await user.clear(nameInput);

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    expect(toast.error).toHaveBeenCalledWith("Business name is required.");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

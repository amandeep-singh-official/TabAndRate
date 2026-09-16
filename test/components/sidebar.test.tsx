import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { signOut } from "next-auth/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

describe("Sidebar Component & HTML Hierarchy Tests", () => {
  it("renders without any nested <button> elements (prevents hydration error)", () => {
    const { container } = render(
      <Sidebar userName="Amandeep Singh" userImage={null} />
    );

    // Strict HTML validity checks:
    // 1. <button> cannot be a descendant of <button>
    const nestedButtons = container.querySelectorAll("button button");
    expect(nestedButtons.length).toBe(0);

    // 2. <a> cannot be a descendant of <button>
    const linksInsideButtons = container.querySelectorAll("button a");
    expect(linksInsideButtons.length).toBe(0);

    // 3. <button> cannot be a descendant of <a>
    const buttonsInsideLinks = container.querySelectorAll("a button");
    expect(buttonsInsideLinks.length).toBe(0);
  });

  it("renders all navigation items as valid accessible links", () => {
    render(<Sidebar userName="Amandeep Singh" userImage={null} />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard"
    );
    expect(screen.getByRole("link", { name: /private feedback/i })).toHaveAttribute(
      "href",
      "/dashboard/feedback"
    );
    expect(screen.getByRole("link", { name: /analytics/i })).toHaveAttribute(
      "href",
      "/dashboard/analytics"
    );
    expect(screen.getByRole("link", { name: /my business/i })).toHaveAttribute(
      "href",
      "/dashboard/my-business"
    );
    expect(screen.getByRole("link", { name: /qr code/i })).toHaveAttribute(
      "href",
      "/dashboard/qr-code"
    );
  });

  it("renders sign out button and triggers signOut on click", () => {
    render(<Sidebar userName="Amandeep Singh" userImage={null} />);

    const signOutBtn = screen.getByRole("button", { name: /sign out/i });
    expect(signOutBtn).toBeInTheDocument();

    fireEvent.click(signOutBtn);
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });
});

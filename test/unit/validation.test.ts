import { describe, it, expect } from "vitest";
import { isValidGoogleReviewUrl } from "@/lib/utils";

describe("Google Review URL Validation Tests", () => {
  it("accepts maps.app.goo.gl short links", () => {
    expect(isValidGoogleReviewUrl("https://maps.app.goo.gl/bWz9yJeUPqzy1boZ7")).toBe(true);
    expect(isValidGoogleReviewUrl("https://maps.app.goo.gl/ABC123xyz")).toBe(true);
  });

  it("accepts g.page review links", () => {
    expect(isValidGoogleReviewUrl("https://g.page/r/Cb_example123/review")).toBe(true);
    expect(isValidGoogleReviewUrl("https://g.page/my-cool-restaurant")).toBe(true);
  });

  it("accepts standard Google Maps desktop URLs", () => {
    expect(
      isValidGoogleReviewUrl(
        "https://www.google.com/maps/place/D-Hangout/@30.7099,76.7766,17z/data=!3m1!4b1"
      )
    ).toBe(true);
    expect(isValidGoogleReviewUrl("https://maps.google.com/?cid=1029384756")).toBe(true);
  });

  it("accepts regional Google domains (e.g. google.co.in, google.co.uk)", () => {
    expect(isValidGoogleReviewUrl("https://www.google.co.in/maps/search/restaurants")).toBe(true);
    expect(isValidGoogleReviewUrl("https://www.google.co.uk/maps/place/Bakery")).toBe(true);
  });

  it("accepts search.google.com review dialog URLs", () => {
    expect(
      isValidGoogleReviewUrl("https://search.google.com/local/writereview?placeid=ChIJ123456789")
    ).toBe(true);
  });

  it("rejects non-Google URLs", () => {
    expect(isValidGoogleReviewUrl("https://facebook.com/reviews/123")).toBe(false);
    expect(isValidGoogleReviewUrl("https://yelp.com/biz/some-restaurant")).toBe(false);
    expect(isValidGoogleReviewUrl("https://instagram.com/mybusiness")).toBe(false);
    expect(isValidGoogleReviewUrl("https://mywebsite.com")).toBe(false);
  });

  it("rejects invalid, malformed, or empty strings", () => {
    expect(isValidGoogleReviewUrl("")).toBe(false);
    expect(isValidGoogleReviewUrl("   ")).toBe(false);
    expect(isValidGoogleReviewUrl("not-a-url")).toBe(false);
    expect(isValidGoogleReviewUrl("http://")).toBe(false);
  });
});

export const BUSINESS_CATEGORIES = [
  "Restaurant",
  "Café",
  "Salon & Spa",
  "Clinic & Healthcare",
  "Gym & Fitness",
  "Retail Store",
  "Hotel & Stay",
  "Education",
  "Auto Service",
  "Other",
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

/** Pre-seeded tags per category shown to customers as tappable chips */
export const CATEGORY_TAGS: Record<string, string[]> = {
  "Restaurant": [
    "Delicious Food",
    "Great Ambiance",
    "Friendly Staff",
    "Fast Service",
    "Good Portions",
    "Clean & Hygienic",
    "Great Value",
    "Would Come Again",
  ],
  "Café": [
    "Great Coffee",
    "Cozy Atmosphere",
    "Friendly Baristas",
    "Tasty Snacks",
    "Good Wi-Fi",
    "Clean Space",
    "Quick Service",
    "Relaxing Vibe",
  ],
  "Salon & Spa": [
    "Excellent Service",
    "Skilled Stylists",
    "Clean & Neat",
    "On Time",
    "Relaxing Experience",
    "Great Results",
    "Friendly Staff",
    "Good Pricing",
  ],
  "Clinic & Healthcare": [
    "Professional Doctor",
    "Caring Staff",
    "Quick Appointment",
    "Clean Facility",
    "Clear Explanation",
    "Minimal Wait Time",
    "Affordable",
    "Highly Recommended",
  ],
  "Gym & Fitness": [
    "Great Equipment",
    "Clean Facility",
    "Helpful Trainers",
    "Good Classes",
    "Motivating Atmosphere",
    "Affordable",
    "Spacious",
    "Friendly Community",
  ],
  "Retail Store": [
    "Wide Selection",
    "Great Prices",
    "Helpful Staff",
    "Easy to Find",
    "Quality Products",
    "Fast Checkout",
    "Clean Store",
    "Good Return Policy",
  ],
  "Hotel & Stay": [
    "Comfortable Rooms",
    "Friendly Service",
    "Great Location",
    "Clean & Tidy",
    "Good Breakfast",
    "Quick Check-in",
    "Excellent Value",
    "Would Return",
  ],
  "Education": [
    "Excellent Teachers",
    "Great Curriculum",
    "Supportive Staff",
    "Good Infrastructure",
    "Engaging Classes",
    "Safe Environment",
    "Affordable Fees",
    "Highly Recommend",
  ],
  "Auto Service": [
    "Fast Service",
    "Honest Pricing",
    "Expert Mechanics",
    "Clean Workshop",
    "On Time Delivery",
    "Transparent",
    "Friendly Staff",
    "Great Results",
  ],
  "Other": [
    "Excellent Service",
    "Friendly Staff",
    "Quick Response",
    "Highly Professional",
    "Great Value",
    "Clean Space",
    "Highly Recommended",
    "Amazing Experience",
  ],
};

export const HOW_HEARD_OPTIONS = [
  "Google Search",
  "Instagram / Social Media",
  "Friend or Colleague",
  "WhatsApp",
  "Advertisement",
  "Other",
] as const;

export const MONTHLY_CUSTOMER_OPTIONS = [
  "1 – 50 customers",
  "51 – 200 customers",
  "201 – 500 customers",
  "500+ customers",
] as const;

export const SUPPORTED_LANGUAGES = [
  { label: "English", value: "English" },
  { label: "Hinglish", value: "Hinglish" },
] as const;

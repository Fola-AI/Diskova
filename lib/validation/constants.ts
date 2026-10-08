/**
 * Option lists shared by forms and their zod schemas. Kept free of zod imports so Client Components
 * can use them without shipping zod (~28 KB) to every page (L14 performance).
 */
export const VIBES = [
  { level: 1, label: "Flat" },
  { level: 2, label: "Easy" },
  { level: 3, label: "Good" },
  { level: 4, label: "Lit" },
  { level: 5, label: "Electric" },
] as const;

export const REPORT_REASON_VALUES = ["fake", "spam", "abuse", "dangerous", "wrong_venue", "rival_sabotage", "copyright", "other"] as const;
export type ReportReason = (typeof REPORT_REASON_VALUES)[number];

export const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: "fake", label: "Fake or misleading" },
  { value: "wrong_venue", label: "Not from this venue" },
  { value: "spam", label: "Spam or advertising" },
  { value: "abuse", label: "Abusive or hateful" },
  { value: "dangerous", label: "Dangerous or illegal" },
  { value: "rival_sabotage", label: "Rival trying to harm the venue" },
  { value: "copyright", label: "My photo used without permission" },
  { value: "other", label: "Something else" },
];

export const EVENT_CATEGORIES = [
  { value: "concert", label: "Concert" },
  { value: "festival", label: "Festival" },
  { value: "party", label: "Party" },
  { value: "beach_party", label: "Beach party" },
  { value: "boat_cruise", label: "Boat cruise" },
  { value: "comedy", label: "Comedy" },
  { value: "art", label: "Art" },
  { value: "food", label: "Food" },
  { value: "sport", label: "Sport" },
  { value: "conference", label: "Conference" },
  { value: "community", label: "Community" },
  { value: "other", label: "Other" },
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number]["value"];

export const GUIDE_TYPES = [
  { value: "city_guide", label: "City guide" },
  { value: "area_guide", label: "Area guide" },
  { value: "daytime", label: "Daytime" },
  { value: "toolkit", label: "Diaspora toolkit" },
  { value: "blog", label: "Blog" },
  { value: "safety_page", label: "Safety page" },
] as const;
export type GuideTypeValue = (typeof GUIDE_TYPES)[number]["value"];
export const CITY_SCOPED: GuideTypeValue[] = ["city_guide", "area_guide", "daytime", "safety_page"];

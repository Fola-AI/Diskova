/** §10 confirmation copy — verbatim. Never promise that anyone will act on a report. */
export const ISSUE_REPORT_CONFIRMATION =
  "Thank you. Our team reviews every report. This is not an emergency service — if you are in danger call 112.";

export const ISSUE_CATEGORIES = [
  { value: "safety", label: "Safety concern" },
  { value: "scam", label: "Scam or fraud" },
  { value: "harassment", label: "Harassment" },
  { value: "infrastructure", label: "Infrastructure (lighting, roads, transport)" },
  { value: "vendor_conduct", label: "A venue's conduct" },
  { value: "other", label: "Something else" },
] as const;

export const SAFETY_SECTIONS = [
  { value: "emergency_numbers", label: "Emergency numbers" },
  { value: "hospitals", label: "Hospitals with 24-hour A&E" },
  { value: "police_stations", label: "Police stations" },
  { value: "embassies", label: "Embassies and high commissions" },
  { value: "travel_advice", label: "Travel advice" },
  { value: "area_notes", label: "Area notes" },
  { value: "scam_awareness", label: "Scam awareness" },
] as const;

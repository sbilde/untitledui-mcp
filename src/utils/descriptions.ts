// Generated descriptions based on component name and type
// Since UntitledUI API doesn't provide descriptions, we generate them

const TYPE_DESCRIPTIONS: Record<string, string> = {
  application: "Application UI component for dashboards and web apps",
  base: "Core UI primitive component",
  foundations: "Foundational element (icon, logo, visual)",
  marketing: "Marketing section component for landing pages",
  "shared-assets": "Shared visual asset (illustration, pattern, mockup)",
  icons: "Icon component",
};

const NAME_PATTERNS: [RegExp, string][] = [
  [/modal/i, "Modal dialog component"],
  [/button/i, "Interactive button component"],
  [/input/i, "Form input component"],
  [/select/i, "Selection/dropdown component"],
  [/table/i, "Data table component"],
  [/calendar/i, "Calendar/date component"],
  [/date-picker/i, "Date selection component"],
  [/sidebar/i, "Sidebar navigation component"],
  [/header/i, "Header/navigation component"],
  [/footer/i, "Footer section component"],
  [/card/i, "Card container component"],
  [/avatar/i, "User avatar component"],
  [/badge/i, "Badge/label component"],
  [/alert/i, "Alert/notification component"],
  [/toast/i, "Toast notification component"],
  [/dropdown/i, "Dropdown menu component"],
  [/tabs/i, "Tabbed interface component"],
  [/pagination/i, "Pagination component"],
  [/carousel/i, "Carousel/slider component"],
  [/chart/i, "Chart/visualization component"],
  [/metric/i, "Metrics/statistics component"],
  [/form/i, "Form component"],
  [/pricing/i, "Pricing section component"],
  [/testimonial/i, "Testimonial section component"],
  [/feature/i, "Features section component"],
  [/cta/i, "Call-to-action section component"],
  [/hero/i, "Hero section component"],
  [/faq/i, "FAQ section component"],
  [/blog/i, "Blog section component"],
  [/team/i, "Team section component"],
  [/contact/i, "Contact section component"],
  [/login/i, "Login/authentication component"],
  [/signup/i, "Signup/registration component"],
];

export function generateDescription(name: string, type: string): string {
  // Check name patterns first
  for (const [pattern, description] of NAME_PATTERNS) {
    if (pattern.test(name)) {
      return description;
    }
  }

  // Fall back to type description
  const typeDesc = TYPE_DESCRIPTIONS[type];
  if (typeDesc) {
    return `${typeDesc}: ${name.replace(/-/g, " ")}`;
  }

  // Generic fallback
  return `UI component: ${name.replace(/-/g, " ")}`;
}

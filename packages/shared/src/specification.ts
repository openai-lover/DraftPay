import { structuredSpecificationSchema, type StructuredSpecification } from "./schemas";

export interface SpecificationInput {
  title: string;
  brief: string;
  requiredHeadline: string;
}

const BASE_REQUIREMENTS = [
  { id: "hero", label: "Hero section", kind: "section", required: true },
  { id: "pricing", label: "Pricing section", kind: "section", required: true },
  { id: "cta", label: "Primary call-to-action", kind: "interaction", required: true },
  { id: "contact", label: "Contact form", kind: "interaction", required: true },
  { id: "mobile", label: "No horizontal overflow at 390px", kind: "responsive", required: true },
  {
    id: "accessibility",
    label: "Semantic controls, labeled form input, and keyboard-operable actions",
    kind: "accessibility",
    required: true,
  },
  { id: "scripts", label: "No external scripts", kind: "safety", required: true },
] as const;

export function createStructuredSpecification(input: SpecificationInput): StructuredSpecification {
  return structuredSpecificationSchema.parse({
    category: "responsive-landing-page",
    title: input.title,
    brief: input.brief,
    requiredHeadline: input.requiredHeadline,
    requirements: BASE_REQUIREMENTS,
    responsiveBreakpoints: [390, 680, 1120],
    accessibilityExpectations: [
      "Document declares its language",
      "Email input has an accessible label",
      "Primary actions use native links or buttons",
    ],
    scoringRubric: [
      { id: "requirements", label: "Objective requirements", weightBps: 5_000 },
      { id: "clarity", label: "Visual hierarchy and clarity", weightBps: 3_000 },
      { id: "craft", label: "Responsive product craft", weightBps: 2_000 },
    ],
    approved: false,
  });
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJson(child)]),
    );
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  throw new Error("Metadata contains a non-JSON value");
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

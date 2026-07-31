import type { VerificationCheck } from "@draftpay/shared";

export interface VerificationInput {
  html: string;
  requiredHeadline: string;
  contentHash: string;
  knownContentHashes: string[];
  previewLoaded: boolean;
}

export interface VerificationResult {
  qualified: boolean;
  score: number;
  checks: VerificationCheck[];
}

function contains(html: string, pattern: RegExp): boolean {
  return pattern.test(html);
}

function staticMobileCheck(html: string): { passed: boolean; detail: string } {
  const hasViewport = contains(
    html,
    /<meta\b[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i,
  );
  const hasResponsiveBreakpoint = contains(html, /@media\s*\([^)]*max-width\s*:/i);
  const oversizedMinimum = html.match(/\bmin-width\s*:\s*(\d+)px/i);
  const hasOversizedMinimum = oversizedMinimum !== null && Number(oversizedMinimum[1]) > 390;

  if (!hasViewport)
    return { passed: false, detail: "Missing width=device-width viewport metadata" };
  if (!hasResponsiveBreakpoint)
    return { passed: false, detail: "Missing a max-width responsive breakpoint" };
  if (hasOversizedMinimum)
    return {
      passed: false,
      detail: `Static CSS guard found min-width: ${oversizedMinimum[1]}px`,
    };

  return {
    passed: true,
    detail:
      "Static CSS guard passed: mobile viewport, responsive breakpoint, and no >390px minimum width",
  };
}

export function verifyLandingPage(input: VerificationInput): VerificationResult {
  const normalized = input.html.toLowerCase();
  const mobile = staticMobileCheck(input.html);
  const checks: VerificationCheck[] = [
    {
      id: "loads",
      label: "Preview loads",
      passed: input.previewLoaded && input.html.trim().length >= 200,
      detail: input.previewLoaded ? "Static artifact loaded" : "Preview did not load",
      hardFailure: true,
    },
    {
      id: "headline",
      label: "Required headline",
      passed: normalized.includes(input.requiredHeadline.toLowerCase()),
      detail: input.requiredHeadline,
      hardFailure: true,
    },
    {
      id: "sections",
      label: "Required sections",
      passed: ["hero", "pricing", "contact"].every((section) =>
        normalized.includes(`data-section="${section}"`),
      ),
      detail: "Hero, pricing, and contact markers",
      hardFailure: true,
    },
    {
      id: "cta",
      label: "CTA exists",
      passed: contains(input.html, /<(a|button)\b[^>]*data-cta/i),
      detail: "Primary action uses the data-cta marker",
      hardFailure: true,
    },
    {
      id: "form",
      label: "Contact form exists",
      passed:
        contains(input.html, /<form\b/i) && contains(input.html, /input\b[^>]*type=["']email["']/i),
      detail: "Form and email input present",
      hardFailure: true,
    },
    {
      id: "accessibility",
      label: "Accessibility baseline",
      passed:
        contains(input.html, /<html\b[^>]*\blang=["'][^"']+["']/i) &&
        contains(input.html, /<input\b[^>]*(aria-label|id)=["'][^"']+["']/i) &&
        contains(input.html, /<(a|button)\b/i),
      detail: "Document language, labeled form control, and native action scan",
      hardFailure: true,
    },
    {
      id: "mobile",
      label: "Static mobile safety",
      passed: mobile.passed,
      detail: mobile.detail,
      hardFailure: true,
    },
    {
      id: "scripts",
      label: "No prohibited scripts",
      passed: !contains(input.html, /<script\b|javascript:|\son\w+\s*=/i),
      detail: "Script, javascript URL, and inline-handler scan",
      hardFailure: true,
    },
    {
      id: "duplicate",
      label: "Unique content hash",
      passed: !input.knownContentHashes
        .map((hash) => hash.toLowerCase())
        .includes(input.contentHash.toLowerCase()),
      detail: input.contentHash,
      hardFailure: true,
    },
  ];
  const passed = checks.filter((check) => check.passed).length;
  return {
    qualified: checks.every((check) => check.passed || !check.hardFailure),
    score: Math.round((passed / checks.length) * 100),
    checks,
  };
}

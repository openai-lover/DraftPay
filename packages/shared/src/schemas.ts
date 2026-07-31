import { z } from "zod";

export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address");
export const hashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid 32-byte hash");

export const contestCategorySchema = z.literal("responsive-landing-page");

export const contestRequirementSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(160),
  kind: z.enum(["section", "text", "interaction", "responsive", "accessibility", "safety"]),
  required: z.boolean().default(true),
});

export const scoringCriterionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(160),
  weightBps: z.number().int().min(0).max(10_000),
});

export const structuredSpecificationSchema = z
  .object({
    category: contestCategorySchema,
    title: z.string().min(4).max(100),
    brief: z.string().min(20).max(4_000),
    requiredHeadline: z.string().min(1).max(180),
    requirements: z.array(contestRequirementSchema).min(4).max(16),
    responsiveBreakpoints: z.array(z.number().int().min(320).max(2_560)).min(1).max(5),
    accessibilityExpectations: z.array(z.string().min(1).max(180)).min(1).max(8),
    scoringRubric: z.array(scoringCriterionSchema).min(1).max(8),
    approved: z.boolean(),
  })
  .superRefine((value, context) => {
    if (
      value.scoringRubric.reduce((total, criterion) => total + criterion.weightBps, 0) !== 10_000
    ) {
      context.addIssue({
        code: "custom",
        path: ["scoringRubric"],
        message: "Scoring weights must total 10000 basis points",
      });
    }
  });

export const approvedContestMetadataSchema = z
  .object({
    specification: structuredSpecificationSchema.safeExtend({ approved: z.literal(true) }),
    prizeAtomic: z.string().regex(/^\d+$/),
    submissionDeadlineEpochSeconds: z.number().int().positive(),
    selectionDeadlineEpochSeconds: z.number().int().positive(),
  })
  .superRefine((value, context) => {
    if (value.selectionDeadlineEpochSeconds <= value.submissionDeadlineEpochSeconds) {
      context.addIssue({
        code: "custom",
        path: ["selectionDeadlineEpochSeconds"],
        message: "Selection deadline must follow the submission deadline",
      });
    }
  });

export const createContestSchema = z
  .object({
    title: z.string().min(4).max(100),
    brief: z.string().min(20).max(4_000),
    requiredHeadline: z.string().min(1).max(180),
    requiredSections: z.array(z.string().min(1).max(60)).min(2).max(8),
    prizeUsdc: z.string().regex(/^\d+(?:\.\d{1,6})?$/),
    submissionDeadline: z.coerce.date(),
    selectionDeadline: z.coerce.date(),
    evaluator: addressSchema,
  })
  .superRefine((value, context) => {
    if (value.selectionDeadline <= value.submissionDeadline) {
      context.addIssue({
        code: "custom",
        path: ["selectionDeadline"],
        message: "Selection deadline must follow the submission deadline",
      });
    }
  });

export const briefAnalysisRequestSchema = z.object({
  brief: z.string().min(20).max(4_000),
  requirements: z.array(z.string().min(1).max(160)).min(1).max(16),
});

export const briefAnalysisResponseSchema = z.object({
  complexity: z.enum(["low", "medium", "high"]),
  missingRequirements: z.array(z.string()),
  estimatedBuildCostAtomic: z.string().regex(/^\d+$/),
  estimatedBuildMinutes: z.number().int().positive(),
  riskScore: z.number().int().min(0).max(100),
});

export const transactionEvidenceSchema = z.object({
  chainId: z.literal(5_042_002),
  hash: hashSchema,
  blockNumber: z.string().regex(/^\d+$/),
  status: z.literal("success"),
});

export type ContestRequirement = z.infer<typeof contestRequirementSchema>;
export type StructuredSpecification = z.infer<typeof structuredSpecificationSchema>;
export type ApprovedContestMetadata = z.infer<typeof approvedContestMetadataSchema>;
export type CreateContestInput = z.infer<typeof createContestSchema>;
export type BriefAnalysisRequest = z.infer<typeof briefAnalysisRequestSchema>;
export type BriefAnalysisResponse = z.infer<typeof briefAnalysisResponseSchema>;
export type TransactionEvidence = z.infer<typeof transactionEvidenceSchema>;

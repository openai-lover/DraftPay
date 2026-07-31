import { z } from "zod";

const environmentSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65_535).default(3402),
    X402_MODE: z.enum(["fixture", "real"]).default("fixture"),
    X402_SELLER_ADDRESS: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .optional(),
    X402_FACILITATOR_URL: z.url().default("https://gateway-api-testnet.circle.com"),
  })
  .superRefine((value, context) => {
    if (value.X402_MODE === "real" && !value.X402_SELLER_ADDRESS) {
      context.addIssue({
        code: "custom",
        path: ["X402_SELLER_ADDRESS"],
        message: "X402_SELLER_ADDRESS is required in real mode",
      });
    }
  });

export function readServiceConfig(environment = process.env) {
  const parsed = environmentSchema.parse(environment);
  return {
    port: parsed.PORT,
    app: {
      mode: parsed.X402_MODE,
      ...(parsed.X402_SELLER_ADDRESS ? { sellerAddress: parsed.X402_SELLER_ADDRESS } : {}),
      facilitatorUrl: parsed.X402_FACILITATOR_URL,
      price: "$0.01",
    },
  } as const;
}

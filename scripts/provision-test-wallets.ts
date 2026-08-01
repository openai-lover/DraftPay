import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const environmentPath = new URL("../.env.local", import.meta.url);
const examplePath = new URL("../.env.example", import.meta.url);
const privateKeyPattern = /^0x[a-fA-F0-9]{64}$/;

function parseEnvironment(contents: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values.set(match[1]!, match[2]!);
  }
  return values;
}

function setEnvironmentValue(contents: string, name: string, value: string): string {
  const pattern = new RegExp(`^${name}=.*$`, "m");
  if (pattern.test(contents)) return contents.replace(pattern, `${name}=${value}`);
  return `${contents.trimEnd()}\n${name}=${value}\n`;
}

let contents = existsSync(environmentPath)
  ? readFileSync(environmentPath, "utf8")
  : readFileSync(examplePath, "utf8");
const values = parseEnvironment(contents);

const roles = [
  ["deployer", "DRAFTPAY_DEPLOYER_PRIVATE_KEY"],
  ["builder", "AGENT_PRIVATE_KEY"],
  ["evaluator", "EVALUATOR_PRIVATE_KEY"],
] as const;

const addresses: Record<string, string> = {};
for (const [role, variable] of roles) {
  let privateKey = values.get(variable);
  if (privateKey && !privateKeyPattern.test(privateKey)) {
    throw new Error(`${variable} exists but is not a valid private key`);
  }
  privateKey ||= generatePrivateKey();
  contents = setEnvironmentValue(contents, variable, privateKey);
  values.set(variable, privateKey);
  addresses[role] = privateKeyToAccount(privateKey as `0x${string}`).address;
}

contents = setEnvironmentValue(
  contents,
  "NEXT_PUBLIC_DEMO_EVALUATOR_ADDRESS",
  addresses.evaluator!,
);
contents = setEnvironmentValue(contents, "X402_SELLER_ADDRESS", addresses.evaluator!);
if (!values.get("AGENT_RUN_TOKEN")) {
  contents = setEnvironmentValue(contents, "AGENT_RUN_TOKEN", randomBytes(32).toString("hex"));
}

writeFileSync(environmentPath, contents, { encoding: "utf8", mode: 0o600 });

console.log(JSON.stringify({ network: "Arc Testnet", envFile: ".env.local", addresses }, null, 2));

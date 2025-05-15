import { z } from "zod";
import { BANK_LIST } from "../lib/bankList";
import { BANK_NAMES } from "../lib/bankList";

export const bulkBankCodeSchema = z.object({
  detectedBanks: z
    .array(z.string())
    .describe(`List of bank names detected from user conversation`),

  detectedBanksValidated: z
    .array(z.enum(BANK_NAMES))
    .describe(
      `Match detected bank name to one of the valid bank names of in the enum provided`
    ),
});

export async function getMultipleBankCodes({
  detectedBanks,
  detectedBanksValidated,
}: z.infer<typeof bulkBankCodeSchema>) {
  console.log("Attemping to resolve bank codes for:", detectedBanks);

  // Match all bank codes
  const results = await Promise.allSettled(
    detectedBanksValidated.map(async (bankName) => {
      if (!bankName || bankName.trim() === "")
        return {
          detectedBank: bankName,
          status: "error" as const,
          error: "No bank name provided",
        };

      const bankCode = BANK_LIST[bankName];

      if (!bankCode) {
        console.log(`Bank code not found for bank name ${bankName}`);
        return {
          detectedBank: bankName,
          status: "error" as const,
          error: `Could not find a bank code for '${bankName}'`,
        };
      }

      console.log(`Resolved Bank Code for ${bankName}: ${bankCode}`);
      return {
        detectedBank: bankName,
        status: "success" as const,
        bankCode: bankCode,
      };
    })
  );

  const processedResults = results.map((result, index) => {
    const inputBank = detectedBanks[index];
    if (result.status === "fulfilled")
      return result.value; // Contains { detectedBank, status, bankCode?, error? }
    else
      return {
        detectedBank: inputBank,
        status: "error" as const,
        error: "Failed to process bank name resolution request",
      };
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(processedResults),
      },
    ],
  };
}

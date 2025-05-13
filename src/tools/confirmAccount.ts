import { z } from "zod";
import { BrassService } from "../services/brass";

export const singleConfirmAcctSchema = z.object({
  bankCode: z.string().describe("The numerical code identifying the bank."),
  accountNumber: z.string().describe("The 10-digit account number."),
});

export const bulkConfirmAcctSchema = z.object({
  accountsToConfirm: z
    .array(singleConfirmAcctSchema)
    .describe("List of accounts (bank code and number) to verify."),
});

const brassService = new BrassService();
const brassToken = process.env.BRASS_PA_TOKEN;

export const confirmMultipleAccounts = async ({
  accountsToConfirm,
}: z.infer<typeof bulkConfirmAcctSchema>) => {
  console.log("Attempting to confirm accounts:", accountsToConfirm);

  const results = await Promise.allSettled(
    accountsToConfirm.map((account) =>
      brassService.confirmAccount(
        account.bankCode,
        account.accountNumber,
        brassToken
      )
    )
  );

  const processedResults = results.map((result, index) => {
    const inputAccount = accountsToConfirm[index];
    if (result.status === "fulfilled") {
      const apiResult = result.value;
      if (apiResult.success) {
        console.log(
          `Confirmation Success for ${inputAccount?.accountNumber}:`,
          apiResult.data
        );
        return {
          input: inputAccount,
          status: "success" as const, // Explicitly type as literal
          data: apiResult.data, // { account_name: string, bank_id: string, account_number: string }
        };
      } else {
        console.log(
          `Confirmation Failed for ${inputAccount?.accountNumber}:`,
          apiResult.error
        );
        return {
          input: inputAccount,
          status: "error" as const,
          error: apiResult.error, // { code: string, message: string }
        };
      }
    } else {
      // Promise rejected (network error, timeout, etc.)
      console.error(
        `Confirmation System Error for ${inputAccount?.accountNumber}:`,
        result.reason
      );
      return {
        input: inputAccount,
        status: "error" as const,
        error: {
          code: "TOOL_EXECUTION_ERROR",
          message:
            "Failed to communicate with the account confirmation service.",
        },
      };
    }
  });

  return {
    content: [
      { type: "text" as const, text: JSON.stringify(processedResults) },
    ],
  };
};

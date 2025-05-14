import { BrassService } from "../services/brass";
import { z } from "zod";

const brassToken = process.env.BRASS_PA_TOKEN;
const brassService = new BrassService();

export const getAccountSchema = z.object({
  accountId: z.string().describe("The ID of the account details to retrieve."),
});

export const listAccountSchema = z.object({
  limit: z
    .number()
    .optional()
    .default(10)
    .describe("The maximum first number of accounts to return."),
});

export function extractCoreAccountDetails(data: any) {
  if (!data) {
    return null;
  }
  return {
    accountId: data.id,
    accountName: data.name,
    accountNumber: data.number,
    ledgerBalance: data.ledger_balance ? data.ledger_balance.formatted : null,
    availableBalance: data.available_balance
      ? data.available_balance.formatted
      : null,
    pendingPayment: data.pending_outflows
      ? data.pending_outflows.formatted
      : null,
    bankName: data.bank && data.bank.data ? data.bank.data.name : null,
    bankCode: data.bank && data.bank.data ? data.bank.data.code : null,
  };
}

export function toolResponse(payload: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: payload,
      },
    ],
  };
}

export async function listAllAccounts({
  limit,
}: z.infer<typeof listAccountSchema>) {
  const response = (await brassService.listAccounts(brassToken)) as any;

  if (response.success) {
    const accountList = response?.data?.map(extractCoreAccountDetails);
    return toolResponse(JSON.stringify(accountList));
  } else {
    return toolResponse(`${response.message}`);
  }
}

export async function getAccountDetails({
  accountId,
}: z.infer<typeof getAccountSchema>) {
  const response = await brassService.getAccount(accountId, brassToken);

  if (response.success) {
    const accountDetails = extractCoreAccountDetails(response.data);
    return toolResponse(JSON.stringify(accountDetails));
  } else {
    return toolResponse(`${response.message}`);
  }
}

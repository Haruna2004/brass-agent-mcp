import { z } from "zod";
import { randomUUID } from "crypto";
import { BrassService } from "../services/brass";

export const BrassPayableSchema = z.object({
  customer_reference: z.string(),
  amount: z.number(),
  title: z.string(),
  source_account: z.string(),
  to: z.object({
    account_number: z.string(),
    bank: z.string(),
    name: z.string(),
  }),
});

export type BrassPayable = z.infer<typeof BrassPayableSchema>;

const singlePaySchema = z.object({
  title: z
    .string()
    .describe("A brief memo/description for the payment transaction."),
  amount: z
    .number()
    .positive()
    .describe("The payment amount in the base currency unit."),
  name: z.string().describe("The verified recipient name."),
  accountNumber: z
    .string()
    .length(10)
    .regex(/^\d{10}$/)
    .describe("The 10-digit verified account number."),
  bankId: z
    .string()
    .describe("The unique bank identifier (usually same as bank code)."),
  // Add an optional identifier if needed to map results back to original input
  _inputIndex: z
    .number()
    .optional()
    .describe("Internal index to track original request"),
});

export const bulkPaySchema = z.object({
  paymentsToProcess: z
    .array(singlePaySchema)
    .describe("List of payments to execute after user approval."),
});

const brassAccountId = process.env.BRASS_ACCOUNT_ID;
const brassToken = process.env.BRASS_PA_TOKEN;
const brassService = new BrassService();

export async function processMultiplePayments({
  paymentsToProcess,
}: z.infer<typeof bulkPaySchema>) {
  console.log("Attemping to process payments for:", paymentsToProcess);

  const sourceAccount = brassAccountId ?? "";
  if (!sourceAccount) {
    console.error("BRASS_ACCOUNT_ID is not set, cannot process payment");
    return {
      content: [
        {
          type: "text" as const,
          text: "BRASS_ACCOUNT_ID is not set, cannot process payment",
        },
      ],
    };
  }

  const results = await Promise.allSettled(
    paymentsToProcess.map(async (payment) => {
      const payable: BrassPayable = {
        customer_reference: randomUUID(),
        amount: payment.amount * 100, // Convert to Kobo/Cents
        title: `Conceirge-${payment.title}`,
        source_account: sourceAccount,
        to: {
          account_number: payment.accountNumber,
          bank: payment.bankId, // Should be ID from confirmation
          name: payment.name,
        },
      };

      console.log("Creating payment request:", payable);
      return brassService.createPayment(payable, brassToken);
    })
  );

  const processedResults = results.map((result, index) => {
    const inputPayment = paymentsToProcess[index];

    if (result.status === "fulfilled") {
      const apiResult = result.value;
      if (apiResult.success) {
        console.log(`Payment Success for ${inputPayment?.accountNumber}`);
        return {
          input: inputPayment,
          status: "success" as const,
          message: `Payment of ${inputPayment?.amount} to ${inputPayment?.name} (${inputPayment?.accountNumber}) initiated successfully.`,
        };
      } else {
        console.log(
          `Payment Failed for ${inputPayment?.accountNumber}:`,
          apiResult.message
        );
        return {
          input: inputPayment,
          status: "error" as const,
          message: apiResult.message ?? "Payment processing failed.", // Use error message from API
        };
      }
    } else {
      console.error(
        `Payment System Error for ${inputPayment?.accountNumber}:`,
        result.reason
      );
      return {
        input: inputPayment,
        status: "error" as const,
        message: "Failed to communicate with the payment processing service.",
      };
    }
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

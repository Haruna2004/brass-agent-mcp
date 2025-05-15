#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  bulkConfirmAcctSchema,
  confirmMultipleAccounts,
} from "./tools/confirmAccount";
import { bulkBankCodeSchema, getMultipleBankCodes } from "./tools/getBankCode";
import { bulkPaySchema, processMultiplePayments } from "./tools/processPayment";
import { listAccountSchema, listAllAccounts } from "./tools/getAccounts";

const server = new McpServer({
  name: "Brass Agent MCP",
  version: "1.0.0",
});

// Get Bank Code
server.tool(
  "getBankCode",
  `Lookup and retrieve numerical bank codes for a list of bank names.`,
  bulkBankCodeSchema.shape,
  getMultipleBankCodes
);

// Confirm Account
server.tool(
  "confirmAccount",
  "Verify and validate a list of bank account details, returning confirmed information or errors for each.",
  bulkConfirmAcctSchema.shape,
  confirmMultipleAccounts
);

// Process Payment
server.tool(
  "processPayment",
  "Execute a list of payment transactions after explicit user approval for the batch has been received.",
  bulkPaySchema.shape,
  processMultiplePayments
);

// List Accounts
server.tool(
  "listAccounts",
  "Show all available source accounts, details include: account name, account number, ledger balance, available balance, pending payment, bank name, bank code.",
  listAccountSchema.shape,
  listAllAccounts
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Brass MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

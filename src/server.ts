#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  bulkConfirmAcctSchema,
  confirmMultipleAccounts,
} from "./tools/confirmAccount";
import { bulkBankCodeSchema, getMultipleBankCodes } from "./tools/getBankCode";
import { bulkPaySchema, processMultiplePayments } from "./tools/processPayment";
import {
  extractCoreAccountDetails,
  getAccountDetails,
  getAccountSchema,
  listAccountSchema,
  listAllAccounts,
} from "./tools/getAccounts";
import { BrassService } from "./services/brass";

const server = new McpServer({
  name: "Brass Agent MCP",
  version: "1.0.0",
});

server.tool(
  "getBankCode",
  `Lookup and retrieve numerical bank codes for a list of bank names.`,
  bulkBankCodeSchema.shape,
  getMultipleBankCodes
);

server.tool(
  "confirmAccount",
  "Verify and validate a list of bank account details, returning confirmed information or errors for each.",
  bulkConfirmAcctSchema.shape,
  confirmMultipleAccounts
);

server.tool(
  "processPayment",
  "Execute a list of payment transactions after explicit user approval for the batch has been received.",
  bulkPaySchema.shape,
  processMultiplePayments
);

// List Accounts
// server.tool(
//   "listAccounts",
//   "List all accounts",
//   listAccountSchema.shape,
//   listAllAccounts
// );

// Get an Account details
// server.tool(
//   "getAccount",
//   "Get an account details",
//   getAccountSchema.shape,
//   getAccountDetails
// );

server.resource(
  "accounts", // Resource name
  "config://core/accounts", // Resource URI
  async (uri) => {
    // Read callback
    const brassService = new BrassService();
    const brassToken = process.env.BRASS_PA_TOKEN;
    const response = (await brassService.listAccounts(brassToken)) as any;

    if (!response.success) {
      throw new Error(`Failed to fetch accounts: ${response.message}`);
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(response.data.map(extractCoreAccountDetails)),
        },
      ],
    };
  }
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

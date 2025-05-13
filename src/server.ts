import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  bulkConfirmAcctSchema,
  confirmMultipleAccounts,
} from "./tools/confirmAccount";
import { bulkBankCodeSchema, getMultipleBankCodes } from "./tools/getBankCode";
import { bulkPaySchema, processMultiplePayments } from "./tools/processPayment";
import { BANK_NAMES } from "./lib/bankList";

const server = new McpServer({
  name: "Brass Agent MCP",
  version: "1.0.0",
});

// Valid Bankname tool
// server.tool("getValidBankName", "Convert the user input bank name into valid")

server.tool(
  "getBankCode",
  `Lookup and retrieve numerical bank codes for a list of bank names. Ensure the bank name is on of these valid bank in the list provided: ${JSON.stringify(
    BANK_NAMES
  )} `,
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Weather MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

// https://modelcontextprotocol.io/specification/2024-11-05/server/utilities/completion

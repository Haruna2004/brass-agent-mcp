export const BRASS_API_BASE_URL = "https://api.getbrass.co";
export const BRASS_API_PATHS = {
  resolveName: "/banking/banks/account-name",
  createPayment: "/banking/payments/create",
  listAccounts:
    "/banking/accounts?page=1&limit=10&include_virtual_accounts=true",
  getAccount: "/banking/accounts",
};

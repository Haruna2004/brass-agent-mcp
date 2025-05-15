// Import built-in Node.js modules using ES module syntax
import * as readline from "node:readline";

// API Base URL for Brass
const API_BASE_URL = "https://api.getbrass.co"; // Full URL for fetch

// This is the public client bearer token for the initial login step.
const INITIAL_LOGIN_BEARER_TOKEN =
  "lk_R1XkU0bQTQsVbPJGbi3Wl5iWOQ1KEV6zytoTeFRQs0";

// Available roles and their IDs
const AVAILABLE_ROLES = {
  accountant: "rol_7OWDJHIqvYcwGNeoXeVgyf",
  admin: "rol_LbhnugthyweEB151E6On4",
  hr: "rol_xWkA685BuuouWkgYGK128",
  member: "rol_2TDpsTTL0jHh0RFNXLchZG",
  owner: "rol_7h8f07GPpE17GGgrBA2vmN",
  payable_admin: "rol_6QJ8VcCEgCLtcbz4EO8H1b",
  receivable_admin: "rol_6zvQzQ3gphPMbnbKvHJj0s",
};
const DEFAULT_ROLE_NAME = "admin";

// Create readline interface for CLI prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline.question
const promptUser = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

/**
 * Makes an API request using the fetch API.
 * @param {string} method - HTTP method (e.g., 'POST', 'GET').
 * @param {string} path - The API endpoint path (e.g., '/auth/login').
 * @param {object} [payload={}] - The request payload for POST/PUT/PATCH requests.
 * @param {object} [customHeaders={}] - The request headers.
 * @returns {Promise<object>} - The parsed API response data.
 * @throws {Error} - Throws an error if the API request fails or returns a non-success status code.
 */
async function fetchApi(method, path, payload = {}, customHeaders = {}) {
  const url = `${API_BASE_URL}${path}`;
  const defaultHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const options = {
    method: method,
    headers: { ...defaultHeaders, ...customHeaders },
  };

  if (method === "POST" || method === "PUT" || method === "PATCH") {
    options.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(url, options);
    const isJson = response.headers
      .get("content-type")
      ?.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      console.error(
        `\n❌ API Error on ${method} ${url}: Status ${response.status}`
      );
      console.error(
        "Response Body:",
        isJson ? JSON.stringify(data, null, 2) : data
      );
      throw new Error(
        `API request to ${method} ${path} failed with status ${response.status}.`
      );
    }

    return data;
  } catch (error) {
    console.error(
      `\n❌ Problem with request to ${method} ${url}: ${error.message}`
    );
    throw new Error(`API request failed: ${error.message}`);
  }
}

/**
 * Performs the initial login to get a temporary token for OTP verification.
 * @param {string} email - User's Brass email.
 * @param {string} password - User's Brass password.
 * @returns {Promise<string>} - The temporary login token.
 */
async function performLogin(email, password) {
  console.log("\nAuthenticating with your credentials...");
  const payload = { username: email, password: password };
  const headers = {
    Authorization: `Bearer ${INITIAL_LOGIN_BEARER_TOKEN}`,
  };
  const response = await fetchApi("POST", "/auth/login", payload, headers);
  if (response?.token) {
    return response.token;
  }
  console.error(
    "Login failed. Unexpected response structure:",
    JSON.stringify(response, null, 2)
  );
  throw new Error("Could not retrieve temporary token from login response.");
}

/**
 * Authorizes the OTP to get a short-lived access token.
 * @param {string} tempLoginToken - The temporary token from the login step.
 * @param {string} otp - The One-Time Password entered by the user.
 * @returns {Promise<string>} - The short-lived access token.
 */
async function authorizeWithOtp(tempLoginToken, otp) {
  console.log("\nVerifying OTP...");
  const payload = { otp: otp };
  const headers = {
    Authorization: `Bearer ${tempLoginToken}`,
  };
  const response = await fetchApi(
    "POST",
    "/auth/login/authorise",
    payload,
    headers
  );
  if (response?.token) {
    return response.token;
  }
  console.error(
    "OTP verification failed. Unexpected response structure:",
    JSON.stringify(response, null, 2)
  );
  throw new Error(
    "Could not retrieve short-lived access token from OTP authorization."
  );
}

/**
 * Orchestrates the login and OTP verification process.
 * @param {string} email - User's Brass email.
 * @param {string} password - User's Brass password.
 * @returns {Promise<string>} - The short-lived access token.
 */
async function getShortLivedAccessToken(email, password) {
  const tempLoginToken = await performLogin(email, password);
  console.log("🔑 Temporary login token received.");
  console.log(
    "\n📨 An OTP should have been sent to your registered email/device."
  );
  const otp = await promptUser("Enter the OTP token: ");
  const shortLivedToken = await authorizeWithOtp(tempLoginToken, otp);
  console.log("✅ Login and OTP verification successful!");
  return shortLivedToken;
}

/**
 * Calls the API to create a Personal Access Token (PAT).
 * @param {string} shortLivedAccessToken - The short-lived token from OTP auth.
 * @param {string} patName - The name for the new PAT.
 * @param {string} patRoleId - The role ID for the PAT.
 * @returns {Promise<string>} - The generated Personal Access Token.
 */
async function callCreatePatApi(shortLivedAccessToken, patName, patRoleId) {
  const payload = { name: patName, role: patRoleId };
  const headers = {
    Authorization: `Bearer ${shortLivedAccessToken}`,
  };
  const response = await fetchApi(
    "POST",
    "/auth/personal-access-tokens",
    payload,
    headers
  );
  if (response?.data?.token) {
    return response.data.token;
  }
  console.error(
    "PAT generation failed. Unexpected response structure:",
    JSON.stringify(response, null, 2)
  );
  throw new Error("Could not retrieve PAT from API response.");
}

/**
 * Guides the user through creating a PAT, including role selection.
 * @param {string} shortLivedAccessToken - The authenticated short-lived token.
 * @returns {Promise<string>} - The generated Personal Access Token.
 */
async function generateNewPat(shortLivedAccessToken) {
  console.log("\nLet's configure your new Personal Access Token (PAT).");
  const patName = await promptUser(
    'Enter a descriptive name for your PAT (e.g., "Brass AI Agent"): '
  );

  console.log("\nAvailable roles:");
  for (const roleName in AVAILABLE_ROLES) {
    console.log(`- ${roleName}`);
  }
  console.log(`(Leave blank to use default: "${DEFAULT_ROLE_NAME}")`);

  let selectedRoleId = null;
  let selectedRoleName = "";

  while (selectedRoleId === null) {
    const patRoleInput = await promptUser(`Enter a role name for the PAT: `);
    const trimmedInput = patRoleInput.trim().toLowerCase();

    if (trimmedInput === "") {
      selectedRoleName = DEFAULT_ROLE_NAME;
      selectedRoleId = AVAILABLE_ROLES[DEFAULT_ROLE_NAME];
      console.log(
        `Defaulting to role: "${DEFAULT_ROLE_NAME}" (ID: ${selectedRoleId})`
      );
      break;
    }

    if (AVAILABLE_ROLES.hasOwnProperty(trimmedInput)) {
      selectedRoleName = trimmedInput;
      selectedRoleId = AVAILABLE_ROLES[trimmedInput];
      console.log(
        `Selected role: "${selectedRoleName}" (ID: ${selectedRoleId})`
      );
    } else {
      console.log(
        `❌ Invalid role name "${patRoleInput}". Please choose from the list or leave blank for default.`
      );
    }
  }

  console.log(
    `\n⚙️ Generating PAT with name "${patName}" and role "${selectedRoleName}" (ID: ${selectedRoleId})...`
  );
  const personalAccessToken = await callCreatePatApi(
    shortLivedAccessToken,
    patName,
    selectedRoleId
  );
  console.log("🎉 PAT generated successfully!");
  return personalAccessToken;
}

/**
 * Main function to run the script.
 */
async function main() {
  console.log("----------------------------------------------------");
  console.log(" Brass Personal Access Token (PAT) Generator ");
  console.log("----------------------------------------------------");
  console.log("This script will help you generate a long-lived PAT for Brass.");
  console.log("You will need your Brass email, password, and access to OTPs.");
  console.log("----------------------------------------------------\n");

  try {
    const email = await promptUser("Enter your Brass email: ");
    const password = await promptUser(
      "Enter your Brass password (input will be visible): "
    );

    const shortLivedAccessToken = await getShortLivedAccessToken(
      email,
      password
    );
    const personalAccessToken = await generateNewPat(shortLivedAccessToken);

    console.log("\n✨ Your new Personal Access Token (PAT) is:");
    console.log("----------------------------------------------------\n");
    console.log(personalAccessToken);
    console.log("\n----------------------------------------------------");
    console.log("\n🔒 IMPORTANT: Copy this PAT now and store it securely.");
    console.log("   It will not be shown again through this script.");
    console.log("\n----------------------------------------------------");
    console.log(
      "You can manage your PATs at: https://app.trybrass.com/apps/access-token"
    );
    console.log("----------------------------------------------------");
  } catch (error) {
    console.error(`\nScript execution failed: ${error.message}`);
  } finally {
    rl.close();
  }
}

main();

// Zero-dependency MCOM mesh & auth smoke test.
// Run with: node --env-file=.env test-mcom-mesh.mjs
const MCOM_URL = process.env.MCOM_SOLUTIONS_URL || "http://localhost:3010";
const CLIENT_ID = process.env.MCOM_CLIENT_ID || "mcom-group";
const CLIENT_SECRET = process.env.MCOM_CLIENT_SECRET;
const TARGET_PEER = process.env.MCOM_TEST_AUDIENCE || "mcom-rewards";

if (!CLIENT_SECRET) {
  console.error("MCOM_CLIENT_SECRET is required. Run with --env-file=.env");
  process.exit(1);
}

console.log(`\n🔍 [1/3] Testing Ecosystem Discovery at ${MCOM_URL}...`);

try {
  const discoveryResponse = await fetch(
    `${MCOM_URL}/api/v1/ecosystem/discovery`,
  );
  const discovery = await discoveryResponse.json();
  console.log(
    "✅ Discovery OK! Issuer:",
    discovery.issuer,
    "| Signing Alg:",
    discovery.signing_alg,
  );

  console.log(
    `\n🔑 [2/3] Requesting RS256 Service Token for audience "${TARGET_PEER}"...`,
  );
  const basicAuth = Buffer.from(
    `${CLIENT_ID}:${CLIENT_SECRET}`,
  ).toString("base64");
  const tokenResponse = await fetch(
    `${MCOM_URL}/api/v1/auth/service-token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        audience: TARGET_PEER,
        scope: "profile",
      }),
    },
  );

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.error(
      `❌ Service Token Failed (${tokenResponse.status}):`,
      tokenData,
    );
    console.log(
      `💡 HINT: If 403 Forbidden, configure this app's allowed audiences and scopes in MCOM Console → Service Mesh Policy.`,
    );
    process.exit(1);
  }

  console.log("✅ Service Token Minted Successfully!");
  console.log("   - Type:", tokenData.token_type);
  console.log("   - Expires In:", `${tokenData.expires_in}s`);
  console.log(
    "   - Token Preview:",
    `${String(tokenData.access_token).slice(0, 32)}...`,
  );

  console.log("\n🌐 [3/3] Fetching Ecosystem Peer Directory...");
  const peersResponse = await fetch(
    `${MCOM_URL}/api/v1/ecosystem/services`,
  );
  const peers = await peersResponse.json();
  console.log(
    "✅ Connected to Ecosystem Mesh! Total active peer services registered:",
    peers.length,
  );
  console.log(
    "   Peers found:",
    peers.map((peer) => peer.clientId).join(", "),
  );
} catch (error) {
  console.error("❌ Connectivity test failed:", error.message);
  process.exit(1);
}

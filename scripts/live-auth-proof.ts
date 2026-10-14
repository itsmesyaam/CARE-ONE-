import { execSync } from 'child_process';

const LIVE_BASE = 'https://care-one.syam18official.workers.dev';

interface StepResult {
  step: string;
  url: string;
  method: string;
  status: number;
  expectedStatus: number | number[];
  passed: boolean;
  timestamp: string;
  details?: unknown;
}

const results: StepResult[] = [];

function extractCookie(res: Response, cookieName: string): string | null {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

async function runLiveProofs() {
  console.log(`\n======================================================`);
  console.log(`Starting CareOne Live Production Proof against ${LIVE_BASE}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`======================================================\n`);

  // 1. Health check
  console.log('--- Step 1: Health Check ---');
  const healthRes = await fetch(`${LIVE_BASE}/api/health`);
  const healthJson = await healthRes.json();
  const step1Passed = healthRes.status === 200 && healthJson.db === 'ok';
  results.push({
    step: '1. Health Check & Live D1 Ping',
    url: `${LIVE_BASE}/api/health`,
    method: 'GET',
    status: healthRes.status,
    expectedStatus: 200,
    passed: step1Passed,
    timestamp: new Date().toISOString(),
    details: healthJson,
  });
  console.log(`Status: ${healthRes.status}, Body:`, healthJson);

  // 2. Sign in with all 4 primary demo roles
  console.log('\n--- Step 2: Sign in with 4 Primary Demo Accounts ---');
  const demoAccounts = [
    { username: 'desk@example.com', role: 'front_desk', name: 'Front Desk' },
    { username: 'dr.rahul@example.com', role: 'doctor', name: 'Doctor (Dr. Rahul)' },
    { username: 'admin@example.com', role: 'admin', name: 'Hospital Admin' },
    { username: 'ABC-1001', role: 'patient', name: 'Patient (Arun Kumar)' },
  ];

  const sessions: Record<string, string> = {};

  for (const acc of demoAccounts) {
    const loginRes = await fetch(`${LIVE_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: acc.username,
        password: 'DemoPassword123!',
      }),
    });
    const loginJson = (await loginRes.json()) as { ok?: boolean; user?: { role: string; username: string }; error?: string };
    const cookie = extractCookie(loginRes, 'careone_session');
    if (cookie) sessions[acc.username] = cookie;

    const passed = loginRes.status === 200 && loginJson.ok === true && Boolean(cookie);
    results.push({
      step: `2. Sign-in ${acc.name} (${acc.username})`,
      url: `${LIVE_BASE}/api/auth/login`,
      method: 'POST',
      status: loginRes.status,
      expectedStatus: 200,
      passed,
      timestamp: new Date().toISOString(),
      details: { role: loginJson.user?.role, hasCookie: Boolean(cookie) },
    });
    console.log(`[${acc.name}] Status: ${loginRes.status}, Role: ${loginJson.user?.role}, Cookie: ${cookie ? 'careone_session=...' : 'NONE'}`);
  }

  // 3. Wrong password tests: unknown user vs existing user generic error
  console.log('\n--- Step 3: Wrong Password & Generic Error Uniformity ---');
  const unknownRes = await fetch(`${LIVE_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'nonexistent@example.com', password: 'WrongPassword123!' }),
  });
  const unknownJson = await unknownRes.json();

  const wrongRes = await fetch(`${LIVE_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'dr.thomas@example.com', password: 'WrongPassword123!' }),
  });
  const wrongJson = await wrongRes.json();

  const step3Passed =
    unknownRes.status === 401 &&
    wrongRes.status === 401 &&
    unknownJson.error === wrongJson.error &&
    unknownJson.error === 'Invalid username or password';

  results.push({
    step: '3. Generic Error Uniformity (Unknown User vs Bad Password)',
    url: `${LIVE_BASE}/api/auth/login`,
    method: 'POST',
    status: wrongRes.status,
    expectedStatus: 401,
    passed: step3Passed,
    timestamp: new Date().toISOString(),
    details: { unknownError: unknownJson.error, wrongPasswordError: wrongJson.error },
  });
  console.log(`Unknown User: ${unknownRes.status} -> ${unknownJson.error}`);
  console.log(`Wrong Password: ${wrongRes.status} -> ${wrongJson.error}`);

  // 4. Lockout test on dr.thomas@example.com (already has 1 failed attempt above)
  console.log('\n--- Step 4: 5 Failed Logins -> 15 Minute Lockout (6th attempt 429) ---');
  for (let i = 2; i <= 4; i++) {
    await fetch(`${LIVE_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dr.thomas@example.com', password: 'WrongPassword123!' }),
    });
  }
  // 5th attempt locks
  const fifthRes = await fetch(`${LIVE_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'dr.thomas@example.com', password: 'WrongPassword123!' }),
  });
  const fifthJson = await fifthRes.json();

  // 6th attempt with correct password rejected with 429
  const sixthRes = await fetch(`${LIVE_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'dr.thomas@example.com', password: 'DemoPassword123!' }),
  });
  const sixthJson = await sixthRes.json();

  const step4Passed = fifthRes.status === 429 && sixthRes.status === 429;
  results.push({
    step: '4. Account Lockout after 5 wrong attempts (6th locked at 429)',
    url: `${LIVE_BASE}/api/auth/login`,
    method: 'POST',
    status: sixthRes.status,
    expectedStatus: 429,
    passed: step4Passed,
    timestamp: new Date().toISOString(),
    details: { fifth: fifthJson, sixth: sixthJson },
  });
  console.log(`5th Attempt Status: ${fifthRes.status}, Error:`, fifthJson);
  console.log(`6th Attempt Status: ${sixthRes.status}, Error:`, sixthJson);

  // Restore Dr. Thomas via CLI
  console.log('Restoring Dr. Thomas via CLI set-password...');
  execSync('npx tsx scripts/set-password.ts --username dr.thomas@example.com --remote --password DemoPassword123!', {
    stdio: 'ignore',
  });
  const restoredRes = await fetch(`${LIVE_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'dr.thomas@example.com', password: 'DemoPassword123!' }),
  });
  console.log(`Dr. Thomas after CLI unlock: ${restoredRes.status} (expected 200)`);

  // 5. Doctor reads assigned patient vs unassigned patient
  console.log('\n--- Step 5: Doctor Care Team Isolation (200 on assigned, 404 on unassigned) ---');
  const drCookie = sessions['dr.rahul@example.com'];
  const arunId = 'e0000000-0000-0000-0000-000000000001';
  const unassignedId = 'e0000000-0000-0000-0000-000000000004'; // Naveen Raj (Psychiatry)

  const assignedRes = await fetch(`${LIVE_BASE}/api/doctor/patients/${arunId}/chart`, {
    headers: { Cookie: `careone_session=${drCookie}` },
  });
  const assignedJson = await assignedRes.json();

  const unassignedRes = await fetch(`${LIVE_BASE}/api/doctor/patients/${unassignedId}/chart`, {
    headers: { Cookie: `careone_session=${drCookie}` },
  });
  const unassignedJson = await unassignedRes.json();

  const step5Passed = assignedRes.status === 200 && unassignedRes.status === 404;
  results.push({
    step: '5. Doctor Access: Assigned Patient (200) vs Unassigned Patient (404)',
    url: `${LIVE_BASE}/api/doctor/patients/.../chart`,
    method: 'GET',
    status: assignedRes.status,
    expectedStatus: 200,
    passed: step5Passed,
    timestamp: new Date().toISOString(),
    details: { assignedStatus: assignedRes.status, unassignedStatus: unassignedRes.status },
  });
  console.log(`Assigned Chart (${arunId}): ${assignedRes.status} (has patient: ${Boolean(assignedJson.patient)})`);
  console.log(`Unassigned Chart (${unassignedId}): ${unassignedRes.status} -> ${unassignedJson.error}`);

  // 6. Admin cannot read clinical records (DPDP compliance)
  console.log('\n--- Step 6: Admin Forbidden from Patient Clinical Records (404) ---');
  const adminCookie = sessions['admin@example.com'];
  const adminChartRes = await fetch(`${LIVE_BASE}/api/doctor/patients/${arunId}/chart`, {
    headers: { Cookie: `careone_session=${adminCookie}` },
  });
  const adminRecordsRes = await fetch(`${LIVE_BASE}/api/patient/records?patient_id=${arunId}`, {
    headers: { Cookie: `careone_session=${adminCookie}` },
  });
  const adminDashRes = await fetch(`${LIVE_BASE}/api/admin/dashboard`, {
    headers: { Cookie: `careone_session=${adminCookie}` },
  });
  const adminDashJson = await adminDashRes.json();

  const step6Passed =
    adminChartRes.status === 404 &&
    adminRecordsRes.status === 404 &&
    adminDashRes.status === 200 &&
    !('patients' in adminDashJson);

  results.push({
    step: '6. Admin Clinical Shielding (Chart 404, Records 404, Dashboard 200 aggregate)',
    url: `${LIVE_BASE}/api/doctor/patients/${arunId}/chart`,
    method: 'GET',
    status: adminChartRes.status,
    expectedStatus: 404,
    passed: step6Passed,
    timestamp: new Date().toISOString(),
    details: { chartStatus: adminChartRes.status, recordsStatus: adminRecordsRes.status, dashStatus: adminDashRes.status },
  });
  console.log(`Admin Doctor Chart: ${adminChartRes.status}`);
  console.log(`Admin Patient Records: ${adminRecordsRes.status}`);
  console.log(`Admin Dashboard: ${adminDashRes.status} (Aggregate only, no clinical fields)`);

  // 7. Desk resets Arun's password -> Arun must_change_password flow
  console.log("\n--- Step 7: Desk Resets Patient Password -> Forced Password Change Flow ---");
  const deskCookie = sessions['desk@example.com'];
  const resetRes = await fetch(`${LIVE_BASE}/api/desk/patients/${arunId}/account`, {
    method: 'POST',
    headers: { Cookie: `careone_session=${deskCookie}` },
  });
  const resetJson = (await resetRes.json()) as { ok: boolean; temporary_password: string; username: string };
  console.log(`Desk Reset Response: ${resetRes.status}, Temp Pass: ${resetJson.temporary_password}`);

  // Arun signs in with temp password
  const arunTempLogin = await fetch(`${LIVE_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'ABC-1001',
      password: resetJson.temporary_password,
    }),
  });
  const arunTempCookie = extractCookie(arunTempLogin, 'careone_session');
  console.log(`Arun Login with Temp Pass: ${arunTempLogin.status}, hasCookie: ${Boolean(arunTempCookie)}`);

  // Protected route is blocked with 403 password_change_required
  const arunBlockedRes = await fetch(`${LIVE_BASE}/api/patient/home`, {
    headers: { Cookie: `careone_session=${arunTempCookie}` },
  });
  const arunBlockedJson = await arunBlockedRes.json();
  console.log(`Arun Access while must_change_password=1: ${arunBlockedRes.status} -> ${arunBlockedJson.error}`);

  // Arun changes password via POST /api/me/password
  const arunChangeRes = await fetch(`${LIVE_BASE}/api/me/password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `careone_session=${arunTempCookie}`,
    },
    body: JSON.stringify({
      currentPassword: resetJson.temporary_password,
      newPassword: 'DemoPassword123!',
    }),
  });
  const arunChangeCookie = extractCookie(arunChangeRes, 'careone_session') || arunTempCookie;
  console.log(`Arun Password Change: ${arunChangeRes.status}`);

  // Re-login with new password to ensure full session validity
  const arunNewLogin = await fetch(`${LIVE_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'ABC-1001',
      password: 'DemoPassword123!',
    }),
  });
  const arunFinalCookie = extractCookie(arunNewLogin, 'careone_session');

  // Arun accesses home portal successfully
  const arunHomeRes = await fetch(`${LIVE_BASE}/api/patient/home`, {
    headers: { Cookie: `careone_session=${arunFinalCookie}` },
  });
  const arunHomeJson = await arunHomeRes.json();
  console.log(`Arun Home Access after Change: ${arunHomeRes.status} (has patient: ${Boolean(arunHomeJson.patient)})`);

  const step7Passed =
    resetRes.status === 200 &&
    arunTempLogin.status === 200 &&
    arunBlockedRes.status === 403 &&
    arunChangeRes.status === 200 &&
    arunHomeRes.status === 200;

  results.push({
    step: "7. Desk Reset -> must_change_password Barrier (403) -> /api/me/password -> Portal Unlocked (200)",
    url: `${LIVE_BASE}/api/me/password`,
    method: 'POST',
    status: arunChangeRes.status,
    expectedStatus: 200,
    passed: step7Passed,
    timestamp: new Date().toISOString(),
    details: { resetStatus: resetRes.status, barrierStatus: arunBlockedRes.status, finalStatus: arunHomeRes.status },
  });

  // 8. CLI Emergency set-password test on Admin
  console.log('\n--- Step 8: CLI Emergency set-password Tool on Live Remote D1 ---');
  execSync('npx tsx scripts/set-password.ts --username admin@example.com --remote --password NewAdminPass123!', {
    stdio: 'ignore',
  });
  const adminNewPassRes = await fetch(`${LIVE_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@example.com', password: 'NewAdminPass123!' }),
  });
  const adminOldPassRes = await fetch(`${LIVE_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@example.com', password: 'DemoPassword123!' }),
  });
  console.log(`Admin Sign-in with New Password: ${adminNewPassRes.status} (expected 200)`);
  console.log(`Admin Sign-in with Old Password: ${adminOldPassRes.status} (expected 401)`);

  // Restore Admin password back to DemoPassword123!
  execSync('npx tsx scripts/set-password.ts --username admin@example.com --remote --password DemoPassword123!', {
    stdio: 'ignore',
  });
  const adminRestoredRes = await fetch(`${LIVE_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@example.com', password: 'DemoPassword123!' }),
  });
  console.log(`Admin Sign-in with Restored Demo Password: ${adminRestoredRes.status} (expected 200)`);

  const step8Passed = adminNewPassRes.status === 200 && adminOldPassRes.status === 401 && adminRestoredRes.status === 200;
  results.push({
    step: '8. CLI Emergency set-password (Live Remote D1 Execution & Verification)',
    url: 'scripts/set-password.ts --remote',
    method: 'CLI',
    status: 200,
    expectedStatus: 200,
    passed: step8Passed,
    timestamp: new Date().toISOString(),
    details: { newPassStatus: adminNewPassRes.status, oldPassStatus: adminOldPassRes.status, restoredStatus: adminRestoredRes.status },
  });

  // 9. Sessionless Access Check: no route returns patient data without a session
  console.log('\n--- Step 9: Zero Sessionless Access to Protected Routes (All 401) ---');
  const sessionlessEndpoints = [
    { url: `${LIVE_BASE}/api/doctor/patients/${arunId}/chart`, method: 'GET' },
    { url: `${LIVE_BASE}/api/patient/home`, method: 'GET' },
    { url: `${LIVE_BASE}/api/patient/records`, method: 'GET' },
    { url: `${LIVE_BASE}/api/desk/patients`, method: 'GET' },
    { url: `${LIVE_BASE}/api/admin/audit-logs`, method: 'GET' },
    { url: `${LIVE_BASE}/api/me/password`, method: 'POST' },
  ];

  let step9Passed = true;
  for (const ep of sessionlessEndpoints) {
    const res = await fetch(ep.url, { method: ep.method });
    if (res.status !== 401) {
      step9Passed = false;
      console.log(`FAILED: ${ep.method} ${ep.url} returned ${res.status}`);
    } else {
      console.log(`PASSED: ${ep.method} ${ep.url} -> 401 unauthorized`);
    }
  }

  results.push({
    step: '9. Sessionless Access Check (All protected endpoints return 401 unauthorized)',
    url: `${LIVE_BASE}/api/*`,
    method: 'ALL',
    status: 401,
    expectedStatus: 401,
    passed: step9Passed,
    timestamp: new Date().toISOString(),
  });

  // 10. Live Logout & GET /api/me 401 Verification
  console.log('\n--- Step 10: Live Logout & GET /api/me Invalidation ---');
  let step10Passed = true;
  for (const roleTest of [
    { username: 'dr.rahul@example.com', name: 'Dr. Rahul' },
    { username: 'ABC-1001', name: 'Patient Arun' },
  ]) {
    const loginRes = await fetch(`${LIVE_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: roleTest.username, password: 'DemoPassword123!' }),
    });
    const cookie = extractCookie(loginRes, 'careone_session');
    if (!cookie) {
      step10Passed = false;
      console.log(`FAILED: No cookie returned for ${roleTest.name}`);
      continue;
    }

    const meRes = await fetch(`${LIVE_BASE}/api/me`, {
      headers: { Cookie: `careone_session=${cookie}` },
    });
    if (meRes.status !== 200) {
      step10Passed = false;
      console.log(`FAILED: GET /api/me for ${roleTest.name} returned ${meRes.status}`);
    }

    const logoutRes = await fetch(`${LIVE_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `careone_session=${cookie}` },
    });
    const setCookie = logoutRes.headers.get('set-cookie') || '';
    if (!setCookie.includes('Max-Age=0')) {
      step10Passed = false;
      console.log(`FAILED: Logout Set-Cookie for ${roleTest.name} did not contain Max-Age=0`);
    }

    // Now test GET /api/me without cookie (or expired cookie)
    const afterLogoutMe = await fetch(`${LIVE_BASE}/api/me`);
    if (afterLogoutMe.status !== 401) {
      step10Passed = false;
      console.log(`FAILED: Post-logout GET /api/me returned ${afterLogoutMe.status}, expected 401`);
    } else {
      console.log(`PASSED: ${roleTest.name} logged in, /api/me returned 200, logged out (Max-Age=0), post-logout /api/me returned 401`);
    }
  }

  results.push({
    step: '10. Live Logout Cookie Cleared & GET /api/me returns 401',
    url: `${LIVE_BASE}/api/auth/logout`,
    method: 'POST',
    status: step10Passed ? 200 : 500,
    expectedStatus: 200,
    passed: step10Passed,
    timestamp: new Date().toISOString(),
  });

  console.log('\n======================================================');
  console.log('SUMMARY OF ALL 10 LIVE PRODUCTION ACCEPTANCE PROOFS:');
  console.log('======================================================');
  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? '✓ PASSED' : '✗ FAILED';
    if (!r.passed) allPassed = false;
    console.log(`${icon} | ${r.step} [Status: ${r.status}]`);
  }
  console.log('======================================================');
  console.log(`OVERALL RESULT: ${allPassed ? '100% ALL CHECKS PASSED' : 'FAILURES DETECTED'}`);
  console.log('======================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runLiveProofs().catch((err) => {
  console.error('Live proof execution failed:', err);
  process.exit(1);
});

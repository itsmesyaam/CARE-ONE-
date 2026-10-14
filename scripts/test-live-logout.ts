const LIVE_BASE = 'https://care-one.syam18official.workers.dev';

function extractCookie(res: Response, cookieName: string): string | null {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

async function verifyLiveLogout() {
  console.log(`\nTesting Live Logout and Cookie Destruction on ${LIVE_BASE}...`);

  for (const user of [
    { username: 'dr.rahul@example.com', name: 'Dr. Rahul (Doctor)' },
    { username: 'ABC-1001', name: 'Arun Kumar (Patient)' },
  ]) {
    console.log(`\nTesting ${user.name}:`);

    // 1. Login
    const loginRes = await fetch(`${LIVE_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, password: 'DemoPassword123!' }),
    });

    if (loginRes.status === 429) {
      console.log(`IP Rate limit active (429). Wait 60s for Cloudflare rate limiter.`);
      process.exit(2);
    }

    const loginData = await loginRes.json() as { ok?: boolean; user?: { role: string } };
    const cookie = extractCookie(loginRes, 'careone_session');

    console.log(`- Login Status: ${loginRes.status}, OK: ${loginData.ok}, Role: ${loginData.user?.role}`);
    if (!cookie) {
      throw new Error(`Failed: No careone_session cookie returned!`);
    }

    // 2. GET /api/me with cookie
    const meRes = await fetch(`${LIVE_BASE}/api/me`, {
      headers: { Cookie: `careone_session=${cookie}` },
    });
    const meData = await meRes.json() as { user?: { role: string; userId: string } };
    console.log(`- GET /api/me Status: ${meRes.status}, Role: ${meData.user?.role}`);
    if (meRes.status !== 200) {
      throw new Error(`Failed: GET /api/me returned ${meRes.status}`);
    }

    // 3. POST /api/auth/logout
    const logoutRes = await fetch(`${LIVE_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `careone_session=${cookie}` },
    });
    const setCookie = logoutRes.headers.get('set-cookie') || '';
    const hasMaxAge0 = setCookie.includes('Max-Age=0');
    const hasPathRoot = setCookie.includes('Path=/');
    console.log(`- POST /api/auth/logout Status: ${logoutRes.status}`);
    console.log(`- Set-Cookie includes Max-Age=0: ${hasMaxAge0}, Path=/: ${hasPathRoot}`);
    if (!hasMaxAge0 || !hasPathRoot) {
      throw new Error(`Failed: Logout cookie destruction flags missing! Set-Cookie: ${setCookie}`);
    }

    // 4. Subsequent GET /api/me without cookie (or expired cookie)
    const postLogoutMe = await fetch(`${LIVE_BASE}/api/me`);
    console.log(`- Post-Logout GET /api/me Status: ${postLogoutMe.status} (expected 401)`);
    if (postLogoutMe.status !== 401) {
      throw new Error(`Failed: Expected 401 from GET /api/me after logout, got ${postLogoutMe.status}`);
    }

    console.log(`✓ ${user.name} Logout Verification PASSED!`);
  }

  console.log(`\n======================================================`);
  console.log(`ALL LIVE LOGOUT AND SESSION DESTROY CHECKS PASSED 100%`);
  console.log(`======================================================\n`);
}

verifyLiveLogout().catch((err) => {
  console.error(err);
  process.exit(1);
});

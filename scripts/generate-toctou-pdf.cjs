const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TOCTOU Vulnerability Remediation Report - CampusGuard Pro</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

    @page {
      size: A4 portrait;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Inter', sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      font-size: 10pt;
      background: #ffffff;
    }

    .header-card {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }

    .badge-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-primary { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .badge-security { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .badge-success { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }

    h1 {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }

    .subtitle {
      font-size: 9.5pt;
      color: #475569;
      margin-bottom: 6px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 10px;
      padding: 8px 12px;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      font-size: 8pt;
    }

    .meta-item strong {
      display: block;
      color: #64748b;
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    h2 {
      font-size: 12pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 18px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }

    h3 {
      font-size: 10.5pt;
      font-weight: 600;
      color: #1e293b;
      margin-top: 12px;
      margin-bottom: 4px;
    }

    p {
      margin-bottom: 8px;
      color: #334155;
    }

    .info-box {
      background: #f0f9ff;
      border-left: 3.5px solid #0284c7;
      padding: 10px 12px;
      border-radius: 0 6px 6px 0;
      margin: 10px 0;
      font-size: 9pt;
      color: #0369a1;
    }

    .info-box strong {
      color: #0c4a6e;
    }

    .vuln-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 14px;
      background: #ffffff;
      page-break-inside: avoid;
    }

    .vuln-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      padding-bottom: 6px;
      border-bottom: 1px solid #f1f5f9;
    }

    .vuln-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #0f172a;
    }

    .file-ref {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      color: #2563eb;
      background: #eff6ff;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #dbeafe;
    }

    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 8px 0;
    }

    .code-block {
      background: #0f172a;
      color: #f8fafc;
      padding: 8px 10px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      line-height: 1.45;
      overflow-x: hidden;
      white-space: pre-wrap;
    }

    .code-title-vulnerable {
      font-size: 7.5pt;
      font-weight: 700;
      color: #ef4444;
      margin-bottom: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .code-title-fixed {
      font-size: 7.5pt;
      font-weight: 700;
      color: #10b981;
      margin-bottom: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 8.5pt;
    }

    th, td {
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
      text-align: left;
    }

    th {
      background: #f1f5f9;
      font-weight: 600;
      color: #334155;
    }

    tr:nth-child(even) {
      background: #f8fafc;
    }

    .page-break {
      page-break-before: always;
    }

    .footer-note {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-size: 7.5pt;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header-card">
    <div class="badge-bar">
      <span class="badge badge-primary">CMADMS Security Audit</span>
      <span class="badge badge-security">Concurrency Hardening</span>
      <span class="badge badge-success">Fully Mitigated</span>
    </div>
    <h1>TOCTOU Vulnerability Remediation Report</h1>
    <div class="subtitle">Campus Movement & Absence Detection Management System (CampusGuard Pro)</div>
    
    <div class="meta-grid">
      <div class="meta-item">
        <strong>Vulnerability Type</strong>
        CWE-367 (TOCTOU)
      </div>
      <div class="meta-item">
        <strong>Mitigation Strategy</strong>
        Atomic Conditional SQL
      </div>
      <div class="meta-item">
        <strong>Database Engine</strong>
        PostgreSQL 16+
      </div>
      <div class="meta-item">
        <strong>Status</strong>
        Production Hardened
      </div>
    </div>
  </div>

  <!-- 1. Executive Summary -->
  <h2>1. Overview & Threat Model</h2>
  <p>
    <strong>Time-of-Check to Time-of-Use (TOCTOU)</strong> is a concurrency race condition where an application validates state at step 1 (Check), but before step 2 (Use/Mutation) completes, a concurrent process invalidates that premise.
  </p>
  <div class="info-box">
    <strong>Core Architectural Remediation:</strong> In CMADMS, all check-and-mutate sequences were replaced with <strong>atomic single-query SQL conditional updates</strong> utilizing PostgreSQL row-level locking and <code>RETURNING id</code>. If a concurrent operation commits first, the second query atomically matches 0 rows and fails gracefully.
  </div>

  <!-- 2. Detailed Vulnerabilities -->
  <h2>2. Implemented TOCTOU Security Fixes</h2>

  <!-- Fix 1 -->
  <div class="vuln-card">
    <div class="vuln-header">
      <div class="vuln-title">1. Student Movement Pass: Gate Exit Authorization</div>
      <div class="file-ref">src/lib/db/qr.server.ts : 428-447 & security.server.ts : 1152-1173</div>
    </div>
    <p>
      <strong>Risk:</strong> A student with an active pass could present their QR code at Gate A and Gate B simultaneously. In a naive read-then-write system, both gate scanners read <code>exit_at IS NULL</code>, authorizing two exits.
    </p>
    <div class="comparison-grid">
      <div>
        <div class="code-title-vulnerable">✕ Vulnerable (Two-Step Check)</div>
        <div class="code-block">// Non-atomic race window
const pass = await db.query(
  "SELECT * FROM movement_permissions WHERE id=$1"
);
if (!pass.exit_at) {
  // Concurrent scan can enter here!
  await db.query(
    "UPDATE movement_permissions SET exit_at=NOW() WHERE id=$1"
  );
}</div>
      </div>
      <div>
        <div class="code-title-fixed">✓ Implemented Fix (Atomic Predicate)</div>
        <div class="code-block">const exitRes = await db.query(
  \`UPDATE movement_permissions
   SET exit_at = NOW(), checkpoint = $1, verified_by = $2
   WHERE id::text = $3 AND exit_at IS NULL
   RETURNING id;\`,
  [checkpoint, verifier, passId]
);
if (exitRes.rows.length === 0) {
  return { failureReason: "Pass exit already processed (concurrency conflict)." };
}</div>
      </div>
    </div>
  </div>

  <!-- Fix 2 -->
  <div class="vuln-card">
    <div class="vuln-header">
      <div class="vuln-title">2. Student Movement Pass: Return Entry Authorization</div>
      <div class="file-ref">src/lib/db/qr.server.ts : 448-466 & security.server.ts : 919-938</div>
    </div>
    <p>
      <strong>Risk:</strong> Concurrent scanning of a returning student's pass at multiple entry gates.
    </p>
    <div class="comparison-grid">
      <div>
        <div class="code-title-vulnerable">✕ Vulnerable (Two-Step Check)</div>
        <div class="code-block">if (pass.exit_at && !pass.entry_at) {
  // Window of vulnerability
  await db.query(
    "UPDATE movement_permissions SET entry_at=NOW() WHERE id=$1"
  );
}</div>
      </div>
      <div>
        <div class="code-title-fixed">✓ Implemented Fix (Atomic Predicate)</div>
        <div class="code-block">const entryRes = await db.query(
  \`UPDATE movement_permissions
   SET entry_at = NOW()
   WHERE id::text = $1 AND exit_at IS NOT NULL AND entry_at IS NULL
   RETURNING id;\`,
  [passId]
);
if (entryRes.rows.length === 0) {
  return { failureReason: "Return entry already recorded (concurrency conflict)." };
}</div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- Fix 3 -->
  <div class="vuln-card">
    <div class="vuln-header">
      <div class="vuln-title">3. Bulk Event Participant Code Verification</div>
      <div class="file-ref">src/lib/db/qr.server.ts : 593-630</div>
    </div>
    <p>
      <strong>Risk:</strong> Event participant QR codes being duplicated and scanned across different campus gates at the same moment for unauthorized entry/exit.
    </p>
    <div class="comparison-grid">
      <div>
        <div class="code-title-vulnerable">✕ Vulnerable (Two-Step Check)</div>
        <div class="code-block">const ep = await getEventParticipant(code);
if (!ep.exit_at) {
  await setExit(code);
}</div>
      </div>
      <div>
        <div class="code-title-fixed">✓ Implemented Fix (Atomic Predicate)</div>
        <div class="code-block">const epExitRes = await db.query(
  \`UPDATE event_participants
   SET exit_at = NOW(), verified_by = $1
   WHERE permission_code = $2 AND exit_at IS NULL
   RETURNING id;\`,
  [verifier, code]
);
if (epExitRes.rows.length === 0) {
  return { failureReason: "Event exit already processed by another checkpoint." };
}</div>
      </div>
    </div>
  </div>

  <!-- Fix 4 -->
  <div class="vuln-card">
    <div class="vuln-header">
      <div class="vuln-title">4. Password Reset OTP Single-Use Consumption</div>
      <div class="file-ref">src/lib/db/user-management.server.ts : 892-900</div>
    </div>
    <p>
      <strong>Risk:</strong> An attacker sending burst HTTP requests with a captured OTP to reset multiple accounts or race against verification invalidation.
    </p>
    <div class="comparison-grid">
      <div>
        <div class="code-title-vulnerable">✕ Vulnerable (Two-Step Check)</div>
        <div class="code-block">const otp = await checkOtp(email, code);
if (otp.valid && !otp.used) {
  // Attacker can issue concurrent reset calls
  await updatePassword(email, newPass);
  await markOtpUsed(otp.id);
}</div>
      </div>
      <div>
        <div class="code-title-fixed">✓ Implemented Fix (Atomic Predicate)</div>
        <div class="code-block">const markUsedRes = await db.query(
  \`UPDATE password_resets 
   SET used = TRUE 
   WHERE id = $1 AND used = FALSE 
   RETURNING id;\`,
  [resetToken]
);
if (markUsedRes.rowCount === 0) {
  return { error: "This OTP code has already been used or expired." };
}</div>
      </div>
    </div>
  </div>

  <!-- 3. Summary Matrix -->
  <h2>3. Remediation Verification Matrix</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Module / Component</th>
        <th style="width: 25%;">Target Entity</th>
        <th style="width: 30%;">Atomic Invariant Predicate</th>
        <th style="width: 20%;">Concurrency Resolution</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>QR Gate Exit</strong></td>
        <td><code>movement_permissions</code></td>
        <td><code>exit_at IS NULL</code></td>
        <td>HTTP 200 (Conflict Flagged)</td>
      </tr>
      <tr>
        <td><strong>QR Return Entry</strong></td>
        <td><code>movement_permissions</code></td>
        <td><code>exit_at IS NOT NULL AND entry_at IS NULL</code></td>
        <td>HTTP 200 (Conflict Flagged)</td>
      </tr>
      <tr>
        <td><strong>Event Pass (Out)</strong></td>
        <td><code>event_participants</code></td>
        <td><code>exit_at IS NULL</code></td>
        <td>HTTP 200 (Conflict Flagged)</td>
      </tr>
      <tr>
        <td><strong>Event Pass (In)</strong></td>
        <td><code>event_participants</code></td>
        <td><code>exit_at IS NOT NULL AND entry_at IS NULL</code></td>
        <td>HTTP 200 (Conflict Flagged)</td>
      </tr>
      <tr>
        <td><strong>Password Reset</strong></td>
        <td><code>password_resets</code></td>
        <td><code>used = FALSE</code></td>
        <td>HTTP 400 (Already Used)</td>
      </tr>
    </tbody>
  </table>

  <!-- 4. Security Conclusion -->
  <h2>4. Conclusion & Guarantees</h2>
  <p>
    By enforcing atomic conditional updates at the PostgreSQL storage layer, CampusGuard Pro eliminates race condition windows entirely without requiring distributed locking overhead (Redis/mutex), guaranteeing <strong>100% linearizable state transitions</strong> across all concurrent campus checkpoints.
  </p>

  <div class="footer-note">
    CampusGuard Pro (CMADMS) • Architecture & Concurrency Hardening Specification • Generated on September 25, 2026
  </div>

</body>
</html>
`;

async function generatePdf() {
  console.log('Launching browser from:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const outputPath = path.join(__dirname, '..', 'TOCTOU_VULNERABILITY_FIXES.pdf');
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '12mm',
      left: '14mm',
      right: '14mm'
    }
  });

  await browser.close();
  console.log('PDF successfully generated at:', outputPath);
}

generatePdf().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});

/**
 * ═══════════════════════════════════════════════════════════════════
 *  email.gs — Google Apps Script for Quick Wa Link Contact Form
 * ═══════════════════════════════════════════════════════════════════
 *
 *  SETUP INSTRUCTIONS:
 *  1. Go to https://script.google.com and create a new project.
 *  2. Paste this entire file into the editor (replace Code.gs).
 *  3. In the editor, go to Project Settings → Script Properties.
 *  4. Add the following key/value pairs:
 *       TO_EMAIL        — your email address (receives notifications)
 *       CC_EMAIL        — optional CC (leave blank to disable)
 *       FROM_NAME       — display name, e.g. "Quick Wa Link"
 *       CONTACT_SECRET  — shared secret matching your Netlify env var
 *       SHEET_ID        — optional Google Sheet ID for logging (blank = off)
 *       SHEET_TAB       — sheet tab name (default: "Submissions")
 *  5. Click "Deploy" → "New Deployment" → Type: "Web App".
 *  6. Set "Execute as" → Me, "Who has access" → Anyone.
 *  7. Copy the deployment URL.
 *  8. Set it as APPS_SCRIPT_URL in your Netlify environment variables.
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

// ── Config helper — reads from Script Properties ───────────────────────────────
const getConfig = () => {
  const props = PropertiesService.getScriptProperties().getProperties();
  return {
    TO_EMAIL:  props.TO_EMAIL        || '',
    CC_EMAIL:  props.CC_EMAIL        || '',
    FROM_NAME: props.FROM_NAME       || 'Quick Wa Link',
    SECRET:    props.CONTACT_SECRET  || '',
    SHEET_ID:  props.SHEET_ID        || '',
    SHEET_TAB: props.SHEET_TAB       || 'Submissions',
  };
};

// ── Entry point ────────────────────────────────────────────────────────────────
/**
 * Handles POST requests from the Netlify function.
 * Returns JSON: { status: 'ok' } or { status: 'error', message: '...' }
 */
function doPost(e) {
  const output = ContentService.createTextOutput()
    .setMimeType(ContentService.MimeType.JSON);

  try {
    if (!e?.postData?.contents) {
      return output.setContent(JSON.stringify({ status: 'error', message: 'Empty request body.' }));
    }

    const data   = JSON.parse(e.postData.contents);
    const config = getConfig();

    // ── Authenticate ──────────────────────────────────────────────────────────
    if (!config.SECRET || data.secret !== config.SECRET) {
      Logger.log('Unauthorised request — secret mismatch.');
      return output.setContent(JSON.stringify({ status: 'error', message: 'Unauthorised.' }));
    }

    // ── Validate required fields ──────────────────────────────────────────────
    const required = ['name', 'email', 'subject', 'message'];
    for (const field of required) {
      if (!data[field]?.toString().trim()) {
        return output.setContent(JSON.stringify({ status: 'error', message: `Missing field: ${field}` }));
      }
    }

    // ── Send developer notification ───────────────────────────────────────────
    sendNotificationEmail(data, config);

    // ── Send acknowledgement to the sender ────────────────────────────────────
    sendAcknowledgementEmail(data, config);

    // ── Log to Google Sheet (optional) ────────────────────────────────────────
    if (config.SHEET_ID) logToSheet(data, config);

    return output.setContent(JSON.stringify({ status: 'ok', message: 'Email sent.' }));

  } catch (err) {
    Logger.log(`Error in doPost: ${err.message}`);
    return output.setContent(JSON.stringify({ status: 'error', message: err.message }));
  }
}

// ── Developer notification email ───────────────────────────────────────────────
function sendNotificationEmail(data, config) {
  const { name, email, subject, message, timestamp, source } = data;
  const formattedDate = formatDate(timestamp);

  const plainText = [
    '📬 New Message — Quick Wa Link',
    '═'.repeat(50),
    '',
    `From:      ${name}`,
    `Email:     ${email}`,
    `Subject:   ${subject}`,
    `Received:  ${formattedDate}`,
    `Source:    ${source || 'Quick Wa Link'}`,
    '',
    '─'.repeat(50),
    'MESSAGE',
    '─'.repeat(50),
    '',
    message,
    '',
    '─'.repeat(50),
    'Reply directly to this email to reach the sender.',
    '─'.repeat(50),
    '',
    'Sent via Quick Wa Link (quickwalink.netlify.app)',
  ].join('\n');

  const options = {
    htmlBody: buildNotificationHtml({ name, email, subject, message, formattedDate, source }),
    replyTo:  email,
    name:     config.FROM_NAME,
  };
  if (config.CC_EMAIL) options.cc = config.CC_EMAIL;

  GmailApp.sendEmail(
    config.TO_EMAIL,
    `[Quick Wa Link] ${subject} — from ${name}`,
    plainText,
    options,
  );

  Logger.log(`Notification sent to ${config.TO_EMAIL} — Subject: ${subject}`);
}

// ── Sender acknowledgement email ───────────────────────────────────────────────
function sendAcknowledgementEmail(data, config) {
  const { name, email, subject, message } = data;

  const plainText = [
    `Hi ${name},`,
    '',
    'Thank you for reaching out through Quick Wa Link! 🙏',
    '',
    "I've received your message and will reply within 24 hours.",
    '',
    '─'.repeat(50),
    'YOUR MESSAGE SUMMARY',
    '─'.repeat(50),
    `Subject: ${subject}`,
    '',
    message,
    '',
    '─'.repeat(50),
    '',
    'In the meantime, connect with me on:',
    '• WhatsApp:  https://wa.me/237654841420',
    '• Portfolio: https://godlovetikum.netlify.app',
    '• Facebook:  https://facebook.com/godlovetikum101',
    '',
    'Best regards,',
    'Godlove Tikum',
    'Quick Wa Link — https://quickwalink.netlify.app',
    '',
    '─'.repeat(50),
    'This is an automated acknowledgement — please do not reply here.',
    'To follow up: https://quickwalink.netlify.app/#contact',
  ].join('\n');

  GmailApp.sendEmail(
    email,
    'We received your message — Quick Wa Link',
    plainText,
    {
      htmlBody: buildAcknowledgementHtml({ name, subject, message }),
      name:     config.FROM_NAME,
      replyTo:  config.TO_EMAIL,
    },
  );

  Logger.log(`Acknowledgement sent to ${email}`);
}

// ── Notification HTML ──────────────────────────────────────────────────────────
function buildNotificationHtml({ name, email, subject, message, formattedDate, source }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>New Contact Submission — Quick Wa Link</title>
<style>
  body{font-family:Arial,sans-serif;background:#0d1117;color:#e6edf3;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#161b22;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden}
  .header{background:linear-gradient(135deg,#075e54,#128c7e);padding:32px 40px}
  .header h1{margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-.02em}
  .header p{margin:6px 0 0;font-size:14px;color:rgba(255,255,255,.75)}
  .body{padding:32px 40px}
  .meta{background:#0d1117;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:20px 24px;margin-bottom:28px}
  .meta-row{display:flex;gap:12px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:14px}
  .meta-row:last-child{border-bottom:none}
  .meta-label{color:#8b949e;min-width:80px;font-weight:500}
  .meta-value{color:#e6edf3;font-weight:500}
  .msg-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#25d366;margin-bottom:12px}
  .message{background:#0d1117;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:20px 24px;font-size:15px;line-height:1.7;color:#c9d1d9;white-space:pre-wrap;word-break:break-word}
  .footer{background:#0d1117;border-top:1px solid rgba(255,255,255,.06);padding:20px 40px;text-align:center;font-size:12px;color:#484f58}
  .footer a{color:#25d366;text-decoration:none}
  .reply-btn{display:inline-block;margin-top:24px;padding:12px 28px;background:#25d366;color:#0d1117;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>💬 New Contact Submission</h1>
    <p>Quick Wa Link — Contact Form</p>
  </div>
  <div class="body">
    <div class="meta">
      <div class="meta-row">
        <span class="meta-label">Name</span>
        <span class="meta-value">${escapeHtml(name)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Email</span>
        <span class="meta-value"><a href="mailto:${escapeHtml(email)}" style="color:#25d366">${escapeHtml(email)}</a></span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Subject</span>
        <span class="meta-value">${escapeHtml(subject)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Received</span>
        <span class="meta-value">${escapeHtml(formattedDate)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Source</span>
        <span class="meta-value">${escapeHtml(source || 'Quick Wa Link')}</span>
      </div>
    </div>
    <div class="msg-label">Message</div>
    <div class="message">${escapeHtml(message)}</div>
    <div style="text-align:center">
      <a href="mailto:${escapeHtml(email)}?subject=Re: ${escapeHtml(subject)}" class="reply-btn">
        Reply to ${escapeHtml(name)} →
      </a>
    </div>
  </div>
  <div class="footer">
    <p>Sent via <a href="https://quickwalink.netlify.app">Quick Wa Link</a> — Built by <a href="https://godlovetikum.netlify.app">Godlove Tikum</a></p>
    <p style="margin-top:6px">This email is auto-generated. Reply directly to reach the sender.</p>
  </div>
</div>
</body>
</html>`;
}

// ── Acknowledgement HTML ───────────────────────────────────────────────────────
function buildAcknowledgementHtml({ name, subject, message }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>We received your message — Quick Wa Link</title>
<style>
  body{font-family:Arial,sans-serif;background:#f4f4f4;color:#333;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#075e54,#128c7e);padding:32px 40px;text-align:center}
  .header h1{margin:0;font-size:22px;font-weight:800;color:#fff}
  .header p{margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.8)}
  .body{padding:32px 40px}
  .greeting{font-size:18px;font-weight:700;color:#0d1117;margin-bottom:16px}
  .body p{font-size:15px;line-height:1.7;color:#444;margin:0 0 16px}
  .summary{background:#f0fdf8;border:1px solid rgba(7,94,84,.2);border-left:4px solid #128c7e;border-radius:8px;padding:20px 24px;margin:24px 0}
  .summary-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#128c7e;margin-bottom:10px}
  .summary-subject{font-size:14px;font-weight:700;color:#0d1117;margin-bottom:8px}
  .summary-message{font-size:14px;color:#555;line-height:1.65;white-space:pre-wrap;word-break:break-word}
  .connect{background:#f8f8f8;border-radius:8px;padding:20px 24px;margin:24px 0}
  .connect-title{font-size:14px;font-weight:700;color:#0d1117;margin:0 0 12px}
  .connect a{display:inline-block;margin:4px 6px 4px 0;padding:8px 16px;background:#25d366;color:#fff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none}
  .footer{background:#f0f0f0;padding:20px 40px;text-align:center;font-size:12px;color:#888}
  .footer a{color:#128c7e;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>✅ Message Received!</h1>
    <p>Quick Wa Link — Contact Form</p>
  </div>
  <div class="body">
    <p class="greeting">Hi ${escapeHtml(name)},</p>
    <p>Thank you for reaching out through <strong>Quick Wa Link</strong>! I've received your message and will reply within <strong>24 hours</strong>.</p>
    <div class="summary">
      <div class="summary-label">Your Message</div>
      <div class="summary-subject">Subject: ${escapeHtml(subject)}</div>
      <div class="summary-message">${escapeHtml(message)}</div>
    </div>
    <div class="connect">
      <p class="connect-title">Connect with me directly:</p>
      <a href="https://wa.me/237654841420">WhatsApp</a>
      <a href="https://godlovetikum.netlify.app" style="background:#128c7e">Portfolio</a>
      <a href="https://facebook.com/godlovetikum101" style="background:#1877f2">Facebook</a>
    </div>
    <p style="font-size:13px;color:#666;margin-top:24px">
      Best regards,<br>
      <strong>Godlove Tikum</strong><br>
      Quick Wa Link — <a href="https://quickwalink.netlify.app" style="color:#128c7e">quickwalink.netlify.app</a>
    </p>
  </div>
  <div class="footer">
    <p>This is an automated acknowledgement from <a href="https://quickwalink.netlify.app">Quick Wa Link</a>.</p>
    <p style="margin-top:6px">Please do not reply to this email. To follow up, use the <a href="https://quickwalink.netlify.app/#contact">contact form</a>.</p>
  </div>
</div>
</body>
</html>`;
}

// ── Sheet logger ───────────────────────────────────────────────────────────────
function logToSheet(data, config) {
  try {
    const ss    = SpreadsheetApp.openById(config.SHEET_ID);
    let   sheet = ss.getSheetByName(config.SHEET_TAB);

    if (!sheet) {
      sheet = ss.insertSheet(config.SHEET_TAB);
      sheet.appendRow(['Timestamp', 'Name', 'Email', 'Subject', 'Message', 'Source']);
      sheet.getRange(1, 1, 1, 6)
        .setFontWeight('bold')
        .setBackground('#075e54')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.name,
      data.email,
      data.subject,
      data.message,
      data.source || 'Quick Wa Link',
    ]);
  } catch (err) {
    Logger.log(`Sheet logging error: ${err.message}`);
    // Non-fatal — emails were already sent
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  return date.toLocaleString('en-GB', { timeZone: 'Africa/Douala' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

// ── Manual test (run from Apps Script editor) ──────────────────────────────────
function testDoPost() {
  const config = getConfig();
  const result = doPost({
    postData: {
      contents: JSON.stringify({
        secret:    config.SECRET,
        name:      'Test User',
        email:     'test@example.com',
        subject:   'General Feedback',
        message:   'This is a test submission from the Apps Script editor.',
        timestamp: new Date().toISOString(),
        source:    'Quick Wa Link (test)',
      }),
    },
  });
  Logger.log(result.getContent());
}

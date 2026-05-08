/**
 * Netlify Function: contact.js
 *
 * Receives contact form submissions and forwards them to a
 * Google Apps Script endpoint which sends the email.
 *
 * Environment variables required (set in Netlify dashboard):
 *   APPS_SCRIPT_URL  — The deployed Google Apps Script web app URL
 *   CONTACT_SECRET   — Shared secret to authenticate requests to Apps Script
 */

export const handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Method not allowed.' }),
    };
  }

  // ── Parse & validate body ──────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Invalid request body.' }),
    };
  }

  const { name, email, subject, message } = body;

  const missing = [];
  if (!name?.trim())    missing.push('name');
  if (!email?.trim())   missing.push('email');
  if (!subject?.trim()) missing.push('subject');
  if (!message?.trim()) missing.push('message');

  if (missing.length) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Missing required fields: ${missing.join(', ')}.` }),
    };
  }

  // Basic email format check
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email.trim())) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Invalid email address.' }),
    };
  }

  // Spam / length guards
  if (message.trim().length < 10) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Message too short (minimum 10 characters).' }),
    };
  }

  if (message.trim().length > 2000) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Message too long (maximum 2000 characters).' }),
    };
  }

  // ── Check environment variables ────────────────────────────────────────
  const appsScriptUrl = process.env['APPS_SCRIPT_URL'];
  const secret        = process.env['CONTACT_SECRET'];

  if (!appsScriptUrl) {
    console.error('APPS_SCRIPT_URL environment variable is not set.');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Service is currently unavailable. Please try again later.' }),
    };
  }

  if (!secret) {
    console.error('CONTACT_SECRET environment variable is not set.');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Service is currently unavailable. Please try again later.' }),
    };
  }

  // ── Forward to Google Apps Script ─────────────────────────────────────
  const payload = {
    secret,
    name:      name.trim(),
    email:     email.trim().toLowerCase(),
    subject:   subject.trim(),
    message:   message.trim(),
    timestamp: new Date().toISOString(),
    source:    'Quick Wa Link Contact Form',
  };

  try {
    const response = await fetch(appsScriptUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!response.ok || data.status === 'error') {
      console.error('Apps Script error:', data);
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'We could not process your message. Please try WhatsApp instead.' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Message sent successfully. Thank you!' }),
    };

  } catch (err) {
    console.error('Fetch to Apps Script failed:', err.message);
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Service temporarily unavailable. Please try again.' }),
    };
  }
};

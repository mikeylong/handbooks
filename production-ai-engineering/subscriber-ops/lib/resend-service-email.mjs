import {
  ContractError,
  buildRecipientDeliveryId,
  buildWeeklySendKey,
  canonicalJson,
  sha256Text,
} from "./contracts.mjs";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const APPROVAL_SCOPE = "STAGING_EMAIL_VERIFICATION";

function fail(code, message) {
  throw new ContractError(code, message);
}

function nonempty(value, label) {
  if (typeof value !== "string" || value.trim() === "") fail("RESEND_INPUT", `${label} is required`);
}

export function normalizeRecipientEmail(email) {
  nonempty(email, "recipient email");
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) fail("RESEND_RECIPIENT", "recipient email is invalid");
  return normalized;
}

export function recipientEmailSha256(email) {
  return sha256Text(normalizeRecipientEmail(email));
}

export function serviceEmailContentSha256({ subject, text, html }) {
  nonempty(subject, "subject");
  nonempty(text, "text");
  nonempty(html, "html");
  return sha256Text(canonicalJson({ subject, text, html }));
}

export function buildStagingEmailApprovalRequest({
  releaseId,
  audienceSnapshotId,
  weeklySendKey,
  userId,
  recipientEmail,
  subject,
  text,
  html,
  senderDomain,
}) {
  for (const [label, value] of Object.entries({ releaseId, audienceSnapshotId, weeklySendKey, userId, senderDomain })) nonempty(value, label);
  const contentSha256 = serviceEmailContentSha256({ subject, text, html });
  const expectedWeeklySendKey = buildWeeklySendKey(releaseId, audienceSnapshotId, contentSha256);
  if (weeklySendKey !== expectedWeeklySendKey) fail("WEEKLY_SEND_KEY_MISMATCH", "weekly send key does not match release, audience, and content");
  const deliveryId = buildRecipientDeliveryId(weeklySendKey, userId);
  return {
    schema_version: "1",
    scope: APPROVAL_SCOPE,
    environment: "staging",
    provider: "resend",
    release_id: releaseId,
    audience_snapshot_id: audienceSnapshotId,
    recipient_user_id: userId,
    recipient_email_sha256: recipientEmailSha256(recipientEmail),
    weekly_send_key: weeklySendKey,
    delivery_id: deliveryId,
    content_sha256: contentSha256,
    subject_sha256: sha256Text(subject),
    sender_domain: senderDomain,
    send_count_limit: 1,
    production_authorized: false,
    live_promotion_authorized: false,
  };
}

export function assertStagingEmailApprovalCovers({ approval, request, now }) {
  if (!approval || typeof approval !== "object") fail("STAGING_EMAIL_APPROVAL_REQUIRED", "an explicit staging email approval is required");
  if (approval.schema_version !== "1" || approval.scope !== APPROVAL_SCOPE || approval.environment !== "staging" || approval.provider !== "resend") {
    fail("STAGING_EMAIL_APPROVAL_SCOPE", "approval is not a Resend staging-email verification approval");
  }
  if (approval.decision !== "APPROVED") fail("STAGING_EMAIL_NOT_APPROVED", "staging email decision is not APPROVED");
  if (approval.production_authorized !== false || approval.live_promotion_authorized !== false) {
    fail("PRODUCTION_EMAIL_REJECTED", "staging verification cannot authorize production or live promotion");
  }
  if (approval.send_count_limit !== 1) fail("STAGING_EMAIL_LIMIT", "staging email approval must be limited to one recipient send");
  const verificationTime = new Date(now);
  const decidedAt = Date.parse(approval.decided_at);
  const expiresAt = Date.parse(approval.expires_at);
  if (!Number.isFinite(verificationTime.getTime()) || !Number.isFinite(decidedAt) || !Number.isFinite(expiresAt) || expiresAt <= decidedAt) {
    fail("STAGING_EMAIL_APPROVAL_TIME", "staging email approval window is invalid");
  }
  if (expiresAt - decidedAt > 60 * 60 * 1000) {
    fail("STAGING_EMAIL_APPROVAL_WINDOW", "staging email approval window cannot exceed one hour");
  }
  if (verificationTime.getTime() < decidedAt || verificationTime.getTime() > expiresAt) {
    fail("STAGING_EMAIL_APPROVAL_EXPIRED", "staging email approval is outside its allowed window");
  }
  const bindings = {
    release_id: request.release_id,
    audience_snapshot_id: request.audience_snapshot_id,
    recipient_user_id: request.recipient_user_id,
    recipient_email_sha256: request.recipient_email_sha256,
    weekly_send_key: request.weekly_send_key,
    delivery_id: request.delivery_id,
    content_sha256: request.content_sha256,
    subject_sha256: request.subject_sha256,
    sender_domain: request.sender_domain,
  };
  for (const [key, expected] of Object.entries(bindings)) {
    if (approval[key] !== expected) fail("STAGING_EMAIL_APPROVAL_MISMATCH", `staging email approval does not match ${key}`);
  }
  if (!approval.authorizer?.actor_id || approval.authorizer.role !== "release_owner") {
    fail("STAGING_EMAIL_AUTHORIZER", "staging email approval authorizer is invalid");
  }
  return Object.freeze({ ...approval, verified_at: verificationTime.toISOString() });
}

export function createResendServiceEmailAdapter({
  apiKey,
  emailDomain,
  resourceStatus,
  domainStatus,
  environment = "staging",
  fetchImpl = globalThis.fetch,
  fromName = "Production AI Engineering",
  fromLocalPart = "hello",
  replyToLocalPart = "hello",
} = {}) {
  if (environment !== "staging") fail("PRODUCTION_EMAIL_REJECTED", "Resend adapter is staging-only");
  if (emailDomain !== "surfaces.systems") fail("RESEND_DOMAIN", "Resend email domain must be the configured staging domain");
  if (typeof fetchImpl !== "function") fail("RESEND_FETCH", "a fetch implementation is required");

  function previewSubscriberUpdate(input) {
    const request = buildStagingEmailApprovalRequest({
      releaseId: input.releaseId,
      audienceSnapshotId: input.audienceSnapshotId,
      weeklySendKey: input.weeklySendKey,
      userId: input.userId,
      recipientEmail: input.email,
      subject: input.subject,
      text: input.text,
      html: input.html,
      senderDomain: emailDomain,
    });
    if (input.deliveryId !== request.delivery_id) fail("DELIVERY_ID_MISMATCH", "delivery ID is not deterministic for this send");
    return Object.freeze({
      mode: "no_send",
      provider: "resend",
      environment,
      resource_status: resourceStatus,
      domain_status: domainStatus,
      delivery_id: request.delivery_id,
      release_id: request.release_id,
      recipient_email_sha256: request.recipient_email_sha256,
      content_sha256: request.content_sha256,
      external_mutations: 0,
    });
  }

  async function sendSubscriberUpdate(input) {
    const preview = previewSubscriberUpdate(input);
    if (domainStatus !== "verified") fail("RESEND_DOMAIN_NOT_VERIFIED", "Resend domain is not verified for sending");
    nonempty(apiKey, "Resend API key");
    const request = buildStagingEmailApprovalRequest({
      releaseId: input.releaseId,
      audienceSnapshotId: input.audienceSnapshotId,
      weeklySendKey: input.weeklySendKey,
      userId: input.userId,
      recipientEmail: input.email,
      subject: input.subject,
      text: input.text,
      html: input.html,
      senderDomain: emailDomain,
    });
    assertStagingEmailApprovalCovers({ approval: input.approval, request, now: input.now ?? new Date() });

    const response = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.deliveryId,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromLocalPart}@${emailDomain}>`,
        to: [normalizeRecipientEmail(input.email)],
        reply_to: `${replyToLocalPart}@${emailDomain}`,
        subject: input.subject,
        text: input.text,
        html: input.html,
        tags: [
          { name: "release_id", value: input.releaseId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256) },
          { name: "delivery_id", value: input.deliveryId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256) },
        ],
      }),
    });
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    if (!response.ok || typeof body?.id !== "string" || body.id === "") {
      fail("RESEND_PROVIDER_ERROR", `Resend staging request failed with status ${response.status}`);
    }
    return Object.freeze({
      providerMessageId: body.id,
      deliveryId: preview.delivery_id,
      acceptedAt: new Date().toISOString(),
    });
  }

  return Object.freeze({ previewSubscriberUpdate, sendSubscriberUpdate });
}

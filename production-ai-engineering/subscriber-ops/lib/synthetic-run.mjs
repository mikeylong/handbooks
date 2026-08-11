import {
  appendAuditEvent,
  assertApprovalCovers,
  assertAudienceSnapshot,
  assertDeliveryPlan,
  assertPromotionReceipt,
  assertReleaseManifest,
  assertTransition,
  buildRecipientDeliveryId,
  buildWeeklySendKey,
  recipientSetSha256,
  sha256Canonical,
  sha256Text,
  verifyAuditChain,
} from "./contracts.mjs";

function approval({ id, scope, releaseId, manifestSha, action, decidedAt, expiresAt, audienceSha = null, contentSha = null, recipientCeiling = null, notBefore = null, notAfter = null }) {
  return {
    schema_version: "1",
    approval_id: id,
    scope,
    environment: "test",
    release_id: releaseId,
    decision: "APPROVED",
    decided_at: decidedAt,
    expires_at: expiresAt,
    authorizer: { actor_id: "owner_synthetic", role: "release_owner", method: "recorded_manual" },
    bound_artifacts: {
      manifest_sha256: manifestSha,
      audience_sha256: audienceSha,
      content_sha256: contentSha,
      refund_request_sha256: null,
    },
    allowed_actions: [action],
    recipient_ceiling: recipientCeiling,
    scheduled_not_before: notBefore,
    scheduled_not_after: notAfter,
    reason: "Synthetic contract rehearsal only; no external action is authorized.",
  };
}

export function buildSyntheticRun(fixture) {
  const manifest = {
    schema_version: "1",
    release_id: fixture.release_id,
    release_kind: fixture.release_kind,
    created_at: fixture.created_at,
    edition_version: fixture.edition_version,
    previous_release_id: fixture.previous_release_id,
    candidate: {
      run_id: fixture.candidate_run_id,
      run_dir: fixture.candidate_run_dir,
      status: "ready",
      pdf: fixture.candidate_pdf,
      reports: fixture.reports,
    },
    field_note: {
      path: fixture.field_note.path,
      sha256: fixture.field_note.sha256,
      subject: fixture.field_note.subject,
      edition_changed: fixture.field_note.edition_changed,
    },
    distribution: {
      delivery_date: fixture.delivery_date,
      timezone: "America/Los_Angeles",
      audience_rule_version: fixture.audience_rule_version,
    },
    protected_state: {
      canonical_source_unchanged: true,
      production_pdf_unchanged: true,
    },
  };
  assertReleaseManifest(manifest);
  const manifestSha = sha256Canonical(manifest);

  const editorialApproval = approval({
    id: "apr_editorial_synthetic",
    scope: "EDITORIAL",
    releaseId: manifest.release_id,
    manifestSha,
    action: "approve_editorial_manifest",
    decidedAt: "2026-08-04T18:10:00.000Z",
    expiresAt: "2026-08-05T00:00:00.000Z",
  });
  assertApprovalCovers({
    approval: editorialApproval,
    requiredScope: "EDITORIAL",
    requiredAction: "approve_editorial_manifest",
    environment: "test",
    releaseId: manifest.release_id,
    manifestSha256: manifestSha,
    now: new Date("2026-08-04T18:11:00.000Z"),
  });

  const promotionApproval = approval({
    id: "apr_promotion_synthetic",
    scope: "PROMOTION",
    releaseId: manifest.release_id,
    manifestSha,
    action: "promote_private_release",
    decidedAt: "2026-08-04T18:12:00.000Z",
    expiresAt: "2026-08-05T00:00:00.000Z",
  });
  assertApprovalCovers({
    approval: promotionApproval,
    requiredScope: "PROMOTION",
    requiredAction: "promote_private_release",
    environment: "test",
    releaseId: manifest.release_id,
    manifestSha256: manifestSha,
    now: new Date("2026-08-04T18:13:00.000Z"),
  });

  const promotionReceipt = {
    schema_version: "1",
    release_id: manifest.release_id,
    manifest_sha256: manifestSha,
    approval_id: promotionApproval.approval_id,
    object_key: `private/handbook/${manifest.release_id}/${manifest.candidate.pdf.sha256}.pdf`,
    expected: {
      sha256: manifest.candidate.pdf.sha256,
      byte_count: manifest.candidate.pdf.byte_count,
      content_type: manifest.candidate.pdf.content_type,
      filename: manifest.candidate.pdf.filename,
    },
    observed: {
      sha256: manifest.candidate.pdf.sha256,
      byte_count: manifest.candidate.pdf.byte_count,
      content_type: manifest.candidate.pdf.content_type,
      filename: manifest.candidate.pdf.filename,
    },
    verified_at: "2026-08-04T18:20:00.000Z",
    previous_release_id: manifest.previous_release_id,
    database_receipt_ref: "dbtxn_synthetic_release_activation",
  };
  assertPromotionReceipt(promotionReceipt);

  const recipientRefs = [...fixture.recipient_refs].sort();
  const audience = {
    schema_version: "1",
    snapshot_id: "aud_2026_08_04_synthetic",
    release_id: manifest.release_id,
    created_at: "2026-08-04T18:25:00.000Z",
    eligibility_as_of: "2026-08-04T18:25:00.000Z",
    rule_version: fixture.audience_rule_version,
    communication_basis: "contractual_subscriber_delivery",
    recipient_count: recipientRefs.length,
    recipient_set_sha256: recipientSetSha256(recipientRefs),
    recipient_refs: recipientRefs,
    exclusions: {
      expired: 1,
      past_due_policy: 0,
      refunded_or_revoked: 0,
      unverified_email: 0,
      suppressed: 1,
      already_delivered: 0,
    },
  };
  assertAudienceSnapshot(audience);
  const audienceSha = sha256Canonical(audience);
  const contentSha = sha256Text(fixture.email.body);

  const deliveryPlan = {
    schema_version: "1",
    delivery_plan_id: "dlp_2026_08_04_synthetic",
    release_id: manifest.release_id,
    manifest_sha256: manifestSha,
    audience_snapshot_id: audience.snapshot_id,
    audience_sha256: audienceSha,
    recipient_count: audience.recipient_count,
    content: {
      subject: fixture.email.subject,
      body_sha256: contentSha,
      from_name: fixture.email.from_name,
      reply_to: fixture.email.reply_to,
      access_url_origin: fixture.email.access_url_origin,
    },
    window: {
      not_before: "2026-08-04T18:30:00.000Z",
      not_after: "2026-08-04T19:00:00.000Z",
      timezone: "America/Los_Angeles",
    },
    weekly_send_key: buildWeeklySendKey(manifest.release_id, audience.snapshot_id, contentSha),
  };
  assertDeliveryPlan(deliveryPlan);

  const sendApproval = approval({
    id: "apr_send_synthetic",
    scope: "SEND",
    releaseId: manifest.release_id,
    manifestSha,
    audienceSha,
    contentSha,
    action: "send_subscriber_update",
    decidedAt: "2026-08-04T18:27:00.000Z",
    expiresAt: "2026-08-04T19:00:00.000Z",
    recipientCeiling: audience.recipient_count,
    notBefore: deliveryPlan.window.not_before,
    notAfter: deliveryPlan.window.not_after,
  });
  assertApprovalCovers({
    approval: sendApproval,
    requiredScope: "SEND",
    requiredAction: "send_subscriber_update",
    environment: "test",
    releaseId: manifest.release_id,
    manifestSha256: manifestSha,
    audienceSha256: audienceSha,
    contentSha256: contentSha,
    recipientCount: audience.recipient_count,
    now: new Date("2026-08-04T18:45:00.000Z"),
  });

  const statePath = [
    "CANDIDATE_INGESTED",
    "REVIEW_PENDING",
    "EDITORIALLY_APPROVED",
    "PROMOTION_PLANNED",
    "PRIVATE_ASSET_VERIFIED",
    "AUDIENCE_SNAPSHOT_READY",
    "SEND_APPROVED",
    "DELIVERING",
    "DELIVERED",
    "MONITORING",
    "CLOSED",
  ];
  for (let index = 1; index < statePath.length; index += 1) assertTransition(statePath[index - 1], statePath[index]);

  let audit = [];
  statePath.forEach((state, index) => {
    audit = appendAuditEvent(audit, {
      event_id: `aevt_synthetic_${String(index + 1).padStart(2, "0")}`,
      aggregate_id: manifest.release_id,
      event_type: `release.${state.toLowerCase()}`,
      occurred_at: new Date(Date.parse("2026-08-04T18:00:00.000Z") + index * 60_000).toISOString(),
      actor: { type: index === 2 || index === 6 ? "human" : "service", id: index === 2 || index === 6 ? "owner_synthetic" : "subscriber_ops_dry_run" },
      idempotency_key: `synthetic:${manifest.release_id}:${state}`,
      payload: { state, manifest_sha256: manifestSha },
    });
  });
  const auditHeadSha256 = verifyAuditChain(audit);

  const deliveries = recipientRefs.map((userId) => ({
    user_id: userId,
    delivery_id: buildRecipientDeliveryId(deliveryPlan.weekly_send_key, userId),
    result: "synthetic_not_sent",
  }));

  return {
    manifest,
    manifestSha,
    approvals: { editorial: editorialApproval, promotion: promotionApproval, send: sendApproval },
    promotionReceipt,
    audience,
    audienceSha,
    deliveryPlan,
    deliveries,
    statePath,
    audit,
    auditHeadSha256,
  };
}

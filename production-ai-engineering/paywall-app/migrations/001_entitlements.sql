BEGIN;

CREATE SCHEMA IF NOT EXISTS paywall;

CREATE TABLE IF NOT EXISTS paywall.entitlements (
  user_id text PRIMARY KEY,
  email text,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL CHECK (
    status IN (
      'incomplete', 'incomplete_expired', 'trialing', 'active',
      'past_due', 'canceled', 'unpaid', 'paused'
    )
  ),
  current_period_end bigint,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  revocation_reason text CHECK (
    revocation_reason IS NULL OR
    revocation_reason IN ('refund', 'chargeback', 'subscription_ended')
  ),
  paid_billing_cycles integer NOT NULL DEFAULT 0 CHECK (paid_billing_cycles >= 0),
  past_due_since bigint,
  latest_event_created bigint NOT NULL,
  latest_event_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS paywall.stripe_events (
  event_id text PRIMARY KEY,
  event_created bigint NOT NULL,
  event_type text NOT NULL,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  user_id text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('applied', 'stale')),
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_events_user_id_idx
  ON paywall.stripe_events (user_id, event_created DESC);

CREATE TABLE IF NOT EXISTS paywall.analytics_outbox (
  event_id text PRIMARY KEY,
  occurred_at timestamptz NOT NULL,
  event_name text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'leased', 'delivered', 'quarantined')
  ),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_outbox_pending_idx
  ON paywall.analytics_outbox (status, next_attempt_at)
  WHERE status IN ('pending', 'leased');

CREATE OR REPLACE FUNCTION paywall.apply_stripe_event(
  p_event_id text,
  p_event_created bigint,
  p_event_type text,
  p_payload_sha256 text,
  p_user_id text,
  p_email text,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_current_period_end bigint,
  p_cancel_at_period_end boolean,
  p_revocation_reason text,
  p_billing_reason text
)
RETURNS TABLE (outcome text, resolved_user_id text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = paywall, pg_temp
AS $$
DECLARE
  v_user_id text;
  v_mapped_user_id text;
  v_latest_event_created bigint;
  v_outcome text;
  v_existing_payload_sha256 text;
BEGIN
  SELECT se.user_id, se.payload_sha256
    INTO v_user_id, v_existing_payload_sha256
    FROM paywall.stripe_events se
   WHERE se.event_id = p_event_id;

  IF FOUND THEN
    IF v_existing_payload_sha256 <> p_payload_sha256 THEN
      RAISE EXCEPTION 'Stripe event ID was reused with different payload bytes';
    END IF;
    RETURN QUERY SELECT 'duplicate'::text, v_user_id;
    RETURN;
  END IF;

  SELECT e.user_id
    INTO v_mapped_user_id
    FROM paywall.entitlements e
   WHERE (p_subscription_id IS NOT NULL AND e.stripe_subscription_id = p_subscription_id)
      OR (p_customer_id IS NOT NULL AND e.stripe_customer_id = p_customer_id)
   LIMIT 1;

  IF p_user_id IS NOT NULL
     AND v_mapped_user_id IS NOT NULL
     AND p_user_id <> v_mapped_user_id THEN
    RAISE EXCEPTION 'Stripe identity does not match the existing entitlement';
  END IF;

  v_user_id := COALESCE(p_user_id, v_mapped_user_id);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Cannot resolve subscriber identity for Stripe event %', p_event_id;
  END IF;

  SELECT e.latest_event_created
    INTO v_latest_event_created
    FROM paywall.entitlements e
   WHERE e.user_id = v_user_id;

  v_outcome := CASE
    WHEN v_latest_event_created IS NOT NULL
     AND p_event_created < v_latest_event_created THEN 'stale'
    ELSE 'applied'
  END;

  IF v_outcome = 'applied' THEN
    INSERT INTO paywall.entitlements (
      user_id,
      email,
      stripe_customer_id,
      stripe_subscription_id,
      status,
      current_period_end,
      cancel_at_period_end,
      revocation_reason,
      paid_billing_cycles,
      past_due_since,
      latest_event_created,
      latest_event_id,
      updated_at
    ) VALUES (
      v_user_id,
      p_email,
      p_customer_id,
      p_subscription_id,
      p_status,
      p_current_period_end,
      COALESCE(p_cancel_at_period_end, false),
      p_revocation_reason,
      CASE
        WHEN p_event_type = 'invoice.payment_succeeded'
         AND p_billing_reason = 'subscription_cycle' THEN 2
        WHEN p_event_type = 'invoice.payment_succeeded' THEN 1
        ELSE 0
      END,
      CASE WHEN p_status = 'past_due' THEN p_event_created ELSE NULL END,
      p_event_created,
      p_event_id,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, entitlements.email),
      stripe_customer_id = COALESCE(
        EXCLUDED.stripe_customer_id,
        entitlements.stripe_customer_id
      ),
      stripe_subscription_id = COALESCE(
        EXCLUDED.stripe_subscription_id,
        entitlements.stripe_subscription_id
      ),
      status = EXCLUDED.status,
      current_period_end = COALESCE(
        EXCLUDED.current_period_end,
        entitlements.current_period_end
      ),
      cancel_at_period_end = COALESCE(
        p_cancel_at_period_end,
        entitlements.cancel_at_period_end
      ),
      revocation_reason = p_revocation_reason,
      paid_billing_cycles = CASE
        WHEN p_event_type = 'invoice.payment_succeeded'
         AND p_billing_reason = 'subscription_cycle'
          THEN GREATEST(entitlements.paid_billing_cycles + 1, 2)
        WHEN p_event_type = 'invoice.payment_succeeded'
          THEN GREATEST(entitlements.paid_billing_cycles, 1)
        ELSE entitlements.paid_billing_cycles
      END,
      past_due_since = CASE
        WHEN p_status = 'past_due'
          THEN COALESCE(entitlements.past_due_since, p_event_created)
        WHEN p_status IN ('active', 'trialing') THEN NULL
        ELSE entitlements.past_due_since
      END,
      latest_event_created = EXCLUDED.latest_event_created,
      latest_event_id = EXCLUDED.latest_event_id,
      updated_at = now();
  END IF;

  INSERT INTO paywall.stripe_events (
    event_id,
    event_created,
    event_type,
    payload_sha256,
    user_id,
    outcome
  ) VALUES (
    p_event_id,
    p_event_created,
    p_event_type,
    p_payload_sha256,
    v_user_id,
    v_outcome
  );

  RETURN QUERY SELECT v_outcome, v_user_id;
END;
$$;

COMMIT;

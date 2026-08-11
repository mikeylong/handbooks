const RRULE_WEEKDAYS = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

function fail(message) {
  throw new Error(message);
}

function automationString(source, key) {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"\\s*$`, "m"));
  if (!match) fail(`Automation config is missing ${key}`);
  return match[1];
}

function parsePolicy(source) {
  const policy = JSON.parse(source);
  const expectedKeys = ["version", "automationId", "timeZone", "releasePolicy", "editions"];
  const unknownKeys = Object.keys(policy).filter((key) => !expectedKeys.includes(key));
  if (unknownKeys.length) fail(`Release policy has unknown keys: ${unknownKeys.join(", ")}`);
  if (policy.version !== 1) fail("Release policy version must be 1");
  if (typeof policy.automationId !== "string" || !policy.automationId) {
    fail("Release policy automationId must be a non-empty string");
  }
  if (typeof policy.timeZone !== "string" || !policy.timeZone) {
    fail("Release policy timeZone must be a non-empty IANA timezone");
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: policy.timeZone }).format(new Date());
  } catch {
    fail(`Release policy has an invalid IANA timezone: ${policy.timeZone}`);
  }
  if (policy.releasePolicy !== "manual_after_review") {
    fail("Release policy must require manual review");
  }
  if (
    !Array.isArray(policy.editions)
    || JSON.stringify(policy.editions) !== JSON.stringify(["site", "pdf"])
  ) {
    fail('Release policy editions must be ["site", "pdf"]');
  }
  return policy;
}

export function parseReleaseAuthority(automationSource, policySource) {
  const id = automationString(automationSource, "id");
  const status = automationString(automationSource, "status");
  const rrule = automationString(automationSource, "rrule");
  const fields = Object.fromEntries(rrule.split(";").map((part) => part.split("=", 2)));
  const weekday = RRULE_WEEKDAYS[fields.BYDAY];
  const hour = Number(fields.BYHOUR);
  const minute = Number(fields.BYMINUTE);
  const policy = parsePolicy(policySource);

  if (policy.automationId !== id) fail("Release policy automationId does not match automation.toml");
  if (status !== "ACTIVE") fail(`Release automation ${id} is not active`);
  if (fields.FREQ !== "WEEKLY" || weekday === undefined) {
    fail(`Release automation ${id} must use one weekly BYDAY value`);
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    fail(`Release automation ${id} has an invalid BYHOUR`);
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    fail(`Release automation ${id} has an invalid BYMINUTE`);
  }

  return {
    id,
    status,
    rrule,
    weekday,
    hour,
    minute,
    timeZone: policy.timeZone,
    releasePolicy: policy.releasePolicy,
    editions: [...policy.editions],
  };
}

function zonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return Object.fromEntries(
    formatter.formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );
}

function timeZoneOffsetMs(timestamp, timeZone) {
  const parts = zonedParts(new Date(timestamp), timeZone);
  const roundedTimestamp = Math.floor(timestamp / 1000) * 1000;
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  ) - roundedTimestamp;
}

function zonedDateTimeToUtc({ year, month, day, hour, minute }, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const initialOffset = timeZoneOffsetMs(utcGuess, timeZone);
  let result = utcGuess - initialOffset;
  const correctedOffset = timeZoneOffsetMs(result, timeZone);
  if (correctedOffset !== initialOffset) result = utcGuess - correctedOffset;
  return new Date(result);
}

export function nextWeeklyOccurrence(now, schedule) {
  const current = zonedParts(now, schedule.timeZone);
  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const calendarDate = new Date(Date.UTC(current.year, current.month - 1, current.day + dayOffset));
    if (calendarDate.getUTCDay() !== schedule.weekday) continue;
    const candidate = zonedDateTimeToUtc({
      year: calendarDate.getUTCFullYear(),
      month: calendarDate.getUTCMonth() + 1,
      day: calendarDate.getUTCDate(),
      hour: schedule.hour,
      minute: schedule.minute,
    }, schedule.timeZone);
    if (candidate.getTime() > now.getTime()) return candidate;
  }
  fail(`Could not calculate the next run for ${schedule.id}`);
}

export function buildReleaseSchedule(automationSource, policySource, now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    fail("Release schedule build time must be a valid date-time");
  }
  const authority = parseReleaseAuthority(automationSource, policySource);
  const nextReviewAt = nextWeeklyOccurrence(now, authority);
  return {
    version: 1,
    automationId: authority.id,
    automationStatus: authority.status,
    rrule: authority.rrule,
    timeZone: authority.timeZone,
    generatedAt: now.toISOString(),
    nextReviewAt: nextReviewAt.toISOString(),
    releasePolicy: authority.releasePolicy,
    editions: authority.editions,
  };
}

export function releaseReviewLabel(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function releaseTimeZoneLabel(timeZone) {
  return timeZone === "America/Los_Angeles"
    ? "Pacific time"
    : timeZone.replaceAll("_", " ");
}

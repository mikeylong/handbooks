#!/bin/zsh

set -u
set -o pipefail
umask 077

export PATH="/Users/mike/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

WORKSPACE="/Users/mike/production-ai-engineering-book"
NODE_BIN="/Users/mike/.nvm/versions/node/v22.16.0/bin/node"
PYTHON_BIN="/opt/homebrew/bin/python3.12"
PYTHON_PACKAGES="/Users/mike/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/lib/python3.12/site-packages"
PLAYWRIGHT_CORE="/Users/mike/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core"
PREPARER_SCRIPT="$WORKSPACE/automation/prepare-weekly-handbook-review.sh"
FINALIZER_SCRIPT="$WORKSPACE/automation/run-weekly-handbook-review.sh"
RESEARCH_PROMPT="$WORKSPACE/automation/weekly-handbook-review.md"
FINAL_PROMPT="$WORKSPACE/automation/weekly-handbook-review-final.md"
EXPORT_DATA="$WORKSPACE/automation/export-handbook-data.mjs"
MATERIALIZE_DATA="$WORKSPACE/automation/materialize-handbook-data.mjs"
GENERATE_CHANGELOG="$WORKSPACE/automation/generate-candidate-changelog.mjs"
VALIDATE_ARTIFACTS="$WORKSPACE/automation/validate-weekly-artifacts.mjs"
VALIDATE_REVIEW_STATUS="$WORKSPACE/automation/validate-review-status.mjs"
AUTOMATION_CONFIG="$WORKSPACE/automation/automation.toml"
RELEASE_POLICY="$WORKSPACE/automation/release-policy.json"
RENDER_PDF="$WORKSPACE/automation/render-handbook-pdf.mjs"
CANONICAL_SOURCE="$WORKSPACE/AI_ENGINEERING_FIELD_GUIDE.md"
PRODUCTION_PDF="$WORKSPACE/output/pdf/production-ai-engineering.pdf"
DEFAULT_CANDIDATE_ROOT="$WORKSPACE/output/candidates"
CANDIDATE_ROOT="${HANDBOOK_CANDIDATE_ROOT:-$DEFAULT_CANDIDATE_ROOT}"
if [[ "$CANDIDATE_ROOT" != "$DEFAULT_CANDIDATE_ROOT" \
  && "$CANDIDATE_ROOT" != /private/tmp/weekly-handbook-test.*/* ]]; then
  /usr/bin/printf 'HANDBOOK_CANDIDATE_ROOT is restricted to a weekly-handbook test directory.\n' >&2
  exit 64
fi
PDF_TIMEOUT_SECONDS=300

BROWSER_BIN=$(
  /usr/bin/find /Users/mike/Library/Caches/ms-playwright \
    -type f \
    -path '*/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell' \
    -perm -111 \
    -print 2>/dev/null \
    | LC_ALL=C /usr/bin/sort \
    | /usr/bin/tail -n 1
)

RUN_DIR=""
RUN_ID=""
RUN_DATE=""
RUN_VERSION=""
RUN_STARTED_AT=""
PRISTINE_DIR=""
STAGE_DIR=""
BUILD_DIR=""
TOOLCHAIN_DIR=""
RESEARCH_OUTPUT_DIR=""
FINAL_REVIEW_DIR=""
CANDIDATE_PDF=""
PAGE_COUNT=""
CHANGE_COUNT=0
CHANGELOG_REQUIRED="unknown"
CHANGELOG_SUMMARY=""
EXPECTED_REVIEW_STATUS="unknown"
RECOMMENDED_VERSION_BUMP="unknown"
RESEARCH_COMPLETED=false
RESEARCH_CHECKPOINT_PATH="none"
RESEARCH_CHECKPOINT_DATE=""
RESEARCH_OVERLAP_START=""
CANONICAL_SOURCE_UNCHANGED=false
PRODUCTION_PDF_UNCHANGED=false
CANONICAL_WORKSPACE_UNCHANGED=false

run_with_timeout() {
  local timeout_seconds="$1"
  shift
  /usr/bin/perl -e '
    use strict;
    use warnings;
    my $timeout = shift @ARGV;
    my $pid = fork();
    die "fork failed" unless defined $pid;
    if ($pid == 0) {
      setpgrp(0, 0);
      exec @ARGV;
      exit 127;
    }
    $SIG{ALRM} = sub {
      kill "TERM", -$pid;
      select undef, undef, undef, 10;
      kill "KILL", -$pid;
      waitpid($pid, 0);
      exit 124;
    };
    alarm $timeout;
    waitpid($pid, 0);
    alarm 0;
    exit 128 + ($? & 127) if $? & 127;
    exit $? >> 8;
  ' "$timeout_seconds" "$@"
}

write_file_hash() {
  local protected_path="$1"
  local output_path="$2"
  if [[ -f "$protected_path" && ! -L "$protected_path" ]]; then
    /usr/bin/shasum -a 256 "$protected_path" > "$output_path"
  else
    /usr/bin/printf 'MISSING %s\n' "$protected_path" > "$output_path"
  fi
}

write_canonical_manifest() {
  {
    /usr/bin/printf '%s\n' "$CANONICAL_SOURCE" "$PRODUCTION_PDF"
    /usr/bin/find "$WORKSPACE/handbook" -type f \
      ! -path '*/__pycache__/*' \
      -print
    /usr/bin/find "$WORKSPACE/automation" -maxdepth 1 -type f -print
  } | LC_ALL=C /usr/bin/sort -u | while IFS= read -r canonical_file; do
    /usr/bin/shasum -a 256 "$canonical_file" || return 1
  done
}

refresh_protected_state() {
  write_file_hash "$CANONICAL_SOURCE" "$RUN_DIR/canonical-source-after-sha256.txt" || return 1
  write_file_hash "$PRODUCTION_PDF" "$RUN_DIR/production-pdf-after-sha256.txt" || return 1
  write_canonical_manifest > "$RUN_DIR/canonical-after-sha256.txt" || return 1

  CANONICAL_SOURCE_UNCHANGED=false
  PRODUCTION_PDF_UNCHANGED=false
  CANONICAL_WORKSPACE_UNCHANGED=false
  /usr/bin/cmp -s \
    "$RUN_DIR/canonical-source-before-sha256.txt" \
    "$RUN_DIR/canonical-source-after-sha256.txt" \
    && CANONICAL_SOURCE_UNCHANGED=true
  /usr/bin/cmp -s \
    "$RUN_DIR/production-pdf-before-sha256.txt" \
    "$RUN_DIR/production-pdf-after-sha256.txt" \
    && PRODUCTION_PDF_UNCHANGED=true
  /usr/bin/cmp -s \
    "$RUN_DIR/canonical-before-sha256.txt" \
    "$RUN_DIR/canonical-after-sha256.txt" \
    && CANONICAL_WORKSPACE_UNCHANGED=true

  {
    /usr/bin/diff -u \
      "$RUN_DIR/canonical-source-before-sha256.txt" \
      "$RUN_DIR/canonical-source-after-sha256.txt" || true
    /usr/bin/diff -u \
      "$RUN_DIR/production-pdf-before-sha256.txt" \
      "$RUN_DIR/production-pdf-after-sha256.txt" || true
    /usr/bin/diff -u \
      "$RUN_DIR/canonical-before-sha256.txt" \
      "$RUN_DIR/canonical-after-sha256.txt" || true
  } > "$RUN_DIR/protected-files.diff"
}

write_candidate_manifest() {
  {
    /usr/bin/find "$BUILD_DIR" -type f ! -path '*/__pycache__/*' -print
    /usr/bin/find "$STAGE_DIR" -type f -print
    for candidate_file in \
      "$CANDIDATE_PDF" \
      "$RUN_DIR/exact-changes.patch" \
      "$RUN_DIR/change-report.md" \
      "$RUN_DIR/changes.json" \
      "$RUN_DIR/coverage.json" \
      "$RUN_DIR/release-recommendation.json" \
      "$RUN_DIR/sources.md" \
      "$RUN_DIR/sources.json" \
      "$RUN_DIR/blocked-sources.md" \
      "$RUN_DIR/research-agent-summary.md" \
      "$RUN_DIR/page-map.json" \
      "$RUN_DIR/previous-version.diff" \
      "$RUN_DIR/pdf-text.diff" \
      "$RUN_DIR/candidate-sha256.txt" \
      "$RUN_DIR/review-status.json" \
      "$RUN_DIR/run-summary.md"; do
      if [[ -f "$candidate_file" && ! -L "$candidate_file" ]]; then
        /usr/bin/printf '%s\n' "$candidate_file"
      fi
    done
    if [[ -d "$RUN_DIR/proof" && ! -L "$RUN_DIR/proof" ]]; then
      /usr/bin/find "$RUN_DIR/proof" -type f -print
    fi
  } | LC_ALL=C /usr/bin/sort -u | while IFS= read -r candidate_file; do
    /usr/bin/shasum -a 256 "$candidate_file" || return 1
  done
}

write_candidate_manifest_file() {
  write_candidate_manifest > "$RUN_DIR/candidate-sha256-manifest.txt"
}

write_failure() {
  local exit_code="$1"
  local failed_phase="$2"
  local failed_log="$3"

  refresh_protected_state >/dev/null 2>&1 || true
  /usr/bin/printf '{"version":1,"candidate_id":"%s","status":"failed_review","production_unchanged":%s,"validation_passed":false,"visual_proof_passed":false,"notes":["The deterministic finalizer rejected this candidate during %s. See status.txt and the failed log."]}\n' \
    "$RUN_ID" "$PRODUCTION_PDF_UNCHANGED" "$failed_phase" \
    > "$RUN_DIR/review-status.json"
  {
    /usr/bin/printf '# Weekly handbook candidate finalization failed\n\n'
    /usr/bin/printf 'The candidate is not ready. Phase `%s` exited with status `%s`.\n\n' \
      "$failed_phase" "$exit_code"
    /usr/bin/printf -- '- Failed log: `%s`\n' "$failed_log"
    /usr/bin/printf -- '- Canonical source unchanged: `%s`\n' "$CANONICAL_SOURCE_UNCHANGED"
    /usr/bin/printf -- '- Canonical workspace unchanged: `%s`\n' "$CANONICAL_WORKSPACE_UNCHANGED"
    /usr/bin/printf -- '- Production PDF unchanged: `%s`\n' "$PRODUCTION_PDF_UNCHANGED"
    /usr/bin/printf -- '- No publication or automatic rerun occurred.\n'
  } > "$RUN_DIR/run-summary.md"
  /usr/bin/printf 'status=failed\nexit_code=%s\nrun_date=%s\nrun_started_at=%s\nfailed_phase=%s\nfailed_log=%s\ncandidate_ready=false\nresearch_completed=%s\nresearch_checkpoint_path=%s\nresearch_checkpoint_date=%s\nresearch_overlap_start=%s\nreader_facing_content_changed=%s\nrecommended_version_bump=%s\ncanonical_source_unchanged=%s\ncanonical_workspace_unchanged=%s\nproduction_pdf_unchanged=%s\ncandidate_pdf=%s\n' \
    "$exit_code" "$RUN_DATE" "$RUN_STARTED_AT" "$failed_phase" "$failed_log" \
    "$RESEARCH_COMPLETED" "$RESEARCH_CHECKPOINT_PATH" "$RESEARCH_CHECKPOINT_DATE" \
    "$RESEARCH_OVERLAP_START" "$CHANGELOG_REQUIRED" "$RECOMMENDED_VERSION_BUMP" \
    "$CANONICAL_SOURCE_UNCHANGED" "$CANONICAL_WORKSPACE_UNCHANGED" \
    "$PRODUCTION_PDF_UNCHANGED" "$CANDIDATE_PDF" > "$RUN_DIR/status.txt"
  /usr/bin/printf 'weekly_handbook_run_dir=%s\nweekly_handbook_pdf=%s\nweekly_handbook_status=%s\n' \
    "$RUN_DIR" "$CANDIDATE_PDF" "$exit_code"
}

fail_run() {
  local exit_code="$1"
  local failed_phase="$2"
  local failed_log="$3"
  write_failure "$exit_code" "$failed_phase" "$failed_log"
  exit "$exit_code"
}

run_phase() {
  local phase_name="$1"
  local log_path="$2"
  shift 2
  "$@" > "$log_path" 2>&1
  local phase_status=$?
  if [[ "$phase_status" -ne 0 ]]; then
    fail_run "$phase_status" "$phase_name" "$log_path"
  fi
}

runtime_check() {
  local check_status=0
  local required_path
  for required_path in \
    "$NODE_BIN" \
    "$PYTHON_BIN" \
    "$PYTHON_PACKAGES" \
    "$PLAYWRIGHT_CORE/index.mjs" \
    "$PREPARER_SCRIPT" \
    "$FINALIZER_SCRIPT" \
    "$RESEARCH_PROMPT" \
    "$FINAL_PROMPT" \
    "$EXPORT_DATA" \
    "$MATERIALIZE_DATA" \
    "$GENERATE_CHANGELOG" \
    "$VALIDATE_ARTIFACTS" \
    "$VALIDATE_REVIEW_STATUS" \
    "$AUTOMATION_CONFIG" \
    "$RELEASE_POLICY" \
    "$RENDER_PDF" \
    "$CANONICAL_SOURCE" \
    "$PRODUCTION_PDF" \
    "/opt/homebrew/bin/pdfimages" \
    "/opt/homebrew/bin/pdffonts" \
    "/opt/homebrew/bin/pdfinfo" \
    "/opt/homebrew/bin/pdftoppm" \
    "/opt/homebrew/bin/pdftotext" \
    "/usr/bin/perl" \
    "/usr/bin/shasum"; do
    if [[ ! -e "$required_path" ]]; then
      /usr/bin/printf 'Missing required path: %s\n' "$required_path"
      check_status=1
    fi
  done
  if [[ -z "$BROWSER_BIN" || ! -x "$BROWSER_BIN" ]]; then
    /usr/bin/printf 'Missing executable Playwright Chromium headless shell.\n'
    check_status=1
  else
    "$BROWSER_BIN" --version || check_status=1
  fi
  "$NODE_BIN" --version || check_status=1
  PYTHONPATH="$PYTHON_PACKAGES" "$PYTHON_BIN" -c \
    'import pdfplumber, pypdf, reportlab; print("Python PDF dependencies: ok")' \
    || check_status=1
  run_with_timeout 5 /usr/bin/true || check_status=1
  return "$check_status"
}

read_context() {
  local context_file
  for context_file in \
    "$RUN_DIR/run-date.txt" \
    "$RUN_DIR/run-version.txt" \
    "$RUN_DIR/run-started-at.txt" \
    "$RUN_DIR/research-checkpoint-path.txt" \
    "$RUN_DIR/research-checkpoint-date.txt" \
    "$RUN_DIR/research-overlap-start.txt"; do
    if [[ ! -f "$context_file" || -L "$context_file" || ! -s "$context_file" ]]; then
      /usr/bin/printf 'Missing or unsafe prepared context file: %s\n' "$context_file"
      return 1
    fi
  done
  RUN_DATE=$(/bin/cat "$RUN_DIR/run-date.txt") || return 1
  RUN_VERSION=$(/bin/cat "$RUN_DIR/run-version.txt") || return 1
  RUN_STARTED_AT=$(/bin/cat "$RUN_DIR/run-started-at.txt") || return 1
  RESEARCH_CHECKPOINT_PATH=$(/bin/cat "$RUN_DIR/research-checkpoint-path.txt") || return 1
  RESEARCH_CHECKPOINT_DATE=$(/bin/cat "$RUN_DIR/research-checkpoint-date.txt") || return 1
  RESEARCH_OVERLAP_START=$(/bin/cat "$RUN_DIR/research-overlap-start.txt") || return 1
  if [[ ! "$RUN_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ \
    || ! "$RUN_VERSION" =~ ^[0-9]{8}\.[0-9]{6}$ \
    || ! "$RUN_STARTED_AT" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ \
    || ! "$RESEARCH_CHECKPOINT_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ \
    || ! "$RESEARCH_OVERLAP_START" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    /usr/bin/printf 'Prepared run context has an invalid value.\n'
    return 1
  fi
}

validate_prepared_run() {
  local required_path
  for required_path in \
    "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
    "$PRISTINE_DIR/handbook-data/book-data.json" \
    "$PRISTINE_DIR/handbook-data/index-data.json" \
    "$STAGE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
    "$STAGE_DIR/handbook-data/book-data.json" \
    "$STAGE_DIR/handbook-data/index-data.json" \
    "$TOOLCHAIN_DIR/materialize-handbook-data.mjs" \
    "$TOOLCHAIN_DIR/generate-candidate-changelog.mjs" \
    "$TOOLCHAIN_DIR/validate-weekly-artifacts.mjs" \
    "$TOOLCHAIN_DIR/validate-review-status.mjs" \
    "$TOOLCHAIN_DIR/automation.toml" \
    "$TOOLCHAIN_DIR/release-policy.json" \
    "$TOOLCHAIN_DIR/render-handbook-pdf.mjs" \
    "$RUN_DIR/prepared-input-sha256.txt" \
    "$RUN_DIR/canonical-source-before-sha256.txt" \
    "$RUN_DIR/production-pdf-before-sha256.txt" \
    "$RUN_DIR/canonical-before-sha256.txt"; do
    if [[ ! -e "$required_path" || -L "$required_path" ]]; then
      /usr/bin/printf 'Missing or unsafe prepared path: %s\n' "$required_path"
      return 1
    fi
  done
  /usr/bin/shasum -a 256 -c "$RUN_DIR/prepared-input-sha256.txt" || return 1

  local trusted_path
  local snapshot_path
  for trusted_path in \
    "$PREPARER_SCRIPT" \
    "$FINALIZER_SCRIPT" \
    "$RESEARCH_PROMPT" \
    "$FINAL_PROMPT" \
    "$EXPORT_DATA" \
    "$MATERIALIZE_DATA" \
    "$GENERATE_CHANGELOG" \
    "$VALIDATE_ARTIFACTS" \
    "$VALIDATE_REVIEW_STATUS" \
    "$AUTOMATION_CONFIG" \
    "$RELEASE_POLICY" \
    "$RENDER_PDF"; do
    snapshot_path="$TOOLCHAIN_DIR/${trusted_path:t}"
    if [[ ! -f "$snapshot_path" || -L "$snapshot_path" \
      || ! -f "$trusted_path" || -L "$trusted_path" ]]; then
      /usr/bin/printf 'Prepared toolchain path is missing or unsafe: %s\n' \
        "${trusted_path:t}"
      return 73
    fi
    if ! /usr/bin/cmp -s "$trusted_path" "$snapshot_path"; then
      /usr/bin/printf 'Prepared toolchain drifted from trusted canonical tooling: %s\n' \
        "${trusted_path:t}"
      return 73
    fi
  done

  local handbook_snapshot_diff
  handbook_snapshot_diff=$(
    /usr/bin/rsync -rnic --delete --exclude '__pycache__/' \
      "$WORKSPACE/handbook/" "$PRISTINE_DIR/handbook/"
  ) || return 1
  if [[ -n "$handbook_snapshot_diff" ]]; then
    /usr/bin/printf 'Prepared handbook snapshot drifted from the canonical baseline:\n%s\n' \
      "$handbook_snapshot_diff"
    return 73
  fi
  /usr/bin/printf 'Prepared handbook and toolchain snapshots match the trusted canonical files. Finalization will execute only canonical deterministic tooling.\n'

  refresh_protected_state || return 1
  if [[ "$CANONICAL_SOURCE_UNCHANGED" != true \
    || "$CANONICAL_WORKSPACE_UNCHANGED" != true \
    || "$PRODUCTION_PDF_UNCHANGED" != true ]]; then
    /bin/cat "$RUN_DIR/protected-files.diff"
    return 73
  fi
  /usr/bin/printf 'Prepared run and protected baseline are valid.\n'
}

import_research_artifacts() {
  local artifact_name
  local source_path
  for artifact_name in \
    sources.md \
    sources.json \
    blocked-sources.md \
    change-report.md \
    changes.json \
    coverage.json \
    release-recommendation.json \
    research-agent-summary.md; do
    source_path="$RESEARCH_OUTPUT_DIR/$artifact_name"
    if [[ ! -f "$source_path" || -L "$source_path" || ! -s "$source_path" ]]; then
      /usr/bin/printf 'Missing or unsafe research artifact: %s\n' "$source_path"
      return 1
    fi
    /bin/cp "$source_path" "$RUN_DIR/$artifact_name" || return 1
  done
  /usr/bin/printf 'Imported all required top-level research artifacts.\n'
}

validate_edit_scope() {
  {
    /usr/bin/printf '%s\n' \
      "$STAGE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
      "$STAGE_DIR/handbook-data" \
      "$STAGE_DIR/handbook-data/book-data.json" \
      "$STAGE_DIR/handbook-data/index-data.json"
  } | LC_ALL=C /usr/bin/sort > "$RUN_DIR/expected-candidate-edit-paths.txt" || return 1
  /usr/bin/find "$STAGE_DIR" -mindepth 1 -print | LC_ALL=C /usr/bin/sort \
    > "$RUN_DIR/actual-candidate-edit-paths.txt" || return 1
  /usr/bin/diff -u \
    "$RUN_DIR/expected-candidate-edit-paths.txt" \
    "$RUN_DIR/actual-candidate-edit-paths.txt" \
    > "$RUN_DIR/candidate-edit-scope.diff"
  local scope_status=$?
  if [[ "$scope_status" -gt 1 ]]; then
    return "$scope_status"
  fi
  if [[ "$scope_status" -eq 1 ]]; then
    return 1
  fi
  /usr/bin/printf 'Candidate edit scope is limited to the three authorized files.\n'
}

materialize_candidate() {
  /bin/cp "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
    "$BUILD_DIR/AI_ENGINEERING_FIELD_GUIDE.md" || return 1
  /usr/bin/rsync -a "$PRISTINE_DIR/handbook/" "$BUILD_DIR/handbook/" || return 1
  /bin/cp "$STAGE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
    "$BUILD_DIR/AI_ENGINEERING_FIELD_GUIDE.md" || return 1
  "$NODE_BIN" "$MATERIALIZE_DATA" \
    --book-json "$STAGE_DIR/handbook-data/book-data.json" \
    --index-json "$STAGE_DIR/handbook-data/index-data.json" \
    --book-output "$BUILD_DIR/handbook/book-data.mjs" \
    --index-output "$BUILD_DIR/handbook/index-data.mjs"
}

append_exact_diff() {
  local baseline_path="$1"
  local candidate_path="$2"
  /usr/bin/diff -u "$baseline_path" "$candidate_path" >> "$RUN_DIR/exact-changes.patch"
  local diff_status=$?
  if [[ "$diff_status" -gt 1 ]]; then
    return "$diff_status"
  fi
  return 0
}

write_exact_changes() {
  : > "$RUN_DIR/exact-changes.patch" || return 1
  append_exact_diff \
    "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
    "$STAGE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" || return 1
  append_exact_diff \
    "$PRISTINE_DIR/handbook-data/book-data.json" \
    "$STAGE_DIR/handbook-data/book-data.json" || return 1
  append_exact_diff \
    "$PRISTINE_DIR/handbook-data/index-data.json" \
    "$STAGE_DIR/handbook-data/index-data.json" || return 1
  /usr/bin/printf 'Exact source and declarative-data patch written to %s\n' \
    "$RUN_DIR/exact-changes.patch"
}

validate_research_artifacts() {
  "$NODE_BIN" "$VALIDATE_ARTIFACTS" \
    --artifact-dir "$RUN_DIR" \
    --baseline-guide "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
    --candidate-guide "$STAGE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
    --baseline-book-json "$PRISTINE_DIR/handbook-data/book-data.json" \
    --candidate-book-json "$STAGE_DIR/handbook-data/book-data.json" \
    --baseline-index-json "$PRISTINE_DIR/handbook-data/index-data.json" \
    --candidate-index-json "$STAGE_DIR/handbook-data/index-data.json" \
    --patch "$RUN_DIR/exact-changes.patch" \
    --run-start "$RUN_STARTED_AT"
}

generate_candidate_changelog() {
  "$NODE_BIN" "$GENERATE_CHANGELOG" \
    --baseline "$PRISTINE_DIR/handbook/changelog.json" \
    --baseline-source "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
    --changes "$RUN_DIR/changes.json" \
    --patch "$RUN_DIR/exact-changes.patch" \
    --source "$BUILD_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
    --production-hash "$RUN_DIR/production-pdf-before-sha256.txt" \
    --entry-date "$RUN_DATE" \
    --output "$BUILD_DIR/handbook/changelog.json"
}

validate_changelog_baseline() {
  local expected_sha
  local actual_sha
  CHANGELOG_SUMMARY=$(
    "$NODE_BIN" -e \
      'const fs = require("node:fs"); const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(data.summary ?? "");' \
      "$BUILD_DIR/handbook/changelog.json"
  ) || return 1
  if [[ "$CHANGELOG_SUMMARY" == "The handbook's reader-facing content is unchanged." ]]; then
    CHANGELOG_REQUIRED=false
    EXPECTED_REVIEW_STATUS="no_update_warranted"
  else
    CHANGELOG_REQUIRED=true
    EXPECTED_REVIEW_STATUS="ready_for_review"
  fi
  CHANGE_COUNT=$(
    "$NODE_BIN" -e \
      'const fs = require("node:fs"); const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(String(data.length));' \
      "$RUN_DIR/changes.json"
  ) || return 1
  RECOMMENDED_VERSION_BUMP=$(
    "$NODE_BIN" -e \
      'const fs = require("node:fs"); const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(data.recommended_bump ?? "");' \
      "$RUN_DIR/release-recommendation.json"
  ) || return 1
  if [[ ! "$CHANGE_COUNT" =~ ^[0-9]+$ \
    || ! "$RECOMMENDED_VERSION_BUMP" =~ ^(none|patch|minor|major)$ ]]; then
    /usr/bin/printf 'Invalid change count or release-version recommendation.\n'
    return 1
  fi
  if [[ "$CHANGELOG_REQUIRED" == true && "$CHANGE_COUNT" -eq 0 ]] \
    || [[ "$CHANGELOG_REQUIRED" == false && "$CHANGE_COUNT" -ne 0 ]]; then
    /usr/bin/printf 'Changelog decision and changes.json disagree.\n'
    return 1
  fi
  expected_sha=$(
    "$NODE_BIN" -e \
      'const fs = require("node:fs"); const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(data.previousPdfSha256 ?? "");' \
      "$BUILD_DIR/handbook/changelog.json"
  ) || return 1
  actual_sha=$(/usr/bin/awk '{ print $1; exit }' "$RUN_DIR/production-pdf-before-sha256.txt") \
    || return 1
  if [[ "$expected_sha" != "$actual_sha" ]]; then
    /usr/bin/printf 'Changelog baseline mismatch.\nExpected: %s\nPublished PDF: %s\n' \
      "$expected_sha" "$actual_sha"
    return 1
  fi
  /usr/bin/printf 'Reader-facing comparison: %s\n' "$CHANGELOG_SUMMARY"
  /usr/bin/printf 'Changelog required: %s\n' "$CHANGELOG_REQUIRED"
  /usr/bin/printf 'Validated change records: %s\n' "$CHANGE_COUNT"
  /usr/bin/printf 'Recommended release-version bump: %s\n' "$RECOMMENDED_VERSION_BUMP"
}

validate_page_map_stability() {
  /usr/bin/diff -u \
    "$RUN_DIR/page-map-pass-1.json" \
    "$RUN_DIR/page-map.json" \
    > "$RUN_DIR/page-map-stability.diff"
  local stability_status=$?
  if [[ "$stability_status" -gt 1 ]]; then
    return "$stability_status"
  fi
  if [[ "$stability_status" -eq 1 ]]; then
    /usr/bin/printf 'Page map changed after the second PDF render.\n'
    return 1
  fi
  /usr/bin/printf 'Page map stabilized after the second PDF render.\n'
}

render_proof_page() {
  local physical_page="$1"
  local output_path="$2"
  local output_prefix="${output_path%.png}"
  /opt/homebrew/bin/pdftoppm \
    -f "$physical_page" \
    -l "$physical_page" \
    -singlefile \
    -png \
    -r 96 \
    "$CANDIDATE_PDF" \
    "$output_prefix" || return 1
  [[ -s "$output_path" ]]
}

collect_pdf_evidence() {
  /opt/homebrew/bin/pdfinfo "$CANDIDATE_PDF" > "$RUN_DIR/pdfinfo.txt" || return 1
  /opt/homebrew/bin/pdffonts "$CANDIDATE_PDF" > "$RUN_DIR/pdffonts.txt" || return 1
  /opt/homebrew/bin/pdfimages -list "$CANDIDATE_PDF" > "$RUN_DIR/pdfimages.txt" || return 1
  /opt/homebrew/bin/pdftotext -layout "$PRODUCTION_PDF" "$RUN_DIR/previous-version.txt" \
    || return 1
  /opt/homebrew/bin/pdftotext -layout "$CANDIDATE_PDF" "$RUN_DIR/current-version.txt" \
    || return 1
  /usr/bin/diff -u \
    "$RUN_DIR/previous-version.txt" \
    "$RUN_DIR/current-version.txt" \
    > "$RUN_DIR/previous-version.diff"
  local text_diff_status=$?
  if [[ "$text_diff_status" -gt 1 ]]; then
    return "$text_diff_status"
  fi
  /bin/cp "$RUN_DIR/previous-version.diff" "$RUN_DIR/pdf-text.diff" || return 1

  PAGE_COUNT=$(/usr/bin/awk '/^Pages:/ { print $2; exit }' "$RUN_DIR/pdfinfo.txt") \
    || return 1
  if [[ ! "$PAGE_COUNT" =~ ^[0-9]+$ || "$PAGE_COUNT" -lt 1 ]]; then
    /usr/bin/printf 'Could not read a numeric page count from pdfinfo.\n'
    return 1
  fi

  /bin/mkdir -p "$RUN_DIR/proof" "$FINAL_REVIEW_DIR/proof" || return 1
  local physical_page
  local page_name
  for (( physical_page = 1; physical_page <= PAGE_COUNT; physical_page++ )); do
    page_name=$(/usr/bin/printf 'page-%03d.png' "$physical_page") || return 1
    render_proof_page "$physical_page" "$RUN_DIR/proof/$page_name" || return 1
  done
  /bin/cp "$RUN_DIR/proof/page-001.png" "$RUN_DIR/proof/cover.png" || return 1
  /bin/cp "$RUN_DIR/proof/cover.png" "$FINAL_REVIEW_DIR/proof/cover.png" || return 1

  local chapter_number
  local printed_page
  local chapter_name
  for chapter_number in {1..12}; do
    chapter_name=$(/usr/bin/printf 'chapter-%02d' "$chapter_number") || return 1
    printed_page=$(
      "$NODE_BIN" -e \
        'const fs = require("node:fs"); const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); const prefix = `${process.argv[2]}-`; const key = Object.keys(data).find((name) => name === process.argv[2] || name.startsWith(prefix)); if (!key) process.exit(1); process.stdout.write(String(data[key]));' \
        "$RUN_DIR/page-map.json" "$chapter_name"
    ) || return 1
    physical_page=$((printed_page + 3))
    if [[ "$physical_page" -lt 1 || "$physical_page" -gt "$PAGE_COUNT" ]]; then
      /usr/bin/printf 'Chapter %s maps outside the PDF: %s\n' "$chapter_name" "$physical_page"
      return 1
    fi
    page_name=$(/usr/bin/printf 'page-%03d.png' "$physical_page") || return 1
    /bin/cp "$RUN_DIR/proof/$page_name" "$RUN_DIR/proof/$chapter_name.png" || return 1
    /bin/cp "$RUN_DIR/proof/$chapter_name.png" "$FINAL_REVIEW_DIR/proof/$chapter_name.png" \
      || return 1
  done

  page_name=$(/usr/bin/printf 'page-%03d.png' "$PAGE_COUNT") || return 1
  /bin/cp "$RUN_DIR/proof/$page_name" "$RUN_DIR/proof/final-page.png" || return 1
  if [[ "$CHANGELOG_REQUIRED" == true ]]; then
    /bin/cp "$RUN_DIR/proof/final-page.png" "$RUN_DIR/proof/changelog.png" || return 1
    /bin/cp "$RUN_DIR/proof/final-page.png" "$FINAL_REVIEW_DIR/proof/changelog.png" \
      || return 1
  fi
  /usr/bin/find "$RUN_DIR/proof" -type f -print | LC_ALL=C /usr/bin/sort \
    > "$RUN_DIR/proof/manifest.txt"
}

write_candidate_hash() {
  /usr/bin/shasum -a 256 "$CANDIDATE_PDF" > "$RUN_DIR/candidate-sha256.txt"
  [[ -s "$RUN_DIR/candidate-sha256.txt" ]]
}

write_review_outputs() {
  local candidate_sha
  candidate_sha=$(/usr/bin/awk '{ print $1; exit }' "$RUN_DIR/candidate-sha256.txt") \
    || return 1
  /usr/bin/printf '{"version":1,"candidate_id":"%s","status":"%s","production_unchanged":true,"validation_passed":true,"visual_proof_passed":true,"notes":["Deterministic research-artifact, handbook, PDF, pagination, and all-page proof validation passed. The scheduled top-level task must still perform its read-only evidence and release audit before any publication decision."]}\n' \
    "$RUN_ID" "$EXPECTED_REVIEW_STATUS" > "$FINAL_REVIEW_DIR/review-status.json" || return 1
  {
    /usr/bin/printf '# Weekly Production AI handbook candidate\n\n'
    /usr/bin/printf 'Status: `%s`. The deterministic candidate build passed and is ready for the scheduled task\047s read-only audit. It was not published.\n\n' \
      "$EXPECTED_REVIEW_STATUS"
    /usr/bin/printf -- '- Candidate identifier: `%s`\n' "$RUN_ID"
    /usr/bin/printf -- '- Candidate PDF: `%s`\n' "$CANDIDATE_PDF"
    /usr/bin/printf -- '- Candidate SHA-256: `%s`\n' "$candidate_sha"
    /usr/bin/printf -- '- Validated research changes: `%s`\n' "$CHANGE_COUNT"
    /usr/bin/printf -- '- Reader-facing comparison: `%s`\n' "$CHANGELOG_SUMMARY"
    /usr/bin/printf -- '- Changelog included: `%s`\n' "$CHANGELOG_REQUIRED"
    /usr/bin/printf -- '- Recommended release-version bump: `%s`\n' \
      "$RECOMMENDED_VERSION_BUMP"
    /usr/bin/printf -- '- Research checkpoint: `%s` (`%s`; overlap from `%s`)\n' \
      "$RESEARCH_CHECKPOINT_PATH" "$RESEARCH_CHECKPOINT_DATE" "$RESEARCH_OVERLAP_START"
    /usr/bin/printf -- '- PDF pages: `%s`\n' "$PAGE_COUNT"
    /usr/bin/printf -- '- HTML validation: passed\n'
    /usr/bin/printf -- '- PDF validation: passed\n'
    /usr/bin/printf -- '- Two-pass page-map stability: passed\n'
    /usr/bin/printf -- '- All-page proof rendering: passed\n'
    /usr/bin/printf -- '- Canonical source unchanged: `true`\n'
    /usr/bin/printf -- '- Canonical workspace unchanged: `true`\n'
    /usr/bin/printf -- '- Production PDF unchanged: `true`\n'
    /usr/bin/printf -- '- Publication: not performed\n\n'
    /usr/bin/printf 'Research and audit artifacts: `change-report.md`, `changes.json`, `coverage.json`, `release-recommendation.json`, `sources.md`, `sources.json`, `blocked-sources.md`, `exact-changes.patch`, `previous-version.diff`, and `proof/manifest.txt`.\n'
  } > "$FINAL_REVIEW_DIR/run-summary.md" || return 1
  /bin/cp "$FINAL_REVIEW_DIR/review-status.json" "$RUN_DIR/review-status.json" || return 1
  /bin/cp "$FINAL_REVIEW_DIR/run-summary.md" "$RUN_DIR/run-summary.md"
}

validate_review_outputs() {
  "$NODE_BIN" "$VALIDATE_REVIEW_STATUS" \
    --file "$FINAL_REVIEW_DIR/review-status.json" \
    --candidate-id "$RUN_ID" \
    --expected-status "$EXPECTED_REVIEW_STATUS" \
    --proof-dir "$FINAL_REVIEW_DIR/proof" \
    --wrapper-proof-dir "$RUN_DIR/proof" \
    --page-count "$PAGE_COUNT" \
    --changelog-required "$CHANGELOG_REQUIRED"
}

write_success_status() {
  local candidate_sha
  local changelog_pdf_page="none"
  local changelog_printed_page="none"
  candidate_sha=$(/usr/bin/awk '{ print $1; exit }' "$RUN_DIR/candidate-sha256.txt") \
    || return 1
  if [[ "$CHANGELOG_REQUIRED" == true ]]; then
    changelog_pdf_page="$PAGE_COUNT"
    changelog_printed_page=$((PAGE_COUNT - 3))
  fi
  /usr/bin/printf 'status=%s\nexit_code=0\nrun_date=%s\nrun_started_at=%s\ncandidate_ready=true\nchanges=%s\npages=%s\nreader_facing_content_changed=%s\nchangelog_included=%s\nchangelog_pdf_page=%s\nchangelog_printed_page=%s\nrecommended_version_bump=%s\nresearch_checkpoint_path=%s\nresearch_checkpoint_date=%s\nresearch_overlap_start=%s\npage_map_stable=true\nresearch_completed=true\nresearch_artifacts_valid=true\ndeterministic_review_passed=true\nscheduled_task_audit_pending=true\ncanonical_source_unchanged=true\ncanonical_workspace_unchanged=true\nproduction_pdf_unchanged=true\ncandidate_pdf=%s\ncandidate_sha256=%s\n' \
    "$EXPECTED_REVIEW_STATUS" "$RUN_DATE" "$RUN_STARTED_AT" "$CHANGE_COUNT" \
    "$PAGE_COUNT" "$CHANGELOG_REQUIRED" "$CHANGELOG_REQUIRED" "$changelog_pdf_page" \
    "$changelog_printed_page" "$RECOMMENDED_VERSION_BUMP" "$RESEARCH_CHECKPOINT_PATH" \
    "$RESEARCH_CHECKPOINT_DATE" "$RESEARCH_OVERLAP_START" "$CANDIDATE_PDF" \
    "$candidate_sha" > "$RUN_DIR/status.txt"
}

if [[ "${1:-}" == "--check" ]]; then
  /bin/mkdir -p "$WORKSPACE/tmp" || exit 70
  CHECK_STATUS=0
  runtime_check || CHECK_STATUS=$?
  if [[ "$CHECK_STATUS" -eq 0 ]]; then
    CHECK_DIR=$(/usr/bin/mktemp -d "$WORKSPACE/tmp/weekly-handbook-check.XXXXXX") \
      || CHECK_STATUS=$?
  fi
  if [[ "$CHECK_STATUS" -eq 0 ]]; then
    /usr/bin/printf '<!doctype html><meta charset="utf-8"><style>@page{size:A5}</style><h1>PDF runtime check</h1>\n' \
      > "$CHECK_DIR/check.html"
    run_with_timeout 60 \
      "$NODE_BIN" "$WORKSPACE/automation/render-handbook-pdf.mjs" \
      --browser "$BROWSER_BIN" \
      --html "$CHECK_DIR/check.html" \
      --output "$CHECK_DIR/check.pdf" \
      --playwright-module "$PLAYWRIGHT_CORE" \
      > "$CHECK_DIR/render.log" 2>&1 || CHECK_STATUS=$?
  fi
  if [[ -n "${CHECK_DIR:-}" && -d "$CHECK_DIR" && "$CHECK_DIR" == "$WORKSPACE/tmp/"* ]]; then
    /bin/rm -rf "$CHECK_DIR"
  fi
  /usr/bin/printf 'Weekly handbook deterministic runtime check: %s\n' "$CHECK_STATUS"
  exit "$CHECK_STATUS"
fi

if [[ "$#" -ne 1 ]]; then
  /usr/bin/printf 'Usage: %s /absolute/path/to/prepared-run\n' "$0" >&2
  exit 64
fi
RUN_DIR="$1"
if [[ "$RUN_DIR" != /* \
  || "$RUN_DIR" != "$CANDIDATE_ROOT/"* \
  || ! -d "$RUN_DIR" \
  || -L "$RUN_DIR" ]]; then
  /usr/bin/printf 'Unsafe or missing prepared run directory: %s\n' "$RUN_DIR" >&2
  exit 64
fi

RUN_ID=${RUN_DIR:t}
PRISTINE_DIR="$RUN_DIR/pristine-source"
STAGE_DIR="$RUN_DIR/candidate-edits"
BUILD_DIR="$RUN_DIR/build-source"
TOOLCHAIN_DIR="$RUN_DIR/toolchain"
RESEARCH_OUTPUT_DIR="$RUN_DIR/research-output"
FINAL_REVIEW_DIR="$RUN_DIR/final-review"

if ! read_context > "$RUN_DIR/context-read.log" 2>&1; then
  RUN_DATE="unknown"
  RUN_STARTED_AT="unknown"
  CANDIDATE_PDF="$RUN_DIR/production-ai-engineering-unknown.pdf"
  fail_run 65 "context_read" "$RUN_DIR/context-read.log"
fi
CANDIDATE_PDF="$RUN_DIR/production-ai-engineering-$RUN_VERSION.pdf"

if ! /bin/mkdir "$RUN_DIR/finalization-started" 2>/dev/null; then
  /usr/bin/printf 'This prepared run has already entered finalization; it will not be rerun.\n' >&2
  /usr/bin/printf 'weekly_handbook_run_dir=%s\nweekly_handbook_pdf=%s\nweekly_handbook_status=75\n' \
    "$RUN_DIR" "$CANDIDATE_PDF"
  exit 75
fi

signal_failure() {
  local signal_name="$1"
  /usr/bin/printf 'Finalization received %s and is terminating.\n' "$signal_name" \
    > "$RUN_DIR/signal.log"
  fail_run 130 "signal_$signal_name" "$RUN_DIR/signal.log"
}
trap 'signal_failure INT' INT
trap 'signal_failure TERM' TERM

run_phase "runtime_preflight" "$RUN_DIR/finalizer-preflight.log" runtime_check
run_phase "prepared_run_validation" "$RUN_DIR/prepared-run-validation.log" \
  validate_prepared_run
run_phase "research_artifact_import" "$RUN_DIR/research-artifact-import.log" \
  import_research_artifacts
RESEARCH_COMPLETED=true
run_phase "edit_scope" "$RUN_DIR/edit-scope.log" validate_edit_scope
run_phase "data_materialization" "$RUN_DIR/data-materialization.log" materialize_candidate
run_phase "exact_source_diff" "$RUN_DIR/exact-source-diff.log" write_exact_changes
run_phase "research_artifact_validation" "$RUN_DIR/research-artifact-validation.log" \
  validate_research_artifacts
run_phase "changelog_generation" "$RUN_DIR/changelog-generation.log" \
  generate_candidate_changelog
run_phase "changelog_validation" "$RUN_DIR/changelog-validation.log" \
  validate_changelog_baseline

run_phase "html_build_pass_1" "$RUN_DIR/html-build-pass-1.log" \
  /usr/bin/env \
    "HANDBOOK_AUTOMATION_PATH=$AUTOMATION_CONFIG" \
    "HANDBOOK_RELEASE_POLICY_PATH=$RELEASE_POLICY" \
    "HANDBOOK_VERSION_SUFFIX=-candidate.$RUN_VERSION" \
    "$NODE_BIN" "$BUILD_DIR/handbook/build-handbook.mjs"
run_phase "html_validation_pass_1" "$RUN_DIR/html-validation-pass-1.log" \
  /usr/bin/env \
    "HANDBOOK_AUTOMATION_PATH=$AUTOMATION_CONFIG" \
    "HANDBOOK_RELEASE_POLICY_PATH=$RELEASE_POLICY" \
    "HANDBOOK_VERSION_SUFFIX=-candidate.$RUN_VERSION" \
    "$NODE_BIN" "$BUILD_DIR/handbook/validate-handbook.mjs"
run_phase "pdf_render_pass_1" "$RUN_DIR/pdf-render-pass-1.log" \
  run_with_timeout "$PDF_TIMEOUT_SECONDS" \
    "$NODE_BIN" "$RENDER_PDF" \
    --browser "$BROWSER_BIN" \
    --html "$BUILD_DIR/handbook/index.html" \
    --output "$RUN_DIR/raw-pass-1.pdf" \
    --playwright-module "$PLAYWRIGHT_CORE"
run_phase "page_map_pass_1" "$RUN_DIR/page-map-pass-1.log" \
  /usr/bin/env "PYTHONPATH=$PYTHON_PACKAGES" \
    "$PYTHON_BIN" "$BUILD_DIR/handbook/extract-page-map.py" \
    --pdf "$RUN_DIR/raw-pass-1.pdf" \
    --output "$RUN_DIR/page-map-pass-1.json"
run_phase "page_map_apply" "$RUN_DIR/page-map-apply.log" \
  /bin/cp "$RUN_DIR/page-map-pass-1.json" "$BUILD_DIR/handbook/page-map.json"
run_phase "html_build" "$RUN_DIR/html-build.log" \
  /usr/bin/env \
    "HANDBOOK_AUTOMATION_PATH=$AUTOMATION_CONFIG" \
    "HANDBOOK_RELEASE_POLICY_PATH=$RELEASE_POLICY" \
    "HANDBOOK_VERSION_SUFFIX=-candidate.$RUN_VERSION" \
    "$NODE_BIN" "$BUILD_DIR/handbook/build-handbook.mjs"
run_phase "html_validation" "$RUN_DIR/html-validation.log" \
  /usr/bin/env \
    "HANDBOOK_AUTOMATION_PATH=$AUTOMATION_CONFIG" \
    "HANDBOOK_RELEASE_POLICY_PATH=$RELEASE_POLICY" \
    "HANDBOOK_VERSION_SUFFIX=-candidate.$RUN_VERSION" \
    "$NODE_BIN" "$BUILD_DIR/handbook/validate-handbook.mjs"
run_phase "pdf_render" "$RUN_DIR/pdf-render.log" \
  run_with_timeout "$PDF_TIMEOUT_SECONDS" \
    "$NODE_BIN" "$RENDER_PDF" \
    --browser "$BROWSER_BIN" \
    --html "$BUILD_DIR/handbook/index.html" \
    --output "$RUN_DIR/raw.pdf" \
    --playwright-module "$PLAYWRIGHT_CORE"
run_phase "pdf_finalize" "$RUN_DIR/pdf-finalize.log" \
  /usr/bin/env "PYTHONPATH=$PYTHON_PACKAGES" \
    "$PYTHON_BIN" "$BUILD_DIR/handbook/finalize-pdf.py" \
    --input "$RUN_DIR/raw.pdf" \
    --output "$CANDIDATE_PDF"
run_phase "pdf_validation" "$RUN_DIR/pdf-validation.log" \
  /usr/bin/env "PYTHONPATH=$PYTHON_PACKAGES" \
    "$PYTHON_BIN" "$BUILD_DIR/handbook/validate-pdf.py" "$CANDIDATE_PDF"
run_phase "page_map" "$RUN_DIR/page-map.log" \
  /usr/bin/env "PYTHONPATH=$PYTHON_PACKAGES" \
    "$PYTHON_BIN" "$BUILD_DIR/handbook/extract-page-map.py" \
    --pdf "$CANDIDATE_PDF" \
    --output "$RUN_DIR/page-map.json"
run_phase "page_map_stability" "$RUN_DIR/page-map-stability.log" \
  validate_page_map_stability
run_phase "pdf_evidence" "$RUN_DIR/pdf-evidence.log" collect_pdf_evidence
run_phase "candidate_hash" "$RUN_DIR/candidate-hash.log" write_candidate_hash

run_phase "protected_files_before_review" "$RUN_DIR/protected-files-before-review.log" \
  refresh_protected_state
if [[ "$CANONICAL_SOURCE_UNCHANGED" != true \
  || "$CANONICAL_WORKSPACE_UNCHANGED" != true \
  || "$PRODUCTION_PDF_UNCHANGED" != true ]]; then
  fail_run 73 "protected_files_before_review" "$RUN_DIR/protected-files.diff"
fi

run_phase "review_output_generation" "$RUN_DIR/review-output-generation.log" \
  write_review_outputs
run_phase "review_output_validation" "$RUN_DIR/review-output-validation.log" \
  validate_review_outputs
run_phase "candidate_manifest" "$RUN_DIR/candidate-manifest.log" \
  write_candidate_manifest_file

run_phase "protected_files_after_review" "$RUN_DIR/protected-files-after-review.log" \
  refresh_protected_state
if [[ "$CANONICAL_SOURCE_UNCHANGED" != true \
  || "$CANONICAL_WORKSPACE_UNCHANGED" != true \
  || "$PRODUCTION_PDF_UNCHANGED" != true ]]; then
  fail_run 73 "protected_files_after_review" "$RUN_DIR/protected-files.diff"
fi

run_phase "terminal_status" "$RUN_DIR/terminal-status.log" write_success_status
/usr/bin/printf 'weekly_handbook_run_dir=%s\nweekly_handbook_pdf=%s\nweekly_handbook_status=0\n' \
  "$RUN_DIR" "$CANDIDATE_PDF"

exit 0

#!/bin/zsh

set -u
set -o pipefail
umask 077

AUTOMATION_DIR="${0:A:h}"
WORKSPACE="${HANDBOOK_WORKSPACE:-${AUTOMATION_DIR:h}}"
WORKSPACE="$(cd -- "$WORKSPACE" && pwd -P)" || {
  /usr/bin/printf 'Could not resolve the handbook workspace: %s\n' "$WORKSPACE" >&2
  exit 64
}
PREPARER_SCRIPT="$WORKSPACE/automation/prepare-weekly-handbook-review.sh"
FINALIZER_SCRIPT="$WORKSPACE/automation/run-weekly-handbook-review.sh"
REQUIRED_NODE_VERSION="22.16.0"
NODE_BIN="${HANDBOOK_NODE_BIN:-}"
if [[ -z "$NODE_BIN" ]]; then
  path_node="${commands[node]:-}"
  path_node_version=""
  if [[ -n "$path_node" && -x "$path_node" ]]; then
    path_node_version=$("$path_node" -p 'process.versions.node' 2>/dev/null)
  fi
  if [[ "$path_node_version" == "$REQUIRED_NODE_VERSION" ]]; then
    NODE_BIN="$path_node"
  elif [[ -n "${HOME:-}" \
    && -x "$HOME/.nvm/versions/node/v$REQUIRED_NODE_VERSION/bin/node" ]]; then
    NODE_BIN="$HOME/.nvm/versions/node/v$REQUIRED_NODE_VERSION/bin/node"
  else
    NODE_BIN="$path_node"
  fi
fi
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
PRODUCTION_PDF="$WORKSPACE/output/pdf/production-ai-engineering-v1.4.0-2026-09-30.pdf"
WRITE_LIKE_MIKE_SKILL="${HANDBOOK_WRITE_LIKE_MIKE_SKILL:-${CODEX_HOME:-${HOME:-}/.codex}/skills/write-like-mike/SKILL.md}"
DEFAULT_CANDIDATE_ROOT="$WORKSPACE/output/candidates"
CANDIDATE_ROOT="${HANDBOOK_CANDIDATE_ROOT:-$DEFAULT_CANDIDATE_ROOT}"
CANDIDATE_ROOT="${CANDIDATE_ROOT:A}"
if [[ "$CANDIDATE_ROOT" != "$DEFAULT_CANDIDATE_ROOT" ]]; then
  TEST_TMP_ROOT="${HANDBOOK_TEST_TMP_ROOT:-${TMPDIR:-/tmp}}"
  TEST_TMP_ROOT="${TEST_TMP_ROOT:A}"
  if [[ "${HANDBOOK_TEST_MODE:-0}" != 1 \
    || "$CANDIDATE_ROOT" != "$TEST_TMP_ROOT"/weekly-handbook-test.*/* ]]; then
    /usr/bin/printf 'HANDBOOK_CANDIDATE_ROOT is restricted to a weekly-handbook test directory.\n' >&2
    exit 64
  fi
fi

RUN_DIR=""
RUN_ID=""
RUN_STAMP=""
RUN_DATE=""
RUN_VERSION=""
RUN_STARTED_AT=""
PRISTINE_DIR=""
STAGE_DIR=""
BUILD_DIR=""
TOOLCHAIN_DIR=""
RESEARCH_OUTPUT_DIR=""
FINAL_REVIEW_DIR=""
RESEARCH_CHECKPOINT_PATH="none"
RESEARCH_CHECKPOINT_DATE=""
RESEARCH_OVERLAP_START=""
CANONICAL_SOURCE_UNCHANGED=false
PRODUCTION_PDF_UNCHANGED=false
CANONICAL_WORKSPACE_UNCHANGED=false

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

capture_protected_baseline() {
  write_file_hash "$CANONICAL_SOURCE" "$RUN_DIR/canonical-source-before-sha256.txt" || return 1
  write_file_hash "$PRODUCTION_PDF" "$RUN_DIR/production-pdf-before-sha256.txt" || return 1
  write_canonical_manifest > "$RUN_DIR/canonical-before-sha256.txt"
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

write_failure() {
  local exit_code="$1"
  local failed_phase="$2"
  local failed_log="$3"

  refresh_protected_state >/dev/null 2>&1 || true
  {
    /usr/bin/printf '# Weekly handbook review preparation failed\n\n'
    /usr/bin/printf 'Preparation stopped during `%s` with exit status `%s`.\n\n' \
      "$failed_phase" "$exit_code"
    /usr/bin/printf -- '- Failed log: `%s`\n' "$failed_log"
    /usr/bin/printf -- '- Canonical source unchanged: `%s`\n' "$CANONICAL_SOURCE_UNCHANGED"
    /usr/bin/printf -- '- Canonical workspace unchanged: `%s`\n' "$CANONICAL_WORKSPACE_UNCHANGED"
    /usr/bin/printf -- '- Production PDF unchanged: `%s`\n' "$PRODUCTION_PDF_UNCHANGED"
    /usr/bin/printf -- '- Research and finalization were not started automatically.\n'
  } > "$RUN_DIR/run-summary.md"
  /usr/bin/printf 'status=failed\nexit_code=%s\nrun_date=%s\nrun_started_at=%s\nfailed_phase=%s\nfailed_log=%s\ncandidate_ready=false\nresearch_completed=false\ncanonical_source_unchanged=%s\ncanonical_workspace_unchanged=%s\nproduction_pdf_unchanged=%s\n' \
    "$exit_code" "$RUN_DATE" "$RUN_STARTED_AT" "$failed_phase" "$failed_log" \
    "$CANONICAL_SOURCE_UNCHANGED" "$CANONICAL_WORKSPACE_UNCHANGED" \
    "$PRODUCTION_PDF_UNCHANGED" > "$RUN_DIR/status.txt"
  /usr/bin/printf 'weekly_handbook_run_dir=%s\nweekly_handbook_status=%s\n' \
    "$RUN_DIR" "$exit_code"
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

preflight() {
  local check_status=0
  local required_executable
  for required_executable in \
    "$NODE_BIN" \
    "$PREPARER_SCRIPT" \
    "$FINALIZER_SCRIPT" \
    "/usr/bin/awk" \
    "/usr/bin/cmp" \
    "/usr/bin/cut" \
    "/usr/bin/diff" \
    "/usr/bin/find" \
    "/usr/bin/grep" \
    "/usr/bin/head" \
    "/usr/bin/mktemp" \
    "/usr/bin/printf" \
    "/usr/bin/rsync" \
    "/usr/bin/shasum"; do
    if [[ -z "$required_executable" \
      || ! -f "$required_executable" \
      || ! -x "$required_executable" ]]; then
      /usr/bin/printf 'Missing required executable: %s\n' \
        "${required_executable:-<unresolved>}"
      check_status=1
    fi
  done

  local required_file
  for required_file in \
    "$WRITE_LIKE_MIKE_SKILL" \
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
    "$WORKSPACE/handbook/build-handbook.mjs" \
    "$WORKSPACE/handbook/changelog.json" \
    "$WORKSPACE/handbook/validate-handbook.mjs" \
    "$WORKSPACE/handbook/finalize-pdf.py" \
    "$WORKSPACE/handbook/validate-pdf.py" \
    "$WORKSPACE/handbook/extract-page-map.py"; do
    if [[ -z "$required_file" \
      || ! -f "$required_file" \
      || ! -r "$required_file" ]]; then
      /usr/bin/printf 'Missing required readable file: %s\n' \
        "${required_file:-<unresolved>}"
      check_status=1
    fi
  done
  if [[ -n "$NODE_BIN" && -f "$NODE_BIN" && -x "$NODE_BIN" ]]; then
    local node_version
    node_version=$("$NODE_BIN" -p 'process.versions.node') || check_status=1
    if [[ "$node_version" != "$REQUIRED_NODE_VERSION" ]]; then
      /usr/bin/printf 'Node version mismatch. Required: %s; found: %s\n' \
        "$REQUIRED_NODE_VERSION" "${node_version:-unresolved}"
      check_status=1
    fi
  fi
  return "$check_status"
}

snapshot_source() {
  /bin/mkdir -p \
    "$PRISTINE_DIR/handbook" \
    "$STAGE_DIR/handbook-data" \
    "$BUILD_DIR/handbook" \
    "$TOOLCHAIN_DIR" \
    "$RESEARCH_OUTPUT_DIR" \
    "$FINAL_REVIEW_DIR/proof" || return 1

  /bin/cp "$CANONICAL_SOURCE" "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" || return 1
  /usr/bin/rsync -a --exclude '__pycache__/' "$WORKSPACE/handbook/" "$PRISTINE_DIR/handbook/" \
    || return 1
  /bin/cp \
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
    "$TOOLCHAIN_DIR/" || return 1
  /usr/bin/printf 'Immutable baseline staged at %s\n' "$PRISTINE_DIR"
}

export_candidate_data() {
  "$NODE_BIN" "$TOOLCHAIN_DIR/export-handbook-data.mjs" \
    --book-data "$PRISTINE_DIR/handbook/book-data.mjs" \
    --index-data "$PRISTINE_DIR/handbook/index-data.mjs" \
    --output-dir "$PRISTINE_DIR/handbook-data" || return 1
  /bin/cp "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
    "$STAGE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" || return 1
  /usr/bin/rsync -a "$PRISTINE_DIR/handbook-data/" "$STAGE_DIR/handbook-data/"
}

validate_published_baseline() {
  local expected_source_sha
  local actual_source_sha
  local expected_pdf_sha
  local actual_pdf_sha
  expected_source_sha=$(
    "$NODE_BIN" -e \
      'const fs = require("node:fs"); const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(value.currentSourceSha256 ?? "");' \
      "$PRISTINE_DIR/handbook/changelog.json"
  ) || return 1
  actual_source_sha=$(/usr/bin/shasum -a 256 "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" | /usr/bin/awk '{print $1}') \
    || return 1
  expected_pdf_sha=$(
    "$NODE_BIN" -e \
      'const fs = require("node:fs"); const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(value.previousPdfSha256 ?? "");' \
      "$PRISTINE_DIR/handbook/changelog.json"
  ) || return 1
  actual_pdf_sha=$(/usr/bin/awk '{print $1; exit}' "$RUN_DIR/production-pdf-before-sha256.txt") \
    || return 1
  if [[ "$expected_source_sha" != "$actual_source_sha" ]]; then
    /usr/bin/printf 'Published baseline source mismatch.\nLedger: %s\nPristine source: %s\n' \
      "$expected_source_sha" "$actual_source_sha"
    return 1
  fi
  if [[ "$expected_pdf_sha" != "$actual_pdf_sha" ]]; then
    /usr/bin/printf 'Published baseline PDF mismatch.\nLedger: %s\nProduction PDF: %s\n' \
      "$expected_pdf_sha" "$actual_pdf_sha"
    return 1
  fi
  /usr/bin/printf 'Published source and PDF hashes match the canonical changelog ledger.\n'
}

resolve_research_checkpoint() {
  local status_file
  local checkpoint_status=""
  while IFS= read -r status_file; do
    if /usr/bin/grep -qx 'research_completed=true' "$status_file" \
      && /usr/bin/grep -Eq '^status=(ready_for_review|no_update_warranted)$' "$status_file"; then
      checkpoint_status="$status_file"
      break
    fi
  done < <(
    /usr/bin/find "$CANDIDATE_ROOT" -mindepth 2 -maxdepth 2 -name status.txt -type f -print \
      | LC_ALL=C /usr/bin/sort -r
  )

  if [[ -n "$checkpoint_status" ]]; then
    RESEARCH_CHECKPOINT_PATH=${checkpoint_status:h}
    RESEARCH_CHECKPOINT_DATE=$(
      /usr/bin/grep '^run_date=' "$checkpoint_status" \
        | /usr/bin/head -n 1 \
        | /usr/bin/cut -d= -f2-
    )
    if [[ -z "$RESEARCH_CHECKPOINT_DATE" ]]; then
      RESEARCH_CHECKPOINT_DATE=${RESEARCH_CHECKPOINT_PATH:t}
      RESEARCH_CHECKPOINT_DATE=${RESEARCH_CHECKPOINT_DATE[1,10]}
    fi
  else
    RESEARCH_CHECKPOINT_PATH="none; canonical evidence-review date"
    RESEARCH_CHECKPOINT_DATE=$(
      /usr/bin/grep -Eo '[0-9]{4}-[0-9]{2}-[0-9]{2}' \
        "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
        | /usr/bin/head -n 1
    )
  fi
  if [[ ! "$RESEARCH_CHECKPOINT_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    /usr/bin/printf 'Could not resolve the previous successful research checkpoint date.\n'
    return 1
  fi
  RESEARCH_OVERLAP_START=$(
    "$NODE_BIN" -e \
      'const date = new Date(`${process.argv[1]}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - 7); process.stdout.write(date.toISOString().slice(0, 10));' \
      "$RESEARCH_CHECKPOINT_DATE"
  ) || return 1
  /usr/bin/printf 'Previous successful research checkpoint: %s\n' "$RESEARCH_CHECKPOINT_PATH"
  /usr/bin/printf 'Checkpoint date: %s\nResearch overlap starts: %s\n' \
    "$RESEARCH_CHECKPOINT_DATE" "$RESEARCH_OVERLAP_START"
}

write_context() {
  /usr/bin/printf '%s\n' "$RUN_DATE" > "$RUN_DIR/run-date.txt" || return 1
  /usr/bin/printf '%s\n' "$RUN_VERSION" > "$RUN_DIR/run-version.txt" || return 1
  /usr/bin/printf '%s\n' "$RUN_STARTED_AT" > "$RUN_DIR/run-started-at.txt" || return 1
  /usr/bin/printf '%s\n' "$RESEARCH_CHECKPOINT_PATH" > "$RUN_DIR/research-checkpoint-path.txt" \
    || return 1
  /usr/bin/printf '%s\n' "$RESEARCH_CHECKPOINT_DATE" > "$RUN_DIR/research-checkpoint-date.txt" \
    || return 1
  /usr/bin/printf '%s\n' "$RESEARCH_OVERLAP_START" > "$RUN_DIR/research-overlap-start.txt" \
    || return 1

  /usr/bin/shasum -a 256 \
    "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
    "$PRISTINE_DIR/handbook-data/book-data.json" \
    "$PRISTINE_DIR/handbook-data/index-data.json" \
    "$PRODUCTION_PDF" > "$RUN_DIR/prepared-input-sha256.txt" || return 1

  {
    /usr/bin/printf '# Weekly handbook research runtime\n\n'
    /usr/bin/printf -- '- Candidate identifier: `%s`\n' "$RUN_ID"
    /usr/bin/printf -- '- Run date: `%s`\n' "$RUN_DATE"
    /usr/bin/printf -- '- Run started at: `%s`\n' "$RUN_STARTED_AT"
    /usr/bin/printf -- '- Immutable baseline: `%s` (read-only)\n' "$PRISTINE_DIR"
    /usr/bin/printf -- '- Candidate edits: `%s`\n' "$STAGE_DIR"
    /usr/bin/printf -- '- Research reports: `%s`\n' "$RESEARCH_OUTPUT_DIR"
    /usr/bin/printf -- '- Previous successful research checkpoint: `%s`\n' "$RESEARCH_CHECKPOINT_PATH"
    /usr/bin/printf -- '- Checkpoint date: `%s`\n' "$RESEARCH_CHECKPOINT_DATE"
    /usr/bin/printf -- '- Required overlap start: `%s`\n' "$RESEARCH_OVERLAP_START"
    /usr/bin/printf -- '- Candidate version suffix: `-candidate.%s`\n' "$RUN_VERSION"
    /usr/bin/printf -- '- Required writing skill: `%s`\n' "$WRITE_LIKE_MIKE_SKILL"
    /usr/bin/printf '\nRead `%s` and perform its live research job in this runtime.\n' \
      "$TOOLCHAIN_DIR/weekly-handbook-review.md"
  } > "$RUN_DIR/run-context.md" || return 1

  /usr/bin/printf 'status=research_pending\nexit_code=0\nrun_date=%s\nrun_started_at=%s\ncandidate_ready=false\nresearch_completed=false\nresearch_checkpoint_path=%s\nresearch_checkpoint_date=%s\nresearch_overlap_start=%s\ncanonical_source_unchanged=true\ncanonical_workspace_unchanged=true\nproduction_pdf_unchanged=true\n' \
    "$RUN_DATE" "$RUN_STARTED_AT" "$RESEARCH_CHECKPOINT_PATH" \
    "$RESEARCH_CHECKPOINT_DATE" "$RESEARCH_OVERLAP_START" > "$RUN_DIR/status.txt"
}

if [[ "${1:-}" == "--preflight" ]]; then
  PREFLIGHT_STATUS=0
  preflight || PREFLIGHT_STATUS=$?
  /usr/bin/printf 'Weekly handbook preparation preflight: %s\n' "$PREFLIGHT_STATUS"
  exit "$PREFLIGHT_STATUS"
fi

if [[ "$#" -ne 0 ]]; then
  /usr/bin/printf 'Usage: %s [--preflight]\n' "$0" >&2
  exit 64
fi

if ! /bin/mkdir -p "$CANDIDATE_ROOT" "$WORKSPACE/tmp"; then
  /usr/bin/printf 'Could not create the weekly candidate root.\n' >&2
  exit 70
fi

RUN_STAMP=$(/bin/date +%Y-%m-%dT%H-%M-%S) || exit 70
RUN_DATE=$(/bin/date +%Y-%m-%d) || exit 70
RUN_VERSION=$(/bin/date +%Y%m%d.%H%M%S) || exit 70
RUN_STARTED_AT=$(/bin/date -u +%Y-%m-%dT%H:%M:%SZ) || exit 70
RUN_DIR=$(/usr/bin/mktemp -d "$CANDIDATE_ROOT/$RUN_STAMP.XXXXXX") || exit 70
if [[ ! -d "$RUN_DIR" || -L "$RUN_DIR" || "$RUN_DIR" != "$CANDIDATE_ROOT/"* ]]; then
  /usr/bin/printf 'Unsafe candidate run directory: %s\n' "$RUN_DIR" >&2
  exit 70
fi

RUN_ID=${RUN_DIR:t}
PRISTINE_DIR="$RUN_DIR/pristine-source"
STAGE_DIR="$RUN_DIR/candidate-edits"
BUILD_DIR="$RUN_DIR/build-source"
TOOLCHAIN_DIR="$RUN_DIR/toolchain"
RESEARCH_OUTPUT_DIR="$RUN_DIR/research-output"
FINAL_REVIEW_DIR="$RUN_DIR/final-review"

run_phase "baseline_capture" "$RUN_DIR/baseline-capture.log" capture_protected_baseline
run_phase "preflight" "$RUN_DIR/preparation-preflight.log" preflight
run_phase "snapshot" "$RUN_DIR/snapshot.log" snapshot_source
run_phase "data_export" "$RUN_DIR/data-export.log" export_candidate_data
run_phase "published_baseline_validation" "$RUN_DIR/published-baseline-validation.log" \
  validate_published_baseline
run_phase "research_checkpoint" "$RUN_DIR/research-checkpoint.log" resolve_research_checkpoint
run_phase "run_context" "$RUN_DIR/run-context.log" write_context
run_phase "protected_files_after_preparation" "$RUN_DIR/protected-files-after-preparation.log" \
  refresh_protected_state

if [[ "$CANONICAL_SOURCE_UNCHANGED" != true \
  || "$CANONICAL_WORKSPACE_UNCHANGED" != true \
  || "$PRODUCTION_PDF_UNCHANGED" != true ]]; then
  fail_run 73 "protected_files_after_preparation" "$RUN_DIR/protected-files.diff"
fi

/usr/bin/printf 'weekly_handbook_run_dir=%s\nweekly_handbook_candidate_edits=%s\nweekly_handbook_research_output=%s\nweekly_handbook_status=0\n' \
  "$RUN_DIR" "$STAGE_DIR" "$RESEARCH_OUTPUT_DIR"

exit 0

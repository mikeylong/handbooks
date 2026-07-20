#!/bin/zsh

set -u
set -o pipefail
umask 077

export PATH="/Users/mike/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

WORKSPACE="/Users/mike/production-ai-engineering-book"
CODEX_BIN="/Applications/ChatGPT.app/Contents/Resources/codex"
NODE_BIN="/Users/mike/.nvm/versions/node/v22.16.0/bin/node"
PYTHON_BIN="/opt/homebrew/bin/python3.12"
PYTHON_PACKAGES="/Users/mike/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/lib/python3.12/site-packages"
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
RESEARCH_PROMPT="$WORKSPACE/automation/weekly-handbook-review.md"
FINAL_PROMPT="$WORKSPACE/automation/weekly-handbook-review-final.md"
EXPORT_DATA="$WORKSPACE/automation/export-handbook-data.mjs"
MATERIALIZE_DATA="$WORKSPACE/automation/materialize-handbook-data.mjs"
VALIDATE_ARTIFACTS="$WORKSPACE/automation/validate-weekly-artifacts.mjs"
VALIDATE_REVIEW_STATUS="$WORKSPACE/automation/validate-review-status.mjs"
LOG_DIR="$WORKSPACE/automation/logs"
CANDIDATE_ROOT="$WORKSPACE/output/candidates"
LOCK_FILE="$WORKSPACE/tmp/weekly-handbook-review.lock"
RESEARCH_TIMEOUT_SECONDS=5400
REVIEW_TIMEOUT_SECONDS=2700
CHROME_TIMEOUT_SECONDS=300

write_canonical_manifest() {
  {
    /bin/echo "$WORKSPACE/AI_ENGINEERING_FIELD_GUIDE.md"
    /bin/echo "$WORKSPACE/output/pdf/production-ai-engineering.pdf"
    /usr/bin/find "$WORKSPACE/handbook" -type f \
      ! -path '*/__pycache__/*' \
      -print
    /usr/bin/find "$WORKSPACE/automation" -maxdepth 1 -type f -print
  } | LC_ALL=C /usr/bin/sort | while IFS= read -r canonical_file; do
    /usr/bin/shasum -a 256 "$canonical_file"
  done
}

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

copy_research_artifact() {
  local artifact_name="$1"
  local source_path="$RESEARCH_OUTPUT_DIR/$artifact_name"
  local destination_path="$RUN_DIR/$artifact_name"
  if [[ -f "$source_path" && ! -L "$source_path" ]]; then
    /bin/cp "$source_path" "$destination_path"
    return
  fi
  case "$artifact_name" in
    sources.json|changes.json)
      /bin/printf '[]\n' > "$destination_path"
      ;;
    *)
      /bin/printf '# Missing research artifact\n\n`%s` was not produced as a regular file. Research exit status: %s.\n' \
        "$artifact_name" "$RESEARCH_STATUS" > "$destination_path"
      ;;
  esac
}

write_candidate_manifest() {
  {
    /usr/bin/find "$BUILD_DIR" -type f \
      ! -path '*/__pycache__/*' \
      -print
    /usr/bin/find "$STAGE_DIR" -type f -print
    for candidate_file in \
      "$CANDIDATE_PDF" \
      "$RUN_DIR/exact-changes.patch" \
      "$RUN_DIR/change-report.md" \
      "$RUN_DIR/changes.json" \
      "$RUN_DIR/sources.md" \
      "$RUN_DIR/sources.json" \
      "$RUN_DIR/blocked-sources.md" \
      "$RUN_DIR/candidate-page-map.json" \
      "$RUN_DIR/pdf-text.diff"; do
      if [[ -f "$candidate_file" && ! -L "$candidate_file" ]]; then
        /bin/echo "$candidate_file"
      fi
    done
  } | LC_ALL=C /usr/bin/sort | while IFS= read -r candidate_file; do
    /usr/bin/shasum -a 256 "$candidate_file"
  done
}

if [[ "${1:-}" == "--check" ]]; then
  CHECK_STATUS=0
  for required_file in \
    "$CODEX_BIN" \
    "$NODE_BIN" \
    "$PYTHON_BIN" \
    "$PYTHON_PACKAGES" \
    "$CHROME_BIN" \
    "/opt/homebrew/bin/pdfimages" \
    "/opt/homebrew/bin/pdffonts" \
    "/opt/homebrew/bin/pdftotext" \
    "/usr/bin/perl" \
    "/usr/bin/shlock" \
    "$RESEARCH_PROMPT" \
    "$FINAL_PROMPT" \
    "$EXPORT_DATA" \
    "$MATERIALIZE_DATA" \
    "$VALIDATE_ARTIFACTS" \
    "$VALIDATE_REVIEW_STATUS" \
    "$WORKSPACE/AI_ENGINEERING_FIELD_GUIDE.md" \
    "$WORKSPACE/output/pdf/production-ai-engineering.pdf"; do
    if [[ ! -e "$required_file" ]]; then
      /bin/echo "Missing: $required_file" >&2
      CHECK_STATUS=1
    fi
  done
  if ! "$CODEX_BIN" --version; then
    CHECK_STATUS=1
  fi
  if ! "$CODEX_BIN" login status; then
    CHECK_STATUS=1
  fi
  if ! run_with_timeout 5 /usr/bin/true; then
    /bin/echo "Timeout supervisor failed its smoke test." >&2
    CHECK_STATUS=1
  fi
  /bin/echo "Weekly handbook review preflight status: $CHECK_STATUS"
  exit "$CHECK_STATUS"
fi

/bin/mkdir -p "$LOG_DIR" "$CANDIDATE_ROOT" "$WORKSPACE/tmp"

if ! /usr/bin/shlock -f "$LOCK_FILE" -p $$; then
  /bin/echo "A weekly handbook review is already running." >&2
  exit 75
fi

cleanup() {
  /bin/rm -f "$LOCK_FILE"
}
trap cleanup EXIT INT TERM

RUN_STAMP=$(/bin/date +%Y-%m-%dT%H-%M-%S)
RUN_DATE=$(/bin/date +%Y-%m-%d)
RUN_VERSION=$(/bin/date +%Y%m%d.%H%M%S)
RUN_DIR="$CANDIDATE_ROOT/$RUN_STAMP"
PRISTINE_DIR="$RUN_DIR/pristine-source"
STAGE_DIR="$RUN_DIR/candidate-edits"
BUILD_DIR="$RUN_DIR/build-source"
TOOLCHAIN_DIR="$RUN_DIR/toolchain"
RESEARCH_OUTPUT_DIR="$RUN_DIR/research-output"
FINAL_REVIEW_DIR="$RUN_DIR/final-review"
CANDIDATE_PDF="$RUN_DIR/production-ai-engineering-candidate-$RUN_VERSION.pdf"

/bin/mkdir -p \
  "$PRISTINE_DIR/handbook" \
  "$STAGE_DIR/handbook-data" \
  "$BUILD_DIR/handbook" \
  "$TOOLCHAIN_DIR" \
  "$RESEARCH_OUTPUT_DIR" \
  "$FINAL_REVIEW_DIR/proof"
write_canonical_manifest > "$RUN_DIR/canonical-before-sha256.txt"

/bin/cp "$WORKSPACE/AI_ENGINEERING_FIELD_GUIDE.md" "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md"
/usr/bin/rsync -a "$WORKSPACE/handbook/" "$PRISTINE_DIR/handbook/"
/bin/cp \
  "$RESEARCH_PROMPT" \
  "$FINAL_PROMPT" \
  "$EXPORT_DATA" \
  "$MATERIALIZE_DATA" \
  "$VALIDATE_ARTIFACTS" \
  "$VALIDATE_REVIEW_STATUS" \
  "$TOOLCHAIN_DIR/"

"$NODE_BIN" "$TOOLCHAIN_DIR/export-handbook-data.mjs" \
  --book-data "$PRISTINE_DIR/handbook/book-data.mjs" \
  --index-data "$PRISTINE_DIR/handbook/index-data.mjs" \
  --output-dir "$PRISTINE_DIR/handbook-data" \
  > "$RUN_DIR/data-export.log" 2>&1
DATA_EXPORT_STATUS=$?

if [[ "$DATA_EXPORT_STATUS" -eq 0 ]]; then
  /bin/cp "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" "$STAGE_DIR/AI_ENGINEERING_FIELD_GUIDE.md"
  /usr/bin/rsync -a "$PRISTINE_DIR/handbook-data/" "$STAGE_DIR/handbook-data/"
fi

/usr/bin/shasum -a 256 \
  "$WORKSPACE/AI_ENGINEERING_FIELD_GUIDE.md" \
  "$WORKSPACE/handbook/build-handbook.mjs" \
  "$WORKSPACE/handbook/book-data.mjs" \
  "$WORKSPACE/handbook/index-data.mjs" \
  "$WORKSPACE/output/pdf/production-ai-engineering.pdf" \
  > "$RUN_DIR/baseline-sha256.txt"

RESEARCH_STATUS=1
if [[ "$DATA_EXPORT_STATUS" -eq 0 ]]; then
  {
    /bin/cat "$TOOLCHAIN_DIR/weekly-handbook-review.md"
    /bin/printf '\n## Runtime\n\nCanonical workspace: `%s` (read-only)\nImmutable baseline snapshot: `%s` (read-only)\nCandidate-source directory: `%s`\nRun-artifact directory: `%s`\nRun date: `%s`\nCandidate identifier: `%s`\nCandidate version suffix: `-candidate.%s`\n' \
      "$WORKSPACE" "$PRISTINE_DIR" "$STAGE_DIR" "$RESEARCH_OUTPUT_DIR" \
      "$RUN_DATE" "$RUN_STAMP" "$RUN_VERSION"
  } | run_with_timeout "$RESEARCH_TIMEOUT_SECONDS" \
    "$CODEX_BIN" --search --ask-for-approval never exec \
    --ephemeral \
    --skip-git-repo-check \
    --sandbox workspace-write \
    --color never \
    -C "$STAGE_DIR" \
    --add-dir "$RESEARCH_OUTPUT_DIR" \
    -o "$RESEARCH_OUTPUT_DIR/research-agent-summary.md" \
    - > "$RUN_DIR/research-events.log" 2>&1
  RESEARCH_STATUS=$?
else
  /bin/printf 'Research was not started because declarative data export failed.\n' > "$RUN_DIR/research-events.log"
fi

for artifact_name in \
  sources.md \
  sources.json \
  blocked-sources.md \
  change-report.md \
  changes.json \
  research-agent-summary.md; do
  copy_research_artifact "$artifact_name"
done

{
  /bin/echo "$STAGE_DIR/AI_ENGINEERING_FIELD_GUIDE.md"
  /bin/echo "$STAGE_DIR/handbook-data"
  /bin/echo "$STAGE_DIR/handbook-data/book-data.json"
  /bin/echo "$STAGE_DIR/handbook-data/index-data.json"
} | LC_ALL=C /usr/bin/sort > "$RUN_DIR/expected-candidate-edit-paths.txt"
/usr/bin/find "$STAGE_DIR" -mindepth 1 -print | LC_ALL=C /usr/bin/sort \
  > "$RUN_DIR/actual-candidate-edit-paths.txt"
/usr/bin/diff -u \
  "$RUN_DIR/expected-candidate-edit-paths.txt" \
  "$RUN_DIR/actual-candidate-edit-paths.txt" \
  > "$RUN_DIR/candidate-edit-scope.diff" 2>&1
EDIT_SCOPE_STATUS=$?
for editable_file in \
  "$STAGE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
  "$STAGE_DIR/handbook-data/book-data.json" \
  "$STAGE_DIR/handbook-data/index-data.json"; do
  if [[ ! -f "$editable_file" || -L "$editable_file" ]]; then
    EDIT_SCOPE_STATUS=1
  fi
done

/bin/cp "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" "$BUILD_DIR/AI_ENGINEERING_FIELD_GUIDE.md"
/usr/bin/rsync -a "$PRISTINE_DIR/handbook/" "$BUILD_DIR/handbook/"
if [[ -f "$STAGE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" && ! -L "$STAGE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" ]]; then
  /bin/cp "$STAGE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" "$BUILD_DIR/AI_ENGINEERING_FIELD_GUIDE.md"
fi

DATA_MATERIALIZE_STATUS=1
if [[ "$DATA_EXPORT_STATUS" -eq 0 && "$EDIT_SCOPE_STATUS" -eq 0 ]]; then
  "$NODE_BIN" "$TOOLCHAIN_DIR/materialize-handbook-data.mjs" \
    --book-json "$STAGE_DIR/handbook-data/book-data.json" \
    --index-json "$STAGE_DIR/handbook-data/index-data.json" \
    --book-output "$BUILD_DIR/handbook/book-data.mjs" \
    --index-output "$BUILD_DIR/handbook/index-data.mjs" \
    > "$RUN_DIR/data-materialization.log" 2>&1
  DATA_MATERIALIZE_STATUS=$?
else
  /bin/printf 'Declarative data was not materialized because export or edit-scope validation failed.\n' \
    > "$RUN_DIR/data-materialization.log"
fi

{
  /usr/bin/diff -u \
    "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
    "$STAGE_DIR/AI_ENGINEERING_FIELD_GUIDE.md"
  /usr/bin/diff -u \
    "$PRISTINE_DIR/handbook-data/book-data.json" \
    "$STAGE_DIR/handbook-data/book-data.json"
  /usr/bin/diff -u \
    "$PRISTINE_DIR/handbook-data/index-data.json" \
    "$STAGE_DIR/handbook-data/index-data.json"
} > "$RUN_DIR/exact-changes.patch" 2>&1 || true

ARTIFACT_VALIDATION_STATUS=1
if [[ "$DATA_EXPORT_STATUS" -eq 0 && "$EDIT_SCOPE_STATUS" -eq 0 ]]; then
  "$NODE_BIN" "$TOOLCHAIN_DIR/validate-weekly-artifacts.mjs" \
    --artifact-dir "$RUN_DIR" \
    --baseline-guide "$PRISTINE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
    --candidate-guide "$STAGE_DIR/AI_ENGINEERING_FIELD_GUIDE.md" \
    --baseline-book-json "$PRISTINE_DIR/handbook-data/book-data.json" \
    --candidate-book-json "$STAGE_DIR/handbook-data/book-data.json" \
    --baseline-index-json "$PRISTINE_DIR/handbook-data/index-data.json" \
    --candidate-index-json "$STAGE_DIR/handbook-data/index-data.json" \
    --patch "$RUN_DIR/exact-changes.patch" \
    > "$RUN_DIR/research-artifact-validation.log" 2>&1
  ARTIFACT_VALIDATION_STATUS=$?
else
  /bin/printf 'Research artifacts were not validated because setup or edit-scope validation failed.\n' \
    > "$RUN_DIR/research-artifact-validation.log"
fi

HTML_BUILD_STATUS=1
HTML_VALIDATION_STATUS=1
if [[ \
  "$DATA_EXPORT_STATUS" -eq 0 \
  && "$RESEARCH_STATUS" -eq 0 \
  && "$EDIT_SCOPE_STATUS" -eq 0 \
  && "$DATA_MATERIALIZE_STATUS" -eq 0 \
  && "$ARTIFACT_VALIDATION_STATUS" -eq 0 \
]]; then
  HANDBOOK_VERSION_SUFFIX="-candidate.$RUN_VERSION" \
    "$NODE_BIN" "$BUILD_DIR/handbook/build-handbook.mjs" \
    > "$RUN_DIR/html-build.log" 2>&1
  HTML_BUILD_STATUS=$?

  if [[ "$HTML_BUILD_STATUS" -eq 0 ]]; then
    HANDBOOK_VERSION_SUFFIX="-candidate.$RUN_VERSION" \
      "$NODE_BIN" "$BUILD_DIR/handbook/validate-handbook.mjs" \
      > "$RUN_DIR/html-validation.log" 2>&1
    HTML_VALIDATION_STATUS=$?
  fi
else
  /bin/printf 'HTML build was skipped because a research, scope, data, or artifact gate failed.\n' \
    > "$RUN_DIR/html-build.log"
  /bin/printf 'HTML validation was skipped because the HTML build did not run.\n' \
    > "$RUN_DIR/html-validation.log"
fi

PDF_BUILD_STATUS=1
PDF_VALIDATION_STATUS=1
if [[ "$HTML_BUILD_STATUS" -eq 0 && "$HTML_VALIDATION_STATUS" -eq 0 && -x "$CHROME_BIN" ]]; then
  /bin/mkdir -p "$RUN_DIR/chrome-profile"
  run_with_timeout "$CHROME_TIMEOUT_SECONDS" "$CHROME_BIN" \
    --headless=new \
    --disable-gpu \
    --no-pdf-header-footer \
    --run-all-compositor-stages-before-draw \
    --generate-pdf-document-outline \
    --user-data-dir="$RUN_DIR/chrome-profile" \
    --print-to-pdf="$RUN_DIR/raw.pdf" \
    "file://$BUILD_DIR/handbook/index.html" \
    > "$RUN_DIR/chrome.log" 2>&1
  PDF_BUILD_STATUS=$?

  if [[ "$PDF_BUILD_STATUS" -eq 0 && -f "$RUN_DIR/raw.pdf" ]]; then
    PYTHONPATH="$PYTHON_PACKAGES" "$PYTHON_BIN" \
      "$BUILD_DIR/handbook/finalize-pdf.py" \
      --input "$RUN_DIR/raw.pdf" \
      --output "$CANDIDATE_PDF" \
      > "$RUN_DIR/pdf-build.log" 2>&1
    PDF_BUILD_STATUS=$?
  fi
fi

PAGE_MAP_STATUS=1
EMBEDDED_IMAGE_STATUS=1
PRODUCTION_TEXT_STATUS=1
CANDIDATE_TEXT_STATUS=1
PDF_PROOF_STATUS=1
if [[ "$PDF_BUILD_STATUS" -eq 0 && -f "$CANDIDATE_PDF" ]]; then
  PYTHONPATH="$PYTHON_PACKAGES" "$PYTHON_BIN" \
    "$BUILD_DIR/handbook/validate-pdf.py" "$CANDIDATE_PDF" \
    > "$RUN_DIR/pdf-validation.log" 2>&1
  PDF_VALIDATION_STATUS=$?

  PYTHONPATH="$PYTHON_PACKAGES" "$PYTHON_BIN" \
    "$BUILD_DIR/handbook/extract-page-map.py" \
    --pdf "$CANDIDATE_PDF" \
    --output "$RUN_DIR/candidate-page-map.json" \
    > "$RUN_DIR/page-map.log" 2>&1
  PAGE_MAP_STATUS=$?

  /opt/homebrew/bin/pdfimages -list "$CANDIDATE_PDF" > "$RUN_DIR/embedded-images.txt" 2>&1
  EMBEDDED_IMAGE_STATUS=$?
  /opt/homebrew/bin/pdftotext -layout \
    "$WORKSPACE/output/pdf/production-ai-engineering.pdf" \
    "$RUN_DIR/production.txt"
  PRODUCTION_TEXT_STATUS=$?
  /opt/homebrew/bin/pdftotext -layout "$CANDIDATE_PDF" "$RUN_DIR/candidate.txt"
  CANDIDATE_TEXT_STATUS=$?
  if [[ "$PRODUCTION_TEXT_STATUS" -eq 0 && "$CANDIDATE_TEXT_STATUS" -eq 0 ]]; then
    /usr/bin/diff -u "$RUN_DIR/production.txt" "$RUN_DIR/candidate.txt" \
      > "$RUN_DIR/pdf-text.diff" 2>&1 || true
  fi
  /usr/bin/shasum -a 256 "$CANDIDATE_PDF" > "$RUN_DIR/candidate-sha256.txt"

  if [[ \
    "$PDF_VALIDATION_STATUS" -eq 0 \
    && "$PAGE_MAP_STATUS" -eq 0 \
    && "$EMBEDDED_IMAGE_STATUS" -eq 0 \
    && "$PRODUCTION_TEXT_STATUS" -eq 0 \
    && "$CANDIDATE_TEXT_STATUS" -eq 0 \
  ]]; then
    PDF_PROOF_STATUS=0
  fi
fi

write_canonical_manifest > "$RUN_DIR/canonical-before-review-sha256.txt"
/usr/bin/diff -u \
  "$RUN_DIR/canonical-before-sha256.txt" \
  "$RUN_DIR/canonical-before-review-sha256.txt" \
  > "$RUN_DIR/canonical-drift-before-review.diff" 2>&1
BASELINE_DRIFT_BEFORE_REVIEW=$?
write_candidate_manifest > "$RUN_DIR/candidate-before-review-sha256.txt"

{
  /bin/cat "$TOOLCHAIN_DIR/weekly-handbook-review-final.md"
  /bin/printf '\n## Runtime\n\nCandidate identifier: `%s`\nCandidate version suffix: `-candidate.%s`\nCanonical workspace: `%s` (read-only)\nImmutable baseline snapshot: `%s` (read-only)\nDeclarative candidate edits: `%s` (read-only)\nEffective candidate source: `%s` (read-only)\nRun-artifact directory: `%s` (read-only)\nFinal-review output directory: `%s`\nCandidate PDF: `%s`\nResearch exit status: `%s`\nEdit-scope status: `%s`\nData-materialization status: `%s`\nResearch-artifact validation status: `%s`\nHTML build exit status: `%s`\nHTML validation exit status: `%s`\nPDF build exit status: `%s`\nPDF validation exit status: `%s`\nPDF proof status: `%s`\nBaseline drift before final review: `%s` (0 means unchanged)\n' \
    "$RUN_STAMP" "$RUN_VERSION" "$WORKSPACE" "$PRISTINE_DIR" "$STAGE_DIR" "$BUILD_DIR" \
    "$RUN_DIR" "$FINAL_REVIEW_DIR" "$CANDIDATE_PDF" "$RESEARCH_STATUS" \
    "$EDIT_SCOPE_STATUS" "$DATA_MATERIALIZE_STATUS" "$ARTIFACT_VALIDATION_STATUS" \
    "$HTML_BUILD_STATUS" "$HTML_VALIDATION_STATUS" "$PDF_BUILD_STATUS" \
    "$PDF_VALIDATION_STATUS" "$PDF_PROOF_STATUS" "$BASELINE_DRIFT_BEFORE_REVIEW"
} | run_with_timeout "$REVIEW_TIMEOUT_SECONDS" \
  "$CODEX_BIN" --search --ask-for-approval never exec \
  --ephemeral \
  --skip-git-repo-check \
  --sandbox workspace-write \
  --color never \
  -C "$FINAL_REVIEW_DIR" \
  -o "$FINAL_REVIEW_DIR/run-summary.md" \
  - > "$RUN_DIR/review-events.log" 2>&1
REVIEW_STATUS=$?

REVIEW_STATUS_VALIDATION_STATUS=1
if [[ -f "$FINAL_REVIEW_DIR/review-status.json" && ! -L "$FINAL_REVIEW_DIR/review-status.json" ]]; then
  "$NODE_BIN" "$TOOLCHAIN_DIR/validate-review-status.mjs" \
    --file "$FINAL_REVIEW_DIR/review-status.json" \
    --candidate-id "$RUN_STAMP" \
    --proof-dir "$FINAL_REVIEW_DIR/proof" \
    > "$RUN_DIR/review-status-validation.log" 2>&1
  REVIEW_STATUS_VALIDATION_STATUS=$?
  /bin/cp "$FINAL_REVIEW_DIR/review-status.json" "$RUN_DIR/review-status.json"
else
  /bin/printf 'The final audit did not produce review-status.json as a regular file.\n' \
    > "$RUN_DIR/review-status-validation.log"
  /bin/printf '{"version":1,"candidate_id":"%s","status":"failed_review","production_unchanged":false,"validation_passed":false,"visual_proof_passed":false,"notes":["The final audit did not produce a valid review-status.json file."]}\n' \
    "$RUN_STAMP" > "$RUN_DIR/review-status.json"
fi

if [[ -f "$FINAL_REVIEW_DIR/run-summary.md" && ! -L "$FINAL_REVIEW_DIR/run-summary.md" ]]; then
  /bin/cp "$FINAL_REVIEW_DIR/run-summary.md" "$RUN_DIR/run-summary.md"
else
  /bin/printf '# Weekly handbook review failed\n\nThe final audit did not produce `run-summary.md`. Review exit status: %s. See `review-events.log`.\n' \
    "$REVIEW_STATUS" > "$RUN_DIR/run-summary.md"
fi

write_candidate_manifest > "$RUN_DIR/candidate-after-review-sha256.txt"
/usr/bin/diff -u \
  "$RUN_DIR/candidate-before-review-sha256.txt" \
  "$RUN_DIR/candidate-after-review-sha256.txt" \
  > "$RUN_DIR/candidate-integrity.diff" 2>&1
CANDIDATE_INTEGRITY_STATUS=$?

write_canonical_manifest > "$RUN_DIR/canonical-after-sha256.txt"
/usr/bin/diff -u \
  "$RUN_DIR/canonical-before-sha256.txt" \
  "$RUN_DIR/canonical-after-sha256.txt" \
  > "$RUN_DIR/canonical-drift.diff" 2>&1
BASELINE_DRIFT_STATUS=$?

PHASE_FAILURE_STATUS=0
for phase_status in \
  "$DATA_EXPORT_STATUS" \
  "$RESEARCH_STATUS" \
  "$EDIT_SCOPE_STATUS" \
  "$DATA_MATERIALIZE_STATUS" \
  "$ARTIFACT_VALIDATION_STATUS" \
  "$HTML_BUILD_STATUS" \
  "$HTML_VALIDATION_STATUS" \
  "$PDF_BUILD_STATUS" \
  "$PDF_VALIDATION_STATUS" \
  "$PDF_PROOF_STATUS" \
  "$REVIEW_STATUS" \
  "$REVIEW_STATUS_VALIDATION_STATUS" \
  "$BASELINE_DRIFT_BEFORE_REVIEW" \
  "$CANDIDATE_INTEGRITY_STATUS"; do
  if [[ "$phase_status" -ne 0 ]]; then
    PHASE_FAILURE_STATUS=1
  fi
done

FINAL_STATUS=0
if [[ "$PHASE_FAILURE_STATUS" -ne 0 ]]; then
  FINAL_STATUS=74
fi
if [[ "$REVIEW_STATUS_VALIDATION_STATUS" -ne 0 ]]; then
  FINAL_STATUS=76
fi
if [[ "$CANDIDATE_INTEGRITY_STATUS" -ne 0 ]]; then
  FINAL_STATUS=77
  /bin/printf '\n## Candidate integrity failure\n\nA candidate artifact changed during final review. Treat this run as failed. See `candidate-integrity.diff`.\n' \
    >> "$RUN_DIR/run-summary.md"
fi
if [[ "$BASELINE_DRIFT_BEFORE_REVIEW" -ne 0 || "$BASELINE_DRIFT_STATUS" -ne 0 ]]; then
  FINAL_STATUS=73
  /bin/printf '\n## Stale candidate\n\nThe canonical handbook, workflow, or published PDF changed while this run was in progress. Treat this candidate as stale and rerun against the current baseline. See `canonical-drift.diff`.\n' \
    >> "$RUN_DIR/run-summary.md"
fi

if [[ "$FINAL_STATUS" -ne 0 ]]; then
  /bin/printf '{"version":1,"candidate_id":"%s","status":"failed_review","production_unchanged":false,"validation_passed":false,"visual_proof_passed":false,"notes":["The wrapper rejected this candidate. See status.txt and run-summary.md for the failed gate."]}\n' \
    "$RUN_STAMP" > "$RUN_DIR/review-status.json"
fi

/bin/printf 'run=%s\ncandidate_version=%s\ndata_export_status=%s\nresearch_status=%s\nedit_scope_status=%s\ndata_materialize_status=%s\nartifact_validation_status=%s\nhtml_build_status=%s\nhtml_validation_status=%s\npdf_build_status=%s\npdf_validation_status=%s\npdf_proof_status=%s\nreview_status=%s\nreview_status_validation_status=%s\ncandidate_integrity_status=%s\nphase_failure_status=%s\nbaseline_drift_before_review=%s\nbaseline_drift_status=%s\nfinal_status=%s\ncandidate_pdf=%s\n' \
  "$RUN_STAMP" "$RUN_VERSION" "$DATA_EXPORT_STATUS" "$RESEARCH_STATUS" \
  "$EDIT_SCOPE_STATUS" "$DATA_MATERIALIZE_STATUS" "$ARTIFACT_VALIDATION_STATUS" \
  "$HTML_BUILD_STATUS" "$HTML_VALIDATION_STATUS" "$PDF_BUILD_STATUS" \
  "$PDF_VALIDATION_STATUS" "$PDF_PROOF_STATUS" "$REVIEW_STATUS" \
  "$REVIEW_STATUS_VALIDATION_STATUS" "$CANDIDATE_INTEGRITY_STATUS" \
  "$PHASE_FAILURE_STATUS" "$BASELINE_DRIFT_BEFORE_REVIEW" "$BASELINE_DRIFT_STATUS" \
  "$FINAL_STATUS" "$CANDIDATE_PDF" \
  > "$RUN_DIR/status.txt"

/bin/printf 'weekly_handbook_run_dir=%s\nweekly_handbook_status=%s\n' "$RUN_DIR" "$FINAL_STATUS"

exit "$FINAL_STATUS"

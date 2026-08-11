const EXPECTED_LINES = [
  "Primary qualified model",
  "Compatible secondary provider/model",
  "Smaller read-only or lower-capability mode",
  "Terminal options | Deterministic result | Queued work | Human handoff",
];

export function renderFallbackFlowDiagram(lines) {
  const sourceLines = lines.map((line) => line.trim()).filter(Boolean);
  const missing = EXPECTED_LINES.filter((line) => !sourceLines.includes(line));
  if (missing.length) {
    throw new Error(`Fallback-flow source changed; missing: ${missing.join(" | ")}`);
  }
  const unknown = sourceLines.filter((line) => !EXPECTED_LINES.includes(line));
  if (unknown.length) {
    throw new Error(`Fallback-flow source changed; unsupported: ${unknown.join(" | ")}`);
  }
  if (sourceLines.some((line, index) => line !== EXPECTED_LINES[index])) {
    throw new Error("Fallback-flow source changed; the route order must remain stable");
  }

  return `
<figure class="fallback-flow-diagram" role="region" aria-label="Agent fallback state flow diagram" tabindex="0">
  <svg viewBox="0 0 760 300" role="img" aria-labelledby="fallback-flow-title fallback-flow-description">
    <title id="fallback-flow-title">Graceful fallback path for eligible failures</title>
    <desc id="fallback-flow-description">An eligible failure moves from the primary qualified model to a contract-compatible secondary provider or model. A further eligible failure may move to a disclosed read-only or lower-capability mode. From there the system returns a deterministic result, queues the work, or hands it to a human. Safety refusals, authorization or policy denials, and semantic validation failures do not enter this chain.</desc>
    <defs>
      <marker id="fallback-flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" class="fallback-arrowhead" />
      </marker>
    </defs>

    <g class="fallback-qualifier-group" aria-hidden="true">
      <text class="fallback-qualifier" x="48" y="18">ELIGIBLE FAILURES ONLY</text>
      <path class="fallback-qualifier-rule" d="M218 14 H712" />
    </g>

    <g class="fallback-lines">
      <path class="fallback-arrow" data-from="P" data-to="S" d="M380 58 V104" />
      <text class="fallback-edge-label" x="356" y="83" text-anchor="end">eligible failure; contract preserved</text>

      <path class="fallback-arrow" data-from="S" data-to="D" d="M380 122 V168" />
      <text class="fallback-edge-label" x="356" y="147" text-anchor="end">eligible failure; degraded mode disclosed</text>

      <text class="fallback-branch-label" x="404" y="212">TERMINAL OPTIONS</text>
      <path class="fallback-branch" d="M380 186 V222 M120 222 H640" />
      <path class="fallback-arrow fallback-branch-arrow" data-from="D" data-to="R" d="M120 222 V249" />
      <path class="fallback-arrow fallback-branch-arrow" data-from="D" data-to="Q" d="M380 222 V249" />
      <path class="fallback-arrow fallback-branch-arrow" data-from="D" data-to="H" d="M640 222 V249" />
    </g>

    <g class="fallback-node fallback-path-node fallback-primary" data-node="P" data-label="Primary qualified model">
      <circle class="fallback-state-point" cx="380" cy="50" r="5" />
      <text class="fallback-state-label" x="404" y="55">Primary qualified model</text>
    </g>

    <g class="fallback-node fallback-path-node" data-node="S" data-label="Compatible secondary provider/model">
      <circle class="fallback-state-point" cx="380" cy="114" r="5" />
      <text class="fallback-state-label" x="404" y="119">Compatible secondary provider/model</text>
    </g>

    <g class="fallback-node fallback-path-node fallback-degraded" data-node="D" data-label="Smaller read-only or lower-capability mode">
      <circle class="fallback-state-point" cx="380" cy="178" r="5" />
      <text class="fallback-state-label" x="404" y="183">Smaller read-only or lower-capability mode</text>
    </g>

    <g class="fallback-node fallback-terminal-node" data-node="R" data-label="Deterministic result">
      <circle class="fallback-terminal-point" cx="120" cy="258" r="5" />
      <text class="fallback-terminal-label" x="120" y="284" text-anchor="middle">Deterministic result</text>
    </g>

    <g class="fallback-node fallback-terminal-node" data-node="Q" data-label="Queued work">
      <circle class="fallback-terminal-point" cx="380" cy="258" r="5" />
      <text class="fallback-terminal-label" x="380" y="284" text-anchor="middle">Queued work</text>
    </g>

    <g class="fallback-node fallback-terminal-node" data-node="H" data-label="Human handoff">
      <circle class="fallback-terminal-point" cx="640" cy="258" r="5" />
      <text class="fallback-terminal-label" x="640" y="284" text-anchor="middle">Human handoff</text>
    </g>
  </svg>
</figure>`;
}

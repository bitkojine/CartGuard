import type { EvaluationPayload, RuleEvaluationRow } from "../types";
import { escapeHtml, statusClass } from "./webview-utils";

export const renderProcessHtml = (
    title: string,
    listingPath: string,
    rulesPath: string,
    applicabilityPath: string,
    payload: EvaluationPayload
): string => {
    const summary = payload.result?.summary;
    const evaluations = payload.result?.evaluations ?? [];
    const rows = evaluations
        .map(
            (row: RuleEvaluationRow) => `
      <tr>
        <td><code>${escapeHtml(row.rule_id)}</code></td>
        <td><span class="pill ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
        <td>${row.blocking ? "Yes" : "No"}</td>
        <td>${escapeHtml(row.requirement_type)}</td>
        <td>${escapeHtml(row.confidence)}</td>
        <td>${escapeHtml(row.message)}</td>
      </tr>
    `
        )
        .join("");

    return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        :root {
          color-scheme: light dark;
          --bg: var(--vscode-editor-background);
          --fg: var(--vscode-editor-foreground);
          --card-bg: color-mix(in oklab, var(--bg) 94%, var(--fg) 6%);
          --border: color-mix(in oklab, var(--fg) 22%, transparent);
          --ok: #1f8f4e;
          --bad: #b42318;
          --na: #667085;
          --unknown: #b26b00;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
          margin: 0;
          padding: 16px;
          background: var(--bg);
          color: var(--fg);
        }
        h1, h2 { margin: 0 0 12px 0; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 16px; }
        .card { border: 1px solid var(--border); background: var(--card-bg); border-radius: 10px; padding: 10px; }
        .path { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; margin: 4px 0; word-break: break-all; }
        .pill { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 12px; font-weight: 600; border: 1px solid currentColor; }
        .ok { color: var(--ok); }
        .bad { color: var(--bad); }
        .na { color: var(--na); }
        .unknown { color: var(--unknown); }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; padding: 8px 6px; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      <p>
        <span class="pill ${payload.valid ? "ok" : "bad"}">${payload.valid ? "No blocking issues" : "Blocking issues found"}</span>
      </p>
      <div class="card">
        <h2>Inputs</h2>
        <div class="path">Listing: ${escapeHtml(listingPath)}</div>
        <div class="path">Rules: ${escapeHtml(rulesPath)}</div>
        <div class="path">Applicability: ${escapeHtml(applicabilityPath)}</div>
      </div>
      <h2>Process Summary</h2>
      <div class="grid">
        <div class="card"><strong>Total rules</strong><div>${summary?.total_rules ?? 0}</div></div>
        <div class="card"><strong>Blocking</strong><div>${summary?.blocking_issues ?? 0}</div></div>
        <div class="card"><strong>Missing</strong><div>${summary?.missing ?? 0}</div></div>
        <div class="card"><strong>Stale</strong><div>${summary?.stale ?? 0}</div></div>
        <div class="card"><strong>Mismatched</strong><div>${summary?.mismatched ?? 0}</div></div>
        <div class="card"><strong>Warnings</strong><div>${summary?.warnings ?? 0}</div></div>
        <div class="card"><strong>Unknown</strong><div>${summary?.unknown ?? 0}</div></div>
        <div class="card"><strong>Not applicable</strong><div>${summary?.not_applicable ?? 0}</div></div>
        <div class="card"><strong>Present</strong><div>${summary?.present ?? 0}</div></div>
      </div>
      <h2>Rule Outcomes</h2>
      <table>
        <thead>
          <tr>
            <th>Rule</th>
            <th>Status</th>
            <th>Blocking</th>
            <th>Type</th>
            <th>Confidence</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
  </html>
  `;
};

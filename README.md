# Fraud Copilot Demo

Fraud Copilot is an evidence-grounded decision-support workspace for unemployment insurance investigations. It demonstrates risk-ranked case triage, evidence review, grounded policy/case assistance, AI-assisted memo drafting, human-only disposition, and an audit trail.

## Important demo boundaries

- All claimant, employer, case, investigator, and policy data is synthetic.
- No real government system, claimant PII, database, authentication service, or live LLM is connected.
- Risk scores prioritize investigation workload only. They do not represent probability of fraud.
- Copilot responses are scripted and must cite case or policy evidence. Unsupported queries return `No grounded answer found for this query.`
- Final disposition is always a human investigator action and requires explicit confirmation.
- Demo dispositions are stored only in browser session state and do not modify the JSON datasets.

## Main flows

- **Risk Queue** — sort and filter cases by investigation priority.
- **Case Workspace** — review risk signals, evidence availability, claim details, and investigator assignment.
- **Fraud Copilot** — ask grounded questions with visible citations.
- **Draft Investigation Memo** — visibly AI-assisted until edited by the investigator.
- **Disposition** — Confirmed Fraud, False Positive, or Inconclusive, with a confirmation step and audit event.
- **Policy Search** — search the local synthetic policy corpus.
- **Admin** — read-only demo model/threshold information.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm install
npm run build
```

The production build is written to `dist/`.

## Deployment

For a static host such as Render:

- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Add a client-side routing rewrite from `/*` to `/index.html`

## Technology

React, TypeScript, Vite, TanStack Router, Tailwind CSS, and Lucide icons.

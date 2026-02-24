# CartGuard: Spec-Driven AI Compliance Infrastructure for Ecommerce

## The Problem

**Marketplace sellers lose revenue because compliance verification is broken.**

You're selling electronics on Amazon EU, eBay Germany, or other regulated channels. You have a product that's genuinely compliant—you have the certifications, the test reports, the declarations of conformity. But:

- ❌ Which documents do *you actually need* for *this specific product* in *this jurisdiction*?
- ❌ Which documents does *the marketplace require* (often stricter than law)?
- ❌ How do you prove to the marketplace that you have everything before listing, not *after rejection*?
- ❌ When compliance documents expire, how do you track re-verification?
- ❌ How do you manage this across 5 marketplaces, 3 jurisdictions, 50 product SKUs?

**Result:** Sellers spend weeks in back-and-office work, miss time-to-market windows, or get listings suspended post-launch.

## The Solution

**CartGuard is a spec-driven compliance engine that answers: "Am I ready to list this product?"**

CartGuard:

1. **Knows the rules:** EU RED/LVD/EMC directives, marketplace-specific requirements, product category rules—encoded as executable specifications
2. **Knows your product:** Equipment type, voltage, radio capabilities, evidence documents (certs, test reports, declarations)
3. **Tells you what's missing:** Before you submit to the marketplace, CartGuard runs an applicability engine to determine which rules apply to your product, then checks that all required evidence is present, valid, and not stale

**In practice:**
- ✅ Upload product specs + evidence documents → CartGuard evaluates compliance in seconds
- ✅ See exactly which documents are missing, which are expired, which marketplace requires what
- ✅ 80% faster compliance verification vs. manual spreadsheet-based review
- ✅ Reusable rules across jurisdictions and channels
- ✅ No lawyers per listing; rules are encoded once by compliance experts

## Why Sellers Pay

1. **Risk Avoidance:** Avoid marketplace suspension, fines, or forced fulfillment refunds. A single suspension costs weeks of lost revenue and reputational damage.
2. **Time to Market:** Compress 1-week manual review to 1-minute automated check. Launch compliant products same day.
3. **Operating Cost:** Replace 2–3 FTE compliance checkers with a system. Works 24/7, never forgets evidence expiry dates.
4. **Scale:** Easily onboard new products, marketplaces, jurisdictions without hiring more staff.
5. **Audit Trail:** Prove to regulators and marketplaces that you tested compliance systematically, reducing liability.

## Who Buys

- **Marketplace Sellers:** Brands, aggregators, and resellers selling electronics on Amazon, eBay, Aliexpress, ASOS
- **Marketplace Operators:** Platforms like Amazon, eBay enforcing compliance at scale
- **Compliance Teams at Scale:** B2B sellers with thousands of SKUs across regions

## The Technology

CartGuard is built as a **monorepo with spec-driven architecture:**

- **`@cartguard/spec`:** Compliance rules, product schemas, evidence models—Zod-validated, language-agnostic
- **`@cartguard/engine`:** Pure functional core that evaluates applicability and generates compliance reports
- **`@cartguard/vscode-extension`:** Developer experience layer for compliance teams; integrates into VS Code
- **`@cartguard/ai`:** AI-powered evidence extraction and claim verification (research phase)
- **`@cartguard/cli`:** Programmatic access for enterprise integrations

**Key design principle:** Rules and data are separated from infrastructure. A compliance specialist can read and modify rules in JSON without touching code.

---

## Documentation

- **[Domain Model & Ubiquitous Language](README/domain-model-ddd.md)** — Compliance concepts, entities, aggregates
- **[VS Code Extension Setup](README/vscode-extension-local-setup.md)** — Local development environment
- **[Docker Browser Demo](README/docker-browser-demo.md)** — Run CartGuard in a browser without local setup
- **[Pilot Plan Template](README/pilot-plan-template.md)** — Go-to-market and customer engagement
- **[Technical Debt Register](README/technical-debt.md)** — Architectural improvements in progress
- **[Domain Model Maturity Index](DOMAIN_MODEL_INDEX.md)** — Purity score, richness, gaps, and roadmap

---

## Getting Started

### For Compliance Teams
1. Clone the repo
2. Follow [VS Code Extension Setup](README/vscode-extension-local-setup.md)
3. Load demo compliance rules and test against sample products

### For Integrators
1. Install `@cartguard/engine` from npm (when published)
2. Pass product specs and evidence documents to `evaluateListingAgainstRuleCatalog()`
3. Consume structured JSON compliance reports

### For Product / Sales
- See [Pilot Plan Template](README/pilot-plan-template.md) for go-to-market strategy and pricing anchors
- Open [Domain Model Index](DOMAIN_MODEL_INDEX.md) to understand current maturity and roadmap to enterprise-grade

---

## License

MIT — see `LICENSE`.

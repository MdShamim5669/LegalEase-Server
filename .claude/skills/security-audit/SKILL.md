---
name: security-audit
description: Run the LegalEase security checklist across routes, auth, uploads, payments, and privacy. Use before merges or releases, or when the user says "audit" or "security check".
---

# security-audit

Delegate to the `security-reviewer` agent, then also run these mechanical checks:

```bash
# routes missing checkAuth (review each hit; public routes are expected only for auth, public lists, webhook)
grep -rn "router\.\(get\|post\|patch\|put\|delete\)" src/app/module --include=*.route.ts | grep -v checkAuth

# suspicious secrets
grep -rniE "(sk_live|sk_test|whsec_|AKIA|api[_-]?key\s*=\s*['\"][A-Za-z0-9]{16,})" . --exclude-dir=node_modules --exclude-dir=.git

# empty source files
find src -name "*.ts" -size 0

# Stripe calls near transactions
grep -rn "\$transaction" src | head -50
```

Then verify against PRD Appendix A (lessons from PH Healthcare). Output a table: item, status (pass/fail), file:line, fix.

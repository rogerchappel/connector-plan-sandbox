# Release Candidate Notes

## Classification

ship

## Verification

- `npm test` - pass, 3 tests.
- `npm run check` - pass, syntax checks for library, CLI, and tests.
- `npm run build` - pass, 9 required files present.
- `npm run smoke` - pass, wrote `/tmp/connector-plan-sandbox-smoke.md`.
- `bash scripts/validate.sh` - pass, full validation sequence completed.

## Known Limits

- Policies are simple JSON fixtures, not live connector schemas.
- The receipt describes intended impact but cannot prove remote state.

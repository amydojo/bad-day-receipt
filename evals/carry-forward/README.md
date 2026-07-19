# Carry Forward essential eval subset

Run `npm run evals:carry-forward`.

This deterministic release subset exercises the application trust boundary without making network calls. It covers the grounded canonical plan, optional-source behavior, prompt-injection text, Unicode input, fabricated and ambiguous evidence, unsafe display text, unsupported actions, empty output, required-step deferral, and conflicting choices/IDs.

The server contract, summary-completeness repair, and one-repair behavior live in `tests/api/compile-task.test.ts`. A live model smoke test is intentionally separate because it depends on project quota and network availability.

`tests/api/compile-task.diagnostic.test.ts` retains a synthetic-only latency ladder for future troubleshooting. It is skipped unless `RUN_OPENAI_DIAGNOSTICS=1`, is excluded from paid ordinary CI behavior, and serializes only allowlisted lifecycle metadata. It never prints credentials, prompts, source text, evidence, or model output.

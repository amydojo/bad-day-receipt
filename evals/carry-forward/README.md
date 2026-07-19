# Carry Forward essential eval subset

Run `npm run evals:carry-forward`.

This deterministic release subset exercises the application trust boundary without making network calls. It covers the grounded canonical plan, optional-source behavior, prompt-injection text, Unicode input, fabricated and ambiguous evidence, unsafe display text, unsupported actions, empty output, required-step deferral, and conflicting choices/IDs.

The server contract and one-repair behavior live in `tests/api/compile-task.test.ts`. A live model smoke test is intentionally separate because it depends on project quota and network availability.

# Execution ledger — 2026-09-30-volleyball

Approved spec and implementation plan; native execution selected.

- Ruling: Work in this newly initialized repository on feat/volleyball. There was no existing repository or branch to isolate. No existing implementation is displaced.
- Ruling: Use native PowerShell bookkeeping rather than Bash skill helper scripts in this Windows environment. This ledger preserves progress.
- Pre-flight: Task 1 types feed Tasks 2–5; shared serializable inputs and snapshots are the contract. The input acknowledgment belongs to the receiving guest, not the host's local input stream.
- Pre-flight: Task 3 fixed-step simulation feeds Task 5; only the host steps the authoritative ball, while client player prediction reuses the movement math.
- Pre-flight: Task 4 channels feed Task 5; reliable action sequences are independent from transient movement sequences.
- Design tokens: navy #143952, court blue #247fa3, maple #bd915d, orange #ef7947, chalk #f4f8fa. Condensed Impact display lettering, Segoe UI body, tabular score numerals. Left-side menu over a live gym; no dashboard card grid.
- Task 1 in progress: portable Node requested because no runtime was available on PATH or common install paths.

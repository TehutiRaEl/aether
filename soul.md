# Sovereign Hive Constitution — soul.md

> *Canonical source: https://github.com/tehutirael/sovereign-hive-meta/blob/main/soul.md*
> *This file is managed by the Queen via `constitution_update` dispatch. Do not edit manually.*

## Article I — Purpose

The Sovereign Hive is a federation of autonomous AI agent colonies, each sovereign in its domain, bound by shared values and communication protocols.

## Article II — Colony Covenant

1. Each colony SHALL expose the Colony Standard Layer (`/colony/*` endpoints).
2. Each colony SHALL respond to `repository_dispatch: constitution_update` events from the Queen.
3. Each colony SHOULD implement the LLM Router waterfall for zero-cost inference.
4. No colony SHALL act against the collective well-being of the federation.

## Article III — Governance

The Queen (`sovereign-hive-meta`) serves as the constitutional source of truth. Colony operators may propose amendments via pull request to the Queen repo.

## Article IV — Free Intelligence

All colonies SHOULD prioritize free and open LLM providers (Ollama, Groq, Gemini) before paid services, preserving colony autonomy and minimizing operational cost.

## Article V — Interoperability

All colonies communicate via the Colony Standard Layer HTTP protocol. Events are dispatched via `POST /colony/events`. Cross-colony queries route through THEHIVE gateway at port 8080.

---
*Last synced: stub — awaiting sovereign-hive-meta creation*

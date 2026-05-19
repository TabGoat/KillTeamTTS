# Sunor Music Agent

name: sunor-music-agent
summary: Local Copilot agent that generates music using Sunor (via the local Flask service)
run: powershell -File .\copilot_agent_wrapper.ps1

description: |
  This agent integrates the local Sunor Flask service into the Copilot CLI as a selectable agent.
  It launches (or connects to) the local Flask service and lets you generate music using presets or custom prompts.

usage: |
  1. Ensure the Flask service is running: .\run_sunor_agent.ps1 -ApiKey "sk_your_key_here"
  2. From the repository root, run the wrapper: .\copilot_agent_wrapper.ps1 -Preset lofi
  3. Alternatively, run: copilot /agent and select this agent if Copilot scans AGENTS.md

notes: |
  - This is a lightweight integration that expects a local HTTP service at http://localhost:5000
  - For production, add auth and secure hosting; do not expose API keys in public repos.

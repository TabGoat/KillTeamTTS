Sunor Flask agent

Setup:
1. Install dependencies: python -m pip install -r sunor_agent_requirements.txt
2. Set API key in PowerShell for current session:
   $env:SUNOR_API_KEY = "sk_your_key_here"
   Or persist: setx SUNOR_API_KEY "sk_your_key_here"
3. Run the agent:
   python sunor_agent_app.py

Endpoints:
- POST /generate  JSON: {"prompt": "...", "duration": 20, "make_instrumental": true}
  Returns: {"task_id": "...", "audio_url": "...", "local_path": "outputs/out_<task>.mp3"}
- GET /download/<filename>  Download saved files (for local testing only)

Security:
- Do NOT commit API keys to source control. Rotate the key you pasted earlier.
- This is a minimal scaffold for local testing. Harden before exposing publicly.

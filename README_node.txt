Node.js Sunor test agent

Requirements:
- Node.js 18+ (for native ESM and fetch compatibility)
- npm

Setup:
1. Install deps: npm install
2. Set API key (PowerShell): $env:SUNOR_API_KEY = "sk_your_key_here"
   macOS/Linux: export SUNOR_API_KEY="sk_your_key_here"
3. Run test generation:
   node sunor_node_generate.js "A chill lo-fi beat with soft piano"

Outputs:
- Saved audio files will be written to ./outputs

Docker (Python agent):
- Build: docker build -t sunor-python-agent .
- Run: docker run --rm -e SUNOR_API_KEY="sk_your_key_here" -p 5000:5000 sunor-python-agent
- Then POST to http://localhost:5000/generate

Security:
- Do NOT commit secret keys. Rotate the key you pasted earlier.

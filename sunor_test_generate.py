import os, time, requests, sys

KEY = os.environ.get("SUNOR_API_KEY")
if not KEY:
    print("ERROR: SUNOR_API_KEY not set")
    sys.exit(1)

HEAD = {"x-api-key": KEY, "Content-Type": "application/json"}
API_BASE = "https://sunor.cc/api/v1/task"

payload = {
    "model": "suno",
    "task_type": "music",
    "input": {
        "gpt_description_prompt": "Test: short ambient pad with gentle piano and subtle percussion",
        "make_instrumental": True,
        "duration": 12
    }
}

print("Creating task...")
try:
    r = requests.post(API_BASE, headers=HEAD, json=payload, timeout=30)
    r.raise_for_status()
except Exception as e:
    print("Create request failed:", e)
    sys.exit(1)

print("Create response:", r.status_code)
print(r.text)

task_id = r.json().get("data", {}).get("task_id")
if not task_id:
    print("No task_id returned; exiting")
    sys.exit(1)

print("Task ID:", task_id)

poll_url = f"{API_BASE}/{task_id}"

for _ in range(60):  # poll up to ~5 minutes (60*5s)
    try:
        s = requests.get(poll_url, headers=HEAD, timeout=30)
        s.raise_for_status()
    except Exception as e:
        print("Poll request failed:", e)
        sys.exit(1)
    print("Poll response:", s.status_code)
    # print partial body to aid debugging but avoid leaking the key
    print(s.text)
    data = s.json().get("data", {})
    status = data.get("status")
    if status in ("success", "failure"):
        break
    time.sleep(5)

if status != "success":
    print("Generation did not succeed. Status:", status)
    sys.exit(1)

out = data.get("output", {}).get("result", [])
if not out:
    print("No output in result")
    sys.exit(1)

audio_url = out[0].get("audio_url")
if not audio_url:
    print("No audio_url found")
    sys.exit(1)

print("Audio URL:", audio_url)

# Download audio
try:
    a = requests.get(audio_url, timeout=60)
    a.raise_for_status()
except Exception as e:
    print("Failed to download audio:", e)
    sys.exit(1)

out_path = os.path.join(os.getcwd(), "sunor_out.mp3")
with open(out_path, "wb") as fh:
    fh.write(a.content)

print("Saved file:", out_path)

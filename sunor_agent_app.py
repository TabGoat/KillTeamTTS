import os
import time
import requests
from flask import Flask, request, jsonify, send_from_directory

API_BASE = "https://sunor.cc/api/v1/task"
SUNOR_KEY_ENV = "SUNOR_API_KEY"
OUTPUT_DIR = "outputs"

app = Flask(__name__)

def get_api_key():
    return os.environ.get(SUNOR_KEY_ENV)

@app.route("/generate", methods=["POST"])
def generate():
    """Create a Sunor task, poll until finished, download audio, and return local path + remote URL.
    Expected JSON: {"prompt": "...", "duration": 20, "make_instrumental": true}
    """
    key = get_api_key()
    if not key:
        return jsonify({"error": f"Environment variable {SUNOR_KEY_ENV} not set"}), 500

    payload = request.get_json(force=True)
    prompt = payload.get("prompt") or payload.get("description")
    if not prompt:
        return jsonify({"error": "Missing 'prompt' in JSON body"}), 400

    duration = int(payload.get("duration", 20))
    make_instrumental = bool(payload.get("make_instrumental", True))

    headers = {"x-api-key": key, "Content-Type": "application/json"}
    body = {
        "model": "suno",
        "task_type": "music",
        "input": {
            "gpt_description_prompt": prompt,
            "make_instrumental": make_instrumental,
            "duration": duration,
        },
    }

    try:
        r = requests.post(API_BASE, headers=headers, json=body)
        r.raise_for_status()
    except Exception as e:
        return jsonify({"error": "Failed to create task", "detail": str(e)}), 502

    data = r.json().get("data", {})
    task_id = data.get("task_id")
    if not task_id:
        return jsonify({"error": "No task_id returned", "response": r.json()}), 502

    # poll
    poll_url = f"{API_BASE}/{task_id}"
    timeout = int(payload.get("timeout", 300))
    interval = float(payload.get("poll_interval", 5))
    start = time.time()

    result = None
    while time.time() - start < timeout:
        try:
            s = requests.get(poll_url, headers=headers)
            s.raise_for_status()
        except Exception as e:
            return jsonify({"error": "Failed to poll task", "detail": str(e)}), 502
        dd = s.json().get("data", {})
        status = dd.get("status")
        if status in ("success", "failure"):
            result = dd
            break
        time.sleep(interval)

    if not result:
        return jsonify({"error": "Timeout waiting for task", "task_id": task_id}), 504

    if result.get("status") != "success":
        return jsonify({"error": "Generation failed", "result": result}), 400

    out = result.get("output", {}).get("result", [])
    if not out:
        return jsonify({"error": "No output URL", "result": result}), 502

    audio_url = out[0].get("audio_url")
    if not audio_url:
        return jsonify({"error": "No audio_url in output", "result": result}), 502

    # download
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    local_fname = f"out_{task_id}.mp3"
    local_path = os.path.join(OUTPUT_DIR, local_fname)

    try:
        a = requests.get(audio_url, stream=True)
        a.raise_for_status()
        with open(local_path, "wb") as fh:
            for chunk in a.iter_content(chunk_size=8192):
                if chunk:
                    fh.write(chunk)
    except Exception as e:
        return jsonify({"error": "Failed to download audio", "detail": str(e), "audio_url": audio_url}), 502

    return jsonify({"task_id": task_id, "audio_url": audio_url, "local_path": local_path})


@app.route("/download/<path:filename>")
def download_file(filename):
    # Serve files from outputs/ - only for local testing. Do NOT expose in production.
    return send_from_directory(OUTPUT_DIR, filename, as_attachment=True)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

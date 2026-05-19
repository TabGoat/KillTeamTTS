import os
import time
import json
import uuid
import sqlite3
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

import requests
from flask import Flask, request, jsonify, send_from_directory, abort

# Configuration
API_BASE = "https://sunor.cc/api/v1/task"
SUNOR_KEY_ENV = "SUNOR_API_KEY"
OUTPUT_DIR = "outputs"
DB_PATH = "sunor_tasks.db"
MAX_CONCURRENT = int(os.environ.get("SUNOR_MAX_CONCURRENT", 3))
POLL_INTERVAL = float(os.environ.get("SUNOR_POLL_INTERVAL", 4))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sunor_agent")

app = Flask(__name__)
executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT + 1)
semaphore = threading.Semaphore(MAX_CONCURRENT)

# DB helpers
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS tasks (
            task_id TEXT PRIMARY KEY,
            status TEXT,
            params TEXT,
            audio_url TEXT,
            local_path TEXT,
            error TEXT,
            created_at REAL,
            updated_at REAL
        )
        """
    )
    conn.commit()
    conn.close()


def db_insert(task_id, params):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    now = time.time()
    cur.execute(
        "INSERT OR REPLACE INTO tasks (task_id, status, params, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (task_id, "queued", json.dumps(params), now, now),
    )
    conn.commit()
    conn.close()


def db_update(task_id, **kwargs):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    pairs = []
    values = []
    for k, v in kwargs.items():
        pairs.append(f"{k} = ?")
        values.append(v)
    values.append(task_id)
    sql = f"UPDATE tasks SET {', '.join(pairs)}, updated_at = ? WHERE task_id = ?"
    cur.execute(sql, (*values, time.time(), task_id))
    conn.commit()
    conn.close()


def db_get(task_id):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT task_id, status, params, audio_url, local_path, error, created_at, updated_at FROM tasks WHERE task_id = ?", (task_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "task_id": row[0],
        "status": row[1],
        "params": json.loads(row[2]) if row[2] else {},
        "audio_url": row[3],
        "local_path": row[4],
        "error": row[5],
        "created_at": row[6],
        "updated_at": row[7],
    }

# Utility
def get_api_key():
    return os.environ.get(SUNOR_KEY_ENV)


def ensure_outputs():
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def create_sunor_task(key, params):
    headers = {"x-api-key": key, "Content-Type": "application/json"}
    try:
        r = requests.post(API_BASE, headers=headers, json=params, timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.exception("create task request failed")
        raise


def poll_task(key, task_id, timeout=300):
    url = f"{API_BASE}/{task_id}"
    headers = {"x-api-key": key}
    start = time.time()
    while time.time() - start < timeout:
        r = requests.get(url, headers=headers, timeout=30)
        r.raise_for_status()
        data = r.json().get("data", {})
        status = data.get("status")
        if status in ("success", "failure"):
            return data
        time.sleep(POLL_INTERVAL)
    raise TimeoutError("Polling timed out")


def download_audio(url, out_path):
    r = requests.get(url, stream=True, timeout=60)
    r.raise_for_status()
    with open(out_path, "wb") as fh:
        for chunk in r.iter_content(chunk_size=8192):
            if chunk:
                fh.write(chunk)


# Background worker for a single job
def worker_job(task_id):
    logger.info("Worker starting for %s", task_id)
    # get task params
    rec = db_get(task_id)
    if not rec:
        logger.error("Task not found in DB: %s", task_id)
        return

    params = rec["params"] if isinstance(rec["params"], dict) else json.loads(rec["params"])
    key = get_api_key()
    if not key:
        db_update(task_id, status="failure", error="SUNOR_API_KEY not set")
        return

    # acquire semaphore to limit concurrent upstream calls
    acquired = semaphore.acquire(timeout=30)
    if not acquired:
        db_update(task_id, status="failure", error="Timeout acquiring concurrency slot")
        return

    db_update(task_id, status="running")
    try:
        # build request body expected by Sunor
        body = {
            "model": "suno",
            "task_type": "music",
            "input": {
                "gpt_description_prompt": params.get("prompt"),
                "make_instrumental": params.get("make_instrumental", True),
                "duration": params.get("duration", 30),
            },
        }

        # create task (with simple retry)
        attempts = 0
        max_attempts = 3
        create_resp = None
        while attempts < max_attempts:
            try:
                create_resp = create_sunor_task(key, body)
                break
            except Exception as e:
                attempts += 1
                backoff = attempts * 2
                logger.warning("Create task failed (attempt %s), retrying in %ss", attempts, backoff)
                time.sleep(backoff)
        if not create_resp:
            raise RuntimeError("Failed to create task after retries")

        task_info = create_resp.get("data", {})
        sunor_task_id = task_info.get("task_id")
        if not sunor_task_id:
            raise RuntimeError("No task_id returned from Sunor: %s" % create_resp)

        # poll
        poll_data = poll_task(key, sunor_task_id, timeout=params.get("timeout", 300))
        if poll_data.get("status") != "success":
            db_update(task_id, status="failure", error=json.dumps(poll_data))
            return

        out = poll_data.get("output", {}).get("result", [])
        if not out:
            db_update(task_id, status="failure", error="No output returned")
            return

        audio_url = out[0].get("audio_url")
        if not audio_url:
            db_update(task_id, status="failure", error="No audio_url in output")
            return

        ensure_outputs()
        local_fname = f"out_{task_id}.mp3"
        local_path = os.path.join(OUTPUT_DIR, local_fname)
        download_audio(audio_url, local_path)

        db_update(task_id, status="success", audio_url=audio_url, local_path=local_path)
        logger.info("Task %s completed successfully", task_id)

    except Exception as e:
        logger.exception("Worker job failed for %s", task_id)
        db_update(task_id, status="failure", error=str(e))
    finally:
        try:
            semaphore.release()
        except Exception:
            pass


# Flask endpoints
@app.route("/presets", methods=["GET"])
def get_presets():
    try:
        with open("presets.json", "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception:
        data = {}
    return jsonify(data)


@app.route("/generate", methods=["POST"])
def generate():
    payload = request.get_json(force=True)
    prompt = payload.get("prompt")
    preset = payload.get("preset")
    if not prompt and not preset:
        return jsonify({"error": "Missing 'prompt' or 'preset'"}), 400

    # if preset provided, merge
    params = {}
    if preset:
        try:
            with open("presets.json", "r", encoding="utf-8") as fh:
                presets = json.load(fh)
            preset_obj = presets.get(preset)
            if not preset_obj:
                return jsonify({"error": "Unknown preset"}), 400
            params.update(preset_obj)
        except Exception:
            return jsonify({"error": "Failed to load presets"}), 500

    if prompt:
        params["prompt"] = prompt

    params["duration"] = int(payload.get("duration", params.get("duration", 30)))
    params["make_instrumental"] = bool(payload.get("make_instrumental", params.get("make_instrumental", True)))

    task_id = uuid.uuid4().hex
    db_insert(task_id, params)

    # submit background job
    executor.submit(worker_job, task_id)

    return jsonify({"task_id": task_id, "status": "queued"}), 202


@app.route("/status/<task_id>", methods=["GET"])
def status(task_id):
    rec = db_get(task_id)
    if not rec:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(rec)


@app.route("/download/<path:filename>", methods=["GET"])
def download(filename):
    # local testing only
    safe_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(safe_path):
        return abort(404)
    return send_from_directory(OUTPUT_DIR, filename, as_attachment=True)


if __name__ == "__main__":
    init_db()
    ensure_outputs()
    port = int(os.environ.get("PORT", 5000))
    logger.info("Starting Sunor agent on port %s", port)
    app.run(host="0.0.0.0", port=port)

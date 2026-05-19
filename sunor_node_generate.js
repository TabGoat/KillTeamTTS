import fs from 'fs';
import axios from 'axios';

const KEY = process.env.SUNOR_API_KEY;
if (!KEY) {
  console.error('ERROR: SUNOR_API_KEY not set');
  process.exit(1);
}

const HEADERS = { 'x-api-key': KEY, 'Content-Type': 'application/json' };
const API_BASE = 'https://sunor.cc/api/v1/task';

async function createTask(prompt, duration = 12, make_instrumental = true) {
  const payload = {
    model: 'suno',
    task_type: 'music',
    input: {
      gpt_description_prompt: prompt,
      make_instrumental: make_instrumental,
      duration: duration,
    },
  };

  const res = await axios.post(API_BASE, payload, { headers: HEADERS, timeout: 30000 });
  return res.data.data.task_id;
}

async function pollTask(taskId, interval = 5000, timeout = 5 * 60 * 1000) {
  const url = `${API_BASE}/${taskId}`;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await axios.get(url, { headers: HEADERS, timeout: 30000 });
    const data = res.data.data || {};
    const status = data.status;
    console.log('Status:', status);
    if (status === 'success') return data;
    if (status === 'failure') throw new Error('Generation failed: ' + JSON.stringify(data));
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Timeout waiting for task');
}

async function downloadAudio(url, outPath) {
  const res = await axios.get(url, { responseType: 'stream', timeout: 60000 });
  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(outPath);
    res.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

(async () => {
  try {
    const prompt = process.argv[2] || 'Short ambient pad with gentle piano and subtle percussion';
    console.log('Creating task for prompt:', prompt);
    const taskId = await createTask(prompt, 12, true);
    console.log('Task created:', taskId);
    const result = await pollTask(taskId);
    const out = result.output?.result || [];
    if (!out.length) throw new Error('No output returned');
    const audioUrl = out[0].audio_url;
    console.log('Audio URL:', audioUrl);
    const outDir = './outputs';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const outPath = `${outDir}/sunor_node_out_${taskId}.mp3`;
    await downloadAudio(audioUrl, outPath);
    console.log('Saved to', outPath);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();

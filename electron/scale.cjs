// Bluetooth scale integration for the desktop app.
//
// Reading the Beurer scale is done by an external helper (a small macOS app bundle that owns the
// Bluetooth permission and runs read_scale.py). This module launches it, follows its log for
// progress, and returns the readings it appended to measurements.jsonl. Everything machine
// specific (paths, the scale's PIN) comes from scale.json in the app's user-data folder:
//   { "app": "/path/BLERunner.app", "args": ["read_scale.py", "180", "--pin", "1234", "--user", "1"],
//     "measurements": "/path/measurements.jsonl", "log": "/path/run.log", "timeoutSeconds": 220 }
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

function loadConfig(userDataDir) {
  const file = path.join(userDataDir, 'scale.json');
  if (!fs.existsSync(file)) return null;
  const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!cfg.app || !cfg.measurements) throw new Error(`scale.json needs "app" and "measurements" (${file})`);
  return { args: [], timeoutSeconds: 220, ...cfg, file };
}

// Pair each Weight Measurement (0x2A9D) line with the Body Composition (0x2A9C) line the scale
// sent in the same notification burst (same received_at). Mirrors import_gym_weight.py.
function parseMeasurements(text) {
  const readings = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    if (r.characteristic === '2a9d') {
      readings.push({ w: r, bc: null });
    } else if (r.characteristic === '2a9c') {
      const last = readings[readings.length - 1];
      if (last && !last.bc && last.w.received_at === r.received_at) last.bc = r;
    }
  }
  return readings.map(({ w, bc }) => {
    const out = {
      scaleTime: w.scale_time, receivedAt: w.received_at,
      weightKg: w.weight_kg, userIndex: w.user_index, heightM: w.height_m, bmi: w.bmi,
      raw: { weightMeasurement: w.raw }
    };
    if (bc) {
      out.raw.bodyComposition = bc.raw;
      if (bc.impedance_ohm) {  // all zeros = the scale could not measure body composition
        out.bodyComposition = {
          fatPct: bc.body_fat_pct, musclePct: bc.muscle_pct, softLeanMassKg: bc.soft_lean_mass_kg,
          bodyWaterMassKg: bc.body_water_mass_kg, basalMetabolismKj: bc.basal_metabolism_kj,
          impedanceOhm: bc.impedance_ohm
        };
      }
    }
    return out;
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Launch the helper and resolve with the readings it produced. onProgress gets log lines.
async function readScale(cfg, onProgress = () => {}) {
  const startSize = fs.existsSync(cfg.measurements) ? fs.statSync(cfg.measurements).size : 0;
  if (cfg.log) fs.writeFileSync(cfg.log, '');
  const child = spawn('open', ['-n', '-W', cfg.app, '--args', ...cfg.args], { stdio: 'ignore' });
  let exited = false;
  child.on('exit', () => { exited = true; });
  child.on('error', () => { exited = true; });

  const deadline = Date.now() + cfg.timeoutSeconds * 1000;
  let lastLine = '';
  let finished = false;
  while (Date.now() < deadline) {
    await sleep(1000);
    if (cfg.log && fs.existsSync(cfg.log)) {
      const lines = fs.readFileSync(cfg.log, 'utf8').trim().split('\n').filter(Boolean);
      const line = lines[lines.length - 1] || '';
      if (line && line !== lastLine) { lastLine = line; onProgress(line.replace(/^\[\d\d:\d\d:\d\d\]\s*/, '')); }
      if (/\bexit=\d+/.test(line)) finished = true;
    }
    if (finished || (exited && !cfg.log)) break;
  }
  const text = fs.existsSync(cfg.measurements) ? fs.readFileSync(cfg.measurements, 'utf8') : '';
  const readings = parseMeasurements(text.slice(startSize));
  return { readings, timedOut: !finished && Date.now() >= deadline, lastLine };
}

module.exports = { loadConfig, parseMeasurements, readScale };

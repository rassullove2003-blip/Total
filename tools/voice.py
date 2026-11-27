"""Narration: text -> voice.wav + voice.json (word timings + per-frame mouth envelope).
Usage: python3 tools/voice.py <out_dir> "<text>" [speed]
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent
out = Path(sys.argv[1]); text = sys.argv[2]; speed = float(sys.argv[3]) if len(sys.argv) > 3 else 1.2
out.mkdir(parents=True, exist_ok=True)
k = Kokoro(str(ROOT / "voices/kokoro-v1.0.onnx"), str(ROOT / "voices/voices-v1.0.bin"))
a, sr = k.create(text.replace('"', "").replace("“", "").replace("”", ""), voice="bm_george", speed=speed, lang="en-gb")
sf.write(out / "raw.wav", a, sr)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(out / "raw.wav"), "-af",
                "silenceremove=stop_periods=-1:stop_duration=0.2:stop_threshold=-40dB:stop_silence=0.2", str(out / "voice.wav")], check=True)
(out / "raw.wav").unlink()
a, sr = sf.read(out / "voice.wav")
hop = sr // 30
env = [float(np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2))) for i in range(len(a) // hop + 1)]
m = max(env) or 1; env = [round(min(1, e / (0.6 * m)), 3) for e in env]
pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(out / "voice.wav"), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
au = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
segs, _ = WhisperModel("small", device="cpu", compute_type="int8").transcribe(au, word_timestamps=True, initial_prompt=text)
words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for s in segs for w in s.words]
# merge split tokens ("Thirty" "-eight", "o" "'clock", "2" ",800")
merged = []
for w in words:
    if merged and w["w"][:1] in "-',." and len(w["w"]) > 1 and not w["w"][1:2].isspace():
        merged[-1] = {"w": merged[-1]["w"] + w["w"], "s": merged[-1]["s"], "e": w["e"]}
    else: merged.append(w)
words = merged
# captions should read like the script: align recognised words to script words, take the script's spelling
import difflib, re
norm = lambda x: re.sub(r"[^a-z0-9]", "", x.lower())
script = text.replace('"', "").replace("“", "").replace("”", "").split()
sm = difflib.SequenceMatcher(None, [norm(w["w"]) for w in words], [norm(x) for x in script], autojunk=False)
aligned = []
ops = sm.get_opcodes()
for op, a0, a1, b0, b1 in ops:
    if op == "equal" or (op == "replace" and a1 - a0 == b1 - b0):
        for k in range(a1 - a0): aligned.append({**words[a0 + k], "w": script[b0 + k]})
    elif op == "replace" and a1 - a0 == 1 and not any(c.isdigit() for c in words[a0]["w"]):
        aligned.append({**words[a0], "w": " ".join(script[b0:b1])})
    elif op == "replace":
        aligned += words[a0:a1]
    elif op == "insert":   # words the recogniser missed: spread them over the gap between neighbours
        t0 = aligned[-1]["e"] if aligned else 0.0
        t1 = words[a0]["s"] if a0 < len(words) else len(a) / sr
        n = b1 - b0; step = max(0.05, (t1 - t0) / n)
        for k in range(n): aligned.append({"w": script[b0 + k], "s": round(t0 + k * step, 3), "e": round(t0 + (k + 1) * step, 3)})
    # "delete": recognised words not in the script (noise) are dropped
words = aligned
json.dump({"env": env, "words": words, "dur": round(len(a) / sr, 3)}, open(out / "voice.json", "w"))
print(f"{len(a)/sr:.2f}s, {len(words)} words:", " ".join(w["w"] for w in words))

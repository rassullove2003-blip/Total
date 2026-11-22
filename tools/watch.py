"""Turn a video into things Claude can read: transcript + frame images.

Usage:
  python3 tools/watch.py <youtube-url-or-local-file> [--every SECONDS]
Output folder: watch/<id>/  (meta.txt, transcript.txt, frames/*.jpg, sheet.jpg)
"""
import argparse, json, re, subprocess, sys
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "Mozilla/5.0"}


def vtt_to_text(vtt):
    """Compact transcript: one line per ~10s with timestamp, duplicates removed."""
    out, seen, bucket, last_ts = [], set(), [], None
    for block in vtt.split("\n\n"):
        m = re.search(r"(\d+):(\d+):(\d+)\.\d+ -->", block)
        if not m:
            continue
        sec = int(m[1]) * 3600 + int(m[2]) * 60 + int(m[3])
        for line in block.splitlines()[1:]:
            line = re.sub(r"<[^>]+>", "", line).strip()
            if not line or "-->" in line or line in seen:
                continue
            seen.add(line)
            if last_ts is None or sec - last_ts >= 10:
                if bucket:
                    out.append(" ".join(bucket))
                bucket, last_ts = [f"[{sec // 60}:{sec % 60:02d}]"], sec
            bucket.append(line)
    if bucket:
        out.append(" ".join(bucket))
    return "\n".join(out)


def contact_sheet(frames, out, cols=4):
    from PIL import Image
    ims = [Image.open(f).convert("RGB") for f in frames]
    if not ims:
        return
    w = 480
    ims = [im.resize((w, int(im.height * w / im.width))) for im in ims]
    h = max(im.height for im in ims)
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w, rows * h), "black")
    for i, im in enumerate(ims):
        sheet.paste(im, ((i % cols) * w, (i // cols) * h))
    sheet.save(out, quality=85)


def youtube(url, d):
    vid = re.search(r"(?:v=|youtu\.be/|shorts/)([\w-]{11})", url)
    vid = vid[1] if vid else "video"
    d = d / vid
    (d / "frames").mkdir(parents=True, exist_ok=True)
    meta = subprocess.run(["yt-dlp", "--skip-download", "--ignore-no-formats-error", "--dump-json", url],
                          capture_output=True, text=True)
    lines = []
    try:
        info = json.loads(meta.stdout.splitlines()[0])
        for k in ("title", "channel", "upload_date", "duration", "view_count", "like_count", "tags", "description"):
            lines.append(f"{k}: {info.get(k)}")
    except Exception:
        lines.append("metadata: unavailable (YouTube blocked the request)")
    (d / "meta.txt").write_text("\n".join(lines) + "\n")

    subprocess.run(["yt-dlp", "--skip-download", "--write-subs", "--write-auto-subs", "--ignore-errors",
                    "--sub-langs", "en,en-orig,ru,it", "--sub-format", "vtt", "-o", str(d / "subs"), url],
                   capture_output=True)
    vtts = sorted(d.glob("subs*.vtt"), key=lambda p: ("orig" not in p.name, p.name))
    text = vtt_to_text(vtts[0].read_text()) if vtts else "(no subtitles available)"
    (d / "transcript.txt").write_text(text + "\n")

    frames = []
    for n in ("maxresdefault", "1", "2", "3"):
        r = requests.get(f"https://i.ytimg.com/vi/{vid}/{n}.jpg", headers=UA, timeout=30)
        if r.status_code == 200:
            p = d / "frames" / f"{n}.jpg"
            p.write_bytes(r.content)
            frames.append(p)
    contact_sheet(frames, d / "sheet.jpg", cols=2)
    return d


def local(path, d, every):
    path = Path(path)
    d = d / path.stem
    (d / "frames").mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-vf", f"fps=1/{every},scale=640:-2",
                    str(d / "frames" / "f%03d.jpg")], check=True)
    frames = sorted((d / "frames").glob("f*.jpg"))
    for i in range(0, len(frames), 16):
        contact_sheet(frames[i:i + 16], d / f"sheet{i // 16 + 1}.jpg")
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True).stdout.strip()
    (d / "meta.txt").write_text(f"file: {path.name}\nduration: {dur}s\nframe every: {every}s\n")
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("small", device="cpu", compute_type="int8")
        import numpy as np
        pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-f", "s16le", "-ac", "1",
                              "-ar", "16000", "-"], capture_output=True, check=True).stdout
        audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
        segs, _ = model.transcribe(audio, vad_filter=True)
        text = "\n".join(f"[{int(s.start) // 60}:{int(s.start) % 60:02d}] {s.text.strip()}" for s in segs)
    except Exception as e:
        text = f"(transcription failed: {e})"
    (d / "transcript.txt").write_text(text + "\n")
    return d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("--every", type=float, default=3, help="seconds between frames (local files)")
    a = ap.parse_args()
    base = ROOT / "watch"
    d = youtube(a.source, base) if a.source.startswith("http") else local(a.source, base, a.every)
    print(f"ready: {d}")
    for p in sorted(d.iterdir()):
        print(" ", p.name)


if __name__ == "__main__":
    main()

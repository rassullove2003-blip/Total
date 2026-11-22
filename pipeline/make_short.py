"""Build a vertical YouTube Short from a script JSON.

Usage: python3 pipeline/make_short.py scripts/<name>.json
Output: out/<name>.mp4 and out/<name>.txt (title, description, credits)
"""
import json, re, subprocess, sys, time, wave, html
from pathlib import Path
from io import BytesIO
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
VOICE = ROOT / "voices" / "en.onnx"
W, H, FPS = 1080, 1920, 30
UA = {"User-Agent": "ShortsPipelineBot/0.1 (educational video builder)"}
API = "https://commons.wikimedia.org/w/api.php"
OK_LICENSES = ("public domain", "pd", "cc0", "cc by")


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def tts(text, out):
    subprocess.run([sys.executable, "-m", "piper", "-m", str(VOICE), "-f", str(out),
                    "--length-scale", "0.92", "--sentence-silence", "0.15"],
                   input=text.encode(), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with wave.open(str(out)) as w:
        return w.getnframes() / w.getframerate()


def strip_html(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def find_image(query, used):
    params = {"action": "query", "format": "json", "generator": "search",
              "gsrsearch": f"filetype:bitmap {query}", "gsrnamespace": 6, "gsrlimit": 15,
              "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": 1600}
    for attempt in range(5):
        r = requests.get(API, params=params, headers=UA, timeout=30)
        if r.status_code == 200:
            break
        time.sleep(3 * (attempt + 1))
    else:
        return None, None
    pages = r.json().get("query", {}).get("pages", {})
    for p in sorted(pages.values(), key=lambda p: p.get("index", 99)):
        ii = (p.get("imageinfo") or [{}])[0]
        meta = ii.get("extmetadata", {})
        lic = strip_html(meta.get("LicenseShortName", {}).get("value", ""))
        if ii.get("url") in used or ii.get("width", 0) < 800 or not lic.lower().startswith(OK_LICENSES):
            continue
        used.add(ii["url"])
        artist = strip_html(meta.get("Artist", {}).get("value", "Unknown"))[:80]
        if ii.get("size", 0) > 15_000_000:
            continue
        return ii["url"], f"{p['title']} — {artist} — {lic} — {ii.get('descriptionurl', '')}"
    return None, None


def download_image(url, out):
    for attempt in range(5):
        try:
            r = requests.get(url, headers=UA, timeout=90)
        except requests.RequestException:
            return False
        if r.status_code == 200 and r.headers.get("content-type", "").startswith("image/"):
            try:
                with Image.open(BytesIO(r.content)) as im:
                    im = im.convert("RGB")
                    im.thumbnail((2400, 2400))
                    im.save(out, "JPEG", quality=92)
                return True
            except Exception:
                return False
        time.sleep(4 * (attempt + 1))
    return False


def ken_burns(img, dur, out, idx):
    frames = int(dur * FPS) + 1
    zoom_in = idx % 2 == 0
    z = "min(1+0.0009*on,1.25)" if zoom_in else "max(1.25-0.0009*on,1)"
    sw, sh = int(W * 1.5), int(H * 1.5)
    vf = (f"scale={sw}:{sh}:force_original_aspect_ratio=increase,crop={sw}:{sh},"
          f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},"
          f"eq=brightness=-0.06")
    run(["ffmpeg", "-y", "-i", str(img), "-vf", vf, "-frames:v", str(frames),
         "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", str(out)])


def fallback_bg(dur, out, idx):
    colors = ["0x1b2838", "0x2d1b38", "0x1b3828", "0x38281b"]
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={colors[idx % 4]}:s={W}x{H}:r={FPS}:d={dur:.3f}",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", str(out)])


def ts(t):
    h, t = divmod(t, 3600); m, s = divmod(t, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def build_ass(segments, out, hook):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,DejaVu Sans,92,&H00FFFFFF,&H0000E5FF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,7,3,5,60,60,0,1
Style: Hook,DejaVu Sans,78,&H0000E5FF,&H0000E5FF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,6,3,8,60,60,260,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [f"Dialogue: 1,{ts(0)},{ts(segments[0]['dur'])},Hook,,0,0,0,,{hook.upper()}"]
    t0 = 0.0
    for seg in segments:
        words = seg["text"].split()
        chunks = [words[i:i + 3] for i in range(0, len(words), 3)]
        total = sum(len(" ".join(c)) + 2 for c in chunks)
        t = t0
        for c in chunks:
            d = seg["dur"] * (len(" ".join(c)) + 2) / total
            txt = " ".join(c).upper()
            lines.append(f"Dialogue: 0,{ts(t)},{ts(t + d)},Cap,,0,0,0,,{{\\fscx85\\fscy85\\t(0,90,\\fscx100\\fscy100)}}{txt}")
            t += d
        t0 += seg["dur"]
    out.write_text(head + "\n".join(lines) + "\n")


def main(script_path):
    spec = json.loads(Path(script_path).read_text())
    name = Path(script_path).stem
    work = ROOT / "build" / name
    work.mkdir(parents=True, exist_ok=True)
    (ROOT / "out").mkdir(exist_ok=True)
    used, credits, segs = set(), [], []

    for i, s in enumerate(spec["segments"]):
        wav = work / f"v{i}.wav"
        dur = tts(s["text"], wav)
        clip = work / f"c{i}.mp4"
        url, credit = find_image(s["query"], used)
        img = work / f"i{i}.jpg"
        if url and not download_image(url, img):
            url = None
        if url:
            ken_burns(img, dur, clip, i)
            credits.append(credit)
        else:
            fallback_bg(dur, clip, i)
        segs.append({"text": s["text"], "dur": dur, "clip": clip, "wav": wav})
        print(f"  segment {i + 1}/{len(spec['segments'])}: {dur:.1f}s {'img' if url else 'no image'}")

    (work / "clips.txt").write_text("".join(f"file '{s['clip']}'\n" for s in segs))
    (work / "voice.txt").write_text("".join(f"file '{s['wav']}'\n" for s in segs))
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(work / "clips.txt"), "-c", "copy", str(work / "video.mp4")])
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(work / "voice.txt"), str(work / "voice.wav")])
    build_ass(segs, work / "subs.ass", spec.get("hook", spec["title"]))

    total = sum(s["dur"] for s in segs)
    out = ROOT / "out" / f"{name}.mp4"
    run(["ffmpeg", "-y", "-i", str(work / "video.mp4"), "-i", str(work / "voice.wav"),
         "-vf", f"ass={work / 'subs.ass'}", "-t", f"{total:.3f}",
         "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "160k", "-af", "loudnorm=I=-14:TP=-1.5", str(out)])

    desc = spec.get("description", "") + "\n\n" + " ".join(spec.get("tags", [])) + \
        "\n\nImage credits (Wikimedia Commons):\n" + "\n".join(credits)
    (ROOT / "out" / f"{name}.txt").write_text(f"TITLE: {spec['title']}\n\n{desc}\n")
    print(f"done: {out} ({total:.1f}s)")


if __name__ == "__main__":
    main(sys.argv[1])

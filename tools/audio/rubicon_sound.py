"""Original score + sparse SFX for the Rubicon short (Caesar vs Pompey).
Style: Roman epic — war drums, horn calls, low string pulse, choir-like pad, in D minor. Kept quiet and ducked under speech
(rules from batu/zanzibar: few effects, never over the voice). Uses the MIT DSP/instrument kit by mromidev.
Output: anim/public/rubicon/mix.wav aligned to composition frame 0."""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
from dsp import SR, rng, lp, hp, bp, colored, pan, read_wav, write_wav, norm_to, true_peak, integrated, make_ir, convolve_st
import instruments as I
import sfx_gen as S
from scipy.ndimage import maximum_filter1d

ROOT = Path(__file__).resolve().parents[2]
VO = 12
F = dict(crossed=88, declared=128, name=181, gaul=263, senate=294, enemy=369, kept=402, single=442, crossed2=466, die=502, cast=514, romeP=537,
         pompey=566, abandoned=620, sailed=651, couldnt=741, west=789, destroyed=829, then=891, dyr=950, beat=978, hungry=1009, pharsalus=1076,
         n22=1142, against=1172, seven=1250, horsemen=1305, flank=1349, over=1378, wait=1394, yousee=1443, hidden=1478, leapt=1555, thrust=1571,
         panicked2=1639, collapsed=1692, fled=1729, moment=1762, stabbed=1801, head=1886, gift=1933, wept=1964, so=1985, traitor=2019, saved=2057, senate2=2092)
t = lambda f: f / 30.0
r = rng(49)
voice, vsr = read_wav(str(ROOT / "anim/public/rubicon/voice.wav")); voice = np.asarray(voice, float)
voice = voice.mean(axis=0) if voice.ndim > 1 else voice
if vsr != SR:
    from scipy.signal import resample_poly
    from math import gcd
    g = gcd(SR, vsr); voice = resample_poly(voice, SR // g, vsr // g)
DUR = (VO + len(voice) / SR * 30 + 75) / 30
N = int(DUR * SR) + SR
music = np.zeros((2, N)); sfx = np.zeros((2, N))

def put(buf, x, sec, gain=1.0, p=0.0):
    x = np.asarray(x, float); x = pan(x, p) if x.ndim == 1 else x
    i = int(sec * SR); a, b = max(0, i), min(N, i + x.shape[1])
    if b > a: buf[:, a:b] += gain * x[:, a - i:b - i]
m2f = lambda m: 440.0 * 2 ** ((m - 69) / 12)
BEAT = 60 / 88
Eb = 51
MUSIC_GAIN = float(sys.argv[1]) if len(sys.argv) > 1 else 0.2
D2, A2, Bb2, C3, D3, E3, F3, G3, A3, Bb3, C4, Cs4, D4, E4, F4, G4, A4, Bb4, D5 = 38, 45, 46, 48, 50, 52, 53, 55, 57, 58, 60, 61, 62, 64, 65, 67, 69, 70, 74
CH = {"Dm": (D3, F3, A3), "Bb": (Bb2, D3, F3), "Gm": (G3 - 12, D3, G3), "A": (A2, Cs4 - 12, E3), "C": (C3, E3, G3), "F": (F3 - 12, A2 + 12, C4 - 12), "D": (D3, F3 + 1, A3)}

def pad(s0, s1, notes, vel=0.3, warm=800):
    if s1 - s0 > 0.3: put(music, I.pad([m2f(n) for n in notes], s1 - s0, vel, r, att=min(1.2, (s1 - s0) / 3), rel=min(1.5, (s1 - s0) / 3), warm=warm), s0)
def choir(s0, s1, notes, vel=0.22):  # airy high pad with slow swell = "choir"
    if s1 - s0 > 0.3: put(music, I.pad([m2f(n) for n in notes], s1 - s0, vel, r, att=min(2.0, (s1 - s0) / 2.5), rel=1.5, warm=1500, detune=11,
                                       trem=lambda tt: 1 + 0.08 * np.sin(2 * np.pi * 4.8 * tt)), s0)
def prog(s0, s1, chords, vel=0.3, per=4):
    s, k = s0, 0
    while s < s1 - 0.2:
        e = min(s1, s + BEAT * per); pad(s, e + 0.4, CH[chords[k % len(chords)]], vel); s = e; k += 1
def ost(s0, s1, notes, vel=0.42, step=0.5):  # low string pulse (pizzicato)
    k, s = 0, s0
    while s < s1: put(music, I.pluck(m2f(notes[k % len(notes)]), vel * (1 if k % 4 == 0 else 0.75), r, dur=0.6, bright=0.3), s, 0.8, 0.25 * np.sin(k)); s += BEAT * step; k += 1
def drum(sec, vel=0.7, low=D2):  # big war drum: low timpani + body thump
    n = int(0.9 * SR); body = lp(r.standard_normal(n), 160, 2) * np.exp(-np.linspace(0, 9, n))
    put(music, I.timpani(m2f(low), vel, r, dur=1.1), sec, 0.8); put(music, body * vel * 0.9, sec, 1.0)
def drums(s0, s1, pattern=(1, 0, 0.6, 0, 0.8, 0, 0.5, 0.4), vel=0.6, step=0.5):
    k, s = 0, s0
    while s < s1:
        a = pattern[k % len(pattern)]
        if a: drum(s, vel * a, D2 if k % 8 else D2 - 5)
        s += BEAT * step; k += 1
def frame_drum(s0, s1, vel=0.3):  # light hand-drum ticks on the off-beats
    s, k = s0 + BEAT * 0.25, 0
    while s < s1:
        x = bp(colored(int(0.08 * SR), r), 300, 2500) * np.exp(-np.linspace(0, 10, int(0.08 * SR)))
        put(music, x, s, vel * (0.7 if k % 2 else 1), 0.3 * (1 if k % 2 else -1)); s += BEAT * 0.5; k += 1
def horn(s0, line, vel=0.55, kind="horn"):
    s = s0
    for n_, b in line:
        if n_: put(music, I.brass(m2f(n_), BEAT * b * 0.95, vel, r, kind=kind, rel=0.25), s, 0.7, -0.15)
        s += BEAT * b
def hit(sec, chord=("Dm"), vel=0.8):  # orchestral hit: drum + cymbal + brass stab chord
    drum(sec, vel); put(music, I.cymbal(0.45, r, dur=1.8, bright=0.5), sec, 0.18)
    for n_ in CH[chord]: put(music, I.brass(m2f(n_), 0.7, vel * 0.6, r, kind="stab", rel=0.4), sec, 0.45)
def riser(s0, s1, gain=0.25):
    n = int((s1 - s0) * SR); env = np.linspace(0, 1, n) ** 2
    put(music, hp(colored(n, r, slope=-0.6), 400) * env, s0, gain)

MOTIF = [(D4, 1.5), (A3, 0.5), (D4, 1), (F4, 1), (E4, 1.5), (D4, 0.5), (C4, 1), (A3, 1)]
MOTIF2 = [(F4, 1.5), (G4, 0.5), (A4, 1), (D5, 1), (C4 + 12, 1.5), (Bb4, 0.5), (A4, 2)]

# ---- 1. hook: drone + horn call + drums, hit on "war on Rome"
pad(0, t(F["name"]), (D2 + 12, A2 + 12), 0.3, warm=500)
horn(0.15, [(D3, 1.5), (A3, 0.5), (D4, 2)], 0.6)
drums(t(20), t(F["declared"]) - 0.1, (1, 0, 0, 0, 0.7, 0, 0.5, 0), 0.55)
hit(t(F["declared"]) - 0.12, "Dm", 0.8)
# ---- 2. Caesar + Senate: string pulse, chords
prog(t(F["name"]), t(F["kept"]), ["Dm", "Bb", "Gm", "A"], 0.26)
ost(t(F["name"]) + 0.3, t(F["kept"]), (D3, A3, F3, A3), 0.36)
horn(t(F["name"]) + 0.1, MOTIF[:4], 0.38)
# ---- 3. river crossing: drums build, hit on "the die is cast"
pad(t(F["kept"]), t(F["die"]), (D3, A3), 0.28, warm=600)
frame_drum(t(F["kept"]), t(F["die"]), 0.22)
drums(t(F["single"]), t(F["die"]) - 0.2, (1, 0, 0.5, 0, 0.8, 0, 0.5, 0.5), 0.5)
riser(t(F["crossed2"]), t(F["die"]) - 0.1, 0.12)
hit(t(F["die"]) - 0.1, "Dm", 0.9)
choir(t(F["die"]), t(F["romeP"]) + 0.5, (D4, F4, A4), 0.2)
# ---- 4. Rome panics, VS
ost(t(F["romeP"]), t(F["abandoned"]), (D3, D3, Eb, D3), 0.4, 0.25)
hit(t(F["pompey"]) - 0.12, "A", 0.75)
# ---- 5. the campaign (Italy -> Spain -> back): marching groove
s_c, e_c = t(F["abandoned"]), t(F["pharsalus"]) - 0.1
prog(s_c, t(F["dyr"]), ["Dm", "Bb", "C", "A"], 0.26)
ost(s_c, t(F["beat"]), (D3, A3, D3, F3, D3, A3, C4, A3), 0.38)
drums(s_c, t(F["beat"]) - 0.2, (0.9, 0, 0, 0.4, 0.7, 0, 0, 0.3), 0.42)
frame_drum(s_c, t(F["beat"]), 0.16)
horn(t(F["west"]) - 0.4, MOTIF, 0.36)
hit(t(F["destroyed"]) - 0.1, "Dm", 0.6)
hit(t(F["beat"]) - 0.1, "Gm", 0.65)
pad(t(F["beat"]), e_c, (G3 - 12, Bb2, D3), 0.26, warm=500)       # defeat, hungry retreat: dark and thin
ost(t(F["hungry"]), e_c, (G3 - 12, D3), 0.3, 1)
# ---- 6. Pharsalus: battle music
s_b = t(F["pharsalus"]) - 0.12
hit(s_b, "Dm", 0.7)
choir(s_b, t(F["wait"]), (D4, A4), 0.18)
prog(s_b + 0.5, t(F["wait"]), ["Dm", "Dm", "Bb", "A"], 0.24)
drums(t(F["n22"]) - 0.1, t(F["wait"]) - 0.1, (1, 0, 0.6, 0, 0.9, 0, 0.6, 0.6), 0.5)
ost(t(F["n22"]), t(F["wait"]), (D3, D3, A3, D3, F3, D3, A3, D3), 0.4, 0.5)
horn(t(F["against"]), MOTIF2, 0.42)
riser(t(F["flank"]), t(F["wait"]) - 0.05, 0.16)
# ---- 7. "Wait." — everything stops; a low held note under the question
pad(t(F["wait"]), t(F["yousee"]) + 0.6, (D2 + 12,), 0.3, warm=300)
# ---- 8. the fourth line: build to the counter-charge, triumph on the collapse
pad(t(F["yousee"]), t(F["thrust"]), (D3, A3), 0.26)
drums(t(F["hidden"]), t(F["thrust"]) - 0.2, (0.6, 0, 0.4, 0, 0.6, 0, 0.4, 0.5), 0.5)
riser(t(F["leapt"]) - 1.0, t(F["thrust"]) - 0.1, 0.14)
hit(t(F["thrust"]) - 0.12, "Dm", 0.85)
drums(t(F["thrust"]) + BEAT, t(F["collapsed"]) + 1.2, (1, 0, 0.7, 0.5, 0.9, 0, 0.7, 0.7), 0.52)
ost(t(F["thrust"]), t(F["collapsed"]), (D3, A3, D3, A3, F3, A3, D3, A3), 0.42, 0.5)
prog(t(F["thrust"]), t(F["collapsed"]), ["Dm", "C", "Bb", "A"], 0.24, per=2)
hit(t(F["collapsed"]) - 0.12, "D", 0.85)
choir(t(F["collapsed"]), t(F["fled"]) + 1.5, (D4, F4 + 1, A4), 0.22)
horn(t(F["collapsed"]) + 0.2, [(D4, 1), (A4, 1), (F4 + 1, 1), (D5, 2.5)], 0.42)
# ---- 9. Egypt: sombre, the murder, Caesar weeps
pad(t(F["fled"]) + 1.0, t(F["stabbed"]), (D3, F3, A3), 0.24, warm=600)
ost(t(F["moment"]), t(F["stabbed"]) - 0.1, (D3, Eb, D3, Eb), 0.32, 0.5)
drum(t(F["stabbed"]) - 0.05, 0.8); put(music, I.cymbal(0.4, r, dur=2.2, bright=0.4), t(F["stabbed"]) - 0.05, 0.15)
for n_ in (D3, Eb, A3): put(music, I.brass(m2f(n_), 1.0, 0.45, r, kind="stab", rel=0.6), t(F["stabbed"]) - 0.05, 0.4)
pad(t(F["stabbed"]) + 1.0, t(F["so"]), (Bb2, D3, F3), 0.22, warm=550)
choir(t(F["head"]), t(F["so"]) + 0.5, (F4, A4, D5), 0.14)
put(music, I.glock(m2f(A4 + 12), 0.4, r, dur=2.0), t(F["wept"]) + 0.05, 0.22)
put(music, I.glock(m2f(F4 + 12), 0.35, r, dur=2.0), t(F["wept"]) + 0.45, 0.18)
# ---- 10. the question: reprise of the motif, final chord
prog(t(F["so"]), DUR - 1.0, ["Dm", "Bb", "Gm", "A"], 0.24)
drums(t(F["so"]), t(F["senate2"]) - 0.2, (0.7, 0, 0, 0, 0.5, 0, 0, 0), 0.4)
horn(t(F["so"]) + 0.1, MOTIF, 0.36)
hit(t(F["senate2"]) + 0.4, "Dm", 0.7)
pad(t(F["senate2"]) + 0.4, DUR - 0.2, (D3, A3, D4), 0.26)

# ---- sparse SFX (only at moments without speech or very short)
put(sfx, I.timpani(m2f(D2 + 7), 0.7, r, dur=0.6), t(F["enemy"]) - 0.1, 0.35)              # stamp thump
put(sfx, S.water_bed(3.0, r, close=0.8), t(F["crossed2"]), 0.22)                           # wading
put(sfx, S.splash_big(r), t(F["crossed2"] + 20), 0.12)
for k in range(5): put(sfx, S.clink(r, f0=1800 + 400 * k, dur=0.06, bright=0.6), t(F["die"] + 13) + k * 0.07, 0.25)  # dice
put(sfx, S.whoosh(0.8, r, peak=0.5, f_lo=200, f_hi=1400), t(561) - 0.1, 0.3)                  # VS
for k in range(6): put(sfx, S.creak(0.5, r, rate0=60, rate1=90, scale=0.6), t(F["sailed"]) + k * 0.4, 0.06, 0.3)  # oars
def gallop(s0, s1, gain):
    s, k = s0, 0
    while s < s1:
        for d in (0, 0.07, 0.15):
            x = lp(r.standard_normal(int(0.06 * SR)), 300, 2) * np.exp(-np.linspace(0, 8, int(0.06 * SR))); put(sfx, x, s + d, gain * (1 - (s - s0) / (s1 - s0) * 0.3))
        s += 0.27 + 0.03 * r.standard_normal(); k += 1
gallop(t(F["horsemen"]) - 0.3, t(F["wait"]) - 0.1, 0.35)
for k in range(8): put(sfx, S.clink(r, dur=0.08, bright=0.8), t(F["thrust"]) + k * 0.09 + 0.02 * r.standard_normal(), 0.18, 0.4 * np.sin(k))
put(sfx, S.whoosh(0.35, r, peak=0.2, f_lo=1200, f_hi=6000, air=0.5), t(F["stabbed"]) - 0.12, 0.35)   # blade

# ---- mix (same rules as the Batu/Zanzibar mix)
vbuf = np.zeros(N); i0 = int(VO / 30 * SR); vbuf[i0:i0 + len(voice)] = voice[: N - i0]
win = int(0.05 * SR); venv = np.sqrt(np.convolve(vbuf ** 2, np.ones(win) / win, mode="same"))
act = maximum_filter1d(np.clip(venv / (venv.max() * 0.12 + 1e-9), 0, 1), size=int(0.35 * SR))
act = np.convolve(act, np.ones(int(0.15 * SR)) / int(0.15 * SR), mode="same"); duck = 1 - 0.8 * act
music_w = convolve_st(music, make_ir(1.8, 7))[:, :N] * 0.45 + music
mix = np.vstack([vbuf, vbuf]) + music_w * duck * MUSIC_GAIN + sfx * duck * 0.5
mix = mix[:, : int(DUR * SR)]
def limit(x, ceil=0.89, rel=0.15):
    pk = maximum_filter1d(np.abs(x).max(axis=0), size=2 * int(0.002 * SR) + 1); want = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    g = np.empty_like(want); cur = 1.0; a = np.exp(-1 / (rel * SR))
    for i in range(len(want)): cur = want[i] if want[i] < cur else a * cur + (1 - a) * want[i]; g[i] = cur
    return x * g
for _ in range(3): mix = limit(norm_to(mix, -14.0, mode="integrated"))
write_wav(str(ROOT / "anim/public/rubicon/mix.wav"), mix, bits=16)
# speech vs background check (in speech windows)
bg = (music_w * duck * MUSIC_GAIN + sfx * duck * 0.5)[:, : mix.shape[1]].mean(axis=0); sp = vbuf[: mix.shape[1]]
on = act[: mix.shape[1]] > 0.7
print(f"mix {mix.shape[1] / SR:.1f}s LUFS {integrated(mix):.1f} peak {true_peak(mix):.2f} speech/bg {20 * np.log10(np.sqrt((sp[on] ** 2).mean()) / np.sqrt((bg[on] ** 2).mean() + 1e-12)):.1f} dB")
write_wav(str(ROOT / "anim/out/rubicon_music_only.wav"), np.clip(music_w * 0.5, -1, 1)[:, : mix.shape[1]], bits=16)

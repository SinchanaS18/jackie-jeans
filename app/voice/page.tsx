"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BRANDS, HEIGHTS, WAISTS, HIPS, FitProfile } from "@/lib/quizData";

/* ─── Types ──────────────────────────────────────────────────── */
type Stage =
  | "idle" | "intro" | "height" | "weight" | "waist" | "hip"
  | "waistFit" | "rise" | "thighFit" | "brands" | "brandSizes"
  | "frustration" | "confirm" | "done";

type Msg = { role: "ai" | "user"; text: string };

/* ─── Speech helpers ─────────────────────────────────────────── */
function speak(text: string): Promise<void> {
  return new Promise((res) => {
    if (typeof window === "undefined") return res();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.0;
    // pick a nicer voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Samantha") || v.name.includes("Karen") ||
      v.name.includes("Google UK English Female") || v.name.includes("Female")
    );
    if (preferred) u.voice = preferred;
    u.onend = () => res();
    window.speechSynthesis.speak(u);
  });
}

/* ─── Parse helpers ──────────────────────────────────────────── */
function parseHeight(text: string): string | null {
  const t = text.toLowerCase();
  // "five foot six" / "5'6" / "5 6" / "5 feet 6 inches"
  const wordMap: Record<string, number> = {
    four: 4, five: 5, six: 6,
    zero: 0, one: 1, two: 2, three: 3, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12
  };
  const nums = (w: string) => wordMap[w] ?? parseInt(w, 10);

  let feet: number | null = null, inches: number | null = null;

  // numeric e.g. 5'6" or 5 6 or 5.6
  const numMatch = t.match(/(\d)\s*['\s\.]+(\d{1,2})/);
  if (numMatch) { feet = parseInt(numMatch[1]); inches = parseInt(numMatch[2]); }

  // word e.g. "five foot six"
  if (feet === null) {
    const wm = t.match(/(four|five|six)\s+(?:foot|feet|ft)?\s*(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2})?/);
    if (wm) {
      feet = nums(wm[1]);
      inches = wm[2] ? nums(wm[2]) : 0;
    }
  }

  if (feet === null) return null;
  inches = inches ?? 0;
  const label = `${feet}'${inches}"`;
  return HEIGHTS.includes(label) ? label : null;
}

function parseNumber(text: string): string | null {
  const m = text.match(/\d+/);
  return m ? m[0] : null;
}

function parseMeasurement(text: string, options: string[]): string | null {
  const n = parseNumber(text);
  if (!n) return null;
  const label = `${n}"`;
  return options.includes(label) ? label : null;
}

function parseChoice(text: string, options: string[]): string | null {
  const t = text.toLowerCase();
  for (const opt of options) {
    if (t.includes(opt.toLowerCase())) return opt;
    // fuzzy first word
    const firstWord = opt.toLowerCase().split(" ")[0];
    if (t.includes(firstWord)) return opt;
  }
  return null;
}

function parseBrands(text: string): string[] {
  const t = text.toLowerCase();
  return BRANDS.filter(b => t.includes(b.toLowerCase()));
}

function isSkip(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("skip") || t.includes("prefer not") || t.includes("no thanks") ||
    t.includes("pass") || t.includes("don't want") || t.includes("rather not");
}

function isConfirm(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("yes") || t.includes("correct") || t.includes("right") ||
    t.includes("yeah") || t.includes("yep") || t.includes("sure") || t.includes("that's right");
}

/* ─── Main component ─────────────────────────────────────────── */
export default function VoicePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [profile, setProfile] = useState<FitProfile>({});
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [pending, setPending] = useState(""); // AI is "thinking"
  const [brandIdx, setBrandIdx] = useState(0);
  const [voiceError, setVoiceError] = useState("");
  const recRef = useRef<SpeechRecognition | null>(null);
  const stageRef = useRef<Stage>("idle");
  const profileRef = useRef<FitProfile>({});
  const brandIdxRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync
  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { brandIdxRef.current = brandIdx; }, [brandIdx]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, transcript]);

  const addMsg = useCallback((role: "ai" | "user", text: string) => {
    setMsgs(m => [...m, { role, text }]);
  }, []);

  const ensureMicrophoneAccess = useCallback(async (): Promise<{ ok: true } | { ok: false; reason: string }> => {
    if (typeof window === "undefined") {
      return { ok: false, reason: "This page is not running in a browser window." };
    }

    if (!window.isSecureContext) {
      return { ok: false, reason: "Use localhost or https:// for microphone access." };
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return { ok: false, reason: "This browser does not support microphone access." };
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return { ok: true };
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        return { ok: false, reason: "Microphone permission was denied. Please allow it in your browser or site settings, then refresh and try again." };
      }
      if (name === "NotFoundError") {
        return { ok: false, reason: "No microphone was found on this device." };
      }
      return { ok: false, reason: `Microphone could not be started: ${err?.message || "unknown error"}` };
    }
  }, []);

  const aiSay = useCallback(async (text: string) => {
    addMsg("ai", text);
    setPending("");
    await speak(text);
  }, [addMsg]);

  const startListening = useCallback(async () => {
    if (listening) return;

    const permission = await ensureMicrophoneAccess();
    if (!permission.ok) {
      setVoiceError(permission.reason);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Speech recognition not supported on this browser. Try Chrome on desktop/Android.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recRef.current = rec;

    let final = "";

    rec.onstart = () => {
      setListening(true);
      setTranscript("");
    };

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      setTranscript(final || interim);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setListening(false);
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setVoiceError(`Mic error: ${e.error}. Please check permissions.`);
      }
    };

    rec.onend = () => {
      setListening(false);
      const said = final.trim();
      setTranscript("");
      if (said) {
        addMsg("user", said);
        handleUserInput(said);
      } else {
        // no speech detected
        setTimeout(() => {
          aiSay("I didn't catch that — could you say that again?").then(startListening);
        }, 300);
      }
    };

    try {
      rec.start();
    } catch (err: any) {
      setListening(false);
      setVoiceError(`Mic error: ${err?.message || "could not start"}. Please allow microphone access and try again.`);
    }
  }, [addMsg, aiSay, ensureMicrophoneAccess, listening]); // handleUserInput added below

  // We define handleUserInput after startListening to avoid circular ref issues
  // but use stageRef / profileRef so it doesn't need to be in deps
  const handleUserInput = useCallback(async (text: string) => {
    const s = stageRef.current;
    const p = profileRef.current;

    const retry = async (prompt: string) => {
      await aiSay(prompt);
      startListening();
    };

    if (s === "height") {
      const h = parseHeight(text);
      if (!h) return retry("I didn't quite catch your height. Could you say it again, like \"five foot six\"?");
      setProfile(prev => ({ ...prev, height: h }));
      setStage("weight");
      await aiSay(`Got it — ${h}. Now, what's your weight in pounds? This is totally optional, so just say "skip" if you'd rather not share.`);
      startListening();

    } else if (s === "weight") {
      if (isSkip(text)) {
        setStage("waist");
        await aiSay("No worries! What's your waist measurement in inches, at the narrowest point of your torso?");
      } else {
        const w = parseNumber(text);
        if (!w) return retry("I didn't catch a number there. What's your weight in pounds, or say \"skip\" to move on?");
        setProfile(prev => ({ ...prev, weight: w }));
        setStage("waist");
        await aiSay(`Thanks. Now, what's your waist measurement in inches?`);
      }
      startListening();

    } else if (s === "waist") {
      const w = parseMeasurement(text, WAISTS);
      if (!w) return retry("Could you say your waist size again? Just the number in inches, like \"thirty\" or \"32\".");
      setProfile(prev => ({ ...prev, waist: w }));
      setStage("hip");
      await aiSay(`${w} waist. And your hip measurement — at the fullest part?`);
      startListening();

    } else if (s === "hip") {
      const h = parseMeasurement(text, HIPS);
      if (!h) return retry("Could you give me your hip measurement in inches? Just the number.");
      setProfile(prev => ({ ...prev, hip: h }));
      setStage("waistFit");
      await aiSay(`${h} hips. How do you like jeans to fit at the waist? Snug, slightly relaxed, or relaxed?`);
      startListening();

    } else if (s === "waistFit") {
      const c = parseChoice(text, ["Snug", "Slightly relaxed", "Relaxed"]);
      if (!c) return retry("Please say snug, slightly relaxed, or relaxed.");
      setProfile(prev => ({ ...prev, waistFit: c }));
      setStage("rise");
      await aiSay(`${c} at the waist. Where should the waistband sit — high rise, mid rise, or low rise?`);
      startListening();

    } else if (s === "rise") {
      const c = parseChoice(text, ["High rise", "Mid rise", "Low rise"]);
      if (!c) return retry("Say high rise, mid rise, or low rise.");
      setProfile(prev => ({ ...prev, rise: c }));
      setStage("thighFit");
      await aiSay(`${c}. And through the thighs — fitted, relaxed, or loose?`);
      startListening();

    } else if (s === "thighFit") {
      const c = parseChoice(text, ["Fitted", "Relaxed", "Loose"]);
      if (!c) return retry("Please say fitted, relaxed, or loose.");
      setProfile(prev => ({ ...prev, thighFit: c }));
      setStage("brands");
      await aiSay(`${c} through the thighs — nice. Which denim brands have you bought before? You can name a few — like Levi's, Zara, Gap, Uniqlo, or others.`);
      startListening();

    } else if (s === "brands") {
      const found = parseBrands(text);
      if (found.length === 0) {
        if (isSkip(text) || text.toLowerCase().includes("none") || text.toLowerCase().includes("don't")) {
          setProfile(prev => ({ ...prev, brands: [] }));
          setStage("frustration");
          await aiSay("No problem! Last question — what's your biggest frustration buying jeans? Choose from: waist gap, hip tightness, wrong length, thigh fit, rise, or other.");
          startListening();
        } else {
          return retry(`I didn't recognise any brands there. Try saying names like Levi's, Zara, H&M, Uniqlo, or say "none".`);
        }
        return;
      }
      setProfile(prev => ({ ...prev, brands: found }));
      setBrandIdx(0);
      brandIdxRef.current = 0;
      setStage("brandSizes");
      await aiSay(`Got it — ${found.join(", ")}. What size do you usually buy in ${found[0]}?`);
      startListening();

    } else if (s === "brandSizes") {
      const brands = profileRef.current.brands || [];
      const currentBrand = brands[brandIdxRef.current];
      const size = text.trim().split(" ")[0]; // take first word/number
      if (!size) return retry(`What size do you wear in ${currentBrand}?`);
      const updated = { ...(profileRef.current.brandSizes || {}), [currentBrand]: size };
      setProfile(prev => ({ ...prev, brandSizes: updated }));
      const nextIdx = brandIdxRef.current + 1;
      if (nextIdx < brands.length) {
        setBrandIdx(nextIdx);
        brandIdxRef.current = nextIdx;
        await aiSay(`Got it. And what size in ${brands[nextIdx]}?`);
        startListening();
      } else {
        setStage("frustration");
        await aiSay("Last question! What's your biggest frustration buying jeans — waist gap, hip tightness, wrong length, thigh fit, rise, or other?");
        startListening();
      }

    } else if (s === "frustration") {
      const c = parseChoice(text, ["Waist gap", "Hip tightness", "Wrong length", "Thigh fit", "Rise", "Other"]);
      if (!c) return retry("Please choose one: waist gap, hip tightness, wrong length, thigh fit, rise, or other.");
      setProfile(prev => ({ ...prev, frustration: c }));
      setStage("confirm");
      const prof = { ...profileRef.current, frustration: c };
      const summary = [
        prof.height && `height ${prof.height}`,
        prof.waist && `waist ${prof.waist}`,
        prof.hip && `hips ${prof.hip}`,
        prof.waistFit && `${prof.waistFit} at the waist`,
        prof.rise,
        prof.thighFit && `${prof.thighFit} through the thighs`,
      ].filter(Boolean).join(", ");
      await aiSay(`Perfect. Let me confirm — ${summary}. Does that sound right?`);
      startListening();

    } else if (s === "confirm") {
      if (isConfirm(text)) {
        setStage("done");
        await aiSay("Wonderful! Your fit profile is ready. Taking you to Jackie Jeans now.");
        sessionStorage.setItem("jackieFitProfile", JSON.stringify(profileRef.current));
        setTimeout(() => {
          window.location.href = `https://jackie-jeans.vercel.app/?fit=${encodeURIComponent(JSON.stringify(profileRef.current))}`;
        }, 2000);
      } else {
        // let them correct
        setStage("height");
        await aiSay("No problem, let's go through it again quickly. What's your height?");
        startListening();
      }
    }
  }, [aiSay, startListening]);

  async function startConversation() {
    setStage("intro");
    await aiSay("Hi! I'm your Jackie Jeans fit stylist. I'll ask you a few quick questions to find your perfect denim. Let's start — what's your height?");
    setStage("height");
    startListening();
  }

  function stopListening() {
    recRef.current?.stop();
    setListening(false);
  }

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--indigo)" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="text-sm flex items-center gap-1.5"
          style={{ color: "rgba(248,246,240,0.4)" }}
        >
          ← Back
        </button>
        <span className="font-display text-xl" style={{ color: "var(--canvas)" }}>Jackie Jeans</span>
        <div className="w-10" />
      </div>

      {/* Chat transcript */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {stage === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="mb-6">
              <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: "var(--seam)" }}>AI Voice Quiz</p>
              <h2 className="font-display text-4xl font-light mb-3" style={{ color: "var(--canvas)" }}>
                Your fit,<br />by voice.
              </h2>
              <p className="text-sm font-light leading-relaxed" style={{ color: "rgba(248,246,240,0.5)" }}>
                Just talk — I&apos;ll guide you through the Fit Quiz like a conversation.
              </p>
            </div>
            {voiceError && (
              <div className="mb-4 max-w-sm">
                <p className="text-xs px-4 py-2 rounded-lg" style={{ background: "rgba(233,69,96,0.15)", color: "var(--seam)" }}>
                  {voiceError}
                </p>
                <p className="text-[11px] mt-2" style={{ color: "rgba(248,246,240,0.45)" }}>
                  If the prompt already appeared, click the lock icon in the address bar and allow Microphone.
                </p>
              </div>
            )}
            <button
              onClick={startConversation}
              className="px-8 py-4 rounded-full text-sm font-medium transition-all active:scale-[0.97]"
              style={{ background: "var(--seam)", color: "white" }}
            >
              🎙 Start Voice Quiz
            </button>
            <p className="mt-4 text-xs font-light" style={{ color: "rgba(248,246,240,0.3)" }}>
              Allow microphone when prompted
            </p>
          </div>
        )}

        {stage !== "idle" && (
          <>
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] px-4 py-3 rounded-2xl text-sm font-light leading-relaxed"
                  style={{
                    background: m.role === "ai"
                      ? "rgba(248,246,240,0.07)"
                      : "var(--seam)",
                    color: m.role === "ai"
                      ? "rgba(248,246,240,0.85)"
                      : "white",
                    borderRadius: m.role === "ai" ? "4px 18px 18px 18px" : "18px 4px 18px 18px",
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {/* Live transcript */}
            {listening && transcript && (
              <div className="flex justify-end">
                <div
                  className="max-w-[80%] px-4 py-3 rounded-2xl text-sm font-light leading-relaxed italic"
                  style={{
                    background: "rgba(233,69,96,0.15)",
                    color: "rgba(248,246,240,0.5)",
                    borderRadius: "18px 4px 18px 18px",
                  }}
                >
                  {transcript}
                </div>
              </div>
            )}

            {pending && (
              <div className="flex justify-start">
                <div
                  className="px-4 py-3 rounded-2xl text-sm"
                  style={{
                    background: "rgba(248,246,240,0.07)",
                    color: "rgba(248,246,240,0.4)",
                    borderRadius: "4px 18px 18px 18px",
                  }}
                >
                  <span className="animate-pulse">●●●</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Mic button */}
      {stage !== "idle" && stage !== "done" && (
        <div className="px-5 pb-8 pt-4 flex flex-col items-center gap-4">
          {voiceError && (
            <div className="flex flex-col items-center gap-2 px-4">
              <p className="text-xs text-center" style={{ color: "var(--seam)" }}>{voiceError}</p>
              <button
                onClick={() => { setVoiceError(""); void startListening(); }}
                className="text-[11px] underline underline-offset-2"
                style={{ color: "rgba(248,246,240,0.7)" }}
              >
                Try again
              </button>
            </div>
          )}

          {/* Waveform indicator */}
          {listening && (
            <div className="flex items-center gap-1 h-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full animate-wave"
                  style={{
                    background: "var(--seam)",
                    height: "100%",
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => {
              if (listening) {
                stopListening();
              } else {
                void startListening();
              }
            }}
            onTouchStart={(e) => { e.preventDefault(); }}
            className="relative w-16 h-16 rounded-full flex items-center justify-center text-xl transition-all active:scale-90"
            style={{
              background: listening ? "var(--seam)" : "rgba(248,246,240,0.1)",
              border: `2px solid ${listening ? "var(--seam)" : "rgba(248,246,240,0.15)"}`,
            }}
          >
            {listening ? "⏹" : "🎙"}
          </button>

          <p className="text-xs font-light" style={{ color: "rgba(248,246,240,0.35)" }}>
            {listening ? "Listening — tap to stop" : "Tap to speak"}
          </p>
        </div>
      )}

      {stage === "done" && (
        <div className="px-5 pb-8 pt-4 text-center">
          <p className="text-sm font-light mb-4" style={{ color: "rgba(248,246,240,0.5)" }}>
            Redirecting to Jackie Jeans…
          </p>
          <a
            href={`https://jackie-jeans.vercel.app/?fit=${encodeURIComponent(JSON.stringify(profile))}`}
            className="px-8 py-3 rounded-full text-sm font-medium inline-block"
            style={{ background: "var(--seam)", color: "white" }}
          >
            Go Now →
          </a>
        </div>
      )}
    </div>
  );
}

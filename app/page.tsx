"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--canvas)" }}
    >
      {/* Logo / Brand */}
      <div className="text-center mb-12 animate-fade-up">
        <p
          className="text-xs tracking-[0.35em] uppercase mb-3"
          style={{ color: "var(--stitch)", fontFamily: "Inter, sans-serif", fontWeight: 300 }}
        >
          Welcome to
        </p>
        <h1
          className="font-display text-6xl md:text-7xl font-light mb-2"
          style={{ color: "var(--indigo)", letterSpacing: "-0.01em", lineHeight: 1 }}
        >
          Jackie Jeans
        </h1>
        <div className="w-12 h-px mx-auto mt-5 mb-5" style={{ background: "var(--seam)" }} />
        <p
          className="text-base font-light max-w-xs mx-auto leading-relaxed"
          style={{ color: "var(--stitch)" }}
        >
          Denim that fits. No guessing, no returns.
          <br />Just your perfect pair.
        </p>
      </div>

      {/* CTA Cards */}
      <div
        className="w-full max-w-sm flex flex-col gap-3 animate-fade-up"
        style={{ animationDelay: "0.15s", opacity: 0 }}
      >
        <button
          onClick={() => router.push("/quiz")}
          className="w-full py-4 px-6 rounded-xl text-left flex items-center justify-between group transition-all"
          style={{
            background: "var(--indigo)",
            color: "var(--canvas)",
          }}
        >
          <div>
            <p className="text-sm font-medium tracking-wide">Fit Quiz</p>
            <p className="text-xs mt-0.5 opacity-60 font-light">Answer a few quick questions</p>
          </div>
          <span className="text-lg opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
        </button>

        <button
          onClick={() => router.push("/voice")}
          className="w-full py-4 px-6 rounded-xl text-left flex items-center justify-between group transition-all border"
          style={{
            background: "transparent",
            color: "var(--indigo)",
            borderColor: "var(--linen)",
          }}
        >
          <div>
            <p className="text-sm font-medium tracking-wide flex items-center gap-2">
              <span>🎙</span> AI Voice Quiz
            </p>
            <p className="text-xs mt-0.5 font-light" style={{ color: "var(--stitch)" }}>
              Just talk — we&apos;ll guide you through
            </p>
          </div>
          <span className="text-lg opacity-30 group-hover:opacity-70 group-hover:translate-x-1 transition-all">→</span>
        </button>
      </div>

      <p
        className="mt-10 text-xs font-light"
        style={{ color: "var(--stitch)", opacity: 0.6 }}
      >
        Takes about 2 minutes
      </p>
    </main>
  );
}

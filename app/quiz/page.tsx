"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  HEIGHTS, WAISTS, HIPS, BRANDS,
  WAIST_FIT_OPTIONS, RISE_OPTIONS, THIGH_OPTIONS, FRUSTRATION_OPTIONS,
  JEAN_SIZES, FitProfile
} from "@/lib/quizData";

const TOTAL_STEPS = 11; // 10 questions + intro

type Step =
  | "intro"
  | "height" | "weight" | "waist" | "hip"
  | "waistFit" | "rise" | "thighFit"
  | "brands" | "brandSizes" | "frustration"
  | "done";

export default function QuizPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [profile, setProfile] = useState<FitProfile>({});
  const [brandSizeIndex, setBrandSizeIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const stepNumber = {
    intro: 0, height: 1, weight: 2, waist: 3, hip: 4,
    waistFit: 5, rise: 6, thighFit: 7, brands: 8,
    brandSizes: 9, frustration: 10, done: 11
  }[step];

  const progress = Math.round((stepNumber / TOTAL_STEPS) * 100);

  function goTo(next: Step) {
    setAnimKey(k => k + 1);
    setStep(next);
  }

  function goBack() {
    const prev: Record<Step, Step> = {
      intro: "intro", height: "intro", weight: "height", waist: "weight",
      hip: "waist", waistFit: "hip", rise: "waistFit", thighFit: "rise",
      brands: "thighFit", brandSizes: "brands", frustration: brandSizeIndex > 0 ? "brandSizes" : "brands",
      done: "frustration"
    };
    goTo(prev[step]);
  }

  function finish() {
    // Store profile in sessionStorage for handoff
    sessionStorage.setItem("jackieFitProfile", JSON.stringify(profile));
    goTo("done");
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--canvas)" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          {step !== "intro" ? (
            <button onClick={goBack} className="text-sm flex items-center gap-1.5 transition-opacity" style={{ color: "var(--stitch)" }}>
              <span>←</span> Back
            </button>
          ) : (
            <div />
          )}
          <span className="font-display text-xl" style={{ color: "var(--indigo)" }}>Jackie Jeans</span>
          {step !== "intro" && step !== "done" ? (
            <span className="text-xs font-light" style={{ color: "var(--stitch)" }}>
              {stepNumber}/{TOTAL_STEPS - 1}
            </span>
          ) : <div />}
        </div>

        {/* Progress bar */}
        {step !== "intro" && step !== "done" && (
          <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "var(--linen)" }}>
            <div
              className="h-full rounded-full progress-fill"
              style={{ width: `${progress}%`, background: "var(--seam)" }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-6 flex flex-col" key={animKey} style={{ animation: "fadeUp 0.35s ease forwards" }}>
        {step === "intro" && <Intro onStart={() => goTo("height")} />}
        {step === "height" && (
          <SelectStep
            label="What's your height?"
            hint="We use this to recommend your inseam length."
            options={HEIGHTS}
            value={profile.height}
            onSelect={(v) => { setProfile(p => ({ ...p, height: v })); goTo("weight"); }}
          />
        )}
        {step === "weight" && (
          <NumberStep
            label="What's your weight?"
            hint="Optional — helps calibrate proportional fit."
            unit="lbs"
            value={profile.weight}
            optional
            onNext={(v) => { setProfile(p => ({ ...p, weight: v })); goTo("waist"); }}
            onSkip={() => { setProfile(p => ({ ...p, weight: undefined })); goTo("waist"); }}
          />
        )}
        {step === "waist" && (
          <SelectStep
            label="Waist measurement?"
            hint="Measure at the narrowest point of your torso."
            options={WAISTS}
            value={profile.waist}
            onSelect={(v) => { setProfile(p => ({ ...p, waist: v })); goTo("hip"); }}
          />
        )}
        {step === "hip" && (
          <SelectStep
            label="Hip measurement?"
            hint="Measure at the fullest part of your hips."
            options={HIPS}
            value={profile.hip}
            onSelect={(v) => { setProfile(p => ({ ...p, hip: v })); goTo("waistFit"); }}
          />
        )}
        {step === "waistFit" && (
          <ChoiceStep
            label="How should jeans fit at the waist?"
            options={WAIST_FIT_OPTIONS}
            value={profile.waistFit}
            onSelect={(v) => { setProfile(p => ({ ...p, waistFit: v })); goTo("rise"); }}
          />
        )}
        {step === "rise" && (
          <ChoiceStep
            label="Where should the waistband sit?"
            options={RISE_OPTIONS}
            value={profile.rise}
            onSelect={(v) => { setProfile(p => ({ ...p, rise: v })); goTo("thighFit"); }}
          />
        )}
        {step === "thighFit" && (
          <ChoiceStep
            label="How should jeans fit through the thighs?"
            options={THIGH_OPTIONS}
            value={profile.thighFit}
            onSelect={(v) => { setProfile(p => ({ ...p, thighFit: v })); goTo("brands"); }}
          />
        )}
        {step === "brands" && (
          <MultiSelectStep
            label="Which denim brands have you bought before?"
            hint="Select all that apply."
            options={BRANDS}
            value={profile.brands || []}
            onNext={(v) => {
              setProfile(p => ({ ...p, brands: v }));
              if (v.length === 0) goTo("frustration");
              else { setBrandSizeIndex(0); goTo("brandSizes"); }
            }}
          />
        )}
        {step === "brandSizes" && profile.brands && profile.brands[brandSizeIndex] && (
          <BrandSizeStep
            brand={profile.brands[brandSizeIndex]}
            current={profile.brandSizes?.[profile.brands[brandSizeIndex]] || ""}
            total={profile.brands.length}
            index={brandSizeIndex}
            onNext={(size) => {
              const updated = { ...profile.brandSizes, [profile.brands![brandSizeIndex]]: size };
              setProfile(p => ({ ...p, brandSizes: updated }));
              if (brandSizeIndex + 1 < profile.brands!.length) {
                setBrandSizeIndex(i => i + 1);
                setAnimKey(k => k + 1);
              } else {
                goTo("frustration");
              }
            }}
          />
        )}
        {step === "frustration" && (
          <ChoiceStep
            label="Biggest frustration buying jeans?"
            options={FRUSTRATION_OPTIONS}
            value={profile.frustration}
            onSelect={(v) => { setProfile(p => ({ ...p, frustration: v })); finish(); }}
          />
        )}
        {step === "done" && <Done profile={profile} />}
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <div className="mb-10">
        <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: "var(--seam)" }}>
          Fit Quiz
        </p>
        <h2 className="font-display text-4xl font-light leading-tight mb-4" style={{ color: "var(--indigo)" }}>
          Let&apos;s find your<br />perfect fit.
        </h2>
        <p className="text-sm font-light leading-relaxed" style={{ color: "var(--stitch)" }}>
          10 quick questions. No size guessing, no returns.
          We&apos;ll match you to denim that actually fits your body.
        </p>
      </div>
      <button
        onClick={onStart}
        className="w-full py-4 rounded-xl text-sm font-medium tracking-wide transition-transform active:scale-[0.98]"
        style={{ background: "var(--indigo)", color: "var(--canvas)" }}
      >
        Start Quiz →
      </button>
      <p className="text-center mt-4 text-xs font-light" style={{ color: "var(--stitch)" }}>
        About 2 minutes
      </p>
    </div>
  );
}

function SelectStep({
  label, hint, options, value, onSelect
}: {
  label: string; hint: string; options: string[];
  value?: string; onSelect: (v: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col">
      <h2 className="font-display text-3xl font-light mb-2" style={{ color: "var(--indigo)" }}>{label}</h2>
      <p className="text-sm font-light mb-5" style={{ color: "var(--stitch)" }}>{hint}</p>
      {options.length > 10 && (
        <input
          type="text"
          placeholder="Type to search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm mb-3 outline-none border transition-colors"
          style={{
            background: "var(--linen)",
            borderColor: "transparent",
            color: "var(--ink)",
          }}
        />
      )}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <div className="grid grid-cols-3 gap-2">
          {filtered.map(opt => (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              className="py-3 px-2 rounded-xl text-sm transition-all active:scale-95"
              style={{
                background: value === opt ? "var(--indigo)" : "var(--linen)",
                color: value === opt ? "var(--canvas)" : "var(--ink)",
                fontWeight: value === opt ? 500 : 400,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChoiceStep({
  label, options, value, onSelect
}: {
  label: string; options: string[]; value?: string; onSelect: (v: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <h2 className="font-display text-3xl font-light mb-8" style={{ color: "var(--indigo)" }}>{label}</h2>
      <div className="flex flex-col gap-3">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className="w-full py-4 px-5 rounded-xl text-left text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-between"
            style={{
              background: value === opt ? "var(--indigo)" : "var(--linen)",
              color: value === opt ? "var(--canvas)" : "var(--ink)",
            }}
          >
            <span>{opt}</span>
            {value === opt && <span className="text-xs opacity-60">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiSelectStep({
  label, hint, options, value, onNext
}: {
  label: string; hint: string; options: string[];
  value: string[]; onNext: (v: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(value);

  const toggle = (opt: string) => {
    setSelected(s => s.includes(opt) ? s.filter(x => x !== opt) : [...s, opt]);
  };

  return (
    <div className="flex-1 flex flex-col">
      <h2 className="font-display text-3xl font-light mb-2" style={{ color: "var(--indigo)" }}>{label}</h2>
      <p className="text-sm font-light mb-5" style={{ color: "var(--stitch)" }}>{hint}</p>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2 pb-24">
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              className="py-3 px-4 rounded-xl text-sm text-left transition-all active:scale-95 border"
              style={{
                background: selected.includes(opt) ? "var(--indigo)" : "var(--linen)",
                color: selected.includes(opt) ? "var(--canvas)" : "var(--ink)",
                borderColor: selected.includes(opt) ? "var(--indigo)" : "transparent",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-5" style={{ background: "linear-gradient(transparent, var(--canvas) 40%)" }}>
        <button
          onClick={() => onNext(selected)}
          className="w-full py-4 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
          style={{ background: "var(--indigo)", color: "var(--canvas)" }}
        >
          {selected.length > 0 ? `Continue with ${selected.length} brand${selected.length > 1 ? "s" : ""}` : "Skip — I haven't bought denim recently"}
        </button>
      </div>
    </div>
  );
}

function BrandSizeStep({
  brand, current, total, index, onNext
}: {
  brand: string; current: string; total: number; index: number; onNext: (size: string) => void;
}) {
  const [size, setSize] = useState(current);

  return (
    <div className="flex-1 flex flex-col justify-center">
      <p className="text-xs tracking-[0.25em] uppercase mb-3" style={{ color: "var(--stitch)" }}>
        Brand {index + 1} of {total}
      </p>
      <h2 className="font-display text-3xl font-light mb-2" style={{ color: "var(--indigo)" }}>
        What size in {brand}?
      </h2>
      <p className="text-sm font-light mb-6" style={{ color: "var(--stitch)" }}>
        The size you usually buy or last bought.
      </p>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {JEAN_SIZES.map(s => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className="py-3 rounded-xl text-sm transition-all active:scale-95"
            style={{
              background: size === s ? "var(--indigo)" : "var(--linen)",
              color: size === s ? "var(--canvas)" : "var(--ink)",
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <button
        onClick={() => size && onNext(size)}
        disabled={!size}
        className="w-full py-4 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
        style={{
          background: size ? "var(--indigo)" : "var(--linen)",
          color: size ? "var(--canvas)" : "var(--stitch)",
        }}
      >
        {index + 1 < total ? "Next brand →" : "Continue →"}
      </button>
    </div>
  );
}

function NumberStep({
  label, hint, unit, value, optional, onNext, onSkip
}: {
  label: string; hint: string; unit: string;
  value?: string; optional?: boolean;
  onNext: (v: string) => void; onSkip?: () => void;
}) {
  const [val, setVal] = useState(value || "");

  return (
    <div className="flex-1 flex flex-col justify-center">
      <h2 className="font-display text-3xl font-light mb-2" style={{ color: "var(--indigo)" }}>{label}</h2>
      <p className="text-sm font-light mb-6" style={{ color: "var(--stitch)" }}>{hint}</p>
      <div className="flex items-center gap-3 mb-6">
        <input
          type="number"
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="e.g. 130"
          className="flex-1 px-4 py-4 rounded-xl text-2xl font-light outline-none border-2 transition-colors"
          style={{
            background: "var(--linen)",
            borderColor: val ? "var(--indigo)" : "transparent",
            color: "var(--ink)",
          }}
        />
        <span className="text-sm font-light" style={{ color: "var(--stitch)" }}>{unit}</span>
      </div>
      <button
        onClick={() => val && onNext(val)}
        disabled={!val}
        className="w-full py-4 rounded-xl text-sm font-medium mb-3 transition-all active:scale-[0.98]"
        style={{
          background: val ? "var(--indigo)" : "var(--linen)",
          color: val ? "var(--canvas)" : "var(--stitch)",
        }}
      >
        Continue →
      </button>
      {optional && onSkip && (
        <button
          onClick={onSkip}
          className="w-full py-3 text-sm font-light transition-opacity"
          style={{ color: "var(--stitch)" }}
        >
          Skip this question
        </button>
      )}
    </div>
  );
}

function Done({ profile }: { profile: FitProfile }) {
  const pairs = [
    { label: "Height", value: profile.height },
    { label: "Waist", value: profile.waist },
    { label: "Hip", value: profile.hip },
    { label: "Waist fit", value: profile.waistFit },
    { label: "Rise", value: profile.rise },
    { label: "Thigh fit", value: profile.thighFit },
    { label: "Frustration", value: profile.frustration },
  ].filter(p => p.value);

  return (
    <div className="flex-1 flex flex-col justify-center">
      <div className="mb-8">
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-5 text-lg"
          style={{ background: "var(--indigo)", color: "var(--canvas)" }}>✓</div>
        <h2 className="font-display text-4xl font-light mb-3" style={{ color: "var(--indigo)" }}>
          Your fit profile is ready.
        </h2>
        <p className="text-sm font-light leading-relaxed" style={{ color: "var(--stitch)" }}>
          Head to Jackie Jeans to see your personalised recommendations.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl p-4 mb-6" style={{ background: "var(--linen)" }}>
        <div className="grid grid-cols-2 gap-2">
          {pairs.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-light" style={{ color: "var(--stitch)" }}>{label}</p>
              <p className="text-sm font-medium" style={{ color: "var(--indigo)" }}>{value}</p>
            </div>
          ))}
          {profile.brands && profile.brands.length > 0 && (
            <div className="col-span-2">
              <p className="text-xs font-light" style={{ color: "var(--stitch)" }}>Brands</p>
              <p className="text-sm font-medium" style={{ color: "var(--indigo)" }}>{profile.brands.join(", ")}</p>
            </div>
          )}
        </div>
      </div>

      <a
        href={`https://jackie-jeans.vercel.app/?fit=${encodeURIComponent(JSON.stringify(profile))}`}
        className="w-full py-4 rounded-xl text-sm font-medium text-center block transition-all active:scale-[0.98]"
        style={{ background: "var(--seam)", color: "white" }}
      >
        See My Recommendations →
      </a>
    </div>
  );
}

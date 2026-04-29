"use client";
import { useState } from "react";
import { X, Upload, MessageSquare, BookOpen, ArrowRight, Check } from "lucide-react";

interface Props {
  onClose: () => void;
}

const steps = [
  {
    icon: <BookOpen size={26} strokeWidth={1.5} />,
    title: "Upload your documents",
    description:
      "Add PDFs, Word docs, images, spreadsheets, or plain text. DocMind indexes every page so nothing gets missed.",
    tip: "Click the Upload button at the bottom of the sidebar to get started.",
  },
  {
    icon: <MessageSquare size={26} strokeWidth={1.5} />,
    title: "Ask in plain English",
    description:
      "Ask anything — summarise a clause, find a diagnosis date, compare two agreements. No search syntax needed.",
    tip: "Your question is matched against the most relevant passages across all your documents.",
  },
  {
    icon: (
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
      </svg>
    ),
    title: "Every answer is cited",
    description:
      "Answers come with numbered source chips. Click any chip to see the exact page and highlighted passage it came from.",
    tip: "The right panel shows confidence scores so you always know how grounded each answer is.",
  },
  {
    icon: <Upload size={26} strokeWidth={1.5} />,
    title: "Built for high-stakes use",
    description:
      "DocMind runs locally — your documents never leave your machine. Answers refuse to speculate when context is thin.",
    tip: "Always verify critical findings with a qualified professional before acting on them.",
  },
];

export default function WelcomeTour({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <>
      <style>{`
        @keyframes tour-in {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20,20,19,0.55)",
          backdropFilter: "blur(6px)",
          zIndex: 2000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Card */}
        <div
          style={{
            width: 520,
            background: "var(--color-canvas)",
            borderRadius: 24,
            boxShadow: "0 32px 80px rgba(20,20,19,0.22)",
            overflow: "hidden",
            animation: "tour-in 0.3s cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          {/* Top accent strip */}
          <div
            style={{
              height: 4,
              background: "var(--color-primary)",
            }}
          />

          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              padding: "28px 28px 0",
            }}
          >
            <div>
              {/* Brand mark */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="white">
                    <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
                  </svg>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  DocMind
                </span>
              </div>

              <h2
                className="font-display-dm"
                style={{ fontSize: 26, color: "var(--color-ink)", lineHeight: 1.2 }}
              >
                Welcome to DocMind
              </h2>
              <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 6 }}>
                Grounded answers from your medical &amp; legal documents
              </p>
              <p style={{ fontSize: 11, color: "var(--color-muted-soft)", marginTop: 4 }}>
                Powered by Custom Llama 3.2
              </p>
            </div>

            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-muted)",
                background: "transparent",
                transition: "background 0.15s",
                flexShrink: 0,
                marginTop: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-soft)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <X size={16} />
            </button>
          </div>

          {/* Step content */}
          <div style={{ padding: "24px 28px 0" }}>
            {/* Step icon + title */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                padding: "20px",
                borderRadius: 16,
                background: "var(--color-surface-soft)",
                border: "1px solid var(--color-hairline)",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "var(--color-primary)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {current.icon}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    marginBottom: 6,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {current.title}
                </div>
                <p style={{ fontSize: 13, color: "var(--color-body)", lineHeight: 1.65 }}>
                  {current.description}
                </p>
              </div>
            </div>

            {/* Tip */}
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                borderRadius: 10,
                background: "#d6771f12",
                border: "1px solid #d6771f28",
                fontSize: 12,
                color: "var(--color-body)",
                lineHeight: 1.6,
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>Tip: </span>
              {current.tip}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 28px 28px",
            }}
          >
            {/* Step dots */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  style={{
                    width: i === step ? 20 : 7,
                    height: 7,
                    borderRadius: 99,
                    background: i === step ? "var(--color-primary)" : "var(--color-surface-cream-strong)",
                    transition: "width 0.25s ease, background 0.2s",
                  }}
                />
              ))}
            </div>

            {/* Nav buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-body)",
                    background: "var(--color-surface-soft)",
                    border: "1px solid var(--color-hairline)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-surface-soft)")}
                >
                  Back
                </button>
              )}

              <button
                onClick={() => (isLast ? onClose() : setStep(step + 1))}
                style={{
                  padding: "9px 20px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "white",
                  background: "var(--color-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-primary-active)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-primary)")}
              >
                {isLast ? (
                  <>
                    <Check size={14} />
                    Get started
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

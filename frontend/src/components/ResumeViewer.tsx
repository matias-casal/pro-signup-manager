import { useMemo, useState } from "react";
import { Professional } from "../api/types";
import { Dialog } from "./Dialog";

interface Props {
  professional: Professional | null;
  onClose: () => void;
}

export function ResumeViewer({ professional, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"pdf" | "text">("text");
  const [copied, setCopied] = useState(false);

  const resumeUrl = professional?.resume;
  const textContent = useMemo(() => {
    const txt = professional?.resume_text?.trim() ?? "";
    return txt || "No extracted text available for this resume.";
  }, [professional]);

  if (!professional) return null;

  return (
    <Dialog
      open={!!professional}
      onClose={onClose}
      title={professional.full_name || professional.email || "Resume"}
      description="View the attached PDF or its extracted text"
      size="wide"
      bodyClassName="flex flex-col gap-4"
    >
      <div className="flex items-center gap-2">
        {resumeUrl ? (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            PDF attached
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            No PDF attached
          </span>
        )}
        {professional.email && <span className="text-sm text-slate-500">Email: {professional.email}</span>}
      </div>

      <div className="flex gap-2 border border-slate-200 rounded-lg bg-slate-50 p-1 w-fit">
        <button
          onClick={() => setActiveTab("pdf")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "pdf" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
          disabled={!resumeUrl}
        >
          PDF
        </button>
        <button
          onClick={() => setActiveTab("text")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "text" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
        >
          Extracted Text
        </button>
      </div>

      <div className="flex-1 min-h-[60vh] rounded-lg border border-slate-200 bg-white shadow-inner overflow-hidden">
        {activeTab === "pdf" ? (
          resumeUrl ? (
            <iframe
              src={resumeUrl}
              title="Resume PDF"
              className="w-full h-full min-h-[60vh] border-0"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-500">
              No PDF available for this professional.
            </div>
          )
        ) : (
          <div className="relative h-[60vh] flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 pb-16">
              <pre className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">
                {textContent}
              </pre>
            </div>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(textContent);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch (err) {
                  console.error("Copy failed", err);
                }
              }}
              className="absolute bottom-4 right-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-200 active:scale-95"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy text
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

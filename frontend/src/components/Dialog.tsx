import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "default" | "wide";
  bodyClassName?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "default",
  bodyClassName,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const contentClasses = ["dialog-content", size === "wide" ? "dialog-content-wide" : ""]
    .filter(Boolean)
    .join(" ");
  const bodyClasses = [
    "dialog-body",
    size === "wide" ? "dialog-body-wide" : "",
    bodyClassName ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className={contentClasses}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header">
          <div>
            <h2 className="dialog-title">{title}</h2>
            {description && <p className="dialog-description">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="dialog-close"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className={bodyClasses}>
          {children}
        </div>
      </div>
    </div>
  );
}

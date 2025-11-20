import { useState, type FormEvent } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBulkUpsert } from "../api/professionals";
import { BulkUpsertResponse, ProfessionalSource } from "../api/types";

const phoneRegex = /^[+0-9\s().-]{7,20}$/;

const entrySchema = z
  .object({
    full_name: z.string().min(1, "Full name is required").max(200),
    email: z
      .string()
      .email("Invalid email")
      .max(254)
      .optional()
      .or(z.literal(""))
      .transform((val) => (val === "" ? undefined : val)),
    phone: z
      .string()
      .max(32)
      .optional()
      .or(z.literal(""))
      .transform((val) => (val === "" ? undefined : val))
      .refine((val) => val === undefined || phoneRegex.test(val), {
        message: "Enter a valid phone number",
      }),
    company_name: z.string().max(200).optional().or(z.literal("")),
    job_title: z.string().max(200).optional().or(z.literal("")),
    source: z.enum(["direct", "partner", "internal"] as const).default("direct"),
  });

const formSchema = z.object({
  entries: z.array(entrySchema).min(1, "Add at least one professional"),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmittedEntry {
  full_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
  source: ProfessionalSource;
}

/**
 * Normalizes DRF-style error payloads into readable strings for the UI,
 * handling mixed shapes like {"email": ["..."], "non_field_errors": "..."}.
 */
function parseApiErrors(errors: Record<string, unknown>): string[] {
  const result: string[] = [];
  for (const [field, value] of Object.entries(errors)) {
    if (Array.isArray(value)) {
      value.forEach(msg => result.push(`${field}: ${msg}`));
    } else if (typeof value === "string") {
      result.push(`${field}: ${value}`);
    }
  }
  return result.length > 0 ? result : [JSON.stringify(errors)];
}

export function BulkUploadPanel() {
  const [result, setResult] = useState<BulkUpsertResponse | null>(null);
  const [submittedEntries, setSubmittedEntries] = useState<SubmittedEntry[]>([]);
  const [showErrors, setShowErrors] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, register, formState, reset, getValues, trigger } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entries: [
        { full_name: "", email: "", phone: "", company_name: "", job_title: "", source: "direct" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "entries" });
  const { mutateAsync, isPending } = useBulkUpsert();

  const onSubmit = async (values: FormValues) => {
    const payload = values.entries.map((entry) => ({
      full_name: entry.full_name,
      email: entry.email,
      phone: entry.phone || undefined,
      company_name: entry.company_name || undefined,
      job_title: entry.job_title || undefined,
      source: entry.source as ProfessionalSource,
    }));
    setSubmitError(null);
    setSubmittedEntries(payload);
    try {
      const response = await mutateAsync(payload);
      setResult(response);
      setShowErrors(true);
    } catch (error) {
      setResult(null);
      const message =
        error instanceof Error ? error.message : "Bulk import failed. Please try again.";
      setSubmitError(message);
    }
  };

  const submitAll = async (event?: FormEvent) => {
    event?.preventDefault();
    // Surface client-side hints but do not block submission; backend will return row-level errors.
    await trigger();
    const values = getValues();
    await onSubmit(values);
  };

  const handleReset = () => {
    setResult(null);
    reset({
      entries: [
        { full_name: "", email: "", phone: "", company_name: "", job_title: "", source: "direct" },
      ],
    });
  };

  // Show results view
  if (result) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Summary */}
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-8 mb-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-slate-900">{result.success_count}</div>
              <div className="text-sm text-slate-500">Imported</div>
            </div>
            {result.errors.length > 0 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-slate-900">{result.errors.length}</div>
                <div className="text-sm text-slate-500">Failed</div>
              </div>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Processed {result.total_processed} {result.total_processed === 1 ? "row" : "rows"}
          </p>
        </div>

        {/* Error details */}
        {result.errors.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <button
              className="text-sm text-primary font-medium hover:underline mb-3"
              onClick={() => setShowErrors((prev) => !prev)}
            >
              {showErrors ? "Hide" : "Show"} error details ({result.errors.length})
            </button>
            {showErrors && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.errors.map((err) => {
                  const entry = submittedEntries[err.index];
                  return (
                    <div key={err.index} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                      <div className="font-medium text-sm text-red-700 mb-2">
                        Row {err.index + 1}
                      </div>
                      {entry && (
                        <div className="text-xs text-slate-600 mb-2 p-2 bg-white rounded border border-slate-200">
                          <div className="grid grid-cols-2 gap-1">
                            {entry.full_name && <span><strong>Name:</strong> {entry.full_name}</span>}
                            {entry.company_name && <span><strong>Company:</strong> {entry.company_name}</span>}
                            {entry.job_title && <span><strong>Title:</strong> {entry.job_title}</span>}
                            {entry.email && <span><strong>Email:</strong> {entry.email}</span>}
                            {entry.phone && <span><strong>Phone:</strong> {entry.phone}</span>}
                          </div>
                        </div>
                      )}
                      <ul className="text-xs text-red-600 space-y-0.5">
                        {parseApiErrors(err.errors).map((msg, i) => (
                          <li key={i}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Action button */}
        <button
          type="button"
          onClick={handleReset}
          className="w-full btn btn-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Import More
        </button>
      </div>
    );
  }

  // Show form view
  return (
    <div className="space-y-4">
      <form className="space-y-3" onSubmit={submitAll}>
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
            {submitError}
          </div>
        )}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="p-3 bg-slate-50 rounded-lg border border-slate-100 animate-fade-in"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500">Entry {index + 1}</span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-danger text-xs py-1 px-2"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  className="form-input text-xs py-2"
                  placeholder="Full name"
                  maxLength={200}
                  {...register(`entries.${index}.full_name` as const)}
                />
                <input
                  className="form-input text-xs py-2"
                  placeholder="Company"
                  maxLength={200}
                  {...register(`entries.${index}.company_name` as const)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <input
                    className={`form-input text-xs py-2 ${formState.errors.entries?.[index]?.email ? "border-red-300" : ""}`}
                    placeholder="Email"
                    maxLength={254}
                    {...register(`entries.${index}.email` as const)}
                  />
                  {formState.errors.entries?.[index]?.email && (
                    <p className="text-[10px] text-red-500 mt-0.5">
                      {formState.errors.entries[index]?.email?.message as string}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    className={`form-input text-xs py-2 ${formState.errors.entries?.[index]?.phone ? "border-red-300" : ""}`}
                    placeholder="Phone"
                    maxLength={32}
                    {...register(`entries.${index}.phone` as const)}
                  />
                  {formState.errors.entries?.[index]?.phone && (
                    <p className="text-[10px] text-red-500 mt-0.5">
                      {formState.errors.entries[index]?.phone?.message as string}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  className="form-input text-xs py-2"
                  placeholder="Job title"
                  maxLength={200}
                  {...register(`entries.${index}.job_title` as const)}
                />
                <select
                  className="form-input text-xs py-2"
                  {...register(`entries.${index}.source` as const)}
                >
                  <option value="direct">Direct</option>
                  <option value="partner">Partner</option>
                  <option value="internal">Internal</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {formState.errors.entries && (
          <p className="form-error">{formState.errors.entries.message as string}</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-ghost flex-1"
            onClick={() =>
              append({
                full_name: "",
                email: "",
                phone: "",
                company_name: "",
                job_title: "",
                source: "direct",
              })
            }
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Row
          </button>
          <button
            type="submit"
            className="btn btn-accent flex-1"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Importing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import All
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateProfessional } from "../api/professionals";
import { ProfessionalSource } from "../api/types";
import axios from "axios";

const phoneRegex = /^[+0-9\s().-]{7,20}$/;

const schema = z
  .object({
    full_name: z.string().min(1, "Full name is required").max(200),
    company_name: z.string().max(200, "Max 200 chars").optional().or(z.literal("")),
    job_title: z.string().max(200, "Max 200 chars").optional().or(z.literal("")),
    email: z
      .string()
      .email("Invalid email")
      .max(254)
      .optional()
      .or(z.literal(""))
      .transform((val) => (val === "" ? undefined : val)),
    phone: z
      .string()
      .max(32, "Max 32 chars")
      .optional()
      .or(z.literal(""))
      .transform((val) => (val === "" ? undefined : val))
      .refine((val) => val === undefined || phoneRegex.test(val), {
        message: "Enter a valid phone number",
      }),
    source: z.enum(["direct", "partner", "internal"] as const).default("direct"),
    resume: z.instanceof(File).optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "Email is required if phone is empty (and vice-versa)",
    path: ["email"],
  });

type FormValues = z.infer<typeof schema>;

function parseApiErrors(data: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const [field, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      value.forEach(msg => errors.push(`${field}: ${msg}`));
    } else if (typeof value === "string") {
      errors.push(`${field}: ${value}`);
    }
  }
  return errors.length > 0 ? errors : [JSON.stringify(data)];
}

interface Props {
  onSuccess?: () => void;
}

export function ProfessionalForm({ onSuccess }: Props) {
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { source: "direct" },
  });

  const { mutateAsync } = useCreateProfessional();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setValue("resume", undefined);
      return;
    }

    if (file.type !== "application/pdf") {
      setError("resume", { type: "manual", message: "Only .pdf files are allowed" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("resume", { type: "manual", message: "File must be smaller than 5MB" });
      return;
    }

    clearErrors("resume");
    setValue("resume", file);
  };

  const onSubmit = async (values: FormValues) => {
    setErrorMessages([]);
    try {
      await mutateAsync({
        full_name: values.full_name,
        company_name: values.company_name || undefined,
        job_title: values.job_title || undefined,
        email: values.email,
        phone: values.phone || undefined,
        source: values.source as ProfessionalSource,
        resume: values.resume,
      });
      reset({ source: values.source, full_name: "" });
      onSuccess?.();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        if (typeof data.detail === "string") {
          setErrorMessages([data.detail]);
        } else {
          setErrorMessages(parseApiErrors(data));
        }
      } else {
        setErrorMessages(["Unable to save professional"]);
      }
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label className="form-label">Full name</label>
        <input
          className="form-input"
          maxLength={200}
          {...register("full_name")}
          placeholder="Full name"
        />
        {errors.full_name && <p className="form-error">{errors.full_name.message}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="form-label">Company</label>
          <input
            className="form-input"
            maxLength={200}
            {...register("company_name")}
            placeholder="Company name"
          />
        </div>
        <div>
          <label className="form-label">Job title</label>
          <input
            className="form-input"
            maxLength={200}
            {...register("job_title")}
            placeholder="Job title"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="form-label">Email</label>
          <input
            className="form-input"
            maxLength={254}
            {...register("email")}
            placeholder="name@example.com"
          />
          {errors.email && <p className="form-error">{errors.email.message}</p>}
        </div>
        <div>
          <label className="form-label">Phone</label>
          <input
            className="form-input"
            maxLength={32}
            {...register("phone")}
            placeholder="+1 555 555 5555"
          />
          {errors.phone && <p className="form-error">{errors.phone.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
        <div>
          <label className="form-label">Source</label>
          <select className="form-input" {...register("source")}> 
            <option value="direct">Direct</option>
            <option value="partner">Partner</option>
            <option value="internal">Internal</option>
          </select>
        </div>
        <div>
          <label className="form-label">Resume (PDF, &lt;5MB)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-accent text-white px-3 py-2 rounded-md shadow hover:bg-teal-500"
            >
              Choose PDF
            </button>
            {watch("resume") && (
              <span className="text-xs text-slate-600 truncate max-w-[160px]">
                {watch("resume")?.name}
              </span>
            )}
          </div>
          {errors.resume && <p className="form-error">{errors.resume.message}</p>}
        </div>
      </div>
      {/* Error Messages */}
      {errorMessages.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Error saving professional
          </div>
          <ul className="text-sm text-red-600 space-y-0.5 ml-6">
            {errorMessages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-primary text-white px-4 py-2.5 rounded-lg shadow hover:bg-blue-900 disabled:opacity-60 font-medium"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save Professional"}
      </button>
    </form>
  );
}

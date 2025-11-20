export type ProfessionalSource = "direct" | "partner" | "internal";

export interface Professional {
  id: number;
  full_name: string;
  company_name?: string;
  job_title?: string;
  email?: string;
  phone?: string;
  source: ProfessionalSource;
  resume?: string;
  resume_text?: string;
  created_at: string;
  updated_at: string;
}

export interface BulkUpsertError {
  index: number;
  errors: Record<string, unknown>;
}

export interface BulkUpsertResponse {
  total_processed: number;
  success_count: number;
  errors: BulkUpsertError[];
}

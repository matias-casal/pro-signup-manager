import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./client";
import { BulkUpsertResponse, Professional, ProfessionalSource } from "./types";

export interface ProfessionalPayload {
  full_name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
  source?: ProfessionalSource;
  resume?: File;
}

const PROFESSIONALS_QUERY_KEY = ["professionals"] as const;

export const useProfessionals = (source?: ProfessionalSource) => {
  return useQuery({
    queryKey: [...PROFESSIONALS_QUERY_KEY, source ?? "all"],
    queryFn: async () => {
      const params = source ? { source } : undefined;
      const response = await api.get<Professional[]>("/professionals/", { params });
      return response.data;
    },
  });
};

export const useCreateProfessional = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProfessionalPayload) => {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value as Blob | string);
        }
      });
      const response = await api.post<Professional>("/professionals/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFESSIONALS_QUERY_KEY }),
  });
};

/**
 * Calls the bulk upsert endpoint and refreshes the listing.
 * Backend may respond with HTTP 207 containing per-row errors while still persisting valids.
 */
export const useBulkUpsert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProfessionalPayload[]) => {
      const response = await api.post<BulkUpsertResponse>("/professionals/bulk/", payload);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFESSIONALS_QUERY_KEY }),
  });
};

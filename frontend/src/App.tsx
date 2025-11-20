import { useState, useEffect } from "react";
import { useProfessionals } from "./api/professionals";
import { ProfessionalSource } from "./api/types";
import { ProfessionalTable } from "./components/ProfessionalTable";
import { FilterDropdown } from "./components/FilterDropdown";
import { ProfessionalForm } from "./components/ProfessionalForm";
import { BulkUploadPanel } from "./components/BulkUploadPanel";
import { Dialog } from "./components/Dialog";
import { ResumeViewer } from "./components/ResumeViewer";
import { Professional } from "./api/types";

interface Toast {
  message: string;
  type: "success" | "error";
}

function App() {
  const [sourceFilter, setSourceFilter] = useState<ProfessionalSource | "all">("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkKey, setBulkKey] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [resumeViewer, setResumeViewer] = useState<Professional | null>(null);

  // Base dataset pulled once for stats and "all" view.
  const { data: allData, isLoading: isLoadingAll, isFetching: isFetchingAll } = useProfessionals();
  // Filtered dataset fetched from the server only when a source is selected.
  const {
    data: filteredData,
    isLoading: isLoadingFiltered,
    isFetching: isFetchingFiltered,
  } = useProfessionals(
    sourceFilter === "all" ? undefined : (sourceFilter as ProfessionalSource),
    { enabled: sourceFilter !== "all" }
  );

  const professionals = Array.isArray(allData) ? allData : [];
  const tableData =
    sourceFilter === "all"
      ? professionals
      : Array.isArray(filteredData)
        ? filteredData
        : [];
  const isListingLoading =
    sourceFilter === "all" ? isLoadingAll || isFetchingAll : isLoadingFiltered || isFetchingFiltered;

  const handleBulkDialogClose = () => {
    setBulkDialogOpen(false);
    setBulkKey(k => k + 1); // Reset component state
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleFormSuccess = () => {
    setAddDialogOpen(false);
    setToast({ message: "Professional saved successfully", type: "success" });
  };

  const stats = {
    total: professionals.length,
    direct: professionals.filter(p => p.source === "direct").length,
    partner: professionals.filter(p => p.source === "partner").length,
    internal: professionals.filter(p => p.source === "internal").length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Professional Directory</h1>
                <p className="text-xs text-slate-500">Manage sign-ups from all sources</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBulkDialogOpen(true)}
                className="btn btn-ghost"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Bulk Import
              </button>
              <button
                onClick={() => setAddDialogOpen(true)}
                className="btn btn-primary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Professional
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <div className="stat-card">
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="w-2 h-8 bg-blue-500 rounded-full" />
            <div>
              <div className="stat-value text-lg">{stats.direct}</div>
              <div className="stat-label">Direct</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="w-2 h-8 bg-emerald-500 rounded-full" />
            <div>
              <div className="stat-value text-lg">{stats.partner}</div>
              <div className="stat-label">Partner</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="w-2 h-8 bg-purple-500 rounded-full" />
            <div>
              <div className="stat-value text-lg">{stats.internal}</div>
              <div className="stat-label">Internal</div>
            </div>
          </div>
        </div>

        {/* Directory Card */}
        <div className="card">
          <div className="card-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Directory</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {isListingLoading ? "Loading..." : `${tableData.length} professionals`}
                </p>
              </div>
              <FilterDropdown value={sourceFilter} onChange={setSourceFilter} />
            </div>
          </div>
          <div className="p-0">
            {isListingLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ProfessionalTable data={tableData} onOpenResume={setResumeViewer} />
            )}
          </div>
        </div>
      </main>

      {/* Add Professional Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        title="Add Professional"
        description="Create or update a professional by email"
      >
        <ProfessionalForm onSuccess={handleFormSuccess} />
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog
        open={bulkDialogOpen}
        onClose={handleBulkDialogClose}
        title="Bulk Import"
        description="Add multiple professionals at once"
      >
        <BulkUploadPanel key={bulkKey} />
      </Dialog>

      {/* Resume Viewer */}
      <ResumeViewer
        professional={resumeViewer}
        onClose={() => setResumeViewer(null)}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

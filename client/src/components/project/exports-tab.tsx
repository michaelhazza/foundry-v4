import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  FileJson,
  FileText,
  Clock,
  Loader2,
  AlertCircle,
  Plus,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { formatDate, formatFileSize } from '@/lib/utils';
import type { ProcessingJob, Export } from '@/types';

const EXPORT_FORMATS = [
  {
    value: 'jsonl',
    label: 'JSONL Conversation',
    description: 'OpenAI-compatible conversation format',
    icon: FileJson,
  },
  {
    value: 'qa',
    label: 'Q&A Pairs',
    description: 'Question and answer format',
    icon: FileText,
  },
  {
    value: 'raw',
    label: 'Raw JSON',
    description: 'All processed data as JSON',
    icon: FileJson,
  },
];

export function ExportsTab() {
  const { id: projectId } = useParams<{ id: string }>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: jobs } = useQuery({
    queryKey: queryKeys.jobs.list(Number(projectId)),
    queryFn: () => api.get<{ items: ProcessingJob[] }>(`/projects/${projectId}/jobs`),
    enabled: !!projectId,
  });

  const completedJobs = jobs?.items?.filter((job) => job.status === 'completed') || [];

  // Get exports for the most recent completed job
  const latestCompletedJob = completedJobs[0];
  const { data: exports, isLoading } = useQuery({
    queryKey: ['exports', latestCompletedJob?.id],
    queryFn: () => api.get<Export[]>(`/jobs/${latestCompletedJob.id}/exports`),
    enabled: !!latestCompletedJob,
  });

  if (!completedJobs.length) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No completed jobs</h3>
        <p className="mt-2 text-muted-foreground">
          Run a processing job first to generate exports
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Exports</h2>
          <p className="text-sm text-muted-foreground">
            Generate and download processed data in various formats
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Generate Export
        </button>
      </div>

      {/* Exports list */}
      {isLoading ? (
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      ) : !exports?.length ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Download className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No exports yet</h3>
          <p className="mt-2 text-muted-foreground">
            Click "Generate Export" to create your first export
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Format</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Size</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Records</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Expires</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exports.map((exp) => (
                <ExportRow key={exp.id} export={exp} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create export dialog */}
      {showCreateDialog && latestCompletedJob && (
        <CreateExportDialog
          jobId={latestCompletedJob.id}
          allJobs={completedJobs}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            queryClient.invalidateQueries({ queryKey: ['exports', latestCompletedJob.id] });
          }}
        />
      )}
    </div>
  );
}

function ExportRow({ export: exp }: { export: Export }) {
  const isExpired = new Date(exp.expiresAt) < new Date();
  const formatConfig = EXPORT_FORMATS.find((f) => f.value === exp.format);
  const Icon = formatConfig?.icon || FileJson;

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/exports/${exp.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${exp.id}.${exp.format === 'raw' ? 'json' : 'jsonl'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium capitalize">{formatConfig?.label || exp.format}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm">{formatDate(exp.createdAt)}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatFileSize(exp.fileSize)}</td>
      <td className="px-4 py-3 text-sm">{exp.recordCount.toLocaleString()}</td>
      <td className="px-4 py-3">
        {isExpired ? (
          <span className="text-sm text-destructive">Expired</span>
        ) : (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(exp.expiresAt)}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleDownload}
          disabled={isExpired}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
      </td>
    </tr>
  );
}

function CreateExportDialog({
  jobId,
  allJobs,
  onClose,
  onSuccess,
}: {
  jobId: number;
  allJobs: ProcessingJob[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedJobId, setSelectedJobId] = useState(jobId);
  const [format, setFormat] = useState<'jsonl' | 'qa' | 'raw'>('jsonl');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [contextWindow, setContextWindow] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.post(`/jobs/${selectedJobId}/exports`, {
        format,
        options: {
          systemPrompt: systemPrompt || undefined,
          contextWindow: contextWindow || undefined,
        },
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export generation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Generate Export</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Job selector */}
          <div>
            <label htmlFor="job-select" className="block text-sm font-medium">
              Processing Job
            </label>
            <select
              id="job-select"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {allJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  Job #{job.id} - {formatDate(job.completedAt || job.createdAt)} ({job.recordsProcessed} records)
                </option>
              ))}
            </select>
          </div>

          {/* Format selector */}
          <div>
            <label className="block text-sm font-medium">Export Format</label>
            <div className="mt-2 space-y-2">
              {EXPORT_FORMATS.map((f) => (
                <label
                  key={f.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    format === f.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={f.value}
                    checked={format === f.value}
                    onChange={(e) => setFormat(e.target.value as typeof format)}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <f.icon className="h-4 w-4" />
                      <span className="font-medium">{f.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Options for JSONL format */}
          {format === 'jsonl' && (
            <>
              <div>
                <label htmlFor="system-prompt" className="block text-sm font-medium">
                  System Prompt (optional)
                </label>
                <textarea
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="You are a helpful customer support assistant..."
                />
              </div>

              <div>
                <label htmlFor="context-window" className="block text-sm font-medium">
                  Context Window (messages)
                </label>
                <input
                  id="context-window"
                  type="number"
                  min="0"
                  max="10"
                  value={contextWindow}
                  onChange={(e) => setContextWindow(Number(e.target.value))}
                  className="mt-1 block w-32 rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Number of previous messages to include as context (0 = none)
                </p>
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Generating...' : 'Generate Export'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { formatDate, formatDuration } from '@/lib/utils';
import type { ProcessingJob } from '@/types';

export function ProcessingTab() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: jobs, isLoading, refetch } = useQuery({
    queryKey: queryKeys.jobs.list(Number(projectId)),
    queryFn: () => api.get<{ items: ProcessingJob[] }>(`/projects/${projectId}/jobs`),
    enabled: !!projectId,
    refetchInterval: (query) => {
      // Auto-refresh if there's a running job
      const hasRunningJob = query.state.data?.items?.some(
        (job) => job.status === 'pending' || job.status === 'processing'
      );
      return hasRunningJob ? 3000 : false;
    },
  });

  const startMutation = useMutation({
    mutationFn: () => api.post<ProcessingJob>(`/projects/${projectId}/jobs`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.list(Number(projectId)) });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId: number) => api.post<ProcessingJob>(`/jobs/${jobId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.list(Number(projectId)) });
    },
  });

  const runningJob = jobs?.items?.find(
    (job) => job.status === 'pending' || job.status === 'processing'
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Processing Jobs</h2>
          <p className="text-sm text-muted-foreground">
            Run data processing to apply PII detection and filtering
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-md border p-2 hover:bg-muted"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending || !!runningJob}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {startMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {runningJob ? 'Job Running...' : 'Run Processing'}
          </button>
        </div>
      </div>

      {/* Running job progress */}
      {runningJob && (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div>
                <h3 className="font-semibold">Processing in progress</h3>
                <p className="text-sm text-muted-foreground">
                  {runningJob.recordsProcessed} of {runningJob.recordsTotal || '?'} records
                </p>
              </div>
            </div>
            <button
              onClick={() => cancelMutation.mutate(runningJob.id)}
              disabled={cancelMutation.isPending}
              className="flex items-center gap-2 rounded-md border border-destructive px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              Cancel
            </button>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{runningJob.progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${runningJob.progress}%` }}
              />
            </div>
          </div>

          {runningJob.warnings && runningJob.warnings.length > 0 && (
            <div className="mt-4 rounded-md bg-warning/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-warning">
                <AlertTriangle className="h-4 w-4" />
                {runningJob.warnings.length} warning(s)
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {runningJob.warnings.slice(0, 3).map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Job history */}
      {!jobs?.items?.length ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No jobs yet</h3>
          <p className="mt-2 text-muted-foreground">
            Click "Run Processing" to start your first job
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="font-semibold">Job History</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Started</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Duration</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Records</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Progress</th>
              </tr>
            </thead>
            <tbody>
              {jobs.items.map((job) => (
                <tr key={job.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {job.startedAt ? formatDate(job.startedAt) : formatDate(job.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {job.completedAt && job.startedAt
                      ? formatDuration(new Date(job.startedAt), new Date(job.completedAt))
                      : job.status === 'processing' || job.status === 'pending'
                      ? 'In progress...'
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {job.recordsProcessed}
                    {job.recordsTotal ? ` / ${job.recordsTotal}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full transition-all ${
                            job.status === 'completed'
                              ? 'bg-success'
                              : job.status === 'failed'
                              ? 'bg-destructive'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{job.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ProcessingJob['status'] }) {
  const config = {
    pending: { icon: Clock, color: 'bg-muted text-muted-foreground', label: 'Pending' },
    processing: { icon: Loader2, color: 'bg-primary/10 text-primary', label: 'Processing' },
    completed: { icon: CheckCircle, color: 'bg-success/10 text-success', label: 'Completed' },
    failed: { icon: XCircle, color: 'bg-destructive/10 text-destructive', label: 'Failed' },
    cancelled: { icon: Square, color: 'bg-muted text-muted-foreground', label: 'Cancelled' },
  };

  const { icon: Icon, color, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${color}`}>
      <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

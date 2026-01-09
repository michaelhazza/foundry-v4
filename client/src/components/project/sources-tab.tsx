import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  FileUp,
  Database,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { formatDate, formatFileSize } from '@/lib/utils';
import type { Source } from '@/types';

export function SourcesTab() {
  const { id: projectId } = useParams<{ id: string }>();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState<'file' | 'teamwork' | 'gohighlevel' | null>(null);
  const queryClient = useQueryClient();

  const { data: sources, isLoading } = useQuery({
    queryKey: queryKeys.sources.list(Number(projectId)),
    queryFn: () => api.get<Source[]>(`/projects/${projectId}/sources`),
    enabled: !!projectId,
  });

  const deleteMutation = useMutation({
    mutationFn: (sourceId: number) => api.delete(`/sources/${sourceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sources.list(Number(projectId)) });
    },
  });

  const testMutation = useMutation({
    mutationFn: (sourceId: number) => api.post<{ success: boolean; message: string }>(`/sources/${sourceId}/test`),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Data Sources</h2>
        <div className="relative">
          <button
            onClick={() => setShowAddDialog(!showAddDialog)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Source
          </button>

          {showAddDialog && (
            <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-md border bg-card shadow-lg">
              <button
                onClick={() => { setAddType('file'); setShowAddDialog(false); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
              >
                <FileUp className="h-4 w-4" />
                Upload File
              </button>
              <button
                onClick={() => { setAddType('teamwork'); setShowAddDialog(false); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
              >
                <Database className="h-4 w-4" />
                Connect Teamwork
              </button>
              <button
                onClick={() => { setAddType('gohighlevel'); setShowAddDialog(false); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
              >
                <Database className="h-4 w-4" />
                Connect GoHighLevel
              </button>
            </div>
          )}
        </div>
      </div>

      {sources?.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <FileUp className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No sources yet</h3>
          <p className="mt-2 text-muted-foreground">
            Add your first data source to start processing
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sources?.map((source) => (
            <div key={source.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    source.type === 'file' ? 'bg-blue-500/10 text-blue-500' :
                    source.type === 'teamwork' ? 'bg-purple-500/10 text-purple-500' :
                    'bg-green-500/10 text-green-500'
                  }`}>
                    {source.type === 'file' ? <FileUp className="h-5 w-5" /> : <Database className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold">{source.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {source.type === 'file' ? `${source.mimeType} • ${formatFileSize(source.fileSize || 0)}` :
                       source.type.charAt(0).toUpperCase() + source.type.slice(1)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                    source.status === 'connected' ? 'bg-success/10 text-success' :
                    source.status === 'error' ? 'bg-destructive/10 text-destructive' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {source.status === 'connected' && <CheckCircle className="h-3 w-3" />}
                    {source.status === 'error' && <XCircle className="h-3 w-3" />}
                    {source.status}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>Added {formatDate(source.createdAt)}</span>
                <div className="flex items-center gap-2">
                  {source.type !== 'file' && (
                    <button
                      onClick={() => testMutation.mutate(source.id)}
                      disabled={testMutation.isPending}
                      className="flex items-center gap-1 rounded px-2 py-1 hover:bg-muted"
                    >
                      {testMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Test
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this source?')) {
                        deleteMutation.mutate(source.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1 rounded px-2 py-1 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Upload Dialog */}
      {addType === 'file' && (
        <FileUploadDialog
          projectId={Number(projectId)}
          onClose={() => setAddType(null)}
          onSuccess={() => {
            setAddType(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.sources.list(Number(projectId)) });
          }}
        />
      )}

      {/* Teamwork Connection Dialog */}
      {addType === 'teamwork' && (
        <TeamworkDialog
          projectId={Number(projectId)}
          onClose={() => setAddType(null)}
          onSuccess={() => {
            setAddType(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.sources.list(Number(projectId)) });
          }}
        />
      )}

      {/* GoHighLevel Connection Dialog */}
      {addType === 'gohighlevel' && (
        <GoHighLevelDialog
          projectId={Number(projectId)}
          onClose={() => setAddType(null)}
          onSuccess={() => {
            setAddType(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.sources.list(Number(projectId)) });
          }}
        />
      )}
    </div>
  );
}

function FileUploadDialog({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!name) setName(droppedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!name) setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name || file.name);

      await api.upload(`/projects/${projectId}/sources/file`, formData);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload File</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Drag and drop or{' '}
              <label className="cursor-pointer text-primary hover:underline">
                browse
                <input type="file" className="hidden" onChange={handleFileSelect} accept=".csv,.json,.xlsx,.xls" />
              </label>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">CSV, JSON, Excel (max 50MB)</p>
            {file && (
              <p className="mt-2 text-sm font-medium">{file.name} ({formatFileSize(file.size)})</p>
            )}
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium">Source Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || isUploading}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeamworkDialog({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.post(`/projects/${projectId}/sources/teamwork`, { name, subdomain, apiKey });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Connect Teamwork</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="tw-name" className="block text-sm font-medium">Source Name</label>
            <input
              id="tw-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="My Teamwork Data"
            />
          </div>

          <div>
            <label htmlFor="subdomain" className="block text-sm font-medium">Subdomain</label>
            <div className="mt-1 flex items-center">
              <input
                id="subdomain"
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                required
                className="block w-full rounded-l-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="yourcompany"
              />
              <span className="rounded-r-md border border-l-0 bg-muted px-3 py-2 text-sm text-muted-foreground">
                .teamwork.com
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="api-key" className="block text-sm font-medium">API Key</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">Find your API key in Teamwork Settings → API & Webhooks</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GoHighLevelDialog({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [channels, setChannels] = useState<string[]>(['sms', 'email']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChannelToggle = (channel: string) => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.post(`/projects/${projectId}/sources/gohighlevel`, {
        name,
        apiKey,
        selectedChannels: channels,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Connect GoHighLevel</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="ghl-name" className="block text-sm font-medium">Source Name</label>
            <input
              id="ghl-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="My GHL Data"
            />
          </div>

          <div>
            <label htmlFor="ghl-api-key" className="block text-sm font-medium">API Key</label>
            <input
              id="ghl-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Channels</label>
            <div className="mt-2 flex gap-4">
              {['sms', 'email', 'call'].map((channel) => (
                <label key={channel} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={channels.includes(channel)}
                    onChange={() => handleChannelToggle(channel)}
                    className="rounded border-input"
                  />
                  <span className="text-sm capitalize">{channel}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || channels.length === 0}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

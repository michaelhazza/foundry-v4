import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wand2, Save, Eye, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { Source, SourceMapping } from '@/types';

const TARGET_FIELDS = [
  { value: 'content', label: 'Content (main text)' },
  { value: 'question', label: 'Question' },
  { value: 'answer', label: 'Answer' },
  { value: 'subject', label: 'Subject' },
  { value: 'sender', label: 'Sender' },
  { value: 'recipient', label: 'Recipient' },
  { value: 'timestamp', label: 'Timestamp' },
  { value: 'category', label: 'Category' },
  { value: 'status', label: 'Status' },
  { value: 'metadata', label: 'Metadata' },
  { value: 'ignore', label: '(Ignore field)' },
];

export function MappingTab() {
  const { id: projectId } = useParams<{ id: string }>();
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const queryClient = useQueryClient();

  const { data: sources } = useQuery({
    queryKey: queryKeys.sources.list(Number(projectId)),
    queryFn: () => api.get<Source[]>(`/projects/${projectId}/sources`),
    enabled: !!projectId,
  });

  const { data: mappings, isLoading: mappingsLoading } = useQuery({
    queryKey: queryKeys.mappings.list(selectedSourceId!),
    queryFn: () => api.get<SourceMapping[]>(`/sources/${selectedSourceId}/mappings`),
    enabled: !!selectedSourceId,
  });

  const { data: preview } = useQuery({
    queryKey: ['mappings-preview', selectedSourceId],
    queryFn: () => api.get<{ sample: Record<string, unknown>[] }>(`/sources/${selectedSourceId}/mappings/preview`),
    enabled: !!selectedSourceId && showPreview,
  });

  const autoDetectMutation = useMutation({
    mutationFn: () => api.post<SourceMapping[]>(`/sources/${selectedSourceId}/mappings/auto-detect`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mappings.list(selectedSourceId!) });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: { mappings: Partial<SourceMapping>[] }) =>
      api.put<SourceMapping[]>(`/sources/${selectedSourceId}/mappings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mappings.list(selectedSourceId!) });
    },
  });

  // Set first source as default
  if (sources?.length && !selectedSourceId) {
    setSelectedSourceId(sources[0].id);
  }

  if (!sources?.length) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No sources available</h3>
        <p className="mt-2 text-muted-foreground">
          Add a data source first to configure field mappings
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Source selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label htmlFor="source-select" className="text-sm font-medium">
            Source:
          </label>
          <select
            id="source-select"
            value={selectedSourceId || ''}
            onChange={(e) => setSelectedSourceId(Number(e.target.value))}
            className="rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => autoDetectMutation.mutate()}
            disabled={autoDetectMutation.isPending || !selectedSourceId}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {autoDetectMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Auto-detect
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted ${
              showPreview ? 'bg-muted' : ''
            }`}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
        </div>
      </div>

      {/* Mappings table */}
      {mappingsLoading ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      ) : (
        <MappingTable
          mappings={mappings || []}
          onSave={(updatedMappings) => saveMutation.mutate({ mappings: updatedMappings })}
          isSaving={saveMutation.isPending}
        />
      )}

      {/* Preview panel */}
      {showPreview && preview && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="font-semibold">Data Preview</h3>
            <p className="text-sm text-muted-foreground">Sample data with mappings applied</p>
          </div>
          <div className="max-h-64 overflow-auto p-4">
            <pre className="text-sm">
              {JSON.stringify(preview.sample?.slice(0, 3), null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function MappingTable({
  mappings,
  onSave,
  isSaving,
}: {
  mappings: SourceMapping[];
  onSave: (mappings: Partial<SourceMapping>[]) => void;
  isSaving: boolean;
}) {
  const [localMappings, setLocalMappings] = useState(mappings);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset local state when mappings prop changes
  if (mappings !== localMappings && !hasChanges) {
    setLocalMappings(mappings);
  }

  const updateMapping = (index: number, field: keyof SourceMapping, value: unknown) => {
    const updated = [...localMappings];
    updated[index] = { ...updated[index], [field]: value };
    setLocalMappings(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(
      localMappings.map((m) => ({
        id: m.id,
        sourceField: m.sourceField,
        targetField: m.targetField,
        isPii: m.isPii,
      }))
    );
    setHasChanges(false);
  };

  if (!localMappings.length) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No fields detected. Click "Auto-detect" to analyze the source.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-sm font-medium">Source Field</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Target Field</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Confidence</th>
            <th className="px-4 py-3 text-center text-sm font-medium">Contains PII</th>
          </tr>
        </thead>
        <tbody>
          {localMappings.map((mapping, index) => (
            <tr key={mapping.id || index} className="border-b last:border-0">
              <td className="px-4 py-3">
                <code className="rounded bg-muted px-2 py-1 text-sm">{mapping.sourceField}</code>
              </td>
              <td className="px-4 py-3">
                <select
                  value={mapping.targetField}
                  onChange={(e) => updateMapping(index, 'targetField', e.target.value)}
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TARGET_FIELDS.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    mapping.confidence === 'high'
                      ? 'bg-success/10 text-success'
                      : mapping.confidence === 'medium'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {mapping.confidence}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={mapping.isPii}
                  onChange={(e) => updateMapping(index, 'isPii', e.target.checked)}
                  className="rounded border-input"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {hasChanges && (
        <div className="flex justify-end border-t px-4 py-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? 'Saving...' : 'Save Mappings'}
          </button>
        </div>
      )}
    </div>
  );
}

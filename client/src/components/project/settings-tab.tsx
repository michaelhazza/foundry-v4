import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Archive, RotateCcw, Trash2, Loader2, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { Project } from '@/types';

export function SettingsTab() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: queryKeys.projects.detail(Number(projectId)),
    queryFn: () => api.get<Project>(`/projects/${projectId}`),
    enabled: !!projectId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Project>) => api.patch<Project>(`/projects/${projectId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(Number(projectId)) });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(Number(projectId)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(Number(projectId)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });

  if (!project) return null;

  return (
    <div className="space-y-8">
      {/* General Settings */}
      <GeneralSettings
        project={project}
        onSave={(data) => updateMutation.mutate(data)}
        isSaving={updateMutation.isPending}
      />

      {/* PII Settings */}
      <PiiSettings
        project={project}
        onSave={(data) => updateMutation.mutate({ piiSettings: data })}
        isSaving={updateMutation.isPending}
      />

      {/* Filter Settings */}
      <FilterSettings
        project={project}
        onSave={(data) => updateMutation.mutate({ filterSettings: data })}
        isSaving={updateMutation.isPending}
      />

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/50 bg-card">
        <div className="border-b border-destructive/50 px-6 py-4">
          <h3 className="font-semibold text-destructive">Danger Zone</h3>
        </div>
        <div className="space-y-4 p-6">
          {project.archivedAt ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Restore Project</p>
                <p className="text-sm text-muted-foreground">
                  Make this project active again
                </p>
              </div>
              <button
                onClick={() => restoreMutation.mutate()}
                disabled={restoreMutation.isPending}
                className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {restoreMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Restore
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Archive Project</p>
                <p className="text-sm text-muted-foreground">
                  Archive this project. You can restore it later.
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to archive this project?')) {
                    archiveMutation.mutate();
                  }
                }}
                disabled={archiveMutation.isPending}
                className="flex items-center gap-2 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {archiveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                Archive
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GeneralSettings({
  project,
  onSave,
  isSaving,
}: {
  project: Project;
  onSave: (data: Partial<Project>) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (field: 'name' | 'description', value: string) => {
    if (field === 'name') setName(value);
    else setDescription(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave({ name, description: description || undefined });
    setHasChanges(false);
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-6 py-4">
        <h3 className="font-semibold">General Settings</h3>
      </div>
      <div className="space-y-4 p-6">
        <div>
          <label htmlFor="project-name" className="block text-sm font-medium">
            Project Name
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="project-desc" className="block text-sm font-medium">
            Description
          </label>
          <textarea
            id="project-desc"
            value={description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {hasChanges && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving || !name}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PiiSettings({
  project,
  onSave,
  isSaving,
}: {
  project: Project;
  onSave: (data: Project['piiSettings']) => void;
  isSaving: boolean;
}) {
  const [allowList, setAllowList] = useState<string[]>(project.piiSettings?.allowList || []);
  const [newDomain, setNewDomain] = useState('');
  const [customPatterns, setCustomPatterns] = useState(project.piiSettings?.customPatterns || []);
  const [hasChanges, setHasChanges] = useState(false);

  const addDomain = () => {
    if (newDomain && !allowList.includes(newDomain)) {
      setAllowList([...allowList, newDomain]);
      setNewDomain('');
      setHasChanges(true);
    }
  };

  const removeDomain = (domain: string) => {
    setAllowList(allowList.filter((d) => d !== domain));
    setHasChanges(true);
  };

  const addPattern = () => {
    setCustomPatterns([...customPatterns, { name: '', pattern: '' }]);
    setHasChanges(true);
  };

  const updatePattern = (index: number, field: 'name' | 'pattern', value: string) => {
    const updated = [...customPatterns];
    updated[index] = { ...updated[index], [field]: value };
    setCustomPatterns(updated);
    setHasChanges(true);
  };

  const removePattern = (index: number) => {
    setCustomPatterns(customPatterns.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave({
      allowList,
      customPatterns: customPatterns.filter((p) => p.name && p.pattern),
    });
    setHasChanges(false);
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-6 py-4">
        <h3 className="font-semibold">PII Detection Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure how personally identifiable information is detected and handled
        </p>
      </div>
      <div className="space-y-6 p-6">
        {/* Allow list */}
        <div>
          <label className="block text-sm font-medium">Email Domain Allow List</label>
          <p className="text-sm text-muted-foreground">
            Email addresses from these domains will not be redacted
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="block flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => e.key === 'Enter' && addDomain()}
            />
            <button
              onClick={addDomain}
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {allowList.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {allowList.map((domain) => (
                <span
                  key={domain}
                  className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                >
                  {domain}
                  <button onClick={() => removeDomain(domain)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Custom patterns */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium">Custom PII Patterns</label>
              <p className="text-sm text-muted-foreground">
                Add custom regex patterns to detect specific PII
              </p>
            </div>
            <button
              onClick={addPattern}
              className="flex items-center gap-1 rounded-md border px-3 py-1 text-sm hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Add Pattern
            </button>
          </div>
          {customPatterns.length > 0 && (
            <div className="mt-3 space-y-2">
              {customPatterns.map((pattern, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pattern.name}
                    onChange={(e) => updatePattern(index, 'name', e.target.value)}
                    placeholder="Pattern name"
                    className="block w-40 rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    value={pattern.pattern}
                    onChange={(e) => updatePattern(index, 'pattern', e.target.value)}
                    placeholder="Regex pattern"
                    className="block flex-1 rounded-md border bg-background px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => removePattern(index)}
                    className="rounded p-2 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {hasChanges && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSettings({
  project,
  onSave,
  isSaving,
}: {
  project: Project;
  onSave: (data: Project['filterSettings']) => void;
  isSaving: boolean;
}) {
  const [minLength, setMinLength] = useState(project.filterSettings?.minLength || 0);
  const [dateStart, setDateStart] = useState(project.filterSettings?.dateRange?.start || '');
  const [dateEnd, setDateEnd] = useState(project.filterSettings?.dateRange?.end || '');
  const [statuses, setStatuses] = useState<string[]>(project.filterSettings?.statuses || []);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = () => setHasChanges(true);

  const toggleStatus = (status: string) => {
    setStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
    handleChange();
  };

  const handleSave = () => {
    onSave({
      minLength: minLength || undefined,
      dateRange: dateStart || dateEnd ? { start: dateStart || undefined, end: dateEnd || undefined } : undefined,
      statuses: statuses.length > 0 ? statuses : undefined,
    });
    setHasChanges(false);
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-6 py-4">
        <h3 className="font-semibold">Filter Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure which records to include during processing
        </p>
      </div>
      <div className="space-y-4 p-6">
        <div>
          <label htmlFor="min-length" className="block text-sm font-medium">
            Minimum Content Length
          </label>
          <p className="text-sm text-muted-foreground">
            Skip records with content shorter than this
          </p>
          <input
            id="min-length"
            type="number"
            min="0"
            value={minLength}
            onChange={(e) => { setMinLength(Number(e.target.value)); handleChange(); }}
            className="mt-1 block w-32 rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="date-start" className="block text-sm font-medium">
              Date Range Start
            </label>
            <input
              id="date-start"
              type="date"
              value={dateStart}
              onChange={(e) => { setDateStart(e.target.value); handleChange(); }}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="date-end" className="block text-sm font-medium">
              Date Range End
            </label>
            <input
              id="date-end"
              type="date"
              value={dateEnd}
              onChange={(e) => { setDateEnd(e.target.value); handleChange(); }}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Status Filter</label>
          <p className="text-sm text-muted-foreground">Only include records with these statuses</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {['open', 'closed', 'pending', 'resolved'].map((status) => (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  statuses.includes(status)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {hasChanges && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

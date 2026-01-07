import { useQuery } from '@tanstack/react-query';
import { useParams, Link, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, FileUp, GitBranch, Cog, Download, Settings } from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

// Tab components (simplified for now)
function SourcesTab() {
  return <div className="rounded-lg border bg-card p-6">Sources management coming soon...</div>;
}

function MappingTab() {
  return <div className="rounded-lg border bg-card p-6">Field mapping coming soon...</div>;
}

function ProcessingTab() {
  return <div className="rounded-lg border bg-card p-6">Processing pipeline coming soon...</div>;
}

function ExportsTab() {
  return <div className="rounded-lg border bg-card p-6">Exports management coming soon...</div>;
}

function SettingsTab() {
  return <div className="rounded-lg border bg-card p-6">Project settings coming soon...</div>;
}

const tabs = [
  { id: 'sources', label: 'Sources', icon: FileUp },
  { id: 'mapping', label: 'Mapping', icon: GitBranch },
  { id: 'processing', label: 'Processing', icon: Cog },
  { id: 'exports', label: 'Exports', icon: Download },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const { data: project, isLoading } = useQuery({
    queryKey: queryKeys.projects.detail(Number(id)),
    queryFn: () => api.get<Project>(`/projects/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-12 w-full animate-pulse rounded bg-muted" />
        <div className="h-64 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <h3 className="text-lg font-medium">Project not found</h3>
        <Link to="/projects" className="mt-2 inline-block text-primary hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  const currentTab = location.pathname.split('/').pop() || 'sources';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/projects"
          className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-muted-foreground">{project.description}</p>
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              project.status === 'completed'
                ? 'bg-success/10 text-success'
                : project.status === 'processing'
                ? 'bg-warning/10 text-warning'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {project.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <Link
                key={tab.id}
                to={`/projects/${id}/${tab.id}`}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <Routes>
        <Route path="sources" element={<SourcesTab />} />
        <Route path="mapping" element={<MappingTab />} />
        <Route path="processing" element={<ProcessingTab />} />
        <Route path="exports" element={<ExportsTab />} />
        <Route path="settings" element={<SettingsTab />} />
        <Route path="" element={<Navigate to="sources" replace />} />
      </Routes>
    </div>
  );
}

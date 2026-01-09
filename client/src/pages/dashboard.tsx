import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FolderKanban, FileUp, Cog, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { queryKeys } from '@/lib/query-keys';
import type { Project, PaginatedResponse } from '@/types';

export function DashboardPage() {
  const { user } = useAuth();

  const { data: projectsData, isLoading } = useQuery({
    queryKey: queryKeys.projects.list({ limit: 5 }),
    queryFn: () => api.get<PaginatedResponse<Project>>('/projects?limit=5'),
  });

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.name}</h1>
        <p className="text-muted-foreground">
          Here's an overview of your AI training data projects
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Projects</p>
              <p className="text-2xl font-bold">
                {projectsData?.pagination.total || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <FileUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data Sources</p>
              <p className="text-2xl font-bold">
                {projectsData?.items.reduce((acc, p) => acc + (p.sourceCount || 0), 0) || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Cog className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Processing</p>
              <p className="text-2xl font-bold">
                {projectsData?.items.filter((p) => p.status === 'processing').length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent projects */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Recent Projects</h2>
          <Link
            to="/projects"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-4">
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          </div>
        ) : projectsData?.items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No projects yet</p>
            <Link
              to="/projects"
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {projectsData?.items.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {project.sourceCount || 0} sources
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      project.status === 'completed'
                        ? 'bg-success/10 text-success'
                        : project.status === 'processing'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {project.status}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/projects"
          className="flex items-center gap-4 rounded-lg border bg-card p-6 hover:bg-muted/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Create New Project</p>
            <p className="text-sm text-muted-foreground">
              Start processing training data
            </p>
          </div>
        </Link>

        <Link
          to="/team"
          className="flex items-center gap-4 rounded-lg border bg-card p-6 hover:bg-muted/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <FileUp className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Invite Team Members</p>
            <p className="text-sm text-muted-foreground">
              Collaborate with your team
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

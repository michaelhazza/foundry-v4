import { useQuery } from '@tanstack/react-query';
import { Activity, Database, Mail, Lock, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface SystemHealth {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  database: {
    connected: boolean;
  };
  metrics: {
    organizations: number;
    users: number;
    projects: number;
  };
  features: {
    email: boolean;
    encryption: boolean;
  };
}

export function AdminHealthPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.admin.health,
    queryFn: () => api.get<SystemHealth>('/admin/health'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-muted-foreground">
            Monitor platform status and metrics
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <>
          {/* Overall status */}
          <div
            className={`rounded-lg border p-6 ${
              data?.status === 'healthy'
                ? 'border-success/50 bg-success/5'
                : 'border-destructive/50 bg-destructive/5'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  data?.status === 'healthy'
                    ? 'bg-success/20 text-success'
                    : 'bg-destructive/20 text-destructive'
                }`}
              >
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-semibold capitalize">{data?.status}</p>
                <p className="text-sm text-muted-foreground">
                  Last checked: {new Date(data?.timestamp || '').toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    data?.database.connected
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Database</p>
                  <p className="font-semibold">
                    {data?.database.connected ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    data?.features.email
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                  }`}
                >
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email Service</p>
                  <p className="font-semibold">
                    {data?.features.email ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    data?.features.encryption
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                  }`}
                >
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Encryption</p>
                  <p className="font-semibold">
                    {data?.features.encryption ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="rounded-lg border bg-card">
            <div className="border-b p-4">
              <h2 className="font-semibold">Platform Metrics</h2>
            </div>
            <div className="grid divide-x md:grid-cols-3">
              <div className="p-6 text-center">
                <p className="text-3xl font-bold">{data?.metrics.organizations || 0}</p>
                <p className="text-sm text-muted-foreground">Organizations</p>
              </div>
              <div className="p-6 text-center">
                <p className="text-3xl font-bold">{data?.metrics.users || 0}</p>
                <p className="text-sm text-muted-foreground">Users</p>
              </div>
              <div className="p-6 text-center">
                <p className="text-3xl font-bold">{data?.metrics.projects || 0}</p>
                <p className="text-sm text-muted-foreground">Projects</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

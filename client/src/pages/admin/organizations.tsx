import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Ban, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { formatDate } from '@/lib/utils';
import type { Organization, PaginatedResponse } from '@/types';

export function AdminOrganizationsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.organizations.list(),
    queryFn: () =>
      api.get<PaginatedResponse<Organization>>('/admin/organizations'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; adminEmail: string }) =>
      api.post('/admin/organizations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.organizations.all });
      setShowCreateDialog(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enable }: { id: number; enable: boolean }) =>
      api.post(`/admin/organizations/${id}/${enable ? 'enable' : 'disable'}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.organizations.all });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Manage platform organizations
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Organization
        </button>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Organization</th>
                  <th className="px-4 py-3 text-left font-medium">Members</th>
                  <th className="px-4 py-3 text-left font-medium">Projects</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.items.map((org) => (
                  <tr key={org.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{org.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{org.memberCount || 0}</td>
                    <td className="px-4 py-3">{org.projectCount || 0}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(org.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          org.disabledAt
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-success/10 text-success'
                        }`}
                      >
                        {org.disabledAt ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          toggleMutation.mutate({
                            id: org.id,
                            enable: !!org.disabledAt,
                          })
                        }
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                          org.disabledAt
                            ? 'bg-success/10 text-success hover:bg-success/20'
                            : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                        }`}
                      >
                        {org.disabledAt ? (
                          <>
                            <Check className="h-3 w-3" /> Enable
                          </>
                        ) : (
                          <>
                            <Ban className="h-3 w-3" /> Disable
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create dialog */}
      {showCreateDialog && (
        <CreateOrgDialog
          onClose={() => setShowCreateDialog(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateOrgDialog({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (data: { name: string; adminEmail: string }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, adminEmail });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Create Organization</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new organization and invite the first admin
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Organization Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Acme Inc"
            />
          </div>

          <div>
            <label htmlFor="adminEmail" className="block text-sm font-medium">
              Admin Email
            </label>
            <input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="admin@acme.com"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This user will receive an invitation to set up their account
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name || !adminEmail}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

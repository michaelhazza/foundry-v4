import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Mail, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/context/auth-context';
import { formatDate } from '@/lib/utils';
import type { TeamMember, Invitation } from '@/types';

export function TeamPage() {
  const { user } = useAuth();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: queryKeys.team.all,
    queryFn: () => api.get<TeamMember[]>('/team'),
  });

  const { data: invitations, isLoading: loadingInvitations } = useQuery({
    queryKey: queryKeys.team.invitations,
    queryFn: () => api.get<Invitation[]>('/invitations'),
    enabled: user?.role === 'admin',
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: 'admin' | 'member' }) =>
      api.post('/invitations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.invitations });
      setShowInviteDialog(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => api.delete(`/team/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/invitations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.invitations });
    },
  });

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">
            Manage your organization's team members
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInviteDialog(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Team members */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Members</h2>
        </div>

        {loadingMembers ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {members?.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium capitalize">
                    {member.role}
                  </span>
                  {isAdmin && member.id !== user?.id && (
                    <button
                      onClick={() => removeMutation.mutate(member.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invitations */}
      {isAdmin && (
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">Pending Invitations</h2>
          </div>

          {loadingInvitations ? (
            <div className="p-4 space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : invitations?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No pending invitations
            </div>
          ) : (
            <div className="divide-y">
              {invitations?.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Expires {formatDate(invitation.expiresAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium capitalize">
                      {invitation.role}
                    </span>
                    <button
                      onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite dialog */}
      {showInviteDialog && (
        <InviteDialog
          onClose={() => setShowInviteDialog(false)}
          onSubmit={(data) => inviteMutation.mutate(data)}
          isLoading={inviteMutation.isPending}
        />
      )}
    </div>
  );
}

function InviteDialog({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (data: { email: string; role: 'admin' | 'member' }) => void;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, role });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Invite Team Member</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send an invitation to join your organization
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="colleague@example.com"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
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
              disabled={isLoading || !email}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

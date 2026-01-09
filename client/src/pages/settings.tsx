import { useAuth } from '@/context/auth-context';

export function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile section */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Profile</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <p className="mt-1 text-muted-foreground">{user?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <p className="mt-1 text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Organization</label>
              <p className="mt-1 text-muted-foreground">{user?.organizationName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Role</label>
              <p className="mt-1 text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Password section */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Change your password to keep your account secure
          </p>
          <button className="mt-4 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
            Change Password
          </button>
        </div>

        {/* Danger zone */}
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
          <h2 className="font-semibold text-destructive">Danger Zone</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These actions are irreversible. Please be careful.
          </p>
          <button className="mt-4 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

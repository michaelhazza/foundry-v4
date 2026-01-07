import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  FileText,
  Settings,
  Building2,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  platformAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Team', href: '/team', icon: Users },
  { label: 'Audit Log', href: '/audit-log', icon: FileText, adminOnly: true },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const adminNavItems: NavItem[] = [
  { label: 'Organizations', href: '/admin/organizations', icon: Building2, platformAdminOnly: true },
  { label: 'System Health', href: '/admin/health', icon: Activity, platformAdminOnly: true },
];

export function SidebarNav() {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (item.platformAdminOnly && !user?.isPlatformAdmin) return false;
    return true;
  });

  const filteredAdminItems = adminNavItems.filter((item) => {
    if (item.platformAdminOnly && !user?.isPlatformAdmin) return false;
    return true;
  });

  return (
    <aside className="flex w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-6">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            F
          </div>
          <span className="text-lg">Foundry</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {filteredAdminItems.length > 0 && (
          <>
            <div className="my-4 border-t" />
            <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
              Platform Admin
            </p>
            {filteredAdminItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          {user?.organizationName}
        </div>
      </div>
    </aside>
  );
}

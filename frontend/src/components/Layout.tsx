import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { LogOut, Shield, User, Activity, LayoutDashboard, Settings, Users, Cpu, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, role } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const getRoleIcon = (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return <Shield className="w-3.5 h-3.5" />;
      case 'analyst':
        return <Activity className="w-3.5 h-3.5" />;
      default:
        return <User className="w-3.5 h-3.5" />;
    }
  };

  const getRoleBadgeColor = (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'analyst':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(role === 'admin'
      ? [
          { to: '/admin', label: 'Admin', icon: Settings },
          { to: '/admin/users', label: 'Users', icon: Users },
          { to: '/admin/models', label: 'Models', icon: Cpu },
        ]
      : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-full w-60 flex flex-col
          bg-card border-r border-border
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold text-foreground tracking-tight">PrimalGuard</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setSidebarOpen(false)}>
              <div
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                  transition-colors duration-100
                  ${
                    isActive(to)
                      ? 'border-l-[3px] border-primary bg-primary/10 text-primary pl-[9px]'
                      : 'border-l-[3px] border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground pl-[9px]'
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </div>
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-4 py-4 border-t border-border space-y-3 flex-shrink-0">
          {user && (
            <div className="space-y-1.5">
              <div
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${getRoleBadgeColor(role || '')}`}
              >
                {getRoleIcon(role || '')}
                <span className="capitalize">{role}</span>
              </div>
              <p className="text-sm font-medium text-foreground truncate px-0.5">
                {user.username}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <DarkModeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-10 flex items-center h-14 px-4 border-b border-border bg-card md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">PrimalGuard</span>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-60 min-h-screen pt-14 md:pt-0">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
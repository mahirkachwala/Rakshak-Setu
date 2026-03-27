import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { 
  LayoutDashboard, 
  CalendarCheck, 
  Users, 
  CalendarClock, 
  Building2, 
  Syringe, 
  LogOut,
  Bell,
  Menu,
  X,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Appointments", href: "/appointments", icon: CalendarCheck },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Slots", href: "/slots", icon: CalendarClock },
  { name: "Vaccinations", href: "/vaccinations", icon: Syringe },
];

const adminItems = [
  { name: "Centers", href: "/centers", icon: Building2 },
];

function SSLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "w-8 h-8 text-sm" : size === "lg" ? "w-14 h-14 text-xl" : "w-10 h-10 text-base";
  return (
    <div className={clsx(
      "ss-gradient rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg shadow-primary/30",
      dims
    )}>
      SS
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const isCurrentPath = (path: string) => {
    if (path === "/" && location !== "/") return false;
    return location.startsWith(path);
  };

  const NavLinks = () => (
    <>
      <div className="space-y-0.5 py-4">
        <p className="px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Main Menu</p>
        {navItems.map((item) => {
          const active = isCurrentPath(item.href);
          return (
            <Link key={item.name} href={item.href} className="block px-3">
              <span className={clsx(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "ss-gradient text-white shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}>
                <item.icon className={clsx("w-4.5 h-4.5", active ? "text-white" : "text-muted-foreground")} style={{ width: "1.125rem", height: "1.125rem" }} />
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>

      {user?.role === 'admin' && (
        <div className="space-y-0.5 py-4 border-t border-border/50">
          <p className="px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Administration</p>
          {adminItems.map((item) => {
            const active = isCurrentPath(item.href);
            return (
              <Link key={item.name} href={item.href} className="block px-3">
                <span className={clsx(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  active
                    ? "ss-gradient text-white shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}>
                  <item.icon className={clsx("w-4 h-4", active ? "text-white" : "text-muted-foreground")} />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border z-20">
        <div className="flex items-center gap-2.5">
          <SSLogo size="sm" />
          <span className="font-display font-bold text-lg ss-gradient-text">Raksha Setu</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed inset-0 top-[65px] bg-card z-10 md:hidden overflow-y-auto"
          >
            <div className="p-4" onClick={() => setIsMobileMenuOpen(false)}>
              <NavLinks />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-card border-r border-border/50 shadow-[4px_0_24px_rgba(79,70,229,0.04)] z-10">
        {/* Logo */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-border/50">
          <SSLogo size="md" />
          <div>
            <span className="font-display font-bold text-lg text-foreground block leading-none">Raksha Setu</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Admin Portal</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2">
          <NavLinks />
        </div>

        {/* User info + logout */}
        <div className="p-4 border-t border-border/50 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl ss-gradient text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm shadow-primary/25">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-none">{user?.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user?.role} · {user?.centerName || 'All Centers'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/8 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-65px)] md:h-screen">
        {/* Topbar */}
        <header className="hidden md:flex h-20 bg-card/80 backdrop-blur-md border-b border-border/50 items-center justify-between px-8 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">
              {navItems.find(i => isCurrentPath(i.href))?.name || adminItems.find(i => isCurrentPath(i.href))?.name || "Portal"}
            </h2>
            <p className="text-sm text-muted-foreground">Welcome back, {user?.name}</p>
          </div>
          
          <div className="flex items-center gap-5">
            {/* NIS Badge */}
            <div className="hidden lg:flex items-center gap-1.5 bg-accent text-accent-foreground px-3 py-1.5 rounded-full text-xs font-semibold border border-primary/15">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>NIS Compliant</span>
            </div>

            <button className="relative p-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-accent">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-card"></span>
            </button>

            <div className="flex items-center gap-3 pl-5 border-l border-border/50">
              <div className="w-10 h-10 rounded-xl ss-gradient text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-primary/25">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-none">{user?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

import React from 'react';
import { 
  BarChart4, Layers, PlayCircle, Library, Settings as SettingsIcon, ShieldAlert, Cpu
} from 'lucide-react';

interface SidebarNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export function SidebarNav({ currentRoute, onNavigate }: SidebarNavProps) {
  const getCleanBaseRoute = (route: string) => {
    if (route === '/' || route === '') return '/';
    const split = route.split('/');
    return '/' + split[1];
  };

  const navItems = [
    { name: 'Dashboard', icon: BarChart4, path: '/' },
    { name: 'Eval Suites', icon: Layers, path: '/suites' },
    { name: 'Eval Runs', icon: PlayCircle, path: '/runs' },
    { name: 'Evidence Sources', icon: Library, path: '/sources' },
    { name: 'Demo Controllers', icon: SettingsIcon, path: '/settings' },
  ];

  const baseRoute = getCleanBaseRoute(currentRoute);

  return (
    <aside className="w-64 border-r border-white/10 bg-zinc-950/50 flex flex-col shrink-0">
      {/* Brand Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#bef264] rounded-sm flex items-center justify-center">
            <div className="w-3 h-3 border-2 border-black" />
          </div>
          <span className="font-bold tracking-tight text-lg uppercase font-sans text-zinc-100">EvalBench</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = baseRoute === item.path;
          return (
            <button
              key={item.path}
              id={`nav-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => onNavigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs tracking-wide transition-colors text-left cursor-pointer ${
                isActive
                  ? 'bg-white/5 text-white font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#bef264]' : 'text-zinc-500'}`} />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* Workspace Footer status */}
      <div className="p-4 border-t border-white/5">
        <div className="bg-[#bef264]/5 border border-[#bef264]/20 rounded p-3">
          <div className="text-[10px] uppercase tracking-wider text-[#bef264] font-bold mb-1">Workspace State</div>
          <div className="text-xs text-white truncate font-mono flex items-center justify-between">
            <span>STANDALONE</span>
            <span className="w-1.5 h-1.5 bg-[#bef264] rounded-full animate-pulse shadow-[0_0_8px_#bef264]" />
          </div>
          <div className="text-[9px] font-mono text-zinc-400 mt-2 truncate">
            React 19 · Vite 6 · Express
          </div>
        </div>
      </div>
    </aside>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export function AppShell({ children, currentRoute, onNavigate }: AppShellProps) {
  // Get active breadcrumb segment style
  const getRouteTitle = () => {
    if (currentRoute === '/' || currentRoute === '') return 'Dashboard';
    const segment = currentRoute.split('/')[1];
    if (segment === 'suites') return 'Eval Suites';
    if (segment === 'runs') return 'Recent Runs';
    if (segment === 'sources') return 'Evidence Sources';
    if (segment === 'settings') return 'Demo Controllers';
    return segment.toUpperCase();
  };

  return (
    <div className="min-h-screen flex bg-[#09090b] text-zinc-100 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#bef264]/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none z-0" />

      {/* Sidebar Nav */}
      <SidebarNav currentRoute={currentRoute} onNavigate={onNavigate} />

      {/* Main workspace arena */}
      <main className="flex-1 flex flex-col min-w-0 z-10 relative">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 z-10 bg-zinc-950/20 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono uppercase tracking-widest">
              <span>SUITES</span>
              <span>/</span>
              <span className="text-zinc-100">{getRouteTitle()}</span>
            </div>
            <span className="bg-zinc-800 text-[10px] px-2 py-0.5 rounded border border-white/10 font-mono text-zinc-300">v1.0.0</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate('/runs')}
              className="px-3 py-1.5 bg-[#bef264] text-black text-xs font-bold rounded uppercase tracking-wide hover:brightness-110 transition-all cursor-pointer font-sans"
            >
              New Run
            </button>
            <div className="w-8 h-8 rounded-full border border-white/20 bg-gradient-to-br from-zinc-700 to-zinc-900" />
          </div>
        </header>

        {/* Dynamic page container */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

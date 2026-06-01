import { useEffect, useState } from 'react';
import { AppShell } from './components/Layout';
import Dashboard from './components/Dashboard';
import SuitesList from './components/SuitesList';
import SuiteNew from './components/SuiteNew';
import SuiteDetail from './components/SuiteDetail';
import CaseNew from './components/CaseNew';
import CaseDetail from './components/CaseDetail';
import RunsList from './components/RunsList';
import RunDetail from './components/RunDetail';
import SourcesList from './components/SourcesList';
import Settings from './components/Settings';

export default function App() {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Simple navigate helper that updates the hash
  const handleNavigate = (path: string) => {
    window.location.hash = `#${path}`;
  };

  // Convert raw hash string into clean route segments
  const parseRoute = () => {
    const cleanedHash = currentHash.replace(/^#/, ''); // Remove leading '#'
    const path = cleanedHash || '/';

    // Route: /
    if (path === '/') {
      return { page: 'dashboard' };
    }
    // Route: /suites/new
    if (path === '/suites/new') {
      return { page: 'suite-new' };
    }
    // Route: /suites
    if (path === '/suites') {
      return { page: 'suites-list' };
    }
    // Route: /suites/[id]/cases/new
    if (path.startsWith('/suites/') && path.endsWith('/cases/new')) {
      const suiteId = path.substring(8, path.length - 10);
      return { page: 'case-new', suiteId };
    }
    // Route: /suites/[id]
    if (path.startsWith('/suites/')) {
      const suiteId = path.substring(8);
      return { page: 'suite-detail', suiteId };
    }
    // Route: /cases/[id]
    if (path.startsWith('/cases/')) {
      const caseId = path.substring(7);
      return { page: 'case-detail', caseId };
    }
    // Route: /runs
    if (path === '/runs') {
      return { page: 'runs-list' };
    }
    // Route: /runs/[id]
    if (path.startsWith('/runs/')) {
      const runId = path.substring(6);
      return { page: 'run-detail', runId };
    }
    // Route: /sources
    if (path === '/sources') {
      return { page: 'sources-list' };
    }
    // Route: /settings
    if (path === '/settings') {
      return { page: 'settings' };
    }

    // Fallback default page
    return { page: 'dashboard' };
  };

  const routeData = parseRoute();
  
  // Convert full path for UI navigation highlight checks
  const getCleanPath = () => {
    const cleaned = currentHash.replace(/^#/, '');
    return cleaned || '/';
  };

  const renderActivePage = () => {
    switch (routeData.page) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'suites-list':
        return <SuitesList onNavigate={handleNavigate} />;
      case 'suite-new':
        return <SuiteNew onNavigate={handleNavigate} />;
      case 'suite-detail':
        return <SuiteDetail suiteId={routeData.suiteId || ''} onNavigate={handleNavigate} />;
      case 'case-new':
        return <CaseNew suiteId={routeData.suiteId || ''} onNavigate={handleNavigate} />;
      case 'case-detail':
        return <CaseDetail caseId={routeData.caseId || ''} onNavigate={handleNavigate} />;
      case 'runs-list':
        return <RunsList onNavigate={handleNavigate} />;
      case 'run-detail':
        return <RunDetail runId={routeData.runId || ''} onNavigate={handleNavigate} />;
      case 'sources-list':
        return <SourcesList onNavigate={handleNavigate} />;
      case 'settings':
        return <Settings onNavigate={handleNavigate} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppShell currentRoute={getCleanPath()} onNavigate={handleNavigate}>
      {renderActivePage()}
    </AppShell>
  );
}

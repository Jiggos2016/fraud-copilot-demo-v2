import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import RiskQueue from '@/components/fraud/RiskQueue';
import PolicySearch from '@/components/fraud/PolicySearch';
import AdminView from '@/components/fraud/AdminView';
import CaseDetail from '@/components/fraud/CaseDetail';
import { Shell } from '@/components/fraud/shared';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Shell><RiskQueue /></Shell>,
});

const policyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/policy',
  validateSearch: (search: Record<string, unknown>) => ({
    search: typeof search.search === 'string' ? search.search : undefined,
  }),
  component: PolicyPage,
});

function PolicyPage() {
  const { search } = policyRoute.useSearch();
  return <Shell><PolicySearch initialSearch={search ?? ''} /></Shell>;
}

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: () => <Shell><AdminView /></Shell>,
});

const caseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/case/$claimId',
  component: CasePage,
});

function CasePage() {
  const { claimId } = caseRoute.useParams();
  return <Shell><CaseDetail key={claimId} claimId={claimId} /></Shell>;
}

const routeTree = rootRoute.addChildren([indexRoute, policyRoute, adminRoute, caseRoute]);

export const router = createRouter({
  routeTree,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

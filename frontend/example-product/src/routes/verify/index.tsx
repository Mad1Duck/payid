import { createRoute } from '@tanstack/react-router'

import type { RootRoute } from '@tanstack/react-router'
import Page from '@/pages/verify/v2'

function Index() {
  return (
    <div className="h-screen w-full">
      <Page />
    </div>
  )
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: '/verify',
    component: Index,
    getParentRoute: () => parentRoute,
  })

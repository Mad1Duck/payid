import { createRoute } from '@tanstack/react-router'

import type { RootRoute } from '@tanstack/react-router'
import Page from '@/pages/rule-console/v1'

function Index() {
  return (
    <div className="h-screen w-full">
      <Page />
    </div>
  )
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: '/old',
    component: Index,
    getParentRoute: () => parentRoute,
  })

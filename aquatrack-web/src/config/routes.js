// Single source of truth for every URL. Never hardcode a path string in a page.
export const ROUTES = {
  gateway: '/',
  unauthorized: '/unauthorized',

  admin: {
    root: '/admin',
    login: '/admin/login',
    dashboard: '/admin/dashboard',
    readings: '/admin/readings',
    readingReview: (id = ':readingId') => `/admin/readings/${id}`,
    households: '/admin/households',
    householdNew: '/admin/households/new',
    householdEdit: (id = ':householdId') => `/admin/households/${id}/edit`,
    billing: '/admin/billing',
    billDetail: (id = ':billId') => `/admin/billing/${id}`,
    reports: '/admin/reports',
    users: '/admin/users',
    settings: '/admin/settings',
  },

  agent: {
    root: '/agent',
    login: '/agent/login',
    home: '/agent/households',
    capture: (id = ':householdId') => `/agent/capture/${id}`,
    queue: '/agent/queue',
    profile: '/agent/profile',
  },
};
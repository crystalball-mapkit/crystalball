import Vue from 'vue';
import VueRouter from 'vue-router';
import Petropolis from '../views/Petropolis.vue';
Vue.use(VueRouter);
import { validateToken } from '../utils/Helpers';

const routes = [
  {
    path: '/',
    name: 'map',
    redirect: '/urban_ecology'
  },
  {
    path: '/urban_ecology',
    name: 'urban_ecology',
    component: Petropolis,
    props: { navbarGroup: 'urban_ecology', region: 'default' }
  },
  {
    path: '/urban_ecology/local',
    name: 'urban_ecologyLocal',
    component: Petropolis,
    props: { navbarGroup: 'urban_ecology', region: 'local' }
  },
  {
    path: '/urban_ecology/global',
    name: 'urban_ecologyGlobal',
    component: Petropolis,
    props: { navbarGroup: 'urban_ecology', region: 'global' }
  },
  {
    path: '/headwaters_il',
    name: 'headwaters_il',
    component: Petropolis,
    props: { navbarGroup: 'headwaters_il', region: 'default' }
  },
  {
    path: '/headwaters_il/local',
    name: 'headwaters_ilLocal',
    component: Petropolis,
    props: { navbarGroup: 'headwaters_il', region: 'local' }
  },
  {
    path: '/headwaters_il/global',
    name: 'headwaters_ilGlobal',
    component: Petropolis,
    props: { navbarGroup: 'headwaters_headwaters_il', region: 'global' }
  },
  {
    path: '/headwaters_mn',
    name: 'headwaters_mn',
    component: Petropolis,
    props: { navbarGroup: 'headwaters_mn', region: 'default' }
  },
  {
    path: '/headwaters_mn/local',
    name: 'headwaters_mnLocal',
    component: Petropolis,
    props: { navbarGroup: 'headwaters_mn', region: 'local' }
  },
  {
    path: '/headwaters_mn/global',
    name: 'headwaters_mnGlobal',
    component: Petropolis,
    props: { navbarGroup: 'headwaters_mn', region: 'global' }
  },
  // Admin dashboard view...
  {
    path: '/admin',
    // lazy-loaded
    component: () => import('../views/Admin.vue'),
    children: [
      {
        path: '',
        name: 'admin.dashboard',
        component: () => import('../components/dashboard/Dashboard.vue'),
        meta: {
          requiresAuth: true,
          scope: 'admin_user'
        },
        redirect: 'user'
      },
      {
        path: 'user',
        name: 'admin.users',
        component: () => import('../components/dashboard/User.vue'),
        meta: {
          requiresAuth: true,
          scope: 'admin_user'
        }
      },
      {
        path: 'settings',
        name: 'admin.settings',
        component: () => import('../components/dashboard/Settings.vue'),
        meta: {
          requiresAuth: true,
          scope: 'admin_user'
        }
      }
    ]
  }
];

const router = new VueRouter({
  routes
});

router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(x => x.meta.requiresAuth);
  if (!requiresAuth) {
    return next();
  }
  // Get roles and check if user is allowed
  const token = localStorage.getItem('token');
  const decodedToken = validateToken(token);
  if (!decodedToken || !decodedToken.roles) {
    return next({ path: '/', params: { showLogin: true } });
  }

  const roleScope = to.meta.scope;
  if (
    Array.isArray(decodedToken.roles) &&
    decodedToken.roles.includes(roleScope)
  ) {
    return next();
  } else {
    return next({ path: '/', params: { showLogin: true } });
  }
});

export default router;

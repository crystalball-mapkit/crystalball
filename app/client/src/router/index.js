import Vue from 'vue';
import VueRouter from 'vue-router';
import Main from '../views/Main.vue';
Vue.use(VueRouter);
import { validateToken } from '../utils/Helpers';

export function getRoutes(config) {
  const groups = config.map.groups;
  const groupNames = Object.keys(groups);
  const routes = [];
  // Base route
  routes.push({
    path: '/',
    name: 'map',
    redirect: `/${groupNames[0]}` // TODO: Get the default route from app-conf
  });
  // Map routes.
  groupNames.forEach(groupName => {
    const regions = groups[groupName];
    const regionNames = Object.keys(regions);
    regionNames.forEach(regionName => {
      const region = regions[regionName];
      if (region.layers.length > 0) {
        routes.push({
          path:
            regionName === 'default'
              ? `/${groupName}`
              : `/${groupName}/${regionName}`,
          name:
            regionName === 'default' ? groupName : `${groupName}${regionName}`,
          component: Main,
          props: { navbarGroup: groupName, region: regionName }
        });
      }
    });
  });
  // Admin routes.
  routes.push({
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
      },
      {
        path: 'assets',
        name: 'admin.assets',
        component: () => import('../components/dashboard/Assets.vue'),
        meta: {
          requiresAuth: true,
          scope: 'admin_user'
        }
      }
    ]
  });
  return routes;
}

const router = new VueRouter({});
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

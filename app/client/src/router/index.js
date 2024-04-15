import Vue from 'vue';
import VueRouter from 'vue-router';
import Main from '../views/Main.vue';
import {validateToken} from '../utils/Helpers';
import {EventBus} from '../EventBus';

Vue.use(VueRouter);

export function getRoutes(config) {
  const groups = config.map.groups;
  const groupNames = Object.keys(groups);
  const defaultActiveGroupIndex = groupNames.indexOf(config.map.defaultActiveGroup);
  const defaultActiveGroup = defaultActiveGroupIndex !== -1 ? groupNames[defaultActiveGroupIndex] : groupNames[0];
  const routes = [];
  // Base route
  let redirectPath;
  if (config.map.defaultActiveButton) {
    redirectPath = `/${defaultActiveGroup}/${config.map.defaultActiveButton}`;
  }
  if (!config.app.customNavigationScheme || config.app.customNavigationScheme !== '2') {
    const defaultRegion = config.map.defaultActiveRegion || Object.keys(groups[defaultActiveGroup])[0];
    redirectPath = `/${defaultActiveGroup}/${defaultRegion}`;
  }

  routes.push({
    path: '/',
    name: 'map',
    redirect: redirectPath,
  });
  // Map routes.
  groupNames.forEach(groupName => {
    const regions = groups[groupName];
    let regionNames;
    if (config.app.customNavigationScheme && config.app.customNavigationScheme === '2') {
      regionNames = Object.keys(config.map.buttons);
    } else {
      regionNames = Object.keys(regions);
    }
    regionNames.forEach(regionName => {
      routes.push({
        path: `/${groupName}/${regionName}`,
        name: `${groupName}${regionName}`,
        component: Main,
        props: {navbarGroup: groupName, region: regionName},
      });
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
          scope: 'admin_user',
        },
        redirect: 'user',
      },
      {
        path: 'user',
        name: 'admin.users',
        component: () => import('../components/dashboard/User.vue'),
        meta: {
          requiresAuth: true,
          scope: 'admin_user',
        },
      },
      {
        path: 'settings',
        name: 'admin.settings',
        component: () => import('../components/dashboard/Settings.vue'),
        meta: {
          requiresAuth: true,
          scope: 'admin_user',
        },
      },
      {
        path: 'assets',
        name: 'admin.assets',
        component: () => import('../components/dashboard/Assets.vue'),
        meta: {
          requiresAuth: true,
          scope: 'admin_user',
        },
      },
      {
        path: 'database',
        name: 'admin.database',
        component: () => import('../components/dashboard/Database.vue'),
        meta: {
          requiresAuth: true,
          scope: 'admin_user',
        },
      },
    ],
  });
  return routes;
}

const router = new VueRouter({});
// const originalPush = router.push;
// router.push = function push(location, onResolve, onReject) {
//   if (onResolve || onReject) {
//     return originalPush.call(this, location, onResolve, onReject);
//   }

//   return originalPush.call(this, location).catch(err => {
//     if (VueRouter.isNavigationFailure(err)) {
//       return err;
//     }

//     return Promise.reject(err);
//   });
// };
router.beforeEach((to, from, next) => {
  EventBus.$emit('scrollSidePanelTop');
  const requiresAuth = to.matched.some(x => x.meta.requiresAuth);
  if (!requiresAuth) {
    return next();
  }
  // Get roles and check if user is allowed
  const token = localStorage.getItem('token');
  const decodedToken = validateToken(token);
  if (!decodedToken || !decodedToken.roles) {
    return next({path: '/', params: {showLogin: true}});
  }

  const roleScope = to.meta.scope;
  if (Array.isArray(decodedToken.roles) && decodedToken.roles.includes(roleScope)) {
    return next();
  }
  return next({path: '/', params: {showLogin: true}});
});

export default router;

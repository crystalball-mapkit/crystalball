import jwtDecode from 'jwt-decode';
import AuthService from '../../services/auth.service';
import {validateToken} from '../../utils/Helpers';

const token = JSON.parse(localStorage.getItem('token'));

const state = {
  user: validateToken(token),
  token,
  users: [],
};

const getters = {
  loggedUser: state => state.user,
  users: state => state.users,
};

const actions = {
  login({commit}, user) {
    return AuthService.login(user).then(
      response => {
        commit('loginSuccess', response);
        return Promise.resolve(response);
      },
      error => {
        commit('loginFailure');
        return Promise.reject(error);
      }
    );
  },
  logout({commit}) {
    AuthService.logout();
    commit('logout');
  },
  registerUser({commit}, user) {
    return AuthService.registerUser(user).then(
      response => {
        commit('registerSuccess');
        return Promise.resolve(response.data);
      },
      error => {
        commit('registerFailure');
        return Promise.reject(error);
      }
    );
  },
  registerGuestUser({commit}, user) {
    return AuthService.registerGuestUser(user).then(
      response => {
        commit('registerSuccess');
        return Promise.resolve(response.data);
      },
      error => {
        commit('registerFailure');
        return Promise.reject(error);
      }
    );
  },
  // eslint-disable-next-line no-unused-vars
  updateUser({commit}, user) {
    return AuthService.updateUser(user).then(
      response => Promise.resolve(response.data),
      error => Promise.reject(error)
    );
  },
  // eslint-disable-next-line no-unused-vars
  updatePassword({commit}, user) {
    return AuthService.updatePassword(user).then(
      response => Promise.resolve(response.data),
      error => Promise.reject(error)
    );
  },
  getUsers({commit}) {
    return AuthService.getUsers().then(
      response => {
        commit('getUsersSuccess', response.data);
        return Promise.resolve(response.data);
      },
      error => {
        commit('getUsersFailure');
        return Promise.reject(error);
      }
    );
  },
  // eslint-disable-next-line no-unused-vars
  deleteUser({commit}, user) {
    return AuthService.deleteUser(user).then(
      response => Promise.resolve(response.data),
      error => Promise.reject(error)
    );
  },
};

const mutations = {
  loginSuccess(state, response) {
    state.token = response.token;
    const decodedToken = jwtDecode(response.token);
    state.user = decodedToken;
  },
  loginFailure(state) {
    state.user = null;
  },
  logout(state) {
    state.user = null;
    state.token = null;
  },
  registerSuccess() {
    console.log('handle register user succes');
  },
  registerFailure() {
    console.log('handle register failure');
  },
  getUsersSuccess(state, users) {
    state.users = users;
  },
  getUseresFailure(state) {
    state.users = [];
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};

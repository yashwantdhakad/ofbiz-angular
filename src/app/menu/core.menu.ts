/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { MenuItem } from './menu-item.model';

export const homeMenu: MenuItem = {
  path: '/',
  name: 'MENU.HOME',
  nav: ['side'],
  meta: {
    title: 'MENU.HOME',
    icon: 'home',
    requiredAuth: true,
    permissions: ['ADMIN']
  }
};

export const settingsMenu: MenuItem = {
  name: 'MENU.SETTINGS',
  nav: ['side'],
  meta: {
    title: 'MENU.SETTINGS',
    icon: 'settings',
    requiredAuth: true,
    permissions: ['ADMIN']
  },
  children: [
    {
      path: '/company',
      name: 'MENU.COMPANY',
      nav: ['side'],
      meta: {
        title: 'MENU.COMPANY',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'SECURITY'
      }
    },
    {
      path: '/data-exchange',
      name: 'MENU.DATA_EXCHANGE',
      nav: ['side'],
      meta: {
        title: 'MENU.DATA_EXCHANGE',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'SECURITY'
      }
    }
  ]
};

export const reportsMenu: MenuItem = {
  name: 'MENU.REPORTS',
  nav: ['side'],
  meta: {
    title: 'MENU.REPORTS',
    icon: 'analytics',
    requiredAuth: true,
    permissions: ['ADMIN']
  },
  children: [
    {
      path: '/reports',
      name: 'MENU.REPORT_DASHBOARD',
      nav: ['side'],
      meta: {
        title: 'MENU.REPORT_DASHBOARD',
        requiredAuth: true,
        permissions: ['ADMIN']
      }
    },
    {
      path: '/reports/cashflow-forecast',
      name: 'MENU.CASHFLOW_FORECAST',
      nav: ['side'],
      meta: {
        title: 'MENU.CASHFLOW_FORECAST',
        requiredAuth: true,
        permissions: ['ADMIN']
      }
    },
    {
      path: '/reports/vendor-performance',
      name: 'MENU.VENDOR_PERFORMANCE',
      nav: ['side'],
      meta: {
        title: 'MENU.VENDOR_PERFORMANCE',
        requiredAuth: true,
        permissions: ['ADMIN']
      }
    },
    {
      path: '/reports/trial-balance',
      name: 'MENU.TRIAL_BALANCE',
      nav: ['side'],
      meta: {
        title: 'MENU.TRIAL_BALANCE',
        requiredAuth: true,
        permissions: ['ADMIN']
      }
    }
  ]
};

export const supportMenu: MenuItem = {
  path: '/support/tickets',
  name: 'MENU.SUPPORT',
  nav: ['side'],
  meta: {
    title: 'MENU.SUPPORT',
    icon: 'help_outline',
    requiredAuth: true,
    permissions: ['MENU_HOME_VIEW', 'SUPER_ADMIN_ONLY']
  }
};

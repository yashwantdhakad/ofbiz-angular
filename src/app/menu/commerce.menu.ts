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

export const relationshipsMenu: MenuItem = {
  name: 'MENU.RELATIONSHIPS',
  nav: ['side'],
  meta: {
    title: 'MENU.RELATIONSHIPS',
    icon: 'group',
    requiredAuth: true,
    permissions: ['ADMIN']
  },
  children: [
    {
      path: '/customers',
      name: 'MENU.CUSTOMERS',
      nav: ['side'],
      meta: {
        title: 'MENU.CUSTOMERS',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ORDER'
      }
    },
    /* {
      path: '/crm/pipeline',
      name: 'MENU.CRM_PIPELINE',
      nav: ['side'],
      meta: {
        title: 'MENU.CRM_PIPELINE',
        requiredAuth: true,
        permissions: ['ADMIN']
      }
    }, */
    {
      path: '/suppliers',
      name: 'MENU.SUPPLIERS',
      nav: ['side'],
      meta: {
        title: 'MENU.SUPPLIERS',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ORDER'
      }
    },
    {
      path: '/users',
      name: 'MENU.USERS',
      nav: ['side'],
      meta: {
        title: 'MENU.USERS',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'SECURITY'
      }
    }
  ]
};

export const catalogMenu: MenuItem = {
  name: 'MENU.CATALOG',
  nav: ['side'],
  meta: {
    title: 'MENU.CATALOG',
    icon: 'storefront',
    requiredAuth: true,
    permissions: ['ADMIN']
  },
  children: [
    {
      path: '/products',
      name: 'MENU.PRODUCTS',
      nav: ['side'],
      meta: {
        title: 'MENU.PRODUCTS',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ORDER'
      }
    },
    {
      path: '/category',
      name: 'MENU.CATEGORIES',
      nav: ['side'],
      meta: {
        title: 'MENU.CATEGORIES',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ORDER'
      }
    }
  ]
};

export const ordersMenu: MenuItem = {
  name: 'MENU.ORDER_GROUP',
  nav: ['side'],
  meta: {
    title: 'MENU.ORDER_GROUP',
    icon: 'shopping_cart',
    requiredAuth: true,
    permissions: ['ADMIN']
  },
  children: [
    {
      path: '/orders',
      name: 'MENU.SALES_ORDERS',
      nav: ['side'],
      meta: {
        title: 'MENU.SALES_ORDERS',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ORDER'
      }
    },
    {
      path: '/quotes',
      name: 'MENU.SALES_QUOTES',
      nav: ['side'],
      meta: {
        title: 'MENU.SALES_QUOTES',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ORDER'
      }
    },
    {
      path: '/pos',
      name: 'MENU.POS',
      nav: ['side'],
      meta: {
        title: 'MENU.POS',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ORDER'
      }
    },
    {
      path: '/pos/quotes',
      name: 'MENU.PURCHASE_QUOTES',
      nav: ['side'],
      meta: {
        title: 'MENU.PURCHASE_QUOTES',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ORDER'
      }
    },
    {
      path: '/returns',
      name: 'MENU.RETURNS',
      nav: ['side'],
      meta: {
        title: 'MENU.RETURNS',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ORDER'
      }
    }
  ]
};

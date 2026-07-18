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

export const accountingMenu: MenuItem = {
  name: 'MENU.ACCOUNTING',
  nav: ['side'],
  meta: {
    title: 'MENU.ACCOUNTING',
    icon: 'receipt_long',
    requiredAuth: true,
    permissions: ['ADMIN']
  },
  children: [
    {
      path: '/invoices/sales',
      name: 'MENU.SALES_INVOICES',
      nav: ['side'],
      meta: {
        title: 'MENU.SALES_INVOICES',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ACCT'
      }
    },
    {
      path: '/invoices/purchase',
      name: 'MENU.PURCHASE_INVOICES',
      nav: ['side'],
      meta: {
        title: 'MENU.PURCHASE_INVOICES',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ACCT'
      }
    },
    {
      path: '/payments',
      name: 'MENU.PAYMENTS',
      nav: ['side'],
      meta: {
        title: 'MENU.PAYMENTS',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ACCT'
      }
    }
  ]
};

export const financeMenu: MenuItem = {
  name: 'MENU.FINANCE',
  nav: ['side'],
  meta: {
    title: 'MENU.FINANCE',
    icon: 'account_balance',
    requiredAuth: true,
    permissions: ['ADMIN']
  },
  children: [
    {
      path: '/finance/chart-of-accounts',
      name: 'MENU.CHART_OF_ACCOUNTS',
      nav: ['side'],
      meta: {
        title: 'MENU.CHART_OF_ACCOUNTS',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ACCT'
      }
    },
    {
      path: '/finance/journal-entries',
      name: 'MENU.JOURNAL_ENTRIES',
      nav: ['side'],
      meta: {
        title: 'MENU.JOURNAL_ENTRIES',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ACCT'
      }
    },
    {
      path: '/finance/exchange-rates',
      name: 'MENU.EXCHANGE_RATES',
      nav: ['side'],
      meta: {
        title: 'MENU.EXCHANGE_RATES',
        requiredAuth: true,
        permissions: ['ADMIN'],
        erpFeature: 'ACCT'
      }
    },
    /* {
      path: '/finance/profit-loss',
      name: 'MENU.PROFIT_LOSS',
      nav: ['side'],
      meta: {
        title: 'MENU.PROFIT_LOSS',
        requiredAuth: true,
        permissions: ['ADMIN']
      }
    } */
  ]
};

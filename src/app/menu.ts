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
export const menuItems = [
  {
    path: '/',
    name: 'MENU.HOME',
    nav: ['side'],
    meta: {
      title: 'MENU.HOME',
      icon: 'home',
      requiredAuth: true,
      permissions: ['ADMIN']
    }
  },
  {
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
      }
    ]
  },
  // Reports menu is temporarily hidden until better support is available later.

  {
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
  },
  {
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
  },
  // Project menu is temporarily hidden and will be fully implemented later.

  {
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
  },
  {
    name: 'MENU.WAREHOUSE',
    nav: ['side'],
    meta: {
      title: 'MENU.WAREHOUSE',
      icon: 'warehouse',
      requiredAuth: true,
      permissions: ['ADMIN']
    },
    children: [
      {
        path: '/facilities',
        name: 'MENU.FACILITIES',
        nav: ['side'],
        meta: {
          title: 'MENU.FACILITIES',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'WMS'
        }
      },
      {
        path: '/shipments',
        name: 'MENU.SHIPMENTS',
        nav: ['side'],
        meta: {
          title: 'MENU.SHIPMENTS',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'WMS'
        }
      },
      /* {
        path: '/fixed-assets',
        name: 'MENU.FIND_ASSETS',
        nav: ['side'],
        meta: {
          title: 'MENU.FIND_ASSETS',
          requiredAuth: true,
          permissions: ['ADMIN']
        }
      }, */
      {
        path: '/assets',
        name: 'MENU.ASSETS',
        nav: ['side'],
        meta: {
          title: 'MENU.ASSETS',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'WMS'
        }
      },
      {
        path: '/assets/move',
        name: 'MENU.ASSET_MOVE',
        nav: ['side'],
        meta: {
          title: 'MENU.ASSET_MOVE',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'WMS'
        }
      },
      {
        path: '/assets/inspection',
        name: 'MENU.INSPECTION_QUEUE',
        nav: ['side'],
        meta: {
          title: 'MENU.INSPECTION_QUEUE',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'WMS'
        }
      },
      {
        path: '/lots',
        name: 'MENU.LOTS',
        nav: ['side'],
        meta: {
          title: 'MENU.LOTS',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'WMS'
        }
      },
      {
        path: '/cycle-count/find',
        name: 'MENU.FIND_CYCLE_COUNT',
        nav: ['side'],
        meta: {
          title: 'MENU.FIND_CYCLE_COUNT',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'WMS'
        }
      },
      {
        path: '/picklists',
        name: 'MENU.PICKLISTS',
        nav: ['side'],
        meta: {
          title: 'MENU.PICKLISTS',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'WMS'
        }
      },
      {
        path: '/assets/create',
        name: 'MENU.RECEIVE_INVENTORY',
        nav: ['side'],
        meta: {
          title: 'MENU.RECEIVE_INVENTORY',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'WMS'
        }
      }
    ]
  },
  {
    name: 'MENU.MANUFACTURING',
    nav: ['side'],
    meta: {
      title: 'MENU.MANUFACTURING',
      icon: 'precision_manufacturing',
      requiredAuth: true,
      permissions: ['ADMIN']
    },
    children: [
      {
        path: '/boms',
        name: 'MENU.BOMS',
        nav: ['side'],
        meta: {
          title: 'MENU.BOMS',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'MFG'
        }
      },
      {
        path: '/routings',
        name: 'MENU.ROUTINGS',
        nav: ['side'],
        meta: {
          title: 'MENU.ROUTINGS',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'MFG'
        }
      },
      {
        path: '/operations',
        name: 'MENU.OPERATIONS',
        nav: ['side'],
        meta: {
          title: 'MENU.OPERATIONS',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'MFG'
        }
      },
      {
        path: '/jobs',
        name: 'MENU.JOBS',
        nav: ['side'],
        meta: {
          title: 'MENU.JOBS',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'MFG'
        }
      }
    ]
  },
  {
    name: 'MENU.PLANNING',
    nav: ['side'],
    meta: {
      title: 'MENU.PLANNING',
      icon: 'event_note',
      requiredAuth: true,
      permissions: ['ADMIN']
    },
    children: [
      {
        path: '/replenishment',
        name: 'MENU.REPLENISHMENT_RUN',
        nav: ['side'],
        meta: {
          title: 'MENU.REPLENISHMENT_RUN',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'WMS'
        }
      },
      {
        path: '/requirements',
        name: 'MENU.REQUIREMENTS',
        nav: ['side'],
        meta: {
          title: 'MENU.REQUIREMENTS',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'WMS'
        }
      },
      {
        path: '/replenishment/shortages',
        name: 'MENU.SHORTAGES',
        nav: ['side'],
        meta: {
          title: 'MENU.SHORTAGES',
          requiredAuth: true,
          permissions: ['ADMIN'],
          erpFeature: 'WMS'
        }
      }
    ]
  },
  {
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
  },
  {
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
  },
  {
    path: '/support/tickets',
    name: 'MENU.SUPPORT',
    nav: ['side'],
    meta: {
      title: 'MENU.SUPPORT',
      icon: 'help_outline',
      requiredAuth: true,
      permissions: ['MENU_HOME_VIEW', 'SUPER_ADMIN_ONLY']
    }
  }
];

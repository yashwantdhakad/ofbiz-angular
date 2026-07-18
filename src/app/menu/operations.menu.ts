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

export const warehouseMenu: MenuItem = {
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
    {
      path: '/picklists/packing-station',
      name: 'MENU.PACKING_STATION',
      nav: ['side'],
      meta: {
        title: 'MENU.PACKING_STATION',
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
};

export const manufacturingMenu: MenuItem = {
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
};

export const planningMenu: MenuItem = {
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
};

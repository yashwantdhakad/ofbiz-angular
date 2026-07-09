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
import { of, throwError } from 'rxjs';
import { CommonService } from './common.service';
import { FacilityService } from '../facility/facility.service';
import { UserService } from '../security/user.service';
import { OrderService } from '../order/order.service';
import { ReferenceDataStore } from './reference-data.store';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import * as GeoActions from '@ofbiz/store/geo/geo.actions';

describe('ReferenceDataStore', () => {
  let commonService: jasmine.SpyObj<CommonService>;
  let facilityService: jasmine.SpyObj<FacilityService>;
  let userService: jasmine.SpyObj<UserService>;
  let orderService: jasmine.SpyObj<OrderService>;
  let ngrxStore: MockStore;
  let store: ReferenceDataStore;

  beforeEach(() => {
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getGeos', 'getAllStatusItems', 'getStatusItems']);
    facilityService = jasmine.createSpyObj<FacilityService>('FacilityService', ['getFacilities']);
    userService = jasmine.createSpyObj<UserService>('UserService', ['listRoles', 'listPermissions']);
    orderService = jasmine.createSpyObj<OrderService>('OrderService', ['getProductStores']);

    TestBed.configureTestingModule({
      providers: [
        ReferenceDataStore,
        provideMockStore({
          initialState: {
            geo: {
              geoList: [],
              loading: false,
              error: null,
            },
          },
        }),
        { provide: CommonService, useValue: commonService },
        { provide: FacilityService, useValue: facilityService },
        { provide: UserService, useValue: userService },
        { provide: OrderService, useValue: orderService },
      ],
    });

    ngrxStore = TestBed.inject(MockStore);
    spyOn(ngrxStore, 'dispatch');
    store = TestBed.inject(ReferenceDataStore);
  });

  it('loads facilities and maps labels', () => {
    facilityService.getFacilities.and.returnValue(of([{ facilityId: 'FAC-1', facilityName: 'Main' }]));

    store.ensureFacilitiesLoaded();

    expect(store.facilitiesLoaded()).toBeTrue();
    expect(store.facilitiesLoading()).toBeFalse();
    expect(store.facilities()).toEqual([{ facilityId: 'FAC-1', facilityName: 'Main', label: 'Main' }]);
  });

  it('does not reload facilities when already loaded unless forced', () => {
    facilityService.getFacilities.and.returnValue(of([{ facilityId: 'FAC-1' }]));

    store.ensureFacilitiesLoaded();
    store.ensureFacilitiesLoaded();
    store.ensureFacilitiesLoaded(true);

    expect(facilityService.getFacilities).toHaveBeenCalledTimes(2);
  });

  it('stores a facilities error when loading fails', () => {
    facilityService.getFacilities.and.returnValue(throwError(() => ({ message: 'boom' })));

    store.ensureFacilitiesLoaded();

    expect(store.facilities()).toEqual([]);
    expect(store.facilitiesLoaded()).toBeFalse();
    expect((store as any).facilitiesState().error).toBe('boom');
  });

  it('loads geos and exposes countries, states, and statesByCountry filters', () => {
    ngrxStore.setState({
      geo: {
        geoList: [
        { geoId: 'USA', geoTypeId: 'COUNTRY' },
        { geoId: 'CA', geoTypeId: 'STATE', countryGeoId: 'USA' },
        { geoId: 'GJ', geo_type_id: 'STATE', country_geo_id: 'IND' },
        { geoId: 'ON', geoTypeId: 'PROVINCE', countryGeoId: 'CAN' },
        ],
        loading: false,
        error: null,
      },
    });
    ngrxStore.refreshState();

    store.ensureGeosLoaded();

    expect(ngrxStore.dispatch).toHaveBeenCalledWith(GeoActions.loadGeos());
    expect(store.countries()).toHaveSize(1);
    expect(store.states()).toHaveSize(3);
    expect(store.statesByCountry('USA')).toEqual([{ geoId: 'CA', geoTypeId: 'STATE', countryGeoId: 'USA' }]);
    expect(store.statesByCountry('IND')).toEqual([{ geoId: 'GJ', geo_type_id: 'STATE', country_geo_id: 'IND' }]);
    expect(store.statesByCountry('CAN')).toEqual([{ geoId: 'ON', geoTypeId: 'PROVINCE', countryGeoId: 'CAN' }]);
  });

  it('loads roles and permissions with array fallback handling', () => {
    userService.listRoles.and.returnValue(of([{ roleTypeId: 'ADMIN' }] as any));
    userService.listPermissions.and.returnValue(of(null as any));

    store.ensureRolesLoaded();
    store.ensurePermissionsLoaded();

    expect(store.roles()).toEqual([{ roleTypeId: 'ADMIN' }] as any);
    expect(store.rolesLoaded()).toBeTrue();
    expect(store.permissions()).toEqual([]);
    expect(store.permissionsLoaded()).toBeTrue();
  });

  it('loads all statuses and builds the status description map', () => {
    commonService.getAllStatusItems.and.returnValue(
      of([
        { statusId: 'ORDER_APPROVED', description: 'Approved' },
        { statusId: 'ORDER_CREATED' },
        { description: 'ignore-me' },
      ])
    );

    store.ensureAllStatusesLoaded();

    expect(store.allStatusesLoaded()).toBeTrue();
    expect(store.statusDescriptionMap().get('ORDER_APPROVED')).toBe('Approved');
    expect(store.statusDescriptionMap().get('ORDER_CREATED')).toBe('ORDER_CREATED');
  });

  it('stores a statuses error when loading fails', () => {
    commonService.getAllStatusItems.and.returnValue(throwError(() => ({ message: 'status failed' })));

    store.ensureAllStatusesLoaded();

    expect(store.allStatuses()).toEqual([]);
    expect((store as any).allStatusesState().error).toBe('status failed');
  });

  it('loads product stores and maps labels', () => {
    orderService.getProductStores.and.returnValue(of([{ productStoreId: 'STORE-1', storeName: 'Retail' }]));

    store.ensureProductStoresLoaded();

    expect(store.productStoresLoaded()).toBeTrue();
    expect(store.productStores()).toEqual([{ productStoreId: 'STORE-1', storeName: 'Retail', label: 'Retail' }]);
  });

  it('reloads geos only when forced and stores geo errors', () => {
    store.ensureGeosLoaded();
    store.ensureGeosLoaded();
    store.ensureGeosLoaded(true);

    expect(ngrxStore.dispatch).toHaveBeenCalledTimes(2);
    expect(store.geos()).toEqual([]);
    expect(store.geosLoaded()).toBeTrue();

    ngrxStore.setState({
      geo: {
        geoList: [],
        loading: false,
        error: 'geo failed',
      },
    });
    ngrxStore.refreshState();

    expect(store.geosLoaded()).toBeFalse();
  });

  it('stores permissions and product store errors when loading fails', () => {
    userService.listPermissions.and.returnValue(throwError(() => ({ message: 'permissions failed' })));
    orderService.getProductStores.and.returnValue(throwError(() => ({ message: 'stores failed' })));

    store.ensurePermissionsLoaded();
    store.ensureProductStoresLoaded();

    expect(store.permissions()).toEqual([]);
    expect(store.permissionsLoaded()).toBeFalse();
    expect((store as any).permissionsState().error).toBe('permissions failed');
    expect(store.productStores()).toEqual([]);
    expect(store.productStoresLoaded()).toBeFalse();
    expect((store as any).productStoresState().error).toBe('stores failed');
  });

  it('loads status items by type and supports force reload with fallback errors', () => {
    commonService.getStatusItems.and.returnValues(
      of([{ statusId: 'ORDER_CREATED', description: 'Created' }]),
      throwError(() => ({}))
    );

    store.ensureStatusTypeLoaded('ORDER_STATUS');
    expect(store.statusItemsByType('ORDER_STATUS')).toEqual([{ statusId: 'ORDER_CREATED', description: 'Created' }]);

    store.ensureStatusTypeLoaded('ORDER_STATUS');
    store.ensureStatusTypeLoaded('ORDER_STATUS', true);

    expect(commonService.getStatusItems).toHaveBeenCalledTimes(2);
    expect(commonService.getStatusItems).toHaveBeenCalledWith('ORDER_STATUS');
    expect(store.statusItemsByType('ORDER_STATUS')).toEqual([]);
    expect((store as any).statusTypesState()['ORDER_STATUS'].error).toBe('Failed to load ORDER_STATUS');
  });
});

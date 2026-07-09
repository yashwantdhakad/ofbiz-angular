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
import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { CommonService } from './common.service';
import { FacilityService } from '../facility/facility.service';
import { UserService } from '../security/user.service';
import { OrderService } from '../order/order.service';
import { GeoRecord } from '@ofbiz/store/geo/geo.state';
import * as GeoActions from '@ofbiz/store/geo/geo.actions';
import { selectGeoError, selectGeoList, selectGeoLoading } from '@ofbiz/store/geo/geo.selector';
import { FacilityDetail } from '@ofbiz/models/facility.model';
import { SecurityGroup, SecurityPermission } from '@ofbiz/models/user.model';
import { StatusLookupItem } from '@ofbiz/models/order.model';
import { CompanyProductStore } from '../company/company.service';

type ErrorLike = { message?: string };
type LabeledFacility = FacilityDetail & { label?: string };
type ProductStoreLookup = CompanyProductStore & { label?: string };

type ReferenceState<T> = {
  data: T;
  loading: boolean;
  loaded: boolean;
  error: string | null;
};

function createReferenceState<T>(initialData: T): ReferenceState<T> {
  return {
    data: initialData,
    loading: false,
    loaded: false,
    error: null,
  };
}

@Injectable({
  providedIn: 'root',
})
export class ReferenceDataStore {
  private readonly store = inject(Store);
  private readonly facilitiesState = signal<ReferenceState<LabeledFacility[]>>(createReferenceState<LabeledFacility[]>([]));
  private readonly geosRequested = signal(false);
  private readonly rolesState = signal<ReferenceState<SecurityGroup[]>>(createReferenceState<SecurityGroup[]>([]));
  private readonly permissionsState = signal<ReferenceState<SecurityPermission[]>>(createReferenceState<SecurityPermission[]>([]));
  private readonly allStatusesState = signal<ReferenceState<StatusLookupItem[]>>(createReferenceState<StatusLookupItem[]>([]));
  private readonly productStoresState = signal<ReferenceState<ProductStoreLookup[]>>(createReferenceState<ProductStoreLookup[]>([]));
  private readonly statusTypesState = signal<Record<string, ReferenceState<StatusLookupItem[]>>>({});

  readonly facilities = computed(() => this.facilitiesState().data);
  readonly facilitiesLoading = computed(() => this.facilitiesState().loading);
  readonly facilitiesLoaded = computed(() => this.facilitiesState().loaded);

  private readonly geoList = toSignal(this.store.select(selectGeoList), { initialValue: [] as GeoRecord[] });
  private readonly geoLoading = toSignal(this.store.select(selectGeoLoading), { initialValue: false });
  private readonly geoError = toSignal(this.store.select(selectGeoError), { initialValue: null as string | null });

  readonly geos = computed(() => this.geoList());
  readonly geosLoading = computed(() => this.geoLoading());
  readonly geosLoaded = computed(() => this.geosRequested() && !this.geoLoading() && !this.geoError());
  readonly countries = computed(() =>
    this.geos().filter((geo) => this.geoTypeId(geo) === 'COUNTRY')
  );
  readonly states = computed(() =>
    this.geos().filter((geo) => this.isStateProvinceGeo(geo))
  );

  readonly roles = computed(() => this.rolesState().data);
  readonly rolesLoading = computed(() => this.rolesState().loading);
  readonly rolesLoaded = computed(() => this.rolesState().loaded);

  readonly permissions = computed(() => this.permissionsState().data);
  readonly permissionsLoading = computed(() => this.permissionsState().loading);
  readonly permissionsLoaded = computed(() => this.permissionsState().loaded);

  readonly productStores = computed(() => this.productStoresState().data);
  readonly productStoresLoading = computed(() => this.productStoresState().loading);
  readonly productStoresLoaded = computed(() => this.productStoresState().loaded);

  readonly allStatuses = computed(() => this.allStatusesState().data);
  readonly allStatusesLoading = computed(() => this.allStatusesState().loading);
  readonly allStatusesLoaded = computed(() => this.allStatusesState().loaded);
  readonly statusDescriptionMap = computed(
    () =>
      new Map(
        this.allStatuses()
          .filter((item) => !!item?.statusId)
          .map((item) => [String(item.statusId).trim(), item.description || item.statusId])
      )
  );

  constructor(
    private readonly commonService: CommonService,
    private readonly facilityService: FacilityService,
    private readonly userService: UserService,
    private readonly orderService: OrderService,
  ) {}

  ensureFacilitiesLoaded(force: boolean = false): void {
    const current = this.facilitiesState();
    if (current.loading || (current.loaded && !force)) {
      return;
    }

    this.facilitiesState.update((state) => ({ ...state, loading: true, error: null }));
    this.facilityService.getFacilities().subscribe({
      next: (items) => {
        const facilities = (Array.isArray(items) ? items : []).map((facility) => ({
          ...facility,
          label: facility?.facilityName || facility?.facilityId,
        }));
        this.facilitiesState.set({
          data: facilities,
          loading: false,
          loaded: true,
          error: null,
        });
      },
      error: (error: ErrorLike) => {
        this.facilitiesState.set({
          data: [],
          loading: false,
          loaded: false,
          error: error?.message || 'Failed to load facilities',
        });
      },
    });
  }

  ensureGeosLoaded(force: boolean = false): void {
    if (this.geosLoading() || (this.geosLoaded() && !force)) {
      return;
    }

    this.geosRequested.set(true);
    this.store.dispatch(GeoActions.loadGeos());
  }

  ensureRolesLoaded(force: boolean = false): void {
    const current = this.rolesState();
    if (current.loading || (current.loaded && !force)) {
      return;
    }

    this.rolesState.update((state) => ({ ...state, loading: true, error: null }));
    this.userService.listRoles().subscribe({
      next: (items) => {
        const roles = Array.isArray(items) ? items : [];
        this.rolesState.set({
          data: roles,
          loading: false,
          loaded: true,
          error: null,
        });
      },
      error: (error: ErrorLike) => {
        this.rolesState.set({
          data: [],
          loading: false,
          loaded: false,
          error: error?.message || 'Failed to load roles',
        });
      },
    });
  }

  ensurePermissionsLoaded(force: boolean = false): void {
    const current = this.permissionsState();
    if (current.loading || (current.loaded && !force)) {
      return;
    }

    this.permissionsState.update((state) => ({ ...state, loading: true, error: null }));
    this.userService.listPermissions().subscribe({
      next: (items) => {
        const permissions = Array.isArray(items) ? items : [];
        this.permissionsState.set({
          data: permissions,
          loading: false,
          loaded: true,
          error: null,
        });
      },
      error: (error: ErrorLike) => {
        this.permissionsState.set({
          data: [],
          loading: false,
          loaded: false,
          error: error?.message || 'Failed to load permissions',
        });
      },
    });
  }

  ensureAllStatusesLoaded(force: boolean = false): void {
    const current = this.allStatusesState();
    if (current.loading || (current.loaded && !force)) {
      return;
    }

    this.allStatusesState.update((state) => ({ ...state, loading: true, error: null }));
    this.commonService.getAllStatusItems().subscribe({
      next: (items) => {
        const statuses = Array.isArray(items) ? items : [];
        this.allStatusesState.set({
          data: statuses,
          loading: false,
          loaded: true,
          error: null,
        });
      },
      error: (error: ErrorLike) => {
        this.allStatusesState.set({
          data: [],
          loading: false,
          loaded: false,
          error: error?.message || 'Failed to load statuses',
        });
      },
    });
  }

  ensureProductStoresLoaded(force: boolean = false): void {
    const current = this.productStoresState();
    if (current.loading || (current.loaded && !force)) {
      return;
    }

    this.productStoresState.update((state) => ({ ...state, loading: true, error: null }));
    this.orderService.getProductStores().subscribe({
      next: (items) => {
        const stores = (Array.isArray(items) ? items : []).map((store) => ({
          ...store,
          label: store?.storeName || store?.productStoreId,
        }));
        this.productStoresState.set({
          data: stores,
          loading: false,
          loaded: true,
          error: null,
        });
      },
      error: (error: ErrorLike) => {
        this.productStoresState.set({
          data: [],
          loading: false,
          loaded: false,
          error: error?.message || 'Failed to load product stores',
        });
      },
    });
  }

  statesByCountry(countryGeoId?: string | null): GeoRecord[] {
    const selectedCountryGeoId = countryGeoId?.toString().trim();
    return this.states().filter((state) => {
      const countryId = (state?.country_geo_id ?? state?.countryGeoId)?.toString().trim();
      return !selectedCountryGeoId || !countryId || countryId === selectedCountryGeoId;
    });
  }

  statusItemsByType(statusTypeId: string): StatusLookupItem[] {
    return this.statusTypesState()[statusTypeId]?.data || [];
  }

  ensureStatusTypeLoaded(statusTypeId: string, force: boolean = false): void {
    const current = this.statusTypesState()[statusTypeId];
    if (current?.loading || (current?.loaded && !force)) {
      return;
    }

    this.statusTypesState.update((state) => ({
      ...state,
      [statusTypeId]: {
        ...(state[statusTypeId] || createReferenceState<StatusLookupItem[]>([])),
        loading: true,
        error: null,
      },
    }));

    this.commonService.getStatusItems(statusTypeId).subscribe({
      next: (items) => {
        const statuses = Array.isArray(items) ? items : [];
        this.statusTypesState.update((state) => ({
          ...state,
          [statusTypeId]: {
            data: statuses,
            loading: false,
            loaded: true,
            error: null,
          },
        }));
      },
      error: (error: ErrorLike) => {
        this.statusTypesState.update((state) => ({
          ...state,
          [statusTypeId]: {
            data: [],
            loading: false,
            loaded: false,
            error: error?.message || `Failed to load ${statusTypeId}`,
          },
        }));
      },
    });
  }

  private geoTypeId(geo: GeoRecord): string {
    return String(geo?.geoTypeId ?? geo?.geo_type_id ?? '').trim().toUpperCase();
  }

  private isStateProvinceGeo(geo: GeoRecord): boolean {
    return ['STATE', 'PROVINCE', 'REGION', 'TERRITORY', 'DISTRICT'].includes(this.geoTypeId(geo));
  }
}

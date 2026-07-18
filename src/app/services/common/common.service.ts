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
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import * as GeoActions from '@ofbiz/store/geo/geo.actions';
import * as EnumActions from '@ofbiz/store/enum/enum.actions';
import { ApiService } from './api.service';
import { PreferredFacilityService } from './preferred-facility.service';
import { GeoRecord } from '@ofbiz/store/geo/geo.state';
import { FacilityDetail, FacilityLocation } from '@ofbiz/models/facility.model';
import { OrderItemTypeLookupItem, ShipmentTypeLookupItem, StatusLookupItem } from '@ofbiz/models/order.model';

export interface LookupRecord {
  [key: string]: unknown;
}

export interface EnumerationLookupItem extends LookupRecord {
  enumId?: string;
  enumTypeId?: string;
  description?: string;
}

export interface UomLookupItem extends LookupRecord {
  uomId?: string;
  uomTypeId?: string;
  description?: string;
}

export interface RoleTypeLookupItem extends LookupRecord {
  roleTypeId?: string;
  parentTypeId?: string;
  description?: string;
}

export interface ShipmentMethodTypeLookupItem extends LookupRecord {
  shipmentMethodTypeId?: string;
  description?: string;
}

interface GeoAssocLookupItem {
  geoAssocTypeId?: string;
  geo_assoc_type_id?: string;
  geoId?: string;
  geo_id?: string;
  geoIdTo?: string;
  geo_id_to?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CommonService {
  constructor(
    private apiService: ApiService,
    private store: Store,
    private preferredFacilityService: PreferredFacilityService
  ) { }

  private enumTypeCache = new Map<string, Observable<EnumerationLookupItem[]>>();
  private statusItemCache = new Map<string, Observable<StatusLookupItem[]>>();
  private statusAllCache$: Observable<StatusLookupItem[]> | null = null;
  private parentEnumTypeCache = new Map<string, Observable<EnumerationLookupItem[]>>();
  private uomCache = new Map<string, Observable<UomLookupItem[]>>();
  private roleTypeCache = new Map<string, Observable<RoleTypeLookupItem[]>>();
  private shipmentTypeCache$: Observable<ShipmentTypeLookupItem[]> | null = null;
  private shipmentMethodTypeCache$: Observable<ShipmentMethodTypeLookupItem[]> | null = null;
  private orderItemTypeCache$: Observable<OrderItemTypeLookupItem[]> | null = null;
  private geosCache$: Observable<GeoRecord[]> | null = null;

  getEnumTypes(enumTypeId: string): Observable<EnumerationLookupItem[]> {
    return this.cachedRequest(
      this.enumTypeCache,
      enumTypeId,
      () => this.apiService
        .getLookup<EnumerationLookupItem>('enumerations', enumTypeId)
        .pipe(map((items) => items || []))
      );
  }

  getStatusItems(statusTypeId: string): Observable<StatusLookupItem[]> {
    return this.cachedRequest(
      this.statusItemCache,
      statusTypeId,
      () => this.apiService
        .getLookup<StatusLookupItem>('status-items', statusTypeId)
        .pipe(map((items) => items || []))
      );
  }

  getAllStatusItems(): Observable<StatusLookupItem[]> {
    if (!this.statusAllCache$) {
      this.statusAllCache$ = this.apiService.getLookup<StatusLookupItem>('status-items').pipe(
        map((items) => items || []),
        shareReplay(1),
        catchError((error) => {
          this.statusAllCache$ = null;
          return this.handleError(error);
        })
      );
    }
    return this.statusAllCache$;
  }

  getParentEnumTypes(parentEnumId: string): Observable<EnumerationLookupItem[]> {
    return this.cachedRequest(
      this.parentEnumTypeCache,
      parentEnumId,
      () => this.apiService
        .getLookup<EnumerationLookupItem>('enumeration-types', parentEnumId)
        .pipe(map((items) => items || []))
      );
  }

  getUoms(uomTypeEnumId: string): Observable<UomLookupItem[]> {
    return this.cachedRequest(
      this.uomCache,
      uomTypeEnumId,
      () => this.apiService
        .getLookup<UomLookupItem>('uoms', uomTypeEnumId)
        .pipe(map((items) => items || []))
      );
  }

  getGeoList(geoTypeEnumId: string): Observable<GeoRecord[]> {
    return forkJoin({
      geos: this.apiService.getLookup<GeoRecord>('geos', geoTypeEnumId),
      assocs: this.apiService.getLookup<GeoAssocLookupItem>('geo-assocs'),
    }).pipe(
      map(({ geos, assocs }) => {
        const assocMap = this.buildGeoCountryMap(assocs || []);
        return this.normalizeGeos(geos || [], assocMap);
      }),
      catchError(this.handleError)
    );
  }

  getRoleTypes(enumTypeId: string): Observable<RoleTypeLookupItem[]> {
    return this.cachedRequest(this.roleTypeCache, enumTypeId, () => {
      return this.apiService.getLookup<RoleTypeLookupItem>('role-types', enumTypeId).pipe(map((items) => items || []));
    });
  }

  getShipmentTypes(): Observable<ShipmentTypeLookupItem[]> {
    if (!this.shipmentTypeCache$) {
      this.shipmentTypeCache$ = this.apiService.getLookup<ShipmentTypeLookupItem>('shipment-types').pipe(
        map((items) => {
          const seen = new Set<string>();
          return (items || []).filter((item) => {
            const shipmentTypeId = String(item?.shipmentTypeId || '').trim();
            if (!shipmentTypeId || seen.has(shipmentTypeId)) {
              return false;
            }
            seen.add(shipmentTypeId);
            return true;
          });
        }),
        shareReplay(1),
        catchError((error) => {
          this.shipmentTypeCache$ = null;
          return this.handleError(error);
        })
      );
    }
    return this.shipmentTypeCache$;
  }

  getShipmentMethodTypes(): Observable<ShipmentMethodTypeLookupItem[]> {
    if (!this.shipmentMethodTypeCache$) {
      this.shipmentMethodTypeCache$ = this.apiService.getLookup<ShipmentMethodTypeLookupItem>('shipment-method-types').pipe(
        map((items) => items || []),
        shareReplay(1),
        catchError((error) => {
          this.shipmentMethodTypeCache$ = null;
          return this.handleError(error);
        })
      );
    }
    return this.shipmentMethodTypeCache$;
  }

  getOrderItemTypes(): Observable<OrderItemTypeLookupItem[]> {
    if (!this.orderItemTypeCache$) {
      this.orderItemTypeCache$ = this.apiService.getLookup<OrderItemTypeLookupItem>('order-item-types').pipe(
        map((items) => items || []),
        shareReplay(1),
        catchError((error) => {
          this.orderItemTypeCache$ = null;
          return this.handleError(error);
        })
      );
    }
    return this.orderItemTypeCache$;
  }

  getGeos(): Observable<GeoRecord[]> {
    return this.fetchGeosWithAssocs().pipe(
      tap((geos) => this.store.dispatch(GeoActions.loadGeosSuccess({ geos }))),
      catchError((error) => {
        this.store.dispatch(GeoActions.loadGeosFailure({ error: error.message }));
        return throwError(() => new Error(error.message));
      })
    );
  }

  getEnums(): Observable<string[]> {
    return this.apiService.getLookup<EnumerationLookupItem>('enumerations').pipe(
      map((items) => items.map((item) => String(item.enumId || '')).filter(Boolean)),
      tap((enums) => this.store.dispatch(EnumActions.loadEnumsSuccess({ enums }))),
      catchError((error) => {
        this.store.dispatch(EnumActions.loadEnumsFailure({ error: error.message }));
        return throwError(() => new Error(error.message));
      })
    );
  }

  getFacilities(facilityIds?: string[]): Observable<FacilityDetail[]> {
    const query = facilityIds && facilityIds.length > 0
      ? `?facilityIds=${encodeURIComponent(facilityIds.join(','))}`
      : '';
    return this.apiService.getWms<FacilityDetail[] | FacilityDetail>(`/common/facilities${query}`).pipe(
      map((response: any) => {
        const items = this.extractFacilityList(response);
        return this.preferredFacilityService.sortFacilities(items.map((facility) => ({
          ...facility,
          label: facility?.label || facility?.facilityName || facility?.facilityId,
        })));
      }),
      catchError(this.handleError)
    );
  }

  getFacilityLocations(): Observable<FacilityLocation[]> {
    return this.apiService.getWms<FacilityLocation[]>('/facility-locations').pipe(
      catchError(this.handleError)
    );
  }

  private extractFacilityList(response: any): FacilityDetail[] {
    const directList = Array.isArray(response) ? response : [];
    const nestedCandidates = [
      response?.data?.resultList,
      response?.data?.documentList,
      response?.resultList,
      response?.documentList,
      response?.data,
    ];
    const nestedList = nestedCandidates.find((candidate) => Array.isArray(candidate)) || [];
    const list = directList.length > 0 ? directList : nestedList;
    if (list.length === 0 && response && typeof response === 'object' && (response.facilityId || response?.data?.facilityId)) {
      const item = response.facilityId ? response : response.data;
      return [item as FacilityDetail];
    }
    return list.filter((item: FacilityDetail | null | undefined) => !!item) as FacilityDetail[];
  }

  getLookupResults(
    params: { field?: string; value?: string | number | string[] } = {},
    table: string
  ): Observable<any[]> {
    const tableKey = table?.toLowerCase() || '';
    const filterParams = <T extends LookupRecord>(items: T[]): T[] => {
      if (!params.field) {
        return items;
      }
      const rawField = params.field;
      const camelField = rawField.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      const field = rawField in (items[0] || {}) ? rawField : camelField;
      const rawValue = params.value;
      let values: string[] = [];
      if (Array.isArray(rawValue)) {
        values = rawValue.map(String);
      } else if (rawValue !== undefined) {
        values = String(rawValue).split(',').map((val) => val.trim()).filter(Boolean);
      }

      return items.filter((item) => {
        const itemValue = item?.[field];
        if (values.length === 0) {
          return true;
        }
        return values.includes(String(itemValue));
      });
    };

    if (tableKey === 'geo') {
      return this.fetchGeosWithAssocs().pipe(
        map((items) => filterParams(items)),
        catchError(this.handleError)
      );
    }
    if (tableKey === 'product_type' || tableKey === 'producttype') {
      return this.apiService.getLookup<LookupRecord>('product-types').pipe(
        map((items) => filterParams(items || [])),
        catchError(this.handleError)
      );
    }
    if (tableKey === 'product_category_type' || tableKey === 'productcategorytype') {
      return this.apiService.getLookup<LookupRecord>('product-category-types').pipe(
        map((items) => filterParams(items || [])),
        catchError(this.handleError)
      );
    }
    if (tableKey === 'productpricetype') {
      return this.apiService.getLookup<LookupRecord>('product-price-types').pipe(
        map((items) => filterParams(items || [])),
        catchError(this.handleError)
      );
    }
    if (tableKey === 'goodidentificationtype' || tableKey === 'good_identification_type') {
      return this.apiService.getLookup<LookupRecord>('good-identification-types').pipe(
        map((items) => filterParams(items || [])),
        catchError(this.handleError)
      );
    }
    if (tableKey === 'product_feature_appl_type' || tableKey === 'productfeatureappltype') {
      return this.apiService.getWms<LookupRecord[]>('/product-feature-appl-types').pipe(
        map((items) => filterParams(items || [])),
        catchError(this.handleError)
      );
    }
    if (tableKey === 'variance_reason' || tableKey === 'variancereason') {
      return this.apiService.getWms<LookupRecord[]>('/variance-reasons').pipe(
        map((items) => filterParams(items || [])),
        catchError(this.handleError)
      );
    }
    if (tableKey === 'productpricepurpose') {
      const purposes = [
        { productPricePurposeId: 'DEPOSIT', description: 'Deposit price' },
        { productPricePurposeId: 'PURCHASE', description: 'Purchase/Initial' },
        { productPricePurposeId: 'RECURRING_CHARGE', description: 'Recurring Charge' },
        { productPricePurposeId: 'USAGE_CHARGE', description: 'Usage Charge' },
        { productPricePurposeId: 'COMPONENT_PRICE', description: 'Component Price' },
      ];
      return of(filterParams(purposes));
    }
    if (tableKey === 'roletypes') {
      if (params.field === 'parentTypeId' && params.value) {
        const parentTypeId = Array.isArray(params.value) ? String(params.value[0]) : String(params.value);
        return this.apiService.getLookup<RoleTypeLookupItem>('role-types', parentTypeId).pipe(
          map((items) => filterParams(items || [])),
          catchError(this.handleError)
        );
      }
      return this.apiService.getLookup<RoleTypeLookupItem>('role-types').pipe(
        map((items) => filterParams(items || [])),
        catchError(this.handleError)
      );
    }

    return of([]);
  }

  getValidStatusChanges(statusId: string): Observable<{ statusIdTo?: string; transitionName?: string; description?: string }[]> {
    return this.apiService.get<any>(`/common/status-valid-changes/by-status/${encodeURIComponent(statusId)}`).pipe(
      map((res: any) => {
        const body = res?.data ?? res?.responseMap ?? res;
        if (Array.isArray(body)) return body;
        if (Array.isArray(body?.resultList)) return body.resultList;
        return [];
      }),
      catchError(() => of([]))
    );
  }

  // this.getLookupResults({ field: 'geo_type_id', value: 'COUNTRY' }, 'geo');

  private fetchGeosWithAssocs(): Observable<GeoRecord[]> {
    if (!this.geosCache$) {
      this.geosCache$ = forkJoin({
        geos: this.apiService.getLookup<GeoRecord>('geos'),
        assocs: this.apiService.getLookup<GeoAssocLookupItem>('geo-assocs'),
      }).pipe(
        map(({ geos, assocs }) => {
          const assocMap = this.buildGeoCountryMap(assocs || []);
          return this.normalizeGeos(geos || [], assocMap);
        }),
        shareReplay(1),
        catchError((error) => {
          this.geosCache$ = null;
          return this.handleError(error);
        })
      );
    }
    return this.geosCache$;
  }

  private buildGeoCountryMap(assocs: GeoAssocLookupItem[]): Map<string, string> {
    const map = new Map<string, string>();
    (assocs || []).forEach((assoc) => {
      const assocType = assoc?.geoAssocTypeId ?? assoc?.geo_assoc_type_id;
      if (assocType && assocType !== 'REGIONS') {
        return;
      }
      const countryId = assoc?.geoId ?? assoc?.geo_id;
      const regionId = assoc?.geoIdTo ?? assoc?.geo_id_to;
      if (countryId && regionId) {
        map.set(String(regionId).trim(), String(countryId).trim());
      }
    });
    return map;
  }

  private normalizeGeos(items: GeoRecord[], assocMap: Map<string, string>): GeoRecord[] {
    return (items || []).map((geo) => {
      const geoId = geo?.geoId ?? geo?.geo_id;
      const geoTypeId = geo?.geoTypeId ?? geo?.geo_type_id;
      const geoName = geo?.geoName ?? geo?.geo_name;
      const geoCode = geo?.geoCode ?? geo?.geo_code;
      const geoSecCode = geo?.geoSecCode ?? geo?.geo_sec_code;
      const assocCountry = assocMap.get(String(geoId));
      const countryGeoId =
        geo?.country_geo_id ||
        assocCountry ||
        (typeof geoId === 'string' && geoId.includes('_') ? geoId.split('_')[0] : undefined);

      return {
        ...geo,
        geoId,
        geoTypeId,
        geoName,
        geoCode,
        geoSecCode,
        geo_id: geoId,
        geo_type_id: geoTypeId,
        geo_name: geoName,
        geo_code: geoCode,
        geo_sec_code: geoSecCode,
        country_geo_id: countryGeoId,
      };
    });
  }
  private handleError(error: unknown): Observable<never> {
    return throwError(() => error);
  }

  private cachedRequest<T>(
    cache: Map<string, Observable<T>>,
    key: string,
    requestFactory: () => Observable<T>
  ): Observable<T> {
    if (!cache.has(key)) {
      const request$ = requestFactory().pipe(
        shareReplay(1),
        catchError((error) => {
          cache.delete(key);
          return this.handleError(error);
        })
      );
      cache.set(key, request$);
    }
    return cache.get(key)!;
  }

}

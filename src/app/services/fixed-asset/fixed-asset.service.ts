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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../common/api.service';

export interface FixedAsset {
  id?: number;
  fixedAssetId?: string;
  fixedAssetTypeId?: string;
  parentFixedAssetId?: string;
  instanceOfProductId?: string;
  classEnumId?: string;
  partyId?: string;
  roleTypeId?: string;
  fixedAssetName?: string;
  acquireOrderId?: string;
  acquireOrderItemSeqId?: string;
  dateAcquired?: string;
  dateLastServiced?: string;
  dateNextService?: string;
  expectedEndOfLife?: string;
  actualEndOfLife?: string;
  productionCapacity?: number;
  uomId?: string;
  calendarId?: string;
  serialNumber?: string;
  locatedAtFacilityId?: string;
  locatedAtLocationSeqId?: string;
  salvageValue?: number;
  depreciation?: number;
  purchaseCost?: number;
  purchaseCostUomId?: string;
  quantity?: number;
  annualFlightHours?: number;
  oemDiscount?: number;
  inventoryItemId?: string;
  workEffortId?: string;
  acquireJobId?: string;
  currentStatusId?: string;
  receiptId?: string;
  taAcquisitionSlot?: string;
  reasonEnumId?: string;
  buildCost?: string;
}

export interface FixedAssetTypeLookup {
  fixedAssetTypeId?: string;
  description?: string;
  hasTable?: boolean;
}

export interface FixedAssetStatusLookup {
  statusId?: string;
  description?: string;
  statusTypeId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FixedAssetService {
  constructor(private apiService: ApiService) {}

  listFixedAssets(): Observable<FixedAsset[]> {
    return this.apiService.get<any>('/common/accounting/fixed-assets').pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  getFixedAsset(id: string | number): Observable<FixedAsset> {
    return this.apiService.get<any>(`/common/accounting/fixed-assets/${encodeURIComponent(String(id))}`).pipe(
      map((res) => (res?.data ?? res) as FixedAsset)
    );
  }

  createFixedAsset(payload: Partial<FixedAsset>): Observable<FixedAsset> {
    return this.apiService.post<any>('/common/accounting/fixed-assets', payload).pipe(
      map((res) => (res?.data ?? res) as FixedAsset)
    );
  }

  updateFixedAsset(id: string | number, payload: Partial<FixedAsset>): Observable<FixedAsset> {
    return this.apiService.put<any>(`/common/accounting/fixed-assets/${encodeURIComponent(String(id))}`, payload).pipe(
      map((res) => (res?.data ?? res) as FixedAsset)
    );
  }

  deleteFixedAsset(id: string | number): Observable<unknown> {
    return this.apiService.delete<any>(`/common/accounting/fixed-assets/${encodeURIComponent(String(id))}`).pipe(
      map((res) => res?.data ?? res)
    );
  }

  listFixedAssetTypes(): Observable<FixedAssetTypeLookup[]> {
    return this.apiService.get<any>('/common/accounting/fixed-asset-types').pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }
}

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
import { ApiService } from '../common/api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AssetService {
  constructor(private apiService: ApiService) { }

  getAssets(pageIndex: number, keyword: string, facilityId?: string, statusId?: string, productId?: string): Observable<any> {
    const params = new URLSearchParams();
    params.append('page', pageIndex.toString());
    params.append('size', '10');
    if (keyword) {
      params.append('queryString', keyword);
    }
    if (facilityId) {
      params.append('facilityId', facilityId);
    }
    if (statusId) {
      params.append('statusId', statusId);
    }
    if (productId) {
      params.append('productId', productId);
    }

    const url = `/common/assets?${params.toString()}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => {
        const list = Array.isArray(res?.data?.resultList) ? res.data.resultList : [];
        const count = res?.data?.totalCount ?? 0;
        return {
          resultList: list,
          documentList: list,
          totalCount: count,
          responseMap: {
            resultList: list,
            total: count
          }
        };
      })
    );
  }

  getAsset(assetId: string): Observable<any> {
    const url = `/common/assets/${encodeURIComponent(assetId)}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => res?.data ?? res)
    );
  }

  updateAsset(assetId: string, payload: any): Observable<any> {
    const url = `/common/assets/${encodeURIComponent(assetId)}`;
    return this.apiService.patch<any>(url, payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  acceptInspection(assetId: string, payload: { inspectionNote?: string; inspectionMeasurements?: string } = {}): Observable<any> {
    const url = `/common/assets/${encodeURIComponent(assetId)}/inspection/accept`;
    return this.apiService.post<any>(url, payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  rejectInspection(assetId: string, payload: { inspectionNote?: string; inspectionMeasurements?: string } = {}): Observable<any> {
    const url = `/common/assets/${encodeURIComponent(assetId)}/inspection/reject`;
    return this.apiService.post<any>(url, payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  bulkInspectionDecision(action: 'ACCEPT' | 'REJECT' | 'REPAIR' | 'DEFECTIVE', inventoryItemIds: string[]): Observable<any> {
    const url = '/common/assets/inspection/decision';
    return this.apiService.post<any>(url, { action, inventoryItemIds }).pipe(
      map((res) => res?.data ?? res)
    );
  }

  getInventoryItemTypes(): Observable<any> {
    const url = '/common/inventory-item-types';
    return this.apiService.get<any>(url).pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  getOrderReservations(inventoryItemId: string): Observable<any> {
    const url = `/common/order-item-ship-grp-inv-res?inventoryItemId=${encodeURIComponent(inventoryItemId)}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  getWorkEffortReservations(inventoryItemId: string): Observable<any> {
    const url = `/common/work-effort-inv-reservations?inventoryItemId=${encodeURIComponent(inventoryItemId)}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  receiveAsset(params: any): Observable<any> {
    const url = '/common/assets/receive';
    return this.apiService.post<any>(url, params).pipe(
      map((res) => res?.data ?? res)
    );
  }

  createPhysicalInventoryVariance(assetId: string, variance: any): Observable<any> {
    const url = `/common/assets/${encodeURIComponent(assetId)}/variances`;
    return this.apiService.post<any>(url, variance).pipe(
      map((res) => res?.data ?? res)
    );
  }

  searchMoveStocks(params: {
    facilityId: string;
    locationSeqId?: string;
    productId?: string;
    page?: number;
    size?: number;
  }): Observable<any> {
    const query = new URLSearchParams();
    query.append('facilityId', params.facilityId);
    query.append('page', String(params.page ?? 0));
    query.append('size', String(params.size ?? 50));
    if (params.locationSeqId) {
      query.append('locationSeqId', params.locationSeqId);
    }
    if (params.productId) {
      query.append('productId', params.productId);
    }
    return this.apiService.get<any>(`/common/asset-moves?${query.toString()}`).pipe(
      map((res) => {
        const list = Array.isArray(res?.data?.resultList) ? res.data.resultList : [];
        const count = res?.data?.totalCount ?? 0;
        return {
          resultList: list,
          documentList: list,
          totalCount: count,
          documentListCount: count
        };
      })
    );
  }

  moveStock(payload: {
    inventoryItemId: string;
    toLocationSeqId: string;
    moveQuantity: string | number;
  }): Observable<any> {
    return this.apiService.post<any>('/common/asset-moves', payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  getVarianceReasons(): Observable<any> {
    const url = '/common/variance-reasons';
    return this.apiService.get<any>(url).pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  disassembleAsset(inventoryItemId: string): Observable<{
    childItemIds?: string[];
    workEffortId?: string;
    workflowMode?: 'BOM_DISASSEMBLY' | 'SAME_PRODUCT_REPAIR';
    requiresSerialConfirmation?: boolean;
  }> {
    return this.apiService.post<any>(
      `/common/assets/${encodeURIComponent(inventoryItemId)}/disassemble`, {}
    ).pipe(
      map((res) => res?.data ?? res)
    );
  }

  startRepairJob(inventoryItemId: string): Observable<{
    workEffortId?: string;
    jobId?: string;
    currentStatusId?: string;
  }> {
    return this.apiService.post<any>(
      `/common/assets/${encodeURIComponent(inventoryItemId)}/repair-job`, {}
    ).pipe(
      map((res) => res?.data ?? res)
    );
  }

  getAssetChildren(inventoryItemId: string): Observable<any[]> {
    return this.apiService.get<any>(
      `/common/assets/${encodeURIComponent(inventoryItemId)}/children`
    ).pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }
}

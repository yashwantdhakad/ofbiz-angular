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
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../common/api.service';
import {
  Lot,
  LotAttribute,
  LotCreatePayload,
  LotDetailResponse,
  LotListResponse,
  LotUpdatePayload,
  InventoryItemWithLot,
  TraceabilityTree,
} from '@ofbiz/models/lot.model';

@Injectable({
  providedIn: 'root',
})
export class LotService {
  constructor(private apiService: ApiService) { }

  listLots(page: number = 0, query: string = '', pageSize: number = 25): Observable<LotListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    if (query?.trim()) {
      params.append('query', query.trim());
    }
    return this.apiService.get<any>(`/common/lots/search?${params.toString()}`).pipe(
      map((res) => ({
        resultList: Array.isArray(res?.data?.resultList) ? res.data.resultList : [],
        documentList: Array.isArray(res?.data?.documentList) ? res.data.documentList : [],
        documentListCount: res?.data?.documentListCount ?? 0,
      } as LotListResponse))
    );
  }

  createLot(payload: LotCreatePayload): Observable<Lot> {
    return this.apiService.post<any>('/common/lots', payload).pipe(
      map((res) => (res?.data ?? res) as Lot)
    );
  }

  updateLot(id: number, payload: LotUpdatePayload): Observable<Lot> {
    return this.apiService.put<any>(`/common/lots/${id}`, payload).pipe(
      map((res) => (res?.data ?? res) as Lot)
    );
  }

  getLotByLotId(lotId: string): Observable<Lot> {
    return this.apiService.get<any>(`/common/lots/code/${encodeURIComponent(lotId)}`).pipe(
      map((res) => (res?.data ?? res) as Lot)
    );
  }

  getLotDetail(lotId: string): Observable<LotDetailResponse> {
    const lot$ = this.apiService.get<any>(`/common/lots/code/${encodeURIComponent(lotId)}`).pipe(
      map((res) => (res?.data ?? res) as Lot)
    );
    const items$ = this.apiService.get<any>(`/common/lots/code/${encodeURIComponent(lotId)}/inventory-items`).pipe(
      map((res) => {
        const raw = res?.data ?? res;
        return (Array.isArray(raw?.resultList) ? raw.resultList : []) as any[];
      })
    );
    return forkJoin({ lot: lot$, inventoryItems: items$ }).pipe(
      map(({ lot, inventoryItems }) => ({ lot, inventoryItems } as LotDetailResponse))
    );
  }

  listInventoryItemsByLotId(lotId: string): Observable<unknown> {
    return this.apiService.get<any>(`/common/lots/code/${encodeURIComponent(lotId)}/inventory-items`).pipe(
      map((res) => res?.data ?? res)
    );
  }

  getLotAttributes(lotId: string): Observable<LotAttribute[]> {
    return this.apiService.get<any>(`/common/lots/code/${encodeURIComponent(lotId)}/attributes`).pipe(
      map((res) => (Array.isArray(res?.data?.attributes) ? res.data.attributes : []) as LotAttribute[])
    );
  }

  setLotAttribute(lotId: string, attrName: string, attrValue: string): Observable<void> {
    return this.apiService.post<any>(`/common/lots/code/${encodeURIComponent(lotId)}/attributes`, { lotId, attrName, attrValue }).pipe(
      map(() => void 0)
    );
  }

  getInventoryItemWithLot(inventoryItemId: string): Observable<InventoryItemWithLot> {
    return this.apiService.get<any>(`/common/inventory-items/${encodeURIComponent(inventoryItemId)}/with-lot`).pipe(
      map((res) => (res?.data ?? res) as InventoryItemWithLot)
    );
  }

  getLotTraceabilityTree(lotId: string): Observable<TraceabilityTree> {
    return this.apiService.get<any>(`/common/lots/code/${encodeURIComponent(lotId)}/traceability-tree`).pipe(
      map((res) => (res?.data?.tree ?? res?.tree ?? {}) as TraceabilityTree)
    );
  }
}

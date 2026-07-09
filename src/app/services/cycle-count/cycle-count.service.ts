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

export interface CycleCountPendingLocation {
  facilityId: string;
  facilityName?: string;
  locationSeqId: string;
  areaId?: string;
  aisleId?: string;
  sectionId?: string;
  levelId?: string;
  positionId?: string;
  lastCountDate?: string;
  nextCountDate?: string;
  totalItems?: number;
}

export interface CycleCountSessionListItem {
  sessionId: string;
  facilityId: string;
  facilityName?: string;
  statusId: string;
  statusDescription?: string;
  uploadedByUserLogin?: string;
  createdDate?: string;
  locations: string[];
  totalItems: number;
  countedItems: number;
}

export interface CycleCountSessionItem {
  inventoryCountItemSeqId: string;
  inventoryItemId: string;
  locationSeqId?: string;
  productId?: string;
  productIdentifier?: string;
  countedQuantity?: number;
  systemQoh?: number;
  variance?: number;
  itemStatusId?: string;
}

export interface CycleCountPendingLocationListResponse {
  items: CycleCountPendingLocation[];
  total: number;
}

export interface CycleCountSessionDetail {
  sessionId: string;
  facilityId: string;
  statusId: string;
  uploadedByUserLogin?: string;
  createdDate?: string;
  locations: string[];
  items: CycleCountSessionItem[];
}

export interface CycleCountVariance {
  inventoryCountItemSeqId: string;
  inventoryItemId: string;
  locationSeqId?: string;
  productId?: string;
  productIdentifier?: string;
  systemQuantityOnHand?: number;
  actualQuantityOnHand?: number;
  varianceQuantityOnHand?: number;
}

@Injectable({ providedIn: 'root' })
export class CycleCountService {
  constructor(private apiService: ApiService) {}

  pendingLocations(params: {
    facilityId: string;
    locationSeqId?: string;
    areaId?: string;
    aisleId?: string;
    sectionId?: string;
    levelId?: string;
    positionId?: string;
    notScannedInLastDays?: number | null;
    scheduledInNextDays?: number | null;
    page?: number;
    size?: number;
  }): Observable<CycleCountPendingLocationListResponse> {
    const query = new URLSearchParams();
    query.set('facilityId', params.facilityId);
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 20));
    if (params.locationSeqId) query.set('locationSeqId', params.locationSeqId);
    if (params.areaId) query.set('areaId', params.areaId);
    if (params.aisleId) query.set('aisleId', params.aisleId);
    if (params.sectionId) query.set('sectionId', params.sectionId);
    if (params.levelId) query.set('levelId', params.levelId);
    if (params.positionId) query.set('positionId', params.positionId);
    if (params.notScannedInLastDays != null) query.set('notScannedInLastDays', String(params.notScannedInLastDays));
    if (params.scheduledInNextDays != null) query.set('scheduledInNextDays', String(params.scheduledInNextDays));

    return this.apiService.get<any>(`/common/cycle-count/pending-locations?${query.toString()}`).pipe(
      map((res) => (res?.data ?? res) as CycleCountPendingLocationListResponse)
    );
  }

  createSession(payload: { facilityId: string; locationSeqIds: string[] }): Observable<CycleCountSessionDetail> {
    return this.apiService.post<any>('/common/cycle-count/sessions', payload).pipe(
      map((res) => (res?.data ?? res) as CycleCountSessionDetail)
    );
  }

  findSessions(params: {
    sessionId?: string;
    facilityId?: string;
    location?: string;
    statuses?: string[];
    page?: number;
    size?: number;
  }): Observable<{ items: CycleCountSessionListItem[]; total: number }> {
    const query = new URLSearchParams();
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 20));
    if (params.sessionId) query.set('sessionId', params.sessionId);
    if (params.facilityId) query.set('facilityId', params.facilityId);
    if (params.location) query.set('location', params.location);
    if (params.statuses && params.statuses.length > 0) query.set('statuses', params.statuses.join(','));
    return this.apiService.get<any>(`/common/cycle-count/sessions?${query.toString()}`).pipe(
      map((res) => (res?.data ?? res) as { items: CycleCountSessionListItem[]; total: number })
    );
  }

  getSession(sessionId: string): Observable<CycleCountSessionDetail> {
    return this.apiService.get<any>(`/common/cycle-count/sessions/${encodeURIComponent(sessionId)}`).pipe(
      map((res) => (res?.data ?? res) as CycleCountSessionDetail)
    );
  }

  updateCounts(sessionId: string, items: Array<{ inventoryCountItemSeqId: string; countedQuantity: number | null }>): Observable<CycleCountSessionDetail> {
    return this.apiService.put<any>(`/common/cycle-count/sessions/${encodeURIComponent(sessionId)}/counts`, { items }).pipe(
      map((res) => (res?.data ?? res) as CycleCountSessionDetail)
    );
  }

  submitForReview(sessionId: string): Observable<CycleCountSessionDetail> {
    return this.apiService.post<any>(`/common/cycle-count/sessions/${encodeURIComponent(sessionId)}/submit`, {}).pipe(
      map((res) => (res?.data ?? res) as CycleCountSessionDetail)
    );
  }

  accept(sessionId: string): Observable<CycleCountSessionDetail> {
    return this.apiService.post<any>(`/common/cycle-count/sessions/${encodeURIComponent(sessionId)}/review/accept`, {}).pipe(
      map((res) => (res?.data ?? res) as CycleCountSessionDetail)
    );
  }

  acceptItems(sessionId: string, inventoryCountItemSeqIds: string[]): Observable<CycleCountSessionDetail> {
    return this.apiService.post<any>(
      `/common/cycle-count/sessions/${encodeURIComponent(sessionId)}/review/accept-items`,
      { inventoryCountItemSeqIds }
    ).pipe(
      map((res) => (res?.data ?? res) as CycleCountSessionDetail)
    );
  }

  reject(sessionId: string): Observable<CycleCountSessionDetail> {
    return this.apiService.post<any>(`/common/cycle-count/sessions/${encodeURIComponent(sessionId)}/review/reject`, {}).pipe(
      map((res) => (res?.data ?? res) as CycleCountSessionDetail)
    );
  }

  rejectItems(sessionId: string, inventoryCountItemSeqIds: string[]): Observable<CycleCountSessionDetail> {
    return this.apiService.post<any>(
      `/common/cycle-count/sessions/${encodeURIComponent(sessionId)}/review/reject-items`,
      { inventoryCountItemSeqIds }
    ).pipe(
      map((res) => (res?.data ?? res) as CycleCountSessionDetail)
    );
  }

  report(sessionId: string): Observable<CycleCountVariance[]> {
    return this.apiService.get<any>(`/common/cycle-count/sessions/${encodeURIComponent(sessionId)}/report`).pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }
}

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

@Injectable({
  providedIn: 'root',
})
export class PicklistService {
  constructor(private apiService: ApiService) {}

  getPicklists(filters: {
    facilityId?: string;
    statusId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    size?: number;
  }): Observable<any> {
    const params = new URLSearchParams();
    if (filters.facilityId) params.append('facilityId', filters.facilityId);
    if (filters.statusId) params.append('statusId', filters.statusId);
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    params.append('page', String(filters.page ?? 0));
    params.append('size', String(filters.size ?? 20));
    return this.apiService.get<any>(`/common/picklists-view/summary?${params.toString()}`).pipe(
      map((res) => ({
        resultList: Array.isArray(res?.data?.resultList) ? res.data.resultList : [],
        documentList: Array.isArray(res?.data?.documentList) ? res.data.documentList : [],
        totalCount: res?.data?.totalCount ?? 0,
        documentListCount: res?.data?.documentListCount ?? 0,
      }))
    );
  }

  getPicklist(picklistId: string): Observable<any> {
    const url = `/common/picklists-view/${encodeURIComponent(picklistId)}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => res?.data ?? res)
    );
  }

  getPicklistPdf(picklistId: string): Observable<string> {
    const url = `/common/picklists-view/${encodeURIComponent(picklistId)}/pdf`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => response?.data?.htmlContent ?? response?.htmlContent ?? '')
    );
  }

  getPicklistOrders(filters: {
    statusId?: string;
    facilityId?: string;
  }): Observable<any> {
    const params = new URLSearchParams();
    if (filters.statusId) {
      params.append('statusId', filters.statusId);
    }
    if (filters.facilityId) {
      params.append('facilityId', filters.facilityId);
    }
    const suffix = params.toString();
    const url = suffix ? `/common/picklists/orders?${suffix}` : '/common/picklists/orders';
    return this.apiService.get<any>(url).pipe(
      map((res) => res?.data ?? res)
    );
  }

  getPicklistOrdersByOrder(orderId: string): Observable<any> {
    const url = `/common/picklists/by-order/${encodeURIComponent(orderId)}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => res?.data ?? res)
    );
  }

  getPicklistByBin(picklistBinId: string): Observable<any> {
    const url = `/common/picklists/by-bin/${encodeURIComponent(picklistBinId)}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => res?.data ?? res)
    );
  }

  assignPicker(picklistId: string, partyId: string): Observable<any> {
    const url = '/common/picklist-roles';
    const payload = {
      picklistId,
      partyId,
      roleTypeId: 'PICKER',
      fromDate: new Date().toISOString(),
    };
    return this.apiService.post<any>(url, payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  markPicked(picklistId: string): Observable<any> {
    const url = `/common/picklists/${encodeURIComponent(picklistId)}/mark-picked`;
    return this.apiService.post<any>(url, {}).pipe(
      map((res) => res?.data ?? res)
    );
  }

  createShipmentFromPicklist(picklistId: string): Observable<any> {
    const url = `/common/picklists-view/${encodeURIComponent(picklistId)}/create-shipment`;
    return this.apiService.post<any>(url, {}).pipe(
      map((res) => res?.data ?? res)
    );
  }
}

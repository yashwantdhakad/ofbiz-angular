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
import { base64ToBlob } from '../common/blob.util';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  RoutingApiResponse,
  RoutingDeliverableItem,
  RoutingDetailData,
  WorkEffortListResponse,
} from '@ofbiz/models/manufacturing.model';

@Injectable({
  providedIn: 'root',
})
export class RoutingService {
  constructor(private apiService: ApiService) { }

  private extractServiceList(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data?.resultList)) return response.data.resultList;
    if (Array.isArray(response?.data?.documentList)) return response.data.documentList;
    if (Array.isArray(response?.resultList)) return response.resultList;
    if (Array.isArray(response?.documentList)) return response.documentList;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  }

  private unwrapServiceData<T>(response: any): T {
    return (response?.data ?? response) as T;
  }

  getRoutings(pageIndex: number, pageSize: number, keyword: string, deliverableProductId?: string): Observable<WorkEffortListResponse> {
    const params = new URLSearchParams();
    params.append('page', (pageIndex - 1).toString());
    params.append('size', pageSize.toString());
    params.append('queryString', keyword || '');
    if (deliverableProductId) {
      params.append('deliverableProductId', deliverableProductId);
    }
    return this.apiService.get<any>(`/common/routings?${params.toString()}`).pipe(
      map((response: any) => ({
        resultList: this.extractServiceList(response),
        documentList: this.extractServiceList(response),
        totalElements: response?.data?.totalCount ?? response?.totalCount ?? this.extractServiceList(response).length,
        documentListCount: response?.data?.documentListCount ?? response?.documentListCount ?? this.extractServiceList(response).length,
      } as WorkEffortListResponse))
    );
  }

  getRouting(workEffortId: string): Observable<RoutingApiResponse> {
    return this.apiService.get<any>(`/common/routings/${encodeURIComponent(workEffortId)}`).pipe(
      map((response: any) => this.unwrapServiceData<RoutingApiResponse>(response))
    );
  }

  getRoutingDetail(workEffortId: string): Observable<RoutingApiResponse> {
    return this.getRouting(workEffortId);
  }

  createRouting(params: Partial<RoutingDetailData>): Observable<unknown> {
    return this.apiService.post<any>('/common/routings', { ...params, workEffortTypeId: 'ROUTING' }).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  updateRouting(workEffortId: string, params: Partial<RoutingDetailData>): Observable<unknown> {
    return this.apiService.put<any>(`/common/routings/${encodeURIComponent(workEffortId)}`, params).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  addOperation(workEffortId: string, params: Record<string, unknown>): Observable<unknown> {
    return this.apiService.post<any>(`/common/routings/${encodeURIComponent(workEffortId)}/operations`, params).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  deleteOperation(workEffortId: string, operationId: string): Observable<unknown> {
    return this.apiService.delete<any>(`/common/routings/${encodeURIComponent(workEffortId)}/operations/${operationId}`).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  addDeliverableItem(workEffortId: string, params: Partial<RoutingDeliverableItem>): Observable<unknown> {
    return this.apiService.post<any>(`/common/routings/${encodeURIComponent(workEffortId)}/deliverable-items`, params).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  updateDeliverableItem(workEffortId: string, wegsId: number, params: Partial<RoutingDeliverableItem>): Observable<unknown> {
    return this.apiService.put<any>(`/common/routings/${encodeURIComponent(workEffortId)}/deliverable-items/${wegsId}`, params).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  deleteDeliverableItem(workEffortId: string, wegsId: number): Observable<unknown> {
    return this.apiService.delete<any>(`/common/routings/${encodeURIComponent(workEffortId)}/deliverable-items/${wegsId}`).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  addRoutingContent(workEffortId: string, formData: FormData, workEffortContentTypeId: string = 'DOCUMENT'): Observable<unknown> {
    const url = `/common/routings/${encodeURIComponent(workEffortId)}/contents?workEffortContentTypeId=${encodeURIComponent(workEffortContentTypeId)}`;
    return this.apiService.postFormData(url, formData).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  deleteRoutingContent(workEffortId: string, contentId: string): Observable<unknown> {
    return this.apiService.delete<any>(`/common/routings/${encodeURIComponent(workEffortId)}/contents/${encodeURIComponent(contentId)}`).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  downloadRoutingContent(workEffortId: string, contentId: string): Observable<Blob> {
    const url = `/common/routings/${encodeURIComponent(workEffortId)}/contents/${encodeURIComponent(contentId)}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => base64ToBlob(
        response?.data?.fileBytes,
        response?.data?.mimeType || 'application/octet-stream'
      ))
    );
  }
}

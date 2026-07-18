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
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  AddJobCostPayload,
  BomDetail,
  BomListResponse,
  JobCostSummary,
  JobDetailResponse,
  JobExecutionChecklistItem,
  JobExecutionChecklistPayload,
  JobIssuedMaterial,
  JobNotePayload,
  JobNoteRecord,
  JobProductLine,
  JobProducedItem,
  JobUpdatePayload,
  OperationDetailResponse,
  EditOperationDialogResult,
  WorkEffortListResponse,
  WorkEffortLookupItem,
} from '@ofbiz/models/manufacturing.model';
import {
  ProductAssociation,
  ProductAssocTypeOption,
  ProductDetailResponse,
} from '@ofbiz/models/product.model';
import {
  SteelCuttingPayload,
  SteelCuttingResult,
  InventoryItemWithLot,
} from '@ofbiz/models/lot.model';

@Injectable({
  providedIn: 'root',
})
export class ManufacturingService {
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

  getJobs(pageIndex: number, pageSize: number, keyword: string, purposeTypeId?: string): Observable<WorkEffortListResponse> {
    const params = new URLSearchParams();
    params.append('page', (pageIndex - 1).toString()); // 0-indexed page in OFBiz
    params.append('size', pageSize.toString());
    if (keyword) {
      params.append('queryString', keyword);
    }
    if (purposeTypeId) {
      params.append('purposeTypeId', purposeTypeId);
    }

    const url = `/common/jobs?${params.toString()}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => ({
        resultList: this.extractServiceList(response),
        documentList: this.extractServiceList(response),
        totalElements: response?.data?.totalCount ?? response?.totalCount ?? this.extractServiceList(response).length,
        documentListCount: response?.data?.documentListCount ?? response?.documentListCount ?? this.extractServiceList(response).length,
      } as WorkEffortListResponse))
    );
  }

  getJob(workEffortId: string): Observable<JobDetailResponse> {
    const url = `/common/jobs/${encodeURIComponent(workEffortId)}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => this.unwrapServiceData<JobDetailResponse>(response))
    );
  }

  getJobCardPdf(workEffortId: string): Observable<Blob> {
    return this.apiService.get<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/job-card/pdf`).pipe(
      map((response: any) => base64ToBlob(response?.data?.pdfBytes, 'application/pdf'))
    );
  }

  createJob(params: Partial<JobDetailResponse>): Observable<unknown> {
    return this.apiService.post<any>('/common/jobs', params).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  updateJob(workEffortId: string, params: JobUpdatePayload): Observable<unknown> {
    return this.apiService.put<any>(`/common/jobs/${encodeURIComponent(workEffortId)}`, params).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  getJobBom(productId: string): Observable<unknown> {
    return this.apiService.get<any>(`/common/boms/${encodeURIComponent(productId)}`).pipe(
      map((response: any) => {
        const components = [response?.data?.components, response?.components]
          .find((candidate: any) => Array.isArray(candidate)) ?? [];
        return components.map((item: any) => ({
          productId: item?.productId,
          productName: item?.productName,
          estimatedQuantity: item?.quantity ?? item?.estimatedQuantity ?? '',
        }));
      })
    );
  }

  getBoms(pageIndex: number, pageSize: number, queryString: string, bomTypeId?: string): Observable<BomListResponse> {
    const params = new URLSearchParams();
    params.append('page', (pageIndex - 1).toString());
    params.append('size', pageSize.toString());
    if (queryString) {
      params.append('queryString', queryString);
    }
    if (bomTypeId) {
      params.append('bomTypeId', bomTypeId);
    }
    return this.apiService.get<any>(`/common/boms?${params.toString()}`).pipe(
      map((response: any) => ({
        resultList: this.extractServiceList(response),
        documentList: this.extractServiceList(response),
        documentListCount: response?.data?.documentListCount ?? response?.documentListCount ?? this.extractServiceList(response).length,
      } as BomListResponse))
    );
  }

  getBomDetail(productId: string): Observable<BomDetail> {
    return this.apiService.get<any>(`/common/boms/${encodeURIComponent(productId)}`).pipe(
      map((response: any) => this.unwrapServiceData<BomDetail>(response))
    );
  }

  addBomDocument(productId: string, formData: FormData, productContentTypeId: string = 'DOCUMENT'): Observable<unknown> {
    formData.set('productContentTypeId', productContentTypeId);
    return this.apiService.postWmsFormData(`/common/products/${encodeURIComponent(productId)}/contents`, formData).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  downloadBomDocument(productId: string, contentId: string): Observable<Blob> {
    const url = `/common/products/${encodeURIComponent(productId)}/contents/${encodeURIComponent(contentId)}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => base64ToBlob(
        response?.data?.fileBytes,
        response?.data?.mimeType || 'application/octet-stream'
      ))
    );
  }

  getProductDetail(productId: string): Observable<ProductDetailResponse> {
    return this.apiService.get<any>(`/common/products/${encodeURIComponent(productId)}`).pipe(
      map((response: any) => this.unwrapServiceData<ProductDetailResponse>(response))
    );
  }

  getProductDetailSafe(productId: string): Observable<ProductDetailResponse | null> {
    const params = new URLSearchParams({
      page: '0',
      size: '1',
      queryString: productId,
    });
    return this.apiService.get<any>(`/common/products?${params.toString()}`).pipe(
      map((response: any) => {
        const list = this.extractServiceList(response);
        const match = list.find((item: any) => item?.productId === productId) || list[0];
        return match?.productId || null;
      }),
      switchMap((matchedId) => {
        if (!matchedId) {
          return of(null);
        }
        return this.apiService.get<any>(`/common/products/${encodeURIComponent(matchedId)}`).pipe(
          map((response: any) => this.unwrapServiceData<ProductDetailResponse>(response))
        );
      })
    );
  }

  getProductAssocTypes(): Observable<ProductAssocTypeOption[]> {
    return this.apiService.get<any>('/common/product-assoc-types').pipe(
      map((response: any) => this.extractServiceList(response))
    );
  }

  getProductAssocs(): Observable<ProductAssociation[]> {
    return this.apiService.get<any>('/common/product-assocs').pipe(
      map((response: any) => this.extractServiceList(response))
    );
  }

  addProductAssoc(productId: string, payload: Partial<ProductAssociation>): Observable<ProductAssociation> {
    const productIdTo =
      payload.productIdTo ?? payload.toProductId ?? undefined;
    const productAssocTypeId =
      payload.productAssocTypeId ?? payload.productAssocTypeEnumId ?? undefined;
    return this.apiService.post<any>(`/common/product-assocs`, {
      productId,
      ...payload,
      ...(productIdTo ? { productIdTo, toProductId: productIdTo } : {}),
      ...(productAssocTypeId ? { productAssocTypeId, productAssocTypeEnumId: productAssocTypeId } : {}),
    }).pipe(
      map((response: any) => this.unwrapServiceData<ProductAssociation>(response))
    );
  }

  updateProductAssoc(assocId: number, payload: Partial<ProductAssociation>): Observable<ProductAssociation> {
    return this.apiService.put<any>(`/common/product-assocs/${assocId}`, payload).pipe(
      map((response: any) => this.unwrapServiceData<ProductAssociation>(response))
    );
  }

  expireProductAssoc(assocId: number): Observable<unknown> {
    return this.apiService.post<any>(`/common/product-assocs/${assocId}/expire`, {}).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  approveJob(workEffortId: string): Observable<unknown> {
    return this.apiService.post<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/approve`, {}).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  startJob(workEffortId: string): Observable<unknown> {
    return this.apiService.post<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/start`, {}).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  completeJob(workEffortId: string): Observable<unknown> {
    return this.apiService.post<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/complete`, {}).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  closeJob(workEffortId: string): Observable<unknown> {
    return this.apiService.post<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/close`, {}).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  assignJobWorker(workEffortId: string, partyId: string): Observable<unknown> {
    return this.apiService.post<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/assign-worker`, { partyId }).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  addConsumable(workEffortId: string, payload: Partial<JobProductLine>): Observable<unknown> {
    return this.apiService.post<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/consumables`, payload).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  updateConsumable(
    workEffortId: string,
    wegsId: number,
    payload: Partial<JobProductLine>
  ): Observable<unknown> {
    return this.apiService.put<any>(
      `/common/jobs/${encodeURIComponent(workEffortId)}/consumables/${wegsId}`,
      payload
    ).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  reserveConsumable(workEffortId: string, wegsId: number, payload: Partial<JobProductLine>): Observable<unknown> {
    return this.apiService.post<any>(
      `/common/jobs/${encodeURIComponent(workEffortId)}/consumables/${wegsId}/reserve`,
      payload
    ).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  bulkReserveConsumables(workEffortId: string, payload: Record<string, unknown> = {}): Observable<unknown> {
    return this.apiService.post<any>(
      `/common/jobs/${encodeURIComponent(workEffortId)}/consumables/bulk-reserve`,
      payload
    ).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  getConsumableInventoryOptions(
    workEffortId: string,
    wegsId: number,
    lotId?: string,
    containerId?: string
  ): Observable<unknown> {
    const params = new URLSearchParams();
    if (lotId) {
      params.append('lotId', lotId);
    }
    if (containerId) {
      params.append('containerId', containerId);
    }
    const query = params.toString();
    const suffix = query ? `?${query}` : '';
    return this.apiService.get<any>(
      `/common/jobs/${encodeURIComponent(workEffortId)}/consumables/${wegsId}/inventory-options${suffix}`
    ).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  releaseConsumable(workEffortId: string, wegsId: number, payload: Partial<JobProductLine>): Observable<unknown> {
    return this.apiService.post<any>(
      `/common/jobs/${encodeURIComponent(workEffortId)}/consumables/${wegsId}/release`,
      payload
    ).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  issueConsumable(workEffortId: string, wegsId: number, payload: Partial<JobProductLine>): Observable<unknown> {
    return this.apiService.post<any>(
      `/common/jobs/${encodeURIComponent(workEffortId)}/consumables/${wegsId}/issue`,
      payload
    ).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  bulkIssueConsumables(workEffortId: string, payload: Record<string, unknown> = {}): Observable<unknown> {
    return this.apiService.post<any>(
      `/common/jobs/${encodeURIComponent(workEffortId)}/consumables/bulk-issue`,
      payload
    ).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  cancelConsumable(workEffortId: string, wegsId: number): Observable<unknown> {
    return this.apiService.post<any>(
      `/common/jobs/${encodeURIComponent(workEffortId)}/consumables/${wegsId}/cancel`,
      {}
    ).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  returnIssuedMaterial(workEffortId: string, payload: Partial<JobIssuedMaterial>): Observable<unknown> {
    return this.apiService.post<any>(
      `/common/jobs/${encodeURIComponent(workEffortId)}/issued-materials/return`,
      payload
    ).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  produceItem(workEffortId: string, payload: Partial<JobProducedItem>): Observable<unknown> {
    return this.apiService.post<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/produced-items`, payload).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  startJobTask(workEffortId: string, taskId: string): Observable<unknown> {
    return this.apiService.post<any>(
      `/common/jobs/${encodeURIComponent(workEffortId)}/tasks/${encodeURIComponent(taskId)}/start`, {}
    ).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  completeJobTask(
    workEffortId: string,
    taskId: string,
    payload: { actualHours?: number; actualSetupHours?: number; hourlyRate?: number } = {}
  ): Observable<unknown> {
    return this.apiService.post<any>(
      `/common/jobs/${encodeURIComponent(workEffortId)}/tasks/${encodeURIComponent(taskId)}/complete`, payload
    ).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  getJobCosts(workEffortId: string): Observable<JobCostSummary> {
    return this.apiService.get<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/costs`).pipe(
      map((response: any) => this.unwrapServiceData<JobCostSummary>(response))
    );
  }

  addJobCost(workEffortId: string, payload: AddJobCostPayload): Observable<unknown> {
    return this.apiService.post<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/costs`, payload).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  deleteJobCost(workEffortId: string, costId: number): Observable<unknown> {
    return this.apiService.delete<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/costs/${costId}`).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  addJobContent(workEffortId: string, formData: FormData, workEffortContentTypeId: string = 'DOCUMENT'): Observable<unknown> {
    const url = `/common/jobs/${encodeURIComponent(workEffortId)}/contents?workEffortContentTypeId=${encodeURIComponent(workEffortContentTypeId)}`;
    return this.apiService.postFormData(url, formData).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  deleteJobContent(workEffortId: string, contentId: string): Observable<unknown> {
    return this.apiService.delete<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/contents/${encodeURIComponent(contentId)}`).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  downloadJobContent(workEffortId: string, contentId: string): Observable<Blob> {
    const url = `/common/jobs/${encodeURIComponent(workEffortId)}/contents/${encodeURIComponent(contentId)}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => base64ToBlob(
        response?.data?.fileBytes,
        response?.data?.mimeType || 'application/octet-stream'
      ))
    );
  }

  createJobNote(workEffortId: string, payload: JobNotePayload): Observable<JobNoteRecord> {
    return this.apiService.post<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/notes`, payload).pipe(
      map((response: any) => this.unwrapServiceData<JobNoteRecord>(response))
    );
  }

  updateJobNote(workEffortId: string, noteId: number, payload: JobNotePayload): Observable<JobNoteRecord> {
    return this.apiService.put<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/notes/${noteId}`, payload).pipe(
      map((response: any) => this.unwrapServiceData<JobNoteRecord>(response))
    );
  }

  deleteJobNote(workEffortId: string, noteId: number): Observable<unknown> {
    return this.apiService.delete<any>(`/common/jobs/${encodeURIComponent(workEffortId)}/notes/${noteId}`).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  listJobExecutionChecklist(workEffortId: string): Observable<JobExecutionChecklistItem[]> {
    return this.apiService.get<any>(
      `/common/jobs/${encodeURIComponent(workEffortId)}/execution-checklist`
    ).pipe(
      map((response: any) => this.extractServiceList(response))
    );
  }

  addJobExecutionChecklist(
    workEffortId: string,
    payload: JobExecutionChecklistPayload
  ): Observable<JobExecutionChecklistItem> {
    return this.apiService.post<any>(
      `/common/jobs/${encodeURIComponent(workEffortId)}/execution-checklist`,
      payload
    ).pipe(
      map((response: any) => this.unwrapServiceData<JobExecutionChecklistItem>(response))
    );
  }

  getOperationDetail(workEffortId: string): Observable<OperationDetailResponse> {
    return this.apiService.get<any>(`/common/routings/operations/${encodeURIComponent(workEffortId)}`).pipe(
      map((response: any) => this.unwrapServiceData<OperationDetailResponse>(response))
    );
  }

  updateOperation(workEffortId: string, params: EditOperationDialogResult): Observable<OperationDetailResponse> {
    return this.apiService.put<any>(
      `/common/routings/operations/${encodeURIComponent(workEffortId)}`,
      params
    ).pipe(
      map((response: any) => this.unwrapServiceData<OperationDetailResponse>(response))
    );
  }

  // Generic work effort methods (used for operation/task screens)
  getWorkEfforts(params?: {
    workEffortIds?: string;
    workEffortTypeIds?: string;
    queryString?: string;
    size?: number;
  }): Observable<WorkEffortListResponse> {
    const search = new URLSearchParams();
    if (params?.workEffortIds) {
      search.append('workEffortIds', params.workEffortIds);
    }
    if (params?.workEffortTypeIds) {
      search.append('workEffortTypeIds', params.workEffortTypeIds);
    }
    if (params?.queryString) {
      search.append('queryString', params.queryString);
    }
    if (params?.size) {
      search.append('size', String(params.size));
    }
    const query = search.toString();
    const url = query ? `/common/work-efforts?${query}` : '/common/work-efforts';
    return this.apiService.get<any>(url).pipe(
      map((response: any) => ({
        resultList: this.extractServiceList(response).map((item: any) => ({
          ...item,
          facilityId: item?.facilityId ?? item?.facility?.facilityId ?? null,
        })),
        documentList: this.extractServiceList(response).map((item: any) => ({
          ...item,
          facilityId: item?.facilityId ?? item?.facility?.facilityId ?? null,
        })),
        totalElements: response?.data?.totalCount ?? response?.totalCount ?? this.extractServiceList(response).length,
        documentListCount: response?.data?.documentListCount ?? response?.documentListCount ?? this.extractServiceList(response).length,
      } as WorkEffortListResponse))
    );
  }

  createWorkEffort(params: Partial<WorkEffortLookupItem>): Observable<unknown> {
    return this.apiService.post<any>('/common/work-efforts', params).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  updateWorkEffort(id: number | string, params: Partial<WorkEffortLookupItem>): Observable<unknown> {
    return this.apiService.put<any>(`/common/work-efforts/${id}`, params).pipe(
      map((response: any) => this.unwrapServiceData(response))
    );
  }

  getWorkEffortAssocs(params?: {
    workEffortIdFrom?: string;
    workEffortIdTo?: string;
    workEffortAssocTypeId?: string;
    size?: number;
  }): Observable<WorkEffortListResponse> {
    const search = new URLSearchParams();
    if (params?.workEffortIdFrom) {
      search.append('workEffortIdFrom', params.workEffortIdFrom);
    }
    if (params?.workEffortIdTo) {
      search.append('workEffortIdTo', params.workEffortIdTo);
    }
    if (params?.workEffortAssocTypeId) {
      search.append('workEffortAssocTypeId', params.workEffortAssocTypeId);
    }
    if (params?.size) {
      search.append('size', String(params.size));
    }
    const query = search.toString();
    const url = query ? `/common/work-effort-assocs?${query}` : '/common/work-effort-assocs';
    return this.apiService.get<any>(url).pipe(
      map((response: any) => ({
        resultList: this.extractServiceList(response),
        documentList: this.extractServiceList(response),
        totalElements: response?.data?.totalCount ?? response?.totalCount ?? this.extractServiceList(response).length,
        documentListCount: response?.data?.documentListCount ?? response?.documentListCount ?? this.extractServiceList(response).length,
      } as WorkEffortListResponse))
    );
  }

  private extractItems(response: unknown): unknown[] {
    if (Array.isArray(response)) {
      return response;
    }
    const r = response as Record<string, unknown>;
    if (Array.isArray(r?.['documentList'])) {
      return r['documentList'] as unknown[];
    }
    if (Array.isArray(r?.['resultList'])) {
      return r['resultList'] as unknown[];
    }
    if (Array.isArray((r?.['responseMap'] as Record<string, unknown>)?.['resultList'])) {
      return (r['responseMap'] as Record<string, unknown>)['resultList'] as unknown[];
    }
    if (Array.isArray(r?.['content'])) {
      return r['content'] as unknown[];
    }
    return [];
  }

  executeSteelCutting(payload: SteelCuttingPayload): Observable<SteelCuttingResult> {
    const url = payload.workEffortId
      ? `/common/jobs/${encodeURIComponent(payload.workEffortId)}/steel-cutting`
      : `/common/inventory-items/${encodeURIComponent(payload.sourcePlateInventoryItemId)}/cut-sections`;
    return this.apiService.post<any>(url, payload).pipe(
      map((res) => (res?.data ?? res) as SteelCuttingResult)
    );
  }

  getInventoryItemWithLot(inventoryItemId: string): Observable<InventoryItemWithLot> {
    return this.apiService.get<any>(
      `/common/inventory-items/${encodeURIComponent(inventoryItemId)}/with-lot`
    ).pipe(
      map((res) => (res?.data ?? res) as InventoryItemWithLot)
    );
  }
}

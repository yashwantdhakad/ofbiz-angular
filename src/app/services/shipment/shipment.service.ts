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
import { HttpResponse } from '@angular/common/http';
import { ApiService } from '../common/api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ShipmentDetailResponse,
} from '@ofbiz/models/shipment.model';

@Injectable({
  providedIn: 'root',
})
export class ShipmentService {
  constructor(private apiService: ApiService) {}

  getShipments(pageIndex: number, keyword: string, shipmentTypeId?: string): Observable<any> {
    const params = new URLSearchParams();
    params.append('page', pageIndex.toString());
    params.append('size', '10');
    params.append('queryString', keyword || '');
    if (shipmentTypeId) {
      params.append('shipmentTypeId', shipmentTypeId);
    }

    const url = `/common/shipments?${params.toString()}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => {
        const list = Array.isArray(res?.data?.resultList) ? res.data.resultList : [];
        const count = res?.data?.totalCount ?? 0;
        return {
          resultList: list,
          documentList: list,
          totalCount: count,
          documentListCount: count,
          responseMap: {
            resultList: list,
            total: count
          }
        };
      })
    );
  }

  getShipment(shipmentId: string, includeReceipts: boolean = false): Observable<ShipmentDetailResponse> {
    const query = includeReceipts ? '?includeReceipts=true' : '';
    const url = `/common/shipments/${encodeURIComponent(shipmentId)}${query}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => (res?.data ?? res) as ShipmentDetailResponse)
    );
  }

  getSalesShipmentDetail(shipmentId: string): Observable<any> {
    const url = `/common/shipments/${encodeURIComponent(shipmentId)}/sales-detail`;
    return this.apiService.get<any>(url).pipe(
      map((res) => res?.data ?? res)
    );
  }

  createShipment(payload: any): Observable<any> {
    const url = `/common/shipments`;
    return this.apiService.post<any>(url, payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  addShipmentPackage(shipmentId: string, payload: any): Observable<any> {
    const url = `/common/shipments/${encodeURIComponent(shipmentId)}/packages`;
    return this.apiService.post<any>(url, payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  updateShipmentStatus(shipmentId: string, statusId: string): Observable<any> {
    const url = `/common/shipments/${encodeURIComponent(shipmentId)}/status`;
    return this.apiService.post<any>(url, { statusId }).pipe(
      map((res) => res?.data ?? res)
    );
  }

  shipShipment(shipmentId: string): Observable<any> {
    const url = `/common/shipments/${encodeURIComponent(shipmentId)}/ship`;
    return this.apiService.post<any>(url, {}).pipe(
      map((res) => res?.data ?? res)
    );
  }

  getShipmentBoxTypes(): Observable<unknown[]> {
    return this.apiService.get<any>('/common/shipment-box-types').pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  deleteShipmentPackage(shipmentId: string, shipmentPackageSeqId: string): Observable<any> {
    const url = `/common/shipments/${encodeURIComponent(shipmentId)}/packages/${encodeURIComponent(shipmentPackageSeqId)}`;
    return this.apiService.delete<any>(url).pipe(
      map((res) => res?.data ?? res)
    );
  }

  getPackingSlipPdf(shipmentId: string): Observable<string> {
    const url = `/common/shipments/${encodeURIComponent(shipmentId)}/packing-slip/pdf`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => response?.data?.htmlContent ?? response?.htmlContent ?? '')
    );
  }

  getShippingLabelPdf(shipmentId: string): Observable<string> {
    const url = `/common/shipments/${encodeURIComponent(shipmentId)}/shipping-label/pdf`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => response?.data?.htmlContent ?? response?.htmlContent ?? '')
    );
  }

  printShippingLabel(shipmentId: string): Observable<HttpResponse<Blob>> {
    const url = `/common/shipments/${encodeURIComponent(shipmentId)}/shipping-label/print`;
    return this.apiService.getOmsBlobResponse(url);
  }

  generateCarrierLabels(shipmentId: string, payload: unknown): Observable<unknown> {
    const url = `/common/shipments/${encodeURIComponent(shipmentId)}/carrier/labels`;
    return this.apiService.post<any>(url, payload).pipe(
      map((res) => res?.data ?? res)
    );
  }

  updatePackageTrackingCode(shipmentId: string, shipmentPackageSeqId: string, trackingCode: string): Observable<any> {
    const url = `/common/shipments/${encodeURIComponent(shipmentId)}/packages/${encodeURIComponent(shipmentPackageSeqId)}/tracking-code`;
    return this.apiService.put<any>(url, { trackingCode }).pipe(
      map((res) => res?.data ?? res)
    );
  }
}

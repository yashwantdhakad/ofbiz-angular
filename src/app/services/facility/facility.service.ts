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
import { PreferredFacilityService } from '../common/preferred-facility.service';
import {
  FacilityAddress,
  FacilityDetail,
  FacilityDetailResponse,
  FacilityLocation,
  FacilityLocationPageResponse,
  FacilityTypeLookupItem,
} from '@ofbiz/models/facility.model';

@Injectable({
  providedIn: 'root',
})
export class FacilityService {
  constructor(
    private apiService: ApiService,
    private preferredFacilityService: PreferredFacilityService
  ) {}

  getFacilities(): Observable<FacilityDetail[]> {
    const url = '/common/facilities';
    return this.apiService.get<any>(url).pipe(
      map((response: any) => {
        const items = this.extractFacilities(response);
        return this.preferredFacilityService.sortFacilities(
          items.map((facility) => ({
            ...facility,
            label: facility?.label || facility?.facilityName || facility?.facilityId,
          }))
        );
      })
    );
  }

  getFacility(facilityId: string): Observable<FacilityDetailResponse> {
    const url = `/common/facilities/${encodeURIComponent(facilityId)}?includeLocations=true`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  createFacility(payload: Partial<FacilityDetail>): Observable<FacilityDetail> {
    const url = '/common/facilities';
    return this.apiService.post<any>(url, payload).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  updateFacility(facilityId: string, payload: Partial<FacilityDetail>): Observable<FacilityDetail> {
    const url = `/common/facilities/${encodeURIComponent(facilityId)}`;
    return this.apiService.put<any>(url, payload).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  getFacilityTypes(): Observable<FacilityTypeLookupItem[]> {
    const url = '/common/facility-types';
    return this.apiService.get<any>(url).pipe(
      map((response: any) => Array.isArray(response?.data?.resultList) ? response.data.resultList : [])
    );
  }

  createFacilityLocation(payload: Partial<FacilityLocation>): Observable<FacilityLocation> {
    const url = '/common/facility-locations';
    return this.apiService.post<any>(url, payload).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  updateFacilityLocation(id: number, payload: Partial<FacilityLocation>): Observable<FacilityLocation> {
    const url = `/common/facility-locations/${id}`;
    return this.apiService.put<any>(url, payload).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  getFacilityLocations(
    facilityId: string,
    page: number,
    size: number,
    locationSeqId?: string,
    locationName?: string
  ): Observable<FacilityLocationPageResponse> {
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (locationSeqId) {
      query.set('locationSeqId', locationSeqId);
    }
    if (locationName) {
      query.set('locationName', locationName);
    }
    const url = `/common/facility-locations/by-facility/${encodeURIComponent(facilityId)}?${query.toString()}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => {
        const list = Array.isArray(response?.data?.resultList) ? response.data.resultList : [];
        const count = response?.data?.totalCount ?? 0;
        return {
          content: list,
          resultList: list,
          totalElements: count,
          page: {
            totalElements: count
          }
        } as FacilityLocationPageResponse;
      })
    );
  }

  getFacilityContactMechs(facilityId: string): Observable<unknown> {
    const url = `/common/facility-contact-mechs/by-facility/${encodeURIComponent(facilityId)}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  getFacilityContactMechPurposes(facilityId: string): Observable<unknown> {
    const url = `/common/facility-contact-mech-purposes/by-facility/${encodeURIComponent(facilityId)}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  updateFacilityAddress(facilityId: string, payload: Partial<FacilityAddress>): Observable<FacilityAddress> {
    const url = `/common/facilities/${encodeURIComponent(facilityId)}/address`;
    return this.apiService.put<any>(url, payload).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  private extractFacilities(response: any): FacilityDetail[] {
    if (Array.isArray(response)) {
      return response as FacilityDetail[];
    }
    if (Array.isArray(response?.data?.resultList)) {
      return response.data.resultList;
    }
    if (Array.isArray(response?.data?.documentList)) {
      return response.data.documentList;
    }
    if (Array.isArray(response?.resultList)) {
      return response.resultList;
    }
    if (Array.isArray(response?.documentList)) {
      return response.documentList;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    if (response && typeof response === 'object' && (response.facilityId || response?.data?.facilityId)) {
      return [response.facilityId ? response : response.data];
    }
    return [];
  }
}

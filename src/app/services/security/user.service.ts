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
import {
  PoApprovalAssignment,
  PoApprovalPolicy,
  SecurityFeaturesResponse,
  SecurityGroup,
  SecurityPermission,
  UserAvailabilityResponse,
  UserCreatePayload,
  UserDetailResponse,
  UserListResponse,
  UserUpdatePayload,
} from '@ofbiz/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private apiService: ApiService) {}

  listUsers(page: number, query: string, sortBy?: string, sortDirection?: string): Observable<UserListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: '10',
      query: query ?? '',
    });
    if (sortBy) {
      params.append('sortBy', sortBy);
    }
    if (sortDirection) {
      params.append('sortDirection', sortDirection);
    }
    return this.apiService.get<any>(`/common/users?${params.toString()}`).pipe(
      map((response: any) => ({
        resultList: Array.isArray(response?.data?.documentList) ? response.data.documentList : [],
        documentListCount: response?.data?.documentListCount ?? response?.data?.totalCount ?? 0,
      } as UserListResponse))
    );
  }

  getUser(userLoginId: string): Observable<UserDetailResponse> {
    return this.apiService.get<any>(`/common/users/${encodeURIComponent(userLoginId)}`).pipe(
      map((response: any) => ({ userDetail: response?.data?.userDetail ?? response?.data } as UserDetailResponse))
    );
  }

  createUser(payload: UserCreatePayload): Observable<UserDetailResponse> {
    return this.apiService.post<any>('/common/users', payload).pipe(
      map((response: any) => (response?.data ?? response) as UserDetailResponse)
    );
  }

  updateUser(userLoginId: string, payload: UserUpdatePayload): Observable<UserDetailResponse> {
    return this.apiService.put<any>(`/common/users/${encodeURIComponent(userLoginId)}`, payload).pipe(
      map((response: any) => (response?.data ?? response) as UserDetailResponse)
    );
  }

  getPurchaseOrderApprovalAssignment(userLoginId: string, companyPartyId: string): Observable<PoApprovalAssignment> {
    const params = new URLSearchParams({ companyPartyId: (companyPartyId || '').trim() });
    return this.apiService.getOms<PoApprovalAssignment>(
      `/purchase-order-approval-policies/users/${encodeURIComponent(userLoginId)}?${params.toString()}`
    );
  }

  updatePurchaseOrderApprovalAssignment(userLoginId: string, companyPartyId: string, payload: Partial<PoApprovalAssignment>): Observable<PoApprovalAssignment> {
    const params = new URLSearchParams({ companyPartyId: (companyPartyId || '').trim() });
    return this.apiService.putOms<PoApprovalAssignment>(
      `/purchase-order-approval-policies/users/${encodeURIComponent(userLoginId)}?${params.toString()}`,
      payload
    );
  }

  getPurchaseOrderApprovalPolicy(companyPartyId: string): Observable<PoApprovalPolicy> {
    return this.apiService.getOms<PoApprovalPolicy>(`/purchase-order-approval-policies/${encodeURIComponent((companyPartyId || '').trim())}`);
  }

  deleteUser(userLoginId: string): Observable<unknown> {
    return this.apiService.delete(`/common/users/${encodeURIComponent(userLoginId)}`);
  }



  checkUserLoginAvailability(userLoginId: string): Observable<UserAvailabilityResponse> {
    const params = new URLSearchParams({ userLoginId: (userLoginId || '').trim() });
    return this.apiService.get<any>(`/common/users/availability?${params.toString()}`).pipe(
      map((response: any) => ({
        available: response?.data?.available ?? !response?.data?.exists,
      } as UserAvailabilityResponse))
    );
  }



  listRoles(): Observable<SecurityGroup[]> {
    return this.apiService.get<any>('/common/users/access-groups').pipe(
      map((response: any) => {
        const list = response?.data?.resultList ?? response?.resultList;
        return Array.isArray(list) ? (list as SecurityGroup[]) : [];
      })
    );
  }

  listPermissions(): Observable<SecurityPermission[]> {
    return this.apiService.get<any>('/common/users/security-permissions').pipe(
      map((response: any) => {
        const candidate = response?.data?.resultList ?? response?.resultList;
        const list = Array.isArray(candidate) ? candidate as SecurityPermission[] : [];
        return list
          .filter((permission) => typeof permission?.permissionId === 'string')
          .filter((permission) => permission.permissionId!.startsWith('MENU_'))
          .sort((a, b) => (a.permissionId ?? '').localeCompare(b.permissionId ?? ''));
      })
    );
  }

  listGroupPermissions(): Observable<any[]> {
    return this.apiService.get<any>('/common/users/security-group-permissions').pipe(
      map((response: any) => {
        const list = response?.data?.resultList ?? response?.resultList;
        return Array.isArray(list) ? list : [];
      })
    );
  }

  getMySecurityFeatures(): Observable<SecurityFeaturesResponse> {
    return this.apiService.get<any>('/common/users/security/me').pipe(
      map((response: any) => response?.data ?? response)
    );
  }

}

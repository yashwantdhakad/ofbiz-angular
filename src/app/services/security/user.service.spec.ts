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
import { of } from 'rxjs';
import { ApiService } from '../common/api.service';
import { UserService } from './user.service';

describe('UserService', () => {
  let apiService: jasmine.SpyObj<ApiService>;
  let service: UserService;

  beforeEach(() => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', [
      'get',
      'post',
      'put',
      'delete',
      'getOms',
      'putOms',
    ]);
    service = new UserService(apiService);
  });

  it('builds the listUsers query string with optional params', () => {
    apiService.get.and.returnValue(of({} as any));

    service.listUsers(2, 'john', 'name', 'asc').subscribe();

    expect(apiService.get).toHaveBeenCalledWith(
      '/common/users?page=2&pageSize=10&query=john&sortBy=name&sortDirection=asc'
    );
  });

  it('encodes user ids for get, update, and delete calls', () => {
    apiService.get.and.returnValue(of({} as any));
    apiService.put.and.returnValue(of({} as any));
    apiService.delete.and.returnValue(of({} as any));

    service.getUser('john/doe').subscribe();
    service.updateUser('john/doe', {} as any).subscribe();
    service.deleteUser('john/doe').subscribe();

    expect(apiService.get).toHaveBeenCalledWith('/common/users/john%2Fdoe');
    expect(apiService.put).toHaveBeenCalledWith('/common/users/john%2Fdoe', {} as any);
    expect(apiService.delete).toHaveBeenCalledWith('/common/users/john%2Fdoe');
  });

  it('builds purchase order approval assignment endpoints with trimmed company ids', () => {
    apiService.getOms.and.returnValue(of({} as any));
    apiService.putOms.and.returnValue(of({} as any));

    service.getPurchaseOrderApprovalAssignment('user1', '  COMP-1  ').subscribe();
    service.updatePurchaseOrderApprovalAssignment('user1', '  COMP-1  ', { approvalRoleTypeId: 'ROLE' } as any).subscribe();
    service.getPurchaseOrderApprovalPolicy('  COMP-1  ').subscribe();

    expect(apiService.getOms).toHaveBeenCalledWith(
      '/purchase-order-approval-policies/users/user1?companyPartyId=COMP-1'
    );
    expect(apiService.putOms).toHaveBeenCalledWith(
      '/purchase-order-approval-policies/users/user1?companyPartyId=COMP-1',
      { approvalRoleTypeId: 'ROLE' } as any
    );
    expect(apiService.getOms).toHaveBeenCalledWith('/purchase-order-approval-policies/COMP-1');
  });

  it('checks login availability with trimmed ids', () => {
    apiService.get.and.returnValue(of({} as any));

    service.checkUserLoginAvailability('  test.user  ').subscribe();

    expect(apiService.get).toHaveBeenCalledWith('/common/users/availability?userLoginId=test.user');
  });

  it('loads curated ERP access groups from either a raw array or resultList wrapper', () => {
    apiService.get.and.returnValue(of({ data: { resultList: [{ groupId: 'USER' }] } } as any));
    service.listRoles().subscribe((result) => {
      expect(result).toEqual([{ groupId: 'USER' }] as any);
    });
    expect(apiService.get).toHaveBeenCalledWith('/common/users/access-groups');
  });

  it('filters permissions to MENU_ entries and sorts them', () => {
    apiService.get.and.returnValue(
      of({ data: {
        resultList: [
          { permissionId: 'ORDER_VIEW' },
          { permissionId: 'MENU_B' },
          { permissionId: 'MENU_A' },
          { permissionId: null },
        ],
      }} as any)
    );

    service.listPermissions().subscribe((result) => {
      expect(result).toEqual([{ permissionId: 'MENU_A' }, { permissionId: 'MENU_B' }] as any);
    });
    expect(apiService.get).toHaveBeenCalledWith('/common/users/security-permissions');
  });
});

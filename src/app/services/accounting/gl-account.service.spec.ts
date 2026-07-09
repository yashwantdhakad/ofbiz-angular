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
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../common/api.service';
import { GlAccountService } from './gl-account.service';

describe('GlAccountService', () => {
  let service: GlAccountService;
  let apiService: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [
        GlAccountService,
        { provide: ApiService, useValue: apiService },
      ],
    });

    service = TestBed.inject(GlAccountService);
  });

  it('lists GL accounts and account types with pagination defaults and fallbacks', () => {
    apiService.get.and.returnValues(
      of({ data: { resultList: [{ glAccountId: '1000' }] } } as any),
      of({ data: { resultList: [{ glAccountTypeId: 'ASSET' }] } } as any),
      of({ data: {} } as any)
    );

    service.listGlAccounts().subscribe((result) => expect(result).toEqual([{ glAccountId: '1000' }]));
    service.listGlAccountTypes(1, 25).subscribe((result) => expect(result).toEqual([{ glAccountTypeId: 'ASSET' }]));
    service.listGlAccounts(2, 10).subscribe((result) => expect(result).toEqual([]));

    expect(apiService.get).toHaveBeenCalledWith('/common/accounting/gl-accounts?page=0&size=500');
    expect(apiService.get).toHaveBeenCalledWith('/common/accounting/gl-account-types?page=1&size=25');
    expect(apiService.get).toHaveBeenCalledWith('/common/accounting/gl-accounts?page=2&size=10');
  });

  it('creates, updates, and deletes GL accounts', () => {
    apiService.post.and.returnValue(of({ data: { glAccountId: '1000' } } as any));
    apiService.put.and.returnValue(of({ glAccountId: '2000' } as any));
    apiService.delete.and.returnValue(of(undefined as any));

    service.createGlAccount({ glAccountId: '1000' }).subscribe((result) => expect(result.glAccountId).toBe('1000'));
    service.updateGlAccount(25, { accountName: 'Cash' }).subscribe((result) => expect(result.glAccountId).toBe('2000'));
    service.deleteGlAccount(25).subscribe((result) => expect(result).toBeUndefined());

    expect(apiService.post).toHaveBeenCalledWith('/common/accounting/gl-accounts', { glAccountId: '1000' });
    expect(apiService.put).toHaveBeenCalledWith('/common/accounting/gl-accounts/25', { accountName: 'Cash' });
    expect(apiService.delete).toHaveBeenCalledWith('/common/accounting/gl-accounts/25');
  });
});

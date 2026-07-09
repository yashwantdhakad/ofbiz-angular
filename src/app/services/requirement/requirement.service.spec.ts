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
import { RequirementService } from './requirement.service';

describe('RequirementService', () => {
  let apiService: jasmine.SpyObj<ApiService>;
  let service: RequirementService;

  beforeEach(() => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'put']);
    service = new RequirementService(apiService);
  });

  it('builds search query strings with optional filters', () => {
    apiService.get.and.returnValue(of({} as any));

    service.searchRequirements(2, 25, 'FAC/1', 'PROD 1').subscribe();

    expect(apiService.get).toHaveBeenCalledWith('/common/requirements/search?page=2&size=25&facilityId=FAC%2F1&productId=PROD+1'
    );
  });

  it('omits optional search filters when they are not provided', () => {
    apiService.get.and.returnValue(of({} as any));

    service.searchRequirements(0, 10).subscribe();

    expect(apiService.get).toHaveBeenCalledWith('/common/requirements/search?page=0&size=10');
  });

  it('sends create and approve payloads to encoded endpoints', () => {
    apiService.post.and.returnValue(of({} as any));

    service.createRequirement({ productId: 'P1' }).subscribe();
    service.approveRequirement('REQ/1').subscribe();
    service.approveRequirement('REQ/1', { approvedQty: 2 }).subscribe();

    expect(apiService.post).toHaveBeenCalledWith('/common/requirements', { productId: 'P1' });
    expect(apiService.post).toHaveBeenCalledWith('/common/requirements/REQ%2F1/approve', {});
    expect(apiService.post).toHaveBeenCalledWith('/common/requirements/REQ%2F1/approve', { approvedQty: 2 });
  });

  it('loads detail and upserts supplier using encoded ids', () => {
    apiService.get.and.returnValue(of({} as any));
    apiService.put.and.returnValue(of({} as any));

    service.getRequirementDetail('REQ/1').subscribe();
    service.upsertSupplier('REQ/1', { partyId: 'SUP/1', partyName: 'Supplier' }).subscribe();

    expect(apiService.get).toHaveBeenCalledWith('/common/requirements/REQ%2F1/detail');
    expect(apiService.put).toHaveBeenCalledWith('/common/requirements/REQ%2F1/supplier', {
      partyId: 'SUP/1',
      partyName: 'Supplier',
    });
  });
});

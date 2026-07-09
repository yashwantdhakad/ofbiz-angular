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
import { SupplierProductService } from './supplier-product.service';

describe('SupplierProductService', () => {
  let apiService: jasmine.SpyObj<ApiService>;
  let service: SupplierProductService;

  beforeEach(() => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'delete']);
    service = new SupplierProductService(apiService);
  });

  it('builds the party and product listing endpoints with encoded ids', () => {
    apiService.get.and.returnValue(of([] as any));

    service.listByParty('SUP/1').subscribe();
    service.listByProduct('PROD/1').subscribe();

    expect(apiService.get).toHaveBeenCalledWith('/common/supplier-products?partyId=SUP%2F1');
    expect(apiService.get).toHaveBeenCalledWith('/common/supplier-products?productId=PROD%2F1');
  });

  it('builds paged and latest lookup endpoints', () => {
    apiService.get.and.returnValue(of({} as any));

    service.listByPartyPaged('SUP/1', 2, 50).subscribe();
    service.getLatestByPartyAndProduct('SUP/1', 'PROD/1').subscribe();

    expect(apiService.get).toHaveBeenCalledWith('/common/supplier-products/by-party?partyId=SUP%2F1&page=2&size=50');
    expect(apiService.get).toHaveBeenCalledWith(
      '/common/supplier-products/by-party-product?partyId=SUP%2F1&productId=PROD%2F1'
    );
  });

  it('sends create and delete requests to the collection endpoints', () => {
    apiService.post.and.returnValue(of({} as any));
    apiService.delete.and.returnValue(of({} as any));

    service.create({ partyId: 'SUP/1', productId: 'PROD/1' }).subscribe();
    service.delete(42).subscribe();

    expect(apiService.post).toHaveBeenCalledWith('/common/supplier-products', {
      partyId: 'SUP/1',
      productId: 'PROD/1',
    });
    expect(apiService.delete).toHaveBeenCalledWith('/common/supplier-products/42');
  });
});

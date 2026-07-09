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
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ApiService } from '../common/api.service';
import { ReturnService } from './return.service';

describe('ReturnService', () => {
  let service: ReturnService;
  let apiService: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        ReturnService,
        { provide: ApiService, useValue: apiService },
      ],
    });

    service = TestBed.inject(ReturnService);
  });

  it('builds order candidate search query strings from provided filters', () => {
    apiService.get.and.returnValue(of([] as any));

    service.searchOrderCandidates('SALES_ORDER', 'TN-PO-1', 15).subscribe();

    expect(apiService.get).toHaveBeenCalledWith(
      '/common/returns/order-candidates?orderTypeId=SALES_ORDER&query=TN-PO-1&size=15'
    );
  });

  it('still sends size when the search filters are empty', () => {
    apiService.get.and.returnValue(of([] as any));

    service.searchOrderCandidates('', '', 20).subscribe();

    expect(apiService.get).toHaveBeenCalledWith('/common/returns/order-candidates?size=20');
  });

  it('encodes ids for return lookup and workflow endpoints', () => {
    apiService.get.and.returnValue(of({} as any));
    apiService.post.and.returnValue(of({} as any));

    service.getOrderForReturn('PO/1').subscribe();
    service.getReturn('RET/2').subscribe();
    service.acceptReturn('RET/2').subscribe();
    service.rejectReturn('RET/2').subscribe();
    service.receiveReturn('RET/2', { qty: 1 }).subscribe();

    expect(apiService.get).toHaveBeenCalledWith('/common/returns/order-candidates/PO%2F1');
    expect(apiService.get).toHaveBeenCalledWith('/common/returns/RET%2F2');
    expect(apiService.post).toHaveBeenCalledWith('/common/returns/RET%2F2/accept', {});
    expect(apiService.post).toHaveBeenCalledWith('/common/returns/RET%2F2/reject', {});
    expect(apiService.post).toHaveBeenCalledWith('/common/returns/RET%2F2/receive', { qty: 1 });
  });

  it('builds listReturns query strings for all supported filters', () => {
    apiService.get.and.returnValue(of({} as any));

    service.listReturns({
      orderId: 'O-1',
      returnId: 'R-1',
      statusId: 'RETURN_ACCEPTED',
      orderTypeId: 'SALES_ORDER',
      returnTypeId: 'CUSTOMER_RETURN',
      page: 3,
      size: 25,
    }).subscribe();

    expect(apiService.get).toHaveBeenCalledWith(
      '/common/returns?orderId=O-1&returnId=R-1&statusId=RETURN_ACCEPTED&orderTypeId=SALES_ORDER&returnTypeId=CUSTOMER_RETURN&page=3&size=25'
    );
  });

  it('uses default paging when listReturns is called without filters', () => {
    apiService.get.and.returnValue(of({} as any));

    service.listReturns().subscribe();

    expect(apiService.get).toHaveBeenCalledWith('/common/returns?page=0&size=10');
  });

  it('loads return lookups from the fixed endpoints', () => {
    apiService.get.and.returnValues(of([] as any), of([] as any), of([] as any));

    service.listReturnTypes().subscribe();
    service.listReturnReasons().subscribe();
    service.listReturnItemTypes().subscribe();

    expect(apiService.get).toHaveBeenCalledWith('/common/returns/lookup/types');
    expect(apiService.get).toHaveBeenCalledWith('/common/returns/lookup/reasons');
    expect(apiService.get).toHaveBeenCalledWith('/common/returns/lookup/item-types');
  });

  it('sends create payloads to the returns collection endpoint', () => {
    apiService.post.and.returnValue(of({ returnId: 'R-1' } as any));

    service.createReturn({ orderId: 'O-1' } as any).subscribe();

    expect(apiService.post).toHaveBeenCalledWith('/common/returns', { orderId: 'O-1' } as any);
  });
});

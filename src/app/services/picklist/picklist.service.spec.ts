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
import { PicklistService } from './picklist.service';

describe('PicklistService', () => {
  let service: PicklistService;
  let apiService: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);

    TestBed.configureTestingModule({
      providers: [
        PicklistService,
        { provide: ApiService, useValue: apiService },
      ],
    });

    service = TestBed.inject(PicklistService);
  });

  it('loads picklists with filters and normalizes missing list fields', () => {
    apiService.get.and.returnValue(of({ data: { resultList: [{ picklistId: 'PK-1' }], totalCount: 1 } } as any));

    service.getPicklists({
      facilityId: 'FAC-1',
      statusId: 'PICKLIST_INPUT',
      fromDate: '2026-07-01',
      toDate: '2026-07-09',
      page: 2,
      size: 50,
    }).subscribe((result) => {
      expect(result).toEqual({
        resultList: [{ picklistId: 'PK-1' }],
        documentList: [],
        totalCount: 1,
        documentListCount: 0,
      });
    });

    expect(apiService.get).toHaveBeenCalledWith(
      '/common/picklists-view/summary?facilityId=FAC-1&statusId=PICKLIST_INPUT&fromDate=2026-07-01&toDate=2026-07-09&page=2&size=50'
    );
  });

  it('uses default pagination when filters are omitted', () => {
    apiService.get.and.returnValue(of({ data: {} } as any));

    service.getPicklists({}).subscribe();

    expect(apiService.get).toHaveBeenCalledWith('/common/picklists-view/summary?page=0&size=20');
  });

  it('loads picklist detail and pdf content from nested or direct responses', () => {
    apiService.get.and.returnValues(
      of({ data: { picklist: { picklistId: 'PK 1' } } } as any),
      of({ data: { htmlContent: '<html>nested</html>' } } as any),
      of({ htmlContent: '<html>direct</html>' } as any)
    );

    service.getPicklist('PK 1').subscribe((result) => expect(result.picklist.picklistId).toBe('PK 1'));
    service.getPicklistPdf('PK 1').subscribe((html) => expect(html).toBe('<html>nested</html>'));
    service.getPicklistPdf('PK 2').subscribe((html) => expect(html).toBe('<html>direct</html>'));

    expect(apiService.get).toHaveBeenCalledWith('/common/picklists-view/PK%201');
    expect(apiService.get).toHaveBeenCalledWith('/common/picklists-view/PK%201/pdf');
    expect(apiService.get).toHaveBeenCalledWith('/common/picklists-view/PK%202/pdf');
  });

  it('loads orders with and without filters', () => {
    apiService.get.and.returnValues(
      of({ data: [{ orderId: 'SO-1' }] } as any),
      of([{ orderId: 'SO-2' }] as any),
      of({ data: [{ picklistId: 'PK-1' }] } as any)
    );

    service.getPicklistOrders({ statusId: 'ORDER_APPROVED', facilityId: 'FAC-1' }).subscribe((result) => {
      expect(result).toEqual([{ orderId: 'SO-1' }]);
    });
    service.getPicklistOrders({}).subscribe((result) => expect(result).toEqual([{ orderId: 'SO-2' }]));
    service.getPicklistOrdersByOrder('SO 1').subscribe((result) => expect(result).toEqual([{ picklistId: 'PK-1' }]));

    expect(apiService.get).toHaveBeenCalledWith('/common/picklists/orders?statusId=ORDER_APPROVED&facilityId=FAC-1');
    expect(apiService.get).toHaveBeenCalledWith('/common/picklists/orders');
    expect(apiService.get).toHaveBeenCalledWith('/common/picklists/by-order/SO%201');
  });

  it('posts picker assignment, mark picked, and shipment creation actions', () => {
    apiService.post.and.returnValues(
      of({ data: { assigned: true } } as any),
      of({ marked: true } as any),
      of({ data: { shipmentId: 'SHIP-1' } } as any)
    );

    service.assignPicker('PK-1', 'PICKER-1').subscribe((result) => expect(result).toEqual({ assigned: true }));
    service.markPicked('PK 1').subscribe((result) => expect(result).toEqual({ marked: true }));
    service.createShipmentFromPicklist('PK 1').subscribe((result) => expect(result).toEqual({ shipmentId: 'SHIP-1' }));

    expect(apiService.post).toHaveBeenCalledWith('/common/picklist-roles', {
      picklistId: 'PK-1',
      partyId: 'PICKER-1',
      roleTypeId: 'PICKER',
      fromDate: jasmine.any(String),
    });
    expect(apiService.post).toHaveBeenCalledWith('/common/picklists/PK%201/mark-picked', {});
    expect(apiService.post).toHaveBeenCalledWith('/common/picklists-view/PK%201/create-shipment', {});
  });
});

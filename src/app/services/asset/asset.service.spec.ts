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
import { AssetService } from './asset.service';
import { ApiService } from '../common/api.service';
import { of } from 'rxjs';

describe('AssetService', () => {
  let service: AssetService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', ['get', 'post', 'patch']);

    TestBed.configureTestingModule({
      providers: [
        AssetService,
        { provide: ApiService, useValue: spy }
      ]
    });

    service = TestBed.inject(AssetService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call getAssets with correct URL', () => {
    const mockResponse = { data: { resultList: [], totalCount: 0 } };
    apiServiceSpy.get.and.returnValue(of(mockResponse));

    service.getAssets(0, 'test').subscribe(res => {
      expect(res.resultList).toEqual([]);
      expect(res.totalCount).toBe(0);
    });

    const expectedUrl = `/common/assets?page=0&size=10&queryString=test`;
    expect(apiServiceSpy.get).toHaveBeenCalledWith(expectedUrl);
  });

  it('should call getAsset with correct assetId', () => {
    const mockAsset = { assetId: 'A1001' };
    apiServiceSpy.get.and.returnValue(of({ data: mockAsset }));

    service.getAsset('A1001').subscribe(res => {
      expect(res).toEqual(mockAsset);
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/assets/A1001');
  });

  it('should call receiveAsset with correct params', () => {
    const params = { productId: 'P1001', quantity: 1 };
    const response = { assetId: 'A2001' };
    apiServiceSpy.post.and.returnValue(of({ data: response }));

    service.receiveAsset(params).subscribe(res => {
      expect(res).toEqual(response);
    });

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/assets/receive', params);
  });

  it('should build asset search queries with optional filters', () => {
    apiServiceSpy.get.and.returnValue(of({} as any));

    service.getAssets(1, '', 'FAC/1', 'INV_AVAILABLE').subscribe();

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/assets?page=1&size=10&facilityId=FAC%2F1&statusId=INV_AVAILABLE');
  });

  it('should patch assets and build inspection endpoints with encoded ids', () => {
    apiServiceSpy.patch.and.returnValue(of({} as any));
    apiServiceSpy.post.and.returnValue(of({} as any));

    service.updateAsset('ASSET/1', { description: 'Updated' }).subscribe();
    service.acceptInspection('ASSET/1').subscribe();
    service.rejectInspection('ASSET/1').subscribe();
    service.bulkInspectionDecision('ACCEPT', ['INV1', 'INV2']).subscribe();

    expect(apiServiceSpy.patch).toHaveBeenCalledWith('/common/assets/ASSET%2F1', { description: 'Updated' });
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/assets/ASSET%2F1/inspection/accept', {});
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/assets/ASSET%2F1/inspection/reject', {});
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/assets/inspection/decision', {
      action: 'ACCEPT',
      inventoryItemIds: ['INV1', 'INV2'],
    });
  });

  it('should build reservation, lookup, and variance endpoints', () => {
    apiServiceSpy.get.and.returnValue(of({ data: { resultList: [] } } as any));
    apiServiceSpy.post.and.returnValue(of({} as any));

    service.getInventoryItemTypes().subscribe();
    service.getOrderReservations('INV/1').subscribe();
    service.getWorkEffortReservations('INV/1').subscribe();
    service.createPhysicalInventoryVariance('ASSET/1', { quantityOnHandVar: 2 }).subscribe();
    service.getVarianceReasons().subscribe();

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/inventory-item-types');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/order-item-ship-grp-inv-res?inventoryItemId=INV%2F1');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/work-effort-inv-reservations?inventoryItemId=INV%2F1');
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/assets/ASSET%2F1/variances', { quantityOnHandVar: 2 });
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/variance-reasons');
  });

  it('should build move-stock search and create endpoints', () => {
    apiServiceSpy.get.and.returnValue(of({} as any));
    apiServiceSpy.post.and.returnValue(of({} as any));

    service.searchMoveStocks({
      facilityId: 'FAC/1',
      locationSeqId: 'LOC/1',
      productId: 'PROD/1',
      page: 2,
      size: 25,
    }).subscribe();
    service.searchMoveStocks({ facilityId: 'FAC/1' }).subscribe();
    service.moveStock({
      inventoryItemId: 'INV_1',
      toLocationSeqId: 'LOC_2',
      moveQuantity: '5',
    }).subscribe();

    expect(apiServiceSpy.get).toHaveBeenCalledWith(
      '/common/asset-moves?facilityId=FAC%2F1&page=2&size=25&locationSeqId=LOC%2F1&productId=PROD%2F1'
    );
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/asset-moves?facilityId=FAC%2F1&page=0&size=50');
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/asset-moves', {
      inventoryItemId: 'INV_1',
      toLocationSeqId: 'LOC_2',
      moveQuantity: '5',
    });
  });
});

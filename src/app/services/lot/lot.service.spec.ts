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
import { LotService } from './lot.service';

describe('LotService', () => {
  let service: LotService;
  let apiService: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'put']);

    TestBed.configureTestingModule({
      providers: [
        LotService,
        { provide: ApiService, useValue: apiService },
      ],
    });

    service = TestBed.inject(LotService);
  });

  it('searches lots with trimmed query and normalizes empty arrays', () => {
    apiService.get.and.returnValue(of({ data: { resultList: [{ lotId: 'LOT-1' }], documentListCount: 1 } } as any));

    service.listLots(1, '  steel  ', 10).subscribe((result) => {
      expect(result.resultList).toEqual([{ lotId: 'LOT-1' }] as any);
      expect((result as any).documentList).toEqual([]);
      expect(result.documentListCount).toBe(1);
    });

    expect(apiService.get).toHaveBeenCalledWith('/common/lots/search?page=1&pageSize=10&query=steel');
  });

  it('creates, updates, and loads lot records from direct or nested responses', () => {
    apiService.post.and.returnValue(of({ data: { lotId: 'LOT-1' } } as any));
    apiService.put.and.returnValue(of({ lotId: 'LOT-2' } as any));
    apiService.get.and.returnValue(of({ data: { lotId: 'LOT 1' } } as any));

    service.createLot({ lotId: 'LOT-1' } as any).subscribe((result) => expect(result.lotId).toBe('LOT-1'));
    service.updateLot(5, { description: 'Updated' } as any).subscribe((result) => expect(result.lotId).toBe('LOT-2'));
    service.getLotByLotId('LOT 1').subscribe((result) => expect(result.lotId).toBe('LOT 1'));

    expect(apiService.post).toHaveBeenCalledWith('/common/lots', { lotId: 'LOT-1' } as any);
    expect(apiService.put).toHaveBeenCalledWith('/common/lots/5', { description: 'Updated' } as any);
    expect(apiService.get).toHaveBeenCalledWith('/common/lots/code/LOT%201');
  });

  it('combines lot header and inventory items for detail view', () => {
    apiService.get.and.returnValues(
      of({ data: { lotId: 'LOT-1' } } as any),
      of({ data: { resultList: [{ inventoryItemId: 'INV-1' }] } } as any)
    );

    service.getLotDetail('LOT-1').subscribe((detail) => {
      expect(detail.lot?.lotId).toBe('LOT-1');
      expect(detail.inventoryItems).toEqual([{ inventoryItemId: 'INV-1' }] as any);
    });

    expect(apiService.get).toHaveBeenCalledWith('/common/lots/code/LOT-1');
    expect(apiService.get).toHaveBeenCalledWith('/common/lots/code/LOT-1/inventory-items');
  });

  it('loads inventory items, attributes, inventory item lot data, and traceability trees', () => {
    apiService.get.and.returnValues(
      of({ data: { resultList: [{ inventoryItemId: 'INV-1' }] } } as any),
      of({ data: { attributes: [{ attrName: 'HEAT', attrValue: 'H1' }] } } as any),
      of({ data: { inventoryItemId: 'INV-1', lotId: 'LOT-1' } } as any),
      of({ data: { tree: { lotId: 'LOT-1', children: [] } } } as any),
      of({ tree: { lotId: 'LOT-2' } } as any)
    );

    service.listInventoryItemsByLotId('LOT 1').subscribe((result) => expect(result).toEqual({ resultList: [{ inventoryItemId: 'INV-1' }] }));
    service.getLotAttributes('LOT 1').subscribe((result) => expect(result).toEqual([{ attrName: 'HEAT', attrValue: 'H1' }] as any));
    service.getInventoryItemWithLot('INV 1').subscribe((result) => expect(result.inventoryItemId).toBe('INV-1'));
    service.getLotTraceabilityTree('LOT 1').subscribe((result) => expect(result).toEqual({ lotId: 'LOT-1', children: [] } as any));
    service.getLotTraceabilityTree('LOT 2').subscribe((result) => expect(result).toEqual({ lotId: 'LOT-2' } as any));

    expect(apiService.get).toHaveBeenCalledWith('/common/lots/code/LOT%201/inventory-items');
    expect(apiService.get).toHaveBeenCalledWith('/common/lots/code/LOT%201/attributes');
    expect(apiService.get).toHaveBeenCalledWith('/common/inventory-items/INV%201/with-lot');
  });

  it('sets a lot attribute and maps the response to void', () => {
    apiService.post.and.returnValue(of({ data: { success: true } } as any));

    service.setLotAttribute('LOT 1', 'HEAT', 'H1').subscribe((result) => expect(result).toBeUndefined());

    expect(apiService.post).toHaveBeenCalledWith('/common/lots/code/LOT%201/attributes', {
      lotId: 'LOT 1',
      attrName: 'HEAT',
      attrValue: 'H1',
    });
  });
});

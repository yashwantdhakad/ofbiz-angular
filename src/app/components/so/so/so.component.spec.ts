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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SOComponent } from './so.component';
import { OrderService } from '@ofbiz/services/order/order.service';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';

describe('SOComponent', () => {
  let component: SOComponent;
  let fixture: ComponentFixture<SOComponent>;
  let mockOrderService: jasmine.SpyObj<OrderService>;
  let activatedRouteStub: any;
  let referenceDataStoreStub: any;

  const mockOrderResponse = {
    responseMap: {
      orderList: [
        {
          orderId: 'ORD-001',
          customerName: 'John Doe',
          organizationName: 'ABC Corp',
          entryDate: '2023-01-01',
          statusDescription: 'Approved',
          storeName: 'Main Store',
          grandTotal: 500,
        }
      ],
      orderListCount: 1,
    }
  };

  beforeEach(async () => {
    mockOrderService = jasmine.createSpyObj('OrderService', ['getOrdersByType']);
    referenceDataStoreStub = {
      allStatuses: signal([]),
      productStores: signal([]),
      ensureAllStatusesLoaded: jasmine.createSpy('ensureAllStatusesLoaded'),
      ensureProductStoresLoaded: jasmine.createSpy('ensureProductStoresLoaded'),
    };
    activatedRouteStub = {
      parent: {
        snapshot: {
          data: {},
        },
      },
      snapshot: {
        data: {},
        paramMap: convertToParamMap({}),
      },
    };

    await TestBed.configureTestingModule({
      declarations: [SOComponent],
      imports: [],
      providers: [
        provideRouter([]),
        { provide: OrderService, useValue: mockOrderService },
        { provide: ReferenceDataStore, useValue: referenceDataStoreStub },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SOComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    mockOrderService.getOrdersByType.and.returnValue(of(mockOrderResponse as any));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load orders on init and set items/pages correctly', () => {
    mockOrderService.getOrdersByType.and.returnValue(of(mockOrderResponse as any));
    fixture.detectChanges();

    expect(mockOrderService.getOrdersByType).toHaveBeenCalledWith(0, '', 'SALES_ORDER', 10, undefined, undefined, {});
    expect(component.items()).toHaveSize(1);
    expect(component.pages()).toBe(1);
    expect(component.isLoading()).toBeFalse();
  });

  it('should derive SALES_QUOTE columns and hydrate status/product options from route data', () => {
    activatedRouteStub.parent.snapshot.data = {
      orderTypeId: 'SALES_QUOTE',
      detailBasePath: '/quotes',
      pageTitle: 'SO.QUOTE_TITLE',
    };
    referenceDataStoreStub.allStatuses.set([
      { statusId: 'ORDER_CREATED', description: 'Created' },
      { statusId: 'ORDER_CREATED', description: 'Duplicate' },
      { statusId: 'ORDER_SHIPPED', description: 'Shipped' },
      { statusId: 'RETURN_REQUESTED', description: 'Ignored' },
    ]);
    referenceDataStoreStub.productStores.set([{ productStoreId: 'PS1', storeName: 'Store 1' }]);
    mockOrderService.getOrdersByType.and.returnValue(of(mockOrderResponse as any));

    fixture.detectChanges();

    expect(component.orderTypeId).toBe('SALES_QUOTE');
    expect(component.detailBasePath).toBe('/quotes');
    expect(component.pageTitle).toBe('SO.QUOTE_TITLE');
    expect(component.displayedColumns).not.toContain('orderId');
    expect(component.statusOptions().map((item: any) => item.statusId)).toEqual(['ORDER_CREATED', 'ORDER_SHIPPED']);
    expect(component.productStoreOptions()).toEqual([{ productStoreId: 'PS1', storeName: 'Store 1' }]);
    expect(referenceDataStoreStub.ensureAllStatusesLoaded).toHaveBeenCalled();
    expect(referenceDataStoreStub.ensureProductStoresLoaded).toHaveBeenCalled();
  });

  it('should build filters and support search, clear, page, and sort branches', () => {
    mockOrderService.getOrdersByType.and.returnValue(of(mockOrderResponse as any));
    fixture.detectChanges();
    mockOrderService.getOrdersByType.calls.reset();

    component.queryString = 'Alpha';
    component.selectedStatusId = 'ORDER_APPROVED';
    component.selectedProductStoreId = 'STORE-1';
    component.selectedOrderDatePreset = 'TODAY';
    component.onSearch();

    expect(component.isLoading()).toBeFalse();
    expect(mockOrderService.getOrdersByType).toHaveBeenCalledWith(
      0,
      'Alpha',
      'SALES_ORDER',
      10,
      undefined,
      undefined,
      {
        statusId: 'ORDER_APPROVED',
        productStoreId: 'STORE-1',
        orderDatePreset: 'TODAY',
      }
    );

    component.clearFilters();
    expect(component.queryString).toBe('');
    expect(component.selectedStatusId).toBe('');
    expect(component.selectedProductStoreId).toBe('');
    expect(component.selectedOrderDatePreset).toBe('');

    component.onPageChange(2, 25);
    expect(component.pagination.rowsPerPage).toBe(25);
    expect(mockOrderService.getOrdersByType).toHaveBeenCalledWith(
      2,
      '',
      'SALES_ORDER',
      25,
      undefined,
      undefined,
      {}
    );

    component.currentSort = { active: 'entryDate', direction: 'asc' } as any;
    component.onSortChange({ active: 'entryDate', direction: '' });
    expect(component.currentSort).toEqual({ active: 'entryDate', direction: 'desc' });
    component.onSortChange({ active: 'entryDate', direction: 'desc' });
    expect(component.currentSort).toEqual({ active: 'entryDate', direction: 'asc' });
    expect(component.trackBySoRow(0, { id: 'SO-1' })).toBe('SO-1');
    expect(component.trackBySoRow(0, { orderId: 'SO-2' })).toBe('SO-2');
  });

  it('should preserve loading state when order fetch fails', () => {
    mockOrderService.getOrdersByType.and.returnValue(throwError(() => new Error('API Error')));

    fixture.detectChanges();

    expect(mockOrderService.getOrdersByType).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
    expect(component.items()).toEqual([]);
  });

  it('should handle API error gracefully', () => {
    mockOrderService.getOrdersByType.and.returnValue(throwError(() => new Error('API Error')));

    fixture.detectChanges();

    expect(mockOrderService.getOrdersByType).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
    expect(component.items()).toEqual([]);
  });
});

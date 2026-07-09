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
import { POComponent } from './po.component';
import { OrderService } from '@ofbiz/services/order/order.service';
import { DatePipe } from '@angular/common';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';

describe('POComponent', () => {
  let component: POComponent;
  let fixture: ComponentFixture<POComponent>;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let routeStub: { data: any };
  let preferredFacilityServiceSpy: jasmine.SpyObj<PreferredFacilityService>;
  let referenceDataStoreStub: any;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('OrderService', ['getPOs', 'getPurchaseQuotes']);
    referenceDataStoreStub = {
      allStatuses: signal([]),
      facilities: signal([]),
      ensureAllStatusesLoaded: jasmine.createSpy('ensureAllStatusesLoaded'),
      ensureFacilitiesLoaded: jasmine.createSpy('ensureFacilitiesLoaded'),
    };
    routeStub = { data: of({}) };
    preferredFacilityServiceSpy = jasmine.createSpyObj('PreferredFacilityService', ['resolveInitialFacilityId']);
    preferredFacilityServiceSpy.resolveInitialFacilityId.and.returnValue('FAC-1');

    await TestBed.configureTestingModule({
      declarations: [POComponent],
      imports: [],
      providers: [
        provideRouter([]),
        { provide: OrderService, useValue: spy },
        { provide: ReferenceDataStore, useValue: referenceDataStoreStub },
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: PreferredFacilityService, useValue: preferredFacilityServiceSpy },
        DatePipe
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    orderServiceSpy = TestBed.inject(OrderService) as jasmine.SpyObj<OrderService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(POComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call getOrders on init and populate items', () => {
    const mockResponse = {
      responseMap: {
        orderList: [
          {
            orderId: 'PO-001',
            organizationName: 'Org A',
            vendorOrganizationName: 'Vendor X',
            entryDate: '2025-07-01T00:00:00Z',
            statusDescription: 'Created',
            facilityName: 'Facility Y',
            quantityTotal: 10,
            grandTotal: 500
          }
        ],
        orderListCount: 1
      }
    };

    orderServiceSpy.getPOs.and.returnValue(of(mockResponse as any));

    fixture.detectChanges(); // triggers ngOnInit()

    expect(orderServiceSpy.getPOs).toHaveBeenCalledWith(0, 10, '', undefined, undefined, {});
    expect(component.items()).toHaveSize(1);
    expect(component.items()[0].entryDate).toContain('2025'); // transformed by DatePipe
    expect(component.pages()).toBe(1);
    expect(component.isLoading()).toBeFalse();
  });

  it('should handle error in getOrders gracefully', () => {
    orderServiceSpy.getPOs.and.returnValue(throwError(() => new Error('API error')));

    fixture.detectChanges(); // triggers ngOnInit()

    expect(orderServiceSpy.getPOs).toHaveBeenCalled();
    expect(component.items()).toHaveSize(0);
    expect(component.isLoading()).toBeFalse();
  });

  it('should initialize quote mode, facility options, and status dedupe from route data', () => {
    routeStub.data = of({ isQuoteMode: true });
    referenceDataStoreStub.allStatuses.set([
      { statusId: 'ORDER_CREATED', description: 'Created' },
      { statusId: 'ORDER_CREATED', description: 'Duplicate' },
      { statusId: 'ITEM_CREATED', description: 'Ignored' },
    ]);
    referenceDataStoreStub.facilities.set([{ facilityId: 'FAC-1', facilityName: 'Main Facility' }]);
    orderServiceSpy.getPurchaseQuotes.and.returnValue(of({ responseMap: { orderList: [], orderListCount: 0 } } as any));

    fixture = TestBed.createComponent(POComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isQuoteMode).toBeTrue();
    expect(component.detailBasePath).toBe('/pos/quotes');
    expect(component.pageTitleKey).toBe('PO.QUOTE_TITLE');
    expect(component.displayedColumns.find((column) => column.key === 'orderId')?.value).toBe('QUOTE.ID');
    expect(component.statusOptions().map((item: any) => item.statusId)).toEqual(['ORDER_CREATED']);
    expect(component.facilityOptions()).toEqual([{ facilityId: 'FAC-1', facilityName: 'Main Facility' }]);
    expect(component.selectedFacilityId).toBe('FAC-1');
    expect(orderServiceSpy.getPurchaseQuotes).toHaveBeenCalled();
  });

  it('should build filters and support search, clear, sort, paging, and trackBy helpers', () => {
    orderServiceSpy.getPOs.and.returnValue(of({ responseMap: { orderList: [], orderListCount: 0 } } as any));
    fixture.detectChanges();
    orderServiceSpy.getPOs.calls.reset();

    component.queryString = 'widgets';
    component.selectedStatusId = 'ORDER_APPROVED';
    component.selectedFacilityId = 'FAC-2';
    component.selectedOrderDatePreset = 'TODAY';
    component.onSearch();

    expect(orderServiceSpy.getPOs).toHaveBeenCalledWith(0, 10, 'widgets', undefined, undefined, {
      statusId: 'ORDER_APPROVED',
      facilityId: 'FAC-2',
      orderDatePreset: 'TODAY',
    });

    component.clearFilters();
    expect(component.queryString).toBe('');
    expect(component.selectedStatusId).toBe('');
    expect(component.selectedFacilityId).toBe('');
    expect(component.selectedOrderDatePreset).toBe('');

    component.currentSort = { active: 'entryDate', direction: 'asc' } as any;
    component.onSortChange({ active: 'entryDate', direction: '' });
    expect(component.currentSort).toEqual({ active: 'entryDate', direction: 'desc' });

    component.onPageChange(2, 25);
    expect(component.pagination.page).toBe(3);
    expect(component.pagination.rowsPerPage).toBe(25);
    expect(component.trackByPoColumn(0, { key: 'id', value: 'COMMON.ID' })).toBe('id');
    expect(component.trackByPoRow(0, { orderId: 'PO-1' } as any)).toBe('PO-1');
    expect(component.trackByPoRow(3, {} as any)).toBe(3);
  });
});

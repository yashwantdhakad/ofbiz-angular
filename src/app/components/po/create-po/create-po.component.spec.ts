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
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CreatePOComponent } from './create-po.component';
import { ReactiveFormsModule } from '@angular/forms';
import { OrderService } from '@ofbiz/services/order/order.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Store } from '@ngrx/store';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SupplierProductService } from '@ofbiz/services/supplier-product/supplier-product.service';
import { signal } from '@angular/core';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';

describe('CreatePOComponent', () => {
  let component: CreatePOComponent;
  let fixture: ComponentFixture<CreatePOComponent>;
  let mockOrderService: jasmine.SpyObj<OrderService>;
  let mockPartyService: jasmine.SpyObj<PartyService>;
  let mockSnackbarService: jasmine.SpyObj<SnackbarService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockProductService: jasmine.SpyObj<ProductService>;
  let mockSupplierProductService: jasmine.SpyObj<SupplierProductService>;
  let referenceDataStoreStub: any;

  beforeEach(async () => {
    mockOrderService = jasmine.createSpyObj('OrderService', ['getFacilities', 'getCustomerParties', 'createOrder', 'addItem']);
    mockPartyService = jasmine.createSpyObj('PartyService', ['getSuppliers']);
    mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockProductService = jasmine.createSpyObj('ProductService', ['getProductsAutocompleteFromOms']);
    mockSupplierProductService = jasmine.createSpyObj('SupplierProductService', ['getLatestByPartyAndProduct']);
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));
    referenceDataStoreStub = {
      facilities: signal([]),
      ensureFacilitiesLoaded: jasmine.createSpy('ensureFacilitiesLoaded'),
    };
    const storeSpy = jasmine.createSpyObj('Store', ['dispatch', 'pipe']);
    storeSpy.pipe.and.returnValue(of({}));
    mockOrderService.getCustomerParties.and.returnValue(of([]));
    mockOrderService.addItem.and.returnValue(of({}));
    mockPartyService.getSuppliers.and.returnValue(of([] as any));
    mockProductService.getProductsAutocompleteFromOms.and.returnValue(of({ documentList: [] }));
    mockSupplierProductService.getLatestByPartyAndProduct.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      declarations: [CreatePOComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: OrderService, useValue: mockOrderService },
        { provide: PartyService, useValue: mockPartyService },
        { provide: SnackbarService, useValue: mockSnackbarService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { data: of({ isQuoteMode: false }), snapshot: { data: { isQuoteMode: false } } } },
        { provide: ProductService, useValue: mockProductService },
        { provide: SupplierProductService, useValue: mockSupplierProductService },
        { provide: ReferenceDataStore, useValue: referenceDataStoreStub },
        { provide: Store, useValue: storeSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideTemplate(CreatePOComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreatePOComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize shared facilities and customer parties', () => {
    const mockParties = [{ partyId: 'PARTY1' }];

    referenceDataStoreStub.facilities.set([{ facilityId: 'FAC1', label: 'Facility 1' }]);
    mockOrderService.getCustomerParties.and.returnValue(of(mockParties));

    component.ngOnInit();

    expect(referenceDataStoreStub.ensureFacilitiesLoaded).toHaveBeenCalled();
    expect(mockOrderService.getCustomerParties).toHaveBeenCalled();
  });

  it('should not call createOrder if form is invalid', () => {
    component.poForm.patchValue({ vendorPartyId: '' }); // Required field left blank

    component.createPO();

    expect(mockOrderService.createOrder).not.toHaveBeenCalled();
  });

  it('should not create when already loading', () => {
    component.poForm.patchValue({
      vendorPartyId: 'VEND1',
      customerPartyId: 'CUST1',
      facilityId: 'FAC1',
      shipBeforeDate: '2025-08-01',
    });
    component.isLoading.set(true);

    component.createPO();

    expect(mockOrderService.createOrder).not.toHaveBeenCalled();
  });

  it('should call createOrder and navigate on success', () => {
    const orderId = 'PO123';
    component.poForm.patchValue({
      vendorPartyId: 'VEND1',
      customerPartyId: 'CUST1',
      facilityId: 'FAC1',
      shipBeforeDate: '2025-08-01',
      items: [{ productId: 'PRD_1', quantity: 2, unitAmount: 10, itemTypeEnumId: 'INVENTORY_ORDER_ITEM' }],
    });
    component.items.at(0).patchValue({
      productId: 'PRD_1',
      quantity: 2,
      unitAmount: 10,
      itemTypeEnumId: 'INVENTORY_ORDER_ITEM',
    });

    mockOrderService.createOrder.and.returnValue(of({ orderId, id: 101 }));

    component.createPO();

    expect(mockOrderService.createOrder).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith([`/pos/${101}`]);
    expect(mockSnackbarService.showSuccess).toHaveBeenCalledWith('PO.CREATE_SUCCESS');
  });

  it('should show error if createOrder fails', () => {
    component.poForm.patchValue({
      vendorPartyId: 'VEND1',
      customerPartyId: 'CUST1',
      facilityId: 'FAC1',
      shipBeforeDate: '2025-08-01',
      items: [{ productId: 'PRD_1', quantity: 2, unitAmount: 10, itemTypeEnumId: 'INVENTORY_ORDER_ITEM' }],
    });
    component.items.at(0).patchValue({
      productId: 'PRD_1',
      quantity: 2,
      unitAmount: 10,
      itemTypeEnumId: 'INVENTORY_ORDER_ITEM',
    });

    mockOrderService.createOrder.and.returnValue(throwError(() => new Error('API failure')));

    component.createPO();

    expect(mockSnackbarService.showError).toHaveBeenCalledWith('PO.CREATE_ERROR');
  });

  it('should fetch and map supplier list during autocomplete', fakeAsync(() => {
    const response = [{ partyId: 'VEND_1', name: 'Vendor 1' }];
    mockPartyService.getSuppliers.and.returnValue(of({ resultList: response }));

    let suppliers: any[] = [];
    component.filteredSuppliers$.subscribe((list) => {
      suppliers = list;
    });

    component.poForm.get('vendorPartyId')?.setValue('ven');
    tick(300); // debounce
    tick(); // flush subscribe chain

    expect(mockPartyService.getSuppliers).toHaveBeenCalledWith(0, 'ven');
    expect(suppliers).toEqual(response);
  }));

  it('should initialize quote mode and helper display methods', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [CreatePOComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: OrderService, useValue: mockOrderService },
        { provide: PartyService, useValue: mockPartyService },
        { provide: SnackbarService, useValue: mockSnackbarService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { data: of({ isQuoteMode: true }), snapshot: { data: { isQuoteMode: true } } } },
        { provide: ProductService, useValue: mockProductService },
        { provide: SupplierProductService, useValue: mockSupplierProductService },
        { provide: ReferenceDataStore, useValue: referenceDataStoreStub },
        { provide: Store, useValue: jasmine.createSpyObj('Store', ['dispatch', 'pipe']) },
        {
          provide: TranslateService,
          useValue: { instant: (key: string) => key, get: (key: string) => of(key) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideTemplate(CreatePOComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(CreatePOComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isQuoteMode).toBeTrue();
    expect(component.detailBasePath).toBe('/pos/quotes');
    expect(component.createTitleKey).toBe('PO.CREATE_QUOTE_TITLE');
    expect(component.createActionKey).toBe('PO.CREATE_QUOTE_ACTION');
    expect(component.displaySupplier(null)).toBe('');
    expect(component.displaySupplier('VEND1')).toBe('VEND1');
    expect(component.displaySupplier({ name: 'Vendor 1' })).toBe('Vendor 1');
    expect(component.displayProduct(null)).toBe('');
    expect(component.displayProduct('PROD1')).toBe('PROD1');
    expect(component.displayProduct({ productName: 'Product 1' } as any)).toBe('Product 1');
  });

  it('should handle missing order ids, add item completion, and supplier lookup failures', fakeAsync(() => {
    component.poForm.patchValue({
      vendorPartyId: { partyId: 'VEND1' },
      customerPartyId: 'CUST1',
      facilityId: 'FAC1',
      shipBeforeDate: '2025-08-01',
      estimatedDeliveryDate: '2025-08-02',
      shippingInstructions: 'Handle with care',
      shippingAmount: 5,
      discountAmount: 1,
    });
    component.items.at(0).patchValue({
      productId: { productId: 'PRD_1' },
      quantity: 2,
      unitAmount: 10,
      itemTypeEnumId: 'INVENTORY_ORDER_ITEM',
    });

    mockOrderService.createOrder.and.returnValue(of({}));
    component.createPO();
    expect(mockSnackbarService.showError).toHaveBeenCalledWith('PO.CREATE_MISSING_ID');

    mockSnackbarService.showError.calls.reset();
    mockOrderService.createOrder.and.returnValue(of({ orderId: 'PO123', id: 101 }));
    mockOrderService.addItem.and.returnValue(of({}));
    component.createPO();
    tick();
    expect(mockOrderService.addItem).toHaveBeenCalledWith(jasmine.objectContaining({
      orderId: 'PO123',
      shipGroupSeqId: '00001',
      productId: 'PRD_1',
      quantity: 2,
      unitAmount: 10,
    }));
    expect(mockSnackbarService.showSuccess).toHaveBeenCalledWith('PO.CREATE_SUCCESS');

    mockPartyService.getSuppliers.and.returnValue(throwError(() => new Error('lookup failed')));
    let suppliers: any[] = [];
    component.filteredSuppliers$.subscribe((list) => suppliers = list);
    component.poForm.get('vendorPartyId')?.setValue('broken');
    tick(200);
    tick();
    expect(suppliers).toEqual([]);
  }));

  it('should cover add-supplier dialog, helper trackBys, and item row guards', () => {
    const dialogSpy = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    dialogSpy.open = jasmine.createSpy().and.returnValue({ afterClosed: () => of({ partyId: 'VEND9', name: 'Vendor 9' }) } as any);
    const mouseEvent = jasmine.createSpyObj<MouseEvent>('MouseEvent', ['stopPropagation']);

    component.onAddSupplierMouseDown(mouseEvent);
    expect(mouseEvent.stopPropagation).toHaveBeenCalled();

    component.addSupplier();
    expect(dialogSpy.open).toHaveBeenCalled();
    expect(component.poForm.get('vendorPartyId')?.value).toEqual({ partyId: 'VEND9', name: 'Vendor 9' });

    expect(component.trackBySupplier(0, { partyId: 'SUP1' } as any)).toBe('SUP1');
    expect(component.trackByFacility(0, { facilityId: 'FAC1' } as any)).toBe('FAC1');
    expect(component.trackByFormIndex(3)).toBe(3);
    expect(component.trackByProduct(0, { productId: 'PROD1' } as any)).toBe('PROD1');
    expect(component.trackByItemType(0, { id: 'TYPE1' })).toBe('TYPE1');

    expect(component.items).toHaveSize(1);
    component.addItemRow();
    expect(component.items).toHaveSize(2);
    component.removeItemRow(0);
    expect(component.items).toHaveSize(1);
    component.removeItemRow(0);
    expect(component.items).toHaveSize(1);
  });

  it('should handle item-save failure after PO creation', fakeAsync(() => {
    component.poForm.patchValue({
      vendorPartyId: 'VEND1',
      customerPartyId: 'CUST1',
      facilityId: 'FAC1',
      shipBeforeDate: '2025-08-01',
    });
    component.items.at(0).patchValue({
      productId: 'PRD_1',
      quantity: 2,
      unitAmount: 10,
      itemTypeEnumId: 'INVENTORY_ORDER_ITEM',
    });

    mockOrderService.createOrder.and.returnValue(of({ orderId: 'PO123', id: 101 }));
    mockOrderService.addItem.and.returnValue(throwError(() => new Error('item failed')));

    component.createPO();
    tick();

    expect(mockSnackbarService.showError).toHaveBeenCalledWith('PO.CREATE_ITEMS_ERROR');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/pos/101']);
  }));

  it('should navigate directly when PO is created without line items', fakeAsync(() => {
    component.items.clear();
    component.poForm.patchValue({
      vendorPartyId: 'VEND1',
      customerPartyId: 'CUST1',
      facilityId: 'FAC1',
      shipBeforeDate: '2025-08-01',
    });

    mockOrderService.createOrder.and.returnValue(of({ orderId: 'PO123', id: 101 }));

    component.createPO();
    tick();

    expect(mockOrderService.addItem).not.toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/pos/101']);
  }));

  it('should cover supplier autocomplete and price lookup guards', () => {
    const productControl = component.items.at(0).get('productId');
    expect(productControl).toBeTruthy();

    component.onSupplierSelected({} as any);

    (component as any).applySupplierPrice(0, 'PRD_1');
    expect(mockSupplierProductService.getLatestByPartyAndProduct).not.toHaveBeenCalled();

    component.poForm.get('vendorPartyId')?.setValue('VEND1');
    mockSupplierProductService.getLatestByPartyAndProduct.and.returnValue(throwError(() => new Error('price failed')));
    expect(() => (component as any).applySupplierPrice(0, 'PRD_1')).not.toThrow();
    expect(mockSupplierProductService.getLatestByPartyAndProduct).toHaveBeenCalledWith('VEND1', 'PRD_1');
  });

  it('should cover supplier/product trackBy fallback branches and customer party error path', () => {
    mockOrderService.getCustomerParties.and.returnValue(throwError(() => new Error('party failed')));
    component.getCustomerParties();
    expect(component.customerParties()).toEqual([]);

    expect(component.trackBySupplier(4, {} as any)).toBe(4);
    expect(component.trackByFacility(5, {} as any)).toBe(5);
    expect(component.trackByProduct(6, {} as any)).toBe(6);
  });
});

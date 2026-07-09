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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { CreateSOComponent } from './create-so.component';
import { OrderService } from '@ofbiz/services/order/order.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { AddEditAddressComponent } from '../../party/add-edit-address/add-edit-address.component';

describe('CreateSOComponent', () => {
  let component: CreateSOComponent;
  let fixture: ComponentFixture<CreateSOComponent>;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let productServiceSpy: jasmine.SpyObj<ProductService>;
  let renderSchedulerSpy: jasmine.SpyObj<RenderSchedulerService>;
  let referenceDataStoreStub: Pick<ReferenceDataStore, 'facilities' | 'ensureFacilitiesLoaded'>;
  let translateSpy: jasmine.SpyObj<TranslateService>;

  function createComponent(): void {
    fixture = TestBed.createComponent(CreateSOComponent);
    component = fixture.componentInstance;
  }

  function setValidOrderModeForm(): void {
    component.orderForm.patchValue({
      productStoreId: 'STORE1',
      facilityId: 'FAC1',
      customerPartyId: 'CUST1',
      shippingAddress: {
        contactMechId: 'ADDR1',
        address1: '123 Main',
      },
    });
    component.items.at(0).patchValue({
      productId: { productId: 'PROD1' },
      quantity: 1,
      unitAmount: 10,
      itemTypeEnumId: 'PRODUCT_ORDER_ITEM',
    });
    component.paymentForm.patchValue({
      shipByMethod: 'FEDEX@GROUND',
      paymentTerm: 'NET_30',
    });
    component.updateVendorParty();
  }

  function setValidQuoteModeForm(): void {
    component.isQuoteMode = true;
    component.orderForm.patchValue({
      productStoreId: 'STORE1',
      facilityId: 'FAC1',
      customerPartyId: 'CUST1',
      shippingAddress: {
        contactMechId: 'ADDR1',
        address1: '123 Main',
      },
    });
    component.items.at(0).patchValue({
      productId: { productId: 'PROD1' },
      quantity: 1,
      unitAmount: 10,
      itemTypeEnumId: 'PRODUCT_ORDER_ITEM',
    });
    component.updateVendorParty();
  }

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj<OrderService>('OrderService', [
      'getProductStores',
      'createOrder',
      'addItem',
    ]);
    orderServiceSpy.getProductStores.and.returnValue(of([{ productStoreId: 'STORE1', payToPartyId: 'VENDOR1' }]));
    orderServiceSpy.createOrder.and.returnValue(of({ orderId: 'ORDER123', id: 55 }));
    orderServiceSpy.addItem.and.returnValue(of({}));

    partyServiceSpy = jasmine.createSpyObj<PartyService>('PartyService', [
      'getCustomersAutocompleteFromWms',
      'getPartyPostalContactMechByPurpose',
      'getPartyTelecomContactMechByPurpose',
    ]);
    partyServiceSpy.getCustomersAutocompleteFromWms.and.returnValue(of({ resultList: [] }));
    partyServiceSpy.getPartyPostalContactMechByPurpose.and.returnValue(of([]));
    partyServiceSpy.getPartyTelecomContactMechByPurpose.and.returnValue(of([]));

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    snackbarSpy = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    productServiceSpy = jasmine.createSpyObj<ProductService>('ProductService', [
      'getProductsAutocompleteFromOms',
      'getProduct',
      'getInventorySummary',
    ]);
    productServiceSpy.getProductsAutocompleteFromOms.and.returnValue(of({ documentList: [] }));
    productServiceSpy.getProduct.and.returnValue(of({ prices: [{ productPriceTypeId: 'DEFAULT_PRICE', price: 10 }] }));
    productServiceSpy.getInventorySummary.and.returnValue(of([{ atpTotal: 100 }]));
    dialogSpy = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);

    renderSchedulerSpy = jasmine.createSpyObj<RenderSchedulerService>('RenderSchedulerService', [
      'defer',
      'markForCheck',
      'detectChanges',
    ]);
    renderSchedulerSpy.defer.and.callFake((task: () => void) => task());

    referenceDataStoreStub = {
      facilities: signal([]),
      ensureFacilitiesLoaded: jasmine.createSpy('ensureFacilitiesLoaded'),
    };

    translateSpy = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant', 'get']);
    translateSpy.instant.and.callFake((key: string) => key);
    translateSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      declarations: [CreateSOComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: ProductService, useValue: productServiceSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: ReferenceDataStore, useValue: referenceDataStoreStub },
        { provide: TranslateService, useValue: translateSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({}),
            parent: { snapshot: { data: {} } },
            snapshot: { data: {} },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(CreateSOComponent, { set: { template: '' } })
      .compileComponents();
  });

  it('creates the component and fetches supporting data on init', () => {
    createComponent();

    component.ngOnInit();

    expect(orderServiceSpy.getProductStores).toHaveBeenCalled();
    expect(referenceDataStoreStub.ensureFacilitiesLoaded).toHaveBeenCalled();
    expect(component.isQuoteMode).toBeFalse();
  });

  it('applies quote mode and route metadata on init', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        data: of({ isQuoteMode: true, orderTypeId: 'QUOTE_ORDER', detailBasePath: '/quotes', listBasePath: '/quotes' }),
        parent: { snapshot: { data: {} } },
        snapshot: { data: {} },
      },
    });
    fixture = TestBed.createComponent(CreateSOComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isQuoteMode).toBeTrue();
    expect(component.orderTypeId).toBe('QUOTE_ORDER');
    expect(component.detailBasePath).toBe('/quotes');
    expect(component.listBasePath).toBe('/quotes');
  });

  it('returns an empty customer list when autocomplete fetch fails', (done) => {
    partyServiceSpy.getCustomersAutocompleteFromWms.and.returnValue(throwError(() => new Error('boom')));
    createComponent();

    component.getCustomersFromService('acme').subscribe((result) => {
      expect(result).toEqual([]);
      done();
    });
  });

  it('clears customer addresses and phones when their fetches fail', () => {
    partyServiceSpy.getPartyPostalContactMechByPurpose.and.returnValue(throwError(() => new Error('boom')));
    partyServiceSpy.getPartyTelecomContactMechByPurpose.and.returnValue(throwError(() => new Error('boom')));
    createComponent();

    component.customerAddresses = [{ contactMechId: 'OLD' }];
    component.customerPhones = [{ contactMechId: 'OLD' }];

    component.loadCustomerAddresses('CUST1');
    component.loadCustomerPhones('CUST1');

    expect(component.customerAddresses).toEqual([]);
    expect(component.customerPhones).toEqual([]);
  });

  it('loads unique customer addresses and phones and applies defaults', () => {
    partyServiceSpy.getPartyPostalContactMechByPurpose.and.returnValue(of([
      { contactMechId: 'ADDR1', address1: '123 Main' },
      { contactMechId: 'ADDR1', address1: '123 Main duplicate' },
      { contactMechId: 'ADDR2', address1: '456 Side' },
    ]));
    partyServiceSpy.getPartyTelecomContactMechByPurpose.and.returnValue(of([
      { contactMechId: 'PHONE1', countryCode: '+1' },
      { contactMechId: 'PHONE1', countryCode: '+1' },
      { contactMechId: 'PHONE2', countryCode: '+44' },
    ]));
    createComponent();

    component.loadCustomerAddresses('CUST1');
    component.loadCustomerPhones('CUST1');

    expect(component.customerAddresses).toHaveSize(2);
    expect(component.customerPhones).toHaveSize(2);
    expect(component.orderForm.get('shippingAddress')?.value.contactMechId).toBe('ADDR1');
    expect(component.orderForm.get('customerPhone')?.value.contactMechId).toBe('PHONE1');
  });

  it('handles customer selection branches and dialog-driven customer creation', fakeAsync(() => {
    createComponent();

    component.onCustomerSelected({ option: { value: 'CUST1' } } as any);
    expect(partyServiceSpy.getPartyPostalContactMechByPurpose).toHaveBeenCalledWith('CUST1', 'PRIMARY_LOCATION', 'customer');
    expect(partyServiceSpy.getPartyTelecomContactMechByPurpose).toHaveBeenCalledWith('CUST1', 'PRIMARY_PHONE', 'customer');

    component.onCustomerSelected({ option: { value: null } } as any);
    expect(component.customerAddresses).toEqual([]);
    expect(component.customerPhones).toEqual([]);

    dialogSpy.open.and.returnValue({ afterClosed: () => of({ partyId: 'CUST2', firstName: 'New', lastName: 'Customer' }) } as any);
    component.addBillToCustomer();
    tick();
    expect(dialogSpy.open).toHaveBeenCalled();
    expect(component.orderForm.get('customerPartyId')?.value.partyId).toBe('CUST2');

    dialogSpy.open.calls.reset();
    component.orderForm.get('customerPartyId')?.setValue(null);
    component.addCustomerPhone();
    component.addCustomerAddress();
    expect(dialogSpy.open).not.toHaveBeenCalled();
  }));

  it('shows the item-required error when the order has no items', () => {
    createComponent();

    component.fetchData();
    setValidOrderModeForm();
    component.items.clear();
    spyOnProperty(component.orderForm, 'invalid', 'get').and.returnValue(false);

    component.createOrder();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('SO.ITEM_REQUIRED');
    expect(orderServiceSpy.createOrder).not.toHaveBeenCalled();
  });

  it('blocks non-quote submission until payment form is valid', () => {
    createComponent();
    component.fetchData();
    setValidOrderModeForm();
    component.paymentForm.reset();
    spyOn(component.paymentForm, 'markAllAsTouched').and.callThrough();

    component.createOrder();

    expect(component.paymentForm.markAllAsTouched).toHaveBeenCalled();
    expect(orderServiceSpy.createOrder).not.toHaveBeenCalled();
  });

  it('adds and removes item rows with bounds checks', () => {
    createComponent();

    expect(component.items).toHaveSize(1);
    component.addItemRow();
    expect(component.items).toHaveSize(2);

    component.removeItemRow(0);
    expect(component.items).toHaveSize(1);

    component.removeItemRow(0);
    expect(component.items).toHaveSize(1);
  });

  it('creates a sales order with payment data and final success messaging', () => {
    createComponent();
    component.fetchData();
    setValidOrderModeForm();

    component.createOrder();

    expect(orderServiceSpy.createOrder).toHaveBeenCalledWith(jasmine.objectContaining({
      productStoreId: 'STORE1',
      facilityId: 'FAC1',
      customerPartyId: 'CUST1',
      vendorPartyId: 'VENDOR1',
      shipByMethod: 'FEDEX@GROUND',
      paymentTerm: 'NET_30',
    }));
    expect(orderServiceSpy.addItem).toHaveBeenCalledWith(jasmine.objectContaining({
      orderId: 'ORDER123',
      shipGroupSeqId: '00001',
      productId: 'PROD1',
      quantity: 1,
      unitAmount: 10,
      itemTypeEnumId: 'PRODUCT_ORDER_ITEM',
    }));
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('SO.CREATE_SUCCESS');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/orders/55']);
  });

  it('creates a sales quote without payment payload and uses quote success messaging', () => {
    createComponent();
    component.fetchData();
    setValidQuoteModeForm();

    component.createOrder();

    const payload = orderServiceSpy.createOrder.calls.mostRecent().args[0];
    expect(payload['shipByMethod']).toBeFalsy();
    expect(payload['paymentTerm']).toBeFalsy();
    expect(orderServiceSpy.addItem).toHaveBeenCalled();
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('SO.CREATE_QUOTE_SUCCESS');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/orders/55']);
  });

  it('shows the order save error when the API returns an incomplete response', () => {
    orderServiceSpy.createOrder.and.returnValue(of({ id: 55 } as any));
    createComponent();
    component.fetchData();
    setValidOrderModeForm();

    component.createOrder();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('SO.CREATE_ERROR');
    expect(orderServiceSpy.addItem).not.toHaveBeenCalled();
  });

  it('shows the order save error when the API call fails in order mode', () => {
    orderServiceSpy.createOrder.and.returnValue(throwError(() => new Error('boom')));
    createComponent();
    component.fetchData();
    setValidOrderModeForm();

    component.createOrder();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('SO.CREATE_SAVE_ERROR');
  });

  it('shows the quote save error when the API call fails in quote mode', () => {
    orderServiceSpy.createOrder.and.returnValue(throwError(() => new Error('boom')));
    createComponent();
    component.fetchData();
    setValidQuoteModeForm();

    component.createOrder();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('SO.CREATE_QUOTE_SAVE_ERROR');
  });

  it('blocks create when the order form is invalid and when quote payment data is missing', () => {
    createComponent();
    component.fetchData();

    component.createOrder();
    expect(orderServiceSpy.createOrder).not.toHaveBeenCalled();

    setValidQuoteModeForm();
    component.isQuoteMode = false;
    component.paymentForm.reset();
    spyOn(component.paymentForm, 'markAllAsTouched').and.callThrough();

    component.createOrder();

    expect(component.paymentForm.markAllAsTouched).toHaveBeenCalled();
    expect(orderServiceSpy.createOrder).not.toHaveBeenCalled();
  });

  it('covers autocomplete blank and error branches plus product selection no-op', fakeAsync(() => {
    createComponent();
    component.fetchData();
    (component as any).initProductAutocomplete(0);

    const productControl = component.items.at(0).get('productId');
    const filteredValues: any[] = [];
    component.filteredProducts[0].subscribe((result) => filteredValues.push(result));

    productControl?.setValue('');
    tick(301);
    expect(filteredValues.pop()).toEqual([]);

    productServiceSpy.getProductsAutocompleteFromOms.and.returnValue(throwError(() => new Error('boom')));
    productControl?.setValue('ac');
    tick(301);
    expect(filteredValues.pop()).toEqual([]);

    component.onProductSelected({ option: { value: null } } as any, 0);
    expect(productServiceSpy.getProduct).not.toHaveBeenCalledWith(null as any);
    expect(productServiceSpy.getInventorySummary).not.toHaveBeenCalledWith(null as any);
  }));

  it('covers add item error handling and helper display branches', () => {
    createComponent();
    component.fetchData();
    setValidOrderModeForm();
    spyOn(component.orderForm, 'reset').and.callThrough();
    spyOn(component.items, 'clear').and.callThrough();
    orderServiceSpy.addItem.and.returnValue(throwError(() => new Error('boom')));

    component.items.clear();
    component.items.push(component['buildItemGroup']());
    component.orderForm.patchValue({
      productStoreId: 'STORE1',
      facilityId: 'FAC1',
      customerPartyId: { partyId: 'CUST1' },
    });
    component['addOrderItems']('ORDER123', 55, '00001');

    expect(snackbarSpy.showError).toHaveBeenCalledWith('SO.CREATE_ITEMS_ERROR');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/orders/55']);
    expect(component.displayCustomer('Plain Customer')).toBe('Plain Customer');
    expect(component.displayProduct({ internalName: 'Internal' })).toBe('Internal');
    expect(component.displayProduct({ productId: 'PROD1' })).toBe('PROD1');
    expect(component.formatAddress(null)).toBe('');
    expect(component.formatPhone(null)).toBe('');
    expect(component.isSubmitDisabled()).toBeTrue();
    expect(component.getMissingFieldsTooltip()).toContain('Items');
    expect(component.createTitleKey).toBe('SO.CREATE_TITLE');
    expect(component.submitLabelKey).toBe('SO.CREATE_ACTION');
  });

  it('covers helper methods, submit guards, and customer address dialog flow', fakeAsync(() => {
    createComponent();
    component.fetchData();
    setValidOrderModeForm();

    expect(component.formatPhone({ countryCode: '+1', areaCode: '555', contactNumber: '1234' })).toBe('+1 555 1234');
    expect(component.formatAddress({ toName: 'John', address1: '123 Main', city: 'SLC', postalCode: '84111' })).toContain('123 Main');
    expect((component as any).buildOrderAddress({ contactMechId: 'ADDR1', address1: '123 Main' })).toEqual(jasmine.objectContaining({
      contactMechId: 'ADDR1',
      contactMechPurposeTypeId: 'SHIPPING_LOCATION',
    }));
    expect((component as any).buildOrderAddress(null)).toBeNull();

    expect(component.isSubmitDisabled()).toBeFalse();
    component.paymentForm.reset();
    expect(component.isSubmitDisabled()).toBeTrue();
    expect(component.getMissingFieldsTooltip()).toContain('Ship By');

    component.orderForm.get('customerPartyId')?.setValue({ partyId: 'CUST1' });
    dialogSpy.open.and.returnValue({ afterClosed: () => of({}) } as any);
    component.addCustomerAddress();
    tick();
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditAddressComponent, jasmine.anything());

    dialogSpy.open.calls.reset();
    component.orderForm.get('customerPartyId')?.setValue(null);
    component.addCustomerAddress();
    expect(dialogSpy.open).not.toHaveBeenCalled();

    expect(component.trackByStore(0, { productStoreId: 'STORE1' })).toBe('STORE1');
    expect(component.trackByFacility(0, { facilityId: 'FAC1' })).toBe('FAC1');
    expect(component.trackByCustomer(0, { partyId: 'CUST1' })).toBe('CUST1');
    expect(component.trackByAddress(0, { contactMechId: 'ADDR1' })).toBe('ADDR1');
    expect(component.trackByPhone(0, { contactMechId: 'PHONE1' })).toBe('PHONE1');
    expect(component.trackByFormIndex(4)).toBe(4);
    expect(component.trackByProduct(0, { productId: 'PROD1' })).toBe('PROD1');
    expect(component.trackByOptionId(0, { id: 'OPT1' })).toBe('OPT1');
  }));

  it('covers helper display methods and getCustomersFromService success path', (done) => {
    createComponent();

    expect(component.displayCustomer(null)).toBe('');
    expect(component.displayCustomer('CUST1')).toBe('CUST1');
    expect(component.displayCustomer({ name: 'Alice' })).toBe('Alice');
    expect(component.displayCustomer({ firstName: 'Alice', lastName: 'Smith' })).toBe('Alice Smith');
    expect(component.displayCustomer({ partyId: 'CUST9' })).toBe('CUST9');
    expect(component.displayProduct(null)).toBe('');
    expect(component.displayProduct('PROD1')).toBe('PROD1');
    partyServiceSpy.getCustomersAutocompleteFromWms.and.returnValue(of({ resultList: [{ partyId: 'CUST1' }] } as any));
    component.getCustomersFromService('acme').subscribe((result) => {
      expect(result).toEqual([{ partyId: 'CUST1' }]);
      done();
    });
  });

  it('covers vendor sync, product selection, and quote missing-id branch', () => {
    createComponent();
    component.fetchData();

    component.orderForm.get('productStoreId')?.setValue('STORE1');
    component.updateVendorParty();
    expect(component.orderForm.get('vendorPartyId')?.value).toBe('VENDOR1');

    component.onProductSelected({ option: { value: { productId: 'PROD1', productName: 'Product 1' } } } as any, 0);
    expect(productServiceSpy.getProduct).toHaveBeenCalledWith('PROD1');
    expect(productServiceSpy.getInventorySummary).toHaveBeenCalledWith('PROD1');

    component.isQuoteMode = true;
    setValidQuoteModeForm();
    orderServiceSpy.createOrder.and.returnValue(of({ id: 55 } as any));
    component.createOrder();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('SO.CREATE_QUOTE_ERROR');
  });
});

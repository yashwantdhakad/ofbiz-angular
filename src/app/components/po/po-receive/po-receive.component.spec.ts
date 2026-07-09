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
import { FormBuilder } from '@angular/forms';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { POReceiveComponent } from './po-receive.component';
import { PartyService } from '@ofbiz/services/oms/party/party.service';

describe('POReceiveComponent barcode matching', () => {
  let component: POReceiveComponent;
  let snackbarSpy: jasmine.SpyObj<any>;
  let routerSpy: jasmine.SpyObj<any>;
  let orderServiceSpy: jasmine.SpyObj<any>;
  let facilityServiceSpy: jasmine.SpyObj<any>;
  let dialogSpy: jasmine.SpyObj<any>;
  let lotServiceSpy: jasmine.SpyObj<any>;
  let partyServiceSpy: jasmine.SpyObj<any>;
  const fb = new FormBuilder();

  beforeEach(() => {
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    orderServiceSpy = jasmine.createSpyObj('OrderService', [
      'getOrderById',
      'getOrderDisplayInfoById',
      'getProductStores',
      'receivePurchaseOrder',
      'apportionLandedCosts',
    ]);
    facilityServiceSpy = jasmine.createSpyObj('FacilityService', [
      'getFacilityLocations',
      'createFacilityLocation',
    ]);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    lotServiceSpy = jasmine.createSpyObj('LotService', ['listLots']);
    partyServiceSpy = jasmine.createSpyObj('PartyService', ['getCustomersAutocompleteFromWms']);
    orderServiceSpy.getProductStores.and.returnValue(of([]));
    lotServiceSpy.listLots.and.returnValue(of({ resultList: [] }));
    partyServiceSpy.getCustomersAutocompleteFromWms.and.returnValue(of({ resultList: [] }));
    TestBed.configureTestingModule({
      providers: [{ provide: PartyService, useValue: partyServiceSpy }],
    });
    component = TestBed.runInInjectionContext(() =>
      new POReceiveComponent(
        {} as any,
        routerSpy,
        orderServiceSpy,
        fb,
        snackbarSpy,
        {
          instant: (key: string, params?: { value?: string }) =>
            params?.value ? `${key}:${params.value}` : key,
        } as any,
        facilityServiceSpy,
        dialogSpy,
        lotServiceSpy
      )
    );
    component.items.push(fb.group({ productId: ['SKU-100'] }));
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
  });

  it('matches a product SKU without changing its case-sensitive value', () => {
    component.onProductBarcodeScanned(' sku-100 ');

    expect(component.scannedItemIndex()).toBe(0);
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('BARCODE.PRODUCT_MATCHED:sku-100');
    expect(snackbarSpy.showError).not.toHaveBeenCalled();
  });

  it('shows an error when the scanned product is not on the order', () => {
    component.onProductBarcodeScanned('SKU-404');

    expect(component.scannedItemIndex()).toBeNull();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('BARCODE.PRODUCT_NOT_FOUND:SKU-404');
  });

  it('loads PO data, locations, and creates item form rows', () => {
    orderServiceSpy.getOrderDisplayInfoById.and.returnValue(of({
      orderHeader: { orderId: 'PO-1' },
      firstPart: { vendorPartyId: 'VENDOR-1', facilityId: 'FAC-1', orderPartSeqId: '00002' },
    }));
    orderServiceSpy.getOrderById.and.returnValue(of({
      parts: [{
        facility: { facilityId: 'FAC-1' },
        items: [{
          orderItemSeqId: '0001',
          productId: 'SKU-100',
          product: { productName: 'Widget', serialized: 'Y' },
          quantity: 5,
          receivedQuantity: 1,
          remainingQuantity: 4,
          unitAmount: 12,
        }],
      }],
    }));
    facilityServiceSpy.getFacilityLocations.and.returnValue(of({
      resultList: [{ facilityId: 'FAC-1', locationSeqId: 'A1' }],
    }));
    orderServiceSpy.getProductStores.and.returnValue(of([{ payToPartyId: 'OWNER-1' }]));

    component.loadOrderById('10001');

    expect(component.orderId).toBe('PO-1');
    expect(component.vendorPartyId).toBe('VENDOR-1');
    expect(component.facilityId).toBe('FAC-1');
    expect(component.shipGroupSeqId).toBe('00002');
    expect(component.items).toHaveSize(1);
    expect(component.items.at(0).value).toEqual(jasmine.objectContaining({
      productId: 'SKU-100',
      productName: 'Widget',
      serialized: true,
      receiveQuantity: 4,
      ownerPartyId: 'OWNER-1',
    }));
    expect(component.allFacilityLocations()).toEqual([{ facilityId: 'FAC-1', locationSeqId: 'A1' }]);
    expect(component.isLoading()).toBeFalse();
  });

  it('handles load failure with backend detail message', () => {
    orderServiceSpy.getOrderDisplayInfoById.and.returnValue(throwError(() => ({
      error: { detail: 'load failed' },
    })));

    component.loadOrderById('10001');

    expect(snackbarSpy.showError).toHaveBeenCalledWith('load failed');
    expect(component.isLoading()).toBeFalse();
  });

  it('validates receive payload and rejects empty or fractional serialized quantities', () => {
    component.orderId = 'PO-1';
    component.items.clear();
    component.items.push(fb.group({
      orderItemSeqId: ['0001'],
      productId: ['SKU-100'],
      serialized: [false],
      unitAmount: [10],
      receiveQuantity: [0],
      locationSeqId: ['A1'],
      lotId: ['LOT-1'],
      expirationDate: ['2024-01-02'],
      ownerPartyId: ['OWNER-1'],
    }));

    component.receiveItems();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('PO.RECEIVE_NO_QTY');

    snackbarSpy.showError.calls.reset();
    component.items.at(0).patchValue({ serialized: true, receiveQuantity: 1.5 });
    component.receiveItems();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('ASSET.SERIALIZED_WHOLE_QTY');
    expect(orderServiceSpy.receivePurchaseOrder).not.toHaveBeenCalled();
  });

  it('receives items, auto-applies landed costs, and navigates back to detail', () => {
    component.orderId = 'PO-1';
    component.orderPrimaryId = '10001';
    component.facilityId = 'FAC-1';
    component.vendorPartyId = 'VENDOR-1';
    component.shipGroupSeqId = '00001';
    component.items.clear();
    component.items.push(fb.group({
      orderItemSeqId: ['0001'],
      productId: ['SKU-100'],
      serialized: [false],
      unitAmount: [10],
      receiveQuantity: [2],
      locationSeqId: ['A1'],
      lotId: [{ lotId: 'LOT-1' }],
      expirationDate: ['2024-01-02'],
      ownerPartyId: [{ partyId: 'OWNER-1' }],
    }));
    component.itemsForm.get('customs')?.patchValue({
      billOfEntryNumber: 'BOE-1',
      billOfEntryDate: '2024-01-03',
      dutyAmount: 5,
      clearingFees: 3,
      freightAmount: 2,
    });
    orderServiceSpy.receivePurchaseOrder.and.returnValue(of({
      shipmentIds: ['SHIP-1'],
      receivedItems: [{ inventoryItemId: 'INV-1', productId: 'SKU-100', quantity: 2 }],
    }));
    orderServiceSpy.apportionLandedCosts.and.returnValue(of({}));

    component.receiveItems();

    expect(orderServiceSpy.receivePurchaseOrder).toHaveBeenCalledWith('PO-1', jasmine.objectContaining({
      facilityId: 'FAC-1',
      vendorPartyId: 'VENDOR-1',
      shipGroupSeqId: '00001',
      items: [jasmine.objectContaining({
        quantity: 2,
        lotId: 'LOT-1',
        ownerPartyId: 'OWNER-1',
      })],
    }));
    expect(orderServiceSpy.apportionLandedCosts).toHaveBeenCalledWith(jasmine.objectContaining({
      orderId: 'PO-1',
      shipmentId: 'SHIP-1',
      allocationMethod: 'VALUE',
      dutyAmount: 5,
      clearingFees: 3,
      freightAmount: 2,
    }));
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('PO.RECEIVE_SUCCESS');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('PO.LANDED_COST_SUCCESS');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/pos/10001']);
  });

  it('adds a new facility location from dialog and patches the row', () => {
    component.facilityId = 'FAC-1';
    component.items.clear();
    component.items.push(fb.group({ facilityId: ['FAC-1'], locationSeqId: [null] }));
    dialogSpy.open.and.returnValue({ afterClosed: () => of({ locationSeqId: 'NEW-1' }) });
    facilityServiceSpy.createFacilityLocation.and.returnValue(of({ locationSeqId: 'NEW-1', description: 'New' }));

    component.openAddLocationDialog(0);

    expect(facilityServiceSpy.createFacilityLocation).toHaveBeenCalledWith({ locationSeqId: 'NEW-1' });
    expect(component.items.at(0).get('locationSeqId')?.value).toBe('NEW-1');
    expect(component.allFacilityLocations()).toEqual([
      { locationSeqId: 'NEW-1', description: 'New', facilityId: 'FAC-1' },
    ]);
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('PO.LOCATION_SUCCESS');
  });

  it('returns display labels, filtered locations, and normalized local dates', () => {
    component.facilityId = 'FAC-1';
    component.allFacilityLocations.set([
      { facilityId: 'FAC-1', locationSeqId: 'A1' },
      { facilityId: 'FAC-2', locationSeqId: 'B1' },
    ]);

    expect(component.getLocationsForItem({ value: { facilityId: 'FAC-1' } })).toEqual([
      { facilityId: 'FAC-1', locationSeqId: 'A1' },
    ]);
    expect(component.displayLot({ lotId: 'LOT-1', heatNumber: 'H1' })).toBe('LOT-1 (Heat: H1)');
    expect(component.displayLot('LOT-2')).toBe('LOT-2');
    expect(component.displayParty({ name: 'Owner' })).toBe('Owner');
    expect(component.displayParty({ partyId: 'OWNER-1' })).toBe('OWNER-1');
    expect((component as any).toLocalDateTime('bad-date')).toBeNull();
    expect((component as any).toLocalDateTime('2024-01-02')).toContain('2024-01-');
  });

  it('handles error when receivePurchaseOrder fails', () => {
    component.orderId = 'PO-1';
    component.items.clear();
    component.items.push(fb.group({
      orderItemSeqId: ['0001'],
      productId: ['SKU-100'],
      serialized: [false],
      unitAmount: [10],
      receiveQuantity: [2],
      locationSeqId: ['A1'],
      lotId: ['LOT-1'],
      expirationDate: ['2024-01-02'],
      ownerPartyId: ['OWNER-1'],
    }));
    orderServiceSpy.receivePurchaseOrder.and.returnValue(throwError(() => ({
      error: { message: 'Receive API error' }
    })));

    component.receiveItems();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('Receive API error');
    expect(component.isLoading()).toBeFalse();
  });

  it('handles error fallback when receivePurchaseOrder fails without error message', () => {
    component.orderId = 'PO-1';
    component.items.clear();
    component.items.push(fb.group({
      orderItemSeqId: ['0001'],
      productId: ['SKU-100'],
      serialized: [false],
      unitAmount: [10],
      receiveQuantity: [2],
      locationSeqId: ['A1'],
      lotId: ['LOT-1'],
      expirationDate: ['2024-01-02'],
      ownerPartyId: ['OWNER-1'],
    }));
    orderServiceSpy.receivePurchaseOrder.and.returnValue(throwError(() => new Error('Raw error')));

    component.receiveItems();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('PO.RECEIVE_ERROR');
    expect(component.isLoading()).toBeFalse();
  });

  it('handles error when apportionLandedCosts fails', () => {
    component.orderId = 'PO-1';
    component.orderPrimaryId = '10001';
    component.items.clear();
    component.items.push(fb.group({
      orderItemSeqId: ['0001'],
      productId: ['SKU-100'],
      serialized: [false],
      unitAmount: [10],
      receiveQuantity: [2],
      locationSeqId: ['A1'],
      lotId: ['LOT-1'],
      expirationDate: ['2024-01-02'],
      ownerPartyId: ['OWNER-1'],
    }));
    component.itemsForm.get('customs')?.patchValue({ dutyAmount: 5 });
    orderServiceSpy.receivePurchaseOrder.and.returnValue(of({
      shipmentIds: ['SHIP-1'],
      receivedItems: [{ inventoryItemId: 'INV-1', productId: 'SKU-100', quantity: 2 }],
    }));
    orderServiceSpy.apportionLandedCosts.and.returnValue(throwError(() => new Error('Landed cost error')));

    component.receiveItems();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('PO.LANDED_COST_ERROR');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/pos/10001']);
  });

  it('wires lot and owner autocompletes', fakeAsync(() => {
    orderServiceSpy.getOrderDisplayInfoById.and.returnValue(of({
      orderHeader: { orderId: 'PO-1' },
      firstPart: { vendorPartyId: 'VENDOR-1', facilityId: 'FAC-1', orderPartSeqId: '00002' },
    }));
    orderServiceSpy.getOrderById.and.returnValue(of({
      parts: [{
        facility: { facilityId: 'FAC-1' },
        items: [{
          orderItemSeqId: '0001',
          productId: 'SKU-100',
          product: { productName: 'Widget', serialized: 'Y' },
          quantity: 5,
          receivedQuantity: 1,
          remainingQuantity: 4,
          unitAmount: 12,
        }],
      }],
    }));
    facilityServiceSpy.getFacilityLocations.and.returnValue(of({ resultList: [] }));
    lotServiceSpy.listLots.and.returnValue(of({ resultList: [{ lotId: 'LOT-A' }] }));
    partyServiceSpy.getCustomersAutocompleteFromWms.and.returnValue(of({ resultList: [{ partyId: 'OWNER-A' }] }));

    component.loadOrderById('PO-1');

    // Subscribe to streams
    let lots: any[] = [];
    component.filteredLotsByRow[0].subscribe(l => lots = l);

    let parties: any[] = [];
    component.filteredPartiesByRow[0].subscribe(p => parties = p);

    const row = component.items.at(0);
    row.get('lotId')?.setValue('LOT');
    tick(400);
    expect(lotServiceSpy.listLots).toHaveBeenCalledWith(0, 'LOT', 8);
    expect(lots).toEqual([{ lotId: 'LOT-A' }]);

    row.get('ownerPartyId')?.setValue('OWN');
    tick(400);
    expect(partyServiceSpy.getCustomersAutocompleteFromWms).toHaveBeenCalledWith('OWN');
    expect(parties).toEqual([{ partyId: 'OWNER-A' }]);
  }));

  it('falls back to facilityId from parts when firstPart facilityId is missing', () => {
    orderServiceSpy.getOrderDisplayInfoById.and.returnValue(of({
      orderHeader: { orderId: 'PO-1' },
      firstPart: { vendorPartyId: 'VENDOR-1', orderPartSeqId: '00002' },
    }));
    orderServiceSpy.getOrderById.and.returnValue(of({
      parts: [{
        facilityId: 'FAC-PART-1',
        items: [{
          orderItemSeqId: '0001',
          productId: 'SKU-100',
          product: { productName: 'Widget', serialized: 'Y' },
          quantity: 5,
          receivedQuantity: 1,
          remainingQuantity: 4,
          unitAmount: 12,
        }],
      }],
    }));
    facilityServiceSpy.getFacilityLocations.and.returnValue(of({ resultList: [] }));

    component.loadOrderById('10001');

    expect(facilityServiceSpy.getFacilityLocations).toHaveBeenCalledWith('FAC-PART-1', 0, 1000);
  });

  it('falls back to facility.facilityId from parts when firstPart and parts facilityId is missing', () => {
    orderServiceSpy.getOrderDisplayInfoById.and.returnValue(of({
      orderHeader: { orderId: 'PO-1' },
      firstPart: { vendorPartyId: 'VENDOR-1', orderPartSeqId: '00002' },
    }));
    orderServiceSpy.getOrderById.and.returnValue(of({
      parts: [{
        facility: { facilityId: 'FAC-FACILITY-1' },
        items: [{
          orderItemSeqId: '0001',
          productId: 'SKU-100',
          product: { productName: 'Widget', serialized: 'Y' },
          quantity: 5,
          receivedQuantity: 1,
          remainingQuantity: 4,
          unitAmount: 12,
        }],
      }],
    }));
    facilityServiceSpy.getFacilityLocations.and.returnValue(of({ resultList: [] }));

    component.loadOrderById('10001');

    expect(facilityServiceSpy.getFacilityLocations).toHaveBeenCalledWith('FAC-FACILITY-1', 0, 1000);
  });

  it('offers landed cost allocation dialog and handles selection', () => {
    component.orderId = 'PO-1';
    component.orderPrimaryId = '10001';
    component.items.clear();
    component.items.push(fb.group({
      orderItemSeqId: ['0001'],
      productId: ['SKU-100'],
      serialized: [false],
      unitAmount: [10],
      receiveQuantity: [2],
      locationSeqId: ['A1'],
      lotId: ['LOT-1'],
      expirationDate: ['2024-01-02'],
      ownerPartyId: ['OWNER-1'],
    }));
    component.itemsForm.get('customs')?.patchValue({ dutyAmount: 5 });
    
    // 1. selection truthy
    dialogSpy.open.and.returnValue({ afterClosed: () => of({ allocationMethod: 'VALUE' }) } as any);
    orderServiceSpy.apportionLandedCosts.and.returnValue(of({ success: true }));
    (component as any).offerLandedCostAllocation({
      shipmentIds: ['SHIP-1'],
      receivedItems: [{ inventoryItemId: 'INV-1', productId: 'SKU-100', quantity: 2 }]
    });
    expect(orderServiceSpy.apportionLandedCosts).toHaveBeenCalled();
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('PO.LANDED_COST_SUCCESS');

    // 2. selection falsy (cancel dialog)
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    (component as any).offerLandedCostAllocation({
      shipmentIds: ['SHIP-1'],
      receivedItems: [{ inventoryItemId: 'INV-1', productId: 'SKU-100', quantity: 2 }]
    });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/pos/10001']);
  });
});

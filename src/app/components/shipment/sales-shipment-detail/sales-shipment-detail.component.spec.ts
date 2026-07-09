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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { SalesShipmentDetailComponent } from './sales-shipment-detail.component';
import { ShipmentService } from '@ofbiz/services/shipment/shipment.service';
import { OrderService } from '@ofbiz/services/order/order.service';
import { MatDialog } from '@angular/material/dialog';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

describe('SalesShipmentDetailComponent', () => {
  let component: SalesShipmentDetailComponent;
  let fixture: ComponentFixture<SalesShipmentDetailComponent>;
  let shipmentServiceSpy: jasmine.SpyObj<ShipmentService>;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let translateSpy: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    shipmentServiceSpy = jasmine.createSpyObj('ShipmentService', [
      'getSalesShipmentDetail',
      'addShipmentPackage',
      'shipShipment',
      'updateShipmentStatus',
      'getPackingSlipPdf',
      'getShippingLabelPdf',
      'printShippingLabel',
      'generateCarrierLabels',
      'deleteShipmentPackage',
    ]);
    orderServiceSpy = jasmine.createSpyObj('OrderService', [
      'updateOrderContactMech',
      'upsertOrderShippingPhone',
      'updateShippingInstructions',
    ]);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    translateSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    translateSpy.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      declarations: [SalesShipmentDetailComponent],
      providers: [
        { provide: ShipmentService, useValue: shipmentServiceSpy },
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ shipmentId: 'SHIP-SALES-1' }),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(SalesShipmentDetailComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SalesShipmentDetailComponent);
    component = fixture.componentInstance;
  });

  function detailResponse(overrides: any = {}) {
    return {
      shipment: {
        shipmentId: 'SHIP-SALES-1',
        statusId: 'SHIPMENT_PACKED',
        primaryOrderId: 'SO-1',
        primaryShipGroupSeqId: '00001',
        handlingInstructions: 'Keep upright',
        partyIdTo: 'CUST-1',
        originFacilityId: 'FAC-1',
      },
      items: [
        { shipmentItemSeqId: '0001', quantity: '5', productId: 'PROD-1', shipmentContentDescription: 'Widget' },
        { shipmentItemSeqId: '0002', quantity: '2', productId: 'PROD-2', shipmentContentDescription: 'Bolt' },
      ],
      packages: [{ shipmentPackageSeqId: 'PKG-1', shipmentBoxTypeId: 'BOX_A' }],
      packageContents: [{ shipmentPackageSeqId: 'PKG-1', shipmentItemSeqId: '0001', quantity: '2' }],
      packageRouteSegments: [{ shipmentPackageSeqId: 'PKG-1', trackingCode: 'TRACK-1' }],
      routeSegments: [{ carrierPartyId: 'FEDEX', carrierService: 'GROUND', shipmentMethodTypeId: 'STANDARD' }],
      boxTypes: [{ shipmentBoxTypeId: 'BOX_A', description: 'Carton' }],
      statuses: [
        { statusId: 'SHIPMENT_INPUT', statusDate: '2026-04-07T08:00:00', changeByUserLoginId: 'picker' },
        { statusId: 'SHIPMENT_PACKED', statusDate: '2026-04-07T09:00:00', changeByUserLoginId: 'packer' },
      ],
      shipmentMethodTypeMap: { STANDARD: 'Standard Ground' },
      shipToName: 'Customer Name',
      shipToAddressLines: ['Line 1', 'City'],
      shipToPhone: '+1 408 5551234',
      shipToAddress: {
        contactMechId: 'CM-1',
        contactMechPurposeTypeId: 'SHIPPING_LOCATION',
        postalAddress: {
          toName: 'Customer Name',
          address1: 'Line 1',
          city: 'San Jose',
          postalCode: '95131',
          countryGeoId: 'USA',
          stateProvinceGeoId: 'CA',
        },
      },
      shipToPhoneData: {
        telecomNumber: { countryCode: '+1', areaCode: '408', contactNumber: '5551234' },
      },
      shipFromName: 'Main Warehouse',
      shipFromAddressLines: ['WH Line 1'],
      shippingLabelContentType: 'application/pdf',
      shippingLabelPreviewAvailable: true,
      shippingLabelThermalAvailable: true,
      ...overrides,
    };
  }

  it('maps shipment status history entries when sales detail loads', fakeAsync(() => {
    shipmentServiceSpy.getSalesShipmentDetail.and.returnValue(of(detailResponse({
      shipment: { shipmentId: 'SHIP-SALES-1', statusId: 'SHIPMENT_SHIPPED' },
      statuses: [
        { statusId: 'SHIPMENT_INPUT', statusDate: '2026-04-07T08:00:00', changeByUserLoginId: 'picker' },
        { statusId: 'SHIPMENT_SHIPPED', statusDate: '2026-04-07T13:00:00', changeByUserLoginId: 'shipper' },
      ],
    })));

    fixture.detectChanges();
    tick();

    expect(shipmentServiceSpy.getSalesShipmentDetail).toHaveBeenCalledWith('SHIP-SALES-1');
    expect(component.statusHistoryEntries()).toEqual([
      jasmine.objectContaining({
        statusId: 'SHIPMENT_INPUT',
        statusLabel: 'Input',
        changedAt: '2026-04-07T08:00:00',
        changedBy: 'picker',
      }),
      jasmine.objectContaining({
        statusId: 'SHIPMENT_SHIPPED',
        statusLabel: 'Shipped',
        changedAt: '2026-04-07T13:00:00',
        changedBy: 'shipper',
      }),
    ]);
  }));

  it('hydrates computed state and package helpers from the loaded detail', fakeAsync(() => {
    shipmentServiceSpy.getSalesShipmentDetail.and.returnValue(of(detailResponse()));

    fixture.detectChanges();
    tick();

    expect(component.displayShippingMethod()).toBe('Standard Ground');
    expect(component.displayCarrierParty()).toBe('FEDEX');
    expect(component.displayCarrierService()).toBe('GROUND');
    expect(component.hasShippingLabelPreview()).toBeTrue();
    expect(component.hasThermalShippingLabel()).toBeTrue();
    expect(component.hasGeneratedShippingLabel()).toBeTrue();
    expect(component.canGenerateShippingLabel()).toBeFalse();
    expect(component.getPackedQty('0001')).toBe(2);
    expect(component.getRemainingQty({ shipmentItemSeqId: '0001', quantity: '5' })).toBe(3);
    expect(component.getQtyToPack({ shipmentItemSeqId: '0001' })).toBe(3);
    expect(component.getPackageContentsForPackage('PKG-1')).toEqual([
      jasmine.objectContaining({ productId: 'PROD-1', description: 'Widget' }),
    ]);
    expect(component.getTrackingCodeForPackage('PKG-1')).toBe('TRACK-1');
    expect(component.getBoxTypeLabel('BOX_A')).toBe('Carton');
  }));

  it('clears history and loading on load error', fakeAsync(() => {
    shipmentServiceSpy.getSalesShipmentDetail.and.returnValue(throwError(() => new Error('load failed')));

    fixture.detectChanges();
    tick();

    expect(component.isLoading()).toBeFalse();
    expect(component.statusHistoryEntries()).toEqual([]);
  }));

  it('creates packages from selected items and refreshes after success', fakeAsync(() => {
    shipmentServiceSpy.getSalesShipmentDetail.and.returnValues(of(detailResponse()), of(detailResponse()));
    shipmentServiceSpy.addShipmentPackage.and.returnValue(of({} as any));
    dialogSpy.open.and.returnValue({
      afterClosed: () => of({
        shipmentBoxTypeId: 'BOX_A',
        boxLength: '10',
        boxWidth: '20',
        boxHeight: '30',
        weight: '5',
        boxNo: '1',
      }),
    } as any);

    fixture.detectChanges();
    tick();
    component.toggleItemSelection('0001', true);

    component.openCreatePackageDialog();
    tick();

    expect(shipmentServiceSpy.addShipmentPackage).toHaveBeenCalledWith('SHIP-SALES-1', jasmine.objectContaining({
      shipmentBoxTypeId: 'BOX_A',
      items: [{ shipmentItemSeqId: '0001', quantity: '3' }],
    }));
    expect(component.selectedItemSeqIds().size).toBe(0);
    expect(shipmentServiceSpy.getSalesShipmentDetail).toHaveBeenCalledTimes(2);
  }));

  it('updates order contact data through the edit dialogs and refreshes', fakeAsync(() => {
    shipmentServiceSpy.getSalesShipmentDetail.and.returnValue(of(detailResponse()));
    orderServiceSpy.upsertOrderShippingPhone.and.returnValue(of({} as any));
    orderServiceSpy.updateShippingInstructions.and.returnValue(of({} as any));
    dialogSpy.open.and.returnValues(
      { afterClosed: () => of({ address1: 'Updated' }) } as any,
      { afterClosed: () => of({ contactNumber: '999', areaCode: '408', countryCode: '+1' }) } as any,
      { afterClosed: () => of('Fragile') } as any,
    );

    fixture.detectChanges();
    tick();

    component.editShipToAddress();
    tick();
    component.editShipToPhone();
    tick();
    component.editHandlingInstructions();
    tick();

    expect(orderServiceSpy.upsertOrderShippingPhone).toHaveBeenCalledWith('SO-1', {
      contactNumber: '999',
      areaCode: '408',
      countryCode: '+1',
    });
    expect(orderServiceSpy.updateShippingInstructions).toHaveBeenCalledWith('SO-1', '00001', 'Fragile');
    expect(shipmentServiceSpy.getSalesShipmentDetail).toHaveBeenCalledTimes(4);
  }));

  it('opens the packing slip and preview label and reports preview errors', fakeAsync(() => {
    const mockWin = { location: { href: '' } };
    const openSpy = spyOn(window, 'open').and.returnValue(mockWin as any);
    const createObjectUrlSpy = spyOn(URL, 'createObjectURL').and.returnValues('blob:packing', 'blob:label');
    shipmentServiceSpy.getSalesShipmentDetail.and.returnValue(of(detailResponse()));
    shipmentServiceSpy.getPackingSlipPdf.and.returnValue(of('<html>packing</html>'));
    shipmentServiceSpy.getShippingLabelPdf.and.returnValues(
      of('<html>label</html>'),
      throwError(() => ({ error: { reason: 'preview failed' } }))
    );

    fixture.detectChanges();
    tick();

    component.printPackingSlipPdf();
    component.previewShippingLabel();
    component.previewShippingLabel();
    tick();

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(2);
    expect(mockWin.location.href).toBe('blob:label');
    expect(snackbarSpy.showError).toHaveBeenCalledWith('preview failed');
  }));

  it('downloads or reports shipping label print results', fakeAsync(() => {
    const anchorClick = jasmine.createSpy('click');
    spyOn(document, 'createElement').and.returnValue({ click: anchorClick } as any);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:print');
    spyOn(URL, 'revokeObjectURL');
    spyOn(window, 'setTimeout').and.callFake(((fn: TimerHandler) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as any;
    }) as any);
    shipmentServiceSpy.getSalesShipmentDetail.and.returnValue(of(detailResponse()));
    shipmentServiceSpy.printShippingLabel.and.returnValues(
      of({
        body: new Blob(['print']),
        headers: { get: () => 'attachment; filename="label.pdf"' },
      } as any),
      of({ body: null, headers: { get: () => null } } as any),
      throwError(() => ({ error: { message: 'print failed' } }))
    );

    fixture.detectChanges();
    tick();

    component.printShippingLabel();
    component.printShippingLabel();
    component.printShippingLabel();
    tick();

    expect(anchorClick).toHaveBeenCalled();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('SHIPMENT.SHIPPING_LABEL_PRINT_ERROR');
    expect(snackbarSpy.showError).toHaveBeenCalledWith('print failed');
  }));

  it('exposes helper fallbacks for status, shipment methods, packages, and formatting', fakeAsync(() => {
    shipmentServiceSpy.getSalesShipmentDetail.and.returnValue(of(detailResponse({
      packages: [],
      routeSegments: [{ shipmentMethodTypeId: 'EXPRESS' }],
      shipmentMethodTypeMap: {},
      packageContents: [{ shipmentPackageSeqId: 'PKG-9', shipmentItemSeqId: 'MISSING', quantity: '1' }],
      packageRouteSegments: [{}],
      boxTypes: [{ shipmentBoxTypeId: 'BOX_X' }],
      statuses: [
        { statusId: 'SHIPMENT_CANCELLED', statusDate: '2026-04-07T10:00:00' },
      ],
    })));

    fixture.detectChanges();
    tick();

    expect(component.getStatusDescription()).toBe('-');
    expect(component.getStatusDescription('SHIPMENT_CANCELLED')).toBe('Cancelled');
    expect(component.getShipmentMethodDescription()).toBe('-');
    expect(component.getShipmentMethodDescription('EXPRESS')).toBe('EXPRESS');
    expect(component.getBoxTypeLabel('')).toBe('-');
    expect(component.getBoxTypeLabel('BOX_X')).toBe('BOX_X');
    expect(component.getPackageContentsForPackage('PKG-9')).toEqual([
      jasmine.objectContaining({ productId: '-', description: '-' }),
    ]);
    expect(component.getTrackingCodeForPackage('PKG-9')).toBe('-');
    expect((component as any).formatAddressLines(null)).toEqual([]);
    expect((component as any).formatAddressLines({
      address1: 'Line 1',
      address2: 'Line 2',
      city: 'San Jose',
      stateProvinceGeoId: 'CA',
      postalCode: '95131',
      countryGeoId: 'USA',
    })).toEqual(['Line 1', 'Line 2', 'San Jose CA 95131', 'USA']);
    expect((component as any).formatPhone(null)).toBe('-');
    expect((component as any).formatPhone({
      telecomNumber: {
        countryCode: '+1',
        areaCode: '408',
        contactNumber: '5551234',
      },
    })).toBe('+1 408 5551234');
    expect((component as any).extractFilename(null)).toBeNull();
    expect((component as any).extractFilename('attachment; filename="label.pdf"')).toBe('label.pdf');
  }));

  it('hides generate label once a label or tracking code already exists', fakeAsync(() => {
    shipmentServiceSpy.getSalesShipmentDetail.and.returnValue(of(detailResponse({
      shippingLabelPreviewAvailable: true,
      shippingLabelThermalAvailable: false,
      packageRouteSegments: [{ shipmentPackageSeqId: 'PKG-1', trackingCode: 'TRACK-1' }],
    })));

    fixture.detectChanges();
    tick();

    expect(component.hasGeneratedShippingLabel()).toBeTrue();
    expect(component.canGenerateShippingLabel()).toBeFalse();
  }));

  it('generates labels, quick ships, cancels, and deletes packages with guards', fakeAsync(() => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    shipmentServiceSpy.getSalesShipmentDetail.and.returnValue(of(detailResponse()));
    shipmentServiceSpy.generateCarrierLabels.and.returnValue(of({} as any));
    shipmentServiceSpy.shipShipment.and.returnValue(of({} as any));
    shipmentServiceSpy.updateShipmentStatus.and.returnValue(of({} as any));
    shipmentServiceSpy.deleteShipmentPackage.and.returnValue(of({} as any));

    fixture.detectChanges();
    tick();

    component.generateShippingLabel();
    tick();
    component.quickShip();
    tick();
    component.cancelOrder();
    tick();
    component.deletePackage('PKG-1');
    tick();

    expect(shipmentServiceSpy.generateCarrierLabels).toHaveBeenCalledWith('SHIP-SALES-1', {
      carrier: 'FEDEX',
      serviceCode: 'GROUND',
      shipmentPackageSeqIds: ['PKG-1'],
    });
    expect(shipmentServiceSpy.shipShipment).toHaveBeenCalledWith('SHIP-SALES-1');
    expect(shipmentServiceSpy.updateShipmentStatus).toHaveBeenCalledWith('SHIP-SALES-1', 'SHIPMENT_CANCELLED');
    expect(shipmentServiceSpy.deleteShipmentPackage).toHaveBeenCalledWith('SHIP-SALES-1', 'PKG-1');
  }));

  it('reports carrier label generation failures and clears the loading state', fakeAsync(() => {
    shipmentServiceSpy.getSalesShipmentDetail.and.returnValue(of(detailResponse()));
    shipmentServiceSpy.generateCarrierLabels.and.returnValue(throwError(() => ({
      error: {
        reason: 'FedEx credentials are incomplete',
      },
    })));

    fixture.detectChanges();
    tick();

    component.generateShippingLabel();
    tick();

    expect(component.isGeneratingShippingLabel()).toBeFalse();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('FedEx credentials are incomplete');
  }));

  it('skips label actions and dialog saves when guards or dismissals block them', fakeAsync(() => {
    shipmentServiceSpy.getSalesShipmentDetail.and.returnValue(of(detailResponse()));
    dialogSpy.open.and.returnValues(
      { afterClosed: () => of(null) } as any,
      { afterClosed: () => of({}) } as any,
      { afterClosed: () => of(null) } as any,
    );

    fixture.detectChanges();
    tick();

    component.editShipToAddress();
    component.editShipToPhone();
    component.editHandlingInstructions();
    component.isGeneratingShippingLabel.set(true);
    component.generateShippingLabel();
    component.shipmentId.set('');
    component.printPackingSlipPdf();
    component.previewShippingLabel();
    component.printShippingLabel();
    component.deletePackage('PKG-1');

    expect(orderServiceSpy.upsertOrderShippingPhone).not.toHaveBeenCalled();
    expect(orderServiceSpy.updateShippingInstructions).not.toHaveBeenCalled();
    expect(shipmentServiceSpy.generateCarrierLabels).not.toHaveBeenCalled();
    expect(shipmentServiceSpy.getPackingSlipPdf).not.toHaveBeenCalled();
    expect(shipmentServiceSpy.getShippingLabelPdf).not.toHaveBeenCalled();
    expect(shipmentServiceSpy.printShippingLabel).not.toHaveBeenCalled();
    expect(shipmentServiceSpy.deleteShipmentPackage).not.toHaveBeenCalled();
  }));

  it('skips guarded actions when required data is missing', fakeAsync(() => {
    shipmentServiceSpy.getSalesShipmentDetail.and.returnValue(of(detailResponse({
      routeSegments: [],
      packages: [],
      shipment: { shipmentId: 'SHIP-SALES-1', statusId: 'SHIPMENT_SHIPPED' },
    })));

    fixture.detectChanges();
    tick();

    component.openCreatePackageDialog();
    component.generateShippingLabel();
    component.deletePackage('PKG-1');
    component.editShipToAddress();
    component.editShipToPhone();
    component.editHandlingInstructions();

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(shipmentServiceSpy.generateCarrierLabels).not.toHaveBeenCalled();
    expect(shipmentServiceSpy.deleteShipmentPackage).not.toHaveBeenCalled();
  }));
});

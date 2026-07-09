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
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ShipmentDetailComponent } from './shipment-detail.component';
import { ShipmentService } from '@ofbiz/services/shipment/shipment.service';
import { CommonService } from '@ofbiz/services/common/common.service';

describe('ShipmentDetailComponent', () => {
  let component: ShipmentDetailComponent;
  let fixture: ComponentFixture<ShipmentDetailComponent>;
  let shipmentServiceSpy: jasmine.SpyObj<ShipmentService>;
  let commonServiceSpy: jasmine.SpyObj<CommonService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockRoute = {
    params: of({ shipmentId: 'SHIP-1001' })
  };

  const mockShipmentResponse = {
    shipment: {
      shipmentId: 'SHIP-1001',
      shipmentTypeId: 'PURCHASE_SHIPMENT',
      statusId: 'SHIPMENT_INPUT',
      shipmentMethodTypeId: 'GROUND'
    },
    items: [
      {
        shipmentItemSeqId: '00001',
        shipmentItemSourceId: 'SRC-1',
        orderId: 'PO-1',
        orderItemSeqId: '0001',
        quantity: '2'
      }
    ],
    receipts: [
      {
        receiptId: 'REC-1',
        productId: 'PROD-1',
        quantityAccepted: 2
      }
    ],
    invoiceIds: ['INV-1001'],
    routeSegments: [
      {
        shipmentRouteSegmentId: '00001',
        destFacilityId: 'MAIN_FACILITY'
      }
    ]
  };

  beforeEach(async () => {
    shipmentServiceSpy = jasmine.createSpyObj('ShipmentService', ['getShipment']);
    commonServiceSpy = jasmine.createSpyObj('CommonService', ['getAllStatusItems', 'getShipmentTypes', 'getShipmentMethodTypes']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    commonServiceSpy.getAllStatusItems.and.returnValue(of([
      { statusId: 'SHIPMENT_INPUT', description: 'Input' }
    ]));
    commonServiceSpy.getShipmentTypes.and.returnValue(of([
      { shipmentTypeId: 'PURCHASE_SHIPMENT', description: 'Purchase Shipment' }
    ]));
    commonServiceSpy.getShipmentMethodTypes.and.returnValue(of([
      { shipmentMethodTypeId: 'GROUND', description: 'Ground' }
    ]));

    await TestBed.configureTestingModule({
      declarations: [ShipmentDetailComponent],
      providers: [
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: routerSpy },
        { provide: ShipmentService, useValue: shipmentServiceSpy },
        { provide: CommonService, useValue: commonServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ShipmentDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    shipmentServiceSpy.getShipment.and.returnValue(of(mockShipmentResponse));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load shipment detail from the route and populate sections', fakeAsync(() => {
    shipmentServiceSpy.getShipment.and.returnValue(of(mockShipmentResponse));

    fixture.detectChanges();
    tick();

    expect(shipmentServiceSpy.getShipment).toHaveBeenCalledWith('SHIP-1001', true);
    expect(component.shipmentId()).toBe('SHIP-1001');
    expect(component.shipmentDetail()?.shipmentId).toEqual('SHIP-1001');
    expect(component.items()).toHaveSize(1);
    expect(component.receipts()).toHaveSize(1);
    expect(component.invoiceIds()).toEqual(['INV-1001']);
    expect(component.shipmentRouteSegments()).toHaveSize(1);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle shipment lookup loading and map descriptions', fakeAsync(() => {
    shipmentServiceSpy.getShipment.and.returnValue(of(mockShipmentResponse));

    fixture.detectChanges();
    tick();

    expect(commonServiceSpy.getAllStatusItems).toHaveBeenCalled();
    expect(commonServiceSpy.getShipmentTypes).toHaveBeenCalled();
    expect(commonServiceSpy.getShipmentMethodTypes).toHaveBeenCalled();
    expect(component.getStatusDescription('SHIPMENT_INPUT')).toBe('Input');
    expect(component.getShipmentTypeDescription('PURCHASE_SHIPMENT')).toBe('Purchase Shipment');
    expect(component.getShipmentMethodDescription('GROUND')).toBe('Ground');
  }));

  it('should handle shipment lookup errors by clearing the lookup maps', fakeAsync(() => {
    commonServiceSpy.getAllStatusItems.and.returnValue(throwError(() => new Error('status failed')));
    commonServiceSpy.getShipmentTypes.and.returnValue(throwError(() => new Error('type failed')));
    commonServiceSpy.getShipmentMethodTypes.and.returnValue(throwError(() => new Error('method failed')));
    shipmentServiceSpy.getShipment.and.returnValue(of(mockShipmentResponse));

    fixture.detectChanges();
    tick();

    expect(component.getStatusDescription('SHIPMENT_INPUT')).toBe('SHIPMENT_INPUT');
    expect(component.getShipmentTypeDescription('PURCHASE_SHIPMENT')).toBe('PURCHASE_SHIPMENT');
    expect(component.getShipmentMethodDescription('GROUND')).toBe('GROUND');
  }));

  it('should handle error from getShipment gracefully', fakeAsync(() => {
    shipmentServiceSpy.getShipment.and.returnValue(throwError(() => new Error('API failed')));

    fixture.detectChanges();
    tick();

    expect(shipmentServiceSpy.getShipment).toHaveBeenCalledWith('SHIP-1001', true);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should redirect sales shipments to the sales shipment detail route', () => {
    shipmentServiceSpy.getShipment.and.returnValue(of({
      shipment: {
        shipmentId: 'SHIP-2002',
        shipmentTypeId: 'SALES_SHIPMENT',
      }
    }));

    component.getShipment('SHIP-2002');

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/shipments/sales', 'SHIP-2002']);
    expect(component.isLoading()).toBeTrue();
  });

  it('should return current date time string from getCurrentDateTime', () => {
    const result = component.getCurrentDateTime();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should identify purchase shipments', () => {
    component.shipmentDetail.set({ shipmentTypeId: 'PURCHASE_SHIPMENT' });
    expect(component.isPurchaseShipment()).toBeTrue();
    component.shipmentDetail.set({ shipmentTypeId: 'SALES_SHIPMENT' });
    expect(component.isPurchaseShipment()).toBeFalse();
  });
});

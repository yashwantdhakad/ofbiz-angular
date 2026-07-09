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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ShipmentComponent } from './shipment.component';
import { ShipmentService } from '@ofbiz/services/shipment/shipment.service';
import { CommonService } from '@ofbiz/services/common/common.service';

describe('ShipmentComponent', () => {
  let component: ShipmentComponent;
  let fixture: ComponentFixture<ShipmentComponent>;
  let shipmentService: jasmine.SpyObj<ShipmentService>;
  let commonService: jasmine.SpyObj<CommonService>;

  beforeEach(async () => {
    const shipmentServiceSpy = jasmine.createSpyObj('ShipmentService', ['getShipments']);
    const commonServiceSpy = jasmine.createSpyObj('CommonService', [
      'getAllStatusItems',
      'getShipmentTypes',
    ]);

    await TestBed.configureTestingModule({
      declarations: [ShipmentComponent],
      providers: [
        { provide: ShipmentService, useValue: shipmentServiceSpy },
        { provide: CommonService, useValue: commonServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    shipmentService = TestBed.inject(ShipmentService) as jasmine.SpyObj<ShipmentService>;
    commonService = TestBed.inject(CommonService) as jasmine.SpyObj<CommonService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ShipmentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load lookups and shipments on init', () => {
    commonService.getShipmentTypes.and.returnValue(
      of([
        { shipmentTypeId: 'SALES_SHIPMENT', description: 'Sales Shipment' },
        { shipmentTypeId: 'RETURN_SHIPMENT', description: 'Return Shipment' },
        { shipmentTypeId: 'SALES_SHIPMENT', description: 'Duplicate Sales Shipment' },
        { shipmentTypeId: '  ', description: 'Ignored' },
      ])
    );
    const mockResponse = {
      responseMap: {
        resultList: [{ shipmentId: '1', statusId: 'SHIP_INPUT', shipmentTypeId: 'SALES_SHIPMENT' }],
        total: 1,
      },
    };
    shipmentService.getShipments.and.returnValue(of(mockResponse));
    fixture.detectChanges();

    expect(commonService.getShipmentTypes).toHaveBeenCalled();
    expect(shipmentService.getShipments).toHaveBeenCalledWith(0, '', undefined);
    expect(component.items()).toHaveSize(1);
    expect(component.pages()).toBe(1);
    expect(component.getStatusDescription({ statusId: 'SHIP_INPUT', statusDescription: 'Input' })).toBe('Input');
    expect(component.getShipmentTypeDescription('SALES_SHIPMENT')).toBe('Duplicate Sales Shipment');
    expect(component.shipmentTypeOptions.map((item) => item.shipmentTypeId)).toEqual(['RETURN_SHIPMENT', 'SALES_SHIPMENT']);
    expect(component.shipmentTypeOptions.map((item) => item.description)).toEqual(['Return Shipment', 'Sales Shipment']);
  });

  it('should fallback to id when lookup value missing', () => {
    expect(component.getStatusDescription(undefined)).toBe('');
    expect(component.getStatusDescription({ statusId: 'UNKNOWN' })).toBe('UNKNOWN');
    expect(component.getShipmentTypeDescription()).toBe('');
    expect(component.getShipmentTypeDescription('UNKNOWN_TYPE')).toBe('UNKNOWN_TYPE');
  });

  it('should clear lookup maps when lookup loading fails', () => {
    commonService.getShipmentTypes.and.returnValue(throwError(() => 'lookup error'));
    shipmentService.getShipments.and.returnValue(of({ responseMap: { resultList: [], total: 0 } }));

    fixture.detectChanges();

    expect(component.shipmentTypeMap.size).toBe(0);
    expect(component.shipmentTypeOptions).toEqual([]);
  });

  it('should handle error when fetching shipments', () => {
    commonService.getShipmentTypes.and.returnValue(of([]));
    shipmentService.getShipments.and.returnValue(throwError(() => 'Error'));
    fixture.detectChanges();

    expect(shipmentService.getShipments).toHaveBeenCalledWith(0, '', undefined);
    expect(component.isLoading()).toBe(false);
  });

  it('should update shipments for empty and filtered responses', () => {
    commonService.getShipmentTypes.and.returnValue(of([]));
    shipmentService.getShipments.and.returnValue(of({
      responseMap: {
        resultList: null,
        total: null,
      },
    }));
    fixture.detectChanges();

    expect(component.items()).toEqual([]);
    expect(component.pages()).toBe(0);

    shipmentService.getShipments.and.returnValue(of({
      responseMap: {
        resultList: [{ shipmentId: '2', statusId: 'SHIP_READY' }],
        total: 5,
      },
    }));
    component.selectedShipmentTypeId = 'SALES_SHIPMENT';
    component.getShipments(3, 'abc');

    expect(shipmentService.getShipments).toHaveBeenCalledWith(2, 'abc', 'SALES_SHIPMENT');
    expect(component.items()).toHaveSize(1);
    expect(component.pages()).toBe(5);
  });

  it('should request queried shipments with zero-based page index', () => {
    commonService.getShipmentTypes.and.returnValue(of([]));
    const mockResponse = {
      responseMap: {
        resultList: [{ shipmentId: '1' }],
        total: 1,
      },
    };
    shipmentService.getShipments.and.returnValue(of(mockResponse));
    fixture.detectChanges();
    shipmentService.getShipments.calls.reset();

    component.queryString = '123';
    component.getShipments(2, component.queryString);

    expect(shipmentService.getShipments).toHaveBeenCalledWith(1, '123', undefined);
  });

  it('should cover helper fallbacks and shipment type change branch', () => {
    commonService.getShipmentTypes.and.returnValue(of([]));
    shipmentService.getShipments.and.returnValue(of({ responseMap: { resultList: [], total: 0 } }));
    fixture.detectChanges();
    shipmentService.getShipments.calls.reset();

    expect(component.getDestinationFacilityLabel({ destinationFacilityName: 'Main', facilityName: 'Fallback' })).toBe('Main');
    expect(component.getDestinationFacilityLabel({ facilityName: 'Fallback' })).toBe('Fallback');
    expect(component.getDestinationFacilityLabel({ destinationFacilityId: 'FAC-1' })).toBe('FAC-1');
    expect(component.getDestinationFacilityLabel({})).toBe('');

    component.queryString = 'search';
    component.selectedShipmentTypeId = 'RETURN_SHIPMENT';
    component.onShipmentTypeChange();

    expect(shipmentService.getShipments).toHaveBeenCalledWith(0, 'search', 'RETURN_SHIPMENT');
  });
});

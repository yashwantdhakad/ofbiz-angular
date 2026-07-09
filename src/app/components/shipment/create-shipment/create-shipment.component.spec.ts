import { provideRouter } from '@angular/router';
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
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CreateShipmentComponent } from './create-shipment.component';
import { ShipmentService } from '@ofbiz/services/shipment/shipment.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

describe('CreateShipmentComponent', () => {
  let component: CreateShipmentComponent;
  let fixture: ComponentFixture<CreateShipmentComponent>;

  beforeEach(() => {
    const shipmentServiceSpy = jasmine.createSpyObj('ShipmentService', ['createShipment']);
    const commonServiceSpy = jasmine.createSpyObj('CommonService', [
      'getAllStatusItems',
      'getShipmentTypes',
      'getShipmentMethodTypes',
    ]);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));
    commonServiceSpy.getAllStatusItems.and.returnValue(of([]));
    commonServiceSpy.getShipmentTypes.and.returnValue(of([]));
    commonServiceSpy.getShipmentMethodTypes.and.returnValue(of([]));

    TestBed.configureTestingModule({
      declarations: [CreateShipmentComponent],
      imports: [ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: ShipmentService, useValue: shipmentServiceSpy },
        { provide: CommonService, useValue: commonServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
    TestBed.overrideTemplate(CreateShipmentComponent, '');
    fixture = TestBed.createComponent(CreateShipmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add item and route segment on init', () => {
    expect(component.items).toHaveSize(1);
    expect(component.routeSegments).toHaveSize(1);
  });

  it('should submit shipment creation', () => {
    const shipmentService = TestBed.inject(ShipmentService) as jasmine.SpyObj<ShipmentService>;
    const snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    shipmentService.createShipment.and.returnValue(of({ shipment: { shipmentId: 'SHP-001' } }));

    component.shipmentForm.patchValue({
      shipmentTypeId: 'SALES_SHIPMENT',
      statusId: 'SHIPMENT_INPUT'
    });
    component.items.at(0).patchValue({ productId: 'PROD-1', quantity: '1' });

    component.createShipment();

    expect(shipmentService.createShipment).toHaveBeenCalled();
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('SHIPMENT.CREATE_SUCCESS');
  });

  it('should handle lookup and create failures and manage form arrays', () => {
    const shipmentService = TestBed.inject(ShipmentService) as jasmine.SpyObj<ShipmentService>;
    const commonService = TestBed.inject(CommonService) as jasmine.SpyObj<CommonService>;
    const snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;

    commonService.getAllStatusItems.and.returnValue(throwError(() => new Error('lookup failed')));
    component.ngOnInit();
    expect(component.shipmentStatuses).toEqual([]);
    expect(component.shipmentTypes).toEqual([]);
    expect(component.shipmentMethodTypes).toEqual([]);

    component.addItem();
    component.addRouteSegment();
    expect(component.items.length).toBeGreaterThan(1);
    expect(component.routeSegments.length).toBeGreaterThan(1);
    component.removeItem(1);
    component.removeRouteSegment(1);
    while (component.items.length > 1) {
      component.removeItem(component.items.length - 1);
    }
    while (component.routeSegments.length > 1) {
      component.removeRouteSegment(component.routeSegments.length - 1);
    }

    shipmentService.createShipment.and.returnValue(of({ shipment: {} }));
    component.shipmentForm.patchValue({ shipmentTypeId: 'SALES_SHIPMENT', statusId: 'SHIPMENT_INPUT' });
    component.items.at(0).patchValue({ productId: 'PROD-1', quantity: '1' });
    component.createShipment();
    expect(snackbarService.showError).toHaveBeenCalledWith('SHIPMENT.CREATE_MISSING_ID');

    shipmentService.createShipment.and.returnValue(throwError(() => new Error('create failed')));
    component.createShipment();
    expect(snackbarService.showError).toHaveBeenCalledWith('SHIPMENT.CREATE_ERROR');
    expect(component.isLoading()).toBeFalse();
  });

  it('should guard invalid submit and normalize date values', () => {
    const shipmentService = TestBed.inject(ShipmentService) as jasmine.SpyObj<ShipmentService>;

    component.shipmentForm.patchValue({ shipmentTypeId: '', statusId: '' });
    component.createShipment();
    expect(component.shipmentForm.touched).toBeTrue();
    expect(shipmentService.createShipment).not.toHaveBeenCalled();

    expect((component as any).toLocalDateTime(new Date('2024-01-02T10:30:00'))).toBe('2024-01-02T00:00:00');
    expect((component as any).toLocalDateTime('2024-01-03')).toBe('2024-01-03T00:00:00');
    expect((component as any).toLocalDateTime('2024-01-03T11:00:00')).toBe('2024-01-03T11:00:00');
    expect((component as any).toLocalDateTime(null)).toBeNull();
  });
});

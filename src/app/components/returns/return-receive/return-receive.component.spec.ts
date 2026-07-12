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
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ReturnService } from '@ofbiz/services/return/return.service';
import { ReturnReceiveComponent } from './return-receive.component';

describe('ReturnReceiveComponent', () => {
  let fixture: ComponentFixture<ReturnReceiveComponent>;
  let component: ReturnReceiveComponent;
  let returnServiceSpy: jasmine.SpyObj<ReturnService>;
  let facilityServiceSpy: jasmine.SpyObj<FacilityService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let paramMap$: BehaviorSubject<any>;

  const acceptedReturn = {
    summary: {
      statusId: 'RETURN_ACCEPTED',
      destinationFacilityId: 'FAC1',
      destinationFacilityName: 'Main Facility',
    },
    items: [
      {
        returnItemSeqId: '00001',
        orderItemSeqId: '00011',
        productId: 'PROD1',
        productName: 'Product 1',
        returnQuantity: 3,
        receivedQuantity: 1,
      },
    ],
  };

  beforeEach(async () => {
    paramMap$ = new BehaviorSubject(convertToParamMap({}));
    returnServiceSpy = jasmine.createSpyObj<ReturnService>('ReturnService', [
      'getReturn',
      'receiveReturn',
    ]);
    facilityServiceSpy = jasmine.createSpyObj<FacilityService>('FacilityService', [
      'getFacilityLocations',
    ]);
    snackbarSpy = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    returnServiceSpy.getReturn.and.returnValue(of(acceptedReturn));
    returnServiceSpy.receiveReturn.and.returnValue(of({}));
    facilityServiceSpy.getFacilityLocations.and.returnValue(of({
      content: [{ facilityId: 'FAC1', locationSeqId: 'LOC1' }],
    }));

    await TestBed.configureTestingModule({
      declarations: [ReturnReceiveComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: ReturnService, useValue: returnServiceSpy },
        { provide: FacilityService, useValue: facilityServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$.asObservable() } },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string) => key,
          },
        },
      ],
    })
      .overrideTemplate(ReturnReceiveComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(ReturnReceiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads an accepted return, locations, and remaining receive rows from route param', () => {
    paramMap$.next(convertToParamMap({ returnId: 'RET1' }));

    expect(component.returnId).toBe('RET1');
    expect(returnServiceSpy.getReturn).toHaveBeenCalledWith('RET1');
    expect(facilityServiceSpy.getFacilityLocations).toHaveBeenCalledWith('FAC1', 0, 1000);
    expect(component.detail()?.summary?.statusId).toBe('RETURN_ACCEPTED');
    expect(component.facilityId()).toBe('FAC1');
    expect(component.allFacilityLocations()).toEqual([{ facilityId: 'FAC1', locationSeqId: 'LOC1' }]);
    expect(component.items).toHaveSize(1);
    expect(component.items.at(0).value.remainingQuantity).toBe(2);
    expect(component.items.at(0).value.receiveQuantity).toBe(2);
    expect(component.isLoading()).toBeFalse();
  });

  it('loads a supplier accepted return for receiving', () => {
    returnServiceSpy.getReturn.and.returnValue(of({
      ...acceptedReturn,
      summary: {
        ...acceptedReturn.summary,
        statusId: 'SUP_RETURN_ACCEPTED',
      },
    }));

    component.loadReturn('RET1');

    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(component.items).toHaveSize(1);
    expect(component.detail()?.summary?.statusId).toBe('SUP_RETURN_ACCEPTED');
  });

  it('redirects when the return is not accepted', () => {
    returnServiceSpy.getReturn.and.returnValue(of({
      summary: { statusId: 'RETURN_REQUESTED', destinationFacilityId: 'FAC1' },
      items: acceptedReturn.items,
    }));

    component.loadReturn('RET1');

    expect(snackbarSpy.showError).toHaveBeenCalledWith('RETURN.RECEIVE_ONLY_ACCEPTED');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/returns', 'RET1']);
    expect(component.items).toHaveSize(0);
  });

  it('submits positive receive quantities and navigates to return detail', () => {
    component.returnId = 'RET1';
    component.loadReturn('RET1');
    component.items.at(0).patchValue({
      locationSeqId: 'LOC1',
      lotId: 'LOT1',
      expirationDate: '2026-04-30',
    });

    component.receiveItems();

    expect(returnServiceSpy.receiveReturn).toHaveBeenCalledWith('RET1', {
      facilityId: 'FAC1',
      items: [
        jasmine.objectContaining({
          returnItemSeqId: '00001',
          orderItemSeqId: '00011',
          productId: 'PROD1',
          quantity: '2',
          locationSeqId: 'LOC1',
          lotId: 'LOT1',
        }),
      ],
    });
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('RETURN.RECEIVE_SUCCESS');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/returns', 'RET1']);
    expect(component.isLoading()).toBeFalse();
  });

  it('shows an error when there are no positive quantities to receive', () => {
    component.returnId = 'RET1';
    component.loadReturn('RET1');
    component.items.at(0).patchValue({
      receiveQuantity: 0,
      locationSeqId: 'LOC1',
    });

    component.receiveItems();

    expect(returnServiceSpy.receiveReturn).not.toHaveBeenCalled();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('RETURN.RECEIVE_NO_QUANTITY');
  });

  it('shows load and receive errors from service failures', () => {
    returnServiceSpy.getReturn.and.returnValue(throwError(() => new Error('load failed')));
    component.loadReturn('RET404');
    expect(snackbarSpy.showError).toHaveBeenCalledWith('RETURN.LOAD_ERROR');

    returnServiceSpy.getReturn.and.returnValue(of(acceptedReturn));
    returnServiceSpy.receiveReturn.and.returnValue(throwError(() => new Error('receive failed')));
    component.returnId = 'RET1';
    component.loadReturn('RET1');
    component.items.at(0).patchValue({ locationSeqId: 'LOC1' });

    component.receiveItems();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('RETURN.RECEIVE_ERROR');
    expect(component.isLoading()).toBeFalse();
  });
});

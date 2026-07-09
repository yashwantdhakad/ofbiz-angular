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
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { OperationDetailComponent } from './operation-detail.component';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import {
  FacilityReferenceItem,
  OperationDetailResponse,
} from '@ofbiz/models/manufacturing.model';

describe('OperationDetailComponent', () => {
  let component: OperationDetailComponent;
  let fixture: ComponentFixture<OperationDetailComponent>;
  let manufacturingServiceSpy: jasmine.SpyObj<ManufacturingService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
  let referenceDataStoreStub: {
    ensureFacilitiesLoaded: jasmine.Spy;
    facilities: ReturnType<typeof signal<FacilityReferenceItem[]>>;
  };

  beforeEach(async () => {
    manufacturingServiceSpy = jasmine.createSpyObj('ManufacturingService', [
      'getOperationDetail',
      'updateOperation',
    ]);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    referenceDataStoreStub = {
      ensureFacilitiesLoaded: jasmine.createSpy('ensureFacilitiesLoaded'),
      facilities: signal<FacilityReferenceItem[]>([
        { facilityId: 'FAC100', facilityName: 'Main Facility', label: 'Main Facility' },
      ]),
    };

    const renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', [
      'deferMacrotask',
      'defer',
      'markForCheck',
      'detectChanges',
    ]);
    renderSchedulerSpy.deferMacrotask.and.callFake((fn: () => void) => fn());
    renderSchedulerSpy.defer.and.callFake((fn: () => void) => fn());

    await TestBed.configureTestingModule({
      declarations: [OperationDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ workEffortId: 'OP100' })),
          },
        },
        { provide: ManufacturingService, useValue: manufacturingServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string) => key,
            get: (key: string) => of(key),
            stream: (key: string) => of(key),
            onLangChange: of({}),
            onTranslationChange: of({}),
            onDefaultLangChange: of({}),
          },
        },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: ReferenceDataStore, useValue: referenceDataStoreStub },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationDetailComponent);
    component = fixture.componentInstance;
  });

  it('loads operation detail and resolves facility labels', () => {
    const response: OperationDetailResponse = {
      operation: {
        id: 1,
        workEffortId: 'OP100',
        workEffortName: 'Packaging',
        facilityId: 'FAC100',
        estimatedSetupMillis: '60000',
      },
      routings: [{ workEffortId: 'ROU100', workEffortName: 'Routing 1' }],
    };
    manufacturingServiceSpy.getOperationDetail.and.returnValue(of(response));

    fixture.detectChanges();

    expect(referenceDataStoreStub.ensureFacilitiesLoaded).toHaveBeenCalled();
    expect(component.operation()?.workEffortName).toBe('Packaging');
    expect(component.routings()).toHaveSize(1);
    expect(component.facilityLabel()).toBe('Main Facility');
  });

  it('updates operation after edit dialog save', () => {
    manufacturingServiceSpy.getOperationDetail.and.returnValue(
      of({
        operation: {
          id: 1,
          workEffortId: 'OP100',
          workEffortName: 'Packaging',
          facilityId: 'FAC100',
        },
        routings: [],
      })
    );
    manufacturingServiceSpy.updateOperation.and.returnValue(
      of({
        operation: {
          workEffortId: 'OP100',
          workEffortName: 'Updated Packaging',
          facilityId: 'FAC100',
        },
        routings: [],
      })
    );
    dialogSpy.open.and.returnValue({
      afterClosed: () =>
        of({
          workEffortName: 'Updated Packaging',
          description: 'Updated description',
          facilityId: 'FAC100',
        }),
    } as never);

    fixture.detectChanges();
    component.openEditDialog();

    expect(manufacturingServiceSpy.updateOperation).toHaveBeenCalledWith(
      'OP100',
      jasmine.objectContaining({ workEffortName: 'Updated Packaging', facilityId: 'FAC100' })
    );
    expect(component.operation()?.workEffortName).toBe('Updated Packaging');
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalled();
  });

  it('formats milliseconds to hours and minutes', () => {
    expect(component.formatMillis('3660000')).toBe('1 hrs 01 min');
    expect(component.formatMillis('0')).toBe('-');
  });

  it('exposes operation type and facility fallback labels', () => {
    component.operation.set({
      id: 1,
      workEffortId: 'OP100',
      workEffortPurposeTypeId: 'ROU_PACKING_LINE',
      facilityId: 'FAC999',
    } as any);
    component.facilities.set([]);

    expect(component.operationTypeLabel()).toBe('Packing Line');
    expect(component.facilityLabel()).toBe('FAC999');

    component.operation.set(null);
    expect(component.operationTypeLabel()).toBe('-');
    expect(component.facilityLabel()).toBe('-');
  });

  it('should ignore edit when there is no operation or no dialog result', () => {
    component.operation.set(null);

    component.openEditDialog();
    expect(dialogSpy.open).not.toHaveBeenCalled();

    component.operation.set({
      id: 1,
      workEffortId: 'OP100',
      workEffortName: 'Packaging',
      facilityId: 'FAC100',
    } as any);
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as never);

    component.openEditDialog();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(manufacturingServiceSpy.updateOperation).not.toHaveBeenCalled();
  });

  it('should show an error when updating the operation fails', () => {
    manufacturingServiceSpy.getOperationDetail.and.returnValue(
      of({
        operation: {
          id: 1,
          workEffortId: 'OP100',
          workEffortName: 'Packaging',
          facilityId: 'FAC100',
        },
        routings: [],
      })
    );
    manufacturingServiceSpy.updateOperation.and.returnValue(throwError(() => new Error('update failed')));
    dialogSpy.open.and.returnValue({
      afterClosed: () => of({ workEffortName: 'Updated Packaging', description: '', facilityId: 'FAC100' }),
    } as never);

    fixture.detectChanges();
    component.openEditDialog();

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('MANUFACTURING.UPDATE_OPERATION_ERROR');
  });

  it('should reset state when loading operation detail fails', () => {
    manufacturingServiceSpy.getOperationDetail.and.returnValue(throwError(() => new Error('load failed')));

    fixture.detectChanges();

    expect(component.operation()).toBeNull();
    expect(component.routings()).toEqual([]);
    expect(component.isLoading()).toBeFalse();
  });
});

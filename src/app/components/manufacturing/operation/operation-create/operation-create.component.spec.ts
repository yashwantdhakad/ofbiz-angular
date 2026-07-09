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
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { OperationCreateComponent } from './operation-create.component';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';

describe('OperationCreateComponent', () => {
  let component: OperationCreateComponent;
  let fixture: ComponentFixture<OperationCreateComponent>;
  let manufacturingService: jasmine.SpyObj<ManufacturingService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let router: jasmine.SpyObj<Router>;
  let snackbar: jasmine.SpyObj<SnackbarService>;
  let translate: jasmine.SpyObj<TranslateService>;
  let preferredFacilityService: jasmine.SpyObj<PreferredFacilityService>;

  beforeEach(async () => {
    manufacturingService = jasmine.createSpyObj<ManufacturingService>('ManufacturingService', ['createWorkEffort']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getFacilities']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    snackbar = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    translate = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    preferredFacilityService = jasmine.createSpyObj<PreferredFacilityService>('PreferredFacilityService', [
      'applyPreferredFacilityIfMissing',
    ]);

    manufacturingService.createWorkEffort.and.returnValue(of({ workEffortId: 'OP-123' }));
    commonService.getFacilities.and.returnValue(of([
      { facilityId: 'FAC-1', facilityName: 'Facility One' },
      { facilityId: 'FAC-2', facilityName: 'Facility Two' },
    ]));
    translate.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      declarations: [OperationCreateComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: ManufacturingService, useValue: manufacturingService },
        { provide: CommonService, useValue: commonService },
        { provide: Router, useValue: router },
        { provide: SnackbarService, useValue: snackbar },
        { provide: TranslateService, useValue: translate },
        { provide: PreferredFacilityService, useValue: preferredFacilityService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideTemplate(OperationCreateComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes the form, loads facilities, and applies preferred facility when present', () => {
    component.ngOnInit();

    expect(commonService.getFacilities).toHaveBeenCalled();
    expect(component.facilities).toEqual([
      { facilityId: 'FAC-1', facilityName: 'Facility One', label: 'Facility One' },
      { facilityId: 'FAC-2', facilityName: 'Facility Two', label: 'Facility Two' },
    ]);
    expect(preferredFacilityService.applyPreferredFacilityIfMissing).toHaveBeenCalled();
    expect(component.operationForm.get('workEffortPurposeTypeId')?.value).toBe('ROU_ASSEMBLING');
  });

  it('normalizes wrapped facility payloads before applying the preferred facility', () => {
    commonService.getFacilities.and.returnValue(of({
      data: {
        resultList: [{ facilityId: 'FAC-3', facilityName: 'Facility Three' }],
      },
    } as any));

    component.ngOnInit();

    expect(component.facilities).toEqual([{ facilityId: 'FAC-3', facilityName: 'Facility Three', label: 'Facility Three' }]);
    expect(preferredFacilityService.applyPreferredFacilityIfMissing).toHaveBeenCalledWith(
      component.operationForm.get('facilityId'),
      component.facilities
    );
  });

  it('covers lookup fallback when facilities response is not an array', () => {
    commonService.getFacilities.and.returnValue(of({} as any));

    component.ngOnInit();

    expect(component.facilities).toEqual([]);
    expect(preferredFacilityService.applyPreferredFacilityIfMissing).toHaveBeenCalledWith(
      component.operationForm.get('facilityId'),
      []
    );
  });

  it('marks the form touched and does not submit when invalid', () => {
    component.operationForm.patchValue({
      facilityId: '',
      workEffortName: '',
    });
    const markAllAsTouchedSpy = spyOn(component.operationForm, 'markAllAsTouched').and.callThrough();

    component.createOperation();

    expect(markAllAsTouchedSpy).toHaveBeenCalled();
    expect(manufacturingService.createWorkEffort).not.toHaveBeenCalled();
  });

  it('creates operation, navigates to detail, and shows success with returned id', () => {
    manufacturingService.createWorkEffort.and.returnValue(of({ workEffortId: 'OP-123' }));
    component.operationForm.patchValue({
      facilityId: ' FAC-1 ',
      workEffortName: ' Assemble Widget ',
      description: ' Build it ',
      fixedAssetId: ' ASSET-1 ',
      workEffortPurposeTypeId: 'ROU_PACKING',
      estimatedSetupMillis: ' 10 ',
      estimatedMilliSeconds: ' 20 ',
      reservPersons: ' 3 ',
    });

    component.createOperation();

    expect(manufacturingService.createWorkEffort).toHaveBeenCalledWith({
      workEffortTypeId: 'ROU_TASK',
      currentStatusId: 'ROU_ACTIVE',
      workEffortName: 'Assemble Widget',
      description: 'Build it',
      facilityId: ' FAC-1 ',
      fixedAssetId: 'ASSET-1',
      workEffortPurposeTypeId: 'ROU_PACKING',
      estimatedSetupMillis: '10',
      estimatedMilliSeconds: '20',
      reservPersons: '3',
      quantityToProduce: '0.000000',
      revisionNumber: '1',
    });
    expect(snackbar.showSuccess).toHaveBeenCalledWith('MANUFACTURING.CREATE_OPERATION_SUCCESS');
    expect(router.navigate).toHaveBeenCalledWith(['/operations', 'OP-123']);
    expect(component.isSubmitting()).toBeTrue();
  });

  it('navigates back to the list when create succeeds without an id', () => {
    manufacturingService.createWorkEffort.and.returnValue(of({}));
    component.operationForm.patchValue({
      facilityId: 'FAC-1',
      workEffortName: 'Assemble Widget',
    });

    component.createOperation();

    expect(snackbar.showSuccess).toHaveBeenCalledWith('MANUFACTURING.CREATE_OPERATION_SUCCESS');
    expect(router.navigate).toHaveBeenCalledWith(['/operations']);
  });

  it('shows an error and clears submitting state when create fails', () => {
    manufacturingService.createWorkEffort.and.returnValue(throwError(() => new Error('create failed')));
    component.operationForm.patchValue({
      facilityId: 'FAC-1',
      workEffortName: 'Assemble Widget',
    });

    component.createOperation();

    expect(snackbar.showError).toHaveBeenCalledWith('MANUFACTURING.CREATE_OPERATION_ERROR');
    expect(component.isSubmitting()).toBeFalse();
  });

  it('navigates back on cancel and covers helper normalization branches', () => {
    component.cancel();
    expect(router.navigate).toHaveBeenCalledWith(['/operations']);

    expect((component as any).normalizeNumericText(null)).toBeNull();
    expect((component as any).normalizeNumericText(undefined)).toBeNull();
    expect((component as any).normalizeNumericText('')).toBeNull();
    expect((component as any).normalizeNumericText(' 12 ')).toBe('12');
  });
});

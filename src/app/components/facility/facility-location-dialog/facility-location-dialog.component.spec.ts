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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { CommonService } from '@ofbiz/services/common/common.service';
import { FacilityLocationDialogComponent } from './facility-location-dialog.component';

describe('FacilityLocationDialogComponent', () => {
  let component: FacilityLocationDialogComponent;
  let fixture: ComponentFixture<FacilityLocationDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<FacilityLocationDialogComponent>>;
  let commonService: jasmine.SpyObj<CommonService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<FacilityLocationDialogComponent>>('MatDialogRef', ['close']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getEnumTypes']);
    commonService.getEnumTypes.and.returnValue(of([{ enumId: 'WAREHOUSE', description: 'Warehouse' }]));

    await TestBed.configureTestingModule({
      declarations: [FacilityLocationDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: CommonService, useValue: commonService },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            id: 'LOC_1',
            facilityId: 'FAC_1',
            locationSeqId: 'A1',
            locationTypeEnumId: 'WAREHOUSE',
            areaId: 'AREA_1',
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(FacilityLocationDialogComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FacilityLocationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads location types on init', () => {
    expect(commonService.getEnumTypes).toHaveBeenCalledWith('FACLOC_TYPE');
    expect(component.locationTypes).toEqual([{ enumId: 'WAREHOUSE', description: 'Warehouse' }]);
  });

  it('saves the form payload including the dialog id', () => {
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 'LOC_1',
      facilityId: 'FAC_1',
      locationSeqId: 'A1',
      locationTypeEnumId: 'WAREHOUSE',
      areaId: 'AREA_1',
    }));
  });

  it('skips save when the form is invalid', () => {
    component.form.patchValue({ locationSeqId: '' });

    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes on cancel and tracks location types', () => {
    expect(component.trackByLocationType(0, { enumId: 'WAREHOUSE' })).toBe('WAREHOUSE');
    expect(component.trackByLocationType(2, null)).toBe('2');

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});

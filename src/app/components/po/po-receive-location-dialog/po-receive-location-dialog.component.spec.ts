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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { CommonService } from '@ofbiz/services/common/common.service';
import { POReceiveLocationDialogComponent } from './po-receive-location-dialog.component';

describe('POReceiveLocationDialogComponent', () => {
  let component: POReceiveLocationDialogComponent;
  let fixture: ComponentFixture<POReceiveLocationDialogComponent>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<POReceiveLocationDialogComponent>>;

  beforeEach(async () => {
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getEnumTypes']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<POReceiveLocationDialogComponent>>('MatDialogRef', ['close']);
    commonService.getEnumTypes.and.returnValue(of([{ enumId: 'FACLOC_AISLE', description: 'Aisle' }] as any));

    await TestBed.configureTestingModule({
      declarations: [POReceiveLocationDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: CommonService, useValue: commonService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { facilityId: 'FAC-1' } },
      ],
    })
      .overrideComponent(POReceiveLocationDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(POReceiveLocationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads location types and pre-fills facility id', () => {
    expect(commonService.getEnumTypes).toHaveBeenCalledWith('FACLOC_TYPE');
    expect(component.form.value.facilityId).toBe('FAC-1');
    expect(component.locationTypes).toEqual([{ enumId: 'FACLOC_AISLE', description: 'Aisle' }] as any);
  });

  it('normalizes a single enum response into an array', () => {
    commonService.getEnumTypes.and.returnValue(of({ enumId: 'FACLOC_BIN' } as any));

    const singleFixture = TestBed.createComponent(POReceiveLocationDialogComponent);
    const singleComponent = singleFixture.componentInstance;
    singleFixture.detectChanges();

    expect(singleComponent.locationTypes).toEqual([{ enumId: 'FACLOC_BIN' }] as any);
  });

  it('clears location types when enum loading fails', () => {
    commonService.getEnumTypes.and.returnValue(throwError(() => new Error('failed')));

    const errorFixture = TestBed.createComponent(POReceiveLocationDialogComponent);
    const errorComponent = errorFixture.componentInstance;
    errorFixture.detectChanges();

    expect(errorComponent.locationTypes).toEqual([]);
  });

  it('marks invalid form touched instead of closing', () => {
    const markAllAsTouched = spyOn(component.form, 'markAllAsTouched').and.callThrough();

    component.save();

    expect(markAllAsTouched).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with location payload for a valid form', () => {
    component.form.patchValue({
      locationSeqId: 'A-01',
      locationTypeEnumId: 'FACLOC_AISLE',
      areaId: 'A',
      aisleId: '01',
    });

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({
      facilityId: 'FAC-1',
      locationSeqId: 'A-01',
      locationTypeEnumId: 'FACLOC_AISLE',
      areaId: 'A',
      aisleId: '01',
    }));
  });

  it('closes without a payload and tracks location types by enum id', () => {
    expect(component.trackByLocationType(2, { enumId: 'FACLOC_BIN' })).toBe('FACLOC_BIN');
    expect(component.trackByLocationType(2, {})).toBe('2');

    component.close();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});

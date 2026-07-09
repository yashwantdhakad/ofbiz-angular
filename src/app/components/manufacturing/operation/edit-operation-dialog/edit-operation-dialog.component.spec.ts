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
import { EditOperationDialogComponent } from './edit-operation-dialog.component';

describe('EditOperationDialogComponent', () => {
  let component: EditOperationDialogComponent;
  let fixture: ComponentFixture<EditOperationDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<EditOperationDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<EditOperationDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [EditOperationDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            operation: {
              workEffortName: 'Cutting',
              description: 'Initial cut',
              facilityId: 'FAC_1',
              fixedAssetId: 'ASSET_1',
              workEffortPurposeTypeId: 'ROU_MANUFACTURING',
              estimatedSetupMillis: '60000',
              estimatedMilliSeconds: '120000',
              reservPersons: '2',
              currentStatusId: 'ROU_ACTIVE',
            },
            facilities: [
              { facilityId: 'FAC_1', facilityName: 'Main' },
              { facilityId: 'FAC_2', facilityName: 'Secondary' },
            ],
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(EditOperationDialogComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(EditOperationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('seeds facilities and form values from dialog data', () => {
    expect(component.facilities).toEqual([
      { facilityId: 'FAC_1', facilityName: 'Main' },
      { facilityId: 'FAC_2', facilityName: 'Secondary' },
    ]);
    expect(component.form.value).toEqual({
      workEffortName: 'Cutting',
      description: 'Initial cut',
      facilityId: 'FAC_1',
      fixedAssetId: 'ASSET_1',
      workEffortPurposeTypeId: 'ROU_MANUFACTURING',
      estimatedSetupMillis: '60000',
      estimatedMilliSeconds: '120000',
      reservPersons: '2',
      currentStatusId: 'ROU_ACTIVE',
    });
  });

  it('marks the form touched and skips save when invalid', () => {
    spyOn(component.form, 'markAllAsTouched');
    component.form.patchValue({ workEffortName: '', facilityId: '' });

    component.save();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with the edited operation payload on save', () => {
    component.form.patchValue({
      workEffortName: 'Packing',
      description: 'Final pack',
      facilityId: 'FAC_2',
      fixedAssetId: 'ASSET_2',
      workEffortPurposeTypeId: 'ROU_ASSEMBLING',
      estimatedSetupMillis: '30000',
      estimatedMilliSeconds: '90000',
      reservPersons: '1',
      currentStatusId: 'ROU_INACTIVE',
    });

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      workEffortName: 'Packing',
      description: 'Final pack',
      facilityId: 'FAC_2',
      fixedAssetId: 'ASSET_2',
      workEffortPurposeTypeId: 'ROU_ASSEMBLING',
      estimatedSetupMillis: '30000',
      estimatedMilliSeconds: '90000',
      reservPersons: '1',
      currentStatusId: 'ROU_INACTIVE',
    });
  });

  it('closes without payload on close', () => {
    component.close();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});

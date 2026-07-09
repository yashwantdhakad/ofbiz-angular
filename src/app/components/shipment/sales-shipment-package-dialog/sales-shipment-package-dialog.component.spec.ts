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
import { SalesShipmentPackageDialogComponent } from './sales-shipment-package-dialog.component';

describe('SalesShipmentPackageDialogComponent', () => {
  let component: SalesShipmentPackageDialogComponent;
  let fixture: ComponentFixture<SalesShipmentPackageDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<SalesShipmentPackageDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<SalesShipmentPackageDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [SalesShipmentPackageDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            defaultBoxTypeId: 'BOX_1',
            boxTypes: [
              {
                shipmentBoxTypeId: 'BOX_1',
                boxLength: '10',
                boxWidth: '20',
                boxHeight: '30',
                boxWeight: '5',
              },
            ],
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(SalesShipmentPackageDialogComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SalesShipmentPackageDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('seeds dimensions from the default box type', () => {
    expect(component.packageForm.value.shipmentBoxTypeId).toBe('BOX_1');
    expect(component.packageForm.value.boxLength).toBe('10');
    expect(component.packageForm.value.boxWidth).toBe('20');
    expect(component.packageForm.value.boxHeight).toBe('30');
    expect(component.packageForm.value.weight).toBe('5');
  });

  it('ignores unknown box types', () => {
    component.packageForm.patchValue({ boxLength: '1' });

    component.onBoxTypeChange('MISSING');

    expect(component.packageForm.value.boxLength).toBe('1');
  });

  it('marks the form touched and skips create when invalid', () => {
    spyOn(component.packageForm, 'markAllAsTouched');
    component.packageForm.patchValue({ shipmentBoxTypeId: '' });

    component.createPackage();

    expect(component.packageForm.markAllAsTouched).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with package payload on create and without payload on cancel', () => {
    component.createPackage();

    expect(dialogRef.close).toHaveBeenCalledWith(component.packageForm.value);

    component.close();

    expect(dialogRef.close.calls.mostRecent().args).toEqual([]);
  });
});

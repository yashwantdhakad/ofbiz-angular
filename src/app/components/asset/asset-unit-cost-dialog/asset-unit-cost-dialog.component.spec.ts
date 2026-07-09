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
import { AssetUnitCostDialogComponent } from './asset-unit-cost-dialog.component';

describe('AssetUnitCostDialogComponent', () => {
  let component: AssetUnitCostDialogComponent;
  let fixture: ComponentFixture<AssetUnitCostDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AssetUnitCostDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<AssetUnitCostDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [AssetUnitCostDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { unitCost: '11.00' } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AssetUnitCostDialogComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AssetUnitCostDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('seeds the unit cost control from dialog data', () => {
    expect(component.unitCostControl.value).toBe('11.00');
  });

  it('marks the control touched and skips save when invalid', () => {
    spyOn(component.unitCostControl, 'markAsTouched');
    component.unitCostControl.setValue('');

    component.onSave();

    expect(component.unitCostControl.markAsTouched).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('trims the unit cost and closes on save', () => {
    component.unitCostControl.setValue(' 12.50 ');

    component.onSave();

    expect(dialogRef.close).toHaveBeenCalledWith('12.50');
  });

  it('closes without payload on cancel', () => {
    component.onCancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});

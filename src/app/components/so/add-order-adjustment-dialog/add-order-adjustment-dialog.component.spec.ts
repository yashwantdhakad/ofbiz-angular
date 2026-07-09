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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { AddOrderAdjustmentDialogComponent } from './add-order-adjustment-dialog.component';

describe('AddOrderAdjustmentDialogComponent', () => {
  let component: AddOrderAdjustmentDialogComponent;
  let fixture: ComponentFixture<AddOrderAdjustmentDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddOrderAdjustmentDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<AddOrderAdjustmentDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [AddOrderAdjustmentDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [{ provide: MatDialogRef, useValue: dialogRef }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AddOrderAdjustmentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts with miscellaneous adjustment defaults', () => {
    expect(component.adjustmentTypes.length).toBeGreaterThan(0);
    expect(component.form.value.orderAdjustmentTypeId).toBe('MISCELLANEOUS_CHARGE');
  });

  it('marks invalid form touched instead of closing', () => {
    const markAllAsTouched = spyOn(component.form, 'markAllAsTouched').and.callThrough();

    component.onSave();

    expect(markAllAsTouched).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with normalized adjustment payload', () => {
    component.form.patchValue({
      orderAdjustmentTypeId: 'DISCOUNT_ADJUSTMENT',
      amount: '-12.50',
      comments: '',
    });

    component.onSave();

    expect(dialogRef.close).toHaveBeenCalledWith({
      orderAdjustmentTypeId: 'DISCOUNT_ADJUSTMENT',
      amount: -12.5,
      comments: undefined,
    });
  });

  it('cancels with null', () => {
    component.onCancel();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });
});

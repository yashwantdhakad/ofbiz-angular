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
import { LandedCostAllocationDialogComponent } from './landed-cost-allocation-dialog.component';

describe('LandedCostAllocationDialogComponent', () => {
  let component: LandedCostAllocationDialogComponent;
  let fixture: ComponentFixture<LandedCostAllocationDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<LandedCostAllocationDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<LandedCostAllocationDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [LandedCostAllocationDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { dutyAmount: 10, clearingFees: 5, freightAmount: 2.5, receivedItemCount: 3 } },
      ],
    })
      .overrideComponent(LandedCostAllocationDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(LandedCostAllocationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('calculates the landed-cost total and default allocation method', () => {
    expect(component.total).toBe(17.5);
    expect(component.form.value.allocationMethod).toBe('VALUE');
  });

  it('closes with allocation method only when form is valid', () => {
    component.form.patchValue({ allocationMethod: null });
    component.allocate();
    expect(dialogRef.close).not.toHaveBeenCalled();

    component.form.patchValue({ allocationMethod: 'QUANTITY' });
    component.allocate();

    expect(dialogRef.close).toHaveBeenCalledWith({ allocationMethod: 'QUANTITY' });
  });
});

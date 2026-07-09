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
import { TranslateModule } from '@ngx-translate/core';
import { ShippingInstructionDialogComponent } from './shipping-instruction-dialog.component';

describe('ShippingInstructionDialogComponent', () => {
  let component: ShippingInstructionDialogComponent;
  let fixture: ComponentFixture<ShippingInstructionDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ShippingInstructionDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<ShippingInstructionDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ShippingInstructionDialogComponent, ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            titleKey: 'ORDER.SHIPPING_INSTRUCTIONS',
            shippingInstructions: 'Keep upright',
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShippingInstructionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('seeds the form from the incoming dialog data', () => {
    expect(component.form.value.shippingInstructions).toBe('Keep upright');
  });

  it('saves the current string value', () => {
    component.form.patchValue({ shippingInstructions: 'Handle with care' });

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith('Handle with care');
  });

  it('falls back to an empty string when the control is cleared', () => {
    component.form.patchValue({ shippingInstructions: '' });

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith('');
  });

  it('closes with null on cancel', () => {
    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });
});

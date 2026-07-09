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
import { TranslateModule } from '@ngx-translate/core';
import { ShipToPhoneDialogComponent } from './ship-to-phone-dialog.component';

describe('ShipToPhoneDialogComponent', () => {
  let component: ShipToPhoneDialogComponent;
  let fixture: ComponentFixture<ShipToPhoneDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ShipToPhoneDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<ShipToPhoneDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [ShipToPhoneDialogComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { countryCode: '+1', areaCode: '408', contactNumber: '5550000' },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ShipToPhoneDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('seeds the form from dialog data', () => {
    expect(component.form.value).toEqual({
      countryCode: '+1',
      areaCode: '408',
      contactNumber: '5550000',
    });
  });

  it('marks the form touched and skips close when invalid', () => {
    spyOn(component.form, 'markAllAsTouched');
    component.form.patchValue({ contactNumber: '' });

    component.save();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with the phone payload when valid', () => {
    component.form.setValue({
      countryCode: '+91',
      areaCode: '80',
      contactNumber: '1234567890',
    });

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      countryCode: '+91',
      areaCode: '80',
      contactNumber: '1234567890',
    });
  });
});

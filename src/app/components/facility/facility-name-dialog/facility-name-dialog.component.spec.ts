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
import { FacilityNameDialogComponent } from './facility-name-dialog.component';

describe('FacilityNameDialogComponent', () => {
  let component: FacilityNameDialogComponent;
  let fixture: ComponentFixture<FacilityNameDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<FacilityNameDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<FacilityNameDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [FacilityNameDialogComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { facilityName: 'Main Warehouse' } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(FacilityNameDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('seeds the form from dialog data', () => {
    expect(component.form.get('facilityName')?.value).toBe('Main Warehouse');
  });

  it('marks the form touched and skips close when invalid', () => {
    spyOn(component.form, 'markAllAsTouched');
    component.form.patchValue({ facilityName: '' });

    component.save();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('trims the name before closing', () => {
    component.form.patchValue({ facilityName: '  East Hub  ' });

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith('East Hub');
  });
});

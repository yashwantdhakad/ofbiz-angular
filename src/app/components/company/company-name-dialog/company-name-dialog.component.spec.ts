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
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { CompanyNameDialogComponent } from './company-name-dialog.component';

describe('CompanyNameDialogComponent', () => {
  let component: CompanyNameDialogComponent;
  let fixture: ComponentFixture<CompanyNameDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<CompanyNameDialogComponent>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [CompanyNameDialogComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { companyName: 'Test Company' } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyNameDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize the form with companyName', () => {
    expect(component.form.value.companyName).toBe('Test Company');
  });

  it('should close the dialog with company name on save if form is valid', () => {
    component.form.setValue({ companyName: 'New Company' });
    component.save();
    expect(dialogRefSpy.close).toHaveBeenCalledWith('New Company');
  });

  it('should mark all fields as touched and not close the dialog on save if form is invalid', () => {
    component.form.setValue({ companyName: '' });
    component.save();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('should close the dialog without data on cancel', () => {
    component.cancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith();
  });
});

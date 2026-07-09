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
import { GlAccountDialogComponent, GlAccountDialogData } from './gl-account-dialog.component';

describe('GlAccountDialogComponent', () => {
  let component: GlAccountDialogComponent;
  let fixture: ComponentFixture<GlAccountDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<GlAccountDialogComponent>>;

  const data: GlAccountDialogData = {
    account: {
      glAccountId: '1000',
      accountCode: '1000',
      accountName: 'Cash',
      glAccountTypeId: 'ASSET',
      parentGlAccountId: 'ROOT',
      description: 'Cash account',
    },
    types: [{ glAccountTypeId: 'ASSET', description: 'Asset' }],
    parentAccounts: [{ glAccountId: 'ROOT', accountCode: '0000', accountName: 'Root' }],
  };

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<GlAccountDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [GlAccountDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    })
      .overrideComponent(GlAccountDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(GlAccountDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('hydrates the form from the selected account', () => {
    expect(component.form.value).toEqual(jasmine.objectContaining({
      glAccountId: '1000',
      accountCode: '1000',
      accountName: 'Cash',
      glAccountTypeId: 'ASSET',
      parentGlAccountId: 'ROOT',
    }));
  });

  it('does not close when required fields are missing', () => {
    component.form.patchValue({ accountName: '' });
    const markAllAsTouched = spyOn(component.form, 'markAllAsTouched').and.callThrough();

    component.save();

    expect(markAllAsTouched).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with normalized account values on save', () => {
    component.form.patchValue({ parentGlAccountId: '', description: '' });

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({
      glAccountId: '1000',
      accountCode: '1000',
      accountName: 'Cash',
      glAccountTypeId: 'ASSET',
      parentGlAccountId: null,
      description: null,
    }));
  });

  it('compares and displays account and type values by id', () => {
    expect(component.compareAccount({ glAccountId: '1000' }, '1000')).toBeTrue();
    expect(component.compareAccount({ glAccountId: '1000' }, '2000')).toBeFalse();
    expect(component.compareType({ glAccountTypeId: 'ASSET' }, 'ASSET')).toBeTrue();
    expect(component.compareType(null, null)).toBeTrue();
    expect(component.displayAccount(data.parentAccounts[0])).toBe('0000 - Root');
    expect(component.displayAccount('ROOT')).toBe('ROOT');
    expect(component.displayType(data.types[0])).toBe('Asset');
    expect(component.displayType('ASSET')).toBe('ASSET');
  });

  it('closes without a value when cancelled', () => {
    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});

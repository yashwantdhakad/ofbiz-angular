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
import { JournalEntryDialogComponent, JournalEntryDialogData } from './journal-entry-dialog.component';

describe('JournalEntryDialogComponent', () => {
  let component: JournalEntryDialogComponent;
  let fixture: ComponentFixture<JournalEntryDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<JournalEntryDialogComponent>>;

  const dialogData: JournalEntryDialogData = {
    accounts: [
      { glAccountId: '1000', accountCode: '1000', accountName: 'Cash' },
      { glAccountId: '2000', accountCode: '2000', accountName: 'Revenue' },
    ],
    types: [],
    transaction: {
      acctgTransId: 'JRN-1',
      description: 'Opening balance',
      transactionDate: '2026-07-09T10:00:00',
      voucherRef: '',
      isPosted: false,
    },
    entries: [
      { acctgTransId: 'JRN-1', glAccountId: '1000', amount: 50, debitCreditFlag: true, currencyUomId: 'USD' },
      { acctgTransId: 'JRN-1', glAccountId: '2000', amount: 50, debitCreditFlag: false, currencyUomId: 'USD' },
    ],
  };

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<JournalEntryDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [JournalEntryDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    })
      .overrideComponent(JournalEntryDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(JournalEntryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('hydrates transaction and entry rows from dialog data', () => {
    expect(component.form.value.acctgTransId).toBe('JRN-1');
    expect(component.form.value.transactionDate).toBe('2026-07-09');
    expect(component.entries).toHaveSize(2);
    expect(component.debitTotal()).toBe(50);
    expect(component.creditTotal()).toBe(50);
    expect(component.displayAccount(dialogData.accounts[0])).toBe('1000 - Cash');
  });

  it('prevents removing the final journal line', () => {
    component.removeLine(1);
    component.removeLine(0);

    expect(component.entries).toHaveSize(1);
  });

  it('marks an invalid form as touched without closing', () => {
    component.form.patchValue({ description: '' });
    const markAllAsTouched = spyOn(component.form, 'markAllAsTouched').and.callThrough();

    component.save();

    expect(markAllAsTouched).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('sets a form error when debit and credit totals are not balanced', () => {
    component.entries.at(0).patchValue({ debitAmount: 75 });

    component.save();

    expect(component.form.errors).toEqual({ unbalanced: true });
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with normalized transaction and entry payloads when balanced', () => {
    component.form.patchValue({ isPosted: true, glJournalId: '', voucherRef: '' });

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      transaction: jasmine.objectContaining({
        acctgTransId: 'JRN-1',
        description: 'Opening balance',
        glJournalId: null,
        voucherRef: null,
        isPosted: true,
      }),
      entries: [
        jasmine.objectContaining({
          acctgTransEntrySeqId: '00001',
          amount: 50,
          debitCreditFlag: true,
          currencyUomId: 'USD',
        }),
        jasmine.objectContaining({
          acctgTransEntrySeqId: '00002',
          amount: 50,
          debitCreditFlag: false,
          currencyUomId: 'USD',
        }),
      ],
    });
  });

  it('closes without a result when cancelled', () => {
    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});

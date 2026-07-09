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
import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AcctgTrans, AcctgTransEntry } from '@ofbiz/services/accounting/acctg-trans.service';
import { GlAccount, GlAccountType } from '@ofbiz/services/accounting/gl-account.service';

export interface JournalEntryDialogData {
  transaction?: AcctgTrans | null;
  entries?: AcctgTransEntry[] | null;
  accounts: GlAccount[];
  types: GlAccountType[];
}

export interface JournalEntryDialogResult {
  transaction: AcctgTrans;
  entries: AcctgTransEntry[];
}

@Component({
  standalone: false,
  selector: 'app-journal-entry-dialog',
  templateUrl: './journal-entry-dialog.component.html',
  styleUrls: ['./journal-entry-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalEntryDialogComponent implements OnInit {
  readonly form: FormGroup;
  readonly accountOptions: GlAccount[];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<JournalEntryDialogComponent, JournalEntryDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: JournalEntryDialogData
  ) {
    this.accountOptions = Array.isArray(data.accounts) ? data.accounts : [];
    const transaction = data.transaction || {};
    this.form = this.fb.group({
      acctgTransId: [transaction.acctgTransId ?? '', Validators.required],
      description: [transaction.description ?? '', Validators.required],
      transactionDate: [this.toDateInput(transaction.transactionDate) ?? this.todayInput(), Validators.required],
      glJournalId: [transaction.glJournalId ?? ''],
      voucherRef: [transaction.voucherRef ?? ''],
      isPosted: [!!transaction.isPosted],
      entries: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    const existingEntries = Array.isArray(this.data.entries) ? this.data.entries : [];
    if (existingEntries.length > 0) {
      existingEntries.forEach((entry) => this.entries.push(this.buildEntryGroup(entry)));
    } else {
      this.entries.push(this.buildEntryGroup());
      this.entries.push(this.buildEntryGroup());
    }
  }

  get entries(): FormArray {
    return this.form.get('entries') as FormArray;
  }

  addLine(): void {
    this.entries.push(this.buildEntryGroup());
  }

  removeLine(index: number): void {
    if (this.entries.length > 1) {
      this.entries.removeAt(index);
    }
  }

  debitTotal(): number {
    return this.entries.controls.reduce((sum, control) => sum + Number(control.get('debitAmount')?.value || 0), 0);
  }

  creditTotal(): number {
    return this.entries.controls.reduce((sum, control) => sum + Number(control.get('creditAmount')?.value || 0), 0);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const debit = this.debitTotal();
    const credit = this.creditTotal();
    if (Math.abs(debit - credit) > 0.0001) {
      this.form.setErrors({ unbalanced: true });
      return;
    }
    const value = this.form.value;
    const transaction: AcctgTrans = {
      ...(this.data.transaction || {}),
      acctgTransId: value.acctgTransId,
      description: value.description,
      transactionDate: value.transactionDate,
      glJournalId: value.glJournalId || null,
      voucherRef: value.voucherRef || null,
      isPosted: !!value.isPosted,
      postedDate: value.isPosted ? new Date().toISOString() : (this.data.transaction?.postedDate ?? null),
    };
    const entries: AcctgTransEntry[] = this.entries.controls.map((control, index) => {
      const line = control.value;
      const amount = Number(line.debitAmount || line.creditAmount || 0);
      return {
        ...(this.data.entries?.[index] || {}),
        acctgTransId: value.acctgTransId,
        acctgTransEntrySeqId: String(index + 1).padStart(5, '0'),
        acctgTransEntryTypeId: 'GENERAL_JOURNAL',
        description: line.description || null,
        glAccountId: line.glAccountId,
        amount,
        currencyUomId: line.currencyUomId || 'USD',
        debitCreditFlag: Number(line.debitAmount || 0) > 0,
        isSummary: false,
      };
    });
    this.dialogRef.close({ transaction, entries });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  displayAccount = (account?: GlAccount | string | null): string => {
    if (!account) return '';
    if (typeof account === 'string') return account;
    return [account.accountCode, account.accountName].filter(Boolean).join(' - ') || account.glAccountId || '';
  };

  private buildEntryGroup(entry?: AcctgTransEntry): FormGroup {
    const amount = Number(entry?.amount ?? 0);
    const debit = entry?.debitCreditFlag === false ? 0 : amount;
    const credit = entry?.debitCreditFlag === false ? amount : 0;
    return this.fb.group({
      glAccountId: [entry?.glAccountId ?? '', Validators.required],
      description: [entry?.description ?? ''],
      debitAmount: [debit],
      creditAmount: [credit],
      currencyUomId: [entry?.currencyUomId ?? 'USD'],
    });
  }

  private todayInput(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toDateInput(value?: string | null): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().slice(0, 10);
  }
}

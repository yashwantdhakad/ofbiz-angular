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
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GlAccount, GlAccountType } from '@ofbiz/services/accounting/gl-account.service';

export interface GlAccountDialogData {
  account?: GlAccount | null;
  types: GlAccountType[];
  parentAccounts: GlAccount[];
}

type GlAccountValue = GlAccount | string | null;
type GlAccountTypeValue = GlAccountType | string | null;

@Component({
  standalone: false,
  selector: 'app-gl-account-dialog',
  templateUrl: './gl-account-dialog.component.html',
  styleUrls: ['./gl-account-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlAccountDialogComponent {
  readonly form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<GlAccountDialogComponent, GlAccount>,
    @Inject(MAT_DIALOG_DATA) public data: GlAccountDialogData
  ) {
    const account = data?.account || {};
    this.form = this.fb.group({
      glAccountId: [account.glAccountId ?? '', Validators.required],
      accountCode: [account.accountCode ?? '', Validators.required],
      accountName: [account.accountName ?? '', Validators.required],
      glAccountTypeId: [account.glAccountTypeId ?? '', Validators.required],
      parentGlAccountId: [account.parentGlAccountId ?? ''],
      description: [account.description ?? ''],
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const account = this.data?.account || {};
    const value = this.form.value;
    this.dialogRef.close({
      ...account,
      glAccountId: value.glAccountId,
      accountCode: value.accountCode,
      accountName: value.accountName,
      glAccountTypeId: value.glAccountTypeId,
      parentGlAccountId: value.parentGlAccountId || null,
      description: value.description || null,
    });
  }

  compareAccount = (left: GlAccountValue, right: GlAccountValue): boolean => {
    return this.resolveAccountId(left) === this.resolveAccountId(right);
  };

  compareType = (left: GlAccountTypeValue, right: GlAccountTypeValue): boolean => {
    return this.resolveTypeId(left) === this.resolveTypeId(right);
  };

  displayAccount(account?: GlAccountValue): string {
    if (!account) {
      return '';
    }
    if (typeof account === 'string') {
      return account;
    }
    return [account.accountCode, account.accountName].filter(Boolean).join(' - ') || account.glAccountId || '';
  }

  displayType(type?: GlAccountTypeValue): string {
    if (!type) {
      return '';
    }
    if (typeof type === 'string') {
      return type;
    }
    return type.description || type.glAccountTypeId || '';
  }

  private resolveAccountId(account?: GlAccountValue): string {
    if (!account) {
      return '';
    }
    if (typeof account === 'string') {
      return account;
    }
    return account.glAccountId || '';
  }

  private resolveTypeId(type?: GlAccountTypeValue): string {
    if (!type) {
      return '';
    }
    if (typeof type === 'string') {
      return type;
    }
    return type.glAccountTypeId || '';
  }
}

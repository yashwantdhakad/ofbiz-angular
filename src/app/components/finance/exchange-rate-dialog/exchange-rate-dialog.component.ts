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
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UomLookupItem } from '@ofbiz/services/common/common.service';
import { CreateExchangeRatePayload } from '@ofbiz/services/accounting/exchange-rate.service';

export interface ExchangeRateDialogData {
  currencies: UomLookupItem[];
}

export type ExchangeRateDialogResult = CreateExchangeRatePayload;

function differentCurrencies(group: AbstractControl): ValidationErrors | null {
  const from = group.get('uomId')?.value;
  const to = group.get('uomIdTo')?.value;
  return from && to && from === to ? { sameCurrency: true } : null;
}

@Component({
  standalone: false,
  selector: 'app-exchange-rate-dialog',
  templateUrl: './exchange-rate-dialog.component.html',
  styleUrls: ['./exchange-rate-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExchangeRateDialogComponent {
  readonly form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ExchangeRateDialogComponent, ExchangeRateDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: ExchangeRateDialogData
  ) {
    this.form = this.fb.group({
      uomId: ['', Validators.required],
      uomIdTo: ['', Validators.required],
      conversionFactor: [null, [Validators.required, Validators.min(0.0000000001)]],
      withReverse: [true],
    }, { validators: differentCurrencies });
  }

  displayCurrency(currency: UomLookupItem): string {
    const code = currency.uomId || '';
    return currency.description && currency.description !== code
      ? `${code} — ${currency.description}`
      : code;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value;
    this.dialogRef.close({
      uomId: value.uomId,
      uomIdTo: value.uomIdTo,
      conversionFactor: Number(value.conversionFactor),
      withReverse: value.withReverse ? 'Y' : 'N',
    });
  }
}

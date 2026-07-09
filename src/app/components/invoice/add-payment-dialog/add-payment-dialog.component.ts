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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import { InvoiceService } from '@ofbiz/services/invoice/invoice.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

export interface AddPaymentDialogData {
  invoiceDbId: number;
  invoiceId: string;
  mode: 'sales' | 'purchase';
  defaultAmount: number;
  currencyUomId: string;
  availablePayments?: any[];
  availablePaymentMethods?: any[];
  partyIdFrom?: string;
  partyIdTo?: string;
}

@Component({
  standalone: false,
  selector: 'app-add-payment-dialog',
  templateUrl: './add-payment-dialog.component.html',
  styleUrls: ['./add-payment-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddPaymentDialogComponent implements OnInit {
  paymentForm: FormGroup;
  readonly isSubmitting = signal(false);
  selectedTab = 0;

  offlineMethods = [
    { labelKey: 'PAYMENT.OFFLINE_METHOD_CERTIFIED_CHECK', value: 'CERTIFIED_CHECK' },
    { labelKey: 'PAYMENT.OFFLINE_METHOD_COMPANY_CHECK', value: 'COMPANY_CHECK' },
    { labelKey: 'PAYMENT.OFFLINE_METHOD_MONEY_ORDER', value: 'MONEY_ORDER' },
    { labelKey: 'PAYMENT.OFFLINE_METHOD_COMPANY_ACCOUNT', value: 'COMPANY_ACCOUNT' },
    { labelKey: 'PAYMENT.OFFLINE_METHOD_PERSONAL_CHECK', value: 'PERSONAL_CHECK' },
    { labelKey: 'PAYMENT.OFFLINE_METHOD_WIRE_TRANSFER', value: 'WIRE_TRANSFER' }
  ];

  readonly modeLabels = {
    sales: {
      title: 'PAYMENT.APPLY_CUSTOMER_PAYMENT',
      existingTab: 'PAYMENT.USE_EXISTING_CUSTOMER_PAYMENT',
      recordTab: 'PAYMENT.RECORD_CUSTOMER_PAYMENT',
      noPayments: 'PAYMENT.NO_CUSTOMER_PAYMENTS',
      applyButton: 'PAYMENT.APPLY_PAYMENT',
    },
    purchase: {
      title: 'PAYMENT.APPLY_VENDOR_PAYMENT',
      existingTab: 'PAYMENT.USE_EXISTING_VENDOR_PAYMENT',
      recordTab: 'PAYMENT.RECORD_VENDOR_PAYMENT',
      noPayments: 'PAYMENT.NO_VENDOR_PAYMENTS',
      applyButton: 'PAYMENT.APPLY_PAYMENT',
    },
  } as const;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddPaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddPaymentDialogData,
    private invoiceService: InvoiceService,
    private snackbarService: SnackbarService,
    private cdr: ChangeDetectorRef
  ) {
    this.paymentForm = this.fb.group({
      amount: [this.data.defaultAmount, [Validators.required, Validators.min(0.01)]],
      paymentId: [''],
      paymentMethodId: [''],
      paymentMethodTypeId: ['COMPANY_CHECK', Validators.required],
      referenceNo: [''],
      comments: [''],
    });
  }

  ngOnInit(): void {
    this.switchTab(this.availablePayments.length > 0 ? 0 : 1);
  }

  get availablePayments(): any[] {
    return Array.isArray(this.data.availablePayments) ? this.data.availablePayments : [];
  }

  get availablePaymentMethods(): any[] {
    return Array.isArray(this.data.availablePaymentMethods) ? this.data.availablePaymentMethods : [];
  }

  get isExistingPaymentMode(): boolean {
    return this.selectedTab === 0;
  }

  get labels() {
    return this.data.mode === 'purchase' ? this.modeLabels.purchase : this.modeLabels.sales;
  }

  onAdd(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    const formVal = this.paymentForm.value;
    const payload: any = {
      amount: formVal.amount,
      currencyUomId: this.data.currencyUomId,
      partyIdFrom: this.data.partyIdFrom,
      partyIdTo: this.data.partyIdTo,
      comments: formVal.comments,
    };
    if (this.isExistingPaymentMode) {
      payload.paymentId = formVal.paymentId;
    } else {
      const selectedPaymentMethodId = typeof formVal.paymentMethodId === 'string'
        ? formVal.paymentMethodId.trim()
        : formVal.paymentMethodId;
      if (selectedPaymentMethodId) {
        payload.paymentMethodId = selectedPaymentMethodId;
      }
      payload.paymentMethodTypeId = formVal.paymentMethodTypeId;
      payload.referenceNo = formVal.referenceNo;
      payload.paymentTypeId = this.data.mode === 'purchase' ? 'VENDOR_PAYMENT' : 'CUSTOMER_PAYMENT';
    }

    this.invoiceService.applyPayment(this.data.invoiceDbId, payload).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.dialogRef.close(response);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const message = err?.error?.message || err?.message || 'Failed to apply payment.';
        this.snackbarService.showError(message);
        this.cdr.markForCheck();
      }
    });
  }

  onPaymentMethodChange(event: MatSelectChange): void {
    const selectedId = typeof event.value === 'string' ? event.value : '';
    const method = this.availablePaymentMethods.find((entry) => entry?.paymentMethodId === selectedId);
    if (!selectedId || !method) {
      return;
    }
    this.paymentForm.patchValue({
      paymentMethodTypeId: method?.paymentMethodTypeId || 'COMPANY_CHECK',
    });
  }

  switchTab(index: number): void {
    this.selectedTab = index;
    if (index === 0) {
      this.paymentForm.get('paymentId')?.setValidators([Validators.required]);
      this.paymentForm.get('paymentMethodId')?.clearValidators();
      this.paymentForm.get('paymentMethodTypeId')?.clearValidators();
    } else {
      this.paymentForm.get('paymentId')?.clearValidators();
      this.paymentForm.get('paymentMethodId')?.clearValidators();
      this.paymentForm.get('paymentMethodTypeId')?.setValidators([Validators.required]);
    }
    this.paymentForm.get('paymentId')?.updateValueAndValidity();
    this.paymentForm.get('paymentMethodId')?.updateValueAndValidity();
    this.paymentForm.get('paymentMethodTypeId')?.updateValueAndValidity();
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

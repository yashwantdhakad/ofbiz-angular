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
import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '@ofbiz/services/payment/payment.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { StatusHistoryEntry } from '../../common/status-history/status-history-icon.component';

@Component({
  standalone: false,
  selector: 'app-payment-detail',
  templateUrl: './payment-detail.component.html',
  styleUrls: ['./payment-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentDetailComponent implements OnInit {
  isLoading = signal<boolean>(false);
  isSavingStatus = signal<boolean>(false);
  payment = signal<any>(null);
  editingRefNum = signal<boolean>(false);
  refNumEditValue = signal<string>('');
  statusMap = computed(() => this.referenceDataStore.statusDescriptionMap());
  statusHistoryEntries = computed<StatusHistoryEntry[]>(() => {
    const statuses = this.payment()?.statusHistory || this.payment()?.statuses;
    if (!Array.isArray(statuses)) {
      return [];
    }
    return statuses
      .filter((entry: any) => !!entry?.statusId)
      .map((entry: any) => ({
        statusId: entry.statusId,
        statusLabel: this.getStatusLabel(entry.statusId),
        changedAt: entry.statusDate,
        changedBy: entry.changeByUserLoginId,
      }));
  });
  paymentMode = computed<'sales' | 'purchase'>(() => {
    const type = String(this.payment()?.paymentTypeId || '').toUpperCase();
    return type.includes('VENDOR') ? 'purchase' : 'sales';
  });

  invoiceColumns: string[] = ['invoiceId', 'invoiceDate', 'invoiceStatusId', 'amountApplied'];
  txnColumns: string[] = ['acctgTransId', 'transactionDate', 'glAccountId', 'description', 'debit', 'credit'];

  readonly PAYMENT_STATUSES = [
    { id: 'PMNT_NOT_PAID', label: 'Not Paid' },
    { id: 'PMNT_SENT', label: 'Paid' },
    { id: 'PMNT_RECEIVED', label: 'Received' },
    { id: 'PMNT_PARTIALLY_APPLIED', label: 'Partially Applied' },
    { id: 'PMNT_APPLIED', label: 'Applied' },
    { id: 'PMNT_CONFIRMED', label: 'Confirmed' },
    { id: 'PMNT_CANCELLED', label: 'Cancelled' },
    { id: 'PMNT_VOID', label: 'Void' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private referenceDataStore: ReferenceDataStore,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.referenceDataStore.ensureAllStatusesLoaded();
    const rawId = this.route.snapshot.paramMap.get('id');
    if (!rawId) return;
    this.loadPayment(rawId);
  }

  loadPayment(id: number | string): void {
    this.isLoading.set(true);
    this.paymentService.getPaymentDetail(id).subscribe({
      next: (data) => {
        this.payment.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  changeStatus(statusId: string): void {
    const p = this.payment();
    const paymentId = p?.id ?? p?.paymentId;
    if (!paymentId) return;
    if (statusId === 'PMNT_SENT' && !this.hasAppliedInvoices()) {
      this.snackbarService.showError(
        this.translate.instant('PAYMENT.APPLY_INVOICE_BEFORE_PAID')
      );
      return;
    }
    this.isSavingStatus.set(true);
    this.paymentService.changePaymentStatus(paymentId, statusId).subscribe({
      next: () => {
        this.isSavingStatus.set(false);
        this.snackbarService.showSuccess(this.translate.instant('PAYMENT.STATUS_UPDATED'));
        this.loadPayment(paymentId);
      },
      error: (error) => {
        this.isSavingStatus.set(false);
        const message = error?.error?.message || this.translate.instant('PAYMENT.STATUS_UPDATE_ERROR');
        this.snackbarService.showError(message);
      },
    });
  }

  getStatusActions(): Array<{ id: string; icon: string; label: string }> {
    return this.paymentMode() === 'purchase'
      ? [
          ...(this.hasAppliedInvoices() ? [{ id: 'PMNT_SENT', icon: 'payments', label: 'Mark Paid' }] : []),
          { id: 'PMNT_CONFIRMED', icon: 'check_circle', label: 'Confirm' },
          { id: 'PMNT_CANCELLED', icon: 'cancel', label: 'Cancel' },
          { id: 'PMNT_VOID', icon: 'block', label: 'Void' },
        ]
      : [
          { id: 'PMNT_RECEIVED', icon: 'move_to_inbox', label: 'Receive' },
          { id: 'PMNT_CONFIRMED', icon: 'check_circle', label: 'Confirm' },
          { id: 'PMNT_CANCELLED', icon: 'cancel', label: 'Cancel' },
          { id: 'PMNT_VOID', icon: 'block', label: 'Void' },
        ];
  }

  getOverviewTitle(): string {
    return this.paymentMode() === 'purchase' ? 'Vendor Payment Overview' : 'Customer Payment Overview';
  }

  getFromLabel(): string {
    return this.paymentMode() === 'purchase' ? 'Company' : 'Customer';
  }

  getToLabel(): string {
    return this.paymentMode() === 'purchase' ? 'Vendor' : 'Company';
  }

  startEditRefNum(): void {
    const p = this.payment();
    this.refNumEditValue.set(p?.paymentRefNum || '');
    this.editingRefNum.set(true);
  }

  saveRefNum(): void {
    const p = this.payment();
    const paymentId = p?.id ?? p?.paymentId;
    if (!paymentId) return;
    this.isSavingStatus.set(true);
    this.paymentService.changePaymentStatus(paymentId, p.statusId, this.refNumEditValue()).subscribe({
      next: () => {
        this.editingRefNum.set(false);
        this.isSavingStatus.set(false);
        this.snackbarService.showSuccess(this.translate.instant('PAYMENT.REFERENCE_UPDATED'));
        this.loadPayment(paymentId);
      },
      error: () => {
        this.isSavingStatus.set(false);
        this.snackbarService.showError(this.translate.instant('PAYMENT.REFERENCE_UPDATE_ERROR'));
      },
    });
  }

  cancelEditRefNum(): void {
    this.editingRefNum.set(false);
  }

  navigateToInvoice(inv: any): void {
    if (inv?.invoiceDbId) {
      const mode = inv?.invoiceMode === 'purchase' ? 'purchase' : 'sales';
      this.router.navigate([`/invoices/${mode}`, inv.invoiceDbId]);
    }
  }

  getInvoiceStatusLabel(inv: any): string {
    return this.getStatusLabel(inv?.invoiceStatusId || inv?.statusId);
  }
  getStatusLabel(statusId?: string | null): string {
    if (!statusId) return '-';
    const normalized = String(statusId).trim();
    const paymentStatusLabel = this.getPaymentBusinessStatusLabel(normalized);
    if (paymentStatusLabel) {
      return paymentStatusLabel;
    }
    const map = this.statusMap();
    return map.get(normalized) || map.get(normalized.toUpperCase()) || this.humanizeCode(normalized);
  }

  private humanizeCode(code?: string): string {
    return String(code || '').split('_').filter(Boolean)
      .map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()).join(' ');
  }

  private getPaymentBusinessStatusLabel(statusId?: string | null): string | null {
    const normalized = String(statusId || '').trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    if (normalized === 'PMNT_RECEIVED') {
      return 'Received';
    }
    if (normalized === 'PMNT_SENT') {
      return 'Paid';
    }
    return null;
  }

  private hasAppliedInvoices(): boolean {
    return Array.isArray(this.payment()?.invoices) && this.payment().invoices.length > 0;
  }
}

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
import { InvoiceService } from '@ofbiz/services/invoice/invoice.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { MatDialog } from '@angular/material/dialog';
import { AddPaymentDialogComponent } from '../add-payment-dialog/add-payment-dialog.component';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { StatusHistoryEntry } from '../../common/status-history/status-history-icon.component';

@Component({
  standalone: false,
  selector: 'app-invoice-detail',
  templateUrl: './invoice-detail.component.html',
  styleUrls: ['./invoice-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceDetailComponent implements OnInit {
  isLoading = signal<boolean>(false);
  isSavingStatus = signal<boolean>(false);
  isSavingPayment = signal<boolean>(false);
  mode = signal<'sales' | 'purchase'>('sales');
  listPath = signal<string>('/invoices/sales');
  invoice = signal<any>(null);
  statusMap = computed(() => this.referenceDataStore.statusDescriptionMap());
  statusHistoryEntries = computed<StatusHistoryEntry[]>(() => {
    const statuses = this.invoice()?.statuses || this.invoice()?.statusHistory;
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
  isFullyPaid = computed(() => {
    const inv = this.invoice();
    if (!inv) return false;
    const grandTotal = inv.grandTotal || 0;
    const applied = (inv.payments || []).reduce((acc: number, p: any) => acc + (p.amountApplied || 0), 0);
    return applied >= grandTotal;
  });

  itemColumns: string[] = ['item', 'qty', 'unitPrice', 'total'];
  refColumns: string[] = ['referenceId', 'type', 'date', 'status', 'amount'];
  txnColumns: string[] = ['acctgTransId', 'transactionDate', 'glAccountId', 'description', 'debit', 'credit'];
  paymentColumns: string[] = ['paymentId', 'paymentMethod', 'date', 'status', 'amount', 'action'];

  // INVOICE_READY is the status that posts the invoice to the general ledger;
  // PAID is only reachable from READY (the backend steps through automatically).
  readonly INVOICE_STATUSES_PURCHASE = [
    { id: 'INVOICE_IN_PROCESS', label: 'In Process' },
    { id: 'INVOICE_APPROVED', label: 'Approved' },
    { id: 'INVOICE_READY', label: 'Ready (Post to GL)' },
    { id: 'INVOICE_PAID', label: 'Paid' },
    { id: 'INVOICE_WRITEOFF', label: 'Write Off' },
    { id: 'INVOICE_CANCELLED', label: 'Cancelled' },
  ];

  readonly INVOICE_STATUSES_SALES = [
    { id: 'INVOICE_IN_PROCESS', label: 'In Process' },
    { id: 'INVOICE_SENT', label: 'Sent' },
    { id: 'INVOICE_READY', label: 'Ready (Post to GL)' },
    { id: 'INVOICE_PAID', label: 'Paid' },
    { id: 'INVOICE_WRITEOFF', label: 'Write Off' },
    { id: 'INVOICE_CANCELLED', label: 'Cancelled' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invoiceService: InvoiceService,
    private referenceDataStore: ReferenceDataStore,
    private snackbarService: SnackbarService,
    private dialog: MatDialog,
    private translate: TranslateService
  ) { }

  openAddPaymentDialog(): void {
    const inv = this.invoice();
    if (!inv || (!inv.id && !inv.invoiceId)) return;

    // Calculate applied payments vs total
    const grandTotal = inv.grandTotal || 0;
    const applied = (inv.payments || []).reduce((acc: number, p: any) => acc + (p.amountApplied || 0), 0);
    const defaultAmount = Math.max(0, grandTotal - applied);

    const dialogRef = this.dialog.open(AddPaymentDialogComponent, {
      width: '640px',
      data: {
        invoiceDbId: inv.id ?? inv.invoiceId,
        invoiceId: inv.invoiceId ?? inv.id,
        mode: this.mode(),
        defaultAmount,
        currencyUomId: inv.currencyUomId || inv.currencyUom || 'USD',
        availablePayments: inv.availablePayments || [],
        availablePaymentMethods: inv.availablePaymentMethods || [],
        partyIdFrom: inv.partyId,
        partyIdTo: inv.partyIdFrom,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.invoice.set(result);
        this.snackbarService.showSuccess(this.translate.instant('INVOICE.PAYMENT_APPLIED_SUCCESS'));
      }
    });
  }

  getApplyPaymentLabel(): string {
    return this.mode() === 'purchase' ? 'Apply Vendor Payment' : 'Apply Customer Payment';
  }

  ngOnInit(): void {
    const data = { ...(this.route.parent?.snapshot.data || {}), ...(this.route.snapshot.data || {}) };
    const currentMode = data['mode'] === 'purchase' ? 'purchase' : 'sales';
    this.mode.set(currentMode);
    this.listPath.set(currentMode === 'purchase' ? '/invoices/purchase' : '/invoices/sales');
    this.referenceDataStore.ensureAllStatusesLoaded();

    const rawId = this.route.snapshot.paramMap.get('id');
    if (!rawId) return;

    this.isLoading.set(true);
    this.invoiceService.getInvoiceDetail(rawId).subscribe({
      next: (response) => {
        this.invoice.set(response);
        this.isLoading.set(false);
      },
      error: () => {
        this.invoice.set(null);
        this.isLoading.set(false);
      },
    });
  }

  get invoiceStatuses() {
    return this.mode() === 'purchase' ? this.INVOICE_STATUSES_PURCHASE : this.INVOICE_STATUSES_SALES;
  }

  changeStatus(statusId: string): void {
    const inv = this.invoice();
    const invoiceDbId = inv?.id ?? inv?.invoiceId;
    if (!invoiceDbId) return;
    this.isSavingStatus.set(true);
    this.invoiceService.changeInvoiceStatus(invoiceDbId, statusId).subscribe({
      next: (updated) => {
        this.invoice.set(updated);
        this.isSavingStatus.set(false);
        this.snackbarService.showSuccess(this.translate.instant('INVOICE.STATUS_UPDATED'));
      },
      error: (err) => {
        this.isSavingStatus.set(false);
        const message = err?.error?.message || err?.message || this.translate.instant('INVOICE.STATUS_UPDATE_ERROR');
        this.snackbarService.showError(message);
      },
    });
  }

  navigateToReconcile(): void {
    const inv = this.invoice();
    if (inv?.id) {
      this.router.navigate(['/invoices/purchase', inv.id, 'reconcile']);
    }
  }

  openPdf(): void {
    const currInvoice = this.invoice();
    if (!currInvoice?.id) return;
    this.invoiceService.getInvoicePdf(currInvoice.id).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 30000);
    });
  }

  getReferenceLink(ref: any): any[] | null {
    const type = (ref?.type || '').toUpperCase();
    if (type.includes('PURCHASE')) return ['/pos', ref.referenceId];
    if (type.includes('SALES') || type.includes('QUOTE') || type === 'ORDER') return ['/orders', ref.referenceId];
    if (ref?.referenceId) return ['/orders', ref.referenceId];
    return null;
  }

  getPaymentLink(payment: any): any[] | null {
    if (payment?.paymentDbId) return ['/payments', payment.paymentDbId];
    return null;
  }

  removePaymentApplication(payment: any): void {
    const inv = this.invoice();
    const paymentApplicationId = payment?.paymentApplicationId;
    if (!inv?.id || !paymentApplicationId) {
      return;
    }
    this.isSavingPayment.set(true);
    this.invoiceService.removePaymentApplication(inv.id, paymentApplicationId).subscribe({
      next: (updated) => {
        this.invoice.set(updated);
        this.isSavingPayment.set(false);
        this.snackbarService.showSuccess(
          this.translate.instant('INVOICE.PAYMENT_APPLICATION_REMOVED')
        );
      },
      error: (err) => {
        this.isSavingPayment.set(false);
        const message = err?.error?.message || err?.message || this.translate.instant('INVOICE.PAYMENT_APPLICATION_REMOVE_ERROR');
        this.snackbarService.showError(message);
      },
    });
  }

  canApplyPayment(): boolean {
    const inv = this.invoice();
    return !!inv && (inv.outstandingAmount || 0) > 0;
  }

  canRemovePayment(payment: any): boolean {
    return !!payment?.paymentApplicationId;
  }
  itemLabel(item: any): string {
    return item?.description || item?.productId || '-';
  }

  itemQuantity(item: any): any {
    return item?.quantity ?? item?.qty ?? '-';
  }

  itemUnitPrice(item: any): any {
    return item?.unitAmount ?? item?.unitPrice ?? 0;
  }

  itemTotal(item: any): any {
    return item?.amount ?? item?.total ?? 0;
  }

  getStatusLabel(statusId?: string | null): string {
    if (!statusId) return '-';
    const normalized = String(statusId).trim();
    const invoiceStatusLabel = this.getInvoiceBusinessStatusLabel(normalized);
    if (invoiceStatusLabel) {
      return invoiceStatusLabel;
    }
    const map = this.statusMap();
    return (
      map.get(normalized)
      || map.get(normalized.toUpperCase())
      || this.humanizeCode(normalized)
      || normalized
    );
  }

  getPaymentStatusLabel(statusId?: string | null): string {
    if (!statusId) return '-';
    const normalized = String(statusId).trim().toUpperCase();
    if (normalized === 'PMNT_RECEIVED') {
      return 'Received';
    }
    if (normalized === 'PMNT_SENT') {
      return 'Paid';
    }
    return this.getStatusLabel(statusId);
  }

  private humanizeCode(code?: string): string {
    const normalized = String(code || '').trim();
    if (!normalized) return '';
    return normalized.split('_').filter(Boolean)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()).join(' ');
  }

  private getInvoiceBusinessStatusLabel(statusId?: string | null): string | null {
    const normalized = String(statusId || '').trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    if (normalized === 'INVOICE_IN_PROCESS') {
      return 'In Process';
    }
    if (normalized === 'INVOICE_APPROVED') {
      return 'Approved';
    }
    if (normalized === 'INVOICE_SENT') {
      return 'Sent';
    }
    if (normalized === 'INVOICE_READY') {
      return 'Ready (Posted to GL)';
    }
    if (normalized === 'INVOICE_PAID') {
      return 'Paid';
    }
    return null;
  }

  shouldShowAddressLine(line: string | null | undefined, partyName: string | null | undefined): boolean {
    if (!line) return false;
    const normalizedLine = line.trim().toLowerCase();
    const normalizedName = (partyName || '').trim().toLowerCase();
    return normalizedLine.length > 0 && normalizedLine !== normalizedName;
  }
}

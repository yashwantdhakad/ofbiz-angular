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
import { FormBuilder } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import {
  PaymentMethodTypeOption,
  PaymentSearchFilters,
  PaymentService,
  PaymentSummary,
  PaymentTypeOption,
} from '@ofbiz/services/payment/payment.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';

@Component({
  standalone: false,
  selector: 'app-payments',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsComponent implements OnInit {
  readonly isLoading = signal<boolean>(false);
  readonly items = signal<PaymentSummary[]>([]);
  readonly totalCount = signal<number>(0);
  readonly paymentTypes = signal<PaymentTypeOption[]>([]);
  readonly paymentMethodTypes = signal<PaymentMethodTypeOption[]>([]);
  readonly statusMap = computed(() => this.referenceDataStore.statusDescriptionMap());

  readonly filterForm = this.fb.group({
    queryString: [''],
    paymentTypeId: [''],
    paymentMethodTypeId: [''],
    statusId: [''],
    paymentDate: [null as Date | null],
  });

  readonly pagination = signal({ page: 1, rowsPerPage: 20 });
  readonly displayedColumns: string[] = ['paymentId', 'partyName', 'paymentMethodLabel', 'effectiveDate', 'statusId', 'amount'];
  readonly detailBasePath = '/payments';

  constructor(
    private readonly fb: FormBuilder,
    private readonly paymentService: PaymentService,
    readonly referenceDataStore: ReferenceDataStore,
  ) {}

  ngOnInit(): void {
    this.referenceDataStore.ensureAllStatusesLoaded();
    this.loadReferenceData();
    this.loadPayments(1);
  }

  loadPayments(page: number): void {
    this.pagination.update((state) => ({ ...state, page }));
    this.isLoading.set(true);
    this.paymentService.findPayments(page, this.pagination().rowsPerPage, this.buildFilters()).subscribe({
      next: (response) => {
        const resultList = Array.isArray(response?.resultList) ? response.resultList : [];
        this.items.set(resultList);
        this.totalCount.set(Number(response?.totalCount || 0));
        this.isLoading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.totalCount.set(0);
        this.isLoading.set(false);
      },
    });
  }

  onSearch(): void {
    this.loadPayments(1);
  }

  onClear(): void {
    this.filterForm.reset({
      queryString: '',
      paymentTypeId: '',
      paymentMethodTypeId: '',
      statusId: '',
      paymentDate: null,
    });
    this.loadPayments(1);
  }

  onPageChange(event: PageEvent): void {
    this.pagination.set({
      page: event.pageIndex + 1,
      rowsPerPage: event.pageSize,
    });
    this.loadPayments(event.pageIndex + 1);
  }

  getStatusLabel(statusId?: string | null): string {
    if (!statusId) return '-';
    const normalized = String(statusId).trim().toUpperCase();
    if (normalized === 'PMNT_RECEIVED') return 'Received';
    if (normalized === 'PMNT_SENT') return 'Paid';
    return this.statusMap().get(statusId) || this.statusMap().get(normalized) || this.humanizeCode(statusId);
  }

  private loadReferenceData(): void {
    this.paymentService.getPaymentTypes().subscribe({
      next: (items) => {
        this.paymentTypes.set((Array.isArray(items) ? items : []).filter((item) => !!item?.paymentTypeId));
      },
      error: () => {
        this.paymentTypes.set([]);
      },
    });
    this.paymentService.getPaymentMethodTypes().subscribe({
      next: (items) => {
        this.paymentMethodTypes.set((Array.isArray(items) ? items : []).filter((item) => !!item?.paymentMethodTypeId));
      },
      error: () => {
        this.paymentMethodTypes.set([]);
      },
    });
  }

  private buildFilters(): PaymentSearchFilters {
    const raw = this.filterForm.getRawValue();
    const paymentDate = raw.paymentDate instanceof Date
      ? this.formatDate(raw.paymentDate)
      : '';
    return {
      queryString: (raw.queryString || '').trim(),
      paymentTypeId: raw.paymentTypeId || '',
      paymentMethodTypeId: raw.paymentMethodTypeId || '',
      statusId: raw.statusId || '',
      paymentDate,
    };
  }

  private humanizeCode(code?: string | null): string {
    return String(code || '')
      .split('_')
      .filter(Boolean)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
      .join(' ');
  }

  private formatDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

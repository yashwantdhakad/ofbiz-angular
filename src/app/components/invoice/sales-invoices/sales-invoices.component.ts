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
import { PageEvent } from '@angular/material/paginator';
import { InvoiceListItem, InvoiceService } from '@ofbiz/services/invoice/invoice.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';

@Component({
  standalone: false,
  selector: 'app-sales-invoices',
  templateUrl: './sales-invoices.component.html',
  styleUrls: ['./sales-invoices.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesInvoicesComponent implements OnInit {
  isLoading = signal<boolean>(false);
  items = signal<InvoiceListItem[]>([]);
  pages = signal<number>(0);
  statusOptions = computed(() => this.referenceDataStore.allStatuses());

  queryString = '';
  statusId = '';
  pagination = {
    page: 1,
    rowsPerPage: 10,
  };

  displayedColumns: string[] = [
    'invoiceId',
    'partyId',
    'invoiceDate',
    'dueDate',
    'statusDescription',
    'total',
  ];
  detailBasePath = '/invoices/sales';

  constructor(
    private invoiceService: InvoiceService,
    private referenceDataStore: ReferenceDataStore,
  ) { }

  ngOnInit(): void {
    this.referenceDataStore.ensureAllStatusesLoaded();
    this.isLoading.set(true);
    this.loadInvoices(1);
  }

  loadInvoices(page: number): void {
    this.pagination.page = page;
    this.invoiceService.findInvoices('sales', page - 1, this.pagination.rowsPerPage, this.queryString, this.statusId).subscribe({
      next: (response) => {
        this.items.set(response?.items || []);
        this.pages.set(Number(response?.total || 0));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.items.set([]);
        this.pages.set(0);
      },
    });
  }

  onSearch(): void {
    this.isLoading.set(true);
    this.loadInvoices(1);
  }

  onClear(): void {
    this.queryString = '';
    this.statusId = '';
    this.loadInvoices(1);
  }

  onPageChange(event: PageEvent): void {
    this.pagination.rowsPerPage = event.pageSize;
    this.isLoading.set(true);
    this.loadInvoices(event.pageIndex + 1);
  }
}

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
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaterialModule } from '../../common/material/material.module';
import { SharedFormatPipesModule } from '../../common/material/shared-format-pipes.module';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ReportService, VendorPerformanceResponse } from '@ofbiz/services/report/report.service';

@Component({
  selector: 'app-vendor-performance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule, MaterialModule, SharedFormatPipesModule],
  templateUrl: './vendor-performance.component.html',
  styleUrls: ['./vendor-performance.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorPerformanceComponent implements OnInit {
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly report = signal<VendorPerformanceResponse | null>(null);

  readonly filterForm = new FormGroup({
    fromDate: new FormControl<Date | null>(this.addDays(new Date(), -90)),
    thruDate: new FormControl<Date | null>(new Date()),
    limit: new FormControl<number>(10, { nonNullable: true }),
  });

  readonly summaryCards = computed(() => {
    const report = this.report();
    return [
      { label: 'REPORTS.VENDORS_REVIEWED', value: report?.totalCount ?? 0, suffix: null },
      { label: 'REPORTS.AVERAGE_SCORE', value: report?.averageScore ?? 0, suffix: ' / 100' },
      { label: 'REPORTS.TOP_SUPPLIER_SCORE', value: report?.items?.[0]?.score ?? 0, suffix: ' / 100' },
    ];
  });

  readonly displayedColumns = [
    'supplierName',
    'purchaseOrderCount',
    'receiptCount',
    'onTimeReceiptRate',
    'averageDeliveryDelayDays',
    'qualityRejectionRate',
    'priceVarianceRate',
    'score',
  ];

  constructor(
    private readonly reportService: ReportService,
    private readonly snackbarService: SnackbarService,
    private readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.reportService.getVendorPerformance(
      this.toDateString(this.filterForm.controls.fromDate.value),
      this.toDateString(this.filterForm.controls.thruDate.value),
      this.filterForm.controls.limit.value
    ).subscribe({
      next: (result) => {
        this.report.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.report.set(null);
        this.errorMessage.set('REPORTS.LOAD_ERROR');
        this.loading.set(false);
        this.snackbarService.showError(this.translate.instant('REPORTS.LOAD_ERROR'));
      },
    });
  }

  reset(): void {
    this.filterForm.setValue({
      fromDate: this.addDays(new Date(), -90),
      thruDate: new Date(),
      limit: 10,
    });
    this.load();
  }

  scoreClass(score: number | null | undefined): string {
    const value = Number(score ?? 0);
    if (value >= 85) {
      return 'score-good';
    }
    if (value >= 70) {
      return 'score-medium';
    }
    return 'score-low';
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private toDateString(value: Date | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

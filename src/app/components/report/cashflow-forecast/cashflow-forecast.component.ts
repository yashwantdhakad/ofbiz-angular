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
import { FormControl, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaterialModule } from '../../common/material/material.module';
import { SharedFormatPipesModule } from '../../common/material/shared-format-pipes.module';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CashflowForecastResponse, ReportService } from '@ofbiz/services/report/report.service';

@Component({
  selector: 'app-cashflow-forecast',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule, MaterialModule, SharedFormatPipesModule],
  templateUrl: './cashflow-forecast.component.html',
  styleUrls: ['./cashflow-forecast.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashflowForecastComponent implements OnInit {
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly report = signal<CashflowForecastResponse | null>(null);

  readonly filterForm = new FormGroup({
    fromDate: new FormControl<Date | null>(this.addDays(new Date(), 0)),
    thruDate: new FormControl<Date | null>(this.addDays(new Date(), 30)),
  });

  readonly summaryCards = computed(() => {
    const summary = this.report()?.summary;
    return [
      { label: 'REPORTS.EXPECTED_INFLOW', value: summary?.expectedInflow ?? 0, currency: summary?.currencyUomId ?? 'USD' },
      { label: 'REPORTS.EXPECTED_OUTFLOW', value: summary?.expectedOutflow ?? 0, currency: summary?.currencyUomId ?? 'USD' },
      { label: 'REPORTS.NET_CASH_FLOW', value: summary?.netCashFlow ?? 0, currency: summary?.currencyUomId ?? 'USD' },
      { label: 'REPORTS.INFLOW_DOCUMENTS', value: summary?.inflowDocumentCount ?? 0, currency: null },
      { label: 'REPORTS.OUTFLOW_DOCUMENTS', value: summary?.outflowDocumentCount ?? 0, currency: null },
    ];
  });

  readonly displayedColumns = ['bucketDate', 'inflow', 'outflow', 'netCashFlow', 'documentCount'];

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
    this.reportService.getCashflowForecast(
      this.toDateString(this.filterForm.controls.fromDate.value),
      this.toDateString(this.filterForm.controls.thruDate.value)
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
      fromDate: this.addDays(new Date(), 0),
      thruDate: this.addDays(new Date(), 30),
    });
    this.load();
  }

  currencyCode(): string {
    return this.report()?.summary?.currencyUomId || 'USD';
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

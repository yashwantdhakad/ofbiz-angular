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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { finalize, forkJoin } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { CommonService, UomLookupItem } from '@ofbiz/services/common/common.service';
import { ExchangeRate, ExchangeRateService } from '@ofbiz/services/accounting/exchange-rate.service';
import { ExchangeRateDialogComponent, ExchangeRateDialogData, ExchangeRateDialogResult } from '../exchange-rate-dialog/exchange-rate-dialog.component';

@Component({
  standalone: false,
  selector: 'app-exchange-rates',
  templateUrl: './exchange-rates.component.html',
  styleUrls: ['./exchange-rates.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExchangeRatesComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly rates = signal<ExchangeRate[]>([]);
  readonly currencies = signal<UomLookupItem[]>([]);
  readonly showHistory = signal(false);
  readonly visibleRates = computed<ExchangeRate[]>(() =>
    this.showHistory() ? this.rates() : this.rates().filter((rate) => rate.active));
  readonly displayedColumns = ['uomId', 'uomIdTo', 'conversionFactor', 'fromDate', 'thruDate', 'status'];
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private exchangeRateService: ExchangeRateService,
    private commonService: CommonService,
    private dialog: MatDialog,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      rates: this.exchangeRateService.listExchangeRates(),
      currencies: this.commonService.getUoms('CURRENCY_MEASURE'),
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: ({ rates, currencies }) => {
        this.rates.set(Array.isArray(rates) ? rates : []);
        this.currencies.set(Array.isArray(currencies) ? currencies : []);
      },
      error: () => {
        this.rates.set([]);
        this.error.set(this.translate.instant('FINANCE.EXCHANGE_RATES_LOAD_ERROR'));
        this.snackbarService.showError(this.translate.instant('FINANCE.EXCHANGE_RATES_LOAD_ERROR'));
      },
    });
  }

  toggleHistory(): void {
    this.showHistory.update((value) => !value);
  }

  openCreateDialog(): void {
    const data: ExchangeRateDialogData = { currencies: this.currencies() };
    const dialogRef = this.dialog.open(ExchangeRateDialogComponent, {
      width: '480px',
      data,
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result?: ExchangeRateDialogResult) => {
      if (!result) {
        return;
      }
      this.exchangeRateService.createExchangeRate(result).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('FINANCE.EXCHANGE_RATE_CREATED'));
          this.loadData();
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('FINANCE.EXCHANGE_RATE_CREATE_ERROR'));
        },
      });
    });
  }

  formatCurrency(rate: ExchangeRate, direction: 'from' | 'to'): string {
    const code = direction === 'from' ? rate.uomId : rate.uomIdTo;
    const description = direction === 'from' ? rate.uomDescription : rate.uomToDescription;
    return description && description !== code ? `${code} — ${description}` : code || '—';
  }

  trackByRate = (index: number, rate: ExchangeRate): string =>
    `${rate.uomId}|${rate.uomIdTo}|${rate.fromDate ?? index}`;
}

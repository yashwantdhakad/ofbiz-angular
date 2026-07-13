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
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout, finalize } from 'rxjs/operators';
import { DataExchangeService } from '@ofbiz/services/data-exchange/data-exchange.service';
import { TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

interface ExchangeJob {
  id: number;
  jobType: string;
  entityType: string;
  status: string;
  sourceFileName?: string;
  totalRows?: number;
  successRows?: number;
  failedRows?: number;
  errorMessage?: string;
  createdAt?: string;
  completedAt?: string;
  hasResultFile?: boolean;
  hasErrorFile?: boolean;
  resultFileName?: string;
  errorFileName?: string;
}

@Component({
  selector: 'app-data-exchange',
  standalone: false,
  templateUrl: './data-exchange.component.html',
  styleUrls: ['./data-exchange.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataExchangeComponent implements OnInit, OnDestroy {
  exportEntityTypes = ['PRODUCT', 'CATEGORY', 'CUSTOMER', 'SUPPLIER', 'FACILITY', 'FACILITY_LOCATION'];
  importEntityTypes = ['PRODUCT', 'CATEGORY', 'CUSTOMER', 'SUPPLIER', 'FACILITY', 'FACILITY_LOCATION'];

  exportEntityType = 'PRODUCT';
  importEntityType = 'PRODUCT';
  importFile = signal<File | null>(null);

  jobs = signal<ExchangeJob[]>([]);
  loadingJobs = signal(false);
  runningExport = signal(false);
  runningImport = signal(false);
  validatingImport = signal(false);
  validationJob = signal<ExchangeJob | null>(null);
  selectedFileName = computed(() => this.importFile()?.name || '');
  canImport = computed(() => {
    const validation = this.validationJob();
    return !!this.importFile()
      && !!validation
      && (validation.status || '').toUpperCase() === 'COMPLETED'
      && !(validation.failedRows || 0)
      && !this.hasActiveImportForEntity(this.importEntityType);
  });
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  displayedColumns = [
    'id',
    'jobType',
    'entityType',
    'status',
    'rows',
    'errorMessage',
    'createdAt',
    'actions',
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private dataExchangeService: DataExchangeService,
    private translate: TranslateService,
    private snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    this.loadJobs();
    this.refreshTimer = setInterval(() => this.loadJobs(), 10000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  loadJobs(): void {
    this.loadingJobs.set(true);
    this.dataExchangeService
      .listJobs(0, 100)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.loadingJobs.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response: any) => {
          this.jobs.set(Array.isArray(response?.items) ? response.items : []);
        },
        error: (err) => {
          console.error('Failed to load data exchange jobs', err);
          this.jobs.set([]);
          this.snackbarService.showError(this.translate.instant('DATA_EXCHANGE.LOAD_ERROR'));
        },
      });
  }

  runExport(): void {
    this.runningExport.set(true);
    this.dataExchangeService
      .exportCsv(this.exportEntityType)
      .pipe(
        timeout(20000),
        finalize(() => {
          this.runningExport.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.loadJobs();
          this.snackbarService.showSuccess(this.translate.instant('DATA_EXCHANGE.EXPORT_STARTED'));
        },
        error: (err) => {
          console.error('Export failed', err);
          this.snackbarService.showError(this.translate.instant('DATA_EXCHANGE.EXPORT_ERROR'));
        },
      });
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.importFile.set(input.files && input.files.length > 0 ? input.files[0] : null);
    this.validationJob.set(null);
  }

  onImportEntityChanged(entityType: string): void {
    this.importEntityType = entityType;
    this.validationJob.set(null);
  }

  validateImport(): void {
    const file = this.importFile();
    if (!file) {
      return;
    }
    this.validatingImport.set(true);
    this.dataExchangeService
      .validateCsv(this.importEntityType, file)
      .pipe(
        timeout(30000),
        finalize(() => {
          this.validatingImport.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response: any) => {
          const job = (response?.data?.job ?? response?.job ?? null) as ExchangeJob | null;
          this.validationJob.set(job);
          this.loadJobs();
          const failedRows = job?.failedRows || 0;
          this.snackbarService.showSuccess(
            this.translate.instant(failedRows ? 'DATA_EXCHANGE.VALIDATION_FAILED' : 'DATA_EXCHANGE.VALIDATION_PASSED')
          );
        },
        error: (err) => {
          console.error('Validation failed', err);
          this.validationJob.set(null);
          this.snackbarService.showError(this.translate.instant('DATA_EXCHANGE.VALIDATION_ERROR'));
        },
      });
  }

  runImport(): void {
    const file = this.importFile();
    if (!file || !this.canImport()) {
      return;
    }

    this.runningImport.set(true);
    this.dataExchangeService
      .importCsv(this.importEntityType, file)
      .pipe(
        timeout(20000),
        finalize(() => {
          this.runningImport.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.importFile.set(null);
          this.validationJob.set(null);
          this.loadJobs();
          this.snackbarService.showSuccess(this.translate.instant('DATA_EXCHANGE.IMPORT_STARTED'));
        },
        error: (err) => {
          console.error('Import failed', err);
          this.snackbarService.showError(this.translate.instant('DATA_EXCHANGE.IMPORT_ERROR'));
        },
      });
  }

  clearImportFile(fileInput?: HTMLInputElement | null): void {
    this.importFile.set(null);
    this.validationJob.set(null);
    if (fileInput) {
      fileInput.value = '';
    }
  }

  downloadValidationErrors(): void {
    const job = this.validationJob();
    if (job?.hasErrorFile) {
      this.downloadErrors(job);
    }
  }

  downloadTemplate(): void {
    this.dataExchangeService.downloadTemplate(this.importEntityType).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => this.saveBlob(blob, `${this.importEntityType.toLowerCase()}_import_template.csv`),
      error: (err) => {
        console.error('Template download failed', err);
        this.snackbarService.showError(this.translate.instant('DATA_EXCHANGE.TEMPLATE_ERROR'));
      },
    });
  }

  downloadResult(job: ExchangeJob): void {
    if (!job?.id) {
      return;
    }
    this.dataExchangeService.downloadResult(job.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => this.saveBlob(blob, job.resultFileName || `export_${job.id}.csv`),
      error: (err) => console.error('Result download failed', err),
    });
  }

  downloadErrors(job: ExchangeJob): void {
    if (!job?.id) {
      return;
    }
    this.dataExchangeService.downloadErrors(job.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => this.saveBlob(blob, job.errorFileName || `errors_${job.id}.csv`),
      error: (err) => console.error('Error download failed', err),
    });
  }

  cancelJob(job: ExchangeJob): void {
    if (!job?.id || !this.isPending(job)) {
      return;
    }
    this.dataExchangeService.cancelJob(job.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loadJobs();
        this.snackbarService.showSuccess(this.translate.instant('DATA_EXCHANGE.CANCEL_SUCCESS'));
      },
      error: (err) => {
        console.error('Cancel job failed', err);
        this.snackbarService.showError(this.translate.instant('DATA_EXCHANGE.CANCEL_ERROR'));
      },
    });
  }

  isPending(job: ExchangeJob | null | undefined): boolean {
    return (job?.status || '').toUpperCase() === 'PENDING';
  }

  isRunning(job: ExchangeJob | null | undefined): boolean {
    const status = (job?.status || '').toUpperCase();
    return status === 'PENDING' || status === 'PROCESSING';
  }

  hasActiveImportForEntity(entityType: string): boolean {
    const normalized = (entityType || '').toUpperCase();
    return this.jobs().some((job) =>
      (job?.jobType || '').toUpperCase() === 'IMPORT'
      && (job?.entityType || '').toUpperCase() === normalized
      && this.isRunning(job)
    );
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  getEntityLabel(entityType: string | undefined | null): string {
    const value = (entityType || '').trim().toUpperCase();
    if (!value) {
      return '-';
    }
    const key = `DATA_EXCHANGE.ENTITY_${value}`;
    const translated = this.translate.instant(key);
    return translated === key ? value : translated;
  }
}

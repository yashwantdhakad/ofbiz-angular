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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { LotService } from '@ofbiz/services/lot/lot.service';
import { Lot, LotInventoryItem, LotAttribute, TraceabilityTree } from '@ofbiz/models/lot.model';
import { TranslateService } from '@ngx-translate/core';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { MatDialog } from '@angular/material/dialog';
import { DateUpdateDialogComponent } from '../../common/date-update-dialog/date-update-dialog.component';
import { LotPropertyDialogComponent } from '../lot-property-dialog/lot-property-dialog.component';
import { SteelCuttingDialogComponent } from '../../manufacturing/job/job-detail/steel-cutting-dialog/steel-cutting-dialog.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-lot-detail',
  templateUrl: './lot-detail.component.html',
  styleUrls: ['./lot-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LotDetailComponent implements OnInit {
  readonly isLoading = signal(false);
  lotId = '';
  lot: Lot | null = null;
  inventoryItems: LotInventoryItem[] = [];
  readonly attributes = signal<LotAttribute[]>([]);
  readonly millCertUrl = signal<string>('');
  readonly traceabilityTree = signal<TraceabilityTree | null>(null);
  inventoryColumns: string[] = [
    'inventoryItemId',
    'productId',
    'facilityId',
    'locationSeqId',
    'statusId',
    'containerId',
    'atpQoh',
    'receivedDate',
    'actions',
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private lotService: LotService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private renderScheduler: RenderSchedulerService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.lotId = params['lotId'];
      if (this.lotId) {
        this.loadDetail(this.lotId);
      }
    });
  }

  private loadDetail(lotId: string): void {
    this.renderScheduler.deferMacrotask(() => {
      this.isLoading.set(true);
      this.cdr.markForCheck();
    });

    forkJoin({
      detail: this.lotService.getLotDetail(lotId),
      attrs: this.lotService.getLotAttributes(lotId).pipe(catchError(() => of([]))),
      tree: this.lotService.getLotTraceabilityTree(lotId).pipe(catchError(() => of(null as any)))
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ detail, attrs, tree }) => {
          this.renderScheduler.deferMacrotask(() => {
            this.lot = detail?.lot ?? null;
            this.inventoryItems = Array.isArray(detail?.inventoryItems) ? detail.inventoryItems : [];
            this.attributes.set(attrs || []);
            const millCertAttr = (attrs || []).find((a) => a.attrName === 'MILL_CERT_URL');
            this.millCertUrl.set(millCertAttr?.attrValue || '');
            this.traceabilityTree.set(tree || null);
            this.isLoading.set(false);
            this.cdr.markForCheck();
          });
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('LOT.FETCH_DETAIL_ERROR'));
          this.renderScheduler.deferMacrotask(() => {
            this.lot = null;
            this.inventoryItems = [];
            this.attributes.set([]);
            this.millCertUrl.set('');
            this.traceabilityTree.set(null);
            this.isLoading.set(false);
            this.cdr.markForCheck();
          });
        },
      });
  }

  openExpirationDateDialog(): void {
    if (!this.lot?.id) {
      return;
    }

    const dialogRef = this.dialog.open(DateUpdateDialogComponent, {
      width: '480px',
      data: {
        title: this.translate.instant('LOT.EXPIRATION_DATE'),
        date: this.lot?.expirationDate || null,
      },
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((date) => {
        if (date === undefined) {
          return;
        }
        const payload = {
          ...this.lot,
          expirationDate: this.toLocalDateTime(date) ?? undefined,
        };
        this.isLoading.set(true);
        this.lotService.updateLot(this.lot!.id!, payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (saved) => {
              this.lot = saved || payload;
              this.isLoading.set(false);
              this.snackbarService.showSuccess(this.translate.instant('COMMON.SAVE_SUCCESS'));
              this.cdr.markForCheck();
            },
            error: () => {
              this.isLoading.set(false);
              this.snackbarService.showError(this.translate.instant('COMMON.ERROR'));
              this.cdr.markForCheck();
            },
          });
      });
  }

  openEditPropertyDialog(fieldName: string, title: string, label: string, currentValue: any, type: string = 'text'): void {
    if (!this.lot?.id) return;
    const dialogRef = this.dialog.open(LotPropertyDialogComponent, {
      width: '540px',
      data: { title, label, value: currentValue, type },
    });
    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newValue) => {
        if (newValue === undefined) return;
        let normalizedValue = newValue;
        if (type === 'number') {
          normalizedValue = newValue ? Number(newValue) : null;
        }
        const payload = {
          ...this.lot,
          [fieldName]: normalizedValue
        };
        this.isLoading.set(true);
        this.cdr.markForCheck();
        this.lotService.updateLot(this.lot!.id!, payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.lot = { ...this.lot, ...payload };
              this.isLoading.set(false);
              this.snackbarService.showSuccess(this.translate.instant('COMMON.SAVE_SUCCESS'));
              this.cdr.markForCheck();
            },
            error: () => {
              this.isLoading.set(false);
              this.snackbarService.showError(this.translate.instant('COMMON.ERROR'));
              this.cdr.markForCheck();
            },
          });
      });
  }

  private toLocalDateTime(value: string | Date | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
  }

  openEditAttributeDialog(attrName: string, title: string, label: string, currentValue: string): void {
    if (!this.lotId) return;
    const dialogRef = this.dialog.open(LotPropertyDialogComponent, {
      width: '540px',
      data: { title, label, value: currentValue, type: 'text' },
    });
    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newValue) => {
        if (newValue === undefined) return;
        this.isLoading.set(true);
        this.cdr.markForCheck();
        this.lotService.setLotAttribute(this.lotId, attrName, newValue)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              if (attrName === 'MILL_CERT_URL') {
                this.millCertUrl.set(newValue);
              }
              this.isLoading.set(false);
              this.snackbarService.showSuccess(this.translate.instant('COMMON.SAVE_SUCCESS'));
              this.cdr.markForCheck();
              this.loadDetail(this.lotId);
            },
            error: () => {
              this.isLoading.set(false);
              this.snackbarService.showError(this.translate.instant('COMMON.ERROR'));
              this.cdr.markForCheck();
            },
          });
      });
  }

  openCutSectionsDialog(inventoryItemId: string): void {
    const dialogRef = this.dialog.open(SteelCuttingDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: { workEffortId: null, sourcePlateInventoryItemId: inventoryItemId },
    });
    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.generatedIds?.length > 0) {
          this.loadDetail(this.lotId);
        }
      });
  }
}

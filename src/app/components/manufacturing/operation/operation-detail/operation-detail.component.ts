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
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { EditOperationDialogComponent } from '../edit-operation-dialog/edit-operation-dialog.component';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import {
  EditOperationDialogResult,
  FacilityReferenceItem,
  OperationDetailData,
  OperationDetailResponse,
  RoutingDetailData,
} from '@ofbiz/models/manufacturing.model';

@Component({
  standalone: false,
  selector: 'app-operation-detail',
  templateUrl: './operation-detail.component.html',
  styleUrls: ['./operation-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationDetailComponent implements OnInit {
  workEffortId = signal('');
  operation = signal<OperationDetailData | null>(null);
  routings = signal<RoutingDetailData[]>([]);
  facilities = signal<FacilityReferenceItem[]>([]);
  isLoading = signal(false);

  operationTypeLabel = computed(() => {
    const type = this.operation()?.workEffortPurposeTypeId;
    if (!type) {
      return '-';
    }
    return String(type)
      .replace(/^ROU_/, '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char: string) => char.toUpperCase());
  });

  facilityLabel = computed(() => {
    const facilityId = this.operation()?.facilityId;
    if (!facilityId) {
      return '-';
    }
    const facility = this.facilities().find((item) => item?.facilityId === facilityId);
    return facility?.facilityName || facilityId;
  });

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private manufacturingService: ManufacturingService,
    private dialog: MatDialog,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private referenceDataStore: ReferenceDataStore
  ) { }

  ngOnInit(): void {
    this.referenceDataStore.ensureFacilitiesLoaded();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('workEffortId') || '';
      this.workEffortId.set(id);
      if (!id) {
        return;
      }
      this.loadDetail();
    });
  }

  formatMillis(value: string | number | undefined): string {
    const numeric = Number(value);
    if (!value || Number.isNaN(numeric) || numeric <= 0) {
      return '-';
    }

    const totalMinutes = Math.floor(numeric / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} hrs ${minutes.toString().padStart(2, '0')} min`;
  }

  openEditDialog(): void {
    const op = this.operation();
    if (!op) {
      return;
    }

    const facilityList = this.referenceDataStore.facilities();
    this.facilities.set(facilityList);
    const dialogRef = this.dialog.open(EditOperationDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: {
        operation: op,
        facilities: facilityList,
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: EditOperationDialogResult | null | undefined) => {
      if (!result || !op?.workEffortId) {
        return;
      }

      const payload: EditOperationDialogResult = {
        ...result,
        workEffortName: result.workEffortName?.trim(),
        description: result.description?.trim() || '',
        fixedAssetId: result.fixedAssetId?.trim() || '',
      };

      this.manufacturingService.updateOperation(op.workEffortId, payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (updated: OperationDetailResponse) => {
          const updatedOperation = updated?.operation;
          this.operation.set(updatedOperation ? { ...updatedOperation } : { ...op, ...payload });
          this.routings.set(Array.isArray(updated?.routings) ? updated.routings : this.routings());
          this.loadFacilityNames(this.collectFacilityIds(this.operation()));
          this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.UPDATE_OPERATION_SUCCESS'));
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('MANUFACTURING.UPDATE_OPERATION_ERROR'));
        },
      });
    });
  }

  private loadDetail(): void {
    this.isLoading.set(true);
    const id = this.workEffortId();

    this.manufacturingService.getOperationDetail(id)
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail: OperationDetailResponse) => {
          const operation = detail?.operation ?? null;
          const routings = Array.isArray(detail?.routings) ? detail.routings : [];
          this.operation.set(operation ? { ...operation } : null);
          this.routings.set(routings);
          this.loadFacilityNames(this.collectFacilityIds(operation));
        },
        error: () => {
          this.operation.set(null);
          this.routings.set([]);
        },
      });
  }

  private collectFacilityIds(operation: OperationDetailData | null): string[] {
    const facilityIds: string[] = [];
    if (operation?.facilityId) {
      facilityIds.push(operation.facilityId);
    }
    return facilityIds;
  }

  private loadFacilityNames(facilityIds: string[]): void {
    const uniqueFacilityIds = Array.from(new Set((facilityIds || []).filter((facilityId) => !!facilityId)));
    if (uniqueFacilityIds.length === 0) {
      this.facilities.set([]);
      return;
    }
    const facilities = this.referenceDataStore
      .facilities()
      .filter((facility) => uniqueFacilityIds.includes(facility?.facilityId || ''));
    this.facilities.set(facilities);
  }
}

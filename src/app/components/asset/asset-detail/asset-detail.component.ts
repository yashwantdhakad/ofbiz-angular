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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { finalize, map } from 'rxjs';
import { AssetService } from '@ofbiz/services/asset/asset.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { MatDialog } from '@angular/material/dialog';
import { VarianceDialogComponent } from '../variance-dialog/variance-dialog.component';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { DateUpdateDialogComponent } from '../../common/date-update-dialog/date-update-dialog.component';
import { AssetLocationDialogComponent } from '../asset-location-dialog/asset-location-dialog.component';
import { AssetUnitCostDialogComponent } from '../asset-unit-cost-dialog/asset-unit-cost-dialog.component';
import { AssetOwnerDialogComponent } from '../asset-owner-dialog/asset-owner-dialog.component';
import { AssetStatusDialogComponent } from '../asset-status-dialog/asset-status-dialog.component';
import { DisassemblyDialogComponent } from '../disassembly-dialog/disassembly-dialog.component';
import { InspectionNoteDialogComponent, InspectionNoteDialogResult } from '../inspection-note-dialog/inspection-note-dialog.component';
import { TranslateService } from '@ngx-translate/core';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { StatusHistoryEntry } from '../../common/status-history/status-history-icon.component';

@Component({
  standalone: false,
  selector: 'app-asset-detail',
  templateUrl: './asset-detail.component.html',
  styleUrls: ['./asset-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetDetailComponent implements OnInit {
  isLoading = signal<boolean>(false);
  isInspectionUpdating = signal<boolean>(false);
  assetId: string | undefined;
  readonly routeAssetId = toSignal(
    this.route.params.pipe(map((params) => params['assetId'] as string | undefined)),
    { initialValue: this.route.snapshot.params['assetId'] }
  );
  facilityLocations = signal<any[]>([]);

  assetDetail = signal<any>(null);
  facilityName = signal<string | null>(null);
  inventoryItemTypeMap = signal<Map<string, string>>(new Map());
  statusMap = computed(() => this.referenceDataStore.statusDescriptionMap());
  varianceReasonMap = signal<Map<string, string>>(new Map());
  details = signal<any[]>([]);
  statusHistory = signal<any[]>([]);
  statusHistoryEntries = computed<StatusHistoryEntry[]>(() =>
    this.statusHistory().map((entry) => ({
      statusId: entry.statusId,
      statusLabel: entry.statusDescription || this.getStatusLabel(entry.statusId),
      changedAt: entry.statusDatetime,
      changedBy: entry.changeByUserLoginId,
    }))
  );
  detailColumns: string[] = [
    'inventoryItemDetailSeqId',
    'workEffortId',
    'orderId',
    'returnId',
    'receiptId',
    'physicalInventoryId',
    'description',
    'quantityOnHandDiff',
    'availableToPromiseDiff',
    'effectiveDate',
  ];

  orderReservations = signal<any[]>([]);
  orderReservationColumns: string[] = [
    'orderId',
    'orderItemSeqId',
    'shipGroupSeqId',
    'quantity',
    'quantityNotAvailable',
    'reservedDatetime',
  ];

  workEffortReservations = signal<any[]>([]);
  workEffortReservationColumns: string[] = [
    'workEffortId',
    'quantity',
    'quantityNotAvailable',
    'reservedDatetime',
  ];

  receipts = signal<any[]>([]);
  receiptColumns: string[] = [
    'receiptId',
    'shipmentId',
    'productId',
    'quantityAccepted',
    'receivedByUserLoginId',
    'datetimeReceived',
  ];

  variances = signal<any[]>([]);
  varianceColumns: string[] = [
    'varianceReasonId',
    'quantityOnHandVar',
    'availableToPromiseVar',
    'comments'
  ];

  isAddingVariance = signal<boolean>(false);

  // Disassembly — component items created after ship-repair disassembly
  childItems = signal<any[]>([]);
  childItemColumns: string[] = [
    'inventoryItemId',
    'productId',
    'productName',
    'serialNumber',
    'statusId',
    'unitCost',
    'ownerPartyId',
  ];
  readonly canDisassemble = computed(() => {
    const status = (this.assetDetail()?.statusId || '') as string;
    return status === 'INV_NS_DEFECTIVE' || status === 'INV_IN_REPAIR';
  });

  readonly canSendToInspection = computed(() =>
    (this.assetDetail()?.statusId || '') === 'INV_AVAILABLE' && !this.isInspectionUpdating()
  );

  readonly canStartRepair = computed(() =>
    (this.assetDetail()?.statusId || '') === 'INV_NS_DEFECTIVE' && !this.isInspectionUpdating()
  );
  readonly canMarkInstalled = computed(() =>
    (this.assetDetail()?.statusId || '') === 'INV_READY_INSTALL' && !this.isInspectionUpdating()
  );

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private assetService: AssetService,
    private commonService: CommonService,
    private route: ActivatedRoute,
    private snackbarService: SnackbarService,
    private dialog: MatDialog,
    private renderScheduler: RenderSchedulerService,
    private translate: TranslateService,
    private referenceDataStore: ReferenceDataStore
  ) { }

  ngOnInit(): void {
    this.referenceDataStore.ensureAllStatusesLoaded();
    this.loadLookups();
    const assetId = this.routeAssetId();
    this.assetId = assetId;
    if (assetId) {
      this.getAsset(assetId);
      this.loadChildItems(assetId);
    }
  }

  getAsset(assetId: string): void {
    this.renderScheduler.deferMacrotask(() => {
      this.isLoading.set(true);
    });

    this.assetService
      .getAsset(assetId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.renderScheduler.deferMacrotask(() => {
            this.isLoading.set(false);
          });
        })
      )
      .subscribe({
        next: (response) => {
          const asset = response?.asset || response;
          const details = response?.details || [];
          const receipts = response?.receipts || [];
          this.renderScheduler.deferMacrotask(() => {
            this.assetDetail.set(asset);
            this.details.set(details);
            this.statusHistory.set(Array.isArray(response?.statusHistory) ? response.statusHistory : []);
            this.receipts.set(receipts);
            this.variances.set(response?.variances || []);
            this.facilityLocations.set(Array.isArray(response?.facilityLocations) ? response.facilityLocations : []);
            this.orderReservations.set(Array.isArray(response?.orderReservations) ? response.orderReservations : []);
            this.workEffortReservations.set(Array.isArray(response?.workEffortReservations) ? response.workEffortReservations : []);
            this.facilityName.set(response?.facilityName || asset?.facilityId || null);
          });
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('ASSET.DETAIL_LOAD_ERROR'));
        },
      });
  }

  private loadLookups(): void {
    this.assetService.getInventoryItemTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          const list = Array.isArray(types) ? types : [];
          this.inventoryItemTypeMap.set(new Map(
            list.map((type: any) => [
              type.inventoryItemTypeId,
              type.description || type.inventoryItemTypeId,
            ])
          ));
        },
        error: () => {
          this.inventoryItemTypeMap.set(new Map());
        },
      });

    this.commonService.getLookupResults({}, 'variance_reason')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reasons) => {
          const list = this.normalizeVarianceReasons(reasons);
          this.varianceReasonMap.set(new Map(
            list.map((reason: any) => [
              reason.varianceReasonId,
              reason.description || reason.varianceReasonId
            ])
          ));
        },
        error: () => {
          this.varianceReasonMap.set(new Map());
        }
      });
  }

  getInventoryItemTypeLabel(typeId?: string): string {
    if (!typeId) return '';
    return this.inventoryItemTypeMap().get(typeId) || typeId;
  }

  getStatusLabel(statusId?: string): string {
    if (!statusId) return '';
    return this.statusMap().get(statusId) || statusId;
  }

  canRunInspectionDecision(): boolean {
    return (this.assetDetail()?.statusId || '') === 'INV_PENDING_INSP' && !this.isInspectionUpdating();
  }

  getVarianceReasonLabel(reasonId?: string): string {
    if (!reasonId) return '';
    return this.varianceReasonMap().get(reasonId) || reasonId;
  }

  private normalizeVarianceReasons(response: any): Array<{ varianceReasonId: string; description: string }> {
    const unwrapped = response?.responseMap ?? response;
    const candidates = [unwrapped, unwrapped?.content, unwrapped?.items, unwrapped?.resultList, unwrapped?.data];
    let items = candidates.find((candidate) => Array.isArray(candidate));
    if (!items) {
      items = unwrapped ? [unwrapped] : [];
    }

    return items
      .map((item: any) => {
        const varianceReasonId = String(
          item?.varianceReasonId
          ?? item?.variance_reason_id
          ?? item?.reasonId
          ?? item?.id
          ?? ''
        ).trim();

        return {
          varianceReasonId,
          description: String(
            item?.description
            ?? item?.reasonDescription
            ?? item?.name
            ?? item?.label
            ?? varianceReasonId
          ).trim(),
        };
      })
      .filter((item: { varianceReasonId: string }) => !!item.varianceReasonId);
  }

  getDetailOrderRoute(item: any): any[] {
    const orderId = item?.orderId;
    if (!orderId) {
      return ['/orders'];
    }

    if (this.isInboundOrderDetail(item)) {
      return ['/pos', orderId];
    }

    return ['/orders', orderId];
  }

  private isInboundOrderDetail(item: any): boolean {
    if (!item) {
      return false;
    }

    if (item.receiptId != null && String(item.receiptId).trim() !== '') {
      return true;
    }

    const description = String(item.description || '').toLowerCase();
    if (description.includes('reserve') || description.includes('ship') || description.includes('release')) {
      return false;
    }

    const qohDiff = Number(item.quantityOnHandDiff || 0);
    const atpDiff = Number(item.availableToPromiseDiff || 0);
    return qohDiff > 0 || atpDiff > 0;
  }

  toggleVarianceForm() {
    this.openVarianceDialog();
  }

  openVarianceDialog() {
    if (!this.assetId) return;
    const dialogRef = this.dialog.open(VarianceDialogComponent, {
      width: '600px',
      data: {
        assetId: this.assetId,
        inventoryItemId: this.assetDetail()?.inventoryItemId
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (!result) return;

        if (result?.created && result?.variance) {
          this.refreshInventorySections();
        }
      });
  }

  openLocationDialog(): void {
    if (!this.assetId) return;
    const dialogRef = this.dialog.open(AssetLocationDialogComponent, {
      width: '540px',
      data: {
        locationSeqId: this.assetDetail()?.locationSeqId,
        locations: this.facilityLocations(),
      },
    });
    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((locationSeqId) => {
        if (locationSeqId === undefined) return;
        this.updateAssetPartial({ locationSeqId });
      });
  }

  openUnitCostDialog(): void {
    if (!this.assetId) return;
    const dialogRef = this.dialog.open(AssetUnitCostDialogComponent, {
      width: '480px',
      data: { unitCost: this.assetDetail()?.unitCost || '0' },
    });
    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((unitCost) => {
        if (unitCost === undefined) return;
        this.updateAssetPartial({ unitCost });
      });
  }

  openOwnerDialog(): void {
    if (!this.assetId) return;
    const dialogRef = this.dialog.open(AssetOwnerDialogComponent, {
      width: '540px',
      data: { ownerPartyId: this.assetDetail()?.ownerPartyId || '' },
    });
    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ownerPartyId) => {
        if (ownerPartyId === undefined) return;
        this.updateAssetPartial({ ownerPartyId });
      });
  }

  openStatusDialog(): void {
    if (!this.assetId) return;
    const dialogRef = this.dialog.open(AssetStatusDialogComponent, {
      width: '480px',
      data: { statusId: this.assetDetail()?.statusId || '', statusMap: this.statusMap() },
    });
    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((statusId) => {
        if (statusId === undefined) return;
        this.updateAssetPartial({ statusId });
      });
  }

  openExpireDateDialog(): void {
    if (!this.assetId) return;
    const dialogRef = this.dialog.open(DateUpdateDialogComponent, {
      width: '480px',
      data: {
        title: this.translate.instant('ASSET.EXPIRATION_DATE'),
        date: this.assetDetail()?.expireDate || null,
      },
    });
    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((date) => {
        if (date === undefined) return;
        this.updateAssetPartial({ expireDate: this.toLocalDateTime(date) });
      });
  }

  acceptInspection(): void {
    this.runInspectionDecision('ACCEPT');
  }

  rejectInspection(): void {
    this.runInspectionDecision('REJECT');
  }

  private runInspectionDecision(decision: 'ACCEPT' | 'REJECT'): void {
    if (!this.assetId || !this.canRunInspectionDecision()) return;
    const dialogRef = this.dialog.open(InspectionNoteDialogComponent, {
      width: '440px',
      data: { decision, inventoryItemId: this.assetId },
    });
    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: InspectionNoteDialogResult | null) => {
        if (payload == null || !this.assetId) {
          return;
        }
        this.isInspectionUpdating.set(true);
        const request$ = decision === 'ACCEPT'
          ? this.assetService.acceptInspection(this.assetId, payload)
          : this.assetService.rejectInspection(this.assetId, payload);
        request$
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.isInspectionUpdating.set(false))
          )
          .subscribe({
            next: () => {
              const key = decision === 'ACCEPT' ? 'ASSET.INSPECTION_ACCEPTED' : 'ASSET.INSPECTION_REJECTED';
              this.snackbarService.showSuccess(this.translate.instant(key));
              this.getAsset(this.assetId!);
            },
            error: () => {
              this.snackbarService.showError(this.translate.instant('COMMON.ERROR'));
            },
          });
      });
  }

  sendToInspection(): void {
    if (!this.assetId || !this.canSendToInspection()) return;
    this.isInspectionUpdating.set(true);
    this.assetService.updateAsset(this.assetId, { statusId: 'INV_PENDING_INSP' })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isInspectionUpdating.set(false))
      )
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess('Asset sent to inspection queue');
          this.getAsset(this.assetId!);
        },
        error: () => this.snackbarService.showError(this.translate.instant('COMMON.ERROR')),
      });
  }

  startRepair(): void {
    if (!this.assetId || !this.canStartRepair()) return;
    this.isInspectionUpdating.set(true);
    this.assetService.updateAsset(this.assetId, { statusId: 'INV_IN_REPAIR' })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isInspectionUpdating.set(false))
      )
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess('Asset marked In Repair — disassembly is now available');
          this.getAsset(this.assetId!);
        },
        error: () => this.snackbarService.showError(this.translate.instant('COMMON.ERROR')),
      });
  }

  markInstalled(): void {
    if (!this.assetId || !this.canMarkInstalled()) return;
    this.isInspectionUpdating.set(true);
    this.assetService.updateAsset(this.assetId, { statusId: 'INV_AVAILABLE' })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isInspectionUpdating.set(false))
      )
      .subscribe({
        next: () => {
          this.getAsset(this.assetId!);
          this.snackbarService.showSuccess(this.translate.instant('ASSET.INSTALLED_SUCCESS'));
        },
        error: () => this.snackbarService.showError(this.translate.instant('COMMON.ERROR')),
      });
  }

  private updateAssetPartial(payload: any): void {
    if (!this.assetId) return;

    this.isLoading.set(true);
    this.assetService.updateAsset(this.assetId, payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          this.assetDetail.set(response?.asset || response);
          this.details.set(response?.details || this.details());
          this.statusHistory.set(Array.isArray(response?.statusHistory) ? response.statusHistory : this.statusHistory());
          this.receipts.set(response?.receipts || this.receipts());
          this.variances.set(response?.variances || this.variances());
          this.facilityLocations.set(Array.isArray(response?.facilityLocations) ? response.facilityLocations : this.facilityLocations());
          this.orderReservations.set(Array.isArray(response?.orderReservations) ? response.orderReservations : this.orderReservations());
          this.workEffortReservations.set(Array.isArray(response?.workEffortReservations) ? response.workEffortReservations : this.workEffortReservations());
          this.facilityName.set(response?.facilityName || this.assetDetail()?.facilityId || null);
          this.snackbarService.showSuccess(this.translate.instant('COMMON.SAVE_SUCCESS'));
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('COMMON.ERROR'));
        },
      });
  }

  private refreshInventorySections(): void {
    if (!this.assetId) return;

    this.assetService
      .getAsset(this.assetId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const asset = response?.asset || response;
          this.assetDetail.set(asset);
          this.details.set(Array.isArray(response?.details) ? response.details : []);
          this.statusHistory.set(Array.isArray(response?.statusHistory) ? response.statusHistory : []);
          this.receipts.set(Array.isArray(response?.receipts) ? response.receipts : []);
          this.variances.set(Array.isArray(response?.variances) ? response.variances : []);
          this.facilityLocations.set(Array.isArray(response?.facilityLocations) ? response.facilityLocations : []);
          this.orderReservations.set(Array.isArray(response?.orderReservations) ? response.orderReservations : []);
          this.workEffortReservations.set(Array.isArray(response?.workEffortReservations) ? response.workEffortReservations : []);
          this.facilityName.set(response?.facilityName || asset?.facilityId || null);
        },
        error: () => {
          // Keep optimistic list when background refresh fails.
        },
      });
  }

  private toLocalDateTime(value: string | Date | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
  }

  loadChildItems(assetId: string): void {
    this.assetService.getAssetChildren(assetId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.childItems.set(Array.isArray(items) ? items : []);
        },
        error: () => {
          this.childItems.set([]);
        }
      });
  }

  openDisassemblyDialog(): void {
    const detail = this.assetDetail();
    if (!detail?.inventoryItemId) return;
    const dialogRef = this.dialog.open(DisassemblyDialogComponent, {
      width: '640px',
      maxWidth: '96vw',
      data: {
        inventoryItemId: detail.inventoryItemId,
        productId: detail.productId,
        ownerPartyId: detail.ownerPartyId,
      },
    });
    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.jobId) {
          // The item was issued to the new repair job — reload to reflect
          // the consumed status; the user processes the job from /jobs/{id}.
          this.getAsset(detail.inventoryItemId);
          this.snackbarService.showSuccess(`Repair job ${result.jobId} created and item issued`);
        }
      });
  }
}

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
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { PicklistService } from '@ofbiz/services/picklist/picklist.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { MatDialog } from '@angular/material/dialog';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { PicklistAssignPickerDialogComponent } from './picklist-assign-picker-dialog.component';
import { TranslateService } from '@ngx-translate/core';
import { StatusHistoryEntry } from '../../common/status-history/status-history-icon.component';

interface PicklistBinItem {
  picklistBinItemId?: string;
  orderId?: string;
  orderItemSeqId?: string;
  shipGroupSeqId?: string;
  inventoryProductId?: string;
  inventoryProductName?: string;
  inventoryItemId?: string;
  locationSeqId?: string;
  itemStatusId?: string;
  statusDescription?: string;
  quantity?: number;
}

interface PicklistBin {
  picklistBinId?: string;
  id?: string;
  primaryOrderId?: string;
  pickerId?: string;
  statusId?: string;
  shipmentId?: string;
  items?: PicklistBinItem[];
}

interface PicklistInfo {
  picklistId?: string;
  facilityId?: string;
  facilityName?: string;
  statusId?: string;
  statusDescription?: string;
  pickerId?: string;
  createdDate?: string;
  picklistDate?: string;
}

interface PicklistDetailResponse {
  picklist?: PicklistInfo;
  bins?: PicklistBin[];
  pickerId?: string;
  statusHistory?: Array<{
    statusId?: string;
    statusDate?: string;
    changeByUserLoginId?: string;
    statusIdTo?: string;
  }>;
}

interface PickerRole {
  partyId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  groupName?: string;
  partyName?: string;
}

@Component({
  standalone: false,
  selector: 'app-picklist-detail',
  templateUrl: './picklist-detail.component.html',
  styleUrls: ['./picklist-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PicklistDetailComponent implements OnInit {
  private static readonly STATUS_INPUT = 'PICKLIST_INPUT';
  private static readonly STATUS_ASSIGNED = 'PICKLIST_ASSIGNED';
  private static readonly STATUS_PICKED = 'PICKLIST_PICKED';
  private static readonly STATUS_COMPLETE = 'PICKLIST_COMPLETE';
  private static readonly STATUS_CANCELLED = 'PICKLIST_CANCELLED';
  readonly isLoading = signal(false);
  readonly statusHistoryEntries = signal<StatusHistoryEntry[]>([]);
  picklistId: string | null = null;
  picklistDetail: PicklistDetailResponse | null = null;
  bins: PicklistBin[] = [];
  pickerNameMap = new Map<string, string>();
  expandedBinIds = new Set<string>();

  itemColumns: string[] = [
    'orderId',
    'orderItemSeqId',
    'shipGroupSeqId',
    'inventoryProductId',
    'inventoryProductName',
    'inventoryItemId',
    'locationSeqId',
    'itemStatusId',
    'quantity',
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private picklistService: PicklistService,
    private partyService: PartyService,
    private dialog: MatDialog,
    private snackbarService: SnackbarService,
    private renderScheduler: RenderSchedulerService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.picklistId = params['picklistId'];
      if (this.picklistId) {
        this.loadPicklist(this.picklistId);
      }
    });
  }

  loadPicklist(picklistId: string, showLoader: boolean = true): void {
    if (showLoader) {
      this.renderScheduler.deferMacrotask(() => {
        this.isLoading.set(true);
        this.cdr.markForCheck();
      });
    }
    this.picklistService
      .getPicklist(picklistId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (showLoader) {
            this.renderScheduler.deferMacrotask(() => {
              this.isLoading.set(false);
              this.cdr.markForCheck();
            });
          }
        })
      )
      .subscribe({
        next: (response) => {
          this.picklistDetail = response || {};
          this.bins = Array.isArray(this.picklistDetail?.bins)
            ? this.picklistDetail.bins
            : [];
          this.statusHistoryEntries.set(
            Array.isArray(this.picklistDetail?.statusHistory)
              ? this.picklistDetail!.statusHistory!.map((entry) => ({
                  statusId: entry?.statusId,
                  statusLabel: this.getPicklistStatusLabel(entry?.statusId),
                  changedAt: entry?.statusDate,
                  changedBy: entry?.changeByUserLoginId,
                }))
              : []
          );
          this.loadPickerNames(this.collectPickerPartyIds(this.picklistDetail));
          this.expandedBinIds = new Set(
            this.bins
              .map((bin) => bin?.picklistBinId)
              .filter((binId): binId is string => !!binId)
          );
          this.cdr.markForCheck();
        },
        error: () => {
          this.picklistDetail = null;
          this.bins = [];
          this.statusHistoryEntries.set([]);
          this.expandedBinIds.clear();
          this.cdr.markForCheck();
        },
      });
  }

  openAssignPickerDialog(): void {
    if (!this.picklistId || !this.canAssignPicker()) {
      return;
    }
    const dialogRef = this.dialog.open(PicklistAssignPickerDialogComponent, {
      width: '480px',
      autoFocus: true,
      restoreFocus: true,
      data: { picklistId: this.picklistId },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (!result?.partyId || !this.picklistId) {
        return;
      }
      this.picklistService.assignPicker(this.picklistId, result.partyId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('PICKLIST.PICKER_ASSIGNED'));
          this.loadPicklist(this.picklistId as string, false);
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('PICKLIST.PICKER_ASSIGN_ERROR'));
        },
      });
    });
  }

  canAssignPicker(): boolean {
    const statusId = this.getWorkflowStatusId();
    return statusId === PicklistDetailComponent.STATUS_INPUT
      || statusId === PicklistDetailComponent.STATUS_ASSIGNED;
  }

  canPrintPicklist(): boolean {
    const statusId = this.getWorkflowStatusId();
    return this.isAssignedWorkflow()
      || statusId === PicklistDetailComponent.STATUS_PICKED
      || statusId === PicklistDetailComponent.STATUS_COMPLETE;
  }

  canMarkPicked(): boolean {
    return this.isAssignedWorkflow();
  }

  markPicked(): void {
    if (!this.picklistId || !this.canMarkPicked()) {
      return;
    }
    this.picklistService.markPicked(this.picklistId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loadPicklist(this.picklistId as string, false);
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('PICKLIST.MARK_PICKED_ERROR'));
      },
    });
  }

  canCreateShipment(): boolean {
    const statusId = this.getWorkflowStatusId();
    return statusId === PicklistDetailComponent.STATUS_PICKED
      || statusId === PicklistDetailComponent.STATUS_ASSIGNED;
  }

  createShipment(): void {
    if (!this.picklistId || !this.canCreateShipment()) {
      return;
    }
    this.isLoading.set(true);
    this.picklistService.createShipmentFromPicklist(this.picklistId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: any) => {
          this.isLoading.set(false);
          const shipmentId = result?.shipmentId;
          if (shipmentId) {
            this.snackbarService.showSuccess(this.translate.instant('PICKLIST.SHIPMENT_CREATED'));
            this.router.navigate(['/shipments/sales', shipmentId]);
          } else {
            this.loadPicklist(this.picklistId as string, false);
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.snackbarService.showError(this.translate.instant('PICKLIST.SHIPMENT_CREATE_ERROR'));
        },
      });
  }

  getFacilityLabel(facilityId?: string): string {
    const backendName = this.picklistDetail?.picklist?.facilityName;
    if (backendName) {
      return backendName;
    }
    return facilityId || '';
  }

  getPicklistStatusLabel(statusId?: string, statusDescription?: string): string {
    if (statusDescription) {
      return statusDescription;
    }
    return statusId || '';
  }

  getItemStatusLabel(statusId?: string, statusDescription?: string): string {
    return this.getPicklistStatusLabel(statusId, statusDescription);
  }

  getPickerName(partyId?: string): string {
    if (!partyId) {
      return '';
    }
    return this.pickerNameMap.get(partyId) || partyId;
  }

  isBinExpanded(binId?: string): boolean {
    return !!binId && this.expandedBinIds.has(binId);
  }

  onBinOpened(binId?: string): void {
    if (binId) {
      this.expandedBinIds.add(binId);
    }
  }

  onBinClosed(binId?: string): void {
    if (binId) {
      this.expandedBinIds.delete(binId);
    }
  }

  printPdf(): void {
    if (!this.picklistId || !this.canPrintPicklist()) {
      return;
    }
    this.picklistService.getPicklistPdf(this.picklistId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (html: string) => {
        if (!html) {
          this.snackbarService.showError(this.translate.instant('PICKLIST.PDF_GENERATE_ERROR'));
          return;
        }
        const win = window.open('', '_blank');
        if (!win) {
          this.snackbarService.showError(this.translate.instant('PICKLIST.PDF_POPUP_BLOCKED'));
          return;
        }
        win.location.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('PICKLIST.PDF_GENERATE_ERROR'));
      },
    });
  }

  private loadPickerNames(partyIds: string[]): void {
    const uniquePartyIds = Array.from(new Set((partyIds || []).filter((partyId) => !!partyId)));
    if (uniquePartyIds.length === 0) {
      this.renderScheduler.deferMacrotask(() => {
        this.pickerNameMap = new Map();
        this.cdr.markForCheck();
      });
      return;
    }
    this.partyService
      .getPartyRoleSummaries('PICKER', uniquePartyIds)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          const list: PickerRole[] = Array.isArray(roles) ? (roles as PickerRole[]) : [];
          this.renderScheduler.deferMacrotask(() => {
            this.pickerNameMap = new Map(
              list
                .filter((role: PickerRole) => !!role?.partyId)
                .map((role: PickerRole) => [role.partyId, this.getPickerDisplayName(role)])
            );
            this.cdr.markForCheck();
          });
        },
        error: () => {
          this.renderScheduler.deferMacrotask(() => {
            this.pickerNameMap = new Map();
            this.cdr.markForCheck();
          });
        },
      });
  }

  trackByBin = (_: number, bin: PicklistBin): string | number =>
    bin?.picklistBinId ?? bin?.id ?? _;

  trackByPicklistItem = (_: number, item: PicklistBinItem): string =>
    [
      item?.orderId || '',
      item?.orderItemSeqId || '',
      item?.shipGroupSeqId || '',
      item?.inventoryItemId || '',
    ].join('|');

  private collectPickerPartyIds(picklistDetail: PicklistDetailResponse | null): string[] {
    const partyIds: string[] = [];
    if (picklistDetail?.pickerId) {
      partyIds.push(picklistDetail.pickerId);
    }
    if (picklistDetail?.picklist?.pickerId) {
      partyIds.push(picklistDetail.picklist.pickerId);
    }
    return partyIds;
  }

  private getPickerDisplayName(role: PickerRole): string {
    const fullName = [role?.firstName, role?.lastName].filter(Boolean).join(' ').trim();
    return fullName || role?.name || role?.groupName || role?.partyName || role?.partyId;
  }

  private getWorkflowStatusId(): string | undefined {
    return this.picklistDetail?.picklist?.statusId;
  }

  private hasAssignedPicker(): boolean {
    return !!(this.picklistDetail?.pickerId || this.picklistDetail?.picklist?.pickerId);
  }

  private isAssignedWorkflow(): boolean {
    const statusId = this.getWorkflowStatusId();
    return statusId === PicklistDetailComponent.STATUS_ASSIGNED
      || (statusId === PicklistDetailComponent.STATUS_INPUT && this.hasAssignedPicker());
  }

}

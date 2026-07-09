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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { TimesheetEntry, TimesheetService } from '@ofbiz/services/timesheet/timesheet.service';
import { ConsumableItemComponent } from '../../consumable-item/consumable-item.component';
import { ConfirmationDialogComponent } from '../../../common/confirmation-dialog/confirmation-dialog.component';
import { ProduceItemComponent } from '../../produce-item/produce-item.component';
import { SetConsumableInventoryDialogComponent } from '../set-consumable-inventory-dialog/set-consumable-inventory-dialog.component';
import { AddJobContentDialogComponent } from '../add-job-content-dialog/add-job-content-dialog.component';
import { JobAssignWorkerDialogComponent } from './job-assign-worker-dialog.component';
import { JobNoteDialogComponent } from './job-note-dialog.component';
import { CompleteTaskDialogComponent } from './complete-task-dialog.component';
import { SteelCuttingDialogComponent, SteelCuttingDialogData } from './steel-cutting-dialog/steel-cutting-dialog.component';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { StatusHistoryEntry } from '../../../common/status-history/status-history-icon.component';
import {
  AddJobContentDialogResult,
  AddJobCostPayload,
  AssignWorkerDialogResult,
  JobContentRecord,
  JobCostSummary,
  JobDetailResponse,
  JobDetailState,
  JobExecutionChecklistItem,
  JobExecutionChecklistPayload,
  JobIssuedMaterial,
  JobNoteRecord,
  JobProducedItem,
  JobProductLine,
  JobReferenceLine,
  JobStatusHistoryEntry,
  JobTaskLine,
} from '@ofbiz/models/manufacturing.model';
import { InventoryItemWithLot } from '@ofbiz/models/lot.model';

@Component({
  standalone: false,
  selector: 'app-job-detail',
  templateUrl: './job-detail.component.html',
  styleUrls: ['./job-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobDetailComponent {
  private readonly route = inject(ActivatedRoute);
  readonly isLoading = signal(false);
  readonly isBulkReserveLoading = signal(false);
  readonly isBulkIssueLoading = signal(false);
  workEffortId: string | undefined;

  readonly jobDetail = signal<JobDetailState>({});
  readonly productsToProduce = signal<JobProductLine[]>([]);
  readonly productsToConsume = signal<JobProductLine[]>([]);
  readonly tasks = signal<JobTaskLine[]>([]);
  readonly references = signal<JobReferenceLine[]>([]);
  readonly producedItems = signal<JobProducedItem[]>([]);
  readonly issuedMaterials = signal<JobIssuedMaterial[]>([]);
  readonly contents = signal<JobContentRecord[]>([]);
  readonly notes = signal<JobNoteRecord[]>([]);
  readonly executionChecklist = signal<JobExecutionChecklistItem[]>([]);
  readonly labourBookings = signal<TimesheetEntry[]>([]);
  readonly statusHistoryEntries = signal<StatusHistoryEntry[]>([]);
  readonly steelCuttingSourcePlate = signal<InventoryItemWithLot | null>(null);
  readonly jobCosts = signal<JobCostSummary | null>(null);
  readonly isCostsLoading = signal(false);
  readonly isSteelCuttingJob = computed(() => {
    const name = (this.jobDetail()?.['workEffortName'] as string || '').toLowerCase();
    const purpose = (this.jobDetail()?.['workEffortPurposeTypeId'] as string || '').toLowerCase();
    return name.includes('cut') || name.includes('plasma') || name.includes('laser')
      || purpose === 'steel_cutting';
  });
  selectedIssuedMaterialIds: Set<string> = new Set<string>();
  returnQtyByIssuanceId: Record<string, string> = {};
  returnReasonByIssuanceId: Record<string, string> = {};
  private readonly routeWorkEffortId = toSignal(this.route.params, {
    initialValue: this.route.snapshot?.params ?? {},
  });
  readonly currentStatusId = computed(() => (this.jobDetail()?.currentStatusId || '').toUpperCase());
  readonly canApprove = computed(() => ['PRUN_CREATED', 'PRUN_SCHEDULED'].includes(this.currentStatusId()));
  readonly canStart = computed(() => this.currentStatusId() === 'PRUN_DOC_PRINTED');
  readonly canComplete = computed(() => this.currentStatusId() === 'PRUN_RUNNING');
  readonly canClose = computed(() => this.currentStatusId() === 'PRUN_COMPLETED');
  readonly canEditComponents = computed(() =>
    ['PRUN_CREATED', 'PRUN_SCHEDULED'].includes(this.currentStatusId())
  );
  readonly isApproved = computed(() => ['PRUN_DOC_PRINTED', 'PRUN_RUNNING'].includes(this.currentStatusId()));
  readonly isRunning = computed(() => this.currentStatusId() === 'PRUN_RUNNING');
  readonly isCompleted = computed(() => this.currentStatusId() === 'PRUN_COMPLETED');
  readonly isClosed = computed(() => this.currentStatusId() === 'PRUN_CLOSED');

  productsToProduceColumns: string[] = [
    'productId',
    'productName',
    'atp',
    'qoh',
    'estimatedQuantity',
    'uom',
    'produced',
    'actions',
  ];

  productsToConsumeColumns: string[] = [
    'productId',
    'productName',
    'atp',
    'qoh',
    'estimatedQuantity',
    'uom',
    'reservedQuantity',
    'issuedQuantity',
    'remainingQuantity',
    'status',
    'actions',
  ];

  producedItemsColumns: string[] = [
    'inventoryItemId',
    'lotId',
    'location',
    'itemCondition',
    'receivedOn',
    'expireDate',
    'atpQoh',
    'qty',
    'unitCost',
    'total',
  ];

  taskColumns: string[] = [
    'taskId',
    'taskName',
    'operationId',
    'status',
    'facilityId',
    'estimatedStartDate',
    'estimatedDuration',
    'actualHours',
    'taskActions',
  ];
  referenceColumns: string[] = ['type', 'id', 'producedItem', 'status', 'price'];
  noteColumns: string[] = ['noteId', 'noteText', 'action'];
  checklistColumns: string[] = ['category', 'status', 'quantity', 'note', 'recordedAt', 'user'];
  labourBookingColumns: string[] = ['date', 'worker', 'workType', 'hours', 'comments'];
  checklistCategories = ['QA', 'REWORK', 'SCRAP', 'CHECKLIST'];
  checklistStatuses = [
    'CHECK_PENDING',
    'QA_PASSED',
    'QA_FAILED',
    'REWORK_REQUIRED',
    'REWORK_DONE',
    'SCRAP_REPORTED',
  ];

  private readonly issuedMaterialReturnColumns: string[] = [
    'select',
    'component',
    'inventoryItemId',
    'location',
    'issued',
    'returned',
    'issuedOn',
    'returnedOn',
    'qtyToReturn',
    'reason',
  ];
  private readonly issuedMaterialReadOnlyColumns: string[] = this.issuedMaterialReturnColumns.filter(
    (column) => !['select', 'qtyToReturn', 'reason'].includes(column)
  );
  readonly canReturnIssuedMaterials = computed(() =>
    ['PRUN_RUNNING', 'PRUN_COMPLETED'].includes(this.currentStatusId())
  );
  readonly issuedMaterialColumns = computed(() =>
    this.canReturnIssuedMaterials() ? this.issuedMaterialReturnColumns : this.issuedMaterialReadOnlyColumns
  );

  constructor(
    private readonly manufacturingService: ManufacturingService,
    private readonly partyService: PartyService,
    private readonly dialog: MatDialog,
    private readonly timesheetService: TimesheetService,
    private renderScheduler: RenderSchedulerService,
    private readonly cdr: ChangeDetectorRef,
    private readonly snackbarService: SnackbarService,
    private readonly translate: TranslateService,
    private readonly fb: FormBuilder
  ) {
    effect(() => {
      const params = this.routeWorkEffortId();
      const nextWorkEffortId = params['workEffortId'];
      this.workEffortId = nextWorkEffortId;
      if (!nextWorkEffortId) {
        return;
      }
      this.renderScheduler.deferMacrotask(() => {
        this.fetchJobDetail(nextWorkEffortId);
      });
    });
  }

  readonly executionChecklistForm = this.fb.group({
    category: ['QA', Validators.required],
    statusId: ['CHECK_PENDING', Validators.required],
    quantity: [''],
    note: [''],
  });
  getCurrentDateTime(): string {
    return new Date().toLocaleString();
  }

  private mapStatusHistory(history?: JobStatusHistoryEntry[] | null): StatusHistoryEntry[] {
    return Array.isArray(history)
      ? history.map((entry) => ({
          statusId: entry?.statusId,
          statusLabel: this.statusLabel(entry?.statusId),
          changedAt: typeof entry?.statusDatetime === 'string' ? entry.statusDatetime : null,
          changedBy: typeof entry?.setByUserLogin === 'string' ? entry.setByUserLogin : null,
          reason: typeof entry?.reason === 'string' ? entry.reason : null,
        }))
      : [];
  }

  fetchJobDetail(workEffortId: string, showLoader: boolean = true): void {
    if (showLoader) {
        this.renderScheduler.deferMacrotask(() => {
          this.isLoading.set(true);
          this.cdr.markForCheck();
        });
      }

    this.manufacturingService.getJob(workEffortId)
      .pipe(
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
        next: (response: JobDetailResponse) => {
          const job = this.extractJobDetail(response);
          this.renderScheduler.deferMacrotask(() => {
            this.jobDetail.set(job);
            this.productsToConsume.set(Array.isArray(response?.consumeList) ? response.consumeList : []);
            this.productsToProduce.set(Array.isArray(response?.produceList) ? response.produceList : []);
            this.tasks.set(Array.isArray(response?.tasks) ? response.tasks : []);
            this.references.set(Array.isArray(response?.references) ? response.references : []);
            this.producedItems.set(Array.isArray(response?.producedItems) ? response.producedItems : []);
            this.issuedMaterials.set(Array.isArray(response?.issuedMaterials) ? response.issuedMaterials : []);
            this.contents.set(Array.isArray(response?.contents) ? response.contents : []);
            this.notes.set(Array.isArray(response?.notes) ? response.notes : []);
            this.executionChecklist.set(Array.isArray(response?.executionChecklist) ? response.executionChecklist : []);
            this.statusHistoryEntries.set(this.mapStatusHistory(response?.statusHistory));
            this.loadLabourBookings(workEffortId);
            this.loadJobCosts(workEffortId);
            this.loadExecutionChecklist(workEffortId);
            this.selectedIssuedMaterialIds.clear();
            this.returnQtyByIssuanceId = {};
            this.returnReasonByIssuanceId = {};
            this.cdr.markForCheck();
          });
        },
        error: () => {
          this.renderScheduler.deferMacrotask(() => {
            this.jobDetail.set({});
            this.productsToConsume.set([]);
            this.productsToProduce.set([]);
            this.tasks.set([]);
            this.references.set([]);
            this.producedItems.set([]);
            this.issuedMaterials.set([]);
            this.contents.set([]);
            this.notes.set([]);
            this.executionChecklist.set([]);
            this.labourBookings.set([]);
            this.statusHistoryEntries.set([]);
            this.selectedIssuedMaterialIds.clear();
            this.returnQtyByIssuanceId = {};
            this.returnReasonByIssuanceId = {};
            this.cdr.markForCheck();
          });
        },
      });
  }

  private refreshJobDetailSilently(): void {
    if (this.workEffortId) {
      this.fetchJobDetail(this.workEffortId, false);
    }
  }

  private loadExecutionChecklist(workEffortId: string): void {
    if (!workEffortId) return;
    this.manufacturingService.listJobExecutionChecklist(workEffortId).subscribe({
      next: (items) => {
        this.executionChecklist.set(Array.isArray(items) ? items : []);
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      },
    });
  }

  private loadLabourBookings(workEffortId: string): void {
    if (!workEffortId) {
      this.labourBookings.set([]);
      return;
    }
    this.timesheetService.listEntriesByWorkEffort(workEffortId).subscribe({
      next: (entries) => {
        this.labourBookings.set(Array.isArray(entries) ? entries : []);
        this.cdr.markForCheck();
      },
      error: () => {
        this.labourBookings.set([]);
        this.cdr.markForCheck();
      },
    });
  }

  loadJobCosts(workEffortId: string): void {
    if (!workEffortId) {
      this.jobCosts.set(null);
      return;
    }
    this.isCostsLoading.set(true);
    this.manufacturingService.getJobCosts(workEffortId).subscribe({
      next: (costs) => {
        this.jobCosts.set(costs ?? null);
        this.isCostsLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.jobCosts.set(null);
        this.isCostsLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  openAddCostDialog(): void {
    if (!this.workEffortId) return;
    import('./add-job-cost-dialog/add-job-cost-dialog.component').then(({ AddJobCostDialogComponent }) => {
      this.dialog.open(AddJobCostDialogComponent, { width: '480px' })
        .afterClosed()
        .subscribe((payload: AddJobCostPayload | undefined) => {
          if (!payload || !this.workEffortId) return;
          this.manufacturingService.addJobCost(this.workEffortId, payload).subscribe({
            next: () => {
              this.snackbarService.showSuccess('Cost added');
              this.loadJobCosts(this.workEffortId!);
            },
            error: () => this.snackbarService.showError(this.translate.instant('COMMON.ERROR')),
          });
        });
    });
  }

  removeJobCost(costId: number): void {
    if (!this.workEffortId) return;
    this.manufacturingService.deleteJobCost(this.workEffortId, costId).subscribe({
      next: () => {
        this.snackbarService.showSuccess('Cost removed');
        this.loadJobCosts(this.workEffortId!);
      },
      error: () => this.snackbarService.showError(this.translate.instant('COMMON.ERROR')),
    });
  }

  addConsumable(): void {
    if (!this.workEffortId || !this.canEditComponents()) {
      return;
    }
    this.dialog.open(ConsumableItemComponent, {
      data: { consumableData: { workEffortId: this.workEffortId } },
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.refreshJobDetailSilently();
      }
    });
  }

  editConsumable(item: JobProductLine): void {
    if (!this.workEffortId || !this.canEditComponents() || typeof item?.id !== 'number') {
      return;
    }
    this.dialog.open(ConsumableItemComponent, {
      data: {
        consumableData: {
          workEffortId: this.workEffortId,
          id: item.id,
          productId: item.productId,
          estimatedQuantity: item.estimatedQuantity,
        },
      },
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.refreshJobDetailSilently();
      }
    });
  }

  produceItem(item: JobProductLine): void {
    if (!this.workEffortId || !this.isRunning() || !this.hasRemainingToProduce(item)) {
      return;
    }
    const estimatedQuantity = this.toNumber(item?.estimatedQuantity);
    const producedQuantity = this.toNumber(item?.produced);
    const remainingQuantity = Math.max(estimatedQuantity - producedQuantity, 0);
    this.dialog.open(ProduceItemComponent, {
      data: {
        produceData: {
          workEffortId: this.workEffortId,
          productId: item?.productId,
          productName: item?.productName,
          facilityId: this.jobDetail()?.facilityId,
          estimatedQuantity,
          producedQuantity,
          remainingQuantity,
          totalJobCost: this.jobCosts()?.totalCost ?? 0,
        },
      },
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.refreshJobDetailSilently();
        this.loadJobCosts(this.workEffortId!);
      }
    });
  }

  approveJob(): void {
    if (!this.workEffortId) {
      return;
    }
    this.manufacturingService.approveJob(this.workEffortId).subscribe({
      next: () => {
        this.refreshJobDetailSilently();
      },
      error: () => {
      },
    });
  }

  startJob(): void {
    if (!this.workEffortId) {
      return;
    }
    this.manufacturingService.startJob(this.workEffortId).subscribe({
      next: () => {
        this.refreshJobDetailSilently();
      },
      error: () => {
      },
    });
  }

  completeJob(): void {
    if (!this.workEffortId) {
      return;
    }
    this.manufacturingService.completeJob(this.workEffortId).subscribe({
      next: () => {
        this.refreshJobDetailSilently();
      },
      error: () => {
      },
    });
  }

  closeJob(): void {
    if (!this.workEffortId) {
      return;
    }
    this.manufacturingService.closeJob(this.workEffortId).subscribe({
      next: () => {
        this.refreshJobDetailSilently();
      },
      error: () => {
      },
    });
  }

  openAssignWorkerDialog(): void {
    if (!this.workEffortId || this.isClosed()) {
      return;
    }
    const dialogRef = this.dialog.open(JobAssignWorkerDialogComponent, {
      width: '480px',
      autoFocus: true,
      restoreFocus: true,
      data: {
        workEffortId: this.workEffortId,
        selectedPartyId: this.jobDetail()?.assignedWorkerPartyId || null,
      },
    });

    dialogRef.afterClosed().subscribe((result: AssignWorkerDialogResult | null | undefined) => {
      if (!result?.partyId || !this.workEffortId) {
        return;
      }
      this.manufacturingService.assignJobWorker(this.workEffortId, result.partyId).subscribe({
        next: () => {
          this.refreshJobDetailSilently();
        },
        error: () => {
        },
      });
    });
  }

  getAssignedWorkerName(): string {
    const job = this.jobDetail();
    if (!job) {
      return '';
    }
    return job.assignedWorkerName || job.assignedWorkerPartyId || '';
  }

  openJobCardPdf(): void {
    const job = this.jobDetail();
    if (!job?.workEffortId) {
      return;
    }

    this.manufacturingService.getJobCardPdf(job.workEffortId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('MANUFACTURING.JOB_CARD_OPEN_ERROR'));
      },
    });
  }

  reserveConsumable(item: JobProductLine): void {
    if (!this.workEffortId || !item?.id || !this.isApproved() || this.isClosed()) {
      return;
    }
    const payload = {};
    this.manufacturingService.reserveConsumable(this.workEffortId, item.id, payload).subscribe({
      next: () => {
        this.refreshJobDetailSilently();
      },
      error: (err) => {
        const message = err?.error?.message || this.translate.instant('MANUFACTURING.RESERVE_ERROR');
        this.snackbarService.showError(message);
      },
    });
  }

  setInventory(item: JobProductLine): void {
    if (!this.workEffortId || !item?.id || !this.isApproved() || this.isClosed()) {
      return;
    }
    this.dialog.open(SetConsumableInventoryDialogComponent, {
      width: '1200px',
      maxWidth: '95vw',
      data: {
        workEffortId: this.workEffortId,
        wegsId: item.id,
        productId: item.productId,
        remainingQuantity: item.remainingQuantity,
      },
    }).afterClosed().subscribe((reserved) => {
      if (reserved && this.workEffortId) {
        this.refreshJobDetailSilently();
      }
    });
  }

  releaseConsumable(item: JobProductLine): void {
    if (!this.workEffortId || !item?.id || !this.isApproved() || this.isClosed()) {
      return;
    }
    const payload = {};
    this.manufacturingService.releaseConsumable(this.workEffortId, item.id, payload).subscribe({
      next: () => {
        this.refreshJobDetailSilently();
      },
      error: () => {
      },
    });
  }

  issueConsumable(item: JobProductLine): void {
    if (!this.workEffortId || !item?.id || !this.isRunning()) {
      return;
    }
    const payload = {};
    this.manufacturingService.issueConsumable(this.workEffortId, item.id, payload).subscribe({
      next: () => {
        this.refreshJobDetailSilently();
      },
      error: (err) => {
        const message = err?.error?.message || this.translate.instant('MANUFACTURING.ISSUE_ERROR');
        this.snackbarService.showError(message);
      },
    });
  }

  bulkReserveConsumables(): void {
    if (!this.workEffortId || this.isBulkReserveLoading() || !this.canBulkReserve()) {
      return;
    }
    this.isBulkReserveLoading.set(true);
    this.manufacturingService.bulkReserveConsumables(this.workEffortId, {}).pipe(
      finalize(() => {
        this.isBulkReserveLoading.set(false);
      })
    ).subscribe({
      next: () => {
        this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.BULK_RESERVE_SUCCESS'));
        this.refreshJobDetailSilently();
      },
      error: (err) => {
        const message = err?.error?.message || this.translate.instant('MANUFACTURING.BULK_RESERVE_ERROR');
        this.snackbarService.showError(message);
      },
    });
  }

  bulkIssueConsumables(): void {
    if (!this.workEffortId || this.isBulkIssueLoading() || !this.canBulkIssue()) {
      return;
    }
    const reservedItems = this.productsToConsume().filter((item) => this.isBulkIssueEligible(item));
    if (reservedItems.length === 0) {
      return;
    }
    this.isBulkIssueLoading.set(true);
    const workEffortId = this.workEffortId as string;
    const calls = reservedItems.map((item) =>
      this.manufacturingService.issueConsumable(workEffortId, item.id as number, {})
    );
    forkJoin(calls).pipe(
      finalize(() => this.isBulkIssueLoading.set(false))
    ).subscribe({
      next: () => {
        this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.BULK_ISSUE_SUCCESS'));
        this.refreshJobDetailSilently();
      },
      error: (err) => {
        const message = err?.error?.message || this.translate.instant('MANUFACTURING.BULK_ISSUE_ERROR');
        this.snackbarService.showError(message);
      },
    });
  }

  cancelConsumable(item: JobProductLine): void {
    const wegsId = item?.id;
    if (!this.workEffortId || typeof wegsId !== 'number' || !this.canEditComponents()) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('MANUFACTURING.CANCEL_CONSUMABLE_TITLE'),
        message: this.translate.instant('MANUFACTURING.CANCEL_CONSUMABLE_MESSAGE'),
      },
    });
    dialogRef.afterClosed().subscribe((result: AddJobContentDialogResult | null | undefined) => {
      if (!result) {
        return;
      }
      this.manufacturingService.cancelConsumable(this.workEffortId as string, wegsId).subscribe({
        next: () => {
          this.refreshJobDetailSilently();
        },
        error: () => {
        },
      });
    });
  }

  isCancelled(item: JobProductLine): boolean {
    return (item?.statusId || '').toUpperCase() === 'WEGS_CANCELLED';
  }

  isReserved(item: JobProductLine): boolean {
    return (item?.statusId || '').toUpperCase() === 'WEGS_RESERVED';
  }

  isIssued(item: JobProductLine): boolean {
    return (item?.statusId || '').toUpperCase() === 'WEGS_ISSUED';
  }

  canBulkReserve(): boolean {
    const productsToConsume = this.productsToConsume();
    if (!Array.isArray(productsToConsume) || productsToConsume.length === 0 || !this.isApproved() || this.isClosed()) {
      return false;
    }
    return productsToConsume.some((item) => this.isBulkReserveEligible(item));
  }

  canBulkIssue(): boolean {
    const productsToConsume = this.productsToConsume();
    if (!Array.isArray(productsToConsume) || productsToConsume.length === 0 || !this.isRunning()) {
      return false;
    }
    return productsToConsume.some((item) => this.isBulkIssueEligible(item));
  }

  hasRemainingToProduce(item: JobProductLine): boolean {
    const estimated = this.toNumber(item?.estimatedQuantity);
    const produced = this.toNumber(item?.produced);
    return Math.max(estimated - produced, 0) > 0;
  }

  statusLabel(statusId?: string): string {
    const map: Record<string, string> = {
      PRUN_CREATED: 'Created',
      PRUN_SCHEDULED: 'Scheduled',
      PRUN_DOC_PRINTED: 'Confirmed',
      PRUN_RUNNING: 'Running',
      PRUN_COMPLETED: 'Completed',
      PRUN_CLOSED: 'Closed',
      PRUN_CANCELLED: 'Cancelled',
      WEGS_CREATED: 'Created',
      WEGS_RESERVED: 'Reserved',
      WEGS_ISSUED: 'Issued',
      WEGS_CANCELLED: 'Cancelled',
    };
    if (!statusId) {
      return '';
    }
    return map[statusId] || statusId.replace(/_/g, ' ');
  }

  getProducedInventoryItemIds(item: JobProducedItem): string[] {
    const raw = item?.producedInventoryItemIds;
    if (!raw) {
      return [];
    }
    return String(raw)
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  toggleIssuedMaterialSelection(itemIssuanceId: string, checked: boolean): void {
    if (!itemIssuanceId) {
      return;
    }
    if (checked) {
      this.selectedIssuedMaterialIds.add(itemIssuanceId);
    } else {
      this.selectedIssuedMaterialIds.delete(itemIssuanceId);
    }
  }

  returnIssuedMaterials(): void {
    if (!this.workEffortId || this.selectedIssuedMaterialIds.size === 0) {
      return;
    }
    const selected = this.issuedMaterials().filter((row) => {
      const itemIssuanceId = row?.itemIssuanceId;
      return !!itemIssuanceId && this.selectedIssuedMaterialIds.has(itemIssuanceId);
    });
    const requests = [];
    for (const row of selected) {
      const itemIssuanceId = row.itemIssuanceId;
      if (!itemIssuanceId) {
        continue;
      }
      const quantity = this.returnQtyByIssuanceId[itemIssuanceId];
      if (!quantity || Number(quantity) <= 0) {
        continue;
      }
      requests.push(this.manufacturingService.returnIssuedMaterial(this.workEffortId, {
        itemIssuanceId,
        quantity,
        reasonEnumId: this.returnReasonByIssuanceId[itemIssuanceId] || 'IRR_OTHER',
      }));
    }
    if (requests.length === 0) {
      return;
    }
    forkJoin(requests).subscribe({
      next: () => {
        this.refreshJobDetailSilently();
      },
    });
  }

  openAddContentDialog(contentType: string = 'DOCUMENT'): void {
    if (!this.workEffortId) {
      return;
    }
    const dialogRef = this.dialog.open(AddJobContentDialogComponent, {
      width: '640px',
      data: { contentType },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (!result || !this.workEffortId) {
        return;
      }
      this.manufacturingService
        .addJobContent(this.workEffortId, result.formData, result.workEffortContentTypeId)
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.CONTENT_UPLOAD_SUCCESS'));
            this.refreshJobDetailSilently();
          },
          error: (err) => {
            const message = err?.error?.message || this.translate.instant('MANUFACTURING.CONTENT_UPLOAD_ERROR');
            this.snackbarService.showError(message);
          },
        });
    });
  }

  openNoteDialog(note?: JobNoteRecord): void {
    if (!this.workEffortId) {
      return;
    }
    this.dialog.open(JobNoteDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: {
        noteData: {
          ...(note || {}),
          noteText: note?.noteText || note?.internalNote || '',
          workEffortId: this.workEffortId,
        },
      },
    }).afterClosed().subscribe((result: JobNoteRecord | null | undefined) => {
      if (result === undefined) {
        return;
      }
      this.refreshJobDetailSilently();
    });
  }

  deleteNote(note: JobNoteRecord): void {
    const noteId = note?.id;
    if (!this.workEffortId || typeof noteId !== 'number') {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('MANUFACTURING.JOB_NOTE_DELETE_TITLE'),
        message: this.translate.instant('MANUFACTURING.JOB_NOTE_DELETE_MESSAGE'),
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed || !this.workEffortId) {
        return;
      }
      this.performJobNoteDelete(this.workEffortId, noteId);
    });
  }

  private performJobNoteDelete(workEffortId: string, noteId: number): void {
    this.manufacturingService.deleteJobNote(workEffortId, noteId).subscribe({
      next: () => {
        this.notes.update((items) => items.filter((item) => item.id !== noteId));
        this.refreshJobDetailSilently();
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('MANUFACTURING.JOB_NOTE_DELETE_ERROR'));
      },
    });
  }

  getNoteText(note: JobNoteRecord): string {
    return note?.noteText || note?.internalNote || '-';
  }

  submitExecutionChecklist(): void {
    if (!this.workEffortId || this.executionChecklistForm.invalid || this.isClosed()) {
      this.executionChecklistForm.markAllAsTouched();
      return;
    }
    const raw = this.executionChecklistForm.getRawValue();
    const payload: JobExecutionChecklistPayload = {
      category: raw.category || 'CHECKLIST',
      statusId: raw.statusId || 'CHECK_PENDING',
      quantity: raw.quantity || null,
      note: raw.note || null,
    };
    this.manufacturingService.addJobExecutionChecklist(this.workEffortId, payload).subscribe({
      next: (item) => {
        this.executionChecklist.update((items) => [item, ...items]);
        this.executionChecklistForm.reset({
          category: raw.category || 'QA',
          statusId: 'CHECK_PENDING',
          quantity: '',
          note: '',
        });
        this.cdr.markForCheck();
      },
      error: (err) => {
        const message = err?.error?.message || err?.message || this.translate.instant('MANUFACTURING.CHECKLIST_SAVE_ERROR');
        this.snackbarService.showError(message);
      },
    });
  }

  checklistLabel(value?: string | null): string {
    if (!value) {
      return '-';
    }
    return value.replace(/_/g, ' ');
  }

  workTypeLabel(value?: string | null): string {
    return value ? value.replace(/_/g, ' ') : '-';
  }

  canStartTask(item: JobTaskLine): boolean {
    const status = String(item?.currentStatusId || '').toUpperCase();
    return this.isRunning() && ['PRUN_CREATED', 'PRUN_SCHEDULED', 'PRUN_DOC_PRINTED'].includes(status);
  }

  canCompleteTask(item: JobTaskLine): boolean {
    const status = String(item?.currentStatusId || '').toUpperCase();
    return this.isRunning() && status !== 'PRUN_COMPLETED' && status !== 'PRUN_CANCELLED';
  }

  startTask(item: JobTaskLine): void {
    if (!this.workEffortId || !item?.workEffortId) {
      return;
    }
    this.manufacturingService.startJobTask(this.workEffortId, item.workEffortId).subscribe({
      next: () => {
        this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.TASK_START_SUCCESS'));
        this.refreshJobDetailSilently();
      },
      error: (err) => {
        const msg = err?.error?.errorMessage || err?.error?.error
          || this.translate.instant('MANUFACTURING.TASK_START_ERROR');
        this.snackbarService.showError(msg);
      },
    });
  }

  openCompleteTaskDialog(item: JobTaskLine): void {
    if (!this.workEffortId || !item?.workEffortId) {
      return;
    }
    const estimatedMs = Number(item?.estimatedMilliSeconds || 0);
    const dialogRef = this.dialog.open(CompleteTaskDialogComponent, {
      width: '440px',
      data: {
        workEffortId: this.workEffortId,
        taskId: item.workEffortId,
        taskName: item.workEffortName,
        estimatedHours: estimatedMs > 0 ? Math.round((estimatedMs / 3600000) * 100) / 100 : null,
      },
    });
    dialogRef.afterClosed().subscribe((completed) => {
      if (completed) {
        this.refreshJobDetailSilently();
      }
    });
  }

  removeContent(item: JobContentRecord): void {
    const contentId = item?.contentId;
    if (!this.workEffortId || !contentId) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('MANUFACTURING.DELETE_CONTENT_TITLE'),
        message: this.translate.instant('MANUFACTURING.DELETE_CONTENT_MESSAGE'),
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed || !this.workEffortId) {
        return;
      }
      this.manufacturingService.deleteJobContent(this.workEffortId, contentId).subscribe({
        next: () => this.refreshJobDetailSilently(),
        error: () => { },
      });
    });
  }

  openContent(item: JobContentRecord): void {
    if (!this.workEffortId || !item?.contentId) {
      return;
    }
    this.manufacturingService.downloadJobContent(this.workEffortId, item.contentId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: () => { },
    });
  }

  private toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  getReferenceLink(item: JobReferenceLine): string[] {
    return ['/jobs', item?.id || ''];
  }

  getRemainingConsumableQty(item: JobProductLine): number {
    const remainingFromApi = this.toNumber(item?.remainingQuantity);
    if (remainingFromApi > 0) {
      return remainingFromApi;
    }
    const estimated = this.toNumber(item?.estimatedQuantity);
    const issued = this.toNumber(item?.issuedQuantity);
    return Math.max(estimated - issued, 0);
  }

  private isBulkReserveEligible(item: JobProductLine): boolean {
    if (!item || this.isCancelled(item) || this.isIssued(item) || this.isReserved(item)) {
      return false;
    }
    const remainingQty = this.toNumber(item?.remainingQuantity);
    return remainingQty > 0;
  }

  private isBulkIssueEligible(item: JobProductLine): boolean {
    if (!item || this.isCancelled(item) || this.isIssued(item)) {
      return false;
    }
    return this.isReserved(item);
  }

  private extractJobDetail(response: JobDetailResponse): JobDetailState {
    const rawJob = (response?.job ?? response?.workEffort ?? response ?? {}) as JobDetailState;
    return {
      ...rawJob,
      estimatedWorkDuration: rawJob?.estimatedWorkDuration ?? rawJob?.estimatedMilliSeconds ?? '',
      statusId: rawJob?.statusId ?? rawJob?.currentStatusId ?? '',
    };
  }

  openSteelCuttingDialog(): void {
    if (!this.workEffortId) {
      return;
    }
    const data: SteelCuttingDialogData = {
      workEffortId: this.workEffortId,
    };
    this.dialog.open(SteelCuttingDialogComponent, {
      width: '820px',
      maxWidth: '96vw',
      data,
    }).afterClosed().subscribe((result) => {
      if (result?.generatedIds?.length) {
        this.snackbarService.showSuccess?.(
          `${result.generatedIds.length} cut section(s) recorded successfully.`
        );
        this.refreshJobDetailSilently();
      }
    });
  }
}

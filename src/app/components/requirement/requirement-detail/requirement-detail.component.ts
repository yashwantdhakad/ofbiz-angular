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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { RequirementService } from '@ofbiz/services/requirement/requirement.service';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { RequirementSupplierDialogComponent } from '../requirement-supplier-dialog/requirement-supplier-dialog.component';
import { StatusHistoryEntry } from '../../common/status-history/status-history-icon.component';

@Component({
  selector: 'app-requirement-detail',
  standalone: false,
  templateUrl: './requirement-detail.component.html',
  styleUrls: ['./requirement-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequirementDetailComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly isSavingSupplier = signal(false);
  readonly isApproving = signal(false);
  readonly isCreatingPo = signal(false);
  readonly isCreatingJob = signal(false);
  readonly statusHistoryEntries = signal<StatusHistoryEntry[]>([]);

  requirementId = '';
  detail: any = null;
  requirement: any = null;
  references: any[] = [];
  timeline: any = null;

  facilityLabel = '-';
  productLabel = '-';
  supplierLabel = '-';
  supplierAddress = '';
  supplierPartyId = '';

  selectedSupplierPartyId = '';

  constructor(
    private route: ActivatedRoute,
    private requirementService: RequirementService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.requirementId = this.route.snapshot.paramMap.get('id') || '';
    this.loadDetail();
  }

  loadDetail(showLoader: boolean = true): void {
    if (!this.requirementId) {
      return;
    }
    if (showLoader) {
      this.isLoading.set(true);
      this.cdr.markForCheck();
    }
    this.requirementService
      .getRequirementDetail(this.requirementId)
      .pipe(
        finalize(() => {
          if (showLoader) {
            this.isLoading.set(false);
            this.cdr.markForCheck();
          }
        })
      )
      .subscribe({
        next: (response: any) => {
          // OFBiz wraps OUT params in { data: { ... } }
          const detail = response?.data ?? response;
          this.detail = detail || {};
          this.requirement = this.detail?.requirement || {};
          this.references = Array.isArray(this.detail?.references) ? this.detail.references : [];
          this.timeline = this.detail?.timeline || {};
          this.statusHistoryEntries.set(
            Array.isArray(this.detail?.statusHistory)
              ? this.detail.statusHistory
                .filter((entry: any) => !!entry?.statusId)
                .map((entry: any) => ({
                  statusId: entry.statusId,
                  statusLabel: this.getStatusDisplay(entry.statusId),
                  changedAt: entry.statusDate,
                }))
              : []
          );
          this.selectedSupplierPartyId = this.detail?.supplier?.partyId || '';
          this.supplierPartyId = this.selectedSupplierPartyId;
          this.facilityLabel = this.detail?.facilityDisplay || this.requirement?.facilityId || '-';
          this.productLabel = this.detail?.productDisplay || this.requirement?.productId || '-';
          this.supplierLabel =
            this.detail?.supplier?.displayLabel ||
            this.detail?.supplier?.partyName ||
            this.detail?.supplier?.partyId ||
            '-';
          this.supplierAddress = this.detail?.supplier?.address || '';
          this.cdr.markForCheck();
        },
        error: () => {
          this.statusHistoryEntries.set([]);
          this.snackbarService.showError(this.translate.instant('REQUIREMENT.LOAD_ERROR'));
          this.cdr.markForCheck();
        },
      });
  }

  approve(): void {
    if (!this.requirementId) {
      return;
    }
    this.isApproving.set(true);
    this.requirementService
      .approveRequirement(this.requirementId, {})
      .pipe(
        finalize(() => {
          this.isApproving.set(false);
          this.cdr.markForCheck();
        })
      )
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('REQUIREMENT.APPROVE_SUCCESS'));
            this.loadDetail(false);
            this.cdr.markForCheck();
          },
          error: (error) => {
            const message = error?.error?.message || this.translate.instant('REQUIREMENT.APPROVE_ERROR');
            this.snackbarService.showError(message);
            this.cdr.markForCheck();
          },
        });
  }

  openSupplierDialog(): void {
    const dialogRef = this.dialog.open(RequirementSupplierDialogComponent, {
      width: '640px',
      data: {
        supplierPartyId: this.selectedSupplierPartyId || '',
        supplierPartyName: this.detail?.supplier?.partyName || '',
        supplierDisplayLabel: this.detail?.supplier?.displayLabel || this.supplierLabel || '',
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      const supplierPartyId = (result?.supplierPartyId || '').trim();
      const supplierPartyName = (result?.supplierPartyName || '').trim();
      if (!supplierPartyId || !this.requirementId) {
        return;
      }
      this.isSavingSupplier.set(true);
      this.requirementService
        .upsertSupplier(this.requirementId, {
          partyId: supplierPartyId,
          partyName: supplierPartyName || undefined,
        })
        .pipe(
          finalize(() => {
            this.isSavingSupplier.set(false);
            this.cdr.markForCheck();
          })
        )
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('COMMON.SAVE_SUCCESS'));
            this.loadDetail(false);
            this.cdr.markForCheck();
          },
          error: () => {
            this.snackbarService.showError(this.translate.instant('REQUIREMENT.SUPPLIER_SAVE_ERROR'));
            this.cdr.markForCheck();
          },
        });
    });
  }

  getReferenceLink(reference: any): any[] {
    const type = (reference?.referenceType || '').toUpperCase();
    if (type === 'PRODUCTION_RUN') {
      return ['/jobs', reference?.referenceId];
    }
    if (type === 'PURCHASE_ORDER') {
      return ['/pos', reference?.referenceId];
    }
    return ['/requirements'];
  }

  getReferenceTypeLabel(referenceType: string): string {
    const type = (referenceType || '').toUpperCase();
    if (type === 'PRODUCTION_RUN') {
      return this.translate.instant('REQUIREMENT.REF_PRODUCTION_RUN');
    }
    if (type === 'PURCHASE_ORDER') {
      return this.translate.instant('REQUIREMENT.REF_PURCHASE_ORDER');
    }
    return referenceType || '-';
  }

  createPurchaseOrder(): void {
    if (!this.requirementId) return;
    if (!this.hasSupplier()) {
      this.snackbarService.showError(this.translate.instant('REQUIREMENT.CREATE_PO_NO_SUPPLIER'));
      return;
    }
    this.isCreatingPo.set(true);
    this.requirementService
      .createPurchaseOrder(this.requirementId)
      .pipe(finalize(() => { this.isCreatingPo.set(false); this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('REQUIREMENT.CREATE_PO_SUCCESS'));
          this.loadDetail(false);
        },
        error: (err) => {
          const message = err?.error?.message || this.translate.instant('REQUIREMENT.CREATE_PO_ERROR');
          this.snackbarService.showError(message);
        },
      });
  }

  createJob(): void {
    if (!this.requirementId) return;
    this.isCreatingJob.set(true);
    this.requirementService
      .createJob(this.requirementId)
      .pipe(finalize(() => { this.isCreatingJob.set(false); this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('REQUIREMENT.CREATE_JOB_SUCCESS'));
          this.loadDetail(false);
        },
        error: (err) => {
          const message = err?.error?.message || this.translate.instant('REQUIREMENT.CREATE_JOB_ERROR');
          this.snackbarService.showError(message);
        },
      });
  }

  hasSupplier(): boolean {
    return !!this.selectedSupplierPartyId;
  }

  canApprove(): boolean {
    const statusId = (this.requirement?.statusId || '').toUpperCase();
    return !['REQ_APPROVED', 'REQ_ORDERED', 'REQ_COMPLETED'].includes(statusId);
  }

  canCreatePo(): boolean {
    const statusId = (this.requirement?.statusId || '').toUpperCase();
    const typeId = (this.requirement?.requirementTypeId || '').toUpperCase();
    return statusId === 'REQ_APPROVED' && typeId === 'PRODUCT_REQUIREMENT';
  }

  canCreateJob(): boolean {
    const statusId = (this.requirement?.statusId || '').toUpperCase();
    const typeId = (this.requirement?.requirementTypeId || '').toUpperCase();
    return statusId === 'REQ_APPROVED' && typeId === 'INTERNAL_REQUIREMENT';
  }

  getTypeLabel(): string {
    if (this.detail?.requirementTypeDescription) {
      return this.detail.requirementTypeDescription;
    }
    const typeId = (this.requirement?.requirementTypeId || '').toUpperCase();
    if (typeId === 'PRODUCT_REQUIREMENT') {
      return this.translate.instant('REQUIREMENT.TYPE_PRODUCT');
    }
    if (typeId === 'INTERNAL_REQUIREMENT') {
      return this.translate.instant('REQUIREMENT.TYPE_INTERNAL');
    }
    return this.requirement?.requirementTypeId || '-';
  }

  getStatusLabel(): string {
    if (this.detail?.statusDescription) {
      return this.detail.statusDescription;
    }
    return this.getStatusDisplay(this.requirement?.statusId);
  }

  private getStatusDisplay(statusId?: string | null): string {
    const normalized = String(statusId || '').toUpperCase();
    if (normalized === 'REQ_PROPOSED') {
      return this.translate.instant('REQUIREMENT.STATUS_PROPOSED');
    }
    if (normalized === 'REQ_APPROVED') {
      return this.translate.instant('REQUIREMENT.STATUS_APPROVED');
    }
    if (normalized === 'REQ_ORDERED') {
      return this.translate.instant('REQUIREMENT.STATUS_ORDERED');
    }
    if (normalized === 'REQ_COMPLETED') {
      return this.translate.instant('COMMON.COMPLETED');
    }
    return String(statusId || '-');
  }

}

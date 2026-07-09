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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { AddDeliverableItemDialogComponent } from '../add-deliverable-item-dialog/add-deliverable-item-dialog.component';
import { AddOperationDialogComponent } from '../add-operation-dialog/add-operation-dialog.component';
import { EditRoutingDialogComponent } from '../edit-routing-dialog/edit-routing-dialog.component';
import { AddRoutingContentDialogComponent } from '../add-routing-content-dialog/add-routing-content-dialog.component';
import { ConfirmationDialogComponent } from '@ofbiz/components/common/confirmation-dialog/confirmation-dialog.component';
import {
  AddDeliverableItemDialogResult,
  AddOperationDialogResult,
  AddRoutingContentDialogResult,
  EditRoutingDialogResult,
  RoutingApiPayload,
  RoutingApiResponse,
  RoutingContent,
  RoutingDeliverableItem,
  RoutingDetailData,
  RoutingOperation,
} from '@ofbiz/models/manufacturing.model';

@Component({
  standalone: false,
  selector: 'app-routing-detail',
  templateUrl: './routing-detail.component.html',
  styleUrls: ['./routing-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutingDetailComponent implements OnInit {
  workEffortId = signal('');
  routing = signal<RoutingDetailData | null>(null);
  operations = signal<RoutingOperation[]>([]);
  deliverableItems = signal<RoutingDeliverableItem[]>([]);
  contents = signal<RoutingContent[]>([]);
  isLoading = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private manufacturingService: ManufacturingService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('workEffortId') || '';
      if (!id) {
        return;
      }
      this.workEffortId.set(id);
      this.loadDetail();
    });
  }

  backToList(): void {
    this.router.navigate(['/routings']);
  }

  openEditRoutingDialog(): void {
    const r = this.routing();
    const id = this.workEffortId();
    const dialogRef = this.dialog.open(EditRoutingDialogComponent, {
      width: '560px',
      data: { routing: r },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: EditRoutingDialogResult | null | undefined) => {
      if (!result) {
        return;
      }
      this.manufacturingService.updateRouting(id, result as unknown as Partial<import('@ofbiz/models/manufacturing.model').RoutingDetailData>)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.ROUTING_UPDATED_SUCCESS'));
            this.refreshSilently();
          },
          error: () => this.snackbarService.showError(this.translate.instant('MANUFACTURING.ROUTING_UPDATED_ERROR')),
        });
    });
  }

  openAddOperationDialog(): void {
    const ops = this.operations();
    const id = this.workEffortId();
    const sequenceNumbers = ops
      .map((item) => Number(item?.sequenceNum))
      .filter((value) => Number.isFinite(value));
    const maxSequence = sequenceNumbers.length > 0 ? Math.max(...sequenceNumbers) : 0;
    const nextSequence = String(maxSequence + 10);
    const dialogRef = this.dialog.open(AddOperationDialogComponent, {
      width: '640px',
      data: { sequenceNum: nextSequence },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: AddOperationDialogResult | null | undefined) => {
      if (!result) {
        return;
      }
      this.manufacturingService.addOperation(id, result as unknown as Record<string, unknown>)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.OPERATION_ADDED_SUCCESS'));
            this.refreshSilently();
          },
          error: () => this.snackbarService.showError(this.translate.instant('MANUFACTURING.OPERATION_ADDED_ERROR')),
        });
    });
  }

  removeOperation(item: RoutingOperation): void {
    const operationId = item?.operationWorkEffortId || item?.workEffortId;
    const id = this.workEffortId();
    if (!operationId) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRMATION'),
        message: this.translate.instant('COMMON.DELETE_CONFIRMATION'),
      },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.manufacturingService.deleteOperation(id, operationId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.OPERATION_REMOVED_SUCCESS'));
            this.refreshSilently();
          },
          error: () => this.snackbarService.showError(this.translate.instant('MANUFACTURING.OPERATION_REMOVED_ERROR')),
        });
    });
  }

  openAddDeliverableDialog(): void {
    const id = this.workEffortId();
    const dialogRef = this.dialog.open(AddDeliverableItemDialogComponent, {
      width: '640px',
      data: null,
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: AddDeliverableItemDialogResult | null | undefined) => {
      if (!result) {
        return;
      }
      this.manufacturingService.addDeliverableItem(id, result as unknown as Partial<import('@ofbiz/models/manufacturing.model').RoutingDeliverableItem>)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.DELIVERABLE_ADDED_SUCCESS'));
            this.refreshSilently();
          },
          error: () => this.snackbarService.showError(this.translate.instant('MANUFACTURING.DELIVERABLE_ADDED_ERROR')),
        });
    });
  }

  openEditDeliverableDialog(item: RoutingDeliverableItem): void {
    const id = this.workEffortId();
    if (!item?.id) {
      return;
    }
    const dialogRef = this.dialog.open(AddDeliverableItemDialogComponent, {
      width: '640px',
      data: { item },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: AddDeliverableItemDialogResult | null | undefined) => {
      if (!result) {
        return;
      }
      this.manufacturingService.updateDeliverableItem(id, item.id!, result as unknown as Partial<import('@ofbiz/models/manufacturing.model').RoutingDeliverableItem>)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.DELIVERABLE_UPDATED_SUCCESS'));
            this.refreshSilently();
          },
          error: () => this.snackbarService.showError(this.translate.instant('MANUFACTURING.DELIVERABLE_UPDATED_ERROR')),
        });
    });
  }

  removeDeliverableItem(item: RoutingDeliverableItem): void {
    const id = this.workEffortId();
    if (!item?.id) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRMATION'),
        message: this.translate.instant('COMMON.DELETE_CONFIRMATION'),
      },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.manufacturingService.deleteDeliverableItem(id, item.id!)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.DELIVERABLE_REMOVED_SUCCESS'));
            this.refreshSilently();
          },
          error: () => this.snackbarService.showError(this.translate.instant('MANUFACTURING.DELIVERABLE_REMOVED_ERROR')),
        });
    });
  }

  openAddContentDialog(contentType: string): void {
    const id = this.workEffortId();
    const dialogRef = this.dialog.open(AddRoutingContentDialogComponent, {
      width: '640px',
      data: { contentType },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: AddRoutingContentDialogResult | null | undefined) => {
      if (!result) {
        return;
      }
      this.manufacturingService
        .addRoutingContent(id, result.formData, result.workEffortContentTypeId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.CONTENT_ADDED_SUCCESS'));
            this.refreshSilently();
          },
          error: () => this.snackbarService.showError(this.translate.instant('MANUFACTURING.CONTENT_ADDED_ERROR')),
        });
    });
  }

  removeContent(item: RoutingContent): void {
    const id = this.workEffortId();
    if (!item?.contentId) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRMATION'),
        message: this.translate.instant('COMMON.DELETE_CONFIRMATION'),
      },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.manufacturingService.deleteRoutingContent(id, item.contentId!)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.CONTENT_REMOVED_SUCCESS'));
            this.refreshSilently();
          },
          error: () => this.snackbarService.showError(this.translate.instant('MANUFACTURING.CONTENT_REMOVED_ERROR')),
        });
    });
  }

  openContent(item: RoutingContent): void {
    const id = this.workEffortId();
    if (!item?.contentId) {
      return;
    }
    this.manufacturingService.downloadRoutingContent(id, item.contentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank', 'noopener');
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        },
        error: () => this.snackbarService.showError(this.translate.instant('MANUFACTURING.CONTENT_OPEN_ERROR')),
      });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleDateString();
  }

  private refreshSilently(): void {
    this.loadDetail(false);
  }

  private loadDetail(showLoader: boolean = true): void {
    if (showLoader) {
      this.isLoading.set(true);
    }
    const id = this.workEffortId();
    this.manufacturingService
      .getRoutingDetail(id)
      .pipe(
        finalize(() => {
          if (showLoader) {
            this.isLoading.set(false);
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response: RoutingApiResponse) => {
          const payload = this.extractDetailResponse(response);
          this.routing.set(payload?.routing ? { ...payload.routing } : null);
          this.operations.set(Array.isArray(payload?.operations) ? [...payload.operations] : []);
          this.deliverableItems.set(Array.isArray(payload?.deliverableItems) ? [...payload.deliverableItems] : []);
          this.contents.set(Array.isArray(payload?.contents) ? [...payload.contents] : []);
        },
        error: () => {
          this.routing.set(null);
          this.operations.set([]);
          this.deliverableItems.set([]);
          this.contents.set([]);
          this.snackbarService.showError(this.translate.instant('MANUFACTURING.ROUTING_LOAD_ERROR'));
        },
      });
  }

  private extractDetailResponse(response: RoutingApiResponse): RoutingApiPayload {
    if (!response) {
      return {};
    }
    if (response?.routing || response?.operations || response?.deliverableItems || response?.contents) {
      return response;
    }
    if (response?.responseMap) {
      const nested = response.responseMap;
      if (nested?.routing || nested?.operations || nested?.deliverableItems || nested?.contents) {
        return nested;
      }
      if (nested?.result) {
        return this.extractDetailResponse(nested.result);
      }
      if (nested?.data) {
        return this.extractDetailResponse(nested.data);
      }
      return nested;
    }
    if (response?.data) {
      return this.extractDetailResponse(response.data);
    }
    if (response?.result) {
      return this.extractDetailResponse(response.result);
    }
    return response;
  }
}

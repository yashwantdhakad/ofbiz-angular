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
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { catchError, of, switchMap } from 'rxjs';
import { PicklistService } from '@ofbiz/services/picklist/picklist.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

interface PackingStationBinItem {
  orderId?: string;
  orderItemSeqId?: string;
  inventoryProductId?: string;
  inventoryProductName?: string;
  inventoryItemId?: string;
  locationSeqId?: string;
  itemStatusId?: string;
  statusDescription?: string;
  quantity?: number;
}

interface PackingStationBin {
  picklistBinId?: string;
  primaryOrderId?: string;
  statusId?: string;
  shipmentId?: string;
  items?: PackingStationBinItem[];
}

interface PackingStationPicklist {
  picklist?: {
    picklistId?: string;
    facilityId?: string;
    facilityName?: string;
    statusId?: string;
    statusDescription?: string;
  };
  bins?: PackingStationBin[];
}

@Component({
  standalone: false,
  selector: 'app-packing-station',
  templateUrl: './packing-station.component.html',
  styleUrls: ['./packing-station.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackingStationComponent {
  private static readonly STATUS_ASSIGNED = 'PICKLIST_ASSIGNED';
  private static readonly STATUS_PICKED = 'PICKLIST_PICKED';

  private readonly fb = inject(FormBuilder);
  private readonly picklistService = inject(PicklistService);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchForm = this.fb.nonNullable.group({
    scanCode: ['', Validators.required],
  });
  readonly isLoading = signal(false);
  readonly isWorking = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly scanType = signal<string | null>(null);
  readonly selectedBinId = signal<string | null>(null);
  readonly detail = signal<PackingStationPicklist | null>(null);

  readonly bins = computed(() => this.detail()?.bins ?? []);
  readonly selectedBin = computed(() => {
    const selectedBinId = this.selectedBinId();
    return this.bins().find((bin) => !!bin.picklistBinId && bin.picklistBinId === selectedBinId) ?? this.bins()[0] ?? null;
  });
  readonly shipmentId = computed(() => this.selectedBin()?.shipmentId ?? this.bins().find((bin) => !!bin.shipmentId)?.shipmentId ?? null);
  readonly itemCount = computed(() => this.bins().reduce((total, bin) => total + (bin.items?.length ?? 0), 0));
  readonly orderCount = computed(() => new Set(this.bins().map((bin) => bin.primaryOrderId).filter(Boolean)).size);
  readonly canMarkPicked = computed(() => this.workflowStatus() === PackingStationComponent.STATUS_ASSIGNED);
  readonly canCreateShipment = computed(() => {
    const statusId = this.workflowStatus();
    return !this.shipmentId() && (
      statusId === PackingStationComponent.STATUS_ASSIGNED
      || statusId === PackingStationComponent.STATUS_PICKED
    );
  });

  resolveScan(): void {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    const scanCode = this.searchForm.controls.scanCode.value.trim();
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.scanType.set(null);
    this.selectedBinId.set(null);

    this.loadPicklist(scanCode).pipe(
      switchMap((detail) => detail ? of({ detail, type: 'PICKLIST', binId: null }) : this.resolveOrder(scanCode)),
      switchMap((result) => result ? of(result) : this.resolveBin(scanCode)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (result) => {
        this.isLoading.set(false);
        if (!result?.detail?.picklist?.picklistId) {
          this.detail.set(null);
          this.errorMessage.set('PACKING_STATION.NOT_FOUND');
          return;
        }
        this.detail.set(result.detail);
        this.scanType.set(result.type);
        this.selectedBinId.set(result.binId ?? this.firstBinId(result.detail));
      },
      error: () => {
        this.isLoading.set(false);
        this.detail.set(null);
        this.errorMessage.set('PACKING_STATION.LOAD_ERROR');
      },
    });
  }

  markPicked(): void {
    const picklistId = this.detail()?.picklist?.picklistId;
    if (!picklistId || !this.canMarkPicked()) return;
    this.isWorking.set(true);
    this.picklistService.markPicked(picklistId).pipe(
      switchMap(() => this.loadPicklist(picklistId)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (detail) => {
        this.isWorking.set(false);
        this.detail.set(detail);
        this.snackbar.showSuccess(this.translate.instant('PACKING_STATION.MARK_PICKED_SUCCESS'));
      },
      error: () => {
        this.isWorking.set(false);
        this.snackbar.showError(this.translate.instant('PICKLIST.MARK_PICKED_ERROR'));
      },
    });
  }

  createShipment(): void {
    const picklistId = this.detail()?.picklist?.picklistId;
    if (!picklistId || !this.canCreateShipment()) return;
    this.isWorking.set(true);
    this.picklistService.createShipmentFromPicklist(picklistId).pipe(
      switchMap((result) => {
        const shipmentIds = this.getShipmentIds(result);
        return shipmentIds.length === 1 ? of({ detail: null, shipmentId: shipmentIds[0], shipmentCount: 1 }) : this.loadPicklist(picklistId).pipe(
          switchMap((detail) => of({
            detail,
            shipmentId: shipmentIds.length > 1 ? null : this.findShipmentId(detail),
            shipmentCount: shipmentIds.length,
          }))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (result) => {
        this.isWorking.set(false);
        if (result.detail) {
          this.detail.set(result.detail);
        }
        if (result.shipmentId) {
          this.openShipment(result.shipmentId);
        } else if (result.shipmentCount > 1) {
          this.snackbar.showSuccess(this.translate.instant('PACKING_STATION.SHIPMENTS_CREATED'));
        } else {
          this.snackbar.showSuccess(this.translate.instant('PICKLIST.SHIPMENT_CREATED'));
        }
      },
      error: () => {
        this.isWorking.set(false);
        this.snackbar.showError(this.translate.instant('PICKLIST.SHIPMENT_CREATE_ERROR'));
      },
    });
  }

  openShipment(shipmentId: string | null = this.shipmentId()): void {
    if (!shipmentId) return;
    this.router.navigate(['/shipments/sales', shipmentId]);
  }

  openPicklist(): void {
    const picklistId = this.detail()?.picklist?.picklistId;
    if (!picklistId) return;
    this.router.navigate(['/picklists', picklistId]);
  }

  setSelectedBin(binId?: string): void {
    if (binId) {
      this.selectedBinId.set(binId);
    }
  }

  trackByBin = (_: number, bin: PackingStationBin): string | number => bin?.picklistBinId ?? _;
  trackByItem = (_: number, item: PackingStationBinItem): string | number =>
    `${item?.orderId ?? ''}:${item?.orderItemSeqId ?? ''}:${item?.inventoryItemId ?? _}`;

  private resolveOrder(orderId: string) {
    return this.picklistService.getPicklistOrdersByOrder(orderId).pipe(
      switchMap((response) => {
        const rows = this.toList(response);
        const picklistId = rows.find((row) => !!row?.picklistId)?.picklistId;
        if (!picklistId) return of(null);
        return this.loadPicklist(picklistId).pipe(
          switchMap((detail) => of({ detail, type: 'ORDER', binId: rows[0]?.picklistBinId }))
        );
      }),
      catchError(() => of(null))
    );
  }

  private resolveBin(picklistBinId: string) {
    return this.picklistService.getPicklistByBin(picklistBinId).pipe(
      switchMap((response) => {
        const picklistId = response?.picklistId;
        if (!picklistId) return of(null);
        return this.loadPicklist(picklistId).pipe(
          switchMap((detail) => of({ detail, type: 'BIN', binId: picklistBinId }))
        );
      }),
      catchError(() => of(null))
    );
  }

  private loadPicklist(picklistId: string) {
    return this.picklistService.getPicklist(picklistId).pipe(
      catchError(() => of(null))
    );
  }

  private workflowStatus(): string | undefined {
    return this.detail()?.picklist?.statusId;
  }

  private firstBinId(detail: PackingStationPicklist): string | null {
    return detail?.bins?.[0]?.picklistBinId ?? null;
  }

  private findShipmentId(detail: PackingStationPicklist | null): string | null {
    return detail?.bins?.find((bin) => !!bin.shipmentId)?.shipmentId ?? null;
  }

  private getShipmentIds(result: any): string[] {
    if (Array.isArray(result?.shipmentIds)) {
      return result.shipmentIds.filter((shipmentId: unknown): shipmentId is string => typeof shipmentId === 'string' && shipmentId.length > 0);
    }
    return result?.shipmentId ? [result.shipmentId] : [];
  }

  private toList(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.resultList)) return response.resultList;
    if (Array.isArray(response?.data?.resultList)) return response.data.resultList;
    return [];
  }
}

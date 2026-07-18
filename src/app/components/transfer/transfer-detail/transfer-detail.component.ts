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
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, catchError, distinctUntilChanged, filter, map } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { OrderService } from '@ofbiz/services/order/order.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { MatDialog } from '@angular/material/dialog';
import { ProductItemComponent } from '../../order/product-item/product-item.component';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import {
  OrderDetailResponse,
  OrderDisplayInfoResponse,
  OrderHeaderSummary,
  OrderPartItemSummary,
  OrderPartSummary,
  OrderStatusHistoryEntry,
  OrderStatusSummary,
  ShipmentSummary,
} from '@ofbiz/models/order.model';
import { PostalAddress } from '@ofbiz/models/party.model';
import { ShippingInstructionDialogComponent } from '../../order/shipping-instruction-dialog/shipping-instruction-dialog.component';
import { StatusHistoryEntry } from '../../common/status-history/status-history-icon.component';

@Component({
  standalone: false,
  selector: 'app-transfer-detail',
  templateUrl: './transfer-detail.component.html',
  styleUrls: ['./transfer-detail.component.css'],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferDetailComponent implements OnInit {
  listBasePath = '/transfers';
  orderPrimaryId: string | undefined;
  orderId: string | undefined;

  readonly isLoading = signal(false);
  readonly orderHeader = signal<OrderHeaderSummary | null>(null);
  readonly statusItem = signal<OrderStatusSummary | null>(null);
  readonly orderStatusHistory = signal<OrderStatusHistoryEntry[]>([]);
  readonly orderItems = signal<OrderPartItemSummary[]>([]);
  readonly fromFacilityId = signal<string | undefined>(undefined);
  readonly toFacilityId = signal<string | undefined>(undefined);
  readonly fromAddress = signal<PostalAddress | null>(null);
  readonly toAddress = signal<PostalAddress | null>(null);
  readonly shipments = signal<ShipmentSummary[]>([]);
  readonly firstPart = signal<OrderPartSummary | null>(null);
  readonly picklists = signal<any[]>([]);
  readonly reservationStatus = signal<any>(null);

  readonly fromFacilityName = computed(() => {
    const id = this.fromFacilityId();
    if (!id) return undefined;
    const f = this.referenceDataStore.facilities().find((x: any) => x.facilityId === id);
    return f?.facilityName || f?.facilityId || id;
  });

  readonly toFacilityName = computed(() => {
    const id = this.toFacilityId();
    if (!id) return undefined;
    const f = this.referenceDataStore.facilities().find((x: any) => x.facilityId === id);
    return f?.facilityName || f?.facilityId || id;
  });

  readonly canApprove = computed(() => this.statusItem()?.statusId === 'ORDER_CREATED');
  readonly canPicklist = computed(() =>
    this.statusItem()?.statusId === 'ORDER_APPROVED'
    && this.reservationStatus()?.fullyReserved === true
    && this.picklists().length === 0
  );
  readonly canReceive = computed(() => this.statusItem()?.statusId === 'ORDER_SHIPPED');
  readonly canCancel = computed(() => {
    const s = this.statusItem()?.statusId;
    return s === 'ORDER_CREATED' || s === 'ORDER_APPROVED';
  });
  readonly canMarkShipped = computed(() => this.statusItem()?.statusId === 'ORDER_APPROVED');
  readonly canOpenShipment = computed(() => this.shipments().length > 0);
  readonly canEditItems = computed(() => {
    const s = this.statusItem()?.statusId;
    return s === 'ORDER_CREATED' || s === 'ORDER_APPROVED';
  });
  readonly shipByLabel = computed(() => {
    const part = this.firstPart();
    const carrier = part?.carrierPartyId;
    const service = part?.carrierService || part?.shipmentMethodTypeId;
    if (carrier && service) {
      return `${carrier} @ ${service}`;
    }
    return service || carrier || undefined;
  });

  readonly overviewFields = computed(() => {
    const facilitiesMap = new Map(
      this.referenceDataStore.facilities().map((f: any) => [f.facilityId, f.facilityName || f.facilityId])
    );
    const fromId = this.fromFacilityId();
    const toId = this.toFacilityId();
    return [
      {
        label: 'COMMON.ORDER_ID',
        value: this.orderHeader()?.orderId,
      },
      {
        label: 'TRANSFER.ORDER_DATE',
        value: this.datePipe.transform(this.orderHeader()?.entryDate, 'MMMM d, y'),
      },
      {
        label: 'COMMON.STATUS',
        value: this.statusItem()?.description || this.statusItem()?.statusId,
        isStatus: true,
      },
      {
        label: 'TRANSFER.FROM_FACILITY',
        value: fromId ? (facilitiesMap.get(fromId) || fromId) : undefined,
      },
      {
        label: 'TRANSFER.TO_FACILITY',
        value: toId ? (facilitiesMap.get(toId) || toId) : undefined,
      },
      {
        label: 'COMMON.SHIPPING_METHOD',
        value: this.shipByLabel(),
      },
    ].filter((field) => field.value);
  });
  readonly statusHistoryEntries = computed<StatusHistoryEntry[]>(() =>
    this.orderStatusHistory().map((entry) => ({
      statusId: entry?.statusId,
      statusLabel: entry?.statusId ? this.getStatusDescription(entry.statusId) : '-',
      changedAt: entry?.statusDatetime,
      changedBy: entry?.statusUserLogin,
      reason: entry?.changeReason,
    }))
  );

  readonly reservationFields = computed(() => {
    const reservation = this.reservationStatus();
    if (!reservation) {
      return [];
    }
    return [
      {
        label: 'TRANSFER.RESERVATION_READY',
        value: reservation.fullyReserved ? this.translate.instant('COMMON.YES') : this.translate.instant('COMMON.NO'),
      },
      {
        label: 'TRANSFER.HAS_BACKORDER',
        value: reservation.hasBackorder ? this.translate.instant('COMMON.YES') : this.translate.instant('COMMON.NO'),
      },
    ];
  });

  itemColumns = [
    { key: 'orderItemSeqId', label: 'COMMON.ITEM_SEQ_ID' },
    { key: 'productId', label: 'COMMON.PRODUCT_ID' },
    { key: 'quantity', label: 'COMMON.QUANTITY' },
    { key: 'statusDescription', label: 'COMMON.STATUS' },
    { key: 'action', label: 'COMMON.ACTION' },
  ];
  itemColumnKeys = this.itemColumns.map((c) => c.key);
  picklistColumns = ['picklistId', 'statusId', 'shipmentId', 'createdDate', 'action'];
  shipmentColumns = ['shipmentId', 'statusId', 'estimatedShipDate', 'action'];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private datePipe: DatePipe,
    private referenceDataStore: ReferenceDataStore,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.referenceDataStore.ensureFacilitiesLoaded();
    this.route.params
      .pipe(
        map((params) => params['id'] as string),
        filter((id) => !!id),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((id) => {
        this.orderPrimaryId = id;
        this.loadOrder(id);
      });
  }

  private loadOrder(id: string): void {
    this.isLoading.set(true);

    forkJoin({
      displayInfo: this.orderService.getOrderDisplayInfoById(id),
      orderDetail: this.orderService.getOrderById(id),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError(() => {
          this.snackbarService.showError(this.translate.instant('TRANSFER.ERROR_LOAD'));
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        if (!result) return;

        const displayInfo: OrderDisplayInfoResponse = result.displayInfo;
        const orderDetail: OrderDetailResponse = result.orderDetail;

        this.orderHeader.set(displayInfo.orderHeader || null);
        this.statusItem.set(displayInfo.statusItem || null);
        this.orderStatusHistory.set(Array.isArray(displayInfo.orderStatusList) ? displayInfo.orderStatusList : []);
        this.orderId = displayInfo.orderHeader?.orderId;

        // From facility comes from the order header's originFacilityId field
        const firstPart: OrderPartSummary | undefined =
          displayInfo.firstPart || displayInfo.firstPartInfo;
        this.fromFacilityId.set(
          firstPart?.originFacilityId
          || (displayInfo.orderHeader as Record<string, unknown>)?.['originFacilityId'] as
            | string
            | undefined
        );
        this.toFacilityId.set(firstPart?.facilityId);

        this.fromAddress.set(displayInfo.originFacilityAddress || null);
        this.toAddress.set(displayInfo.facilityAddress || null);
        this.shipments.set(displayInfo.shipments || []);
        this.firstPart.set(firstPart || null);
        this.picklists.set(displayInfo.picklists || []);
        this.reservationStatus.set(displayInfo.reservationStatus || null);

        // Collect all items from all parts
        const allItems: OrderPartItemSummary[] = (orderDetail.parts || []).flatMap(
          (part: OrderPartSummary) => (part.items as OrderPartItemSummary[]) || []
        );
        this.orderItems.set(allItems);
      });
  }

  getStatusDescription(statusId?: string | null): string {
    const normalized = String(statusId || '').trim();
    if (!normalized) {
      return '-';
    }
    return normalized
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  approve(): void {
    if (!this.orderId) return;
    this.isLoading.set(true);
    this.orderService
      .updateOrderStatus(this.orderId, 'ORDER_APPROVED')
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('TRANSFER.APPROVED'));
          if (this.orderPrimaryId) this.loadOrder(this.orderPrimaryId);
        },
        error: (err: HttpErrorResponse) => {
          const msg = err?.error?.detail || err?.error?.message || this.translate.instant('TRANSFER.APPROVE_ERROR');
          this.snackbarService.showError(msg);
        },
      });
  }

  markShipped(): void {
    if (!this.orderId) return;
    this.isLoading.set(true);
    this.orderService
      .createTransferShipment(this.orderId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('TRANSFER.SHIPPED'));
          if (this.orderPrimaryId) this.loadOrder(this.orderPrimaryId);
        },
        error: (err: HttpErrorResponse) => {
          const msg = err?.error?.detail || err?.error?.message || this.translate.instant('TRANSFER.SHIP_ERROR');
          this.snackbarService.showError(msg);
        },
      });
  }

  createPicklist(): void {
    if (!this.orderId || !this.canPicklist()) return;
    this.isLoading.set(true);
    this.orderService
      .createPicklist(this.orderId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          const picklistId = (response as { picklistId?: string })?.picklistId;
          if (picklistId) {
            this.router.navigate(['/picklists', picklistId]);
            return;
          }
          if (this.orderPrimaryId) this.loadOrder(this.orderPrimaryId);
        },
        error: (err: HttpErrorResponse) => {
          const msg = err?.error?.detail || err?.error?.message || this.translate.instant('TRANSFER.ERROR_STATUS');
          this.snackbarService.showError(msg);
        },
      });
  }

  receive(): void {
    if (this.orderPrimaryId) {
      this.router.navigate([`/transfers/${this.orderPrimaryId}/receive`]);
    }
  }

  cancel(): void {
    if (!this.orderId) return;
    this.isLoading.set(true);
    this.orderService
      .updateOrderStatus(this.orderId, 'ORDER_CANCELLED')
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('TRANSFER.CANCEL_SUCCESS'));
          if (this.orderPrimaryId) this.loadOrder(this.orderPrimaryId);
        },
        error: (err: HttpErrorResponse) => {
          const msg = err?.error?.detail || err?.error?.message || this.translate.instant('TRANSFER.CANCEL_ERROR');
          this.snackbarService.showError(msg);
        },
      });
  }

  goToCreatePicklist(): void {
    this.createPicklist();
  }

  openPicklist(picklistId?: string): void {
    if (!picklistId) return;
    this.router.navigate(['/picklists', picklistId]);
  }

  openShipment(shipmentId?: string): void {
    if (!shipmentId) return;
    this.router.navigate(['/shipments', shipmentId]);
  }

  editShippingInstructions(): void {
    const part = this.firstPart();
    const orderPartSeqId = part?.orderPartSeqId;
    if (!this.orderId || !orderPartSeqId) return;

    this.dialog.open(ShippingInstructionDialogComponent, {
      data: {
        titleKey: 'COMMON.SHIPPING_INSTRUCTIONS',
        shippingInstructions: part?.shippingInstructions || '',
      },
    }).afterClosed().subscribe((value: string | null) => {
      if (!value || value.trim() === '') return;
      this.orderService
        .updateShippingInstructions(this.orderId!, orderPartSeqId, value.trim())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          if (this.orderPrimaryId) this.loadOrder(this.orderPrimaryId);
        });
    });
  }

  formatAddress(addr: PostalAddress | null): string {
    if (!addr) return '';
    return [addr.address1, addr.address2, addr.city, addr.stateProvinceGeoId, addr.postalCode, addr.countryGeoId]
      .filter(Boolean)
      .join(', ');
  }

  getDisplayedReservedQuantity(item: any): number {
    const reserved = Number(item?.reservedQuantity || 0);
    const issued = Number(item?.issuedQuantity || 0);
    return Math.max(reserved - issued, 0);
  }

  addItemDialog(item: Partial<OrderPartItemSummary> | null = null): void {
    this.dialog.open(ProductItemComponent, {
      data: {
        productItemData: {
          ...item,
          orderId: this.orderId,
          orderPartSeqId: this.firstPart()?.orderPartSeqId || '00001',
          updateExisting: !!item?.orderItemSeqId,
        },
      },
    }).afterClosed().subscribe((result) => {
      if (result && this.orderPrimaryId) {
        this.loadOrder(this.orderPrimaryId);
      }
    });
  }

  editItem(item: OrderPartItemSummary): void {
    this.addItemDialog({
      ...item,
      unitAmount: item.unitAmount ?? 0,
    });
  }

  cancelItem(item: OrderPartItemSummary): void {
    if (!this.orderId || !item?.orderItemSeqId) return;
    this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRMATION'),
        message: this.translate.instant('TRANSFER.CANCEL_ITEM_CONFIRM'),
      },
    }).afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.orderService.cancelOrderItem(this.orderId!, item.orderItemSeqId!).subscribe({
        next: () => {
          if (this.orderPrimaryId) {
            this.loadOrder(this.orderPrimaryId);
          }
        },
      });
    });
  }

  trackByItemColumn = (_: number, col: { key: string }): string => col.key;
  trackByItem = (_: number, item: OrderPartItemSummary): string | number =>
    item?.orderItemSeqId ?? _;
  trackByShipment = (_: number, s: ShipmentSummary): string => s?.shipmentId ?? String(_);
  trackByPicklist = (_: number, p: { picklistId?: string }): string => p?.picklistId ?? String(_);
}

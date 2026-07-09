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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, effect, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '@ofbiz/services/order/order.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { DatePipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { AddEditAddressComponent } from '@ofbiz/components/party/add-edit-address/add-edit-address.component';
import { ContentComponent } from '../../order/content/content.component';
import { NoteComponent } from '../../order/note/note.component';
import { ProductItemComponent } from '../../order/product-item/product-item.component';
import { ShippingInstructionDialogComponent } from '../../order/shipping-instruction-dialog/shipping-instruction-dialog.component';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { DateUpdateDialogComponent } from '../../common/date-update-dialog/date-update-dialog.component';
import { combineLatest, forkJoin, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, finalize, map, tap } from 'rxjs/operators';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { StatusHistoryEntry } from '../../common/status-history/status-history-icon.component';
import {
  InvoiceSummary,
  OrderAdjustmentSummary,
  OrderContentSummary,
  OrderDetailResponse,
  OrderDisplayInfoResponse,
  OrderHeaderSummary,
  OrderIdentificationSummary,
  OrderItemTypeLookupItem,
  OrderNoteSummary,
  OrderPartItemSummary,
  OrderPartSummary,
  OrderPaymentPreferenceSummary,
  OrderStatusHistoryEntry,
  OrderStatusSummary,
  OrderTermSummary,
  ReturnSummary,
  ShipmentSummary,
  ShipmentTypeLookupItem,
  StatusLookupItem,
} from '@ofbiz/models/order.model';
import { PostalAddress } from '@ofbiz/models/party.model';

type OrderDialogResult = { id?: string; orderId?: string } | null | undefined;
type ProductItemDialogData = Partial<OrderPartItemSummary> & { updateExisting?: boolean; orderId?: string };

interface StatusChange {
  statusIdTo?: string;
  transitionName?: string;
  description?: string;
}

@Component({
  standalone: false,
  selector: 'app-po-detail',
  templateUrl: './po-detail.component.html',
  styleUrls: ['./po-detail.component.css'],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PODetailComponent implements OnInit {
  private readonly statusFallbackMap = new Map<string, string>([
    ['ORDER_INSPECTION_PENDING', 'Inspection Pending'],
    ['ITEM_INSPECTION_PENDING', 'Inspection Pending'],
    ['PART_INSPECTION_PENDING', 'Inspection Pending'],
    ['INV_INSP_PENDING', 'Inspection Pending'],
  ]);
  orderId: string | undefined;
  orderPrimaryId: string | undefined;
  isQuoteMode = false;
  listBasePath = '/pos';
  relatedOrderPrimaryId: number | null = null;
  relatedOrderId: string | null = null;
  relatedOrderTypeId: string | null = null;
  readonly orderHeader = signal<OrderHeaderSummary | null>(null);
  readonly statusItem = signal<OrderStatusSummary | null>(null);
  readonly vendorAddresses = signal<PostalAddress[]>([]);
  readonly vendorName = signal<string | undefined>(undefined);
  readonly currencyInfo = signal<OrderDisplayInfoResponse['currencyInfo']>(undefined);
  readonly vendorTaxProfile = signal<OrderDisplayInfoResponse['vendorTaxProfile']>(undefined);
  readonly facilityAddress = signal<PostalAddress | null>(null);
  readonly orderShipToAddress = signal<PostalAddress | null>(null);
  vendorPartyId: string | undefined;
  readonly canApprove = signal(false);
  readonly canReceive = signal(false);
  readonly canEditItems = signal(false);

  addPOItemDialog: boolean = false;
  createOrderNoteDialog: boolean = false;
  readonly isLoading = signal(false);
  readonly itemSubtotal = signal(0);
  readonly shippingTotal = signal(0);
  readonly discountTotal = signal(0);
  readonly orderTotal = signal(0);

  pages: number = 0;

  readonly orderNotes = signal<OrderNoteSummary[]>([]);
  readonly orderStatusHistory = signal<OrderStatusHistoryEntry[]>([]);
  readonly orderIdentifications = signal<OrderIdentificationSummary[]>([]);
  readonly orderAdjustments = signal<OrderAdjustmentSummary[]>([]);
  noteColumns = [
    { key: 'noteText', label: this.translate.instant('COMMON.NOTE') },
    { key: 'noteDate', label: this.translate.instant('COMMON.DATE') },
    { key: 'userId', label: this.translate.instant('COMMON.CREATED_BY') },
    { key: 'action', label: this.translate.instant('COMMON.ACTION') }
  ];
  noteColumnKeys: string[] = this.noteColumns.map(c => c.key);

  readonly parts = signal<OrderPartSummary[]>([]);
  partColumns = [
    { key: 'productId', label: this.translate.instant('COMMON.PRODUCT_ID') },
    { key: 'productName', label: this.translate.instant('COMMON.PRODUCT_NAME') },
    { key: 'itemDescription', label: this.translate.instant('PO.ITEM_DESCRIPTION') },
    { key: 'description', label: this.translate.instant('COMMON.TYPE') },
    { key: 'requiredByDate', label: this.translate.instant('COMMON.REQUIRED_BY_DATE') },
    { key: 'unitAmount', label: this.translate.instant('COMMON.PRICE') },
    { key: 'quantity', label: this.translate.instant('COMMON.QUANTITY') },
    { key: 'totalAmount', label: this.translate.instant('COMMON.TOTAL_AMOUNT') },
    { key: 'action', label: this.translate.instant('COMMON.ACTION') }
  ];
  partColumnKeys: string[] = this.partColumns.map(c => c.key);

  readonly contents = signal<OrderContentSummary[]>([]);
  contentColumns = [
    { key: 'description', label: this.translate.instant('PO.TITLE_COL') },
    { key: 'contentDate', label: this.translate.instant('PO.CONTENT_COL') },
    { key: 'contentLocation', label: this.translate.instant('PO.MIME_TYPE') }
  ];
  contentColumnKeys: string[] = this.contentColumns.map(c => c.key);

  readonly shipments = signal<ShipmentSummary[]>([]);
  shipmentColumns = [
    { key: 'shipmentId', label: this.translate.instant('COMMON.SHIPMENT') },
    { key: 'shipmentTypeId', label: this.translate.instant('COMMON.TYPE') },
    { key: 'statusId', label: this.translate.instant('COMMON.STATUS') },
    { key: 'createdDate', label: this.translate.instant('COMMON.CREATED') }
  ];
  shipmentColumnKeys: string[] = this.shipmentColumns.map(c => c.key);

  readonly invoiceItems = signal<Array<{ id?: string | number; invoiceId?: string; currencyUomId?: string; productId?: string; quantity?: number; amount?: number }>>([]);
  invoiceColumns = [
    { key: 'invoiceId', label: this.translate.instant('COMMON.INVOICE') },
    { key: 'productId', label: this.translate.instant('COMMON.PRODUCT') },
    { key: 'quantity', label: this.translate.instant('COMMON.QTY') },
    { key: 'amount', label: this.translate.instant('PO.AMOUNT') }
  ];
  invoiceColumnKeys: string[] = this.invoiceColumns.map(c => c.key);
  readonly returnItems = signal<ReturnSummary[]>([]);
  readonly receipts = signal<any[]>([]);
  receiptColumns = ['receiptId', 'productId', 'orderItemSeqId', 'quantityAccepted', 'datetimeReceived', 'locationSeqId'];
  returnColumns = [
    { key: 'returnId', label: this.translate.instant('MENU.RETURNS') },
    { key: 'returnType', label: this.translate.instant('COMMON.TYPE') },
    { key: 'status', label: this.translate.instant('COMMON.STATUS') },
    { key: 'entryDate', label: this.translate.instant('COMMON.DATE') },
    { key: 'totalAmount', label: this.translate.instant('PO.AMOUNT') }
  ];
  returnColumnKeys: string[] = this.returnColumns.map(c => c.key);

  readonly shopifyOrderId = computed(() => {
    const match = this.orderIdentifications()
      .find((item) => (item?.orderIdentificationTypeId || '').toUpperCase() === 'SHOPIFY_ORDER_ID');
    return this.formatShopifyOrderId(match?.idValue);
  });
  readonly overviewFields = computed(() => [
    { label: 'COMMON.ID', value: this.orderHeader()?.orderId },
    { label: 'PO.SHOPIFY_ORDER_ID', value: this.shopifyOrderId() },
    { label: 'COMMON.EXTERNAL_ID', value: this.orderHeader()?.externalId },
    { label: 'PO.ORDER_TYPE', value: this.orderHeader()?.orderTypeId },
    { label: 'PO.ORDER_DATE', value: this.datePipe.transform(this.orderHeader()?.entryDate, 'MMMM d, y') },
    { label: 'COMMON.STATUS', value: this.getCurrentOrderStatusDescription(), isStatus: true },
  ].filter(field => field.value && !(field.label === 'COMMON.EXTERNAL_ID' && field.value === this.shopifyOrderId())));
  readonly statusHistoryEntries = computed<StatusHistoryEntry[]>(() =>
    this.orderStatusHistory().filter((entry) => this.isHeaderStatusHistoryEntry(entry)).map((entry) => ({
      statusId: entry?.statusId,
      statusLabel: this.getHistoryStatusDescription(entry),
      changedAt: entry?.statusDatetime,
      changedBy: entry?.statusUserLogin,
      reason: entry?.changeReason,
    }))
  );
  readonly orderTerms = signal<OrderTermSummary[]>([]);
  readonly orderPaymentPreferences = signal<OrderPaymentPreferenceSummary[]>([]);
  termColumns: string[] = ['termTypeId', 'termValue', 'termDays'];
  preferenceColumns: string[] = ['paymentMethodTypeId', 'statusId', 'maxAmount'];
  readonly statusDescriptionMap = signal(new Map<string, string>());
  readonly shipmentTypeMap = signal(new Map<string, string>());
  readonly orderItemTypeMap = signal(new Map<string, string>());
  readonly productNameMap = signal(new Map<string, string>());
  private readonly routeData = toSignal(
    combineLatest([this.route.data, this.route.parent?.data ?? of({} as Record<string, unknown>)]).pipe(
      map(([childData, parentData]) => ({ ...parentData, ...childData }))
    ),
    { initialValue: { ...this.route.parent?.snapshot.data, ...this.route.snapshot.data } }
  );
  private readonly routeKey = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') || ''),
      filter((id) => id.length > 0),
      distinctUntilChanged()
    ),
    { initialValue: this.route.snapshot.paramMap.get('id') || '' }
  );
  private readonly routeBootstrapEffect = effect(() => {
    const data = this.routeData();
    this.isQuoteMode = !!data['isQuoteMode'];
    this.listBasePath = this.isQuoteMode ? '/pos/quotes' : '/pos';
    const routeKey = this.routeKey();
    if (!routeKey) {
      return;
    }
    this.orderPrimaryId = routeKey;
    this.getOrderById(routeKey).subscribe();
  });

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private partyService: PartyService,
    private dialog: MatDialog,
    private router: Router,
    private datePipe: DatePipe,
    private translate: TranslateService,
    private commonService: CommonService,
    private productService: ProductService,
    private renderScheduler: RenderSchedulerService,
    private snackbarService: SnackbarService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadLookupData();
  }

  getOrderById(routeKey: string, showLoader: boolean = true) {
    if (showLoader) {
      this.renderScheduler.defer(() => {
        this.isLoading.set(true);
        this.cdr.markForCheck();
      });
    }

    const usePrimaryId = this.isNumericIdentifier(routeKey);
    const orderResponse$ = usePrimaryId
      ? this.orderService.getOrderById(routeKey)
      : this.orderService.getOrder(routeKey);
    const displayInfo$ = usePrimaryId
      ? this.orderService.getOrderDisplayInfoById(routeKey)
      : this.orderService.getPODisplayInfo(routeKey);

    return forkJoin({
      orderResponse: orderResponse$.pipe(catchError(() => of(null))),
      displayInfo: displayInfo$.pipe(catchError(() => of(null))),
    }).pipe(
      tap(({ orderResponse, displayInfo }: { orderResponse: OrderDetailResponse | null; displayInfo: OrderDisplayInfoResponse | null }) => {
        if (!orderResponse) {
          return;
        }

        const parts = orderResponse.parts || [];
        this.parts.set(parts);
        this.primeProductNames(parts);
        this.contents.set(orderResponse.contents || []);

        if (displayInfo) {
          this.applyDisplayInfo(displayInfo);
        }
        if (this.orderId) {
          this.loadValidStatusChanges();
          this.applyRelatedDocuments(displayInfo);
        }
        this.cdr.markForCheck();
      }),
      finalize(() => {
        if (!showLoader) {
          return;
        }
        this.isLoading.set(false);
        this.cdr.markForCheck();
      })
    );
  }

  private isNumericIdentifier(value: string): boolean {
    return /^\d+$/.test(String(value || '').trim());
  }

  private applyDisplayInfo(displayInfo: OrderDisplayInfoResponse): void {
    this.currencyInfo.set(displayInfo.currencyInfo);
    this.vendorTaxProfile.set(displayInfo.vendorTaxProfile);
    this.orderHeader.set(displayInfo.orderHeader || null);
    this.orderId = this.orderHeader()?.orderId;
    this.loadOrderIdentifications(this.orderId);
    this.loadOrderReceipts(this.orderId);
    this.relatedOrderPrimaryId = displayInfo?.relatedOrderPrimaryId ?? null;
    this.relatedOrderId = displayInfo?.relatedOrderId ?? null;
    this.relatedOrderTypeId = displayInfo?.relatedOrderTypeId ?? null;
    this.statusItem.set(displayInfo.statusItem || null);
    this.orderStatusHistory.set(Array.isArray(displayInfo.orderStatusList) ? displayInfo.orderStatusList : []);
    this.orderNotes.set(displayInfo.orderNoteList || []);
    this.orderTerms.set(displayInfo.orderTermList || []);
    this.orderPaymentPreferences.set(displayInfo.orderPaymentPreferenceList || []);
    this.orderAdjustments.set(displayInfo.orderAdjustmentList || []);
    this.calculateSummary(displayInfo.orderAdjustmentList || []);
    this.canApprove.set(this.statusItem()?.statusId === 'ORDER_CREATED');
    this.canReceive.set(!this.isQuoteMode && this.statusItem()?.statusId === 'ORDER_APPROVED');
    this.canEditItems.set(this.statusItem()?.statusId === 'ORDER_CREATED'
      || this.statusItem()?.statusId === 'ORDER_APPROVED');

    if (displayInfo?.firstPart?.vendorPartyId) {
      this.vendorPartyId = displayInfo.firstPart.vendorPartyId;
      this.loadVendorDetails(displayInfo.firstPart.vendorPartyId);
    }

    this.facilityAddress.set(displayInfo?.facilityAddress || null);

    const shippingContacts = (displayInfo?.orderContactMechList || [])
      .filter((contact) => (contact?.contactMechPurposeTypeId || '').toUpperCase() === 'SHIPPING_LOCATION');
    this.orderShipToAddress.set(shippingContacts.length ? (shippingContacts[0]?.postalAddress || null) : null);
  }

  private applyRelatedDocuments(displayInfo: OrderDisplayInfoResponse | null): void {
    if (this.isQuoteMode) {
      this.renderScheduler.defer(() => {
        this.shipments.set([]);
        this.invoiceItems.set([]);
        this.returnItems.set([]);
        this.cdr.markForCheck();
      });
      return;
    }
    const shipmentList = Array.isArray(displayInfo?.shipments) ? displayInfo.shipments : [];
    const invoiceList = Array.isArray(displayInfo?.invoices) ? displayInfo.invoices : [];
    const invoiceItems = invoiceList.flatMap((invoice: InvoiceSummary) =>
      (invoice.items || []).map((item) => ({
        id: invoice.id,
        invoiceId: invoice.invoiceId,
        currencyUomId: invoice.currencyUomId,
        productId: item.productId,
        quantity: item.quantity,
        amount: item.amount
      }))
    );
    const returnList = Array.isArray(displayInfo?.returns) ? displayInfo.returns : [];
    this.renderScheduler.defer(() => {
      this.shipments.set(shipmentList);
      this.invoiceItems.set(invoiceItems);
      this.returnItems.set(returnList);
      this.cdr.markForCheck();
    });
  }

  private loadOrderIdentifications(orderId: string | undefined): void {
    this.orderIdentifications.set([]);
    if (!orderId) {
      return;
    }
    this.orderService.getOrderIdentifications(orderId)
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (items) => {
          this.orderIdentifications.set(Array.isArray(items) ? items : []);
          this.cdr.markForCheck();
        },
      });
  }

  private loadOrderReceipts(orderId: string | undefined): void {
    this.receipts.set([]);
    if (!orderId) {
      return;
    }
    this.orderService.getOrderReceipts(orderId)
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (items) => {
          this.receipts.set(Array.isArray(items) ? items : []);
          this.cdr.markForCheck();
        },
      });
  }

  private formatShopifyOrderId(value: string | undefined): string | undefined {
    const raw = String(value || '').trim();
    if (!raw) {
      return undefined;
    }
    const gidPrefix = 'gid://shopify/Order/';
    return raw.startsWith(gidPrefix) ? raw.slice(gidPrefix.length) : raw;
  }

  private silentRefresh(): void {
    if (!this.orderPrimaryId) {
      return;
    }
    this.getOrderById(this.orderPrimaryId, false).subscribe();
  }

  private calculateSummary(adjustments: OrderAdjustmentSummary[]): void {
    const shipping = adjustments
      .filter((adj) => adj?.orderAdjustmentTypeId === 'SHIPPING_CHARGES')
      .reduce((sum, adj) => sum + Number(adj?.amount ?? 0), 0);

    const discount = adjustments
      .filter((adj) => adj?.orderAdjustmentTypeId === 'DISCOUNT_ADJUSTMENT')
      .reduce((sum, adj) => sum + Number(adj?.amount ?? 0), 0);

    const itemSubtotal = this.parts()
      .reduce((sum, part) => sum + Number(part?.partTotal ?? 0), 0);

    this.shippingTotal.set(shipping);
    this.discountTotal.set(discount);
    this.itemSubtotal.set(itemSubtotal);
    this.orderTotal.set(itemSubtotal + shipping + discount);
  }

  editItem(item: OrderPartItemSummary): void {
    if (!this.canManageOrderItems(item)) {
      return;
    }
    this.addItemDialog({
      ...item,
      updateExisting: true
    });
  }

  cancelItem(item: OrderPartItemSummary): void {
    if (!this.orderId || !item?.orderItemSeqId) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRM'),
        message: this.translate.instant('COMMON.CONFIRM_CANCEL_ITEM'),
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.orderService.cancelOrderItem(this.orderId!, item.orderItemSeqId as string).subscribe({
        next: () => {
          if (this.orderPrimaryId) {
            this.silentRefresh();
          }
        },
      });
    });
  }

  completeItem(item: OrderPartItemSummary): void {
    if (!this.orderId || !item?.orderItemSeqId) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRMATION'),
        message: `Complete order item ${item.orderItemSeqId}?`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.orderService.completeOrderItem(this.orderId!, item.orderItemSeqId as string).subscribe({
        next: () => {
          if (this.orderPrimaryId) {
            this.silentRefresh();
          }
        },
      });
    });
  }

  getRowClass(row: OrderPartItemSummary): string {
    if (row?.statusId === 'ITEM_CANCELLED') {
      return 'status-cancelled';
    }
    if (row?.statusId === 'ITEM_COMPLETED') {
      return 'status-completed';
    }
    return '';
  }

  loadLookupData(): void {
    forkJoin({
      statusItems: this.commonService.getAllStatusItems().pipe(catchError(() => of([]))),
      shipmentTypes: this.commonService.getShipmentTypes().pipe(catchError(() => of([]))),
      orderItemTypes: this.commonService.getOrderItemTypes().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ statusItems, shipmentTypes, orderItemTypes }) => {
        this.statusDescriptionMap.set(new Map(
          (Array.isArray(statusItems) ? statusItems : [])
            .filter((item: StatusLookupItem) => !!item.statusId)
            .map((item: StatusLookupItem) => [item.statusId as string, item.description || item.statusId || ''])
        ));
        this.shipmentTypeMap.set(new Map(
          (Array.isArray(shipmentTypes) ? shipmentTypes : [])
            .filter((item: ShipmentTypeLookupItem) => !!item.shipmentTypeId)
            .map((item: ShipmentTypeLookupItem) => [item.shipmentTypeId as string, item.description || item.shipmentTypeId || ''])
        ));
        this.orderItemTypeMap.set(new Map(
          (Array.isArray(orderItemTypes) ? orderItemTypes : [])
            .filter((item: OrderItemTypeLookupItem) => !!item.orderItemTypeId)
            .map((item: OrderItemTypeLookupItem) => [
              item.orderItemTypeId as string,
              item.description || item.orderItemTypeId || '',
            ])
        ));
      },
    });
  }

  getStatusDescription(statusId?: string): string {
    const normalized = String(statusId || '').trim();
    if (!normalized) {
      return '-';
    }
    return this.statusDescriptionMap().get(normalized)
      || this.statusDescriptionMap().get(normalized.toUpperCase())
      || this.statusFallbackMap.get(normalized.toUpperCase())
      || normalized;
  }

  private getCurrentOrderStatusDescription(): string {
    const status = this.statusItem();
    return status?.description || this.getStatusDescription(status?.statusId);
  }

  private getHistoryStatusDescription(entry?: OrderStatusHistoryEntry | null): string {
    return entry?.description || entry?.statusDescription || this.getStatusDescription(entry?.statusId);
  }

  private isHeaderStatusHistoryEntry(entry?: OrderStatusHistoryEntry | null): boolean {
    const statusId = String(entry?.statusId || '').trim().toUpperCase();
    return !entry?.orderItemSeqId && !statusId.startsWith('ITEM_');
  }

  getShipmentTypeDescription(shipmentTypeId: string): string {
    return this.shipmentTypeMap().get(shipmentTypeId) || shipmentTypeId;
  }

  getOrderItemTypeDescription(orderItemTypeId?: string): string {
    if (!orderItemTypeId) {
      return '';
    }
    return this.orderItemTypeMap().get(orderItemTypeId) || orderItemTypeId;
  }

  getProductName(item: OrderPartItemSummary): string {
    const productId = item?.productId;
    return this.firstResolvedDisplayValue(
      productId || '',
      this.productNameMap().get(productId || ''),
      item?.product?.productName,
      item?.product?.internalName,
      item?.productName,
      item?.itemDescription,
      productId
    );
  }

  private primeProductNames(parts: OrderPartSummary[]): void {
    const ids = new Set<string>();
    const productNameMap = new Map(this.productNameMap());
    (parts || []).forEach((part) => {
      (part.items || []).forEach((item) => {
        const productId = item?.productId;
        if (!productId) {
          return;
        }
        const name = this.firstResolvedDisplayValue(
          productId,
          item?.product?.productName,
          item?.product?.internalName,
          item?.productName,
          item?.itemDescription
        );
        if (this.isResolvedDisplayValue(name, productId)) {
          productNameMap.set(productId, name);
        } else {
          ids.add(productId);
        }
      });
    });

    this.productNameMap.set(productNameMap);

    const missing = Array.from(ids).filter((id) => !productNameMap.has(id));
    if (missing.length === 0) {
      return;
    }
    this.productService.getProductsByIds(missing).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (products) => {
        const productList = Array.isArray(products) ? products : [];
        const nameById = new Map<string, string>(
          productList.map((product: { productId?: string; productName?: string; internalName?: string; name?: string }) => [
            this.normalizeKey(product?.productId),
            this.firstResolvedDisplayValue(
              this.normalizeKey(product?.productId),
              product?.productName,
              product?.internalName,
              product?.name
            )
          ])
        );

        missing.forEach((productId) => {
          const resolvedName = this.firstResolvedDisplayValue(
            productId,
            nameById.get(productId),
            productId
          );
          productNameMap.set(productId, resolvedName || productId);
        });
        this.productNameMap.set(productNameMap);
      },
    });
  }

  private normalizeKey(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim();
  }

  private isResolvedDisplayValue(value: unknown, idHint?: string): boolean {
    const normalized = this.normalizeKey(value);
    if (!normalized) {
      return false;
    }
    const id = this.normalizeKey(idHint);
    if (!id) {
      return true;
    }
    return normalized.toLowerCase() !== id.toLowerCase();
  }

  private firstResolvedDisplayValue(idHint: string, ...values: unknown[]): string {
    for (const value of values) {
      if (this.isResolvedDisplayValue(value, idHint)) {
        return this.normalizeKey(value);
      }
    }
    return this.normalizeKey(idHint);
  }

  getCurrencyUom(): string {
    return this.orderHeader()?.currencyUomId || this.orderHeader()?.currencyUom || 'USD';
  }

  canManageOrderItems(item?: Partial<OrderPartItemSummary> | null): boolean {
    if (!this.canEditItems()) {
      return false;
    }
    if (!item) {
      return true;
    }
    const itemStatusId = String(item.statusId || '').toUpperCase();
    return itemStatusId !== 'ITEM_CANCELLED' && itemStatusId !== 'ITEM_COMPLETED';
  }

  canCreateReturn(): boolean {
    return !this.isQuoteMode
      && String(this.statusItem()?.statusId || '').toUpperCase() === 'ORDER_COMPLETED'
      && !!this.orderHeader()?.orderId;
  }

  goToCreateReturn(): void {
    if (!this.canCreateReturn()) {
      return;
    }
    this.router.navigate(['/returns/create'], {
      queryParams: {
        orderId: this.orderHeader()?.orderId,
        orderTypeId: 'PURCHASE_ORDER',
      },
    });
  }

  addItemDialog(params: ProductItemDialogData | null = null): void {
    if (!this.canManageOrderItems(params)) {
      return;
    }
    const productItemData: ProductItemDialogData = {
      ...params,
      orderId: this.orderId,
    };

    this.dialog
      .open(ProductItemComponent, {
        data: { productItemData },
      })
      .afterClosed()
      .subscribe((result: OrderDialogResult) => {
        if (result && this.orderId) {
          if (this.orderPrimaryId) {
            this.silentRefresh();
          }
        }
      });
  }

  addUpdateNoteDialog(params: Partial<OrderNoteSummary> | null = null): void {
    const noteData = {
      ...params,
      orderId: this.orderId,
    };

    this.dialog
      .open(NoteComponent, { data: { noteData } })
      .afterClosed()
      .subscribe((result: (OrderDialogResult & OrderNoteSummary) | undefined) => {
        if (result?.id) {
          const notes = this.orderNotes();
          const index = notes.findIndex((note) => note?.id === result.id);
          if (index >= 0) {
            const updated = [...notes];
            updated[index] = { ...updated[index], ...result };
            this.orderNotes.set(updated);
          } else {
            this.orderNotes.set([result, ...notes]);
          }
        }
        if (result !== undefined) {
          this.syncOrderNotes();
        }
      });
  }

  deleteNote(note: OrderNoteSummary): void {
    if (!this.orderId || !note?.id) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRM'),
        message: this.translate.instant('COMMON.CONFIRM_DELETE'),
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.orderService.deleteOrderNote({ orderId: this.orderId, noteId: note.id }).subscribe({
        next: () => {
          this.orderNotes.set(this.orderNotes().filter((item) => item?.id !== note.id));
          this.syncOrderNotes();
        },
      });
    });
  }

  private syncOrderNotes(): void {
    if (!this.orderId && !this.orderPrimaryId) {
      return;
    }
    const request = this.orderPrimaryId
      ? this.orderService.getOrderDisplayInfoById(this.orderPrimaryId)
      : this.orderService.getPODisplayInfo(this.orderId as string);
    request.subscribe({
      next: (displayInfo) => {
        const notes = displayInfo?.orderNoteList || [];
        this.renderScheduler.defer(() => {
          this.orderNotes.set(notes);
          this.cdr.markForCheck();
        });
      },
    });
  }

  addUpdateContentDialog(params: Partial<OrderContentSummary> | null = null): void {
    const contentData = {
      ...params,
      orderId: this.orderId,
    };

    this.dialog
      .open(ContentComponent, { data: { contentData } })
      .afterClosed()
      .subscribe((result: OrderDialogResult) => {
        if (result && this.orderId) {
          if (this.orderPrimaryId) {
            this.silentRefresh();
          }
        }
      });
  }

  editShippingInstructions(part: OrderPartSummary): void {
    if (!this.orderId || !part?.orderPartSeqId) {
      return;
    }
    this.dialog.open(ShippingInstructionDialogComponent, {
      data: {
        titleKey: 'COMMON.SHIPPING_INSTRUCTIONS',
        shippingInstructions: part?.shippingInstructions || '',
      },
    }).afterClosed().subscribe((value) => {
      const orderPartSeqId = part?.orderPartSeqId;
      if (value === null || value === undefined || !orderPartSeqId) {
        return;
      }
      this.orderService.updateShippingInstructions(this.orderId as string, orderPartSeqId, value)
        .subscribe(() => {
          if (this.orderPrimaryId) {
            this.silentRefresh();
          }
        });
    });
  }

  updateShipBeforeDate(part: OrderPartSummary): void {
    const orderPartSeqId = part?.orderPartSeqId;
    if (!this.orderId || !orderPartSeqId) {
      return;
    }
    this.dialog.open(DateUpdateDialogComponent, {
      data: {
        title: 'Update Ship Before Date',
        date: part.shipBeforeDate
      }
    }).afterClosed().subscribe((newDate) => {
      if (newDate) {
        this.orderService.updateShipGroupShipBeforeDate(this.orderId!, orderPartSeqId!, newDate).subscribe(() => {
          this.silentRefresh();
        });
      }
    });
  }

  formatShipBeforeDate(value: string | number | Date | null | undefined): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string' && value.length === 10) {
      return this.datePipe.transform(`${value}T00:00:00Z`, 'MMMM d, y', 'UTC') || value;
    }
    return this.datePipe.transform(value, 'MMMM d, y') || String(value);
  }

  openOrderContent(item: OrderContentSummary): void {
    if (!this.orderId || !item?.contentId) {
      return;
    }
    this.orderService.downloadOrderContent(this.orderId, item.contentId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: () => {
      },
    });
  }

  loadVendorDetails(partyId: string): void {
    this.partyService.getSupplier(partyId).subscribe({
      next: (response) => {
        const supplierDetail = response?.supplierDetail;
        const vendorName = supplierDetail?.party?.groupName || partyId;
        const addresses = Array.isArray(supplierDetail?.postalAddressList)
          ? supplierDetail.postalAddressList
          : [];
        const preferredPurposeOrder = ['SHIP_ORIG_LOCATION', 'SHIPPING_LOCATION', 'PRIMARY_LOCATION'];
        let selected = null;
        for (const purpose of preferredPurposeOrder) {
          selected = addresses.find((address: PostalAddress) =>
            (address?.contactMechPurposeId || '').toUpperCase() === purpose
          );
          if (selected) {
            break;
          }
        }
        if (!selected && addresses.length) {
          selected = addresses[0];
        }
        const vendorAddresses = selected ? [selected] : [];
        this.renderScheduler.defer(() => {
          this.vendorName.set(vendorName);
          this.vendorAddresses.set(vendorAddresses);
        });
      },
      error: () => {
        this.renderScheduler.defer(() => {
          this.vendorName.set(partyId);
          this.vendorAddresses.set([]);
        });
      }
    });
  }

  addShipToAddress(): void {
    if (!this.orderId) {
      return;
    }
    const addressData = {
      orderId: this.orderId,
      contactMechPurposeId: 'SHIPPING_LOCATION',
    };

    this.dialog.open(AddEditAddressComponent, {
      data: { addressData },
    }).afterClosed().subscribe((result) => {
      if (result && this.orderId) {
        if (this.orderPrimaryId) {
          this.silentRefresh();
        }
      }
    });
  }

  editVendorAddress(address: PostalAddress | null = null): void {
    if (!this.vendorPartyId) {
      return;
    }
    const addressData = {
      partyId: this.vendorPartyId,
      contactMechId: address?.contactMechId,
      contactMechPurposeId: address?.contactMechPurposeId || 'PRIMARY_LOCATION',
      toName: address?.toName,
      address1: address?.address1,
      address2: address?.address2,
      city: address?.city,
      postalCode: address?.postalCode,
      countryGeoId: address?.countryGeoId,
      stateProvinceGeoId: address?.stateProvinceGeoId,
    };

    this.dialog.open(AddEditAddressComponent, {
      data: { addressData },
    }).afterClosed().subscribe((result) => {
      if (result && this.vendorPartyId) {
        this.loadVendorDetails(this.vendorPartyId);
      }
    });
  }

  approveOrder(): void {
    if (!this.orderId) {
      return;
    }
    this.orderService.approvePurchaseOrder(this.orderId).subscribe({
      next: () => {
        if (this.orderPrimaryId) {
          this.silentRefresh();
        }
      },
      error: (error) => {
        this.snackbarService.showError(this.getPurchaseOrderApprovalErrorMessage(error));
      },
    });
  }

  private getPurchaseOrderApprovalErrorMessage(error: any): string {
    const backendMessage = String(error?.error?.message || error?.error?.detail || error?.message || '').trim();
    const normalizedMessage = backendMessage.toLowerCase();
    if (
      normalizedMessage.includes('approval limit')
      || normalizedMessage.includes('no purchase order approval limit assigned')
      || normalizedMessage.includes('current user could not be resolved')
    ) {
      return this.translate.instant('PO.APPROVAL_PERMISSION_REQUIRED');
    }
    return backendMessage || this.translate.instant('PO.APPROVE_ERROR');
  }

  canRejectQuote(): boolean {
    if (!this.isQuoteMode || !this.statusItem()?.statusId) {
      return false;
    }
    if (this.relatedOrderPrimaryId) {
      return false;
    }
    const status = String(this.statusItem()?.statusId).toUpperCase();
    return status !== 'ORDER_REJECTED' && status !== 'ORDER_CANCELLED' && status !== 'ORDER_COMPLETED';
  }

  canConvertQuoteToPo(): boolean {
    return this.isQuoteMode
      && String(this.statusItem()?.statusId || '').toUpperCase() === 'ORDER_APPROVED'
      && !this.relatedOrderPrimaryId;
  }

  rejectQuote(): void {
    if (!this.orderId || !this.canRejectQuote()) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRMATION'),
        message: this.translate.instant('COMMON.STATUS_CHANGE_CONFIRMATION', { status: 'ORDER_REJECTED' }),
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.orderService.updateOrderStatus(this.orderId!, 'ORDER_REJECTED').subscribe({
        next: () => {
          if (this.orderPrimaryId) {
            this.silentRefresh();
          }
        },
      });
    });
  }

  convertQuoteToPo(): void {
    if (!this.orderId || !this.canConvertQuoteToPo()) {
      return;
    }
    this.orderService.convertPurchaseQuoteToOrder(this.orderId).subscribe({
      next: (created) => {
        this.snackbarService.showSuccess(this.translate.instant('PO.CONVERT_TO_PO_SUCCESS'));
        if (this.orderPrimaryId) {
          this.silentRefresh();
        }
        const newId = (created as Record<string, unknown>)?.['id'];
        if (newId != null) {
          this.router.navigate([`/pos/${newId}`]);
        }
      },
      error: (err) => {
        console.error('Failed to convert purchase quote', err);
        this.snackbarService.showError(this.translate.instant('PO.CONVERT_TO_PO_ERROR'));
      }
    });
  }

  goToReceive(): void {
    if (!this.orderPrimaryId) {
      return;
    }
    this.router.navigate([`/pos/${this.orderPrimaryId}/receive`]);
  }

  openPdf(): void {
    if (!this.orderId) {
      return;
    }
    this.orderService.getOrderPdf(this.orderId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
    });
  }

  reorderOrder(): void {
    if (!this.orderId) {
      return;
    }
    this.orderService.reorderOrder(this.orderId).subscribe({
      next: (created) => {
        const newId = (created as Record<string, unknown>)?.['id'];
        if (newId != null) {
          this.router.navigate([`/pos/${newId}`]);
        }
      },
      error: (err) => {
        console.error('Failed to reorder purchase order', err);
      }
    });
  }

  readonly validStatusChanges = signal<any[]>([]);

  loadValidStatusChanges(): void {
    if (!this.statusItem()?.statusId) {
      this.validStatusChanges.set([]);
      return;
    }
    this.commonService.getValidStatusChanges(this.statusItem()?.statusId || '').subscribe({
      next: (changes) => {
        const allChanges = Array.isArray(changes) ? changes : [];
        this.validStatusChanges.set(this.filterStatusChangesForUi(allChanges, this.statusItem()?.statusId || ''));
      },
      error: () => {
        this.validStatusChanges.set([]);
      }
    });
  }

  changeOrderStatus(statusIdTo: string): void {
    if (!this.orderId) return;

    if (statusIdTo === 'ORDER_CANCELLED') {
      this.cancelOrder();
      return;
    }

    // Generic confirmation for other statuses
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRMATION'),
        message: this.translate.instant('COMMON.STATUS_CHANGE_CONFIRMATION', { status: statusIdTo }),
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.orderService.updateOrderStatus(this.orderId!, statusIdTo).subscribe({
        next: () => {
          if (this.orderPrimaryId) {
            this.silentRefresh();
          }
        },
        error: (err) => {
          this.snackbarService.showError(this.getPurchaseOrderApprovalErrorMessage(err));
        }
      });
    });
  }

  cancelOrder(): void {
    if (!this.orderId) return;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRMATION'),
        message: this.translate.instant('COMMON.CONFIRM_CANCEL_ORDER'),
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.orderService.updateOrderStatus(this.orderId!, 'ORDER_CANCELLED').subscribe({
        next: () => {
          if (this.orderPrimaryId) {
            this.silentRefresh();
          }
        },
        error: (err) => {
          console.error('Failed to cancel order', err);
        }
      });
    });
  }

  private filterStatusChangesForUi(changes: StatusChange[], currentStatusId: string): StatusChange[] {
    const status = (currentStatusId || '').toUpperCase();

    if (this.isQuoteMode) {
      if (status === 'ORDER_CREATED') {
        return this.pickAndOrderActions(changes, ['APPROVE']);
      }
      if (status === 'ORDER_HOLD' || status === 'ORDER_HELD') {
        return this.pickAndOrderActions(changes, ['APPROVE']);
      }
      return [];
    }

    if (status === 'ORDER_COMPLETED') {
      return [];
    }

    if (status === 'ORDER_CREATED') {
      return this.pickAndOrderActions(changes, ['APPROVE', 'HOLD', 'CANCEL']);
    }

    if (status === 'ORDER_APPROVED') {
      return this.pickAndOrderActions(changes, ['HOLD']);
    }

    if (status === 'ORDER_HOLD' || status === 'ORDER_HELD') {
      return this.pickAndOrderActions(changes, ['APPROVE', 'CANCEL']);
    }

    return changes;
  }

  private pickAndOrderActions(changes: StatusChange[], allowedActions: Array<'APPROVE' | 'HOLD' | 'CANCEL'>): StatusChange[] {
    const ranked = changes
      .map((change) => ({ change, action: this.resolveActionType(change) }))
      .filter((row) => row.action && allowedActions.includes(row.action))
      .sort((a, b) => allowedActions.indexOf(a.action!) - allowedActions.indexOf(b.action!))
      .map((row) => row.change);

    const distinct: StatusChange[] = [];
    const seen = new Set<string>();
    for (const change of ranked) {
      const action = this.resolveActionType(change);
      if (!action) {
        continue;
      }
      const statusIdTo = String(change?.statusIdTo || '').toUpperCase();
      const key = `${action}:${statusIdTo || action}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      distinct.push(change);
    }

    return distinct;
  }

  private resolveActionType(change: StatusChange): 'APPROVE' | 'HOLD' | 'CANCEL' | null {
    const statusIdTo = String(change?.statusIdTo || '').toUpperCase();
    const label = String(change?.transitionName || change?.description || '').toUpperCase();

    if (statusIdTo.includes('APPROVED') || label.includes('APPROVE')) {
      return 'APPROVE';
    }
    if (statusIdTo.includes('HOLD') || label.includes('HOLD')) {
      return 'HOLD';
    }
    if (statusIdTo.includes('CANCEL') || label.includes('CANCEL')) {
      return 'CANCEL';
    }
    return null;
  }

  getStatusActionLabel(change: StatusChange): string {
    const action = this.resolveActionType(change);
    if (this.isQuoteMode && action === 'APPROVE') {
      return this.translate.instant('PO.APPROVE_QUOTE');
    }
    return change?.transitionName || change?.description || change?.statusIdTo || '';
  }

  getFallbackApproveLabel(): string {
    return this.isQuoteMode ? this.translate.instant('PO.APPROVE_QUOTE') : this.translate.instant('COMMON.APPROVE');
  }

  getRelatedOrderRouteBase(): string {
    const typeId = (this.relatedOrderTypeId || '').toUpperCase();
    if (typeId === 'PURCHASE_ORDER') {
      return '/pos';
    }
    if (typeId === 'PURCHASE_QUOTE') {
      return '/pos/quotes';
    }
    if (typeId === 'SALES_ORDER') {
      return '/orders';
    }
    if (typeId === 'SALES_QUOTE') {
      return '/quotes';
    }
    return '/pos';
  }
}

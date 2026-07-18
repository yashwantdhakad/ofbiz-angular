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
import { DatePipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, finalize, map, tap } from 'rxjs/operators';
import { OrderService } from '@ofbiz/services/order/order.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { AddEditAddressComponent } from '@ofbiz/components/party/add-edit-address/add-edit-address.component';
import { DateUpdateDialogComponent } from '../../common/date-update-dialog/date-update-dialog.component';
import { AddOrderAdjustmentDialogComponent } from '../add-order-adjustment-dialog/add-order-adjustment-dialog.component';
import { ContentComponent } from '../../order/content/content.component';
import { NoteComponent } from '../../order/note/note.component';
import { ProductItemComponent } from '../../order/product-item/product-item.component';
import { ShippingInstructionDialogComponent } from '../../order/shipping-instruction-dialog/shipping-instruction-dialog.component';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { ShipToPhoneDialogComponent } from '../ship-to-phone-dialog/ship-to-phone-dialog.component';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { StatusHistoryEntry } from '../../common/status-history/status-history-icon.component';
import {
  InvoiceSummary,
  OrderAdjustmentSummary,
  OrderContactMechSummary,
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
import { CustomerDetailResponse, PostalAddress } from '@ofbiz/models/party.model';

type OrderDialogResult = { id?: string; orderId?: string } | null | undefined;
type ProductItemDialogData = Partial<OrderPartItemSummary> & { updateExisting?: boolean; orderId?: string };
type ShipToPhoneData = { contactMechId?: string; countryCode?: string; areaCode?: string; contactNumber?: string };

@Component({
  standalone: false,
  selector: 'app-so-detail',
  templateUrl: './so-detail.component.html',
  styleUrls: ['./so-detail.component.css'],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SODetailComponent implements OnInit {
  orderId: string | undefined;
  orderPrimaryId: string | undefined;
  orderHeader = signal<OrderHeaderSummary | null>(null);
  statusItem = signal<OrderStatusSummary | null>(null);
  readonly canApprove = signal(false);
  readonly canPicklist = signal(false);
  readonly canEditItems = signal(false);
  shipToAddresses = signal<OrderContactMechSummary[]>([]);
  shipToPhones = signal<ShipToPhoneData[]>([]);
  firstPartInfo = signal<OrderPartSummary | null>(null);
  customerPartyId: string | undefined;
  facilityAddress = signal<PostalAddress | null>(null);

  addPOItemDialog: boolean = false;
  createOrderNoteDialog: boolean = false;
  isLoading = signal(false);
  showTable: boolean = false;
  readonly isSavingQuantity = signal(false);
  itemSubtotal = signal(0);
  shippingTotal = signal(0);
  discountTotal = signal(0);
  orderTotal = signal(0);
  editingItemKey: string | null = null;
  editingQuantity: number | null = null;

  pages: number = 0;

  orderNotes = signal<OrderNoteSummary[]>([]);
  orderAdjustments = signal<OrderAdjustmentSummary[]>([]);
  readonly orderStatusHistory = signal<OrderStatusHistoryEntry[]>([]);
  readonly orderIdentifications = signal<OrderIdentificationSummary[]>([]);
  noteColumns: string[] = ['noteText', 'noteDate', 'userId', 'action'];

  parts = signal<OrderPartSummary[]>([]);
  partColumns: string[] = [
    'productId',
    'productName',
    'itemDescription',
    'description',
    'requiredByDate',
    'unitAmount',
    'quantity',
    'statusId',
    'totalAmount',
    'action',
  ];

  contents = signal<OrderContentSummary[]>([]);
  contentColumns: string[] = ['description', 'contentDate', 'contentLocation'];

  shipments = signal<ShipmentSummary[]>([]);
  shipmentColumns: string[] = ['shipmentId', 'shipmentTypeId', 'statusId', 'trackingNumber', 'createdDate'];
  readonly shipmentStatusById = signal(new Map<string, string>());
  readonly statusDescriptionMap = signal(new Map<string, string>());
  readonly shipmentTypeMap = signal(new Map<string, string>());
  readonly orderItemTypeMap = signal(new Map<string, string>());
  readonly productNameMap = signal(new Map<string, string>());
  reservationStatus = signal<any>(null);
  readonly shopifyOrderId = computed(() => {
    const match = this.orderIdentifications()
      .find((item) => (item?.orderIdentificationTypeId || '').toUpperCase() === 'SHOPIFY_ORDER_ID');
    return this.formatShopifyOrderId(match?.idValue);
  });
  /* istanbul ignore next: Angular signal/computed source maps undercount this exercised initializer */
  readonly overviewFields = computed(() => [
    { label: this.isQuoteMode ? 'QUOTE.ID' : 'COMMON.ID', value: this.orderHeader()?.orderId },
    { label: 'SO.PO_NUMBER', value: this.orderHeader()?.orderName },
    { label: 'SO.SHOPIFY_ORDER_ID', value: this.shopifyOrderId() },
    { label: 'COMMON.EXTERNAL_ID', value: this.orderHeader()?.externalId },
    { label: this.isQuoteMode ? 'QUOTE.TYPE' : 'SO.ORDER_TYPE', value: this.orderHeader()?.orderTypeId },
    { label: this.isQuoteMode ? 'QUOTE.DATE' : 'SO.ORDER_DATE', value: this.datePipe.transform(this.orderHeader()?.entryDate, 'MMMM d, y') },
    { label: 'COMMON.STATUS', value: this.statusItem()?.description, isStatus: true },
  ].filter(field => field.value && !(field.label === 'COMMON.EXTERNAL_ID' && field.value === this.shopifyOrderId())));
  /* istanbul ignore next: Angular signal/computed source maps undercount this exercised initializer */
  readonly statusHistoryEntries = computed<StatusHistoryEntry[]>(() =>
    this.orderStatusHistory().filter((entry) => this.isHeaderStatusHistoryEntry(entry)).map((entry) => ({
      statusId: entry?.statusId,
      statusLabel: this.getHistoryStatusDescription(entry),
      changedAt: entry?.statusDatetime,
      changedBy: entry?.statusUserLogin,
      reason: entry?.changeReason,
    }))
  );

  invoiceItems = signal<Array<{ id?: string | number; invoiceId?: string; currencyUomId?: string; productId?: string; quantity?: number; amount?: number }>>([]);
  invoiceColumns: string[] = ['invoiceId', 'productId', 'quantity', 'amount'];
  returnItems = signal<ReturnSummary[]>([]);
  returnColumns: string[] = ['returnId', 'returnType', 'status', 'entryDate', 'totalAmount'];

  picklists = signal<any[]>([]);
  picklistColumns: string[] = ['picklistId', 'statusId', 'shipmentId', 'createdDate', 'action'];

  orderTerms = signal<OrderTermSummary[]>([]);
  orderPaymentPreferences = signal<OrderPaymentPreferenceSummary[]>([]);
  termColumns: string[] = ['termTypeId', 'termValue', 'termDays'];
  preferenceColumns: string[] = ['paymentMethodTypeId', 'statusId', 'maxAmount'];
  isQuoteMode = false;
  listBasePath = '/orders';
  relatedOrderPrimaryId: number | null = null;
  relatedOrderId: string | null = null;
  relatedOrderTypeId: string | null = null;
  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  private readonly parentRouteData = toSignal(this.route.parent?.data ?? of({}), {
    initialValue: this.route.parent?.snapshot.data ?? {},
  });
  private readonly routeKey = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') || ''),
      filter((id) => id.length > 0),
      distinctUntilChanged()
    ),
    { initialValue: this.route.snapshot.paramMap.get('id') || '' }
  );
  private readonly routeBootstrapEffect = effect(() => {
    const data = { ...this.parentRouteData(), ...this.routeData() };
    this.isQuoteMode = data['isQuoteMode'] === true;
    this.listBasePath = data['listBasePath'] || '/orders';
    const routeKey = this.routeKey();
    if (!routeKey) {
      return;
    }
    this.orderPrimaryId = routeKey;
    this.getOrderById(routeKey).subscribe();
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private commonService: CommonService,
    private productService: ProductService,
    private partyService: PartyService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private datePipe: DatePipe,
    private translate: TranslateService,
    private renderScheduler: RenderSchedulerService,
    private snackbarService: SnackbarService,
    private facilityService: FacilityService
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
        if (!orderResponse || !displayInfo) {
          return;
        }
        const parts = Array.isArray(orderResponse?.parts) ? orderResponse.parts : [];
        this.parts.set(parts);
        this.primeProductNames(parts);
        this.primeCustomerNames(parts);
        this.contents.set(Array.isArray(orderResponse?.contents) ? orderResponse.contents : []);
        this.orderHeader.set(displayInfo.orderHeader || null);
        this.orderId = this.orderHeader()?.orderId;
        this.loadOrderIdentifications(this.orderId);
        this.statusItem.set(displayInfo.statusItem || null);
        this.orderStatusHistory.set(Array.isArray(displayInfo.orderStatusList) ? displayInfo.orderStatusList : []);
        this.orderNotes.set(Array.isArray(displayInfo.orderNoteList) ? displayInfo.orderNoteList : []);
        this.relatedOrderPrimaryId = displayInfo?.relatedOrderPrimaryId ?? null;
        this.relatedOrderId = displayInfo?.relatedOrderId ?? null;
        this.relatedOrderTypeId = displayInfo?.relatedOrderTypeId ?? null;
        this.renderScheduler.defer(() => {
          this.firstPartInfo.set(displayInfo.firstPartInfo || null);
          this.cdr.markForCheck();
        });
        this.orderTerms.set(Array.isArray(displayInfo.orderTermList) ? displayInfo.orderTermList : []);
        this.orderPaymentPreferences.set(Array.isArray(displayInfo.orderPaymentPreferenceList) ? displayInfo.orderPaymentPreferenceList : []);
        this.orderAdjustments.set(displayInfo.orderAdjustmentList || []);
        this.calculateSummary(displayInfo.orderAdjustmentList || []);
        this.canEditItems.set(
          this.statusItem()?.statusId === 'ORDER_CREATED'
          || this.statusItem()?.statusId === 'ORDER_APPROVED'
        );
        this.applyShipToContacts(displayInfo);
        if (this.orderId) {
          this.loadValidStatusChanges();
          this.applyOrderDocuments(displayInfo);
        }
        this.canApprove.set(this.statusItem()?.statusId === 'ORDER_CREATED');

        const customerPartyId = displayInfo?.firstPart?.customerPartyId;
        if (customerPartyId) {
          this.renderScheduler.defer(() => {
            this.customerPartyId = customerPartyId;
            this.cdr.markForCheck();
          });
        }

        const apiAddress = displayInfo?.facilityAddress || displayInfo?.originFacilityAddress || null;
        this.facilityAddress.set(apiAddress);
        if (!apiAddress) {
          const parts = Array.isArray(orderResponse?.parts) ? orderResponse.parts : [];
          const facilityId = parts[0]?.facility?.facilityId || parts[0]?.facilityId;
          if (facilityId) {
            this.facilityService.getFacility(facilityId).pipe(catchError(() => of(null))).subscribe((facilityDetail) => {
              const addr = facilityDetail?.addresses?.[0];
              if (addr) {
                this.facilityAddress.set({
                  toName: addr.toName,
                  address1: addr.address1,
                  address2: addr.address2,
                  city: addr.city,
                  postalCode: addr.postalCode,
                  countryGeoId: addr.countryGeoId,
                  stateProvinceGeoId: addr.stateProvinceGeoId,
                  stateProvinceGeo: { geoName: addr.stateProvinceGeoName },
                });
                this.cdr.markForCheck();
              }
            });
          }
        }

        this.cdr.markForCheck();
      }),
      finalize(() => {
        if (!showLoader) {
          return;
        }
        this.renderScheduler.defer(() => {
          this.isLoading.set(false);
          this.cdr.markForCheck();
        });
      })
    );
  }

  private isNumericIdentifier(value: string): boolean {
    return /^\d+$/.test(String(value || '').trim());
  }

  private applyShipToContacts(displayInfo: OrderDisplayInfoResponse | null): void {
    const contacts = displayInfo?.orderContactMechList || [];
    const purposeOf = (contact: (typeof contacts)[number]) =>
      (contact?.contactMechPurposeTypeId || contact?.contactMechPurposeId || '').toUpperCase();
    this.shipToAddresses.set(contacts.filter((contact) => purposeOf(contact) === 'SHIPPING_LOCATION'));
    this.shipToPhones.set(contacts
      .filter((contact) => purposeOf(contact) === 'PHONE_SHIPPING')
      .map((contact) => ({
        contactMechId: contact?.contactMechId,
        countryCode: contact?.telecomNumber?.countryCode || '',
        areaCode: contact?.telecomNumber?.areaCode || '',
        contactNumber: contact?.telecomNumber?.contactNumber || '',
      }))
      .filter((phone) => phone.contactMechId || phone.contactNumber));
  }

  private applyOrderDocuments(displayInfo: OrderDisplayInfoResponse | null): void {
    const shipmentList = Array.isArray(displayInfo?.shipments) ? displayInfo.shipments : [];
    this.shipments.set(shipmentList);
    this.shipmentStatusById.set(new Map(
      shipmentList
        .filter((shipment) => !!shipment?.shipmentId)
        .map((shipment) => [shipment.shipmentId as string, shipment.statusId || ''])
    ));
    const invoiceList = Array.isArray(displayInfo?.invoices) ? displayInfo.invoices : [];
    this.invoiceItems.set(invoiceList.flatMap((invoice: InvoiceSummary) =>
      (invoice.items || []).map((item) => ({
        id: invoice.id,
        invoiceId: invoice.invoiceId,
        currencyUomId: invoice.currencyUomId,
        productId: item.productId,
        quantity: item.quantity,
        amount: item.amount
      }))
    ));
    this.returnItems.set(Array.isArray(displayInfo?.returns) ? displayInfo.returns : []);
    if (this.isQuoteMode) {
      this.reservationStatus.set(null);
      this.canPicklist.set(false);
      this.picklists.set([]);
      return;
    }
    const picklistList = Array.isArray(displayInfo?.picklists) ? displayInfo.picklists : [];
    const reservationStatus = displayInfo?.reservationStatus || null;
    this.reservationStatus.set(reservationStatus);
    this.picklists.set(picklistList);
    this.canPicklist.set(reservationStatus?.fullyReserved === true
      && this.hasRemainingPickQuantity()
      && picklistList.length === 0);
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

  openAddAdjustmentDialog(): void {
    if (!this.orderId || !this.canEditItems()) { return; }
    const dialogRef = this.dialog.open(AddOrderAdjustmentDialogComponent, { width: '440px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (!result || !this.orderId) { return; }
      this.orderService.addOrderAdjustment(this.orderId, result).subscribe({
        next: () => {
          this.snackbarService.showSuccess('Order adjustment added.');
          this.silentRefresh();
        },
        error: (err) => {
          const message = err?.error?.message || 'Failed to add adjustment.';
          this.snackbarService.showError(message);
        },
      });
    });
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

  getShipByLabel(part: OrderPartSummary): string {
    const carrier = part?.carrierPartyId;
    const service = part?.carrierService;
    if (carrier && service) {
      return `${carrier} @ ${service}`;
    }
    return service || carrier || '';
  }

  startEditQuantity(item: OrderPartItemSummary): void {
    if (!this.canEditItems() || !item?.orderItemSeqId) {
      return;
    }
    this.editingItemKey = this.getItemKey(item);
    this.editingQuantity = Number(item?.quantity ?? 0);
  }

  cancelEditQuantity(): void {
    this.editingItemKey = null;
    this.editingQuantity = null;
  }

  saveQuantity(item: OrderPartItemSummary): void {
    if (!this.orderId || !item?.orderItemSeqId || this.editingQuantity === null) {
      return;
    }
    const quantity = Number(this.editingQuantity);
    if (Number.isNaN(quantity) || quantity < 0) {
      return;
    }
    this.isSavingQuantity.set(true);
    this.orderService.updateOrderItemQuantity(this.orderId, item.orderItemSeqId, quantity)
      .pipe(finalize(() => {
        this.isSavingQuantity.set(false);
        this.renderScheduler.markForCheck(this.cdr);
      }))
      .subscribe({
        next: (updated) => {
          item.quantity = (updated as Record<string, unknown>)?.['quantity'] as number ?? quantity;
          this.cancelEditQuantity();
        },
      });
  }

  isEditingItem(item: OrderPartItemSummary): boolean {
    return this.getItemKey(item) === this.editingItemKey;
  }

  private getItemKey(item: Partial<OrderPartItemSummary>): string {
    return `${item?.orderItemSeqId || ''}`;
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

  getStatusDescription(statusId?: string | null): string {
    const normalized = String(statusId || '').trim();
    if (!normalized) {
      return '-';
    }
    return this.statusDescriptionMap().get(normalized)
      || this.statusDescriptionMap().get(normalized.toUpperCase())
      || normalized;
  }

  private getHistoryStatusDescription(entry?: OrderStatusHistoryEntry | null): string {
    return entry?.description || entry?.statusDescription || this.getStatusDescription(entry?.statusId);
  }

  private isHeaderStatusHistoryEntry(entry?: OrderStatusHistoryEntry | null): boolean {
    const statusId = String(entry?.statusId || '').trim().toUpperCase();
    return !entry?.orderItemSeqId && !statusId.startsWith('ITEM_');
  }

  getItemTotalAmount(item: any): number {
    const quantity = Number(item?.quantity ?? 0);
    const unitAmount = Number(item?.unitAmount ?? 0);
    const computed = quantity * unitAmount;
    if (Number.isFinite(computed) && computed > 0) {
      return computed;
    }
    return Number(item?.partTotal ?? item?.totalAmount ?? 0);
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
    const productId = this.normalizeKey(item?.productId);
    const mapped = this.productNameMap().get(productId);
    if (this.isResolvedDisplayValue(mapped, productId)) {
      return mapped as string;
    }
    const candidate =
      item?.product?.productName ||
      item?.product?.internalName ||
      item?.productName ||
      item?.itemDescription;
    if (this.isResolvedDisplayValue(candidate, productId)) {
      return this.normalizeKey(candidate);
    }
    return (
      productId ||
      ''
    );
  }

  private primeProductNames(parts: OrderPartSummary[]): void {
    const ids = new Set<string>();
    const productNameMap = new Map(this.productNameMap());
    (parts || []).forEach((part) => {
      (part.items || []).forEach((item) => {
        const productId = this.normalizeKey(item?.productId);
        if (!productId) {
          return;
        }
        const name = item?.product?.productName || item?.product?.internalName || item?.productName;
        if (this.isResolvedDisplayValue(name, productId)) {
          productNameMap.set(productId, this.normalizeKey(name));
        } else {
          ids.add(productId);
        }
        (item?.components || []).forEach((component: any) => {
          const componentProductId = this.normalizeKey(component?.productId);
          if (!componentProductId) {
            return;
          }
          const componentName = component?.productName;
          if (this.isResolvedDisplayValue(componentName, componentProductId)) {
            productNameMap.set(componentProductId, componentName);
          } else {
            ids.add(componentProductId);
          }
        });
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
          productList.map((product: any) => [
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

  readonly customerNameMap = signal(new Map<string, string>());

  private primeCustomerNames(parts: OrderPartSummary[]): void {
    const ids = new Set<string>();
    const customerNameMap = new Map(this.customerNameMap());
    (parts || []).forEach((part) => {
      const customer = part?.customer;
      const partyId = this.normalizeKey(
        customer?.partyId || part?.customerPartyId || customer?.organization?.organizationName
      );
      const personName = [customer?.person?.firstName, customer?.person?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      const orgName = customer?.organization?.organizationName;
      const existingName = this.firstResolvedDisplayValue(partyId, personName, orgName);
      if (existingName) {
        customerNameMap.set(partyId, existingName);
        return;
      }
      if (partyId) {
        ids.add(partyId);
      }
    });
    this.customerNameMap.set(customerNameMap);

    const requests = Array.from(ids).map(id =>
      this.partyService.getCustomer(id).pipe(
        map((response: CustomerDetailResponse) => {
          const party = response?.customerDetail?.party;
          const personName = [party?.firstName, party?.lastName].filter(Boolean).join(' ').trim();
          const orgName = party?.groupName;
          return { id, name: personName || orgName || id };
        }),
        catchError(() => of({ id, name: id }))
      )
    );

    if (requests.length) {
      forkJoin(requests).subscribe(results => {
        results.forEach(res => customerNameMap.set(res.id, res.name));
        this.customerNameMap.set(customerNameMap);
      });
    }
  }

  getCustomerName(part: OrderPartSummary): string {
    const customer = part?.customer;
    const partyId = this.normalizeKey(
      customer?.partyId || part?.customerPartyId || customer?.organization?.organizationName
    );
    const personName = [customer?.person?.firstName, customer?.person?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const orgName = customer?.organization?.organizationName;
    return this.firstResolvedDisplayValue(
      partyId,
      personName,
      orgName,
      this.customerNameMap().get(partyId),
      partyId
    );
  }

  getFacilityDisplayName(part: OrderPartSummary): string {
    const facilityName = this.normalizeKey(part?.facility?.facilityName);
    const facilityId = this.getFacilityId(part);
    if (facilityName && facilityId) {
      return `${facilityName} (${facilityId})`;
    }
    return facilityName || facilityId;
  }

  getFacilityId(part: OrderPartSummary): string {
    return this.normalizeKey(part?.facility?.facilityId || part?.facilityId);
  }

  getFallbackCustomerPhone(part: OrderPartSummary): string {
    return this.formatPhone({
      countryCode: part?.customer?.telecomNumber?.countryCode || part?.telecom?.telecomNumber?.countryCode,
      areaCode: part?.customer?.telecomNumber?.areaCode || part?.telecom?.telecomNumber?.areaCode,
      contactNumber: part?.customer?.telecomNumber?.contactNumber || part?.telecom?.telecomNumber?.contactNumber,
    });
  }

  getPartItems(part: OrderPartSummary): OrderPartItemSummary[] {
    return Array.isArray(part?.items) ? part.items : [];
  }

  private normalizeKey(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim();
  }

  private isResolvedDisplayValue(value: any, idHint?: string): boolean {
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

  private firstResolvedDisplayValue(idHint: string, ...values: any[]): string {
    for (const value of values) {
      if (this.isResolvedDisplayValue(value, idHint)) {
        return this.normalizeKey(value);
      }
    }
    return this.normalizeKey(idHint);
  }

  addItemDialog(params: ProductItemDialogData | null = null): void {
    if (!this.canManageOrderItems(params)) {
      return;
    }
    const productItemData: ProductItemDialogData = {
      ...params,
      orderId: this.orderId,
    };

    this.dialog.open(ProductItemComponent, {
      data: { productItemData },
    }).afterClosed().subscribe((result: OrderDialogResult) => {
      if (result && this.orderPrimaryId) {
        this.silentRefresh();
      }
    });
  }

  addUpdateNoteDialog(params: Partial<OrderNoteSummary> | null = null): void {
    const noteData = {
      ...params,
      orderId: this.orderId,
    };

    this.dialog.open(NoteComponent, {
      data: { noteData },
    }).afterClosed().subscribe((result: (OrderDialogResult & OrderNoteSummary) | undefined) => {
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
        title: this.translate.instant('COMMON.CONFIRMATION'),
        message: this.translate.instant('COMMON.DELETE_CONFIRMATION'),
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

    this.dialog.open(ContentComponent, {
      data: { contentData },
    }).afterClosed().subscribe((result: OrderDialogResult) => {
      if (result && this.orderPrimaryId) {
        this.silentRefresh();
      }
    });
  }

  editShippingInstructions(part: OrderPartSummary): void {
    const orderPartSeqId = part?.orderPartSeqId;
    if (!this.orderId || !orderPartSeqId) {
      return;
    }
    this.dialog.open(ShippingInstructionDialogComponent, {
      data: {
        titleKey: 'COMMON.SHIPPING_INSTRUCTIONS',
        shippingInstructions: part?.shippingInstructions || '',
      },
    }).afterClosed().subscribe((value) => {
      const shippingInstructions = this.normalizeKey(value);
      if (!shippingInstructions) {
        return;
      }
      this.orderService.updateShippingInstructions(this.orderId as string, orderPartSeqId, shippingInstructions)
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
      const shipBeforeDate = this.normalizeKey(newDate);
      if (!shipBeforeDate) {
        return;
      }
      this.orderService.updateShipGroupShipBeforeDate(this.orderId!, orderPartSeqId, shipBeforeDate).subscribe(() => {
        if (this.orderPrimaryId) {
          this.silentRefresh();
        }
      });
    });
  }

  formatShipBeforeDate(value: any): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string' && value.length === 10) {
      return this.datePipe.transform(`${value}T00:00:00Z`, 'MMMM d, y', 'UTC') || value;
    }
    return this.datePipe.transform(value, 'MMMM d, y') || String(value);
  }

  editShipToAddress(address: OrderContactMechSummary | null = null): void {
    if (!this.orderId) {
      return;
    }
    const postal = address?.postalAddress || {};
    const addressData = {
      orderId: this.orderId,
      contactMechId: address?.contactMechId,
      contactMechPurposeId: address?.contactMechPurposeTypeId || 'SHIPPING_LOCATION',
      defaultPurpose: 'SHIPPING_LOCATION',
      toName: postal?.toName,
      address1: postal?.address1,
      address2: postal?.address2,
      city: postal?.city,
      postalCode: postal?.postalCode,
      countryGeoId: postal?.countryGeoId,
      stateProvinceGeoId: postal?.stateProvinceGeoId || postal?.stateProvinceGeo?.geoName,
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

  editShipToPhone(phone: ShipToPhoneData | null = null): void {
    if (!this.orderId) {
      return;
    }
    this.dialog.open(ShipToPhoneDialogComponent, {
      data: {
        countryCode: phone?.countryCode || '',
        areaCode: phone?.areaCode || '',
        contactNumber: phone?.contactNumber || '',
      },
    }).afterClosed().subscribe((payload: ShipToPhoneData | null) => {
      if (!payload?.contactNumber) {
        return;
      }
      this.orderService.upsertOrderShippingPhone(this.orderId as string, payload).subscribe({
        next: () => {
          if (this.orderPrimaryId) {
            this.silentRefresh();
          }
        },
      });
    });
  }

  formatPhone(phone: ShipToPhoneData | null | undefined): string {
    if (!phone) {
      return '';
    }
    return [phone.countryCode, phone.areaCode, phone.contactNumber]
      .filter((part) => !!part)
      .join(' ');
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
        orderTypeId: 'SALES_ORDER',
      },
    });
  }

  approveOrder(): void {
    if (!this.orderId) {
      return;
    }
    const request$ = this.isQuoteMode
      ? this.orderService.updateOrderStatus(this.orderId, 'ORDER_APPROVED')
      : this.orderService.approveSalesOrder(this.orderId);
    request$.subscribe({
      next: () => {
        if (this.orderPrimaryId) {
          this.silentRefresh();
        }
      },
    });
  }

  createPicklist(): void {
    if (!this.orderId) {
      return;
    }
    this.orderService.createPicklist(this.orderId).subscribe({
      next: () => {
        if (this.orderPrimaryId) {
          this.silentRefresh();
        }
      },
    });
  }

  openOrderContent(item: Partial<OrderContentSummary> | null | undefined): void {
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
      }
    });
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
        if ((newId !== null && newId !== undefined)) {
          this.router.navigate([`/orders/${newId}`]);
        }
      },
      error: (err) => {
        console.error('Failed to reorder sales order', err);
      }
    });
  }

  convertQuoteToOrder(): void {
    if (!this.orderId) {
      return;
    }

    this.orderService.convertQuoteToOrder(this.orderId).subscribe({
      next: (created) => {
        this.snackbarService.showSuccess(this.translate.instant('QUOTE.CONVERT_TO_ORDER_SUCCESS'));
        if (this.orderPrimaryId) {
          this.silentRefresh();
        }
        const newId = (created as Record<string, unknown>)?.['id'];
        if (newId === null || newId === undefined) {
          return;
        }
        const newRouteId = String(newId);
        this.router.navigate([`/orders/${newRouteId}`]);
      },
      error: (err) => {
        console.error('Failed to convert sales quote', err);
        this.snackbarService.showError(this.translate.instant('QUOTE.CONVERT_TO_ORDER_ERROR'));
      }
    });
  }

  rejectQuote(): void {
    this.changeOrderStatus('ORDER_REJECTED');
  }

  markPicklistPicked(picklistId: string): void {
    if (!picklistId) {
      return;
    }
    this.orderService.markPicklistPicked(picklistId).subscribe({
      next: () => {
        if (this.orderId) {
          if (this.orderPrimaryId) {
            this.silentRefresh();
          }
        }
      },
    });
  }

  shipShipment(shipmentId: string): void {
    if (!shipmentId) {
      return;
    }
    this.orderService.shipShipment(shipmentId).subscribe({
      next: () => {
        if (this.orderId) {
          if (this.orderPrimaryId) {
            this.silentRefresh();
          }
        }
      },
    });
  }

  private hasRemainingPickQuantity(): boolean {
    return this.parts().some((part: any) =>
      (part.items || []).some((item: any) => {
        const qty = Number(item?.quantity || 0);
        const picked = this.getDisplayedShippedQuantity(item);
        return picked < qty;
      })
    );
  }

  private hasAnyItems(): boolean {
    return this.parts().some((part: any) => (part.items || []).length > 0);
  }

  getShipmentStatus(shipmentId: string | undefined): string | undefined {
    if (!shipmentId) {
      return undefined;
    }
    return this.shipmentStatusById().get(shipmentId);
  }

  getDisplayedShippedQuantity(item: any): number {
    return Number(item?.issuedQuantity || 0);
  }

  getDisplayedReservedQuantity(item: any): number {
    const reserved = Number(item?.reservedQuantity || 0);
    const issued = this.getDisplayedShippedQuantity(item);
    return Math.max(reserved - issued, 0);
  }

  getItemComponents(item: any): any[] {
    return Array.isArray(item?.components) ? item.components : [];
  }

  getComponentName(component: any): string {
    const productId = this.normalizeKey(component?.productId);
    const mapped = this.productNameMap().get(productId);
    if (this.isResolvedDisplayValue(mapped, productId)) {
      return mapped as string;
    }
    return this.firstResolvedDisplayValue(productId, component?.productName, productId);
  }

  cancelItem(item: any): void {
    if (!this.orderId || !item?.orderItemSeqId) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRMATION'),
        message: this.translate.instant('COMMON.CONFIRM_CANCEL_ITEM'),
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.orderService.cancelOrderItem(this.orderId!, item.orderItemSeqId).subscribe({
        next: () => {
          if (this.orderPrimaryId) {
            this.silentRefresh();
          }
        },
      });
    });
  }

  completeItem(item: any): void {
    if (!this.orderId || !item?.orderItemSeqId) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRMATION'),
        message: this.translate.instant('COMMON.COMPLETE_CONFIRMATION', { item: item.orderItemSeqId }),
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.orderService.completeOrderItem(this.orderId!, item.orderItemSeqId).subscribe({
        next: () => {
          if (this.orderPrimaryId) {
            this.silentRefresh();
          }
        },
      });
    });
  }

  editItem(item: any): void {
    if (!this.canManageOrderItems(item)) {
      return;
    }
    this.addItemDialog({
      ...item,
      updateExisting: true
    });
  }

  getRowClass(item: any): string {
    if (item.statusId === 'ITEM_CANCELLED') {
      return 'status-cancelled';
    }
    if (item.statusId === 'ITEM_COMPLETED') {
      return 'status-completed';
    }
    const reserved = this.getDisplayedReservedQuantity(item);
    const quantity = Number(item.quantity || 0);
    const picked = this.getDisplayedShippedQuantity(item);
    if (reserved + picked < quantity && item.statusId === 'ITEM_APPROVED') {
      return 'status-backorder';
    }
    return '';
  }

  readonly validStatusChanges = signal<any[]>([]);

  loadValidStatusChanges(): void {
    const currentStatusId = this.statusItem()?.statusId;
    if (!currentStatusId) {
      this.validStatusChanges.set([]);
      return;
    }
    this.commonService.getValidStatusChanges(currentStatusId).subscribe({
      next: (changes) => {
        const allChanges = Array.isArray(changes) ? changes : [];
        this.validStatusChanges.set(this.filterStatusChangesForUi(allChanges, currentStatusId));
        this.cdr.markForCheck();
      },
      error: () => {
        this.validStatusChanges.set([]);
        this.cdr.markForCheck();
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
          console.error('Failed to update status', err);
          // Optionally show error snackbar
        }
      });
    });
  }

  getStatusActionLabel(change: any): string {
    if (!change) {
      return '';
    }
    const action = this.resolveActionType(change);
    if (this.isQuoteMode && action === 'APPROVE') {
      return this.translate.instant('QUOTE.APPROVE');
    }
    return change.transitionName || change.description || change.statusIdTo || '';
  }

  getFallbackApproveLabel(): string {
    return this.isQuoteMode ? this.translate.instant('QUOTE.APPROVE') : this.translate.instant('COMMON.APPROVE');
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

  private filterStatusChangesForUi(changes: any[], currentStatusId: string): any[] {
    const status = (currentStatusId || '').toUpperCase();
    if (this.isQuoteMode) {
      if (status === 'ORDER_CREATED') {
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

  private pickAndOrderActions(changes: any[], allowedActions: Array<'APPROVE' | 'HOLD' | 'CANCEL'>): any[] {
    const ranked = changes
      .map((change) => ({ change, action: this.resolveActionType(change) }))
      .filter((row) => row.action && allowedActions.includes(row.action))
      .sort((a, b) => allowedActions.indexOf(a.action!) - allowedActions.indexOf(b.action!))
      .map((row) => row.change);

    const distinct: any[] = [];
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

  private resolveActionType(change: any): 'APPROVE' | 'HOLD' | 'CANCEL' | null {
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

  canRejectQuote(): boolean {
    return this.isQuoteMode
      && this.statusItem()?.statusId === 'ORDER_CREATED'
      && !this.relatedOrderPrimaryId;
  }

  canConvertQuote(): boolean {
    return this.isQuoteMode
      && this.statusItem()?.statusId === 'ORDER_APPROVED'
      && !this.relatedOrderPrimaryId;
  }

  getRelatedOrderRouteBase(): string {
    const typeId = (this.relatedOrderTypeId || '').toUpperCase();
    if (typeId === 'SALES_ORDER') {
      return '/orders';
    }
    if (typeId === 'SALES_QUOTE') {
      return '/quotes';
    }
    if (typeId === 'PURCHASE_ORDER') {
      return '/pos';
    }
    if (typeId === 'PURCHASE_QUOTE') {
      return '/pos/quotes';
    }
    return '/orders';
  }
}

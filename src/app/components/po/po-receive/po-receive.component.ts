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
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { OrderService } from '@ofbiz/services/order/order.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, map, startWith, switchMap, timeout } from 'rxjs/operators';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { MatDialog } from '@angular/material/dialog';
import { POReceiveLocationDialogComponent } from '../po-receive-location-dialog/po-receive-location-dialog.component';
import { LandedCostAllocationDialogComponent } from '../landed-cost-allocation-dialog/landed-cost-allocation-dialog.component';
import { LotService } from '@ofbiz/services/lot/lot.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';

function firstArray<T>(...candidates: unknown[]): T[] {
  return (candidates.find((candidate) => Array.isArray(candidate)) as T[] | undefined) ?? [];
}

interface PurchaseReceiptResponse {
  shipmentIds?: string[];
  receivedItems?: Array<{ inventoryItemId?: string; productId?: string; quantity?: number }>;
}

interface OrderHeader {
  orderId?: string;
  statusId?: string;
  orderTypeId?: string;
  [key: string]: unknown;
}

interface FacilityLocation {
  locationSeqId?: string;
  facilityId?: string;
  description?: string;
  [key: string]: unknown;
}

interface OrderPart {
  facility?: { facilityId?: string };
  facilityId?: string;
  items?: OrderItem[];
  orderPartSeqId?: string;
  vendorPartyId?: string;
  [key: string]: unknown;
}

interface OrderItem {
  orderItemSeqId?: string;
  productId?: string;
  product?: { productName?: string };
  quantity?: number;
  receivedQuantity?: number;
  remainingQuantity?: number;
  unitAmount?: number;
  facilityId?: string;
  [key: string]: unknown;
}

@Component({
  standalone: false,
  selector: 'app-po-receive',
  templateUrl: './po-receive.component.html',
  styleUrls: ['./po-receive.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class POReceiveComponent implements OnInit {
  orderId: string | undefined;
  orderPrimaryId: string | undefined;
  readonly isLoading = signal(false);
  readonly allFacilityLocations = signal<FacilityLocation[]>([]);
  readonly scannedItemIndex = signal<number | null>(null);
  itemsForm: FormGroup;
  orderHeader: OrderHeader | undefined;
  vendorPartyId: string | undefined;
  facilityId: string | undefined;
  shipGroupSeqId: string | undefined;
  private readonly destroyRef = inject(DestroyRef);
  private readonly partyService = inject(PartyService);
  filteredLotsByRow: Observable<any[]>[] = [];
  filteredPartiesByRow: Observable<any[]>[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private fb: FormBuilder,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private facilityService: FacilityService,
    private dialog: MatDialog,
    private lotService: LotService
  ) {
    this.itemsForm = this.fb.group({
      items: this.fb.array([]),
      customs: this.fb.group({
        billOfEntryNumber: [''],
        billOfEntryDate: [''],
        dutyAmount: [0, Validators.min(0)],
        clearingFees: [0, Validators.min(0)],
        freightAmount: [0, Validators.min(0)],
      }),
    });
  }

  ngOnInit(): void {
    const paramsObservable = this.route.parent ? this.route.parent.params : this.route.params;
    paramsObservable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.orderPrimaryId = params['id'];
      if (this.orderPrimaryId) {
        this.loadOrderById(this.orderPrimaryId);
      }
    });
  }

  get items(): FormArray {
    return this.itemsForm.get('items') as FormArray;
  }

  loadOrderById(id: string): void {
    this.isLoading.set(true);

    this.orderService.getOrderDisplayInfoById(id).pipe(
      switchMap((displayInfo) => {
        this.orderHeader = displayInfo.orderHeader;
        this.orderId = this.orderHeader?.orderId;
        this.vendorPartyId = displayInfo?.firstPart?.vendorPartyId;
        this.facilityId = displayInfo?.firstPart?.facilityId;
        this.shipGroupSeqId = displayInfo?.firstPart?.orderPartSeqId || '00001';

        return this.orderService.getOrderById(id).pipe(
          switchMap((orderResponse: { parts?: OrderPart[] }) => {
            // Load locations only for the order's primary facility to avoid mixing
            // locations from other facilities when the PO spans multiple parts.
            const primaryFacilityId = this.facilityId
              || (orderResponse?.parts || [])[0]?.facility?.facilityId
              || (orderResponse?.parts || [])[0]?.facilityId;

            if (!primaryFacilityId) {
              return of({
                orderResponse,
                locationsResponse: { content: [] as FacilityLocation[] },
              });
            }

            return this.facilityService.getFacilityLocations(primaryFacilityId, 0, 1000).pipe(
              timeout(15000),
              map((response: { content?: FacilityLocation[]; resultList?: FacilityLocation[] }) => ({
                orderResponse,
                locationsResponse: {
                  content: firstArray<FacilityLocation>(response?.content, response?.resultList),
                },
              }))
            );
          })
        );
      }),
      timeout(20000),
      finalize(() => this.isLoading.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ orderResponse, locationsResponse }) => {
        this.allFacilityLocations.set(locationsResponse?.content || []);

        const items = (orderResponse?.parts || [])
          .flatMap((part: OrderPart) => (part.items || []).map((item: OrderItem) => ({
            ...item,
            facilityId: part?.facility?.facilityId || part?.facilityId || this.facilityId,
          })));
        this.items.clear();
        this.filteredLotsByRow = [];
        this.filteredPartiesByRow = [];
        items.forEach((item: OrderItem & { facilityId?: string }) => this.addItemRow(item));
        this.prefillOwnerPartyFromFacility();
      },
      error: (err: HttpErrorResponse) => {
        const msg = err?.error?.detail || err?.error?.message || this.translate.instant('PO.ERROR_LOAD');
        this.snackbarService.showError(msg);
      },
    });
  }


  private addItemRow(item: OrderItem & { facilityId?: string }): void {
    const product = item?.product as any;
    const isSerialized = product?.serialized === 'Y'
      || product?.inventoryItemTypeId === 'SERIALIZED_INV_ITEM';
    const group = this.fb.group({
      orderItemSeqId: [item.orderItemSeqId],
      productId: [item.productId],
      productName: [item?.product?.productName],
      serialized: [isSerialized],
      quantity: [item.quantity],
      receivedQuantity: [item.receivedQuantity || 0],
      remainingQuantity: [item.remainingQuantity || 0],
      unitAmount: [item.unitAmount, [Validators.required, Validators.min(0)]],
      receiveQuantity: [item.remainingQuantity || 0, [Validators.required, Validators.min(0)]],
      locationSeqId: [null],
      lotId: [''],
      expirationDate: [''],
      facilityId: [item.facilityId],
      ownerPartyId: [''],
    });
    this.items.push(group);
    this.filteredLotsByRow.push(this.buildLotSearch(group));
    this.filteredPartiesByRow.push(this.buildPartySearch(group));
  }

  private buildLotSearch(group: FormGroup): Observable<any[]> {
    return group.get('lotId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((val: any) => this.searchLots(val))
    );
  }

  private searchLots(val: any): Observable<any[]> {
    const q = typeof val === 'string' ? val : val?.lotId ?? '';
    if (!q) return of([]);
    return this.lotService.listLots(0, q, 8).pipe(
      map((res) => res?.resultList ?? [])
    );
  }

  private buildPartySearch(group: FormGroup): Observable<any[]> {
    return group.get('ownerPartyId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((val: any) => this.searchParties(val))
    );
  }

  private searchParties(val: any): Observable<any[]> {
    const q = typeof val === 'string' ? val : val?.partyId ?? '';
    if (!q) return of([]);
    return this.partyService.getCustomersAutocompleteFromWms(q).pipe(
      map((res) => res?.resultList ?? [])
    );
  }
  private prefillOwnerPartyFromFacility(): void {
    this.orderService.getProductStores().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (stores: any) => {
        const list = Array.isArray(stores) ? stores : [];
        const partyId = list
          .map((s: any) => String(s?.payToPartyId || '').trim())
          .find((id: string) => !!id);
        if (!partyId) return;
        this.items.controls.forEach((ctrl) => {
          if (!ctrl.get('ownerPartyId')?.value) {
            ctrl.get('ownerPartyId')?.setValue(partyId, { emitEvent: false });
          }
        });
      },
      error: () => {},
    });
  }

  receiveItems(): void {
    if (!this.orderId || this.itemsForm.invalid) {
      this.itemsForm.markAllAsTouched();
      return;
    }

    const payloadItems = this.items.controls
      .map((group) => group.value)
      .map((item) => ({
        orderItemSeqId: item.orderItemSeqId,
        productId: item.productId,
        quantity: item.receiveQuantity,
        unitAmount: item.unitAmount,
        locationSeqId: item.locationSeqId,
        lotId: item?.lotId?.lotId ?? item?.lotId ?? null,
        expirationDate: this.toLocalDateTime(item.expirationDate),
        ownerPartyId: (item?.ownerPartyId?.partyId ?? item?.ownerPartyId) || null,
      }));

    if (!payloadItems.some((item) => item.quantity > 0)) {
      this.snackbarService.showError(this.translate.instant('PO.RECEIVE_NO_QTY'));
      return;
    }

    const fractionalSerialized = this.items.controls
      .map((group) => group.value)
      .some((item) => item.serialized && item.receiveQuantity > 0 && !Number.isInteger(Number(item.receiveQuantity)));
    if (fractionalSerialized) {
      this.snackbarService.showError(this.translate.instant('ASSET.SERIALIZED_WHOLE_QTY'));
      return;
    }

    const payload = {
      facilityId: this.facilityId,
      vendorPartyId: this.vendorPartyId,
      shipGroupSeqId: this.shipGroupSeqId,
      items: payloadItems,
    };

    this.isLoading.set(true);
    this.orderService.receivePurchaseOrder(this.orderId, payload).pipe(
      timeout(20000),
      finalize(() => this.isLoading.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response: unknown) => {
        this.snackbarService.showSuccess(this.translate.instant('PO.RECEIVE_SUCCESS'));
        this.autoApplyLandedCosts(response as PurchaseReceiptResponse);
      },
      error: (err: HttpErrorResponse) => {
        const msg = err?.error?.detail || err?.error?.message || this.translate.instant('PO.RECEIVE_ERROR');
        this.snackbarService.showError(msg);
      },
    });
  }

  private autoApplyLandedCosts(receipt: PurchaseReceiptResponse): void {
    const customs = this.itemsForm.get('customs')?.getRawValue() || {};
    const dutyAmount = Number(customs.dutyAmount || 0);
    const clearingFees = Number(customs.clearingFees || 0);
    const freightAmount = Number(customs.freightAmount || 0);
    const total = dutyAmount + clearingFees + freightAmount;
    const receivedItems = receipt?.receivedItems || [];

    if (total <= 0 || !receivedItems.length || !this.orderId) {
      this.navigateToDetail();
      return;
    }

    this.isLoading.set(true);
    this.orderService.apportionLandedCosts({
      orderId: this.orderId,
      shipmentId: receipt.shipmentIds?.[0],
      allocationMethod: 'VALUE',
      billOfEntryNumber: customs.billOfEntryNumber,
      billOfEntryDate: this.toLocalDateTime(customs.billOfEntryDate),
      dutyAmount,
      clearingFees,
      freightAmount,
      items: receivedItems,
    }).pipe(
      finalize(() => this.isLoading.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.snackbarService.showSuccess(this.translate.instant('PO.LANDED_COST_SUCCESS'));
        this.navigateToDetail();
      },
      error: (err: HttpErrorResponse) => {
        const msg = err?.error?.detail || err?.error?.message || this.translate.instant('PO.LANDED_COST_ERROR');
        this.snackbarService.showError(msg);
        this.navigateToDetail();
      },
    });
  }

  private offerLandedCostAllocation(receipt: PurchaseReceiptResponse): void {
    const customs = this.itemsForm.get('customs')?.getRawValue() || {};
    const total = Number(customs.dutyAmount || 0)
      + Number(customs.clearingFees || 0)
      + Number(customs.freightAmount || 0);
    const receivedItems = receipt?.receivedItems || [];
    if (total <= 0 || !receivedItems.length || !this.orderId) {
      this.navigateToDetail();
      return;
    }

    const dialogRef = this.dialog.open(LandedCostAllocationDialogComponent, {
      width: '520px',
      disableClose: true,
      data: {
        dutyAmount: Number(customs.dutyAmount || 0),
        clearingFees: Number(customs.clearingFees || 0),
        freightAmount: Number(customs.freightAmount || 0),
        receivedItemCount: receivedItems.length,
      },
    });
    dialogRef.afterClosed().pipe(
      switchMap((selection) => {
        if (!selection) return of(null);
        this.isLoading.set(true);
        return this.orderService.apportionLandedCosts({
          orderId: this.orderId,
          shipmentId: receipt.shipmentIds?.[0],
          allocationMethod: selection.allocationMethod,
          billOfEntryNumber: customs.billOfEntryNumber,
          billOfEntryDate: this.toLocalDateTime(customs.billOfEntryDate),
          dutyAmount: Number(customs.dutyAmount || 0),
          clearingFees: Number(customs.clearingFees || 0),
          freightAmount: Number(customs.freightAmount || 0),
          items: receivedItems,
        }).pipe(finalize(() => this.isLoading.set(false)));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (result) => {
        if (result) {
          this.snackbarService.showSuccess(this.translate.instant('PO.LANDED_COST_SUCCESS'));
        }
        this.navigateToDetail();
      },
      error: (err: HttpErrorResponse) => {
        const msg = err?.error?.detail || err?.error?.message || this.translate.instant('PO.LANDED_COST_ERROR');
        this.snackbarService.showError(msg);
      },
    });
  }

  private navigateToDetail(): void {
    if (this.orderPrimaryId) {
      this.router.navigate([`/pos/${this.orderPrimaryId}`]);
    }
  }

  onProductBarcodeScanned(value: string): void {
    const scannedValue = value.trim();
    const normalizedValue = scannedValue.toLocaleLowerCase();
    const itemIndex = this.items.controls.findIndex((group) =>
      String(group.get('productId')?.value || '').trim().toLocaleLowerCase() === normalizedValue
    );

    if (itemIndex < 0) {
      this.scannedItemIndex.set(null);
      this.snackbarService.showError(
        this.translate.instant('BARCODE.PRODUCT_NOT_FOUND', { value: scannedValue })
      );
      return;
    }

    this.scannedItemIndex.set(itemIndex);
    this.snackbarService.showSuccess(
      this.translate.instant('BARCODE.PRODUCT_MATCHED', { value: scannedValue })
    );

    requestAnimationFrame(() => {
      const itemElements = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-po-receive-item="${itemIndex}"]`)
      );
      const visibleItem = itemElements.find((element) => element.offsetParent !== null);
      visibleItem?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      visibleItem?.querySelector<HTMLInputElement>('input[formcontrolname="receiveQuantity"]')?.focus();
    });
  }

  getLocationsForItem(row: { value?: { facilityId?: string } }): FacilityLocation[] {
    const facilityId = row?.value?.facilityId || this.facilityId;
    if (!facilityId) {
      return this.allFacilityLocations();
    }
    return this.allFacilityLocations().filter((location: FacilityLocation) =>
      location.facilityId === facilityId
    );
  }

  openAddLocationDialog(index: number): void {
    const itemGroup = this.items.at(index) as FormGroup;
    const targetFacilityId = itemGroup?.get('facilityId')?.value || this.facilityId;

    if (!targetFacilityId) {
      this.snackbarService.showError(this.translate.instant('PO.FACILITY_REQUIRED'));
      return;
    }

    const dialogRef = this.dialog.open(POReceiveLocationDialogComponent, {
      width: '760px',
      data: { facilityId: targetFacilityId },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((payload) => {
      if (!payload) {
        return;
      }

      this.isLoading.set(true);
      this.facilityService.createFacilityLocation(payload).pipe(
        timeout(15000),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: (created) => {
          const createdLocation = created || payload;
          const locationSeqId = createdLocation?.locationSeqId || payload.locationSeqId;
          if (locationSeqId) {
            const current = this.allFacilityLocations();
            const exists = current.some((location: FacilityLocation) =>
              location.facilityId === targetFacilityId && location.locationSeqId === locationSeqId
            );
            if (!exists) {
              this.allFacilityLocations.set([
                ...current,
                { ...createdLocation, facilityId: targetFacilityId, locationSeqId },
              ]);
            }
            itemGroup.patchValue({ locationSeqId });
          }
          this.snackbarService.showSuccess(this.translate.instant('PO.LOCATION_SUCCESS'));
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('PO.LOCATION_ERROR'));
        },
      });
    });
  }

  displayLot(lot: any): string {
    if (!lot) return '';
    if (typeof lot === 'string') return lot;
    const heat = lot.heatNumber ? ` (Heat: ${lot.heatNumber})` : '';
    return `${lot.lotId}${heat}`;
  }

  displayParty(party: any): string {
    if (!party) return '';
    if (typeof party === 'string') return party;
    return party.name || party.partyId || '';
  }

  private toLocalDateTime(value: Date | string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
  }
}

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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, from, forkJoin } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
  catchError,
  startWith,
  finalize,
  concatMap,
  toArray,
} from 'rxjs/operators';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatStepper } from '@angular/material/stepper';
import { OrderService } from '@ofbiz/services/order/order.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { AddEditAddressComponent } from '@ofbiz/components/party/add-edit-address/add-edit-address.component';
import { AddEditPhoneComponent } from '@ofbiz/components/party/add-edit-phone/add-edit-phone.component';
import { MatDialog } from '@angular/material/dialog';
import { ProductService } from '@ofbiz/services/product/product.service';
import { AddBillToCustomerDialogComponent } from '../add-bill-to-customer-dialog/add-bill-to-customer-dialog.component';
import { ViewChild } from '@angular/core';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-create-so',
  templateUrl: './create-so.component.html',
  styleUrls: ['./create-so.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateSOComponent implements OnInit {
  @ViewChild('customerAutocompleteTrigger', { read: MatAutocompleteTrigger })
  customerAutocompleteTrigger?: MatAutocompleteTrigger;
  readonly isLoading = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  private readonly routeData = toSignal(
    this.route.data.pipe(
      map((data) => ({ ...(this.route.parent?.snapshot.data || {}), ...(data || {}) }))
    ),
    { initialValue: { ...(this.route.parent?.snapshot.data || {}), ...(this.route.snapshot.data || {}) } }
  );
  orderForm: FormGroup;
  paymentForm: FormGroup;

  productStores: any[] = [];
  readonly facilities = computed(() => this.referenceDataStore.facilities());
  filteredCustomers$: Observable<any[]> = of([]);
  filteredProducts: Observable<any[]>[] = [];
  customerAddresses: any[] = [];
  customerPhones: any[] = [];
  itemTypes = [
    { id: 'PRODUCT_ORDER_ITEM', label: 'Product' },
    { id: 'WORK_ORDER_ITEM', label: 'Work' },
    { id: 'RENTAL_ORDER_ITEM', label: 'Rental' },
    { id: 'BULK_ORDER_ITEM', label: 'Bulk' },
  ];
  shipByOptions = [
    { id: 'FEDEX@GROUND', label: 'FedEx Ground' },
    { id: 'FEDEX@SECOND_DAY', label: 'FedEx Second Day' },
    { id: 'FEDEX@NEXT_DAY', label: 'FedEx Next Day' },
    { id: 'UPS@GROUND', label: 'UPS Ground' },
    { id: 'UPS@SECOND_DAY', label: 'UPS Second Day' },
    { id: 'UPS@NEXT_DAY', label: 'UPS Next Day' },
  ];
  paymentTerms = [
    { id: 'NET_30', label: 'Net 30' },
    { id: 'NET_15', label: 'Net 15' },
    { id: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
  ];
  isQuoteMode = false;
  orderTypeId = 'SALES_ORDER';
  detailBasePath = '/orders';
  listBasePath = '/orders';
  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private router: Router,
    private partyService: PartyService,
    private snackbarService: SnackbarService,
    private dialog: MatDialog,
    private productService: ProductService,
    private renderScheduler: RenderSchedulerService,
    private route: ActivatedRoute,
    private referenceDataStore: ReferenceDataStore,
    private cdr: ChangeDetectorRef,
    private preferredFacilityService: PreferredFacilityService,
    private translate: TranslateService
  ) {
    this.orderForm = this.fb.group({
      orderTypeEnumId: ['SALES_ORDER'],
      productStoreId: ['', Validators.required],
      vendorPartyId: ['', Validators.required],
      facilityId: ['', Validators.required],
      customerPartyId: ['', Validators.required],
      customerPhone: [null],
      shipBeforeDate: [''],
      estimatedDeliveryDate: [''],
      poNumber: [''],
      shippingInstructions: [''],
      shippingAddress: [null],
      items: this.fb.array([this.buildItemGroup()]),
    });

    this.paymentForm = this.fb.group({
      shipByMethod: ['', Validators.required],
      paymentTerm: ['', Validators.required],
      paymentMethod: [''],
      paymentInstructions: [''],
    });

    effect(() => {
      this.preferredFacilityService.applyPreferredFacilityIfMissing(
        this.orderForm.get('facilityId'),
        this.facilities()
      );
    });

  }

  ngOnInit(): void {
    const data = this.routeData();
    this.isQuoteMode = data['isQuoteMode'] === true;
    this.orderTypeId = data['orderTypeId'] || 'SALES_ORDER';
    this.detailBasePath = data['detailBasePath'] || '/orders';
    this.listBasePath = data['listBasePath'] || '/orders';
    this.orderForm.patchValue({ orderTypeEnumId: this.orderTypeId });
    this.fetchData();
    this.initProductAutocomplete(0);

    // Live customer autocomplete
    this.filteredCustomers$ = this.orderForm.get('customerPartyId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value: string | any) => {
        const query = typeof value === 'string' ? value.trim() : '';
        if (!query) {
          return of([]);
        }
        return this.getCustomersFromService(query);
      })
    );
  }

  displayCustomer(customer: any): string {
    if (!customer) {
      return '';
    }
    if (typeof customer === 'string') {
      return customer;
    }
    return customer.name || [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || customer.partyId || '';
  }

  fetchData(): void {
    this.orderService.getProductStores().subscribe({
      next: (res) => {
        this.productStores = Array.isArray(res) ? res : [res];
        if (this.productStores.length > 0) {
          const firstStoreId = this.productStores[0].productStoreId;
          if (firstStoreId && !this.orderForm.get('productStoreId')?.value) {
            this.orderForm.get('productStoreId')?.setValue(firstStoreId);
          }
        }
        this.syncVendorPartyFromStore();
      },
    });

    this.referenceDataStore.ensureFacilitiesLoaded();

    this.syncVendorPartyFromStore();
  }

  getCustomersFromService(value: string): Observable<any[]> {
    return this.partyService.getCustomersAutocompleteFromWms(value).pipe(
      map((res) => res?.resultList || []),
      catchError(() => of([]))
    );
  }

  onCustomerSelected(event: MatAutocompleteSelectedEvent) {
    const selectedCustomer = event.option.value;
    const partyId = selectedCustomer?.partyId ?? selectedCustomer;
    if (partyId) {
      this.loadCustomerAddresses(partyId);
      this.loadCustomerPhones(partyId);
    } else {
      this.customerAddresses = [];
      this.customerPhones = [];
      this.orderForm.get('shippingAddress')?.setValue(null);
      this.orderForm.get('customerPhone')?.setValue(null);
    }
  }

  onProductSelected(event: MatAutocompleteSelectedEvent, index: number): void {
    const selectedProduct = event.option.value;
    const productId = selectedProduct?.productId ?? selectedProduct;
    if (!productId) {
      return;
    }
    const productControl = this.items.at(index)?.get('productId');
    if (productControl) {
      productControl.setValue(selectedProduct);
    }
    this.applyProductPrice(index, productId);
    this.applyProductAtp(index, productId);
  }

  displayProduct(product: any): string {
    if (!product) {
      return '';
    }
    if (typeof product === 'string') {
      return product;
    }
    return product.productName || product.internalName || product.productId || '';
  }


  updateVendorParty(): void {
    this.syncVendorPartyFromStore();
  }

  private syncVendorPartyFromStore(): void {
    const selectedStoreId = this.orderForm.get('productStoreId')?.value;
    const store = this.productStores.find(
      (item) => item?.productStoreId === selectedStoreId
    );
    const payToPartyId = store?.payToPartyId || 'COMPANY';
    this.orderForm.get('vendorPartyId')?.setValue(payToPartyId);
  }

  get items(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  addItemRow(): void {
    this.items.push(this.buildItemGroup());
    this.initProductAutocomplete(this.items.length - 1);
  }

  removeItemRow(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
      this.filteredProducts.splice(index, 1);
    }
  }

  goToPaymentStep(stepper: MatStepper): void {
    this.orderForm.markAllAsTouched();
    this.items.markAllAsTouched();
    if (this.orderForm.invalid || this.items.invalid) {
      return;
    }
    stepper.next();
  }


  createOrder(): void {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      this.items.markAllAsTouched();
      return;
    }
    if (!this.isQuoteMode && this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    if (this.items.length === 0) {
      this.snackbarService.showError(this.translate.instant('SO.ITEM_REQUIRED'));
      return;
    }
    this.isLoading.set(true);
    const values = this.orderForm.value;
    const customerPartyId = values?.customerPartyId?.partyId ?? values?.customerPartyId;
    const shippingAddress = this.buildOrderAddress(values.shippingAddress);
    const rest = { ...values };
    delete rest.customerPhone;
    const payload: any = {
      ...rest,
      orderTypeEnumId: values.orderTypeEnumId || this.orderTypeId,
      productStoreId: values.productStoreId,
      facilityId: values.facilityId,
      vendorPartyId: values.vendorPartyId?.partyId ?? values.vendorPartyId,
      customerPartyId,
      poNumber: values.poNumber,
      shipByMethod: this.paymentForm.get('shipByMethod')?.value,
      paymentTerm: this.paymentForm.get('paymentTerm')?.value,
      paymentMethod: this.paymentForm.get('paymentMethod')?.value,
      paymentInstructions: this.paymentForm.get('paymentInstructions')?.value,
      shipBeforeDate: values.shipBeforeDate,
      estimatedDeliveryDate: values.estimatedDeliveryDate,
      shippingInstructions: values.shippingInstructions,
      shippingAddress,
    };
    if (!this.isQuoteMode) {
      Object.assign(payload, this.paymentForm.value);
    }

    this.orderService
      .createOrder(payload)
      .subscribe({
        next: (data) => {
          const result = data as { orderId?: string; id?: number | string };
          const orderId = result?.orderId ?? (typeof result?.id === 'string' ? result.id : undefined);
          const orderPrimaryId = result?.id ?? result?.orderId;
          const shipGroupSeqId = (data as any)?.shipGroupSeqId ?? '00001';
          if (orderId && orderPrimaryId) {
            this.addOrderItems(orderId, orderPrimaryId, shipGroupSeqId);
          } else {
            this.isLoading.set(false);
            this.snackbarService.showError(
              this.translate.instant(this.isQuoteMode ? 'SO.CREATE_QUOTE_ERROR' : 'SO.CREATE_ERROR')
            );
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.snackbarService.showError(
            this.translate.instant(this.isQuoteMode ? 'SO.CREATE_QUOTE_SAVE_ERROR' : 'SO.CREATE_SAVE_ERROR')
          );
        },
      });
  }

  loadCustomerAddresses(partyId: string): void {
    const primary$ = this.partyService.getPartyPostalContactMechByPurpose(partyId, 'PRIMARY_LOCATION', 'customer');
    const shipping$ = this.partyService.getPartyPostalContactMechByPurpose(partyId, 'SHIPPING_LOCATION', 'customer');

    forkJoin({ primary: primary$, shipping: shipping$ }).subscribe({
      next: ({ primary, shipping }: { primary: any; shipping: any }) => {
        const primaryList = Array.isArray(primary) ? primary : [];
        const shippingList = Array.isArray(shipping) ? shipping : [];
        const addresses = ([] as any[]).concat(primaryList, shippingList);
        const unique = new Map(addresses.map((address: any) => [address.contactMechId, address]));
        this.customerAddresses = Array.from(unique.values());
        const current = this.orderForm.get('shippingAddress')?.value;
        if (!current && this.customerAddresses.length) {
          this.orderForm.get('shippingAddress')?.setValue(this.customerAddresses[0]);
        }
      },
      error: () => {
        this.customerAddresses = [];
      },
    });
  }

  loadCustomerPhones(partyId: string): void {
    const primary$ = this.partyService.getPartyTelecomContactMechByPurpose(partyId, 'PRIMARY_PHONE', 'customer');
    const shipping$ = this.partyService.getPartyTelecomContactMechByPurpose(partyId, 'PHONE_SHIPPING', 'customer');

    forkJoin({ primary: primary$, shipping: shipping$ }).subscribe({
      next: ({ primary, shipping }: { primary: any; shipping: any }) => {
        const primaryList = Array.isArray(primary) ? primary : [];
        const shippingList = Array.isArray(shipping) ? shipping : [];
        const phones = ([] as any[]).concat(primaryList, shippingList);
        const unique = new Map(phones.map((phone: any) => [phone.contactMechId, phone]));
        this.customerPhones = Array.from(unique.values());
        const current = this.orderForm.get('customerPhone')?.value;
        if (!current && this.customerPhones.length) {
          this.orderForm.get('customerPhone')?.setValue(this.customerPhones[0]);
        }
      },
      error: () => {
        this.customerPhones = [];
      },
    });
  }

  addCustomerPhone(): void {
    const partyId = this.resolveSelectedCustomerPartyId();
    if (!partyId) {
      return;
    }
    const addEditPhoneData = {
      partyId,
      contactMechPurposeId: 'PRIMARY_PHONE',
    };
    this.dialog.open(AddEditPhoneComponent, {
      data: { addEditPhoneData },
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadCustomerPhones(partyId);
    });
  }

  formatPhone(phone: any): string {
    if (!phone) {
      return '';
    }
    const parts = [phone.countryCode, phone.areaCode, phone.contactNumber].filter(Boolean);
    return parts.join(' ');
  }

  addCustomerAddress(): void {
    const partyId = this.resolveSelectedCustomerPartyId();
    if (!partyId) {
      return;
    }
    const addressData = {
      partyId,
      contactMechPurposeId: 'SHIPPING_LOCATION',
      defaultPurpose: 'SHIPPING_LOCATION',
    };

    this.dialog.open(AddEditAddressComponent, {
      data: { addressData },
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadCustomerAddresses(partyId);
    });
  }

  addBillToCustomer(): void {
    this.customerAutocompleteTrigger?.closePanel();
    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur();

    setTimeout(() => {
      this.dialog
        .open(AddBillToCustomerDialogComponent, {
          width: '460px',
        })
        .afterClosed()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((createdCustomer: any) => {
          const partyId = createdCustomer?.partyId;
          if (!partyId) {
            return;
          }
          const customerOption = {
            ...createdCustomer,
            name:
              [createdCustomer?.firstName, createdCustomer?.lastName]
                .filter(Boolean)
                .join(' ')
                .trim() || createdCustomer?.partyId,
          };
          this.orderForm.get('customerPartyId')?.setValue(customerOption);
          this.loadCustomerAddresses(partyId);
          this.loadCustomerPhones(partyId);
        });
    });
  }

  onAddCustomerMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.customerAutocompleteTrigger?.closePanel();
  }

  formatAddress(address: any): string {
    if (!address) {
      return '';
    }
    const parts = [address.toName, address.address1, address.address2, address.city, address.stateProvinceGeoId, address.postalCode]
      .filter((part) => !!part);
    return parts.join(', ');
  }

  private buildOrderAddress(address: any): any | null {
    if (!address) {
      return null;
    }
    return {
      contactMechId: address.contactMechId,
      contactMechPurposeTypeId: 'SHIPPING_LOCATION',
      toName: address.toName,
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      postalCode: address.postalCode,
      countryGeoId: address.countryGeoId,
      stateProvinceGeoId: address.stateProvinceGeoId,
    };
  }

  private buildItemGroup(): FormGroup {
    return this.fb.group({
      productId: ['', Validators.required],
      quantity: [1, Validators.required],
      unitAmount: [0, Validators.required],
      atpTotal: [{ value: 0, disabled: true }],
      itemTypeEnumId: ['PRODUCT_ORDER_ITEM', Validators.required],
    });
  }

  private initProductAutocomplete(index: number): void {
    const control = this.items.at(index)?.get('productId');
    if (!control) {
      return;
    }
    this.filteredProducts[index] = control.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => {
        const query = (typeof value === 'string' ? value : value?.productId ?? '').trim();
        if (!query) {
          return of([]);
        }
        return this.productService.getProductsAutocompleteFromOms(query).pipe(
          map((response: any) => response?.documentList || []),
          catchError(() => of([]))
        );
      })
    );
  }

  private applyProductPrice(index: number, productId: string): void {
    const unitAmountControl = this.items.at(index)?.get('unitAmount');
    if (!unitAmountControl) {
      return;
    }

    this.productService.getProduct(productId).subscribe({
      next: (response: any) => {
        const prices = Array.isArray(response?.prices) ? response.prices : [];
        const preferred =
          prices.find((price: any) => price?.productPriceTypeId === 'DEFAULT_PRICE') ||
          prices.find((price: any) => price?.productPriceTypeId === 'LIST_PRICE') ||
          prices[0];
        const priceValue = preferred?.price;
        const numeric = priceValue != null ? Number(priceValue) : NaN;
        if (!Number.isNaN(numeric)) {
          unitAmountControl.setValue(numeric);
        }
      },
    });
  }

  private applyProductAtp(index: number, productId: string): void {
    const atpControl = this.items.at(index)?.get('atpTotal');
    if (!atpControl) {
      return;
    }

    this.productService.getInventorySummary(productId).subscribe({
      next: (summary: any[]) => {
        const total = (Array.isArray(summary) ? summary : []).reduce((acc, row) => {
          const value = Number(row?.atpTotal ?? row?.availableToPromiseTotal ?? 0);
          return acc + (Number.isNaN(value) ? 0 : value);
        }, 0);
        atpControl.setValue(total);
      },
      error: () => {
        atpControl.setValue(0);
      },
    });
  }

  private addOrderItems(orderId: string, orderPrimaryId: string | number, shipGroupSeqId: string): void {
    from(this.items.controls)
      .pipe(
        concatMap((control) => {
          const value = control.value;
          const productId = value?.productId?.productId ?? value.productId;
          return this.orderService.addItem({
            orderId,
            shipGroupSeqId,
            productId,
            quantity: value.quantity,
            unitAmount: value.unitAmount,
            itemTypeEnumId: value.itemTypeEnumId,
          });
        }),
        toArray(),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(
            this.translate.instant(
              this.isQuoteMode ? 'SO.CREATE_QUOTE_SUCCESS' : 'SO.CREATE_SUCCESS'
            )
          );
          this.orderForm.reset();
          this.items.clear();
          this.items.push(this.buildItemGroup());
          this.filteredProducts = [];
          this.initProductAutocomplete(0);
          this.router.navigate([`${this.detailBasePath}/${orderPrimaryId}`]);
        },
        error: () => {
          this.snackbarService.showError(
            this.translate.instant(
              this.isQuoteMode ? 'SO.CREATE_QUOTE_ITEMS_ERROR' : 'SO.CREATE_ITEMS_ERROR'
            )
          );
          this.router.navigate([`${this.detailBasePath}/${orderPrimaryId}`]);
        },
      });
  }
  isSubmitDisabled(): boolean {
    return this.orderForm.invalid || this.items.invalid || (!this.isQuoteMode && this.paymentForm.invalid);
  }

  getMissingFieldsTooltip(): string {
    const missing: string[] = [];
    if (this.orderForm.get('productStoreId')?.invalid) missing.push('Store');
    if (this.orderForm.get('facilityId')?.invalid) missing.push('Facility');
    if (this.orderForm.get('customerPartyId')?.invalid) missing.push('Customer');
    if (this.orderForm.get('vendorPartyId')?.invalid) missing.push('Vendor');
    if (!this.isQuoteMode && this.paymentForm.get('shipByMethod')?.invalid) missing.push('Ship By');
    if (!this.isQuoteMode && this.paymentForm.get('paymentTerm')?.invalid) missing.push('Payment Term');
    if (this.items.invalid) missing.push('Items');
    return missing.length ? `Missing: ${missing.join(', ')}` : '';
  }

  get createTitleKey(): string {
    return this.isQuoteMode ? 'QUOTE.CREATE_TITLE' : 'SO.CREATE_TITLE';
  }

  get submitLabelKey(): string {
    return this.isQuoteMode ? 'QUOTE.CREATE_ACTION' : 'SO.CREATE_ACTION';
  }

  private resolveSelectedCustomerPartyId(): string | null {
    const selected = this.orderForm.get('customerPartyId')?.value;
    if (!selected) {
      return null;
    }
    return selected?.partyId ?? selected;
  }

  trackByStore = (_: number, store: any): any =>
    store?.productStoreId ?? store?.id ?? _;

  trackByFacility = (_: number, facility: any): any =>
    facility?.facilityId ?? facility?.id ?? _;

  trackByCustomer = (_: number, customer: any): any =>
    customer?.partyId ?? customer?.id ?? _;

  trackByAddress = (_: number, address: any): any =>
    address?.contactMechId ?? address?.id ?? _;

  trackByPhone = (_: number, phone: any): any =>
    phone?.contactMechId ?? phone?.id ?? _;

  trackByFormIndex = (index: number): number => index;

  trackByProduct = (_: number, product: any): any =>
    product?.productId ?? product?.id ?? _;

  trackByOptionId = (_: number, option: { id: string }): string => option.id;
}

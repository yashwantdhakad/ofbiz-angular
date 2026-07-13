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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Observable, of, from } from 'rxjs';
import {
  startWith,
  switchMap,
  map,
  debounceTime,
  distinctUntilChanged,
  catchError,
  finalize,
  concatMap,
  toArray,
} from 'rxjs/operators';
import { OrderService } from '@ofbiz/services/order/order.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SupplierProductService } from '@ofbiz/services/supplier-product/supplier-product.service';
import { AddSupplierDialogComponent } from '../add-supplier-dialog/add-supplier-dialog.component';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';
import { FacilityReferenceItem } from '@ofbiz/models/manufacturing.model';
import { ProductAutocompleteItem } from '@ofbiz/models/product.model';
import { TranslateService } from '@ngx-translate/core';

interface SupplierSummary {
  partyId?: string;
  name?: string;
  groupName?: string;
}

interface CustomerPartySummary {
  partyId?: string;
  value?: string;
  name?: string;
  groupName?: string;
}

interface OrderCreateResponse {
  orderId?: string;
  id?: number;
  shipGroupSeqId?: string;
}

interface SupplierProductSummary {
  lastPrice?: number | string | null;
}

interface SupplierListResponse {
  resultList?: SupplierSummary[];
}

@Component({
  standalone: false,
  selector: 'app-create-po',
  templateUrl: './create-po.component.html',
  styleUrls: ['./create-po.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePOComponent implements OnInit {
  @ViewChild('supplierAutocompleteTrigger', { read: MatAutocompleteTrigger })
  supplierAutocompleteTrigger?: MatAutocompleteTrigger;
  isLoading = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  isQuoteMode = false;
  detailBasePath = '/pos';
  createTitleKey = 'PO.CREATE_TITLE';
  createActionKey = 'COMMON.CREATE_ORDER';
  poForm: FormGroup;
  customerParties = signal<CustomerPartySummary[]>([]);
  facilities = signal<FacilityReferenceItem[]>([]);
  filteredSuppliers$: Observable<SupplierSummary[]> = of([]);
  filteredProducts: Observable<ProductAutocompleteItem[]>[] = [];
  itemTypes = [
    { id: 'INVENTORY_ORDER_ITEM', label: 'Inventory' },
    { id: 'SUPPLIES_ORDER_ITEM', label: 'Supplies' },
    { id: 'ASSET_ORDER_ITEM', label: 'Asset' },
  ];
  readonly currencies = ['USD', 'EUR', 'GBP', 'JPY', 'INR'];

  constructor(
    private formBuilder: FormBuilder,
    private orderService: OrderService,
    private router: Router,
    private route: ActivatedRoute,
    private partyService: PartyService,
    private snackbarService: SnackbarService,
    private productService: ProductService,
    private supplierProductService: SupplierProductService,
    private dialog: MatDialog,
    private renderScheduler: RenderSchedulerService,
    private referenceDataStore: ReferenceDataStore,
    private preferredFacilityService: PreferredFacilityService,
    private translate: TranslateService
  ) {
    const validators = Validators.required;

    this.poForm = this.formBuilder.group({
      orderTypeEnumId: ['PURCHASE_ORDER'],
      currencyUomId: ['USD', validators],
      customerPartyId: ['', validators],
      facilityId: ['', validators],
      shipBeforeDate: ['', validators],
      estimatedDeliveryDate: [''],
      shippingInstructions: [''],
      shippingAmount: [0],
      discountAmount: [0],
      vendorPartyId: ['', validators],
      items: this.formBuilder.array([this.buildItemGroup()]),
    });

    effect(() => {
      this.facilities.set(this.referenceDataStore.facilities());
      this.preferredFacilityService.applyPreferredFacilityIfMissing(
        this.poForm.get('facilityId'),
        this.facilities()
      );
    });
  }

  ngOnInit(): void {
    const data = this.routeData() || {};
    this.isQuoteMode = !!data['isQuoteMode'];
    this.detailBasePath = this.isQuoteMode ? '/pos/quotes' : '/pos';
    this.createTitleKey = this.isQuoteMode ? 'PO.CREATE_QUOTE_TITLE' : 'PO.CREATE_TITLE';
    this.createActionKey = this.isQuoteMode ? 'PO.CREATE_QUOTE_ACTION' : 'COMMON.CREATE_ORDER';
    this.poForm.patchValue({
      orderTypeEnumId: this.isQuoteMode ? 'PURCHASE_QUOTE' : 'PURCHASE_ORDER',
    });

    this.referenceDataStore.ensureFacilitiesLoaded();
    this.getCustomerParties();

    this.filteredSuppliers$ = this.poForm.get('vendorPartyId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((value) => {
        const name = (value?.name ?? value ?? '').toString();
        return this.partyService.getSuppliers(0, name).pipe(
          map((response: SupplierListResponse) => (Array.isArray(response?.resultList) ? response.resultList : [])),
          catchError(() => of([]))
        );
      })
    );

    this.initProductAutocomplete(0);
  }

  get items(): FormArray {
    return this.poForm.get('items') as FormArray;
  }

  initProductAutocomplete(index: number): void {
    const control = this.items.at(index).get('productId');
    if (control) {
      this.filteredProducts[index] = control.valueChanges.pipe(
        startWith(''),
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((value) => {
          const name = (value?.productName ?? value ?? '').toString();
          return this.productService.getProductsAutocompleteFromOms(name, 20, {
            supplierPartyId: this.resolveVendorPartyId(),
          }).pipe(map(res => res?.documentList || []), catchError(() => of([])));
        })
      );
    }
  }

  displaySupplier(supplier: SupplierSummary | string | null): string {
    if (!supplier) return '';
    if (typeof supplier === 'string') return supplier;
    return supplier.name || supplier.partyId || '';
  }

  displayProduct(product: ProductAutocompleteItem | string | null): string {
    if (!product) return '';
    if (typeof product === 'string') return product;
    return product.productName || product.productId || '';
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

  createPO(): void {
    if (this.poForm.invalid || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    const formValue = this.poForm.value;
    const vendorPartyId = formValue.vendorPartyId?.partyId ?? formValue.vendorPartyId;

    const payload = {
      orderTypeEnumId: formValue.orderTypeEnumId,
      currencyUomId: formValue.currencyUomId,
      customerPartyId: formValue.customerPartyId?.partyId ?? formValue.customerPartyId,
      facilityId: formValue.facilityId,
      shipBeforeDate: formValue.shipBeforeDate,
      estimatedDeliveryDate: formValue.estimatedDeliveryDate,
      shippingInstructions: formValue.shippingInstructions,
      shippingAmount: formValue.shippingAmount,
      discountAmount: formValue.discountAmount,
      vendorPartyId,
    };

    this.orderService.createOrder(payload).subscribe({
      next: (order: unknown) => {
        const order_typed = order as OrderCreateResponse;
        const orderId = order_typed?.orderId ?? (typeof order_typed?.id === 'string' ? order_typed.id : undefined);
        const orderPrimaryId = order_typed?.id ?? order_typed?.orderId;
        const shipGroupSeqId = order_typed?.shipGroupSeqId ?? '00001';
        if (orderId && orderPrimaryId) {
          this.addOrderItems(orderId, orderPrimaryId, shipGroupSeqId);
        } else {
          this.isLoading.set(false);
          this.snackbarService.showError(this.translate.instant('PO.CREATE_MISSING_ID'));
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.snackbarService.showError(this.translate.instant('PO.CREATE_ERROR'));
      },
    });
  }

  getCustomerParties(): void {
    this.orderService.getCustomerParties().subscribe({
      next: (data: CustomerPartySummary[]) => {
        this.customerParties.set(data || []);
        if (this.customerParties().length && !this.poForm.get('customerPartyId')?.value) {
          const first = this.customerParties()[0];
          this.poForm.get('customerPartyId')?.setValue(first.value ?? first.partyId ?? first);
        }
      },
      error: () => { }
    });
  }

  private buildItemGroup(): FormGroup {
    return this.formBuilder.group({
      productId: ['', Validators.required],
      quantity: [1, Validators.required],
      unitAmount: [0, Validators.required],
      itemTypeEnumId: ['INVENTORY_ORDER_ITEM', Validators.required],
    });
  }

  onProductSelected(event: MatAutocompleteSelectedEvent, index: number): void {
    const product = event.option.value;
    const productId = product?.productId;
    if (productId) {
      const selectedPrice = this.toNumberOrNull(product?.supplierLastPrice ?? product?.lastPrice);
      const unitAmountControl = this.items.at(index)?.get('unitAmount');
      if (unitAmountControl && selectedPrice != null) {
        unitAmountControl.setValue(selectedPrice);
      } else {
        this.applySupplierPrice(index, productId);
      }
    }
  }

  private applySupplierPrice(index: number, productId: string): void {
    const vendorPartyId = this.resolveVendorPartyId();
    const unitAmountControl = this.items.at(index)?.get('unitAmount');
    if (!vendorPartyId || !unitAmountControl) {
      unitAmountControl?.setValue(0);
      return;
    }

    this.supplierProductService.getLatestByPartyAndProduct(vendorPartyId, productId).subscribe({
      next: (supplierProduct: SupplierProductSummary) => {
        const priceValue = supplierProduct?.lastPrice;
        const numeric = priceValue != null ? Number(priceValue) : NaN;
        if (!Number.isNaN(numeric)) {
          unitAmountControl.setValue(numeric);
        } else {
          unitAmountControl.setValue(0);
        }
      },
      error: () => {
        unitAmountControl.setValue(0);
      },
    });
  }

  private addOrderItems(orderId: string, orderPrimaryId: string | number, shipGroupSeqId: string): void {
    if (!this.items.length) {
      this.router.navigate([`${this.detailBasePath}/${orderPrimaryId}`]);
      return;
    }

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
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: () => {
          this.items.clear();
          this.items.push(this.buildItemGroup());
          this.filteredProducts = [];
          this.initProductAutocomplete(0);
          this.router.navigate([`${this.detailBasePath}/${orderPrimaryId}`]);
          this.snackbarService.showSuccess(
            this.translate.instant(
              this.isQuoteMode ? 'PO.CREATE_QUOTE_SUCCESS' : 'PO.CREATE_SUCCESS'
            )
          );
        },
        error: () => {
          this.snackbarService.showError(
            this.translate.instant(
              this.isQuoteMode ? 'PO.CREATE_QUOTE_ITEMS_ERROR' : 'PO.CREATE_ITEMS_ERROR'
            )
          );
          this.router.navigate([`${this.detailBasePath}/${orderPrimaryId}`]);
        },
      });
  }


  onAddSupplierMouseDown(event: MouseEvent): void {
    event.stopPropagation();
  }

  addSupplier(): void {
    const dialogRef = this.dialog.open(AddSupplierDialogComponent, {
      width: '600px',
      disableClose: true,
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (result) {
        this.poForm.get('vendorPartyId')?.setValue(result);
      }
    });
  }

  onSupplierSelected(_event: MatAutocompleteSelectedEvent): void {
    this.refreshSupplierPrices();
  }

  private refreshSupplierPrices(): void {
    this.items.controls.forEach((control, index) => {
      const productValue = control.get('productId')?.value;
      const productId = productValue?.productId ?? productValue;
      if (productId) {
        this.applySupplierPrice(index, productId);
      }
    });
  }

  private resolveVendorPartyId(): string | null {
    const vendorPartyIdValue = this.poForm.get('vendorPartyId')?.value;
    const vendorPartyId = vendorPartyIdValue?.partyId ?? vendorPartyIdValue;
    return typeof vendorPartyId === 'string' && vendorPartyId.trim().length > 0 ? vendorPartyId.trim() : null;
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value == null || value === '') {
      return null;
    }
    const numeric = Number(value);
    return Number.isNaN(numeric) ? null : numeric;
  }

  trackBySupplier = (_: number, supplier: SupplierSummary): string | number =>
    supplier?.partyId ?? _;

  trackByFacility = (_: number, facility: FacilityReferenceItem): string | number =>
    facility?.facilityId ?? _;

  trackByFormIndex = (index: number): number => index;

  trackByProduct = (_: number, product: ProductAutocompleteItem): string | number =>
    product?.productId ?? _;

  trackByItemType = (_: number, type: { id: string }): string => type.id;
}

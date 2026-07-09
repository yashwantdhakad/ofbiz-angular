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
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of, from } from 'rxjs';
import {
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  startWith,
  switchMap,
  toArray,
} from 'rxjs/operators';
import { OrderService } from '@ofbiz/services/order/order.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { ProductService } from '@ofbiz/services/product/product.service';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { ProductSummary } from '@ofbiz/models/product.model';
import { FacilityAddress, FacilityDetail } from '@ofbiz/models/facility.model';

interface OrderCreateResponse {
  orderId?: string;
  id?: number;
}

@Component({
  standalone: false,
  selector: 'app-create-transfer',
  templateUrl: './create-transfer.component.html',
  styleUrls: ['./create-transfer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTransferComponent implements OnInit {
  isLoading = signal(false);
  facilities = signal<FacilityDetail[]>([]);
  shipByOptions = [
    { id: 'FEDEX@GROUND', label: 'FedEx Ground' },
    { id: 'FEDEX@SECOND_DAY', label: 'FedEx Second Day' },
    { id: 'FEDEX@NEXT_DAY', label: 'FedEx Next Day' },
    { id: 'UPS@GROUND', label: 'UPS Ground' },
    { id: 'UPS@SECOND_DAY', label: 'UPS Second Day' },
    { id: 'UPS@NEXT_DAY', label: 'UPS Next Day' },
  ];
  filteredProducts: Observable<ProductSummary[]>[] = [];
  fromFacilityAddresses = signal<FacilityAddress[]>([]);
  toFacilityAddresses = signal<FacilityAddress[]>([]);
  availableToFacilities = signal<FacilityDetail[]>([]);

  transferForm: FormGroup;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private formBuilder: FormBuilder,
    private orderService: OrderService,
    private router: Router,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private productService: ProductService,
    private facilityService: FacilityService
  ) {
    this.transferForm = this.formBuilder.group({
      fromFacilityId: ['', Validators.required],
      toFacilityId: ['', Validators.required],
      shipByMethod: ['', Validators.required],
      shippingInstructions: [''],
      items: this.formBuilder.array([this.buildItemGroup()]),
    });
  }

  ngOnInit(): void {
    this.loadFacilities();
    this.initProductAutocomplete(0);
    this.watchFacilitySelection('fromFacilityId', this.fromFacilityAddresses);
    this.watchFacilitySelection('toFacilityId', this.toFacilityAddresses);
    this.watchDestinationFacilityOptions();
  }

  get items(): FormArray {
    return this.transferForm.get('items') as FormArray;
  }

  private buildItemGroup(): FormGroup {
    return this.formBuilder.group({
      productId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
    });
  }

  private loadFacilities(): void {
    this.facilityService
      .getFacilities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const facilities = data || [];
          this.facilities.set(facilities);
          this.availableToFacilities.set(facilities);
        },
        error: () => {
          this.facilities.set([]);
          this.availableToFacilities.set([]);
        },
      });
  }

  private watchDestinationFacilityOptions(): void {
    this.transferForm.get('fromFacilityId')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((fromFacilityId: string) => {
        const availableFacilities = this.facilities().filter(
          (facility) => facility.facilityId !== fromFacilityId
        );
        this.availableToFacilities.set(availableFacilities);

        const toFacilityControl = this.transferForm.get('toFacilityId');
        if (toFacilityControl?.value && toFacilityControl.value === fromFacilityId) {
          toFacilityControl.setValue('');
          toFacilityControl.markAsTouched();
        }
      });
  }

  private watchFacilitySelection(
    controlName: string,
    addressesSignal: ReturnType<typeof signal<FacilityAddress[]>>
  ): void {
    this.transferForm.get(controlName)!.valueChanges.pipe(
      distinctUntilChanged(),
      switchMap((facilityId: string) => {
        if (!facilityId) {
          addressesSignal.set([]);
          return of(null);
        }
        return this.facilityService.getFacility(facilityId).pipe(
          catchError(() => of(null))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((response) => {
      addressesSignal.set(response?.addresses || []);
    });
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
          return this.productService
            .getProductsAutocompleteFromOms(name)
            .pipe(
              map((res) => res?.documentList || []),
              catchError(() => of([]))
            );
        })
      );
    }
  }

  displayProduct(product: ProductSummary | string | null): string {
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

  onProductSelected(_event: MatAutocompleteSelectedEvent, _index: number): void {
    // No supplier price lookup needed for transfers
  }

  createTransfer(): void {
    if (this.transferForm.invalid || this.isLoading()) {
      this.transferForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const formValue = this.transferForm.value;

    if (formValue.fromFacilityId === formValue.toFacilityId) {
      this.isLoading.set(false);
      this.transferForm.get('toFacilityId')?.setErrors({ sameFacility: true });
      this.transferForm.markAllAsTouched();
      return;
    }

    const payload: Record<string, unknown> = {
      orderTypeEnumId: 'TRANSFER_ORDER',
      facilityId: formValue.toFacilityId,
      originFacilityId: formValue.fromFacilityId,
      shipByMethod: formValue.shipByMethod,
      shippingInstructions: formValue.shippingInstructions,
    };

    this.orderService.createOrder(payload).subscribe({
      next: (order) => {
        const typedOrder = order as OrderCreateResponse;
        const orderId = typedOrder?.orderId;
        const orderPrimaryId = typedOrder?.id;
        if (orderId && orderPrimaryId) {
          this.addOrderItems(orderId, orderPrimaryId);
        } else {
          this.isLoading.set(false);
          this.snackbarService.showError(this.translate.instant('TRANSFER.ERROR_CREATE'));
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.snackbarService.showError(this.translate.instant('TRANSFER.ERROR_CREATE'));
      },
    });
  }

  private addOrderItems(orderId: string, orderPrimaryId: number): void {
    if (!this.items.length) {
      this.router.navigate([`/transfers/${orderPrimaryId}`]);
      return;
    }

    from(this.items.controls)
      .pipe(
        concatMap((control) => {
          const value = control.value;
          const productId = value?.productId?.productId ?? value.productId;
          return this.orderService.addItem({
            orderId,
            orderPartSeqId: '00001',
            productId,
            quantity: value.quantity,
            unitAmount: 0,
            itemTypeEnumId: 'INVENTORY_ORDER_ITEM',
          });
        }),
        toArray(),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate([`/transfers/${orderPrimaryId}`]);
          this.snackbarService.showSuccess(this.translate.instant('TRANSFER.SUCCESS_CREATE'));
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('TRANSFER.ERROR_ITEMS'));
          this.router.navigate([`/transfers/${orderPrimaryId}`]);
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/transfers']);
  }

  trackByFacility = (_: number, facility: FacilityDetail): string | number =>
    facility?.facilityId ?? _;

  trackByFormIndex = (index: number): number => index;

  trackByProduct = (_: number, product: ProductSummary): string | number =>
    product?.productId ?? _;

  trackByOptionId = (_: number, option: { id: string }): string => option.id;
}

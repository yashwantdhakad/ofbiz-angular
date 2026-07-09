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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  Observable,
  of,
  debounceTime,
  distinctUntilChanged,
  from,
  map,
  startWith,
  switchMap,
} from 'rxjs';
import { finalize } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { OrderService } from '@ofbiz/services/order/order.service';
import { ProductService } from '@ofbiz/services/product/product.service';

@Component({
  standalone: false,
  selector: 'app-product-item',
  templateUrl: './product-item.component.html',
  styleUrls: ['./product-item.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductItemComponent implements OnInit {
  addUpdateProductItemForm: FormGroup;
  readonly isLoading = signal(false);
  isUpdateMode = false;
  filteredProducts$: Observable<any[]> = new Observable<any[]>();
  itemProductIdControl = new FormControl();
  enumTypes: any[] | undefined;
  itemTypes = [
    { key: 'ItemInventory', text: 'Inventory' },
    { key: 'ItemAsset', text: 'Fixed Asset' },
    { key: 'ItemExpSupplies', text: 'Supplies' },
    { key: 'ItemProduct', text: 'Product' },
    { key: 'ItemRental', text: 'Rental Asset' },
    { key: 'ItemReplacement', text: 'Replacement' },
  ];

  constructor(
    public dialogRef: MatDialogRef<ProductItemComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { productItemData: any },
    private fb: FormBuilder,
    private orderService: OrderService,
    private productService: ProductService,
    private commonService: CommonService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {
    const {
      orderId,
      orderPartSeqId,
      orderItemSeqId,
      updateExisting,
      requireInventory,
      productId,
      quantity,
      unitAmount,
      calcAmount,
      standardCost,
      requiredByDate,
      itemTypeEnumId,
    } = this.data?.productItemData ?? {};

    this.addUpdateProductItemForm = this.fb.group({
      orderId: [orderId],
      orderPartSeqId: [orderPartSeqId],
      orderItemSeqId: [orderItemSeqId],
      updateExisting: [updateExisting || false],
      requireInventory: [requireInventory || false],
      productId: [productId, Validators.required],
      quantity: [quantity, Validators.required],
      calcAmount: [calcAmount],
      standardCost: [standardCost],
      unitAmount: [unitAmount, Validators.required],
      requiredByDate: [requiredByDate],
      itemTypeEnumId: [itemTypeEnumId],
    });
  }


  private setupAutocomplete(): void {
    this.filteredProducts$ = this.addUpdateProductItemForm.get('productId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => this.getProductsFromService(value))
    );
  }

  public getProductsFromService(value: any): Observable<any[]> {
    const query = typeof value === 'string' ? value : (value as any)?.productId ?? '';
    if (!query) {
      return of([]);
    }
    return from(this.productService.getProductsAutocompleteFromOms(query)).pipe(map((response: any) => response.documentList || []));
  }

  ngOnInit(): void {
    this.setupAutocomplete();

    // Check if we are in update mode
    const updateExisting = this.addUpdateProductItemForm.get('updateExisting')?.value;
    this.isUpdateMode = !!updateExisting;
  }

  displayProduct(product: any): string {
    if (!product) {
      return '';
    }
    if (typeof product === 'string') {
      return product;
    }
    return product.productName || product.name || product.internalName || product.productId || '';
  }

  addUpdateProductItem(): void {
    if (!this.addUpdateProductItemForm.valid) return;

    this.isLoading.set(true);
    const values = this.addUpdateProductItemForm.value;
    const payload = {
      ...values,
      productId: values?.productId?.productId ?? values?.productId,
    };

    const action$ = payload.updateExisting
      ? this.orderService.updateOrderItemQuantity(
        payload.orderId,
        payload.orderItemSeqId,
        payload.quantity,
        payload.unitAmount,
        payload.requiredByDate
      )
      : this.orderService.addItem(payload);

    action$.pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: () => {
        this.dialogRef.close(payload);
        this.addUpdateProductItemForm.reset();
      },
      error: (err) => {
        const message = err?.error?.message || err?.message || this.translate.instant('ORDER.ITEM_SAVE_ERROR');
        this.snackbarService.showError(message);
        this.cdr.markForCheck();
      },
    });
  }
}

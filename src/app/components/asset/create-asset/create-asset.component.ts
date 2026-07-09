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
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { OrderService } from '@ofbiz/services/order/order.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { ReturnService } from '@ofbiz/services/return/return.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-create-asset',
  templateUrl: './create-asset.component.html',
  styleUrls: ['./create-asset.component.css'],
})
export class CreateAssetComponent implements OnInit {
  receiveHubForm: FormGroup;
  filteredProducts$: Observable<any[]> = of([]);
  filteredPurchaseOrders$: Observable<any[]> = of([]);
  filteredReturns$: Observable<any[]> = of([]);
  readonly isProductSearchLoading = signal(false);
  readonly isPurchaseOrderSearchLoading = signal(false);
  readonly isReturnSearchLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private orderService: OrderService,
    private productService: ProductService,
    private returnService: ReturnService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
  ) {
    this.receiveHubForm = this.fb.group({
      product: [null, Validators.required],
      purchaseOrder: [null, Validators.required],
      returnHeader: [null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.setupAutocomplete();
  }

  private setupAutocomplete(): void {
    this.filteredProducts$ = this.receiveHubForm.get('product')!.valueChanges.pipe(
      startWith(''),
      debounceTime(150),
      distinctUntilChanged(),
      switchMap((value: any) => this.getProductsFromService(value))
    );
    this.filteredPurchaseOrders$ = this.receiveHubForm.get('purchaseOrder')!.valueChanges.pipe(
      startWith(''),
      debounceTime(150),
      distinctUntilChanged(),
      switchMap((value: any) => this.searchPurchaseOrders(value))
    );
    this.filteredReturns$ = this.receiveHubForm.get('returnHeader')!.valueChanges.pipe(
      startWith(''),
      debounceTime(150),
      distinctUntilChanged(),
      switchMap((value: any) => this.searchReturns(value))
    );
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

  displayPurchaseOrder(order: any): string {
    if (!order) {
      return '';
    }
    if (typeof order === 'string') {
      return order;
    }
    return order.orderId || '';
  }

  displayReturn(returnHeader: any): string {
    if (!returnHeader) {
      return '';
    }
    if (typeof returnHeader === 'string') {
      return returnHeader;
    }
    return returnHeader.returnId || '';
  }

  private getProductsFromService(value: any): Observable<any[]> {
    const query = typeof value === 'string' ? value : value?.productId ?? '';
    if (!query) {
      this.isProductSearchLoading.set(false);
      return of([]);
    }
    this.isProductSearchLoading.set(true);
    return this.productService.getProductsAutocompleteFromOms(query).pipe(
      map((res: any) => res?.documentList ?? []),
      finalize(() => this.isProductSearchLoading.set(false)),
      catchError(() => {
        this.snackbarService.showError(this.translate.instant('ASSET.LOAD_PRODUCTS_ERROR'));
        return of([]);
      })
    );
  }

  private searchPurchaseOrders(value: any): Observable<any[]> {
    const query = typeof value === 'string' ? value : value?.orderId ?? '';
    if (!query) {
      this.isPurchaseOrderSearchLoading.set(false);
      return of([]);
    }
    this.isPurchaseOrderSearchLoading.set(true);
    return this.orderService.getPOs(0, 10, query, undefined, undefined, { statusId: 'ORDER_APPROVED' }).pipe(
      map((response: any) => {
        const list = Array.isArray(response?.responseMap?.orderList) ? response.responseMap.orderList : [];
        return list.filter((item: any) => {
          const statusId = String(item?.statusId || '').toUpperCase();
          const statusDescription = String(item?.statusDescription || '').toUpperCase();
          return statusId === 'ORDER_APPROVED' || statusDescription.includes('APPROVED');
        });
      }),
      finalize(() => this.isPurchaseOrderSearchLoading.set(false)),
      catchError(() => {
        this.snackbarService.showError(this.translate.instant('ASSET.LOAD_PURCHASE_ORDERS_ERROR'));
        return of([]);
      })
    );
  }

  private searchReturns(value: any): Observable<any[]> {
    const query = typeof value === 'string' ? value : value?.returnId ?? '';
    if (!query) {
      this.isReturnSearchLoading.set(false);
      return of([]);
    }
    this.isReturnSearchLoading.set(true);
    return this.returnService.listReturns({
      returnId: query,
      statusId: 'RETURN_ACCEPTED',
      page: 0,
      size: 10,
    }).pipe(
      map((response: any) => Array.isArray(response?.content) ? response.content : []),
      finalize(() => this.isReturnSearchLoading.set(false)),
      catchError(() => {
        this.snackbarService.showError(this.translate.instant('ASSET.LOAD_RETURNS_ERROR'));
        return of([]);
      })
    );
  }

  startProductReceiving(): void {
    const control = this.receiveHubForm.get('product');
    if (control?.invalid) {
      control.markAsTouched();
      return;
    }
    const product = control?.value;
    const productId = product?.productId || product;
    if (!productId || typeof product === 'string') {
      control?.setErrors({ required: true });
      control?.markAsTouched();
      return;
    }
    this.router.navigate(['/assets/create/product'], { queryParams: { productId } });
  }

  startPurchaseOrderReceiving(): void {
    const control = this.receiveHubForm.get('purchaseOrder');
    if (control?.invalid) {
      control.markAsTouched();
      return;
    }
    const purchaseOrder = control?.value;
    if (!purchaseOrder?.id) {
      control?.setErrors({ required: true });
      control?.markAsTouched();
      return;
    }
    this.orderService.getOrderById(purchaseOrder.id).subscribe({
      next: (response: any) => {
        const items = Array.isArray(response?.parts)
          ? response.parts.flatMap((part: any) => part?.items || [])
          : [];
        const hasRemaining = items.some((item: any) => Number(item?.remainingQuantity || 0) > 0);
        if (!hasRemaining) {
          this.snackbarService.showError(this.translate.instant('ASSET.PURCHASE_ORDER_NO_REMAINING'));
          return;
        }
        const statusId = String(
          response?.statusItem?.statusId
          || response?.orderHeader?.statusId
          || response?.statusId
          || ''
        ).toUpperCase();
        const statusDescription = String(
          response?.statusItem?.description
          || response?.orderHeader?.statusDescription
          || response?.statusDescription
          || ''
        ).toUpperCase();
        const hasExplicitStatus = Boolean(statusId || statusDescription);
        const isApproved = statusId === 'ORDER_APPROVED' || statusDescription.includes('APPROVED');
        if (hasExplicitStatus && !isApproved) {
          this.snackbarService.showError(
            this.translate.instant('ASSET.PURCHASE_ORDER_APPROVAL_REQUIRED')
          );
          return;
        }
        this.router.navigate([`/pos/${purchaseOrder.id}/receive`]);
      },
      error: () => {
        this.snackbarService.showError(
          this.translate.instant('ASSET.PURCHASE_ORDER_VALIDATE_ERROR')
        );
      },
    });
  }

  startReturnReceiving(): void {
    const control = this.receiveHubForm.get('returnHeader');
    if (control?.invalid) {
      control.markAsTouched();
      return;
    }
    const returnHeader = control?.value;
    const returnId = returnHeader?.returnId;
    if (!returnId || typeof returnHeader === 'string') {
      control?.setErrors({ required: true });
      control?.markAsTouched();
      return;
    }
    this.returnService.getReturn(returnId).subscribe({
      next: (response: any) => {
        const summaryStatus = String(response?.summary?.statusId || '').toUpperCase();
        const hasRemaining = Array.isArray(response?.items)
          && response.items.some((item: any) => Number(item?.returnQuantity || 0) > Number(item?.receivedQuantity || 0));
        if (summaryStatus !== 'RETURN_ACCEPTED' || !hasRemaining) {
          this.snackbarService.showError(this.translate.instant('ASSET.RETURN_INELIGIBLE'));
          return;
        }
        this.router.navigate([`/returns/${encodeURIComponent(returnId)}/receive`]);
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('ASSET.RETURN_VALIDATE_ERROR'));
      }
    });
  }
}

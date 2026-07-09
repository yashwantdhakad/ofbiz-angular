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
import { ChangeDetectionStrategy, Component, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ProductService } from '@ofbiz/services/product/product.service';
import { Observable, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, tap } from 'rxjs/operators';
import { ProductAutocompleteItem, ProductListResponse } from '@ofbiz/models/product.model';
import {
  AddDeliverableItemDialogData,
  AddDeliverableItemDialogResult,
  DeliverableProductAutocompleteItem,
} from '@ofbiz/models/manufacturing.model';

@Component({
  standalone: false,
  selector: 'app-add-deliverable-item-dialog',
  templateUrl: './add-deliverable-item-dialog.component.html',
  styleUrls: ['./add-deliverable-item-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddDeliverableItemDialogComponent implements OnInit {
  form: FormGroup;
  filteredProducts$: Observable<DeliverableProductAutocompleteItem[]> = of([]);
  selectedProduct: DeliverableProductAutocompleteItem | null = null;
  readonly isLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddDeliverableItemDialogComponent, AddDeliverableItemDialogResult | undefined>,
    private productService: ProductService,
    @Inject(MAT_DIALOG_DATA) public data: AddDeliverableItemDialogData | null
  ) {
    const item = data?.item;
    this.form = this.fb.group({
      productId: [item?.productId || '', Validators.required],
      estimatedQuantity: [item?.estimatedQuantity || '1', [Validators.required, Validators.min(0.000001)]],
      fromDate: [{ value: item?.fromDate ? this.parseLocalDate(item.fromDate) : new Date(), disabled: !!item }],
      thruDate: [item?.thruDate ? new Date(item.thruDate) : null],
      productSearch: [item?.productName || item?.productId || '', Validators.required],
    });
  }

  ngOnInit(): void {
    this.filteredProducts$ = this.form.get('productSearch')!.valueChanges.pipe(
      startWith(this.form.get('productSearch')!.value || ''),
      debounceTime(250),
      distinctUntilChanged(),
      tap((value) => {
        if (typeof value === 'string' && this.selectedProduct) {
          this.selectedProduct = null;
          this.form.patchValue({ productId: '' }, { emitEvent: false });
        }
      }),
      tap(() => this.isLoading.set(true)),
      switchMap((value) => {
        const query = typeof value === 'string' ? value : value?.productId || value?.name || '';
        return this.productService.getProductsAutocompleteFromOms(query || '').pipe(
          map((response: ProductListResponse<ProductAutocompleteItem>) => {
            const list = Array.isArray(response?.documentList) ? response.documentList : [];
            return list as DeliverableProductAutocompleteItem[];
          }),
          catchError(() => of([])),
          tap(() => this.isLoading.set(false))
        );
      })
    );
  }

  save(): void {
    if (this.form.invalid || !this.form.value.productId) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const result: AddDeliverableItemDialogResult = {
      productId: value.productId,
      estimatedQuantity: value.estimatedQuantity,
      fromDate: value.fromDate,
      thruDate: value.thruDate,
    };
    this.dialogRef.close(result);
  }

  close(): void {
    this.dialogRef.close();
  }

  onProductSelected(product: DeliverableProductAutocompleteItem): void {
    if (this.data?.item) {
      return;
    }
    this.selectedProduct = product;
    this.form.patchValue(
      {
        productId: product?.productId || '',
        productSearch: product?.name || product?.productName || product?.productId || '',
      },
      { emitEvent: false }
    );
  }

  displayProduct(product: string | DeliverableProductAutocompleteItem | null): string {
    if (!product) {
      return '';
    }
    if (typeof product === 'string') {
      return product;
    }
    return product?.name || product?.productName || product?.productId || '';
  }

  private parseLocalDate(value: string): Date {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}

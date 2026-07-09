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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, Inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-add-edit-product-price',
  templateUrl: './add-edit-product-price.component.html',
  styleUrls: ['./add-edit-product-price.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddEditProductPriceComponent {
  addUpdateProductPriceForm: FormGroup;
  readonly isLoading = signal(false);
  priceTypeEnums: any[] | undefined;
  pricePurposeEnums: any[] | undefined;
  priceUomOptions: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<AddEditProductPriceComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { productPriceData: any },
    private fb: FormBuilder,
    private productService: ProductService,
    private commonService: CommonService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private destroyRef: DestroyRef,
    private cdr: ChangeDetectorRef
  ) {
    const {
      productId,
      productPriceId,
      productPriceTypeId,
      productPricePurposeId,
      price,
      currencyUomId,
    } = this.data?.productPriceData ?? {};

    this.priceTypeEnums = this.data.productPriceData.priceTypeEnums;
    this.pricePurposeEnums = this.data.productPriceData.pricePurposeEnums;

    this.addUpdateProductPriceForm = this.fb.group({
      productId: [productId],
      productPriceTypeId: [productPriceTypeId || 'DEFAULT_PRICE', Validators.required],
      productPricePurposeId: [productPricePurposeId || 'PURCHASE', Validators.required],
      price: [price, Validators.required],
      currencyUomId: [currencyUomId || 'USD', Validators.required],
      productPriceId: [productPriceId],
    });

    this.getUoms();
  }

  getUoms(): void {
    this.commonService.getUoms('CURRENCY_MEASURE').pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data) => {
        this.priceUomOptions = Array.isArray(data) ? data : [data];
        this.cdr.markForCheck();
      },
      error: (_error) => {
        this.snackbarService.showError(this.translate.instant('PRODUCT.PRICE_UOM_FETCH_ERROR'));
        this.cdr.markForCheck();
      }
    });
  }

  addUpdateProductPrice(): void {
    if (this.addUpdateProductPriceForm.valid) {
      this.isLoading.set(true);
      const values = this.addUpdateProductPriceForm.value;

      const request$ = values.productPriceId
        ? this.productService.updateProductPrice(values)
        : this.productService.addProductPrice(values);

      request$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.isLoading.set(false))
        )
        .subscribe({
          next: () => {
            const messageKey = values.productPriceId
              ? 'PRODUCT.PRICE_UPDATE_SUCCESS'
              : 'PRODUCT.PRICE_ADD_SUCCESS';
            this.snackbarService.showSuccess(this.translate.instant(messageKey));
            this.addUpdateProductPriceForm.reset();
            this.dialogRef.close(values);
          },
          error: () => {
            this.snackbarService.showError(this.translate.instant('PRODUCT.PRICE_SAVE_ERROR'));
          },
        });
    }
  }
}

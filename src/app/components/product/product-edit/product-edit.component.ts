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
import { ChangeDetectionStrategy, Component, DestroyRef, Inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-product-edit',
  templateUrl: './product-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductEditComponent {
  updateProductForm: FormGroup;
  readonly isLoading = signal(false);

  constructor(
    public dialogRef: MatDialogRef<ProductEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { productDetail: any },
    private fb: FormBuilder,
    private productService: ProductService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private destroyRef: DestroyRef
  ) {
    const { productId, productName, internalName, description, requireInspection } = this.data?.productDetail ?? {};

    this.updateProductForm = this.fb.group({
      productId: [productId],
      productName: [productName, Validators.required],
      internalName: [internalName],
      description: [description],
      requireInspection: [requireInspection === 'Y'],
    });
  }

  updateProduct(): void {
    if (this.updateProductForm.invalid) {
      this.updateProductForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    const formVals = this.updateProductForm.value;
    const values = {
      ...formVals,
      requireInspection: formVals.requireInspection ? 'Y' : 'N',
    };

    this.productService
      .updateProduct(values)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('PRODUCT.UPDATE_SUCCESS'));
          this.updateProductForm.reset();
          this.dialogRef.close(values);
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('PRODUCT.UPDATE_ERROR'));
        },
      });
  }
}

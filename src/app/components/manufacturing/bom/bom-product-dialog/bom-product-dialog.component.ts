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
import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { CommonService } from '@ofbiz/services/common/common.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ProductService } from '@ofbiz/services/product/product.service';

export interface BomProductDialogData {
  defaultProductTypeId?: string;
}

@Component({
  standalone: false,
  selector: 'app-bom-product-dialog',
  templateUrl: './bom-product-dialog.component.html',
  styleUrls: ['./bom-product-dialog.component.css'],
})
export class BomProductDialogComponent implements OnInit {
  readonly isSaving = signal(false);
  readonly productTypes = signal<any[]>([]);
  readonly productForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private productService: ProductService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private renderScheduler: RenderSchedulerService,
    private dialogRef: MatDialogRef<BomProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BomProductDialogData
  ) {
    this.productForm = this.fb.group({
      productName: ['', Validators.required],
      internalName: [''],
      productTypeId: [data?.defaultProductTypeId || 'FINISHED_GOOD', Validators.required],
      description: [''],
      price: [
        null,
        [
          Validators.min(0),
          Validators.pattern(/^\d+(\.\d{1,2})?$/),
        ],
      ],
    });
  }

  ngOnInit(): void {
    this.fetchProductTypes();
  }

  save(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.productService.createProduct(this.productForm.getRawValue()).pipe(
      finalize(() => {
        this.renderScheduler.deferMacrotask(() => {
          this.isSaving.set(false);
        });
      })
    ).subscribe({
      next: (response) => {
        const createdProduct = this.normalizeCreatedProduct(response);
        if (!createdProduct?.productId) {
          this.snackbarService.showError(this.translate.instant('PRODUCT.FAILED_CREATE'));
          return;
        }
        this.snackbarService.showSuccess(this.translate.instant('PRODUCT.CREATED_SUCCESS'));
        this.dialogRef.close(createdProduct);
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('PRODUCT.ERROR_CREATE'));
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  trackByProductType = (index: number, productType: any): string =>
    productType?.productTypeId ?? String(index);

  private fetchProductTypes(): void {
    this.commonService.getLookupResults({}, 'product_type').subscribe({
      next: (data) => {
        const rawTypes = Array.isArray(data) ? data : [data];
        this.productTypes.set(
          rawTypes
            .map((item: any) => ({
              ...item,
              productTypeId: item?.productTypeId || item?.product_type_id || '',
              description: item?.description || item?.productTypeId || item?.product_type_id || '',
            }))
            .filter((item: any) => !!item.productTypeId)
        );
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('PRODUCT.FETCH_TYPES_ERROR'));
      },
    });
  }

  private normalizeCreatedProduct(response: any): any {
    const product = response?.product ?? response;
    const productId = String(product?.productId || '').trim();
    if (!productId) {
      return null;
    }
    const productName = String(
      product?.productName || product?.name || this.productForm.get('productName')?.value || productId
    ).trim();

    return {
      ...product,
      productId,
      productName,
      name: productName,
    };
  }
}

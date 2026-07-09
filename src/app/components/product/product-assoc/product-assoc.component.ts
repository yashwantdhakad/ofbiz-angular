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
import { ChangeDetectionStrategy, Component, DestroyRef, Inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  catchError,
  map,
  startWith,
  switchMap,
  finalize,
} from 'rxjs';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';

@Component({
  standalone: false,
  selector: 'app-product-assoc',
  templateUrl: './product-assoc.component.html',
  styleUrls: ['./product-assoc.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductAssocComponent implements OnInit {
  addProductAssocForm: FormGroup;
  enumTypes = signal<any[] | undefined>(undefined);
  isLoading = signal<boolean>(false);
  filteredProducts$: Observable<any[]> = new Observable<any[]>();

  constructor(
    private commonService: CommonService,
    private productService: ProductService,
    private snackbarService: SnackbarService,
    public dialogRef: MatDialogRef<ProductAssocComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { assocData: any },
    private fb: FormBuilder,
    private translate: TranslateService,
    private renderScheduler: RenderSchedulerService,
    private destroyRef: DestroyRef
  ) {
    const {
      productId,
      toProductId,
      productAssocTypeEnumId,
      sequenceNum,
      quantity,
      fromDate,
    } = data?.assocData || {};

    const todayIso = new Date().toISOString().split('T')[0];
    this.addProductAssocForm = this.fb.group({
      productId: [productId],
      toProductId: [toProductId, Validators.required],
      productAssocTypeEnumId: [productAssocTypeEnumId, Validators.required],
      sequenceNum: [sequenceNum],
      quantity: [quantity],
      fromDate: [fromDate || todayIso],
    });

    this.getEnumTypes();
  }

  ngOnInit(): void {
    const toProductControl = this.addProductAssocForm.get('toProductId') as FormControl;
    this.filteredProducts$ = toProductControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => this.getProductsFromService(value))
    );
  }

  displayProduct(product: any): string {
    if (!product) return '';
    if (typeof product === 'string') return product;
    return product.productName || product.name || product.internalName || product.productId || '';
  }

  private getProductsFromService(value: any): Observable<any[]> {
    const query = typeof value === 'string' ? value : value?.productId ?? '';
    if (!String(query || '').trim()) return of([]);
    return this.productService.getProductsAutocompleteFromOms(query).pipe(
      map((response: any) => response?.documentList || []),
      catchError(() => of([]))
    );
  }

  getEnumTypes(): void {
    this.renderScheduler.deferMacrotask(() => {
      this.isLoading.set(true);
    });
    this.productService.getProductAssocTypes().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() =>
        this.renderScheduler.deferMacrotask(() => {
          this.isLoading.set(false);
        })
      )
    ).subscribe({
      next: (data) => {
        const types = Array.isArray(data) ? data : [data];
        this.renderScheduler.deferMacrotask(() => {
          this.enumTypes.set(types);
        });
      },
      error: () => {
        this.snackbarService.showError(
          this.translate.instant('PRODUCT.FETCH_TYPES_ERROR')
        );
      }
    });
  }

  createProductAssoc(): void {
    if (this.addProductAssocForm.valid) {
      this.isLoading.set(true);
      const values = this.addProductAssocForm.value;
      const payload = {
        ...values,
        toProductId: values?.toProductId?.productId ?? values?.toProductId,
      };

      this.productService
        .createProductAssoc(payload)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() =>
            this.renderScheduler.deferMacrotask(() => {
              this.isLoading.set(false);
            })
          )
        )
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(
              this.translate.instant('PRODUCT.ASSOC_SAVE_SUCCESS')
            );
            this.addProductAssocForm.reset({ productAssocTypeEnumId: '' });
            this.dialogRef.close(payload);
          },
          error: () => {
            this.snackbarService.showError(
              this.translate.instant('PRODUCT.ASSOC_SAVE_ERROR')
            );
          },
        });
    }
  }

  trackByProduct = (index: number, product: any): string =>
    product?.productId ?? String(index);

  trackByEnumType = (index: number, enumType: any): string =>
    enumType?.enumId ?? String(index);
}

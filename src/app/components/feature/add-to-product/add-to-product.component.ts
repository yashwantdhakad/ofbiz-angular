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
import { ChangeDetectionStrategy, Component, DestroyRef, Inject, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, startWith, switchMap, map, catchError, finalize } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@ofbiz/components/common/material/material.module';
import { CommonService } from '@ofbiz/services/common/common.service';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  standalone: true,
  selector: 'app-add-to-product',
  templateUrl: './add-to-product.component.html',
  styleUrls: ['./add-to-product.component.css'],
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddToProductComponent implements OnInit {
  createProductFeatureApplForm: FormGroup;
  readonly isLoading = signal(false);
  filteredProducts$!: Observable<any[]>;
  filteredFeatures$!: Observable<any[]>;
  readonly applTypes = signal<any[]>([]);
  isNew: boolean;
  showFeatureSelector: boolean;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public dialogRef: MatDialogRef<AddToProductComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { featureProductData: any },
    private fb: FormBuilder,
    private productService: ProductService,
    private featureService: FeatureService,
    private commonService: CommonService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    const {
      id,
      isNew,
      productFeatureId,
      productId,
      applTypeEnumId,
      productFeatureApplTypeId,
      sequenceNum,
      amount,
      fromDate
    } = this.data?.featureProductData ?? {};

    this.isNew = isNew;
    this.showFeatureSelector = !productFeatureId;

    this.createProductFeatureApplForm = this.fb.group({
      id: [id],
      productFeatureId: [productFeatureId, this.showFeatureSelector ? Validators.required : []],
      applTypeEnumId: [applTypeEnumId || productFeatureApplTypeId || '', Validators.required],
      productId: [productId, Validators.required],
      sequenceNum: [sequenceNum],
      amount: [amount],
      fromDate: [fromDate],
    });
  }

  ngOnInit(): void {
    this.loadEnumTypes();
    this.initProductAutocomplete();
    this.initFeatureAutocomplete();
  }

  private initProductAutocomplete(): void {
    this.filteredProducts$ = this.createProductFeatureApplForm.get('productId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => this.getProducts(value)),
      takeUntilDestroyed(this.destroyRef)
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

  displayFeature(feature: any): string {
    if (!feature) {
      return '';
    }
    if (typeof feature === 'string') {
      return feature;
    }
    return feature.description || feature.abbrev || feature.productFeatureId || '';
  }

  private getProducts(query: any): Observable<any[]> {
    const keyword = typeof query === 'string' ? query : query?.productId ?? '';
    if (!keyword) return of([]);

    return this.productService.getProductsAutocompleteFromOms(keyword).pipe(
      map(res => res?.documentList ?? []),
      catchError(() => {
        this.snackbarService.showError(this.translate.instant('FEATURE.FETCH_PRODUCTS_ERROR'));
        return of([]);
      })
    );
  }

  private initFeatureAutocomplete(): void {
    const control = this.createProductFeatureApplForm.get('productFeatureId');
    if (!control || !this.showFeatureSelector) {
      return;
    }

    this.filteredFeatures$ = control.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => this.getFeatures(value)),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  private getFeatures(query: any): Observable<any[]> {
    const keyword = typeof query === 'string' ? query : query?.productFeatureId ?? '';
    if (!keyword) return of([]);

    return this.featureService.getFeatures(0, keyword).pipe(
      map(res => res?.body ?? []),
      catchError(() => {
        this.snackbarService.showError(this.translate.instant('FEATURE.FETCH_ERROR'));
        return of([]);
      })
    );
  }

  private loadEnumTypes(): void {
    this.commonService.getLookupResults({}, 'product_feature_appl_type').pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data) => {
        let applTypes: any[] = [];
        if (Array.isArray(data)) {
          applTypes = data;
        } else if (data) {
          applTypes = [data];
        }
        this.applTypes.set(applTypes);
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('FEATURE.FETCH_APPL_TYPES_ERROR'));
      }
    });
  }

  createProductFeatureAppl(): void {
    if (this.createProductFeatureApplForm.invalid) return;

    this.isLoading.set(true);
    const values = this.createProductFeatureApplForm.value;
    const payload = {
      ...values,
      productId: values?.productId?.productId ?? values?.productId,
      productFeatureId: values?.productFeatureId?.productFeatureId ?? values?.productFeatureId,
      productFeatureApplTypeId: values.applTypeEnumId,
    };
    delete payload.applTypeEnumId;
    const action$ = values.id
      ? this.featureService.updateProductFeatureAppl(payload)
      : this.featureService.createProductFeatureAppl(payload);

    action$.pipe(
      finalize(() => this.isLoading.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        const messageKey = values.id
          ? 'FEATURE.APPLICATION_UPDATE_SUCCESS'
          : 'FEATURE.APPLICATION_CREATE_SUCCESS';
        this.snackbarService.showSuccess(this.translate.instant(messageKey));
        this.dialogRef.close(payload);
      },
      error: (_error) => {
        this.snackbarService.showError(this.translate.instant('FEATURE.APPLICATION_SAVE_ERROR'));
      }
    });
  }
}

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
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { SharedPartyMaterialModule } from '@ofbiz/components/common/material/shared-party-material.module';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SupplierProductService } from '@ofbiz/services/supplier-product/supplier-product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { ProductSummary } from '@ofbiz/models/product.model';

interface PartySummary {
  partyId?: string;
  groupName?: string;
  name?: string;
}

@Component({
  standalone: true,
  selector: 'app-supplier-product-dialog',
  templateUrl: './supplier-product-dialog.component.html',
  styleUrls: ['./supplier-product-dialog.component.css'],
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, SharedPartyMaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierProductDialogComponent implements OnInit {
  supplierProductForm: FormGroup;
  filteredProducts$: Observable<ProductSummary[]> = of([]);
  filteredSuppliers$: Observable<PartySummary[]> = of([]);
  isLoading = signal<boolean>(false);
  isPartyLocked = false;
  isProductLocked = false;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private partyService: PartyService,
    private supplierProductService: SupplierProductService,
    private snackbarService: SnackbarService,
    private dialogRef: MatDialogRef<SupplierProductDialogComponent>,
    private renderScheduler: RenderSchedulerService,
    private translate: TranslateService,
    @Inject(MAT_DIALOG_DATA) public data: { partyId?: string; productId?: string }
  ) {
    this.supplierProductForm = this.fb.group({
      partyId: ['', Validators.required],
      productId: ['', Validators.required],
      supplierProductName: [''],
      lastPrice: [''],
    });
  }

  ngOnInit(): void {
    if (this.data?.partyId) {
      this.supplierProductForm.get('partyId')?.setValue(this.data.partyId);
      this.isPartyLocked = true;
    }
    if (this.data?.productId) {
      this.supplierProductForm.get('productId')?.setValue(this.data.productId);
      this.isProductLocked = true;
    }

    this.filteredProducts$ = this.supplierProductForm.get('productId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) =>
        this.productService.getProductsAutocompleteFromOms(typeof value === 'string' ? value : value?.productId ?? '')
          .pipe(map((response: { documentList?: ProductSummary[] }) => response?.documentList || []))
      )
    );

    this.filteredSuppliers$ = this.supplierProductForm.get('partyId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value: string | any) => {
        const query = typeof value === 'string' ? value.trim() : '';
        if (!query) return of([]);
        return this.partyService.getSuppliersAutocompleteFromWms(query).pipe(
          map((response: { resultList?: PartySummary[] }) => response?.resultList || [])
        );
      })
    );
  }

  displaySupplier(supplier: PartySummary | string | null): string {
    if (!supplier) return '';
    if (typeof supplier === 'string') return supplier;
    return supplier.groupName || supplier.name || supplier.partyId || '';
  }

  displayProduct(product: ProductSummary | string | null): string {
    if (!product) return '';
    if (typeof product === 'string') return product;
    return product.productName || product.name || product.internalName || product.productId || '';
  }

  onSupplierProductSelected(product: ProductSummary | null): void {
    if (product) {
      this.supplierProductForm.get('productId')?.setValue(product);
    }
  }

  onSupplierSelected(supplier: PartySummary | null): void {
    if (supplier) {
      this.supplierProductForm.get('partyId')?.setValue(supplier);
    }
  }

  save(): void {
    if (this.supplierProductForm.invalid) {
      this.supplierProductForm.markAllAsTouched();
      return;
    }

    const values = this.supplierProductForm.value;
    const payload = {
      partyId: this.isPartyLocked ? this.data.partyId : (values?.partyId?.partyId ?? values?.partyId),
      productId: this.isProductLocked ? this.data.productId : (values?.productId?.productId ?? values?.productId),
      supplierProductName: values.supplierProductName || null,
      lastPrice: values.lastPrice || null,
    };

    this.isLoading.set(true);
    this.supplierProductService.create(payload).subscribe({
      next: () => {
        this.renderScheduler.deferMacrotask(() => {
          this.isLoading.set(false);
          this.snackbarService.showSuccess(this.translate.instant('SUPPLIER.PRODUCT_ADD_SUCCESS'));
          this.dialogRef.close(true);
        });
      },
      error: () => {
        this.renderScheduler.deferMacrotask(() => {
          this.isLoading.set(false);
          this.snackbarService.showError(this.translate.instant('SUPPLIER.PRODUCT_ADD_ERROR'));
        });
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  trackBySupplier = (index: number, supplier: PartySummary): string =>
    supplier?.partyId ?? String(index);

  trackByProduct = (index: number, product: ProductSummary): string =>
    product?.productId ?? String(index);
}

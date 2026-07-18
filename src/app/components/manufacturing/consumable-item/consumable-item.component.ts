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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  Observable,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  startWith,
  switchMap,
} from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { ProductService } from '@ofbiz/services/product/product.service';

@Component({
  standalone: false,
  selector: 'app-consumable-item',
  templateUrl: './consumable-item.component.html',
  styleUrls: ['./consumable-item.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsumableItemComponent implements OnInit {
  addConsumableForm: FormGroup;
  readonly isLoading = signal(false);
  filteredProducts$: Observable<any[]> = new Observable<any[]>();
  readonly isEdit: boolean;
  readonly wegsId?: number;

  constructor(
    public dialogRef: MatDialogRef<ConsumableItemComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { consumableData: any },
    private fb: FormBuilder,
    private manufacturingService: ManufacturingService,
    private productService: ProductService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {
    const { workEffortId, productId, estimatedQuantity, id } =
      this.data?.consumableData ?? {};
    this.wegsId = typeof id === 'number' ? id : undefined;
    this.isEdit = this.wegsId !== undefined;

    this.addConsumableForm = this.fb.group({
      workEffortId: [workEffortId],
      productId: [productId, Validators.required],
      estimatedQuantity: [estimatedQuantity || '1', [Validators.required, Validators.min(0.000001)]],
    });
  }

  ngOnInit(): void {
    this.setupAutocomplete();
    if (this.isEdit) {
      this.addConsumableForm.get('productId')?.disable({ emitEvent: false });
    }
  }

  private setupAutocomplete(): void {
    this.filteredProducts$ = this.addConsumableForm.get('productId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => this.getProductsFromService(value))
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

  private getProductsFromService(value: any): Observable<any[]> {
    const query = typeof value === 'string' ? value : value?.productId ?? '';
    return this.productService.getProductsAutocompleteFromOms(query).pipe(
      map((response: any) => {
        const list = response?.documentList ?? response?.data?.documentList ?? response?.data?.resultList;
        return Array.isArray(list) ? list.filter((product: any) => product?.isVirtual !== 'Y') : [];
      })
    );
  }

  addConsumable(): void {
    if (this.addConsumableForm.invalid) {
      return;
    }
    this.isLoading.set(true);
    const values = this.addConsumableForm.getRawValue();
    const payload = {
      productId: values?.productId?.productId ?? values?.productId,
      estimatedQuantity: values.estimatedQuantity,
    };

    const request$ = this.isEdit && this.wegsId !== undefined
      ? this.manufacturingService.updateConsumable(values.workEffortId, this.wegsId, payload)
      : this.manufacturingService.addConsumable(values.workEffortId, payload);
    request$.pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: () => {
        this.dialogRef.close(payload);
        this.addConsumableForm.reset();
      },
      error: (err) => {
        const message = err?.error?.message || err?.message || this.translate.instant('MANUFACTURING.CONSUMABLE_SAVE_ERROR');
        this.snackbarService.showError(message);
        this.cdr.markForCheck();
      },
    });
  }
}

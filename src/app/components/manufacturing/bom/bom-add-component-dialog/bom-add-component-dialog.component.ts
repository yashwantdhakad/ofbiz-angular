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
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';

@Component({
  standalone: false,
  selector: 'app-bom-add-component-dialog',
  templateUrl: './bom-add-component-dialog.component.html',
  styleUrls: ['./bom-add-component-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BomAddComponentDialogComponent implements OnInit {
  productId = '';
  componentProductControl = new FormControl('');
  filteredProducts$!: Observable<any[]>;
  quantity = 1;
  assocTypeId = '';
  sequenceNum = '';
  scrapFactor = 0;
  instruction = '';
  fromDate: Date | null = null;
  readonly isSaving = signal(false);
  isEdit = false;
  assocId: number | null = null;
  associationKey: {
    productId?: string;
    productIdTo?: string;
    productAssocTypeId?: string;
    fromDate?: string;
  } = {};

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<BomAddComponentDialogComponent>,
    private manufacturingService: ManufacturingService,
    private productService: ProductService,
    private renderScheduler: RenderSchedulerService
  ) {
    this.productId = data?.productId;
    this.assocTypeId = data?.bomTypeId || 'MANUF_COMPONENT';
    this.isEdit = data?.mode === 'edit';
    this.assocId = data?.assocId ?? null;
    this.associationKey = {
      productId: data?.parentProductId || data?.productId,
      productIdTo: data?.productIdTo || data?.componentProductId,
      productAssocTypeId: data?.productAssocTypeId || data?.bomTypeId,
      fromDate: data?.fromDate,
    };
    if (data?.componentProductId) {
      this.componentProductControl.setValue(data.componentProductId);
    }
    if (data?.quantity) {
      this.quantity = Number(data.quantity) || this.quantity;
    }
    if (data?.sequenceNum) {
      this.sequenceNum = data.sequenceNum;
    }
    if (data?.fromDate) {
      this.fromDate = this.parseLocalDate(data.fromDate);
    }
    this.scrapFactor = Number(data?.scrapFactor) || 0;
    this.instruction = data?.instruction || '';
  }

  ngOnInit(): void {
    this.filteredProducts$ = this.componentProductControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => this.searchProducts(value))
    );
    if (this.isEdit) {
      this.componentProductControl.disable({ emitEvent: false });
    }
  }

  save(): void {
    const componentProductValue: any = this.componentProductControl.value || '';
    const componentProductId = componentProductValue?.productId ?? componentProductValue;
    if (!this.productId || !componentProductId || !this.assocTypeId || Number(this.quantity) <= 0) {
      return;
    }
    if (this.sequenceNum && Number(this.sequenceNum) < 0) {
      return;
    }
    this.renderScheduler.deferMacrotask(() => {
      this.isSaving.set(true);
    });
    if (this.isEdit && this.assocId !== null) {
      const payload = {
        ...this.associationKey,
        quantity: String(this.quantity || 1),
        sequenceNum: this.sequenceNum || undefined,
        scrapFactor: String(this.scrapFactor || 0),
        instruction: this.instruction?.trim() || '',
      };
      this.manufacturingService.updateProductAssoc(this.assocId, payload).subscribe({
        next: () => {
          this.renderScheduler.deferMacrotask(() => {
            this.isSaving.set(false);
            this.dialogRef.close(true);
          });
        },
        error: (_error) => {
          this.renderScheduler.deferMacrotask(() => {
            this.isSaving.set(false);
          });
        },
      });
      return;
    }

    const payload = {
      toProductId: componentProductId,
      productAssocTypeEnumId: this.assocTypeId,
      quantity: String(this.quantity || 1),
      fromDate: this.toLocalDateTimeString(this.fromDate) || undefined,
      sequenceNum: this.sequenceNum || undefined,
      scrapFactor: String(this.scrapFactor || 0),
      instruction: this.instruction?.trim() || undefined,
    };
    this.manufacturingService.addProductAssoc(this.productId, payload).subscribe({
      next: () => {
        this.renderScheduler.deferMacrotask(() => {
          this.isSaving.set(false);
          this.dialogRef.close(true);
        });
      },
      error: (error) => {
        console.error('[BOM Add Component] create error', error);
        this.renderScheduler.deferMacrotask(() => {
          this.isSaving.set(false);
        });
      },
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }

  private toLocalDateTimeString(value: Date | string | null): string | null {
    if (!value) {
      return null;
    }
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    const hh = String(parsed.getHours()).padStart(2, '0');
    const mi = String(parsed.getMinutes()).padStart(2, '0');
    const ss = String(parsed.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  }

  private parseLocalDate(value: string): Date | null {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  }

  private searchProducts(value: string | null): Observable<any[]> {
    const keywordValue = typeof value === 'string' ? value : (value as any)?.productId ?? '';
    if (!keywordValue || typeof keywordValue !== 'string') {
      return of([]);
    }
    const keyword = keywordValue.trim();
    if (!keyword) {
      return of([]);
    }
    return this.productService.getProductsAutocompleteFromOms(keyword).pipe(
      map((response: any) => Array.isArray(response?.documentList) ? response.documentList : []),
      map((items: any[]) => items.filter((item) => item?.isVirtual !== 'Y')),
      catchError(() => of([]))
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

  trackByProduct = (index: number, product: any): string =>
    product?.productId ?? String(index);
}

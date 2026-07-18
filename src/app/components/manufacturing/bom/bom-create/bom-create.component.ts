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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { BomProductDialogComponent } from '../bom-product-dialog/bom-product-dialog.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-bom-create',
  templateUrl: './bom-create.component.html',
  styleUrls: ['./bom-create.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BomCreateComponent implements OnInit {
  @ViewChild('itemAutocompleteTrigger', { read: MatAutocompleteTrigger })
  itemAutocompleteTrigger?: MatAutocompleteTrigger;
  @ViewChild('componentAutocompleteTrigger', { read: MatAutocompleteTrigger })
  componentAutocompleteTrigger?: MatAutocompleteTrigger;
  form!: FormGroup;
  bomTypes: any[] = [];
  operations: any[] = [];
  items: any[] = [];
  filteredItemProducts$!: Observable<any[]>;
  filteredComponentProducts$!: Observable<any[]>;
  filteredOperations$!: Observable<any[]>;
  componentProductControl = new FormControl('');
  newItem = {
    sequenceNum: '',
    quantity: 1,
    fromDate: new Date() as Date | null,
  };
  readonly isSaving = signal(false);

  displayedColumns = [
    'component',
    'sequenceNum',
    'quantity',
    'fromDate',
    'action',
  ];

  constructor(
    private fb: FormBuilder,
    private manufacturingService: ManufacturingService,
    private productService: ProductService,
    private router: Router,
    private renderScheduler: RenderSchedulerService,
    private dialog: MatDialog,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      bomType: ['', Validators.required],
      operation: [''],
      item: ['', Validators.required],
    });

    this.manufacturingService.getProductAssocTypes().subscribe({
      next: (types) => {
        const list = Array.isArray(types) ? types : [];
        this.bomTypes = list.filter((type: any) => this.isBomType(type?.productAssocTypeId));
        if (!this.form.get('bomType')?.value && this.bomTypes.length) {
          const defaultType =
            this.bomTypes.find((type: any) =>
              (type?.productAssocTypeId || '').toUpperCase().includes('MANUF_COMPONENT')
            ) || this.bomTypes[0];
          this.form.patchValue({ bomType: defaultType.productAssocTypeId });
        }
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });

    this.manufacturingService.getWorkEfforts({
      workEffortTypeIds: 'ROU_TASK,ROUTING_TASK',
      size: 500,
    }).subscribe({
      next: (response: any) => {
        this.operations = Array.isArray(response) ? response : [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.operations = [];
        this.cdr.markForCheck();
      },
    });

    const itemControl = this.form.get('item') as FormControl;
    this.filteredItemProducts$ = itemControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => this.searchProducts(value))
    );

    this.filteredComponentProducts$ = this.componentProductControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => this.searchProducts(value))
    );

    const operationControl = this.form.get('operation') as FormControl;
    this.filteredOperations$ = operationControl.valueChanges.pipe(
      startWith(''),
      debounceTime(200),
      distinctUntilChanged(),
      map((value) => this.filterOperations(typeof value === 'string' ? value : value?.workEffortId || ''))
    );
  }

  addItem(): void {
    const componentValue = this.componentProductControl.value;
    const componentProductId = this.resolveProductId(componentValue);
    if (!componentProductId) {
      return;
    }
    this.items = [
      ...this.items,
      {
        componentProductId,
        sequenceNum: this.newItem.sequenceNum || '',
        quantity: this.newItem.quantity || 1,
        fromDate: this.newItem.fromDate || new Date(),
      },
    ];
    this.newItem = {
      sequenceNum: '',
      quantity: 1,
      fromDate: new Date(),
    };
    this.componentProductControl.setValue('');
  }

  removeItem(index: number): void {
    this.items = this.items.filter((_, i) => i !== index);
  }

  addProduct(target: 'item' | 'component'): void {
    const trigger =
      target === 'item' ? this.itemAutocompleteTrigger : this.componentAutocompleteTrigger;
    trigger?.closePanel();
    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur();

    setTimeout(() => {
      this.dialog.open(BomProductDialogComponent, {
        width: '560px',
        disableClose: true,
        data: {
          defaultProductTypeId: target === 'component' ? 'RAW_MATERIAL' : 'FINISHED_GOOD',
        },
      }).afterClosed().subscribe((createdProduct: any) => {
        const normalizedProduct = this.normalizeSelectedProduct(createdProduct);
        if (!normalizedProduct) {
          return;
        }

        if (target === 'item') {
          this.form.get('item')?.setValue(normalizedProduct);
          this.form.get('item')?.updateValueAndValidity();
          return;
        }

        this.componentProductControl.setValue(normalizedProduct);
        this.componentProductControl.updateValueAndValidity();
      });
    });
  }

  onAddProductMouseDown(event: MouseEvent, target: 'item' | 'component'): void {
    event.preventDefault();
    event.stopPropagation();
    if (target === 'item') {
      this.itemAutocompleteTrigger?.closePanel();
      return;
    }
    this.componentAutocompleteTrigger?.closePanel();
  }

  save(): void {
    // If user typed component but didn't click "Add Item", add it automatically before submit.
    if (!this.items.length && this.resolveProductId(this.componentProductControl.value)) {
      this.addItem();
    }

    const parentProductId = this.resolveProductId(this.form.value.item);
    const assocTypeId = this.form.value.bomType;
    if (!parentProductId || !assocTypeId || !this.items.length) {
      this.form.markAllAsTouched();
      if (!parentProductId) {
        this.form.get('item')?.setErrors({ required: true });
      }
      if (!assocTypeId) {
        this.form.get('bomType')?.setErrors({ required: true });
      }
      return;
    }

    const defaultFromDate = this.toLocalDateTimeString(new Date()) || undefined;
    const requests = this.items.map((item) =>
      this.manufacturingService.addProductAssoc(parentProductId, {
        productIdTo: item.componentProductId,
        productAssocTypeId: assocTypeId,
        quantity: String(item.quantity || 1),
        fromDate: this.toLocalDateTimeString(item.fromDate) || defaultFromDate,
        sequenceNum: item.sequenceNum || undefined,
      })
    );

    this.isSaving.set(true);
    forkJoin(requests).subscribe({
      next: () => {
        this.renderScheduler.deferMacrotask(() => {
          this.isSaving.set(false);
          this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.BOM_CREATE_SUCCESS'));
          this.router.navigate(['/boms', parentProductId]);
        });
      },
      error: (_error) => {
        this.renderScheduler.deferMacrotask(() => {
          this.isSaving.set(false);
        });
        this.snackbarService.showError(this.translate.instant('MANUFACTURING.BOM_CREATE_ERROR'));
      },
    });
  }

  private isBomType(typeId?: string): boolean {
    const value = (typeId || '').toUpperCase();
    return value.includes('BOM') || value.includes('COMPONENT');
  }

  private searchProducts(value: string | null): Observable<any[]> {
    const keyword = this.extractProductSearchKeyword(value);
    if (!keyword) {
      return of([]);
    }
    return this.productService.getProductsAutocompleteFromOms(keyword).pipe(
      map((response: any) => Array.isArray(response?.documentList) ? response.documentList : []),
      map((items: any[]) => items.filter((item) => item?.isVirtual !== 'Y')),
      catchError(() => of([]))
    );
  }

  onOperationSelected(operation: any): void {
    this.form.patchValue({
      operation: operation?.workEffortId || '',
    });
  }

  displayProduct(product: any): string {
    if (!product) {
      return '';
    }
    if (typeof product === 'string') {
      return product;
    }
    return product?.name || product?.productName || product?.productId || '';
  }

  displayOperation(operation: any): string {
    if (!operation) {
      return '';
    }
    if (typeof operation === 'string') {
      return operation;
    }
    return operation?.workEffortName || operation?.workEffortId || '';
  }

  private filterOperations(query: string): any[] {
    const normalized = String(query || '').trim().toLowerCase();
    if (!normalized) {
      return [...this.operations];
    }
    return this.operations.filter((item: any) => {
      const id = String(item?.workEffortId || '').toLowerCase();
      const name = String(item?.workEffortName || '').toLowerCase();
      const desc = String(item?.description || '').toLowerCase();
      return id.includes(normalized) || name.includes(normalized) || desc.includes(normalized);
    });
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

  private resolveProductId(value: any): string {
    return this.normalizeSelectedProduct(value)?.productId || '';
  }

  private extractProductSearchKeyword(value: any): string {
    if (typeof value === 'string') {
      return value.trim();
    }
    return this.resolveProductId(value);
  }

  private normalizeSelectedProduct(value: any): any | null {
    if (!value) {
      return null;
    }
    if (typeof value === 'string') {
      const productId = value.trim();
      return productId ? { productId, name: productId, productName: productId } : null;
    }

    const product = value?.product ?? value?.document ?? value;
    const productId = String(
      product?.productId ?? product?.id ?? product?.product?.productId ?? ''
    ).trim();
    if (!productId) {
      return null;
    }

    const productName = String(
      product?.productName ?? product?.name ?? product?.internalName ?? productId
    ).trim();

    return {
      ...product,
      productId,
      productName,
      name: productName,
    };
  }

  trackByBomType = (index: number, type: any): string =>
    type?.productAssocTypeId ?? String(index);

  trackByWorkEffort = (index: number, operation: any): string =>
    operation?.workEffortId ?? String(index);

  trackByProduct = (index: number, product: any): string =>
    product?.productId ?? String(index);
}

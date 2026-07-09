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
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
  catchError,
  finalize,
} from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';
import { CommonService } from '@ofbiz/services/common/common.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-create-job',
  templateUrl: './create-job.component.html',
  styleUrls: ['./create-job.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateJobComponent implements OnInit {
  readonly isLoading = signal(false);
  facilities: any[] = [];
  filteredConsumeProducts: Observable<any[]>[] = [];
  readonly jobPurposeOptions = [
    { id: 'WEPT_PRODUCTION_RUN', label: 'Production Run' },
    { id: 'WEPT_MAINTENANCE', label: 'Maintenance' },
    { id: 'WEPT_REPAIR', label: 'Repair' },
  ];

  createJobForm: FormGroup;
  produceProductIdControl = new FormControl<any>('', Validators.required);
  filteredProducts$: Observable<any[]>;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private commonService: CommonService,
    private productService: ProductService,
    private manufacturingService: ManufacturingService,
    private snackbarService: SnackbarService,
    private renderScheduler: RenderSchedulerService,
    private preferredFacilityService: PreferredFacilityService,
    private translate: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.createJobForm = this.fb.group({
      workEffortPurposeTypeId: ['WEPT_PRODUCTION_RUN', Validators.required],
      workEffortName: ['', Validators.required],
      facilityId: ['', Validators.required],
      estimatedStartDate: [''],
      estimatedWorkDuration: [''],
      produceProductId: this.produceProductIdControl,
      produceEstimatedQuantity: ['', [Validators.required, Validators.min(0.000001)]],
      produceEstimatedAmount: [''],
      consumeItems: this.fb.array([]),
    });

    this.filteredProducts$ = this.produceProductIdControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => this.searchProducts(value))
    );
  }

  ngOnInit(): void {
    this.loadFacilities();
    this.listenForBom();
    this.addConsumeItemRow();
    this.listenForProduceQuantity();
  }

  private searchProducts(value: string | null): Observable<any[]> {
    const query = typeof value === 'string' ? value : (value as any)?.productId ?? '';
    if (!query || typeof query !== 'string') {
      return of([]);
    }

    return this.productService.getProductsAutocompleteFromOms(query).pipe(
      map((response: any) => response?.documentList || []),
      catchError(() => {
        this.snackbarService.showError(this.translate.instant('MANUFACTURING.FETCH_PRODUCTS_ERROR'));
        return of([]);
      })
    );
  }


  private loadFacilities(): void {
    this.commonService.getFacilities().subscribe({
      next: (data) => {
        this.facilities = Array.isArray(data) ? data : [data];
        this.preferredFacilityService.applyPreferredFacilityIfMissing(
          this.createJobForm.get('facilityId'),
          this.facilities
        );
        this.cdr.markForCheck();
      },
      error: (_error) => {
        this.snackbarService.showError(this.translate.instant('MANUFACTURING.FETCH_FACILITIES_ERROR'));
        this.cdr.markForCheck();
      }
    });
  }

  private listenForBom(): void {
    this.produceProductIdControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value === 'string') {
          // Do not fetch BOM while typing a search query
          return of([]);
        }
        const productId = (value as any)?.productId ?? '';
        if (!productId || typeof productId !== 'string') {
          return of([]);
        }
        const trimmed = productId.trim();
        if (!trimmed) {
          return of([]);
        }
        return this.manufacturingService.getJobBom(trimmed).pipe(
          catchError(() => {
            this.snackbarService.showError(this.translate.instant('MANUFACTURING.FETCH_COMPONENTS_ERROR'));
            return of([]);
          })
        );
      })
    ).subscribe((items) => {
      const list = Array.isArray(items) ? items : [];
      this.resetConsumeItems(list);
    });
  }

  private listenForProduceQuantity(): void {
    this.createJobForm.get('produceEstimatedQuantity')?.valueChanges.pipe(
      debounceTime(200),
      distinctUntilChanged()
    ).subscribe((value) => {
      this.updateConsumeQuantities(value);
    });
  }

  get consumeItemsArray(): FormArray {
    return this.createJobForm.get('consumeItems') as FormArray;
  }

  addConsumeItemRow(productId = '', estimatedQuantity = '', baseQuantity = ''): void {
    this.consumeItemsArray.push(
      this.fb.group({
        productId: [productId, Validators.required],
        estimatedQuantity: [estimatedQuantity, [Validators.required, Validators.min(0.000001)]],
        baseQuantity: [baseQuantity],
      })
    );
    this.initConsumeAutocomplete(this.consumeItemsArray.length - 1);
  }

  removeConsumeItemRow(index: number): void {
    if (this.consumeItemsArray.length <= 1) {
      return;
    }
    this.consumeItemsArray.removeAt(index);
    this.filteredConsumeProducts.splice(index, 1);
  }

  private resetConsumeItems(items: any[]): void {
    this.consumeItemsArray.clear();
    this.filteredConsumeProducts = [];
    if (items.length) {
      items.forEach((item) => {
        const baseQuantity = item?.estimatedQuantity ?? '';
        this.addConsumeItemRow(item?.productId ?? '', baseQuantity, baseQuantity);
      });
      this.updateConsumeQuantities(this.createJobForm.get('produceEstimatedQuantity')?.value);
    } else {
      this.addConsumeItemRow();
    }
  }

  private updateConsumeQuantities(produceQty: any): void {
    const multiplier = Number(produceQty);
    const effectiveMultiplier = Number.isNaN(multiplier) || multiplier <= 0 ? 1 : multiplier;
    this.consumeItemsArray.controls.forEach((control) => {
      const baseValue = control.get('baseQuantity')?.value;
      if (baseValue === '' || baseValue == null) {
        return;
      }
      const base = Number(baseValue);
      if (Number.isNaN(base)) {
        return;
      }
      control.get('estimatedQuantity')?.setValue(base * effectiveMultiplier, { emitEvent: false });
    });
  }

  private initConsumeAutocomplete(index: number): void {
    const control = this.consumeItemsArray.at(index)?.get('productId');
    if (!control) {
      return;
    }
    this.filteredConsumeProducts[index] = control.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) =>
        this.productService.getProducts(
          0,
          typeof value === 'string' ? value : value?.productId ?? ''
        ).pipe(
          map((response: any) => response?.documentList || []),
          catchError(() => of([]))
        )
      )
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

  createJob(): void {
    if (this.createJobForm.invalid) return;

    this.isLoading.set(true);
    const consumeItems = this.consumeItemsArray.controls
      .map((control) => {
        const value = control.value;
        const productId = value?.productId?.productId ?? value?.productId;
        return {
          productId,
          estimatedQuantity: value?.estimatedQuantity,
        };
      })
      .filter((item) => item.productId);
    const formData = {
      ...this.createJobForm.value,
      purposeEnumId: this.createJobForm.value?.workEffortPurposeTypeId,
      produceProductId: this.createJobForm.value?.produceProductId?.productId ?? this.createJobForm.value?.produceProductId,
      consumeItems,
    };

    this.manufacturingService
      .createJob(formData)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const result = response as { workEffortId?: string };
          if (!result?.workEffortId) {
            this.snackbarService.showError(this.translate.instant('MANUFACTURING.JOB_CREATE_MISSING_ID'));
            return;
          }

          this.createJobForm.reset();
          this.createJobForm.get('workEffortPurposeTypeId')?.setValue('WEPT_PRODUCTION_RUN');
          this.consumeItemsArray.clear();
          this.filteredConsumeProducts = [];
          this.addConsumeItemRow();
          this.router.navigate([`/jobs/${result.workEffortId}`]);
          this.snackbarService.showSuccess(this.translate.instant('MANUFACTURING.JOB_CREATE_SUCCESS'));
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('MANUFACTURING.JOB_CREATE_ERROR'));
        },
      });
  }
}

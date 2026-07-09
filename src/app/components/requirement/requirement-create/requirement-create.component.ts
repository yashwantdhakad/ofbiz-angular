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
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductService } from '@ofbiz/services/product/product.service';
import { RequirementService } from '@ofbiz/services/requirement/requirement.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';

@Component({
  standalone: false,
  selector: 'app-requirement-create',
  templateUrl: './requirement-create.component.html',
  styleUrls: ['./requirement-create.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequirementCreateComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly facilities = computed(() => this.referenceDataStore.facilities());
  productSuggestions: any[] = [];
  selectedProductId = '';

  requirementTypes = [
    { id: 'PRODUCT_REQUIREMENT', label: 'REQUIREMENT.TYPE_PRODUCT' },
    { id: 'INTERNAL_REQUIREMENT', label: 'REQUIREMENT.TYPE_INTERNAL' },
  ];

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private requirementService: RequirementService,
    private snackbarService: SnackbarService,
    private router: Router,
    private translate: TranslateService,
    private referenceDataStore: ReferenceDataStore,
    private preferredFacilityService: PreferredFacilityService
  ) {
    this.form = this.fb.group({
      requirementTypeId: ['PRODUCT_REQUIREMENT', Validators.required],
      facilityId: ['', Validators.required],
      productSearch: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.0001)]],
      requiredByDate: [null],
      description: [''],
    });

    effect(() => {
      this.preferredFacilityService.applyPreferredFacilityIfMissing(
        this.form.get('facilityId'),
        this.facilities()
      );
    });

  }

  ngOnInit(): void {
    this.referenceDataStore.ensureFacilitiesLoaded();
    this.form
      .get('productSearch')
      ?.valueChanges.pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((value) => this.onProductSearchChange((value || '').toString()));
  }

  onProductSearchChange(value: string): void {
    const query = value.trim();
    this.selectedProductId = '';
    if (!query) {
      this.productSuggestions = [];
      return;
    }
    this.productService.getProductsAutocompleteFromOms(query).subscribe({
      next: (response) => {
        this.productSuggestions = Array.isArray(response?.documentList) ? response.documentList : [];
      },
      error: () => {
        this.productSuggestions = [];
      },
    });
  }

  selectProduct(product: any): void {
    this.selectedProductId = product?.productId || '';
    this.form.patchValue(
      {
        productSearch: product?.name || product?.productName || product?.productId,
      },
      { emitEvent: false }
    );
    this.productSuggestions = [];
  }

  save(): void {
    const resolvedProductId = this.resolveProductId();
    if (this.form.invalid || !resolvedProductId) {
      this.form.markAllAsTouched();
      this.snackbarService.showError(this.translate.instant('REQUIREMENT.FILL_REQUIRED_ERROR'));
      return;
    }
    this.isLoading.set(true);
    const value = this.form.value;
    const payload: any = {
      requirementTypeId: value.requirementTypeId,
      facilityId: value.facilityId,
      productId: resolvedProductId,
      quantity: value.quantity,
      statusId: 'REQ_PROPOSED',
      description: value.description || null,
    };
    if (value.requiredByDate) {
      payload.requiredByDate = new Date(value.requiredByDate).toISOString();
    }
    this.requirementService.createRequirement(payload).subscribe({
      next: (createdRequirement) => {
        this.isLoading.set(false);
        this.snackbarService.showSuccess(this.translate.instant('REQUIREMENT.CREATE_SUCCESS'));
        const createdId = createdRequirement?.id;
        if (createdId != null && createdId !== '') {
          this.router.navigate(['/requirements', createdId]);
          return;
        }
        this.router.navigate(['/requirements']);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackbarService.showError(this.translate.instant('REQUIREMENT.CREATE_ERROR'));
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/requirements']);
  }

  getFacilityLabel(facility: any): string {
    const facilityId = facility?.facilityId || facility?.id || '';
    const facilityName = facility?.facilityName || facility?.description || '';
    return facilityName ? `${facilityName} (${facilityId})` : facilityId;
  }

  private resolveProductId(): string {
    if (this.selectedProductId) {
      return this.selectedProductId;
    }
    const raw = this.form.get('productSearch')?.value;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
    if (raw && typeof raw === 'object') {
      return (raw.productId || raw.id || '').toString().trim();
    }
    return '';
  }
}

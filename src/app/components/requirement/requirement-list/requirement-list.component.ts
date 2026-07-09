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
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs/operators';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { RequirementService } from '@ofbiz/services/requirement/requirement.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';

@Component({
  standalone: false,
  selector: 'app-requirement-list',
  templateUrl: './requirement-list.component.html',
  styleUrls: ['./requirement-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequirementListComponent implements OnInit {
  isLoading = signal<boolean>(false);
  facilities = signal<any[]>([]);
  requirements = signal<any[]>([]);
  totalRequirements = signal<number>(0);
  productSuggestions = signal<any[]>([]);
  hasSearched = signal<boolean>(false);

  selectedFacilityId = '';
  selectedProductId = '';
  selectedTypeId = '';
  pagination = { page: 0, size: 20 };
  productControl = new FormControl('');
  displayedColumns: string[] = [
    'requirementId',
    'requirementTypeId',
    'facilityId',
    'productId',
    'quantity',
    'statusId',
    'requiredByDate',
    'createdDate',
  ];

  requirementTypes = [
    { id: '', label: 'COMMON.ALL' },
    { id: 'PRODUCT_REQUIREMENT', label: 'REQUIREMENT.TYPE_PRODUCT' },
    { id: 'INTERNAL_REQUIREMENT', label: 'REQUIREMENT.TYPE_INTERNAL' },
  ];

  constructor(
    private requirementService: RequirementService,
    private facilityService: FacilityService,
    private productService: ProductService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private preferredFacilityService: PreferredFacilityService
  ) { }

  ngOnInit(): void {
    this.loadFacilities();
  }

  loadFacilities(): void {
    this.facilityService.getFacilities().subscribe({
      next: (data) => {
        const facilities = Array.isArray(data) ? data : [];
        this.facilities.set(facilities);
        if (!this.selectedFacilityId && facilities.length > 0) {
          this.selectedFacilityId = this.preferredFacilityService.resolveInitialFacilityId(facilities);
        }
      },
      error: () => {
        this.facilities.set([]);
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.pagination.page = event.pageIndex;
    this.pagination.size = event.pageSize;
    this.fetchRequirements();
  }

  loadRequirements(): void {
    this.pagination.page = 0;
    this.fetchRequirements();
  }

  private fetchRequirements(): void {
    this.isLoading.set(true);
    this.hasSearched.set(true);
    this.requirementService
      .searchRequirements(
        this.pagination.page,
        this.pagination.size,
        this.selectedFacilityId || undefined,
        this.selectedProductId || undefined,
        this.selectedTypeId || undefined
      )
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (response: any) => {
          const payload = response?.data ?? response;
          this.requirements.set(Array.isArray(payload?.content) ? payload.content : []);
          this.totalRequirements.set(Number(payload?.totalElements ?? 0));
        },
        error: () => {
          this.requirements.set([]);
          this.snackbarService.showError(this.translate.instant('REQUIREMENT.LOAD_ERROR'));
        },
      });
  }

  onProductSearchChange(value: string): void {
    const query = (value || '').trim();
    this.selectedProductId = query;
    this.hasSearched.set(false);
    this.requirements.set([]);
    if (!query) {
      this.productSuggestions.set([]);
      return;
    }
    this.productService.getProductsAutocompleteFromOms(query).subscribe({
      next: (response) => {
        this.productSuggestions.set(Array.isArray(response?.documentList) ? response.documentList : []);
      },
      error: () => {
        this.productSuggestions.set([]);
      },
    });
  }

  selectProduct(product: any): void {
    this.selectedProductId = product?.productId || '';
    this.hasSearched.set(false);
    this.requirements.set([]);
    this.productControl.setValue(product?.name || product?.productName || product?.productId || '', {
      emitEvent: false,
    });
    this.productSuggestions.set([]);
  }

  onFacilityChange(facilityId: string): void {
    this.selectedFacilityId = facilityId || '';
    this.hasSearched.set(false);
    this.requirements.set([]);
  }

  onTypeChange(typeId: string): void {
    this.selectedTypeId = typeId || '';
    this.hasSearched.set(false);
    this.requirements.set([]);
  }

  clearFilters(): void {
    this.selectedFacilityId = '';
    this.selectedProductId = '';
    this.selectedTypeId = '';
    this.productControl.setValue('', { emitEvent: false });
    this.productSuggestions.set([]);
    this.requirements.set([]);
    this.hasSearched.set(false);
  }

  getFacilityLabel(facility: any): string {
    const facilityId = facility?.facilityId || facility?.id || '';
    const facilityName = facility?.facilityName || facility?.description || '';
    return facilityName || facilityId;
  }
}

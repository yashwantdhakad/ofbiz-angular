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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { FeatureGroupService } from '@ofbiz/services/featuregroup/feature-group.service';
import { EditFeaturegroupComponent } from '../edit-featuregroup/edit-featuregroup.component';
import { AddProductFeatureGroupApplComponent } from '../add-product-feature-group-appl/add-product-feature-group-appl.component';
import { AddCategoryFeatureGroupApplComponent } from '../add-category-feature-group-appl/add-category-feature-group-appl.component';

@Component({
  standalone: false,
  selector: 'app-featuregroup-detail',
  templateUrl: './featuregroup-detail.component.html',
  styleUrls: ['./featuregroup-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturegroupDetailComponent implements OnInit {
  readonly isLoading = signal(false);
  productFeatureGroupId?: string;

  readonly featureGroupDetail = signal<any | null>(null);
  readonly categories = signal<any[]>([]);
  readonly features = signal<any[]>([]);

  categoriesColumns: string[] = [
    'productCategoryId',
    'categoryName',
    'applTypeEnumId',
    'fromDate',
  ];

  featuresColumns: string[] = [
    'productFeatureId',
    'description',
    'abbrev',
    'productFeatureTypeEnumId',
    'sequenceNum',
    'fromDate',
  ];

  featureGroupCategoryData: any;
  featureGroupProductData: any;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly featureGroupService: FeatureGroupService,
    private readonly route: ActivatedRoute,
    private dialog: MatDialog,) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.productFeatureGroupId = params['productFeatureGroupId'];
      if (this.productFeatureGroupId) {
        this.fetchFeatureGroup(this.productFeatureGroupId);
      }
    });
  }

  fetchFeatureGroup(productFeatureGroupId: string, showLoader: boolean = true): void {
    if (showLoader) {
      this.isLoading.set(true);
    }

    this.featureGroupService
      .getFeatureGroup(productFeatureGroupId)
      .pipe(
        finalize(() => {
          if (showLoader) {
            this.isLoading.set(false);
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.featureGroupDetail.set(response);
          this.categories.set(response?.categories ?? []);
          this.features.set(response?.features ?? []);
        },
        error: (_err) => {
          this.featureGroupDetail.set(null);
          this.categories.set([]);
          this.features.set([]);
        },
      });
  }

  private refreshSilently(): void {
    if (this.productFeatureGroupId) {
      this.fetchFeatureGroup(this.productFeatureGroupId, false);
    }
  }

  editFeatureGroupDialog(): void {
    this.dialog
      .open(EditFeaturegroupComponent, {
        data: { featureGroupDetail: this.featureGroupDetail() },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.productFeatureGroupId) {
          this.refreshSilently();
        }
      });
  }

  createProductFeatureGroupApplDialog(params: any = null): void {
    this.featureGroupProductData = {
      ...params,
      productFeatureGroupId: this.productFeatureGroupId,
    };

    this.dialog
      .open(AddProductFeatureGroupApplComponent, {
        data: { featureGroupProductData: this.featureGroupProductData },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.productFeatureGroupId) {
          this.refreshSilently();
        }
      });
  }

  createProductCategoryFeatGrpApplDialog(params: any = null): void {
    this.featureGroupCategoryData = {
      ...params,
      productFeatureGroupId: this.productFeatureGroupId,
    };

    this.dialog
      .open(AddCategoryFeatureGroupApplComponent, {
        data: { featureGroupCategoryData: this.featureGroupCategoryData },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.productFeatureGroupId) {
          this.refreshSilently();
        }
      });
  }

  getCurrentDateTime(): string {
    return new Date().toString();
  }
}

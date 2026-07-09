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
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { EditFeatureComponent } from '../edit-feature/edit-feature.component';
import { AddToProductComponent } from '../add-to-product/add-to-product.component';
import { AddToFeatureGroupComponent } from '../add-to-feature-group/add-to-feature-group.component';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';

@Component({
  standalone: false,
  selector: 'app-feature-detail',
  templateUrl: './feature-detail.component.html',
  styleUrls: ['./feature-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureDetailComponent implements OnInit {
  readonly isLoading = signal(false);
  productFeatureId?: string;

  readonly featureDetail = signal<any | null>(null);
  readonly products = signal<any[]>([]);
  productsColumns: string[] = [
    'productId',
    'productFeatureApplTypeId',
    'sequenceNum',
    'fromDate',
    'actions',
  ];

  readonly groups = signal<any[]>([]);
  groupsColumns: string[] = [
    'productFeatureGroupId',
    'group',
    'sequenceNum',
    'fromDate',
    'actions',
  ];

  featureProductData: any;
  featureGroupData: any;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly featureService: FeatureService,
    private readonly route: ActivatedRoute,
    private readonly dialog: MatDialog,
    private readonly translate: TranslateService) { }

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.productFeatureId = params['productFeatureId'];
      if (this.productFeatureId) {
        this.fetchFeature(this.productFeatureId);
      }
    });
  }

  fetchFeature(productFeatureId: string, showLoader: boolean = true): void {
    if (showLoader) {
      this.isLoading.set(true);
    }

    this.featureService
      .getFeature(productFeatureId)
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
          this.featureDetail.set(response);
          this.products.set(response?.products ?? []);
          this.groups.set(response?.groups ?? []);
        },
        error: (_error) => {
          this.featureDetail.set(null);
          this.products.set([]);
          this.groups.set([]);
        },
      });
  }

  private refreshSilently(): void {
    if (this.productFeatureId) {
      this.fetchFeature(this.productFeatureId, false);
    }
  }

  editFeatureDialog(): void {
    this.dialog
      .open(EditFeatureComponent, {
        data: { featureDetail: this.featureDetail() },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.productFeatureId) {
          this.refreshSilently();
        }
      });
  }

  addFeatureToProductDialog(params: any = null): void {
    this.featureProductData = {
      ...params,
      productFeatureId: this.productFeatureId,
    };

    this.dialog
      .open(AddToProductComponent, {
        data: { featureProductData: this.featureProductData },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.productFeatureId) {
          this.refreshSilently();
        }
      });
  }

  addFeatureToGroupDialog(params: any = null): void {
    this.featureGroupData = {
      ...params,
      productFeatureId: this.productFeatureId,
    };

    this.dialog
      .open(AddToFeatureGroupComponent, {
        data: { featureGroupData: this.featureGroupData },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.productFeatureId) {
          this.refreshSilently();
        }
      });
  }

  deleteProductFeatureAppl(item: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('FEATURE.REMOVE_PRODUCT_ASSOC_TITLE'),
        message: this.translate.instant('FEATURE.REMOVE_PRODUCT_ASSOC_MESSAGE'),
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (result) {
        this.isLoading.set(true);
        this.featureService.deleteProductFeatureAppl(item.productId, item.id).pipe(
          finalize(() => this.isLoading.set(false)),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: () => {
            this.refreshSilently();
          },
          error: (error) => {
            console.error('Error deleting product feature appl', error);
          },
        });
      }
    });
  }

  getCurrentDateTime(): string {
    return new Date().toString();
  }
}

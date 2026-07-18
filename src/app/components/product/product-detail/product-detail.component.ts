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
import { ChangeDetectorRef, ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '@ofbiz/services/product/product.service';
// In your product list component
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { ProductEditComponent } from '@ofbiz/components/product/product-edit/product-edit.component';
import { CommonService } from '@ofbiz/services/common/common.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { EnumState } from '@ofbiz/store/enum/enum.state';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { AddEditProductCategoryComponent } from '../add-edit-product-category/add-edit-product-category.component';
import { AddEditProductPriceComponent } from '../add-edit-product-price/add-edit-product-price.component';
import { ProductAssocComponent } from '../product-assoc/product-assoc.component';
import { ProductContentComponent } from '../product-content/product-content.component';
import { of, forkJoin } from 'rxjs';
import { catchError, finalize, timeout } from 'rxjs/operators';
import { SupplierProductService } from '@ofbiz/services/supplier-product/supplier-product.service';
import { SupplierProductDialogComponent } from '@ofbiz/components/supplier/supplier-product-dialog/supplier-product-dialog.component';
import { AddToProductComponent } from '@ofbiz/components/feature/add-to-product/add-to-product.component';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { ProductFacilityService } from '@ofbiz/services/product/product-facility.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { AddProductFacilityDialogComponent } from '../add-product-facility-dialog/add-product-facility-dialog.component';
import { AddProductFacilityLocationDialogComponent } from '../add-product-facility-location-dialog/add-product-facility-location-dialog.component';
import { AddEditProductIdentificationComponent } from '../add-edit-product-identification/add-edit-product-identification.component';
import { ProductShippingConfigDialogComponent } from '../product-shipping-config-dialog/product-shipping-config-dialog.component';
import {
  DeleteProductPricePayload,
  ProductAssocDialogData,
  ProductAssociation,
  ProductCategory,
  ProductContentDialogData,
  ProductContentRecord,
  ProductDetail,
  ProductDetailResponse,
  ProductFacilityLocation,
  ProductFacilityRecord,
  ProductFacilityView,
  ProductFeatureDialogData,
  ProductFeatureRecord,
  ProductIdentification,
  ProductIdentificationType,
  ProductInventorySummary,
  ProductPrice,
  ProductPriceDialogData,
  ProductPricePurposeLookupOption,
  ProductPriceTypeLookupOption,
  ProductShippingConfig,
  SupplierProductRecord,
  ProductTypeLookupOption,
  ProductCategoryTypeLookupOption,
  ProductUpdatePayload,
} from '@ofbiz/models/product.model';

type ProductCompositeSection = 'prices' | 'categories' | 'contents' | 'assocs' | 'toAssocs';
type ProductDialogResult = { productId?: string } | null | undefined;
type ProductConfigField = 'taxable' | 'returnable' | 'includeInPromotions' | 'serialized' | 'requireInspection';

@Component({
  standalone: false,
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  readonly isLoading = signal(false);
  productId: string | undefined;

  readonly productDetail = signal<ProductDetail | null>(null);
  readonly productTypeMap = signal(new Map<string, string>());
  readonly productTypeLabel = computed(() => {
    const productTypeId = this.productDetail()?.productTypeId;
    return productTypeId ? this.productTypeMap().get(productTypeId) || productTypeId : '';
  });

  prices: ProductPrice[] = [];
  displayedColumns: string[] = [
    'typeDescription',
    'description',
    'price',
    'action',
  ];
  readonly priceTypeMap = signal(new Map<string, string>());
  readonly pricePurposeMap = signal(new Map<string, string>());

  categories: ProductCategory[] = [];
  categoryColumns: string[] = [
    'categoryName',
    'productCategoryTypeId',
    'fromDate',
    'action',
  ];
  readonly categoryTypeMap = signal(new Map<string, string>());

  readonly contents = signal<ProductContentRecord[]>([]);
  contentColumns: string[] = [
    'description',
    'contentLocation',
  ];

  readonly assocs = signal<ProductAssociation[]>([]);
  assocColumns: string[] = [
    'productName',
    'description',
    'fromDate',
    'sequenceNum',
    'quantity',
  ];

  readonly toAssocs = signal<ProductAssociation[]>([]);
  toAssocColumns: string[] = ['productName', 'description', 'fromDate', 'sequenceNum', 'quantity'];
  readonly inventorySummary = signal<ProductInventorySummary[]>([]);
  inventorySummaryColumns: string[] = ['facility', 'atpTotal', 'qohTotal'];
  readonly supplierProducts = signal<SupplierProductRecord[]>([]);
  supplierProductColumns: string[] = ['partyId', 'supplierProductName', 'lastPrice', 'action'];
  readonly productFeatures = signal<ProductFeatureRecord[]>([]);
  productFeatureColumns: string[] = [
    'productFeatureId',
    'featureDescription',
    'productFeatureApplTypeId',
    'sequenceNum',
    'fromDate',
    'action',
  ];

  readonly productFacilities = signal<ProductFacilityView[]>([]);
  productFacilityColumns: string[] = ['facilityId', 'facilityName', 'minimumStock', 'reorderQuantity', 'daysToShip', 'action'];
  readonly productFacilityLocations = signal<ProductFacilityLocation[]>([]);
  productFacilityLocationColumns: string[] = ['locationSeqId', 'locationName', 'minimumStock', 'moveQuantity', 'reorderQuantity', 'maximumStock', 'action'];
  readonly facilityNameMap = signal(new Map<string, string>());
  readonly identifications = signal<ProductIdentification[]>([]);
  identificationColumns: string[] = ['goodIdentificationTypeId', 'idValue', 'action'];
  readonly identificationTypeMap = signal(new Map<string, string>());
  readonly shippingConfig = signal<ProductShippingConfig | null>(null);

  readonly isConfigSaving = signal(false);
  private isDestroyed = false;

  productPriceData: ProductPriceDialogData | null = null;
  productCategoryData: ProductCategory | null = null;
  priceTypeEnums: ProductPriceTypeLookupOption[] = [];
  pricePurposeEnums: ProductPricePurposeLookupOption[] = [];
  contentData: ProductContentDialogData | null = null;
  assocData: ProductAssocDialogData | null = null;

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private store: Store<EnumState>,
    private translate: TranslateService,
    private snackbarService: SnackbarService,
    private commonService: CommonService,
    private supplierProductService: SupplierProductService,
    private featureService: FeatureService,
    private productFacilityService: ProductFacilityService,
    private cdr: ChangeDetectorRef,
    private renderScheduler: RenderSchedulerService,
    private destroyRef: DestroyRef
  ) { }

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.productId = params['productId'];
      if (this.productId) {
        this.getProduct(this.productId);
      }
    });
    this.loadReferenceData();
  }

  private loadReferenceData(): void {
    forkJoin({
      productTypes: this.commonService.getLookupResults({}, 'product_type').pipe(catchError(() => of([]))),
      categoryTypes: this.commonService.getLookupResults({}, 'product_category_type').pipe(catchError(() => of([]))),
      priceTypes: this.commonService.getLookupResults({}, 'productpricetype').pipe(catchError(() => of([]))),
      pricePurposes: this.commonService.getLookupResults({}, 'productpricepurpose').pipe(catchError(() => of([]))),
      identTypes: this.productService.getGoodIdentificationTypes().pipe(catchError(() => of([]))),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ productTypes, categoryTypes, priceTypes, pricePurposes, identTypes }) => {
        const ptList = Array.isArray(productTypes) ? productTypes as ProductTypeLookupOption[] : [];
        this.productTypeMap.set(this.toLookupMap(ptList, (t) => t.productTypeId, (t) => t.description || t.productTypeId));

        const ctList = Array.isArray(categoryTypes) ? categoryTypes as ProductCategoryTypeLookupOption[] : [];
        this.categoryTypeMap.set(this.toLookupMap(ctList, (t) => t.productCategoryTypeId, (t) => t.description || t.productCategoryTypeId));

        const ptEnums = Array.isArray(priceTypes) ? priceTypes as ProductPriceTypeLookupOption[] : [];
        this.priceTypeEnums = ptEnums;
        this.priceTypeMap.set(this.toLookupMap(ptEnums, (item) => item.productPriceTypeId, (item) => item.description || item.productPriceTypeId));

        const ppEnums = Array.isArray(pricePurposes) ? pricePurposes as ProductPricePurposeLookupOption[] : [];
        this.pricePurposeEnums = ppEnums;
        this.pricePurposeMap.set(this.toLookupMap(ppEnums, (item) => item.productPricePurposeId, (item) => item.description || item.productPricePurposeId));

        const itList = Array.isArray(identTypes) ? identTypes as ProductIdentificationType[] : [];
        this.identificationTypeMap.set(this.toLookupMap(itList, (t) => t.goodIdentificationTypeId, (t) => t.description || t.goodIdentificationTypeId));
      },
    });
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
  }
  getProduct(productId: string, showLoader: boolean = true): void {
    if (showLoader) {
      this.setLoading(true);
    }

    this.productService.getProduct(productId).pipe(
      timeout(20000),
      catchError(() => {
        this.snackbarService.showError(this.translate.instant('PRODUCT.LOAD_ERROR'));
        return of(null);
      }),
      finalize(() => {
        if (showLoader) {
          this.setLoading(false);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response: ProductDetailResponse | null) => {
        if (!response) {
          this.runDeferred(() => {
            this.productDetail.set(null);
            this.prices = [];
            this.categories = [];
            this.contents.set([]);
            this.assocs.set([]);
            this.toAssocs.set([]);
          });
          return;
        }
        const { product, prices, categories, contents, assocs, toAssocs, shippingConfig } = response;
        this.runDeferred(() => {
          this.productDetail.set(product ?? null);
          this.shippingConfig.set(shippingConfig || null);
          this.applyCompositeSections({ prices, categories, contents, assocs, toAssocs });
          this.applyExtendedSections(response);
        });
      },
      error: () => {},
    });
  }

  private applyExtendedSections(source: ProductDetailResponse): void {
    this.inventorySummary.set(Array.isArray(source?.inventorySummary) ? source.inventorySummary : []);
    this.identifications.set(Array.isArray(source?.identifications) ? source.identifications : []);
    this.supplierProducts.set(Array.isArray(source?.supplierProducts) ? source.supplierProducts : []);
    this.productFeatures.set(Array.isArray(source?.productFeatures) ? source.productFeatures : []);

    const facilityNames = source?.facilityNames && typeof source.facilityNames === 'object'
      ? new Map<string, string>(
          Object.entries(source.facilityNames)
            .filter(([key]) => typeof key === 'string')
            .map(([key, value]) => [key, String(value ?? key)])
        )
      : new Map<string, string>();
    this.facilityNameMap.set(facilityNames);

    const locList = Array.isArray(source?.productFacilityLocations) ? source.productFacilityLocations : [];
    const pfList = Array.isArray(source?.productFacilities) ? source.productFacilities : [];
    
    // Save current expanded state
    const currentFacilities = this.productFacilities() || [];
    const expandedMap = new Map<string, boolean>();
    currentFacilities.forEach((f) => {
      if (f.facilityId) {
        expandedMap.set(f.facilityId, !!f.expanded);
      }
    });

    this.productFacilityLocations.set(locList);
    this.productFacilities.set(pfList.map((f: ProductFacilityRecord) => ({
      ...f,
      facilityName: (f.facilityId ? facilityNames.get(f.facilityId) : '') || f.facilityName || f.facilityId,
      locations: locList.filter((pfl) => pfl.facilityId === f.facilityId),
      expanded: f.facilityId ? (expandedMap.get(f.facilityId) ?? false) : false,
    })));
  }

  private refreshProductSilently(productId?: string): void {
    const id = productId || this.productId;
    if (!id) {
      return;
    }
    this.getProduct(id, false);
  }

  private refreshCompositeSections(
    sections: ProductCompositeSection[]
  ): void {
    if (!this.productId) {
      return;
    }
    this.productService
      .getProduct(this.productId)
      .pipe(
        timeout(20000),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response: ProductDetailResponse | null) => {
        if (!response) {
          return;
        }
        this.runDeferred(() => {
          const partial: Partial<ProductDetailResponse> = {};
          sections.forEach((section) => (partial[section] = response[section]));
          this.applyCompositeSections(partial);
        });
      });
  }

  private applyCompositeSections(source: Partial<ProductDetailResponse>): void {
    if (Object.prototype.hasOwnProperty.call(source, 'prices')) {
      const priceList = Array.isArray(source.prices) ? source.prices : [];
      this.prices = priceList.filter((item) => this.isActivePrice(item));
    }
    if (Object.prototype.hasOwnProperty.call(source, 'categories')) {
      this.categories = Array.isArray(source.categories) ? source.categories : [];
    }
    if (Object.prototype.hasOwnProperty.call(source, 'contents')) {
      this.contents.set(Array.isArray(source.contents) ? source.contents : []);
    }
    if (Object.prototype.hasOwnProperty.call(source, 'assocs')) {
      this.assocs.set(Array.isArray(source.assocs) ? source.assocs : []);
    }
    if (Object.prototype.hasOwnProperty.call(source, 'toAssocs')) {
      this.toAssocs.set(Array.isArray(source.toAssocs) ? source.toAssocs : []);
    }
  }

  addProductFeatureDialog(params: ProductFeatureDialogData | null = null): void {
    if (!this.productId) {
      return;
    }

    const featureProductData = {
      ...params,
      productId: this.productId,
      isNew: false,
    };

    this.dialog
      .open(AddToProductComponent, {
        data: { featureProductData },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: ProductDialogResult) => {
        if (result && this.productId) {
          this.refreshProductSilently(this.productId);
        }
      });
  }

  deleteProductFeature(item: ProductFeatureRecord): void {
    if (!this.productId || item.id === undefined) {
      return;
    }
    const featureApplicationId = item.id;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRMATION'),
        message: this.translate.instant('COMMON.DELETE_CONFIRMATION'),
      },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (!confirmed || !this.productId) {
        return;
      }
      this.featureService.deleteProductFeatureAppl(this.productId, featureApplicationId).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => this.refreshProductSilently(this.productId),
        error: () => this.snackbarService.showError(this.translate.instant('FEATURE.APPLICATION_SAVE_ERROR')),
      });
    });
  }

  getIdentificationTypeDescription(typeId: string): string {
    return this.identificationTypeMap().get(typeId) || typeId;
  }

  addEditIdentificationDialog(identification?: ProductIdentification): void {
    if (!this.productId) {
      return;
    }
    const identificationData = {
      ...identification,
      productId: this.productId,
    };
    this.dialog
      .open(AddEditProductIdentificationComponent, {
        data: { identificationData },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved: ProductIdentification | true | null | undefined) => {
        if (saved && this.productId) {
          this.refreshProductSilently(this.productId);
        }
      });
  }

  deleteIdentification(item: ProductIdentification): void {
    const identificationId = item?.id;
    if (typeof identificationId !== 'number' || !this.productId) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('PRODUCT.DELETE_IDENTIFICATION_TITLE'),
        message: this.translate.instant('PRODUCT.DELETE_IDENTIFICATION_MESSAGE'),
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (!result) {
        return;
      }
      this.productService.deleteGoodIdentification(identificationId).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => this.refreshProductSilently(this.productId as string),
      });
    });
  }

  getCategoryTypeDescription(typeId: string): string {
    return this.categoryTypeMap().get(typeId) || typeId;
  }

  getPriceTypeDescription(typeId: string): string {
    return this.priceTypeMap().get(typeId) || typeId;
  }

  getPricePurposeDescription(purposeId: string): string {
    return this.pricePurposeMap().get(purposeId) || purposeId;
  }

  isFlagEnabled(value: unknown): boolean {
    return value === 'Y' || value === true;
  }

  updateConfiguration(field: ProductConfigField, checked: boolean): void {
    if (!this.productId || this.isConfigSaving()) {
      return;
    }
    const payload: ProductUpdatePayload = {
      productId: this.productId,
      [field]: checked ? 'Y' : 'N',
    };
    this.isConfigSaving.set(true);
    this.productService.updateProduct(payload).pipe(
      finalize(() => {
        this.runDeferred(() => {
          this.isConfigSaving.set(false);
        });
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.runDeferred(() => {
          const product = this.productDetail();
          if (product) {
            this.productDetail.set({
              ...product,
              [field]: checked ? 'Y' : 'N',
            });
          }
          this.snackbarService.showSuccess(this.translate.instant('PRODUCT.CONFIG_UPDATE_SUCCESS'));
        });
      },
      error: () => {
        this.runDeferred(() => {
          this.snackbarService.showError(this.translate.instant('PRODUCT.CONFIG_UPDATE_ERROR'));
        });
      },
    });
  }

  openShippingConfigDialog(): void {
    if (!this.productId) {
      return;
    }
    this.dialog
      .open(ProductShippingConfigDialogComponent, {
        width: '820px',
        data: {
          config: this.shippingConfig() || { shippable: false, inShipBox: false },
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: ProductShippingConfig | null | undefined) => {
        if (!payload || !this.productId) {
          return;
        }
        this.productService.upsertProductShippingConfig(this.productId, payload).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: (savedConfig) => {
            this.runDeferred(() => {
              this.shippingConfig.set(savedConfig);
              this.snackbarService.showSuccess(
                this.translate.instant('PRODUCT.SHIPPING_CONFIG_UPDATE_SUCCESS')
              );
            });
          },
          error: () => {
            this.runDeferred(() => {
              this.snackbarService.showError(
                this.translate.instant('PRODUCT.SHIPPING_CONFIG_UPDATE_ERROR')
              );
            });
          },
        });
      });
  }

  toYesNo(value: unknown): string {
    return value ? 'Yes' : 'No';
  }

  formatDimensionValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  }


  editProductDialog(): void {
    this.dialog
      .open(ProductEditComponent, {
        data: {
          productDetail: this.productDetail(),
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: ProductDialogResult) => {
        if (result && result.productId) {
          this.refreshProductSilently(result.productId);
        }
      });
  }

  addUpdateProductPriceDialog(params: ProductPriceDialogData | null = null): void {
    this.productPriceData = {
      ...params,
      productId: this.productId,
      priceTypeEnums: this.priceTypeEnums,
      pricePurposeEnums: this.pricePurposeEnums,
    };

    this.dialog
      .open(AddEditProductPriceComponent, {
        data: {
          productPriceData: this.productPriceData,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: ProductDialogResult) => {
        if (result?.productId) {
          this.refreshCompositeSections(['prices']);
        }
      });
  }

  deleteProductPriceDialog(params: DeleteProductPricePayload): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('PRODUCT.DELETE_PRICE_TITLE'),
        message: this.translate.instant('PRODUCT.DELETE_PRICE_MESSAGE'),
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (result) {
        this.productService.deleteProductPrice(params).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
          this.refreshCompositeSections(['prices']);
        });
      } else {
        dialogRef.close();
      }
    });

  }

  deleteProductPrice(item: ProductPrice): void {
    if (!this.productId || item.productPriceId === undefined) {
      return;
    }
    this.deleteProductPriceDialog({
      productId: this.productId,
      productPriceId: item.productPriceId,
    });
  }

  addProductCategoryDialog(params: ProductCategory | null = null): void {
    this.productCategoryData = {
      ...params,
      productId: this.productId,
    };

    this.dialog
      .open(AddEditProductCategoryComponent, {
        data: {
          productCategoryData: this.productCategoryData,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: ProductDialogResult) => {
        if (result?.productId) {
          this.refreshCompositeSections(['categories']);
        }
      });
  }

  deleteProductCategory(item: ProductCategory): void {
    if (!this.productId || !item?.productCategoryId) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('COMMON.CONFIRMATION'),
        message: this.translate.instant('COMMON.DELETE_CONFIRMATION'),
      },
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.productService.deleteProductCategory({
        productId: this.productId,
        productCategoryId: item.productCategoryId,
        fromDate: item.fromDate,
      }).pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('PRODUCT.CATEGORY_DELETED_SUCCESS'));
            this.refreshCompositeSections(['categories']);
          },
          error: () => {
            this.snackbarService.showError(this.translate.instant('PRODUCT.CATEGORY_DELETED_ERROR'));
          },
        });
    });
  }

  addUpdateProductContentDialog(params: Partial<ProductContentDialogData> | null = null): void {
    if (!this.productId) {
      return;
    }
    this.contentData = {
      ...params,
      productId: this.productId,
    };

    this.dialog
      .open(ProductContentComponent, {
        data: {
          contentData: this.contentData,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: ProductDialogResult) => {
        if (result?.productId) {
          this.refreshCompositeSections(['contents']);
        }
      });
  }

  openProductContent(item: ProductContentRecord): void {
    if (!this.productId || !item?.contentId) {
      return;
    }
    this.productService.downloadProductContent(this.productId, item.contentId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: () => {
      },
    });
  }

  addUpdateProductAssocDialog(params: ProductAssocDialogData | null = null): void {
    this.assocData = {
      ...params,
      productId: this.productId,
    };

    this.dialog
      .open(ProductAssocComponent, {
        data: {
          assocData: this.assocData,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: ProductDialogResult) => {
        if (result?.productId) {
          this.refreshCompositeSections(['assocs', 'toAssocs']);
        }
      });
  }

  addSupplierProductDialog(): void {
    if (!this.productId) {
      return;
    }
    this.dialog
      .open(SupplierProductDialogComponent, {
        data: { productId: this.productId },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: ProductDialogResult | true | null | undefined) => {
        if (result && this.productId) {
          this.refreshProductSilently(this.productId);
        }
      });
  }

  deleteSupplierProduct(item: SupplierProductRecord): void {
    const supplierProductId = typeof item?.id === 'number' ? item.id : Number(item?.id);
    if (Number.isNaN(supplierProductId)) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('PRODUCT.DELETE_SUPPLIER_PRODUCT_TITLE'),
        message: this.translate.instant('PRODUCT.DELETE_SUPPLIER_PRODUCT_MESSAGE'),
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (result) {
        this.supplierProductService.delete(supplierProductId).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: () => this.refreshProductSilently(this.productId || ''),
        });
      }
    });
  }

  loadProductFacilities(): void {
    this.refreshProductSilently();
  }

  addProductFacilityDialog(productFacility?: ProductFacilityRecord): void {
    if (!this.productId) return;
    this.dialog.open(AddProductFacilityDialogComponent, {
      data: { productId: this.productId, productFacility }
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res: unknown) => {
      if (res) this.loadProductFacilities();
    });
  }

  deleteProductFacility(item: ProductFacilityRecord): void {
    const facilityConfigId = typeof item?.id === 'number' ? item.id : Number(item?.id);
    if (Number.isNaN(facilityConfigId)) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('PRODUCT.DELETE_FACILITY_TITLE'),
        message: this.translate.instant('PRODUCT.DELETE_FACILITY_MESSAGE'),
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (result) {
        this.productFacilityService.deleteProductFacility(facilityConfigId).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: () => this.loadProductFacilities(),
        });
      }
    });
  }

  addProductFacilityLocationDialog(facility: ProductFacilityRecord, productFacilityLocation?: ProductFacilityLocation): void {
    if (!this.productId) return;
    this.dialog.open(AddProductFacilityLocationDialogComponent, {
      data: {
        productId: this.productId,
        facilityId: facility.facilityId as string,
        facilityName: facility.facilityName,
        productFacilityLocation
      }
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res: unknown) => {
      if (res) this.loadProductFacilities();
    });
  }

  deleteProductFacilityLocation(item: ProductFacilityLocation): void {
    const facilityLocationId = typeof item?.id === 'number' ? item.id : Number(item?.id);
    if (Number.isNaN(facilityLocationId)) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('PRODUCT.DELETE_LOCATION_TITLE'),
        message: this.translate.instant('PRODUCT.DELETE_LOCATION_MESSAGE'),
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (result) {
        this.productFacilityService.deleteProductFacilityLocation(facilityLocationId).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: () => this.loadProductFacilities(),
        });
      }
    });
  }

  private setLoading(isLoading: boolean): void {
    this.runDeferred(() => {
      this.isLoading.set(isLoading);
    });
  }

  private runDeferred(updateFn: () => void): void {
    this.renderScheduler.deferMacrotask(() => {
      if (this.isDestroyed) {
        return;
      }
      updateFn();
      this.cdr.detectChanges();
    });
  }

  trackByFacilityConfig = (_: number, facility: ProductFacilityView): string | number =>
    facility?.id ?? facility?.facilityId ?? _;

  private isActivePrice(item: ProductPrice): boolean {
    const now = new Date();
    const fromDate = this.toDate(item?.fromDate);
    const thruDate = this.toDate(item?.thruDate);

    const isFromDateValid = !!fromDate && fromDate <= now;
    const isThruDateValid = !thruDate || thruDate >= now;
    return isFromDateValid && isThruDateValid;
  }

  private toDate(value: unknown): Date | null {
    if (!value || !(typeof value === 'string' || typeof value === 'number' || value instanceof Date)) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toLookupMap<T>(
    items: T[],
    keySelector: (item: T) => string | undefined,
    valueSelector: (item: T) => string | undefined
  ): Map<string, string> {
    const entries: Array<[string, string]> = [];
    items.forEach((item) => {
      const key = keySelector(item);
      if (!key) {
        return;
      }
      entries.push([key, valueSelector(item) || key]);
    });
    return new Map(entries);
  }

  getAssocProductName(item: ProductAssociation): string {
    return (
      item?.toProduct?.productName ||
      item?.toProduct?.internalName ||
      item?.toProductName ||
      item?.toProductId ||
      item?.productIdTo ||
      '-'
    );
  }

  getAssocTypeDescription(item: ProductAssociation): string {
    return item?.type?.description || item?.productAssocTypeId || item?.productAssocTypeEnumId || '-';
  }

  getToAssocProductName(item: ProductAssociation): string {
    return (
      item?.product?.productName ||
      item?.product?.internalName ||
      item?.productName ||
      item?.productId ||
      '-'
    );
  }
}

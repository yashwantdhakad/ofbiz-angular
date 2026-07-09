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
import { DatePipe } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { provideMockStore } from '@ngrx/store/testing';
import { of, throwError } from 'rxjs';

import { ProductDetailComponent } from './product-detail.component';
import { AddToProductComponent } from '@ofbiz/components/feature/add-to-product/add-to-product.component';
import { AddEditProductIdentificationComponent } from '../add-edit-product-identification/add-edit-product-identification.component';
import { ProductShippingConfigDialogComponent } from '../product-shipping-config-dialog/product-shipping-config-dialog.component';
import { ProductEditComponent } from '@ofbiz/components/product/product-edit/product-edit.component';
import { AddEditProductPriceComponent } from '../add-edit-product-price/add-edit-product-price.component';
import { AddEditProductCategoryComponent } from '../add-edit-product-category/add-edit-product-category.component';
import { ProductContentComponent } from '../product-content/product-content.component';
import { ProductAssocComponent } from '../product-assoc/product-assoc.component';
import { SupplierProductDialogComponent } from '@ofbiz/components/supplier/supplier-product-dialog/supplier-product-dialog.component';
import { AddProductFacilityDialogComponent } from '../add-product-facility-dialog/add-product-facility-dialog.component';
import { AddProductFacilityLocationDialogComponent } from '../add-product-facility-location-dialog/add-product-facility-location-dialog.component';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { ProductService } from '@ofbiz/services/product/product.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { SupplierProductService } from '@ofbiz/services/supplier-product/supplier-product.service';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { ProductFacilityService } from '@ofbiz/services/product/product-facility.service';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';

describe('ProductDetailComponent', () => {
  let component: ProductDetailComponent;
  let fixture: ComponentFixture<ProductDetailComponent>;
  let productServiceSpy: jasmine.SpyObj<ProductService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let commonServiceSpy: jasmine.SpyObj<CommonService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let supplierProductServiceSpy: jasmine.SpyObj<SupplierProductService>;
  let featureServiceSpy: jasmine.SpyObj<FeatureService>;
  let productFacilityServiceSpy: jasmine.SpyObj<ProductFacilityService>;
  let facilityServiceSpy: jasmine.SpyObj<FacilityService>;
  let renderSchedulerSpy: jasmine.SpyObj<RenderSchedulerService>;
  let translateService: TranslateService;

  const mockActivatedRoute = {
    params: of({ productId: 'PROD-1' })
  };

  const productResponseMock = {
    product: { productId: 'PROD-1', taxable: 'N' },
    prices: [{ productPriceId: 'PRICE-1', fromDate: '2024-01-01T00:00:00Z', price: 99 }],
    categories: [{ categoryName: 'Electronics', productCategoryTypeId: 'CATALOG_CATEGORY' }],
    contents: [{ contentId: 'CONTENT-1', contentLocation: 'file.pdf' }],
    assocs: [{ productIdTo: 'PROD-2' }],
    toAssocs: [{ productId: 'PROD-3' }],
    inventorySummary: [],
    identifications: [{ id: 1, goodIdentificationTypeId: 'SKU', idValue: 'SKU-1' }],
    supplierProducts: [{ id: 1, supplierProductName: 'Vendor SKU' }],
    productFeatures: [{ id: 'PF-1' }],
    productFacilities: [{ id: 1, facilityId: 'FAC-1' }],
    productFacilityLocations: [{ id: 1, facilityId: 'FAC-1', locationSeqId: 'A1' }],
    facilityNames: { 'FAC-1': 'Main Facility' },
    shippingConfig: { shippable: true, inShipBox: false }
  };

  beforeEach(async () => {
    productServiceSpy = jasmine.createSpyObj('ProductService', [
      'getProduct',
      'deleteProductPrice',
      'getGoodIdentificationTypes',
      'getGoodIdentifications',
      'getInventorySummary',
      'deleteGoodIdentification',
      'updateProduct',
      'upsertProductShippingConfig',
      'downloadProductContent',
      'deleteProductCategory',
    ]);
    commonServiceSpy = jasmine.createSpyObj('CommonService', ['getLookupResults']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showError', 'showSuccess']);
    supplierProductServiceSpy = jasmine.createSpyObj('SupplierProductService', ['listByProduct', 'delete']);
    featureServiceSpy = jasmine.createSpyObj('FeatureService', ['getProductFeatureAppls', 'deleteProductFeatureAppl']);
    productFacilityServiceSpy = jasmine.createSpyObj('ProductFacilityService', [
      'getProductFacilities',
      'getProductFacilityLocations',
      'deleteProductFacility',
      'deleteProductFacilityLocation',
    ]);
    facilityServiceSpy = jasmine.createSpyObj('FacilityService', ['getFacilities']);
    renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['defer', 'deferMacrotask', 'markForCheck']);

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [ProductDetailComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: CommonService, useValue: commonServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: SupplierProductService, useValue: supplierProductServiceSpy },
        { provide: FeatureService, useValue: featureServiceSpy },
        { provide: ProductFacilityService, useValue: productFacilityServiceSpy },
        { provide: FacilityService, useValue: facilityServiceSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        DatePipe,
        provideMockStore({}),
        TranslateService
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetailComponent);
    component = fixture.componentInstance;
    translateService = TestBed.inject(TranslateService);
    commonServiceSpy.getLookupResults.and.returnValue(of([]));
    productServiceSpy.getGoodIdentificationTypes.and.returnValue(of([]));
    productServiceSpy.getGoodIdentifications.and.returnValue(of([]));
    productServiceSpy.getInventorySummary.and.returnValue(of([]));
    supplierProductServiceSpy.listByProduct.and.returnValue(of([]));
    supplierProductServiceSpy.delete.and.returnValue(of({}));
    featureServiceSpy.getProductFeatureAppls.and.returnValue(of([]));
    productFacilityServiceSpy.getProductFacilities.and.returnValue(of([]));
    productFacilityServiceSpy.getProductFacilityLocations.and.returnValue(of([]));
    productFacilityServiceSpy.deleteProductFacility.and.returnValue(of({}));
    productFacilityServiceSpy.deleteProductFacilityLocation.and.returnValue(of({}));
    facilityServiceSpy.getFacilities.and.returnValue(of([]));
    renderSchedulerSpy.defer.and.callFake((task: () => void) => task());
    renderSchedulerSpy.deferMacrotask.and.callFake((task: () => void) => task());
    productServiceSpy.getProduct.and.returnValue(of(productResponseMock));
    productServiceSpy.deleteProductPrice.and.returnValue(of({}));
    productServiceSpy.deleteGoodIdentification.and.returnValue(of({}));
    productServiceSpy.updateProduct.and.returnValue(of({}));
    productServiceSpy.upsertProductShippingConfig.and.returnValue(of({ shippable: false, inShipBox: true }));
    productServiceSpy.downloadProductContent.and.returnValue(of(new Blob(['test'], { type: 'text/plain' })));
    productServiceSpy.deleteProductCategory.and.returnValue(of({}));
    featureServiceSpy.deleteProductFeatureAppl.and.returnValue(of({}));
  });

  function mockDialogClose(result: any) {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(result) } as any);
  }

  function mockDialogCloseWithSpy(result: any) {
    const closeSpy = jasmine.createSpy('close');
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(result),
      close: closeSpy,
    } as any);
    return closeSpy;
  }

  function expectLastConfirmationDialogData(data: { title: string; message: string }) {
    expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmationDialogComponent, { data });
  }

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load product on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(productServiceSpy.getProduct).toHaveBeenCalledWith('PROD-1');
    expect(component.productDetail()?.productId).toBe('PROD-1');
    expect(component.prices).toHaveSize(1);
    expect(component.categories).toHaveSize(1);
    expect(component.contents()).toHaveSize(1);
    expect(component.identifications()).toHaveSize(1);
  }));

  it('should handle getProduct error', fakeAsync(() => {
    productServiceSpy.getProduct.and.returnValue(throwError(() => new Error('API error')));

    component.getProduct('PROD-1');
    tick();

    expect(component.isLoading()).toBeFalse();
    expect(snackbarSpy.showError).toHaveBeenCalled();
  }));

  it('should open product dialogs and refresh the expected section after save', () => {
    component.productId = 'PROD-1';
    component.priceTypeEnums = [{ productPriceTypeId: 'DEFAULT_PRICE' }];
    component.pricePurposeEnums = [{ productPricePurposeId: 'PURCHASE' }];
    component.shippingConfig.set({ shippable: false, inShipBox: false });
    const refreshProductSpy = spyOn<any>(component, 'refreshProductSilently');
    const refreshCompositeSpy = spyOn<any>(component, 'refreshCompositeSections');
    const loadFacilitiesSpy = spyOn(component, 'loadProductFacilities');

    mockDialogClose({ productId: 'PROD-1' });
    component.editProductDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(ProductEditComponent, {
      data: { productDetail: component.productDetail() },
    });

    mockDialogClose({ productId: 'PROD-1' });
    component.addUpdateProductPriceDialog({ productPriceId: 'PRICE-1' });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditProductPriceComponent, {
      data: {
        productPriceData: {
          productPriceId: 'PRICE-1',
          productId: 'PROD-1',
          priceTypeEnums: component.priceTypeEnums,
          pricePurposeEnums: component.pricePurposeEnums,
        },
      },
    });

    mockDialogClose({ productId: 'PROD-1' });
    component.addProductCategoryDialog({ productCategoryId: 'CAT-1' });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditProductCategoryComponent, {
      data: {
        productCategoryData: {
          productCategoryId: 'CAT-1',
          productId: 'PROD-1',
        },
      },
    });

    mockDialogClose({ productId: 'PROD-1' });
    component.addUpdateProductContentDialog({ description: 'Manual' });
    expect(dialogSpy.open).toHaveBeenCalledWith(ProductContentComponent, {
      data: {
        contentData: {
          description: 'Manual',
          productId: 'PROD-1',
        },
      },
    });

    mockDialogClose({ productId: 'PROD-1' });
    component.addUpdateProductAssocDialog({ productIdTo: 'PROD-2' });
    expect(dialogSpy.open).toHaveBeenCalledWith(ProductAssocComponent, {
      data: {
        assocData: {
          productIdTo: 'PROD-2',
          productId: 'PROD-1',
        },
      },
    });

    mockDialogClose({ productId: 'PROD-1' });
    component.addProductFeatureDialog({ productFeatureId: 'PF-1' });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddToProductComponent, {
      data: {
        featureProductData: {
          productFeatureId: 'PF-1',
          productId: 'PROD-1',
          isNew: false,
        },
      },
    });

    mockDialogClose({ productId: 'PROD-1' });
    component.addEditIdentificationDialog({ id: 1 });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditProductIdentificationComponent, {
      data: {
        identificationData: {
          id: 1,
          productId: 'PROD-1',
        },
      },
    });

    mockDialogClose({ shippable: false, inShipBox: true });
    component.openShippingConfigDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(ProductShippingConfigDialogComponent, {
      width: '820px',
      data: {
        config: { shippable: false, inShipBox: false },
      },
    });

    mockDialogClose({ id: 'SP-1' });
    component.addSupplierProductDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(SupplierProductDialogComponent, {
      data: { productId: 'PROD-1' },
    });

    mockDialogClose({ id: 'FACCFG-1' });
    component.addProductFacilityDialog({ id: 'FACCFG-1' });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddProductFacilityDialogComponent, {
      data: { productId: 'PROD-1', productFacility: { id: 'FACCFG-1' } }
    });

    mockDialogClose({ id: 'LOC-1' });
    component.addProductFacilityLocationDialog({ facilityId: 'FAC-1', facilityName: 'Main Facility' }, { id: 'LOC-1' });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddProductFacilityLocationDialogComponent, {
      data: {
        productId: 'PROD-1',
        facilityId: 'FAC-1',
        facilityName: 'Main Facility',
        productFacilityLocation: { id: 'LOC-1' }
      }
    });

    expect(refreshProductSpy).toHaveBeenCalledWith('PROD-1');
    expect(refreshCompositeSpy).toHaveBeenCalledWith(['prices']);
    expect(refreshCompositeSpy).toHaveBeenCalledWith(['categories']);
    expect(refreshCompositeSpy).toHaveBeenCalledWith(['contents']);
    expect(refreshCompositeSpy).toHaveBeenCalledWith(['assocs', 'toAssocs']);
    expect(loadFacilitiesSpy).toHaveBeenCalledTimes(2);
    expect(productServiceSpy.upsertProductShippingConfig).toHaveBeenCalledWith('PROD-1', { shippable: false, inShipBox: true });
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('PRODUCT.SHIPPING_CONFIG_UPDATE_SUCCESS');
  });

  it('should delete price, identification, supplier product, and facility records after confirmation', () => {
    component.productId = 'PROD-1';
    const refreshProductSpy = spyOn<any>(component, 'refreshProductSilently');
    const refreshCompositeSpy = spyOn<any>(component, 'refreshCompositeSections');
    const loadFacilitiesSpy = spyOn(component, 'loadProductFacilities');

    mockDialogClose(true);
    component.deleteProductPriceDialog({ productId: 'PROD-1', productPriceId: 'PRICE-1' });
    expectLastConfirmationDialogData({
      title: 'PRODUCT.DELETE_PRICE_TITLE',
      message: 'PRODUCT.DELETE_PRICE_MESSAGE',
    });
    expect(productServiceSpy.deleteProductPrice).toHaveBeenCalledWith({ productId: 'PROD-1', productPriceId: 'PRICE-1' });

    mockDialogClose(true);
    component.deleteIdentification({ id: 1 });
    expectLastConfirmationDialogData({
      title: 'PRODUCT.DELETE_IDENTIFICATION_TITLE',
      message: 'PRODUCT.DELETE_IDENTIFICATION_MESSAGE',
    });
    expect(productServiceSpy.deleteGoodIdentification).toHaveBeenCalledWith(1);

    mockDialogClose(true);
    component.deleteSupplierProduct({ id: 1 });
    expectLastConfirmationDialogData({
      title: 'PRODUCT.DELETE_SUPPLIER_PRODUCT_TITLE',
      message: 'PRODUCT.DELETE_SUPPLIER_PRODUCT_MESSAGE',
    });
    expect(supplierProductServiceSpy.delete).toHaveBeenCalledWith(1);

    mockDialogClose(true);
    component.deleteProductFacility({ id: 1 });
    expectLastConfirmationDialogData({
      title: 'PRODUCT.DELETE_FACILITY_TITLE',
      message: 'PRODUCT.DELETE_FACILITY_MESSAGE',
    });
    expect(productFacilityServiceSpy.deleteProductFacility).toHaveBeenCalledWith(1);

    mockDialogClose(true);
    component.deleteProductFacilityLocation({ id: 1 });
    expectLastConfirmationDialogData({
      title: 'PRODUCT.DELETE_LOCATION_TITLE',
      message: 'PRODUCT.DELETE_LOCATION_MESSAGE',
    });
    expect(productFacilityServiceSpy.deleteProductFacilityLocation).toHaveBeenCalledWith(1);

    expect(refreshCompositeSpy).toHaveBeenCalledWith(['prices']);
    expect(refreshProductSpy).toHaveBeenCalledWith('PROD-1');
    expect(loadFacilitiesSpy).toHaveBeenCalledTimes(2);
  });

  it('should update product boolean configuration and mutate product detail on success', () => {
    component.productId = 'PROD-1';
    component.productDetail.set({ productId: 'PROD-1', taxable: 'N' });

    component.updateConfiguration('taxable', true);

    expect(productServiceSpy.updateProduct).toHaveBeenCalledWith({
      productId: 'PROD-1',
      taxable: 'Y',
    });
    expect(component.productDetail()?.taxable).toBe('Y');
    expect(snackbarSpy.showSuccess).toHaveBeenCalled();
    expect(component.isConfigSaving()).toBeFalse();
  });

  it('should apply partial composite sections and ignore null refresh responses', () => {
    const applyCompositeSpy = spyOn<any>(component, 'applyCompositeSections').and.callThrough();
    const refreshCompositeSpy = spyOn<any>(component, 'refreshCompositeSections').and.callThrough();

    component['applyCompositeSections']({
      prices: [
        { productPriceId: 'PRICE-1', fromDate: '2024-01-01T00:00:00Z', price: 10 },
        { productPriceId: 'PRICE-2', fromDate: '2030-01-01T00:00:00Z', price: 20 },
      ] as any,
      contents: [{ contentId: 'CONTENT-2' }] as any,
    });
    expect(component.prices).toHaveSize(1);
    expect(component.contents()).toHaveSize(1);

    component.productId = undefined;
    component['refreshCompositeSections'](['prices']);
    expect(refreshCompositeSpy).toHaveBeenCalled();
    expect(applyCompositeSpy).toHaveBeenCalled();

    component.productId = 'PROD-1';
    productServiceSpy.getProduct.and.returnValue(of(null as any));
    component['refreshCompositeSections'](['prices', 'categories']);
    expect(applyCompositeSpy).toHaveBeenCalledTimes(1);
  });

  it('should hydrate extended sections with fallback values', () => {
    component['applyExtendedSections']({
      inventorySummary: undefined,
      identifications: undefined,
      supplierProducts: undefined,
      productFeatures: undefined,
      facilityNames: { 'FAC-1': null as any, '': 'ignored' } as any,
      productFacilityLocations: [{ id: 'LOC-1', facilityId: 'FAC-1' }] as any,
      productFacilities: [{ id: 'PF-1', facilityId: 'FAC-1', facilityName: '' }] as any,
    } as any);

    expect(component.inventorySummary()).toHaveSize(0);
    expect(component.identifications()).toHaveSize(0);
    expect(component.supplierProducts()).toHaveSize(0);
    expect(component.productFeatures()).toHaveSize(0);
    expect(component.facilityNameMap().get('FAC-1')).toBe('FAC-1');
    expect(component.productFacilities()).toHaveSize(1);
    expect(component.productFacilities()[0].facilityName).toBe('FAC-1');
    expect(component.trackByFacilityConfig(0, { id: 'FAC-1' } as any)).toBe('FAC-1');
    expect(component.trackByFacilityConfig(0, { facilityId: 'FAC-1' } as any)).toBe('FAC-1');
  });

  it('should ignore dialog cancel paths and content download errors', () => {
    const confirmationCloseSpy = mockDialogCloseWithSpy(false);
    const refreshProductSpy = spyOn<any>(component, 'refreshProductSilently');
    const refreshCompositeSpy = spyOn<any>(component, 'refreshCompositeSections');
    const loadFacilitiesSpy = spyOn(component, 'loadProductFacilities');
    productServiceSpy.downloadProductContent.and.returnValue(throwError(() => new Error('download failed')));

    component.productId = 'PROD-1';
    component.deleteProductPriceDialog({ productId: 'PROD-1', productPriceId: 'PRICE-1' });
    expect(confirmationCloseSpy).toHaveBeenCalled();
    expect(productServiceSpy.deleteProductPrice).not.toHaveBeenCalled();

    component.deleteIdentification({ id: 2 });
    expect(productServiceSpy.deleteGoodIdentification).not.toHaveBeenCalled();

    component.deleteSupplierProduct({ id: 3 });
    expect(supplierProductServiceSpy.delete).not.toHaveBeenCalled();

    component.deleteProductFacility({ id: 4 });
    expect(productFacilityServiceSpy.deleteProductFacility).not.toHaveBeenCalled();

    component.deleteProductFacilityLocation({ id: 5 });
    expect(productFacilityServiceSpy.deleteProductFacilityLocation).not.toHaveBeenCalled();

    component.addProductFeatureDialog();
    component.addEditIdentificationDialog({ id: 1 });
    component.addProductCategoryDialog({ categoryName: 'Cat' } as any);
    component.addUpdateProductContentDialog({ description: 'Text' });
    component.addUpdateProductAssocDialog({ productIdTo: 'PROD-2' });
    expect(refreshProductSpy).not.toHaveBeenCalled();
    expect(refreshCompositeSpy).not.toHaveBeenCalled();

    component.openProductContent({ contentId: 'CONTENT-1' });
    expect(snackbarSpy.showError).not.toHaveBeenCalled();
    expect(productServiceSpy.downloadProductContent).toHaveBeenCalledWith('PROD-1', 'CONTENT-1');

    expect(loadFacilitiesSpy).not.toHaveBeenCalled();
  });

  it('should report configuration update failures and stop the saving state', () => {
    component.productId = 'PROD-1';
    productServiceSpy.updateProduct.and.returnValue(throwError(() => new Error('config failed')));

    component.updateConfiguration('taxable', true);

    expect(snackbarSpy.showError).toHaveBeenCalled();
    expect(component.isConfigSaving()).toBeFalse();
  });

  it('should report shipping configuration update failures', () => {
    component.productId = 'PROD-1';
    component.shippingConfig.set({ shippable: false, inShipBox: false });
    productServiceSpy.upsertProductShippingConfig.and.returnValue(
      throwError(() => new Error('shipping config failed'))
    );
    spyOn(translateService, 'instant').and.callFake((key: string) => key);

    mockDialogClose({ shippable: true, inShipBox: true });
    component.openShippingConfigDialog();

    expect(productServiceSpy.upsertProductShippingConfig).toHaveBeenCalledWith('PROD-1', {
      shippable: true,
      inShipBox: true,
    });
    expect(snackbarSpy.showError).toHaveBeenCalledWith('PRODUCT.SHIPPING_CONFIG_UPDATE_ERROR');
  });

  it('should ignore dialog cancel paths when opening dialogs', () => {
    component.productId = 'PROD-1';
    const refreshProductSpy = spyOn<any>(component, 'refreshProductSilently');
    const refreshCompositeSpy = spyOn<any>(component, 'refreshCompositeSections');
    const loadFacilitiesSpy = spyOn(component, 'loadProductFacilities');

    mockDialogClose(null);
    component.addProductFeatureDialog({ productFeatureId: 'PF-1' } as any);
    component.addEditIdentificationDialog({ id: 1 } as any);
    component.addProductCategoryDialog({ productCategoryId: 'CAT-1' } as any);
    component.addUpdateProductContentDialog({ description: 'Content' } as any);
    component.addUpdateProductAssocDialog({ productIdTo: 'PROD-2' } as any);
    component.addSupplierProductDialog();
    component.addProductFacilityDialog({ id: 'FACCFG-1' } as any);
    component.addProductFacilityLocationDialog({ facilityId: 'FAC-1', facilityName: 'Main Facility' } as any, { id: 'LOC-1' } as any);

    expect(refreshProductSpy).not.toHaveBeenCalled();
    expect(refreshCompositeSpy).not.toHaveBeenCalled();
    expect(loadFacilitiesSpy).not.toHaveBeenCalled();
  });

  it('should ignore missing ids and cancelled product actions', () => {
    const refreshProductSpy = spyOn<any>(component, 'refreshProductSilently');
    const refreshCompositeSpy = spyOn<any>(component, 'refreshCompositeSections');
    const loadFacilitiesSpy = spyOn(component, 'loadProductFacilities');

    component.productId = undefined;

    component.addProductFeatureDialog();
    component.addEditIdentificationDialog({ id: 1 });
    component.openShippingConfigDialog();
    component.updateConfiguration('taxable', true);
    component.openProductContent({} as any);
    component.deleteIdentification({ id: undefined } as any);
    component.deleteSupplierProduct({ id: 'bad' } as any);
    component.deleteProductFacility({ id: 'bad' } as any);
    component.deleteProductFacilityLocation({ id: 'bad' } as any);
    component.addProductFacilityDialog();
    component.addProductFacilityLocationDialog({ facilityId: 'FAC-1' } as any);

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(productServiceSpy.updateProduct).not.toHaveBeenCalled();
    expect(productServiceSpy.upsertProductShippingConfig).not.toHaveBeenCalled();
    expect(productServiceSpy.downloadProductContent).not.toHaveBeenCalled();
    expect(refreshProductSpy).not.toHaveBeenCalled();
    expect(refreshCompositeSpy).not.toHaveBeenCalled();
    expect(loadFacilitiesSpy).not.toHaveBeenCalled();
  });

  it('should download product content when a content id exists', () => {
    component.productId = 'PROD-1';
    const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:product');
    const revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');
    const windowOpenSpy = spyOn(window, 'open');
    spyOn(window, 'setTimeout').and.callFake(((fn: TimerHandler) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as any;
    }) as any);

    component.openProductContent({ contentId: 'CONTENT-1' });

    expect(productServiceSpy.downloadProductContent).toHaveBeenCalledWith('PROD-1', 'CONTENT-1');
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(windowOpenSpy).toHaveBeenCalledWith('blob:product', '_blank', 'noopener');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:product');
  });

  it('should expose helper methods for descriptions, display values, and formatting', () => {
    component.categoryTypeMap.set(new Map([['CATALOG_CATEGORY', 'Catalog']]));
    component.priceTypeMap.set(new Map([['DEFAULT_PRICE', 'Default Price']]));
    component.pricePurposeMap.set(new Map([['PURCHASE', 'Purchase']]));
    component.identificationTypeMap.set(new Map([['SKU', 'SKU']]));

    expect(component.getCategoryTypeDescription('CATALOG_CATEGORY')).toBe('Catalog');
    expect(component.getPriceTypeDescription('DEFAULT_PRICE')).toBe('Default Price');
    expect(component.getPricePurposeDescription('PURCHASE')).toBe('Purchase');
    expect(component.getIdentificationTypeDescription('SKU')).toBe('SKU');
    expect(component.getCategoryTypeDescription('UNKNOWN')).toBe('UNKNOWN');
    expect(component.getPriceTypeDescription('UNKNOWN')).toBe('UNKNOWN');
    expect(component.getPricePurposeDescription('UNKNOWN')).toBe('UNKNOWN');
    expect(component.getIdentificationTypeDescription('UNKNOWN')).toBe('UNKNOWN');
    expect(component.toYesNo(true)).toBe('Yes');
    expect(component.toYesNo(false)).toBe('No');
    expect(component.formatDimensionValue('10')).toBe('10');
    expect(component.formatDimensionValue('')).toBe('-');
    expect(component.formatDimensionValue(null)).toBe('-');
    expect(component.formatDimensionValue(undefined)).toBe('-');
    expect(component.isFlagEnabled('Y')).toBeTrue();
    expect(component.isFlagEnabled(false)).toBeFalse();
    expect(component.getAssocProductName({ toProductName: 'Related Product' })).toBe('Related Product');
    expect(component.getAssocTypeDescription({ productAssocTypeId: 'ACCESSORY' })).toBe('ACCESSORY');
    expect(component.getToAssocProductName({ productName: 'Base Product' })).toBe('Base Product');
    expect(component.getAssocProductName({} as any)).toBe('-');
    expect(component.getAssocTypeDescription({} as any)).toBe('-');
    expect(component.getToAssocProductName({} as any)).toBe('-');
    expect(component.trackByFacilityConfig(4, {} as any)).toBe(4);
  });

  it('should load reference data maps with descriptions and fallback ids', fakeAsync(() => {
    commonServiceSpy.getLookupResults.and.callFake((_query: any, type: string) => {
      const responses: Record<string, any[]> = {
        product_type: [
          { productTypeId: 'FINISHED_GOOD', description: 'Finished Good' },
          { productTypeId: 'RAW_MATERIAL' },
          { description: 'Ignored missing id' },
        ],
        product_category_type: [{ productCategoryTypeId: 'CATALOG_CATEGORY', description: 'Catalog Category' }],
        productpricetype: [{ productPriceTypeId: 'DEFAULT_PRICE', description: 'Default Price' }],
        productpricepurpose: [{ productPricePurposeId: 'PURCHASE' }],
      };
      return of(responses[type] || []);
    });
    productServiceSpy.getGoodIdentificationTypes.and.returnValue(of([
      { goodIdentificationTypeId: 'SKU', description: 'Stock Keeping Unit' },
    ] as any));

    component.ngOnInit();
    tick();

    expect(component.productTypeMap().get('FINISHED_GOOD')).toBe('Finished Good');
    expect(component.productTypeMap().get('RAW_MATERIAL')).toBe('RAW_MATERIAL');
    expect(component.categoryTypeMap().get('CATALOG_CATEGORY')).toBe('Catalog Category');
    expect(component.priceTypeMap().get('DEFAULT_PRICE')).toBe('Default Price');
    expect(component.pricePurposeMap().get('PURCHASE')).toBe('PURCHASE');
    expect(component.identificationTypeMap().get('SKU')).toBe('Stock Keeping Unit');
  }));

  it('should delete product feature and category through confirmation branches', () => {
    component.productId = 'PROD-1';
    const refreshProductSpy = spyOn<any>(component, 'refreshProductSilently');
    const refreshCompositeSpy = spyOn<any>(component, 'refreshCompositeSections');

    mockDialogClose(true);
    component.deleteProductFeature({ id: 'FEATURE-APPL-1' } as any);

    expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmationDialogComponent, {
      data: {
        title: 'COMMON.CONFIRMATION',
        message: 'COMMON.DELETE_CONFIRMATION',
      },
    });
    expect(featureServiceSpy.deleteProductFeatureAppl).toHaveBeenCalledWith('PROD-1', 'FEATURE-APPL-1');
    expect(refreshProductSpy).toHaveBeenCalledWith('PROD-1');

    mockDialogClose(true);
    component.deleteProductCategory({ productCategoryId: 'CAT-1', fromDate: '2026-01-01T00:00:00' } as any);

    expect(productServiceSpy.deleteProductCategory).toHaveBeenCalledWith({
      productId: 'PROD-1',
      productCategoryId: 'CAT-1',
      fromDate: '2026-01-01T00:00:00',
    });
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('PRODUCT.CATEGORY_DELETED_SUCCESS');
    expect(refreshCompositeSpy).toHaveBeenCalledWith(['categories']);
  });

  it('should handle product feature and category delete cancel and error paths', () => {
    component.productId = 'PROD-1';
    mockDialogClose(false);

    component.deleteProductFeature({ id: 11 } as any);
    component.deleteProductCategory({ productCategoryId: 'CAT-1' } as any);

    expect(featureServiceSpy.deleteProductFeatureAppl).not.toHaveBeenCalled();
    expect(productServiceSpy.deleteProductCategory).not.toHaveBeenCalled();

    mockDialogClose(true);
    featureServiceSpy.deleteProductFeatureAppl.and.returnValue(throwError(() => new Error('feature failed')));
    component.deleteProductFeature({ id: 11 } as any);
    expect(snackbarSpy.showError).toHaveBeenCalledWith('FEATURE.APPLICATION_SAVE_ERROR');

    productServiceSpy.deleteProductCategory.and.returnValue(throwError(() => new Error('category failed')));
    component.deleteProductCategory({ productCategoryId: 'CAT-1' } as any);
    expect(snackbarSpy.showError).toHaveBeenCalledWith('PRODUCT.CATEGORY_DELETED_ERROR');

    dialogSpy.open.calls.reset();
    component.productId = undefined;
    component.deleteProductFeature({ id: 11 } as any);
    component.deleteProductCategory({ productCategoryId: 'CAT-1' } as any);
    expect(dialogSpy.open).not.toHaveBeenCalled();
  });

  it('should skip deferred updates after destroy and cover private date helpers', () => {
    component.productId = 'PROD-1';
    component.productDetail.set({ productId: 'PROD-1', taxable: 'N' });
    component.ngOnDestroy();

    component.updateConfiguration('taxable', true);

    expect(component.productDetail()?.taxable).toBe('N');
    expect(component.isConfigSaving()).toBeTrue();
    expect((component as any).toDate('not-a-date')).toBeNull();
    expect((component as any).toDate({})).toBeNull();
    expect((component as any).isActivePrice({ fromDate: '2030-01-01T00:00:00Z' })).toBeFalse();
    expect((component as any).isActivePrice({ fromDate: '2020-01-01T00:00:00Z', thruDate: '2020-01-02T00:00:00Z' })).toBeFalse();
  });
});

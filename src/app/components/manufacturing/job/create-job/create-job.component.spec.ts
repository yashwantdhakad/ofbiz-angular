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
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CreateJobComponent } from './create-job.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { TranslateService } from '@ngx-translate/core';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';

describe('CreateJobComponent', () => {
  let component: CreateJobComponent;
  let fixture: ComponentFixture<CreateJobComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let productServiceSpy: jasmine.SpyObj<ProductService>;
  let commonServiceSpy: jasmine.SpyObj<CommonService>;
  let manufacturingServiceSpy: jasmine.SpyObj<ManufacturingService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let renderSchedulerSpy: jasmine.SpyObj<RenderSchedulerService>;
  let preferredFacilityServiceSpy: jasmine.SpyObj<PreferredFacilityService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    productServiceSpy = jasmine.createSpyObj('ProductService', ['getProducts', 'getProductsAutocompleteFromOms']);
    commonServiceSpy = jasmine.createSpyObj('CommonService', ['getFacilities']);
    manufacturingServiceSpy = jasmine.createSpyObj('ManufacturingService', ['createJob', 'getJobBom']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showError', 'showSuccess']);
    renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['markForCheck']);
    preferredFacilityServiceSpy = jasmine.createSpyObj('PreferredFacilityService', ['applyPreferredFacilityIfMissing']);
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      declarations: [CreateJobComponent],
      imports: [ReactiveFormsModule, FormsModule],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ProductService, useValue: productServiceSpy },
        { provide: CommonService, useValue: commonServiceSpy },
        { provide: ManufacturingService, useValue: manufacturingServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: PreferredFacilityService, useValue: preferredFacilityServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    })
      .overrideTemplate(CreateJobComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    commonServiceSpy.getFacilities.and.returnValue(of([]));
    productServiceSpy.getProducts.and.returnValue(of({ documentList: [] }));
    productServiceSpy.getProductsAutocompleteFromOms.and.returnValue(of({ documentList: [] }));
    manufacturingServiceSpy.getJobBom.and.returnValue(of([]));
    fixture = TestBed.createComponent(CreateJobComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load facilities on init', () => {
    const mockFacilities = [{ facilityId: 'FAC001', facilityName: 'Main' }];
    commonServiceSpy.getFacilities.and.returnValue(of(mockFacilities));

    component.ngOnInit();

    expect(commonServiceSpy.getFacilities).toHaveBeenCalled();
    expect(component.facilities).toEqual(mockFacilities);
    expect(preferredFacilityServiceSpy.applyPreferredFacilityIfMissing).toHaveBeenCalled();
  });

  it('should handle error while loading facilities', () => {
    commonServiceSpy.getFacilities.and.returnValue(throwError(() => new Error('fail')));

    component.ngOnInit();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('MANUFACTURING.FETCH_FACILITIES_ERROR');
  });

  it('should search products', fakeAsync(() => {
    const mockProducts = { documentList: [{ productId: 'P001' }] };
    productServiceSpy.getProductsAutocompleteFromOms.and.returnValue(of(mockProducts));
    manufacturingServiceSpy.getJobBom.and.returnValue(of([]));

    let emitted: any[] = [];
    component.filteredProducts$.subscribe((products) => {
      emitted = products;
    });
    component.produceProductIdControl.setValue('product');
    tick(350);

    expect(emitted).toEqual(mockProducts.documentList);
  }));

  it('should show fetch errors for products and bom components', fakeAsync(() => {
    productServiceSpy.getProductsAutocompleteFromOms.and.returnValue(throwError(() => new Error('products')));
    manufacturingServiceSpy.getJobBom.and.returnValue(throwError(() => new Error('bom')));

    let emitted: any[] = [];
    component.filteredProducts$.subscribe((products) => {
      emitted = products;
    });
    component.produceProductIdControl.setValue('product');
    tick(350);

    expect(emitted).toEqual([]);
    expect(snackbarSpy.showError).toHaveBeenCalledWith('MANUFACTURING.FETCH_PRODUCTS_ERROR');

    snackbarSpy.showError.calls.reset();
    component.produceProductIdControl.setValue({ productId: 'PROD1' });
    tick(350);

    expect(snackbarSpy.showError).toHaveBeenCalledWith('MANUFACTURING.FETCH_COMPONENTS_ERROR');
  }));

  it('should create job on valid form', () => {
    const mockResponse = { workEffortId: 'WE123' };
    manufacturingServiceSpy.createJob.and.returnValue(of(mockResponse));

    component.createJobForm.patchValue({
      purposeEnumId: 'WepProductionRun',
      workEffortName: 'Test Job',
      facilityId: 'FAC001',
      estimatedStartDate: '',
      estimatedWorkDuration: '',
      produceProductId: 'PROD001',
      produceEstimatedQuantity: 10,
      produceEstimatedAmount: '',
    });
    component.consumeItemsArray.at(0)?.patchValue({
      productId: 'COMP001',
      estimatedQuantity: 2,
    });

    component.createJob();

    expect(manufacturingServiceSpy.createJob).toHaveBeenCalledWith(jasmine.objectContaining({
      consumeItems: [
        {
          productId: 'COMP001',
          estimatedQuantity: 2,
        },
      ],
    }));
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/jobs/WE123']);
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('MANUFACTURING.JOB_CREATE_SUCCESS');
  });

  it('should show error if create job fails', () => {
    manufacturingServiceSpy.createJob.and.returnValue(throwError(() => new Error('fail')));

    component.createJobForm.patchValue({
      workEffortName: 'test',
      facilityId: 'fac1',
      produceProductId: 'prod1',
      produceEstimatedQuantity: 5,
    });
    component.consumeItemsArray.at(0)?.patchValue({
      productId: 'COMP001',
      estimatedQuantity: 1,
    });

    component.createJob();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('MANUFACTURING.JOB_CREATE_ERROR');
  });

  it('should cover helper branches, bom reset, and missing-id path', fakeAsync(() => {
    manufacturingServiceSpy.getJobBom.and.returnValue(of([
      { productId: 'COMP1', estimatedQuantity: 2 },
      { productId: 'COMP2', estimatedQuantity: 'bad' },
    ] as any));

    component.produceProductIdControl.setValue({ productId: 'PROD1' });
    tick(350);

    expect(component.consumeItemsArray).toHaveSize(2);
    component.createJobForm.get('produceEstimatedQuantity')?.setValue(3);
    tick(250);
    expect(component.consumeItemsArray.at(0).get('estimatedQuantity')?.value).toBe(6);
    expect(component.consumeItemsArray.at(1).get('estimatedQuantity')?.value).toBe('bad');

    component.removeConsumeItemRow(0);
    expect(component.consumeItemsArray).toHaveSize(1);
    component.removeConsumeItemRow(0);
    expect(component.consumeItemsArray).toHaveSize(1);

    expect(component.displayProduct('raw')).toBe('raw');
    expect(component.displayProduct({ internalName: 'Internal Name' })).toBe('Internal Name');

    manufacturingServiceSpy.createJob.and.returnValue(of({}));
    component.createJobForm.patchValue({
      workEffortName: 'Test Job',
      facilityId: 'FAC001',
      produceProductId: { productId: 'PROD001' },
      produceEstimatedQuantity: 10,
    });
    component.consumeItemsArray.at(0)?.patchValue({
      productId: { productId: 'COMP001' },
      estimatedQuantity: 2,
    });

    component.createJob();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('MANUFACTURING.JOB_CREATE_MISSING_ID');
    expect(component.isLoading()).toBeFalse();
  }));
});

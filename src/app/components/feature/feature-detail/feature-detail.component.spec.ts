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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FeatureDetailComponent } from './feature-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { TranslateService } from '@ngx-translate/core';

describe('FeatureDetailComponent', () => {
  let component: FeatureDetailComponent;
  let fixture: ComponentFixture<FeatureDetailComponent>;
  let featureServiceSpy: jasmine.SpyObj<FeatureService>;
  let matDialogSpy: jasmine.SpyObj<MatDialog>;

  const mockRoute = {
    params: of({ productFeatureId: 'F123' }),
  };

  const featureData = {
    productFeatureId: 'F123',
    abbrev: 'FEAT',
    description: 'Test Feature',
    products: [{ productId: 'P1', productFeatureApplTypeId: 'STANDARD_FEATURE' }],
    groups: [{ productFeatureGroupId: 'G1', group: 'Group A' }],
  };

  beforeEach(async () => {
    featureServiceSpy = jasmine.createSpyObj('FeatureService', ['getFeature']);
    matDialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const translateSpy = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant', 'get']);
    translateSpy.instant.and.callFake((key: string) => key);
    translateSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      declarations: [FeatureDetailComponent],
      providers: [
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: FeatureService, useValue: featureServiceSpy },
        { provide: MatDialog, useValue: matDialogSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideTemplate(FeatureDetailComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(FeatureDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch feature data on init', fakeAsync(() => {
    featureServiceSpy.getFeature.and.returnValue(of(featureData));
    fixture.detectChanges(); // triggers ngOnInit
    tick();

    expect(featureServiceSpy.getFeature).toHaveBeenCalledWith('F123');
    expect(component.featureDetail()).toEqual(featureData);
    expect(component.products()).toHaveSize(1);
    expect(component.groups()).toHaveSize(1);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle error on fetchFeature', fakeAsync(() => {
    featureServiceSpy.getFeature.and.returnValue(throwError(() => new Error('Fetch failed')));
    fixture.detectChanges(); // triggers ngOnInit
    tick();

    expect(featureServiceSpy.getFeature).toHaveBeenCalled();
    expect(component.featureDetail()).toBeNull();
    expect(component.products()).toEqual([]);
    expect(component.groups()).toEqual([]);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should open edit dialog and refetch on close', () => {
    const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of({ productFeatureId: 'F123' }) });
    matDialogSpy.open.and.returnValue(dialogRefSpyObj);
    featureServiceSpy.getFeature.and.returnValue(of(featureData));

    component.featureDetail.set(featureData);
    component.productFeatureId = 'F123';
    component.editFeatureDialog();

    expect(matDialogSpy.open).toHaveBeenCalled();
    expect(featureServiceSpy.getFeature).toHaveBeenCalledWith('F123');
  });

  it('should open addFeatureToProductDialog and refetch on close', () => {
    const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of({ productFeatureId: 'F123' }) });
    matDialogSpy.open.and.returnValue(dialogRefSpyObj);
    featureServiceSpy.getFeature.and.returnValue(of(featureData));

    component.productFeatureId = 'F123';
    component.addFeatureToProductDialog();

    expect(matDialogSpy.open).toHaveBeenCalled();
    expect(featureServiceSpy.getFeature).toHaveBeenCalledWith('F123');
  });

  it('should open addFeatureToGroupDialog and refetch on close', () => {
    const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of({ productFeatureId: 'F123' }) });
    matDialogSpy.open.and.returnValue(dialogRefSpyObj);
    featureServiceSpy.getFeature.and.returnValue(of(featureData));

    component.productFeatureId = 'F123';
    component.addFeatureToGroupDialog();

    expect(matDialogSpy.open).toHaveBeenCalled();
    expect(featureServiceSpy.getFeature).toHaveBeenCalledWith('F123');
  });

  it('should return current datetime as string', () => {
    const result = component.getCurrentDateTime();
    expect(typeof result).toBe('string');
  });

  it('should not refresh when dialogs close without a feature id', () => {
    const refreshSpy = spyOn(component, 'fetchFeature');
    matDialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    component.productFeatureId = 'F123';

    component.editFeatureDialog();
    component.addFeatureToProductDialog({ productId: 'P1' });
    component.addFeatureToGroupDialog({ productFeatureGroupId: 'G1' });

    expect(component.featureProductData).toEqual({ productId: 'P1', productFeatureId: 'F123' });
    expect(component.featureGroupData).toEqual({ productFeatureGroupId: 'G1', productFeatureId: 'F123' });
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('should delete product feature application on confirm and refresh', fakeAsync(() => {
    const refreshSpy = spyOn(component as any, 'refreshSilently').and.stub();
    featureServiceSpy.getFeature.and.returnValue(of(featureData));
    featureServiceSpy.deleteProductFeatureAppl = jasmine.createSpy().and.returnValue(of({})) as any;
    matDialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);

    component.productFeatureId = 'F123';
    component.deleteProductFeatureAppl({ id: 'A1', productId: 'P1' });
    tick();

    expect(matDialogSpy.open).toHaveBeenCalledWith(ConfirmationDialogComponent, jasmine.anything());
    expect(matDialogSpy.open).toHaveBeenCalledWith(ConfirmationDialogComponent, {
      data: {
        title: 'FEATURE.REMOVE_PRODUCT_ASSOC_TITLE',
        message: 'FEATURE.REMOVE_PRODUCT_ASSOC_MESSAGE',
      },
    });
    expect((featureServiceSpy as any).deleteProductFeatureAppl).toHaveBeenCalledWith('P1', 'A1');
    expect(refreshSpy).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle delete cancel and error paths', fakeAsync(() => {
    const refreshSpy = spyOn(component as any, 'refreshSilently').and.stub();
    spyOn(console, 'error');
    (featureServiceSpy as any).deleteProductFeatureAppl = jasmine.createSpy().and.returnValue(
      throwError(() => new Error('delete failed'))
    );
    matDialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as any);

    component.deleteProductFeatureAppl({ id: 'A1', productId: 'P1' });
    tick();
    expect((featureServiceSpy as any).deleteProductFeatureAppl).not.toHaveBeenCalled();

    matDialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.deleteProductFeatureAppl({ id: 'A1', productId: 'P1' });
    tick();
    expect(console.error).toHaveBeenCalled();
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  }));
});

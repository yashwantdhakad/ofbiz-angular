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
import { FeaturegroupDetailComponent } from './featuregroup-detail.component';
import { of, ReplaySubject, throwError } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { FeatureGroupService } from '@ofbiz/services/featuregroup/feature-group.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('FeaturegroupDetailComponent', () => {
  let component: FeaturegroupDetailComponent;
  let fixture: ComponentFixture<FeaturegroupDetailComponent>;
  let featureGroupServiceSpy: jasmine.SpyObj<FeatureGroupService>;
  let matDialogSpy: jasmine.SpyObj<MatDialog>;
  let routeParams$: ReplaySubject<{ productFeatureGroupId?: string }>;

  beforeEach(async () => {
    routeParams$ = new ReplaySubject<{ productFeatureGroupId?: string }>(1);
    routeParams$.next({ productFeatureGroupId: 'FG123' });
    const activatedRouteStub = {
      params: routeParams$.asObservable()
    };

    featureGroupServiceSpy = jasmine.createSpyObj('FeatureGroupService', ['getFeatureGroup']);
    matDialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [FeaturegroupDetailComponent],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: FeatureGroupService, useValue: featureGroupServiceSpy },
        { provide: MatDialog, useValue: matDialogSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FeaturegroupDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch feature group on init', fakeAsync(() => {
    const responseMock = {
      categories: [{ productCategoryId: 'PC001' }],
      features: [{ productFeatureId: 'PF001' }]
    };
    featureGroupServiceSpy.getFeatureGroup.and.returnValue(of(responseMock));

    fixture.detectChanges(); // triggers ngOnInit
    tick();

    expect(featureGroupServiceSpy.getFeatureGroup).toHaveBeenCalledWith('FG123');
    expect(component.categories()).toHaveSize(1);
    expect(component.features()).toHaveSize(1);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should refetch when the route feature group id changes', fakeAsync(() => {
    featureGroupServiceSpy.getFeatureGroup.and.returnValue(of({
      categories: [],
      features: [],
    }));

    fixture.detectChanges();
    tick();
    routeParams$.next({ productFeatureGroupId: 'FG456' });
    tick();

    expect(featureGroupServiceSpy.getFeatureGroup).toHaveBeenCalledWith('FG123');
    expect(featureGroupServiceSpy.getFeatureGroup).toHaveBeenCalledWith('FG456');
    expect(component.productFeatureGroupId).toBe('FG456');
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle error when fetching feature group fails', fakeAsync(() => {
    featureGroupServiceSpy.getFeatureGroup.and.returnValue(throwError(() => new Error('Fetch Error')));

    fixture.detectChanges(); // triggers ngOnInit
    tick();

    expect(component.featureGroupDetail()).toBeNull();
    expect(component.categories()).toEqual([]);
    expect(component.features()).toEqual([]);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should reopen edit feature group dialog and refresh data on close', fakeAsync(() => {
    featureGroupServiceSpy.getFeatureGroup.and.returnValue(of({}));
    matDialogSpy.open.and.returnValue({
      afterClosed: () => of({ productFeatureGroupId: 'FG123' })
    } as any);

    component.productFeatureGroupId = 'FG123';
    component.featureGroupDetail.set({ id: 'test' });
    component.editFeatureGroupDialog();
    tick();

    expect(matDialogSpy.open).toHaveBeenCalled();
    expect(featureGroupServiceSpy.getFeatureGroup).toHaveBeenCalledWith('FG123');
  }));

  it('should open product feature group application dialog and refresh on close result', fakeAsync(() => {
    featureGroupServiceSpy.getFeatureGroup.and.returnValue(of({}));
    matDialogSpy.open.and.returnValue({
      afterClosed: () => of({ productFeatureGroupId: 'FG123' })
    } as any);

    component.productFeatureGroupId = 'FG123';
    component.createProductFeatureGroupApplDialog({ productFeatureId: 'PF001' });
    tick();

    expect(component.featureGroupProductData).toEqual({
      productFeatureId: 'PF001',
      productFeatureGroupId: 'FG123',
    });
    expect(matDialogSpy.open).toHaveBeenCalled();
    expect(featureGroupServiceSpy.getFeatureGroup).toHaveBeenCalledWith('FG123');
  }));

  it('should open category application dialog and skip refresh when dialog returns nothing', fakeAsync(() => {
    featureGroupServiceSpy.getFeatureGroup.and.returnValue(of({}));
    matDialogSpy.open.and.returnValue({
      afterClosed: () => of(null)
    } as any);

    component.productFeatureGroupId = 'FG123';
    component.createProductCategoryFeatGrpApplDialog({ productCategoryId: 'CAT1' });
    tick();

    expect(component.featureGroupCategoryData).toEqual({
      productCategoryId: 'CAT1',
      productFeatureGroupId: 'FG123',
    });
    expect(featureGroupServiceSpy.getFeatureGroup).not.toHaveBeenCalled();
  }));

  it('should not refresh silently when feature group id is missing', fakeAsync(() => {
    featureGroupServiceSpy.getFeatureGroup.and.returnValue(of({}));
    matDialogSpy.open.and.returnValue({
      afterClosed: () => of({ productFeatureGroupId: 'FG123' })
    } as any);

    component.productFeatureGroupId = undefined;
    component.editFeatureGroupDialog();
    tick();

    expect(featureGroupServiceSpy.getFeatureGroup).not.toHaveBeenCalled();
  }));

  it('should return current date/time string', () => {
    const result = component.getCurrentDateTime();
    expect(typeof result).toBe('string');
    expect(result).toContain(new Date().getFullYear().toString());
  });
});

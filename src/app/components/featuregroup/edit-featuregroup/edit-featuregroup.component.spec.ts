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
import { EditFeaturegroupComponent } from './edit-featuregroup.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FeatureGroupService } from '@ofbiz/services/featuregroup/feature-group.service';
import { of, throwError } from 'rxjs';

describe('EditFeaturegroupComponent', () => {
  let component: EditFeaturegroupComponent;
  let fixture: ComponentFixture<EditFeaturegroupComponent>;
  let featureGroupServiceSpy: jasmine.SpyObj<FeatureGroupService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<EditFeaturegroupComponent>>;

  const mockData = {
    featureGroupDetail: {
      productFeatureGroupId: 'FG001',
      description: 'Test Group'
    }
  };

  beforeEach(async () => {
    featureGroupServiceSpy = jasmine.createSpyObj('FeatureGroupService', ['updateFeatureGroup']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [EditFeaturegroupComponent],
      providers: [
        { provide: FeatureGroupService, useValue: featureGroupServiceSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: dialogRefSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditFeaturegroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with data', () => {
    expect(component.featureGroupForm.value).toEqual({
      productFeatureGroupId: 'FG001',
      description: 'Test Group'
    });
  });

  it('should not submit if form is invalid', () => {
    component.featureGroupForm.controls['description'].setValue('');
    component.updateFeature();
    expect(featureGroupServiceSpy.updateFeatureGroup).not.toHaveBeenCalled();
  });

  it('should call updateFeatureGroup and close dialog on success', fakeAsync(() => {
    featureGroupServiceSpy.updateFeatureGroup.and.returnValue(of({ success: true }));

    component.featureGroupForm.controls['description'].setValue('Updated Group');
    component.updateFeature();
    tick();

    expect(featureGroupServiceSpy.updateFeatureGroup).toHaveBeenCalledWith({
      productFeatureGroupId: 'FG001',
      description: 'Updated Group'
    });
    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      productFeatureGroupId: 'FG001',
      description: 'Updated Group'
    });
  }));

  it('should keep dialog open on service failure', fakeAsync(() => {
    featureGroupServiceSpy.updateFeatureGroup.and.returnValue(throwError(() => new Error('Update failed')));

    component.featureGroupForm.controls['description'].setValue('Failed Update');
    component.updateFeature();
    tick();

    expect(dialogRefSpy.close).not.toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  }));
});

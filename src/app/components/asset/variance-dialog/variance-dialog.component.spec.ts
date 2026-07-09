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
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { AssetService } from '@ofbiz/services/asset/asset.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { VarianceDialogComponent } from './variance-dialog.component';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { TranslateService } from '@ngx-translate/core';

describe('VarianceDialogComponent', () => {
  let component: VarianceDialogComponent;
  let fixture: ComponentFixture<VarianceDialogComponent>;
  let assetService: jasmine.SpyObj<AssetService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<VarianceDialogComponent>>;
  let renderScheduler: jasmine.SpyObj<RenderSchedulerService>;

  beforeEach(async () => {
    assetService = jasmine.createSpyObj('AssetService', ['createPhysicalInventoryVariance', 'getVarianceReasons']);
    commonService = jasmine.createSpyObj('CommonService', ['getLookupResults']);
    snackbarService = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    renderScheduler = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask']);
    renderScheduler.deferMacrotask.and.callFake((task: () => void) => task());
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, VarianceDialogComponent],
      providers: [
        { provide: AssetService, useValue: assetService },
        { provide: CommonService, useValue: commonService },
        { provide: SnackbarService, useValue: snackbarService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { assetId: 'AST_100' } },
        { provide: RenderSchedulerService, useValue: renderScheduler },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideTemplate(VarianceDialogComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(VarianceDialogComponent);
    component = fixture.componentInstance;
  });

  it('should load variance reasons on init', fakeAsync(() => {
    assetService.getVarianceReasons.and.returnValue(of([{ varianceReasonId: 'VR_ADJ' }]));
    fixture.detectChanges();
    tick();
    expect(assetService.getVarianceReasons).toHaveBeenCalled();
    expect(component.reasons()).toHaveSize(1);
  }));

  it('should map reasons and default description to the id', fakeAsync(() => {
    assetService.getVarianceReasons.and.returnValue(of([
      { varianceReasonId: 'VAR_LOST', description: 'Lost' },
      { varianceReasonId: 'VAR_STOLEN' }
    ] as any));

    fixture.detectChanges();
    tick();

    expect(component.reasons()).toEqual([
      { varianceReasonId: 'VAR_LOST', description: 'Lost' },
      { varianceReasonId: 'VAR_STOLEN', description: 'VAR_STOLEN' }
    ]);
  }));

  it('should save variance and close dialog on success', fakeAsync(() => {
    assetService.getVarianceReasons.and.returnValue(of([]));
    assetService.createPhysicalInventoryVariance.and.returnValue(of({ variance: { varianceReasonId: 'VR_ADJ' } }));
    fixture.detectChanges();
    tick();

    component.varianceForm.patchValue({
      varianceReasonId: 'VR_ADJ',
      quantityOnHandVar: 2,
      availableToPromiseVar: 1,
      comments: 'count fix',
    });
    component.save();

    expect(assetService.createPhysicalInventoryVariance).toHaveBeenCalledWith('AST_100', jasmine.objectContaining({
      varianceReasonId: 'VR_ADJ',
    }));
    tick();
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('ASSET.VARIANCE.SUCCESS');
    expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({ created: true }));
  }));

  it('should show error snackbar on save failure', fakeAsync(() => {
    assetService.getVarianceReasons.and.returnValue(of([]));
    assetService.createPhysicalInventoryVariance.and.returnValue(throwError(() => new Error('failed')));
    fixture.detectChanges();
    tick();

    component.varianceForm.patchValue({ varianceReasonId: 'VR_ADJ' });
    component.save();

    tick();
    expect(snackbarService.showError).toHaveBeenCalledWith('ASSET.VARIANCE.ERROR');
    expect(dialogRef.close).not.toHaveBeenCalled();
  }));

  it('should clear reasons on lookup failure and expose trackBy fallback', fakeAsync(() => {
    assetService.getVarianceReasons.and.returnValue(throwError(() => new Error('lookup failed')));

    fixture.detectChanges();
    tick();

    expect(component.reasons()).toEqual([]);
    expect(component.trackByReason(4, null)).toBe('4');
    expect(component.trackByReason(1, { varianceReasonId: 'VR_ADJ' })).toBe('VR_ADJ');
  }));

  it('should not save when the form is invalid', () => {
    assetService.getVarianceReasons.and.returnValue(of([]));
    fixture.detectChanges();
    component.varianceForm.patchValue({ varianceReasonId: '' });

    component.save();

    expect(assetService.createPhysicalInventoryVariance).not.toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });

  it('should close dialog with false on cancel', () => {
    component.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});

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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { RoutingCreateComponent } from './routing-create.component';
import { RoutingService } from '../../../../services/manufacturing/routing.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

describe('RoutingCreateComponent', () => {
  let component: RoutingCreateComponent;
  let fixture: ComponentFixture<RoutingCreateComponent>;
  let routingServiceSpy: jasmine.SpyObj<RoutingService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let translateSpy: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    routingServiceSpy = jasmine.createSpyObj('RoutingService', ['createRouting']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    translateSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    translateSpy.instant.and.callFake((key: string) => key);

    routingServiceSpy.createRouting.and.returnValue(of({ workEffortId: 'ROUTING-1' }));

    await TestBed.configureTestingModule({
      declarations: [RoutingCreateComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: RoutingService, useValue: routingServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(RoutingCreateComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RoutingCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize the form and block invalid submissions', () => {
    expect(component.routingForm.get('workEffortName')?.value).toBe('');
    expect(component.routingForm.get('quantityToProduce')?.value).toBe(0);

    component.routingForm.patchValue({ workEffortName: '' });
    component.createRouting();

    expect(routingServiceSpy.createRouting).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBeFalse();
  });

  it('should create routing and navigate to the detail page when an id is returned', () => {
    component.routingForm.patchValue({
      workEffortName: 'Assembly Route',
      description: 'Main line',
      quantityToProduce: 25,
    });

    component.createRouting();

    expect(routingServiceSpy.createRouting).toHaveBeenCalledWith(jasmine.objectContaining({
      workEffortTypeId: 'ROUTING',
      currentStatusId: 'ROU_ACTIVE',
      workEffortName: 'Assembly Route',
      description: 'Main line',
      quantityToProduce: 25,
      revisionNumber: 1,
    }) as any);
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('MANUFACTURING.CREATE_ROUTING_SUCCESS');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/routings', 'ROUTING-1']);
    expect(component.isSubmitting()).toBeTrue();
  });

  it('should fall back to the list page when createRouting returns no id', () => {
    routingServiceSpy.createRouting.and.returnValue(of({}));
    component.routingForm.patchValue({
      workEffortName: 'Route without id',
      description: '',
      quantityToProduce: 0,
    });

    component.createRouting();

    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('MANUFACTURING.CREATE_ROUTING_SUCCESS');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/routings']);
  });

  it('should show an error when createRouting fails and clear submitting state', () => {
    routingServiceSpy.createRouting.and.returnValue(throwError(() => new Error('boom')));
    component.routingForm.patchValue({
      workEffortName: 'Broken Route',
      description: 'Fail path',
      quantityToProduce: 3,
    });

    component.createRouting();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('MANUFACTURING.CREATE_ROUTING_ERROR');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBeFalse();
  });

  it('should cancel back to the routing list and keep helper defaults covered', () => {
    component.cancel();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/routings']);
    expect(component.routingForm.get('quantityToProduce')?.value).toBe(0);
  });
});

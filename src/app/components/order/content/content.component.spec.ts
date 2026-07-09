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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentComponent } from './content.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { OrderService } from '@ofbiz/services/order/order.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { of, throwError } from 'rxjs';

describe('ContentComponent', () => {
  let component: ContentComponent;
  let fixture: ComponentFixture<ContentComponent>;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ContentComponent>>;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;

  const mockData = { contentData: { orderId: 'ORDER-123' } };

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['createOrderContent']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    translateServiceSpy.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      declarations: [ContentComponent],
      imports: [ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: TranslateService, useValue: translateServiceSpy }
      ]
    })
      .overrideComponent(ContentComponent, {
        set: { template: '<form [formGroup]="fileForm"></form>' },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and initialize form', () => {
    expect(component).toBeTruthy();
    expect(component.fileForm).toBeDefined();
    expect(component.fileForm.get('description')?.hasError('required')).toBeTrue();
  });

  it('should set file input on change', () => {
    const file = new File(['dummy content'], 'test.txt');
    const event = { target: { files: [file] } };

    component.onFileChange(event);
    expect(component.fileForm.get('contentFile')?.value).toBe(file);
  });

  it('should call orderService and show success message on valid form submit', () => {
    const file = new File(['test'], 'file.txt');
    component.fileForm.setValue({
      contentFile: file,
      description: 'Sample file upload'
    });

    orderServiceSpy.createOrderContent.and.returnValue(of({}));

    component.createOrderContent();

    expect(orderServiceSpy.createOrderContent).toHaveBeenCalled();
    expect(translateServiceSpy.instant).toHaveBeenCalledWith('ORDER.CONTENT_SAVE_SUCCESS');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('ORDER.CONTENT_SAVE_SUCCESS');
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('should show error message on upload failure', () => {
    const file = new File(['test'], 'file.txt');
    component.fileForm.setValue({
      contentFile: file,
      description: 'Failed upload'
    });

    orderServiceSpy.createOrderContent.and.returnValue(throwError(() => new Error('Upload failed')));

    component.createOrderContent();

    expect(orderServiceSpy.createOrderContent).toHaveBeenCalled();
    expect(translateServiceSpy.instant).toHaveBeenCalledWith('ORDER.CONTENT_SAVE_ERROR');
    expect(snackbarSpy.showError).toHaveBeenCalledWith('ORDER.CONTENT_SAVE_ERROR');
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('should mark fields touched and not submit when description is missing', () => {
    const file = new File(['test'], 'file.txt');
    component.fileForm.setValue({
      contentFile: file,
      description: ''
    });

    component.createOrderContent();

    expect(component.fileForm.get('description')?.touched).toBeTrue();
    expect(orderServiceSpy.createOrderContent).not.toHaveBeenCalled();
  });
});

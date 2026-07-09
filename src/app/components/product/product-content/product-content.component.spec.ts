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
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ProductContentComponent } from './product-content.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

describe('ProductContentComponent', () => {
  let component: ProductContentComponent;
  let fixture: ComponentFixture<ProductContentComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ProductContentComponent>>;
  let mockProductService: jasmine.SpyObj<any>;
  let mockSnackbarService: jasmine.SpyObj<any>;

  const mockData = {
    contentData: { productId: 'PROD-123' }
  };

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockProductService = jasmine.createSpyObj('ProductService', ['createProductContent']);
    mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);

    await TestBed.configureTestingModule({
      declarations: [ProductContentComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: ProductService, useValue: mockProductService },
        { provide: SnackbarService, useValue: mockSnackbarService },
        TranslateService
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function createFileChangeEvent(file: File): Event {
    return {
      target: {
        files: [file],
      } as unknown as EventTarget,
    } as Event;
  }

  it('should create the component and form', () => {
    expect(component).toBeTruthy();
    expect(component.fileForm).toBeDefined();
    expect(component.fileForm.get('description')?.hasError('required')).toBeTrue();
  });

  it('should update form control on file change', () => {
    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    const event = createFileChangeEvent(mockFile);

    component.onFileChange(event);
    expect(component.fileForm.get('contentFile')?.value).toBe('test.txt');
    expect(component.selectedFile).toBe(mockFile);
  });

  it('should call createProductContent and close dialog on success', () => {
    const mockFile = new File(['file content'], 'file.pdf', { type: 'application/pdf' });
    component.onFileChange(createFileChangeEvent(mockFile));
    component.fileForm.get('description')?.setValue('Product comment');

    mockProductService.createProductContent.and.returnValue(of({}));

    component.createProductContent();

    expect(mockProductService.createProductContent).toHaveBeenCalledWith(
      mockData.contentData.productId,
      jasmine.any(FormData)
    );
    expect(mockSnackbarService.showSuccess).toHaveBeenCalled();
    expect(mockDialogRef.close).toHaveBeenCalledWith(mockData.contentData);
  });

  it('should show error on failed upload', fakeAsync(() => {
    const file = new File([''], 'test-file.pdf', { type: 'application/pdf' });
    component.onFileChange(createFileChangeEvent(file));
    component.fileForm.get('description')?.setValue('Product comment');

    mockProductService.createProductContent.and.returnValue(throwError(() => new Error('Upload failed')));
    component.createProductContent();
    tick();

    expect(mockSnackbarService.showError).toHaveBeenCalled();
  }));

  it('should not submit when description is missing', () => {
    const file = new File([''], 'test-file.pdf', { type: 'application/pdf' });
    component.onFileChange(createFileChangeEvent(file));

    component.createProductContent();

    expect(component.fileForm.get('description')?.touched).toBeTrue();
    expect(mockProductService.createProductContent).not.toHaveBeenCalled();
  });

});

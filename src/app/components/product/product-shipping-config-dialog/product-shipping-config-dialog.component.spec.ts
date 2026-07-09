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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { ProductShippingConfigDialogComponent } from './product-shipping-config-dialog.component';

describe('ProductShippingConfigDialogComponent', () => {
  let component: ProductShippingConfigDialogComponent;
  let fixture: ComponentFixture<ProductShippingConfigDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ProductShippingConfigDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<ProductShippingConfigDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [ProductShippingConfigDialogComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            config: {
              shippable: true,
              inShipBox: false,
              productHeight: 10,
              productWidth: 20,
              productDepth: null,
              productWeight: 5,
              shippingHeight: 12,
              shippingWidth: 22,
              shippingDepth: 3,
              shippingWeight: '',
            },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductShippingConfigDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('maps incoming config values into form strings', () => {
    expect(component.form.value).toEqual({
      shippable: true,
      inShipBox: false,
      productHeight: '10',
      productWidth: '20',
      productDepth: '',
      productWeight: '5',
      shippingHeight: '12',
      shippingWidth: '22',
      shippingDepth: '3',
      shippingWeight: '',
    });
  });

  it('converts numeric fields back to numbers or null on save', () => {
    component.form.setValue({
      shippable: true,
      inShipBox: true,
      productHeight: '10.5',
      productWidth: '',
      productDepth: '2',
      productWeight: 'not-a-number',
      shippingHeight: '8',
      shippingWidth: '9',
      shippingDepth: '',
      shippingWeight: '4',
    });

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      shippable: true,
      inShipBox: true,
      productHeight: 10.5,
      productWidth: null,
      productDepth: 2,
      productWeight: null,
      shippingHeight: 8,
      shippingWidth: 9,
      shippingDepth: null,
      shippingWeight: 4,
    });
  });
});

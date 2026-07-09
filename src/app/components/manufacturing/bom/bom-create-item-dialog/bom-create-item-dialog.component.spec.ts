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
import { MatDialogRef } from '@angular/material/dialog';
import { BomCreateItemDialogComponent } from './bom-create-item-dialog.component';

describe('BomCreateItemDialogComponent', () => {
  let component: BomCreateItemDialogComponent;
  let fixture: ComponentFixture<BomCreateItemDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<BomCreateItemDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [BomCreateItemDialogComponent],
      providers: [{ provide: MatDialogRef, useValue: dialogRef }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(BomCreateItemDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close with form payload on save', () => {
    component.componentProductId = 'COMP_1';
    component.quantity = 3;
    component.fromDate = '2026-02-11T00:00:00.000Z';
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      componentProductId: 'COMP_1',
      quantity: 3,
      fromDate: '2026-02-11T00:00:00.000Z',
    });
  });

  it('should not close when component product id is empty', () => {
    component.componentProductId = '';
    component.save();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should close with null on close()', () => {
    component.close();
    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });
});


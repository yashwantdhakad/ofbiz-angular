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
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { NoteComponent } from './note.component';
import { OrderService } from '@ofbiz/services/order/order.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

describe('NoteComponent', () => {
  let component: NoteComponent;
  let fixture: ComponentFixture<NoteComponent>;
  let orderService: jasmine.SpyObj<OrderService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<NoteComponent>>;

  const noteData = {
    orderId: 'ORDER123',
    noteDate: '', // means it's a create operation
    noteText: 'Initial note',
  };

  beforeEach(async () => {
    const orderServiceSpy = jasmine.createSpyObj('OrderService', ['createOrderNote', 'updateOrderNote']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      declarations: [NoteComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { noteData } },
        { provide: TranslateService, useValue: translateServiceSpy },
      ]
    })
      .overrideTemplate(NoteComponent, '')
      .compileComponents();

    orderService = TestBed.inject(OrderService) as jasmine.SpyObj<OrderService>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<NoteComponent>>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with provided noteData', () => {
    const form = component.addUpdateNoteForm;
    expect(form.get('orderId')?.value).toBe('ORDER123');
    expect(form.get('noteText')?.value).toBe('Initial note');
  });

  it('should mark form invalid if noteText is empty', () => {
    component.addUpdateNoteForm.get('noteText')?.setValue('');
    expect(component.addUpdateNoteForm.valid).toBeFalse();
  });

  it('should call createOrderNote and close dialog on success', fakeAsync(() => {
    component.addUpdateNoteForm.get('noteId')?.setValue(null); // creation mode
    const formValue = component.addUpdateNoteForm.value;

    orderService.createOrderNote.and.returnValue(of({ noteId: 'NOTE001' }));

    component.addUpdateNote();
    tick();

    expect(orderService.createOrderNote).toHaveBeenCalledWith(formValue);
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('ORDER.NOTE_SAVE_SUCCESS');
    expect(dialogRef.close).toHaveBeenCalledWith({ noteId: 'NOTE001' });
    expect(component.isLoading()).toBeFalse();
  }));

  it('should call updateOrderNote on update mode', fakeAsync(() => {
    component.addUpdateNoteForm.get('noteId')?.setValue('NOTE002'); // update mode
    const formValue = component.addUpdateNoteForm.value;

    orderService.updateOrderNote.and.returnValue(of({ noteId: 'NOTE002' }));

    component.addUpdateNote();
    tick();

    expect(orderService.updateOrderNote).toHaveBeenCalledWith(formValue);
    expect(snackbarService.showSuccess).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith({ noteId: 'NOTE002' });
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle error from service', fakeAsync(() => {
    orderService.createOrderNote.and.returnValue(throwError(() => new Error('Create failed')));

    component.addUpdateNote();
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('ORDER.NOTE_SAVE_ERROR');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  }));
});

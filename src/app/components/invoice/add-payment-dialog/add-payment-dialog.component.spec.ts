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
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { of, throwError } from 'rxjs';
import { MatSelectChange } from '@angular/material/select';
import { MaterialModule } from '../../common/material/material.module';
import { InvoiceService } from '@ofbiz/services/invoice/invoice.service';
import { AddPaymentDialogComponent } from './add-payment-dialog.component';

describe('AddPaymentDialogComponent', () => {
  let component: AddPaymentDialogComponent;
  let fixture: ComponentFixture<AddPaymentDialogComponent>;
  let invoiceService: jasmine.SpyObj<InvoiceService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddPaymentDialogComponent>>;

  beforeEach(async () => {
    invoiceService = jasmine.createSpyObj('InvoiceService', ['applyPayment']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [AddPaymentDialogComponent],
      imports: [ReactiveFormsModule, MaterialModule, MatTabsModule],
      providers: [
        { provide: InvoiceService, useValue: invoiceService },
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            invoiceDbId: 99,
            invoiceId: 'INV-100',
            mode: 'sales',
            defaultAmount: 25,
            currencyUomId: 'USD',
            availablePayments: [
              { paymentId: 'PAY-1', unappliedAmount: 25, paymentMethodLabel: 'Card ••••1234' },
            ],
            availablePaymentMethods: [
              { paymentMethodId: 'PM-1', paymentMethodTypeId: 'CREDIT_CARD', displayValue: 'Card ••••1234' },
            ],
            partyIdFrom: 'CUST-1',
            partyIdTo: 'COMPANY',
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddPaymentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should default to existing-payment mode when available payments exist', () => {
    expect(component.selectedTab).toBe(0);
    expect(component.paymentForm.get('paymentId')?.hasError('required')).toBeTrue();
  });

  it('should apply an existing payment through the invoice service', () => {
    invoiceService.applyPayment.and.returnValue(of({ id: 99 }));
    component.paymentForm.patchValue({
      paymentId: 'PAY-1',
      amount: 20,
    });

    component.onAdd();

    expect(invoiceService.applyPayment).toHaveBeenCalledWith(99, jasmine.objectContaining({
      paymentId: 'PAY-1',
      amount: 20,
      currencyUomId: 'USD',
    }));
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 99 });
  });

  it('should record a new customer payment when using the record tab', () => {
    invoiceService.applyPayment.and.returnValue(of({ id: 99 }));
    component.switchTab(1);
    component.paymentForm.patchValue({
      amount: 25,
      paymentMethodId: 'PM-1',
      paymentMethodTypeId: 'CREDIT_CARD',
      referenceNo: 'REF-1',
    });

    component.onAdd();

    expect(invoiceService.applyPayment).toHaveBeenCalledWith(99, jasmine.objectContaining({
      paymentMethodId: 'PM-1',
      paymentMethodTypeId: 'CREDIT_CARD',
      paymentTypeId: 'CUSTOMER_PAYMENT',
      referenceNo: 'REF-1',
    }));
  });

  it('should record a new vendor payment for purchase invoices', () => {
    component.data.mode = 'purchase';
    invoiceService.applyPayment.and.returnValue(of({ id: 99 }));
    component.switchTab(1);
    component.paymentForm.patchValue({
      amount: 25,
      paymentMethodId: 'PM-1',
      paymentMethodTypeId: 'CREDIT_CARD',
      referenceNo: 'REF-2',
    });

    component.onAdd();

    expect(invoiceService.applyPayment).toHaveBeenCalledWith(99, jasmine.objectContaining({
      paymentMethodId: 'PM-1',
      paymentMethodTypeId: 'CREDIT_CARD',
      paymentTypeId: 'VENDOR_PAYMENT',
      referenceNo: 'REF-2',
    }));
  });

  it('should allow recording a new payment without a linked payment method', () => {
    invoiceService.applyPayment.and.returnValue(of({ id: 99 }));
    component.switchTab(1);
    component.paymentForm.patchValue({
      amount: 25,
      paymentMethodId: '',
      paymentMethodTypeId: 'COMPANY_CHECK',
      referenceNo: 'REF-3',
    });

    component.onAdd();

    expect(invoiceService.applyPayment).toHaveBeenCalledWith(99, jasmine.objectContaining({
      paymentMethodTypeId: 'COMPANY_CHECK',
      paymentTypeId: 'CUSTOMER_PAYMENT',
      referenceNo: 'REF-3',
    }));
    expect(invoiceService.applyPayment.calls.mostRecent().args[1].paymentMethodId).toBeUndefined();
  });

  it('should default to record mode when there are no existing payments', () => {
    component.data.availablePayments = [];
    component.ngOnInit();

    expect(component.selectedTab).toBe(1);
    expect(component.isExistingPaymentMode).toBeFalse();
  });

  it('should switch validators and patch payment method types from the selected method', () => {
    component.switchTab(1);
    component.onPaymentMethodChange(new MatSelectChange(null as any, 'PM-1'));
    expect(component.paymentForm.get('paymentMethodTypeId')?.value).toBe('CREDIT_CARD');

    component.paymentForm.patchValue({ paymentMethodTypeId: 'WIRE_TRANSFER' });
    component.onPaymentMethodChange(new MatSelectChange(null as any, ''));
    expect(component.paymentForm.get('paymentMethodTypeId')?.value).toBe('WIRE_TRANSFER');

    component.switchTab(0);
    component.paymentForm.patchValue({ paymentId: '' });
    expect(component.paymentForm.get('paymentId')?.hasError('required')).toBeTrue();
  });

  it('should expose purchase labels and stop submit when the form is invalid', () => {
    component.data.mode = 'purchase';
    expect(component.labels.title).toBe('PAYMENT.APPLY_VENDOR_PAYMENT');

    component.paymentForm.patchValue({ amount: 0, paymentId: '' });
    component.switchTab(0);
    component.onAdd();

    expect(invoiceService.applyPayment).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBeFalse();
  });

  it('should reset submitting state on apply-payment error and close false on cancel', () => {
    invoiceService.applyPayment.and.returnValue(throwError(() => new Error('apply failed')));
    component.paymentForm.patchValue({
      paymentId: 'PAY-1',
      amount: 20,
    });

    component.onAdd();

    expect(component.isSubmitting()).toBeFalse();
    expect(dialogRef.close).not.toHaveBeenCalledWith({ id: 99 });

    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});

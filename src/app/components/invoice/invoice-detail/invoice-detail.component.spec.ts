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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { InvoiceDetailComponent } from './invoice-detail.component';
import { InvoiceService } from '@ofbiz/services/invoice/invoice.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

describe('InvoiceDetailComponent', () => {
  let component: InvoiceDetailComponent;
  let fixture: ComponentFixture<InvoiceDetailComponent>;
  let invoiceServiceSpy: jasmine.SpyObj<InvoiceService>;
  let referenceDataStoreSpy: jasmine.SpyObj<ReferenceDataStore>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let translateSpy: jasmine.SpyObj<TranslateService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let activatedRouteStub: any;

  beforeEach(async () => {
    activatedRouteStub = {
      parent: {
        snapshot: {
          data: {},
        },
      },
      snapshot: {
        data: { mode: 'purchase' },
        paramMap: convertToParamMap({ id: '101' }),
      },
    };
    invoiceServiceSpy = jasmine.createSpyObj('InvoiceService', [
      'getInvoiceDetail',
      'getInvoicePdf',
      'changeInvoiceStatus',
      'removePaymentApplication',
    ]);
    referenceDataStoreSpy = jasmine.createSpyObj('ReferenceDataStore', ['ensureAllStatusesLoaded', 'statusDescriptionMap']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    translateSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    referenceDataStoreSpy.statusDescriptionMap.and.returnValue(
      new Map([
        ['INVOICE_APPROVED', 'Approved'],
        ['INVOICE_PAID', 'Paid'],
      ])
    );
    translateSpy.instant.and.callFake((key: string) => key);
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);

    await TestBed.configureTestingModule({
      declarations: [InvoiceDetailComponent],
      providers: [
        { provide: InvoiceService, useValue: invoiceServiceSpy },
        { provide: ReferenceDataStore, useValue: referenceDataStoreSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: TranslateService, useValue: translateSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: Router, useValue: routerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(InvoiceDetailComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(InvoiceDetailComponent);
    component = fixture.componentInstance;
  });

  it('loads purchase invoice detail and builds status history entries', fakeAsync(() => {
    invoiceServiceSpy.getInvoiceDetail.and.returnValue(of({
      id: 101,
      invoiceId: 'INV-101',
      grandTotal: 120,
      outstandingAmount: 20,
      statuses: [
        {
          statusId: 'INVOICE_APPROVED',
          statusDate: '2026-04-07T10:00:00',
          changeByUserLoginId: 'approver',
        },
      ],
      payments: [{ amountApplied: 120 }],
    }));

    fixture.detectChanges();
    tick();

    expect(referenceDataStoreSpy.ensureAllStatusesLoaded).toHaveBeenCalled();
    expect(component.mode()).toBe('purchase');
    expect(component.listPath()).toBe('/invoices/purchase');
    expect(component.statusHistoryEntries()).toEqual([
      jasmine.objectContaining({
        statusId: 'INVOICE_APPROVED',
        statusLabel: 'Approved',
        changedAt: '2026-04-07T10:00:00',
        changedBy: 'approver',
      }),
    ]);
    expect(component.isFullyPaid()).toBeTrue();
  }));

  it('switches to sales mode when the route says sales', fakeAsync(() => {
    activatedRouteStub.parent.snapshot.data = { mode: 'sales' };
    activatedRouteStub.snapshot.data = {};
    fixture = TestBed.createComponent(InvoiceDetailComponent);
    component = fixture.componentInstance;
    invoiceServiceSpy.getInvoiceDetail.and.returnValue(of({ id: 101, invoiceId: 'INV-101' }));

    fixture.detectChanges();
    tick();

    expect(component.mode()).toBe('sales');
    expect(component.listPath()).toBe('/invoices/sales');
    expect(component.invoiceStatuses.map((status) => status.id)).toEqual([
      'INVOICE_IN_PROCESS',
      'INVOICE_SENT',
      'INVOICE_READY',
      'INVOICE_PAID',
      'INVOICE_WRITEOFF',
      'INVOICE_CANCELLED',
    ]);
  }));

  it('maps invoice statuses into status history entries', fakeAsync(() => {
    invoiceServiceSpy.getInvoiceDetail.and.returnValue(of({
      id: 101,
      invoiceId: 'INV-101',
      statusId: 'INVOICE_PAID',
      statuses: [
        {
          statusId: 'INVOICE_APPROVED',
          statusDate: '2026-04-07T10:00:00',
          changeByUserLoginId: 'approver',
        },
        {
          statusId: 'INVOICE_PAID',
          statusDate: '2026-04-07T12:00:00',
          changeByUserLoginId: 'cashier',
        },
      ],
    }));

    fixture.detectChanges();
    tick();

    expect(referenceDataStoreSpy.ensureAllStatusesLoaded).toHaveBeenCalled();
    expect(invoiceServiceSpy.getInvoiceDetail).toHaveBeenCalledWith('101');
    expect(component.statusHistoryEntries()).toEqual([
      jasmine.objectContaining({
        statusId: 'INVOICE_APPROVED',
        statusLabel: 'Approved',
        changedAt: '2026-04-07T10:00:00',
        changedBy: 'approver',
      }),
      jasmine.objectContaining({
        statusId: 'INVOICE_PAID',
        statusLabel: 'Paid',
        changedAt: '2026-04-07T12:00:00',
        changedBy: 'cashier',
      }),
    ]);
  }));

  it('shows load error state when invoice fetch fails', fakeAsync(() => {
    invoiceServiceSpy.getInvoiceDetail.and.returnValue(throwError(() => new Error('load failed')));

    fixture.detectChanges();
    tick();

    expect(component.invoice()).toBeNull();
    expect(component.isLoading()).toBeFalse();
  }));

  it('returns labels, links, and display guards correctly', () => {
    component.invoice.set({
      id: 101,
      invoiceId: 'INV-101',
      outstandingAmount: 10,
      statuses: [],
      payments: [],
    });

    expect(component.getStatusLabel('INVOICE_APPROVED')).toBe('Approved');
    expect(component.getStatusLabel('invoice_custom')).toBe('Invoice Custom');
    expect(component.getStatusLabel(null)).toBe('-');
    expect(component.getPaymentStatusLabel('PMNT_RECEIVED')).toBe('Received');
    expect(component.getPaymentStatusLabel('PMNT_SENT')).toBe('Paid');
    expect(component.getReferenceLink({ type: 'purchase invoice', referenceId: 'PO-1' })).toEqual(['/pos', 'PO-1']);
    expect(component.getReferenceLink({ type: 'sales invoice', referenceId: 'SO-1' })).toEqual(['/orders', 'SO-1']);
    expect(component.getReferenceLink({ type: 'other', referenceId: 'X' })).toEqual(['/orders', 'X']);
    expect(component.getPaymentLink({ paymentDbId: 'PAY-1' })).toEqual(['/payments', 'PAY-1']);
    expect(component.getPaymentLink({})).toBeNull();
    expect(component.canApplyPayment()).toBeTrue();
    expect(component.canRemovePayment({ paymentApplicationId: 'APP-1' })).toBeTrue();
    expect(component.canRemovePayment({})).toBeFalse();
    expect(component.shouldShowAddressLine('123 Main', 'Acme')).toBeTrue();
    expect(component.shouldShowAddressLine('Acme', 'Acme')).toBeFalse();
  });

  it('opens the add payment dialog with computed defaults and updates on success', () => {
    component.mode.set('purchase');
    component.invoice.set({
      id: 101,
      invoiceId: 'INV-101',
      grandTotal: 150,
      payments: [{ amountApplied: 40 }, { amountApplied: 30 }],
      currencyUomId: 'USD',
      availablePayments: ['PAY-1'],
      availablePaymentMethods: ['CARD'],
      partyId: 'FROM-1',
      partyIdFrom: 'TO-1',
    });
    dialogSpy.open.and.returnValue({ afterClosed: () => of({ id: 101, invoiceId: 'INV-101', updated: true }) } as any);

    component.openAddPaymentDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
      width: '640px',
        data: jasmine.objectContaining({
          invoiceDbId: 101,
          invoiceId: 'INV-101',
          mode: 'purchase',
          defaultAmount: 80,
          currencyUomId: 'USD',
          availablePayments: ['PAY-1'],
          availablePaymentMethods: ['CARD'],
          partyIdFrom: 'FROM-1',
          partyIdTo: 'TO-1',
        }),
      }));
    expect(component.invoice()).toEqual({ id: 101, invoiceId: 'INV-101', updated: true });
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('INVOICE.PAYMENT_APPLIED_SUCCESS');
  });

  it('handles status change success and failure', () => {
    component.invoice.set({ id: 101 });
    invoiceServiceSpy.changeInvoiceStatus.and.returnValues(
      of({ id: 101, statusId: 'INVOICE_PAID' }),
      throwError(() => new Error('status failed'))
    );

    component.changeStatus('INVOICE_PAID');
    expect(invoiceServiceSpy.changeInvoiceStatus).toHaveBeenCalledWith(101, 'INVOICE_PAID');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('INVOICE.STATUS_UPDATED');
    expect(component.isSavingStatus()).toBeFalse();

    component.changeStatus('INVOICE_PAID');
    expect(snackbarSpy.showError).toHaveBeenCalledWith('status failed');
    expect(component.isSavingStatus()).toBeFalse();
  });

  it('handles payment application removal success and failure', () => {
    component.invoice.set({ id: 101 });
    invoiceServiceSpy.removePaymentApplication.and.returnValues(
      of({ id: 101, outstandingAmount: 20 }),
      throwError(() => new Error('remove failed'))
    );

    component.removePaymentApplication({ paymentApplicationId: 'APP-1' });
    expect(invoiceServiceSpy.removePaymentApplication).toHaveBeenCalledWith(101, 'APP-1');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('INVOICE.PAYMENT_APPLICATION_REMOVED');
    expect(component.isSavingPayment()).toBeFalse();

    component.removePaymentApplication({ paymentApplicationId: 'APP-1' });
    expect(snackbarSpy.showError).toHaveBeenCalledWith('remove failed');
    expect(component.isSavingPayment()).toBeFalse();
  });

  it('navigates to reconcile and opens pdf only when invoice id exists', () => {
    component.invoice.set({ id: 101 });
    invoiceServiceSpy.getInvoicePdf.and.returnValue(of(new Blob(['pdf'])) as any);
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:invoice');
    spyOn(window.URL, 'revokeObjectURL');
    spyOn(window, 'open').and.stub();

    component.navigateToReconcile();
    component.openPdf();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/invoices/purchase', 101, 'reconcile']);
    expect(invoiceServiceSpy.getInvoicePdf).toHaveBeenCalledWith(101);
    expect(window.open).toHaveBeenCalledWith('blob:invoice', '_blank');
  });

  it('does not open actions when invoice id is missing', () => {
    component.invoice.set(null);

    component.openAddPaymentDialog();
    component.navigateToReconcile();
    component.openPdf();
    component.removePaymentApplication({});

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(invoiceServiceSpy.getInvoicePdf).not.toHaveBeenCalled();
    expect(invoiceServiceSpy.removePaymentApplication).not.toHaveBeenCalled();
  });
});

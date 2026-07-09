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
import { TestBed } from '@angular/core/testing';
import { PaymentService } from './payment.service';
import { ApiService } from '../common/api.service';
import { of } from 'rxjs';

describe('PaymentService', () => {
  let service: PaymentService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', ['get', 'post']);
    TestBed.configureTestingModule({
      providers: [
        PaymentService,
        { provide: ApiService, useValue: spy },
      ],
    });
    service = TestBed.inject(PaymentService);
    apiSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── findPayments ───────────────────────────────────────────────────────

  it('should call findPayments with page index offset by -1 (0-based OFBiz)', () => {
    apiSpy.get.and.returnValue(of({ data: { resultList: [], totalCount: 0 } }));
    service.findPayments(1, 10, {}).subscribe(res => {
      expect(res.resultList).toEqual([]);
      expect(res.totalCount).toBe(0);
    });
    const url: string = apiSpy.get.calls.mostRecent().args[0] as string;
    expect(url).toContain('page=0');  // page 1 → 0-based index 0
    expect(url).toContain('size=10');
  });

  it('should include all filters in findPayments URL', () => {
    apiSpy.get.and.returnValue(of({ data: { resultList: [], totalCount: 0 } }));
    service.findPayments(2, 25, {
      queryString         : 'ABC',
      paymentTypeId       : 'CUSTOMER_PAYMENT',
      paymentMethodTypeId : 'EFT_ACCOUNT',
      statusId            : 'PMNT_NOT_PAID',
      paymentDate         : '2026-01-01',
    }).subscribe();
    const url: string = apiSpy.get.calls.mostRecent().args[0] as string;
    expect(url).toContain('queryString=ABC');
    expect(url).toContain('paymentTypeId=CUSTOMER_PAYMENT');
    expect(url).toContain('paymentMethodTypeId=EFT_ACCOUNT');
    expect(url).toContain('statusId=PMNT_NOT_PAID');
    expect(url).toContain('paymentDate=2026-01-01');
  });

  it('should omit optional filters when not set in findPayments', () => {
    apiSpy.get.and.returnValue(of({ data: { resultList: [], totalCount: 0 } }));
    service.findPayments(1, 10, {}).subscribe();
    const url: string = apiSpy.get.calls.mostRecent().args[0] as string;
    expect(url).not.toContain('queryString=');
    expect(url).not.toContain('paymentTypeId=');
    expect(url).not.toContain('statusId=');
  });

  it('should normalise resultList and totalCount from response', () => {
    apiSpy.get.and.returnValue(of({ data: { resultList: [{ paymentId: 'P001' }], totalCount: 1 } }));
    service.findPayments(1, 10, {}).subscribe(res => {
      expect(res.resultList!).toHaveSize(1);
      expect(res.resultList![0].paymentId).toBe('P001');
      expect(res.totalCount).toBe(1);
    });
  });

  it('should return empty resultList when data is absent', () => {
    apiSpy.get.and.returnValue(of({}));
    service.findPayments(1, 10, {}).subscribe(res => {
      expect(res.resultList).toEqual([]);
      expect(res.totalCount).toBe(0);
    });
  });

  // ── getPaymentDetail ───────────────────────────────────────────────────

  it('should call getPaymentDetail with correct encoded id', () => {
    apiSpy.get.and.returnValue(of({ data: { paymentId: 'P001', amount: 100 } }));
    service.getPaymentDetail('P001').subscribe(res => {
      expect(res.paymentId).toBe('P001');
    });
    expect(apiSpy.get).toHaveBeenCalledWith('/common/accounting/payments/P001/detail');
  });

  it('should encode special characters in getPaymentDetail id', () => {
    apiSpy.get.and.returnValue(of({ data: {} }));
    service.getPaymentDetail('P 001').subscribe();
    expect(apiSpy.get).toHaveBeenCalledWith('/common/accounting/payments/P%20001/detail');
  });

  it('should emit error observable for blank getPaymentDetail id', (done) => {
    service.getPaymentDetail('').subscribe({
      error: (err) => {
        expect(err.message).toContain('required');
        done();
      },
    });
  });

  it('should emit error observable for whitespace-only getPaymentDetail id', (done) => {
    service.getPaymentDetail('   ').subscribe({
      error: (err) => {
        expect(err.message).toContain('required');
        done();
      },
    });
  });

  // ── changePaymentStatus ────────────────────────────────────────────────

  it('should post changePaymentStatus with statusId and optional refNum', () => {
    apiSpy.post.and.returnValue(of({ data: {} }));
    service.changePaymentStatus('P001', 'PMNT_VOID', 'REF-123').subscribe();
    expect(apiSpy.post).toHaveBeenCalledWith(
      '/common/accounting/payments/P001/status',
      { statusId: 'PMNT_VOID', paymentRefNum: 'REF-123' }
    );
  });

  it('should post changePaymentStatus without refNum when omitted', () => {
    apiSpy.post.and.returnValue(of({ data: {} }));
    service.changePaymentStatus('P002', 'PMNT_CANCELLED').subscribe();
    expect(apiSpy.post).toHaveBeenCalledWith(
      '/common/accounting/payments/P002/status',
      { statusId: 'PMNT_CANCELLED', paymentRefNum: undefined }
    );
  });

  // ── getPaymentTypes / getPaymentMethodTypes ────────────────────────────

  it('should call getPaymentTypes with correct URL', () => {
    apiSpy.get.and.returnValue(of({ data: { resultList: [{ paymentTypeId: 'CUSTOMER_PAYMENT' }] } }));
    service.getPaymentTypes().subscribe(res => {
      expect(res).toHaveSize(1);
      expect(res[0].paymentTypeId).toBe('CUSTOMER_PAYMENT');
    });
    expect(apiSpy.get).toHaveBeenCalledWith('/common/accounting/payment-types');
  });

  it('should call getPaymentMethodTypes with correct URL', () => {
    apiSpy.get.and.returnValue(of({ data: { resultList: [] } }));
    service.getPaymentMethodTypes().subscribe(res => {
      expect(Array.isArray(res)).toBeTrue();
    });
    expect(apiSpy.get).toHaveBeenCalledWith('/common/accounting/payment-method-types');
  });

  // ── listPayments / applyPaymentToInvoice ──────────────────────────────

  it('should call listPayments with correct URL', () => {
    apiSpy.get.and.returnValue(of({ data: { resultList: [] } }));
    service.listPayments().subscribe(res => {
      expect(Array.isArray(res)).toBeTrue();
    });
    expect(apiSpy.get).toHaveBeenCalledWith('/common/accounting/payments');
  });

  it('should post applyPaymentToInvoice with correct payload', () => {
    const payload = { paymentId: 'P001', invoiceId: 'INV001', amount: 200 };
    apiSpy.post.and.returnValue(of({ data: { success: true } }));
    service.applyPaymentToInvoice(payload).subscribe(res => {
      expect(res.success).toBeTrue();
    });
    expect(apiSpy.post).toHaveBeenCalledWith('/common/accounting/payments/apply', payload);
  });
});

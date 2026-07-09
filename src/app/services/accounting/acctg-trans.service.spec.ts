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
import { AcctgTransService } from './acctg-trans.service';
import { ApiService } from '../common/api.service';
import { of } from 'rxjs';

describe('AcctgTransService', () => {
  let service: AcctgTransService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'delete']);
    TestBed.configureTestingModule({
      providers: [
        AcctgTransService,
        { provide: ApiService, useValue: spy },
      ],
    });
    service = TestBed.inject(AcctgTransService);
    apiSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── listTransactions ────────────────────────────────────────────────────

  it('should call listTransactions with default page/size', () => {
    apiSpy.get.and.returnValue(of({ data: { resultList: [] } }));
    service.listTransactions().subscribe(res => {
      expect(Array.isArray(res)).toBeTrue();
    });
    expect(apiSpy.get).toHaveBeenCalledWith('/common/accounting/acctg-transes?page=0&size=500');
  });

  it('should call listTransactions with custom page/size', () => {
    apiSpy.get.and.returnValue(of({ data: { resultList: [{ acctgTransId: 'TX001' }] } }));
    service.listTransactions(1, 50).subscribe(res => {
      expect(res).toHaveSize(1);
      expect(res[0].acctgTransId).toBe('TX001');
    });
    expect(apiSpy.get).toHaveBeenCalledWith('/common/accounting/acctg-transes?page=1&size=50');
  });

  it('should return empty array when resultList is absent', () => {
    apiSpy.get.and.returnValue(of({ data: {} }));
    service.listTransactions().subscribe(res => {
      expect(res).toEqual([]);
    });
  });

  // ── searchTransactions ──────────────────────────────────────────────────

  it('should call searchTransactions with defaults only', () => {
    const mockPage = { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 };
    apiSpy.get.and.returnValue(of({ data: mockPage }));
    service.searchTransactions().subscribe(res => {
      expect(res.content).toEqual([]);
      expect(res.totalElements).toBe(0);
    });
    expect(apiSpy.get).toHaveBeenCalledWith('/common/accounting/acctg-transes/page?page=0&size=20');
  });

  it('should include query and posted params in searchTransactions URL', () => {
    apiSpy.get.and.returnValue(of({ data: { content: [], totalElements: 0, totalPages: 0, size: 10, number: 1 } }));
    service.searchTransactions({ page: 1, size: 10, query: 'PO-123', posted: true }).subscribe();
    const url: string = apiSpy.get.calls.mostRecent().args[0] as string;
    expect(url).toContain('page=1');
    expect(url).toContain('size=10');
    expect(url).toContain('query=PO-123');
    expect(url).toContain('posted=true');
  });

  it('should omit query/posted when not provided in searchTransactions', () => {
    apiSpy.get.and.returnValue(of({ data: { content: [], totalElements: 0 } }));
    service.searchTransactions({ page: 0, size: 5 }).subscribe();
    const url: string = apiSpy.get.calls.mostRecent().args[0] as string;
    expect(url).not.toContain('query=');
    expect(url).not.toContain('posted=');
  });

  it('should include posted=false when posted is false', () => {
    apiSpy.get.and.returnValue(of({ data: { content: [], totalElements: 0 } }));
    service.searchTransactions({ posted: false }).subscribe();
    const url: string = apiSpy.get.calls.mostRecent().args[0] as string;
    expect(url).toContain('posted=false');
  });

  // ── getTransaction ──────────────────────────────────────────────────────

  it('should call getTransaction with encoded numeric id', () => {
    const mockTx = { acctgTransId: 'TX001', id: 12345 };
    apiSpy.get.and.returnValue(of({ data: mockTx }));
    service.getTransaction(12345).subscribe(res => {
      expect(res.acctgTransId).toBe('TX001');
    });
    expect(apiSpy.get).toHaveBeenCalledWith('/common/accounting/acctg-transes/12345');
  });

  // ── createTransaction / updateTransaction ───────────────────────────────

  it('should post to createTransaction', () => {
    const payload = { description: 'Test TX', acctgTransTypeId: 'PAYMENT_ACCTG_TRANS' };
    apiSpy.post.and.returnValue(of({ data: payload }));
    service.createTransaction(payload).subscribe(res => {
      expect(res).toEqual(payload);
    });
    expect(apiSpy.post).toHaveBeenCalledWith('/common/accounting/acctg-transes', payload);
  });

  it('should put to updateTransaction with correct id', () => {
    const payload = { description: 'Updated TX' };
    apiSpy.put.and.returnValue(of({ data: payload }));
    service.updateTransaction(99, payload).subscribe(res => {
      expect(res).toEqual(payload);
    });
    expect(apiSpy.put).toHaveBeenCalledWith('/common/accounting/acctg-transes/99', payload);
  });

  it('should delete transaction with encoded id', () => {
    apiSpy['delete'].and.returnValue(of({}));
    service.deleteTransaction(42).subscribe();
    expect(apiSpy['delete']).toHaveBeenCalledWith('/common/accounting/acctg-transes/42');
  });

  // ── listEntries / listEntriesByTransactionIds ───────────────────────────

  it('should call listEntries with default page/size', () => {
    apiSpy.get.and.returnValue(of({ data: { resultList: [] } }));
    service.listEntries().subscribe(res => {
      expect(Array.isArray(res)).toBeTrue();
    });
    expect(apiSpy.get).toHaveBeenCalledWith('/common/accounting/acctg-trans-entrys?page=0&size=500');
  });

  it('should build listEntriesByTransactionIds URL with multiple ids', () => {
    apiSpy.get.and.returnValue(of({ data: { resultList: [] } }));
    service.listEntriesByTransactionIds(['TX001', 'TX002']).subscribe();
    const url: string = apiSpy.get.calls.mostRecent().args[0] as string;
    expect(url).toContain('transactionIds=TX001');
    expect(url).toContain('transactionIds=TX002');
  });
});

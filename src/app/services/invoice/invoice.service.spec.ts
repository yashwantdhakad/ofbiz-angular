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
import { of } from 'rxjs';
import { ApiService } from '../common/api.service';
import { InvoiceService } from './invoice.service';

describe('InvoiceService', () => {
    let apiService: jasmine.SpyObj<ApiService>;
    let service: InvoiceService;

    beforeEach(() => {
        apiService = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'delete']);
        service = new InvoiceService(apiService);
    });

    it('loads invoice list and builds invoice search query strings', () => {
        apiService.get.and.returnValue(of([] as any));

        service.listInvoices().subscribe();
        service.findInvoices('sales', 2, 25, 'INV/1', 'INVOICE_PAID').subscribe();
        service.findInvoices('purchase', 0, 10, '').subscribe();

        expect(apiService.get).toHaveBeenCalledWith('/common/accounting/invoices');
        expect(apiService.get).toHaveBeenCalledWith(
            '/common/accounting/invoices/find?mode=sales&page=1&size=25&queryString=INV%2F1&statusId=INVOICE_PAID'
        );
        expect(apiService.get).toHaveBeenCalledWith('/common/accounting/invoices/find?mode=purchase&page=0&size=10');
    });

    it('loads detail and pdf using encoded ids', () => {
        apiService.get.and.returnValue(of({} as any));
        

        service.getInvoiceDetail(12).subscribe();
        service.getInvoicePdf(12).subscribe();

        expect(apiService.get).toHaveBeenCalledWith('/common/accounting/invoices/12/detail');
        expect(apiService.get).toHaveBeenCalledWith('/common/accounting/invoices/12/pdf');
    });

    it('posts status and payment operations and deletes payment applications', () => {
        apiService.post.and.returnValue(of({} as any));
        apiService.delete.and.returnValue(of({} as any));

        service.changeInvoiceStatus(12, 'INVOICE_PAID', 'admin').subscribe();
        service.applyPayment(12, { paymentId: 'PAY-1', amount: 50 }).subscribe();
        service.removePaymentApplication(12, 'PAY/APP-1').subscribe();

        expect(apiService.post).toHaveBeenCalledWith('/common/accounting/invoices/12/status', {
            statusId: 'INVOICE_PAID',
            changeByUserLoginId: 'admin',
        });
        expect(apiService.post).toHaveBeenCalledWith('/common/accounting/invoices/12/payments/apply', {
            paymentId: 'PAY-1',
            amount: 50,
        });
        expect(apiService.delete).toHaveBeenCalledWith('/common/accounting/invoices/12/payments/PAY%2FAPP-1');
    });
});

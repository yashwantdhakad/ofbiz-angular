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
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ShipmentService } from './shipment.service';
import { ApiService } from '../common/api.service';
import { HttpResponse, provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';

describe('ShipmentService', () => {
  let service: ShipmentService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', [
      'get',
      'post',
      'put',
      'delete',
      'getOmsBlobResponse',
    ]);

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        ShipmentService,
        { provide: ApiService, useValue: spy }
      ]
    });

    service = TestBed.inject(ShipmentService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch shipments', (done) => {
    const pageIndex = 0;
    const keyword = 'test';
    const expectedUrl = `/common/shipments?page=${pageIndex}&size=10&queryString=${keyword}`;
    const mockResponse = { data: { resultList: ['SHP001'], totalCount: 1 } };

    apiServiceSpy.get.and.returnValue(of(mockResponse));

    service.getShipments(pageIndex, keyword).subscribe((res: any) => {
      expect(res.resultList).toEqual(['SHP001']);
      expect(apiServiceSpy.get).toHaveBeenCalledWith(expectedUrl);
      done();
    });
  });

  it('should fetch single shipment', (done) => {
    const shipmentId = 'SHP001';
    const mockResponse = { shipment: { shipmentId: 'SHP001', statusId: 'DELIVERED' } };
    const expectedUrl = `/common/shipments/${shipmentId}`;

    apiServiceSpy.get.and.returnValue(of(mockResponse));

    service.getShipment(shipmentId).subscribe((res) => {
      expect(res).toEqual(mockResponse);
      expect(apiServiceSpy.get).toHaveBeenCalledWith(expectedUrl);
      done();
    });
  });

  it('should fetch single shipment with receipts', (done) => {
    const shipmentId = 'SHP001';
    const mockResponse = { shipmentId: 'SHP001', receipts: [] };
    const expectedUrl = `/common/shipments/${shipmentId}?includeReceipts=true`;

    apiServiceSpy.get.and.returnValue(of(mockResponse));

    service.getShipment(shipmentId, true).subscribe((res) => {
      expect(res).toEqual(mockResponse);
      expect(apiServiceSpy.get).toHaveBeenCalledWith(expectedUrl);
      done();
    });
  });

  it('should create a shipment', (done) => {
    const payload = { shipment: { shipmentTypeId: 'SALES_SHIPMENT', statusId: 'SHIPMENT_INPUT' } };
    const mockResponse = { shipment: { shipmentId: 'SHP001' } };
    const expectedUrl = '/common/shipments';

    apiServiceSpy.post.and.returnValue(of(mockResponse));

    service.createShipment(payload).subscribe((res) => {
      expect(res).toEqual(mockResponse);
      expect(apiServiceSpy.post).toHaveBeenCalledWith(expectedUrl, payload);
      done();
    });
  });

  it('covers shipment detail, package, status, and ship mutations', (done) => {
    apiServiceSpy.get.and.returnValues(
      of({ shipmentId: 'SHP001', orderId: 'SO-1' }),
      of({ data: { resultList: ['BOX'] } }),
    );
    apiServiceSpy.post.and.returnValues(
      of({ packageSeqId: '0001' }),
      of({ statusId: 'SHIPMENT_PACKED' }),
      of({ statusId: 'SHIPMENT_SHIPPED' }),
      of({ ok: true }),
    );

    service.getSalesShipmentDetail('SHP001').subscribe((res) => {
      expect(res).toEqual({ shipmentId: 'SHP001', orderId: 'SO-1' });
      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/shipments/SHP001/sales-detail');
    });

    service.addShipmentPackage('SHP001', { boxTypeId: 'BOX' }).subscribe((res) => {
      expect(res).toEqual({ packageSeqId: '0001' });
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/shipments/SHP001/packages', { boxTypeId: 'BOX' });
    });

    service.updateShipmentStatus('SHP001', 'SHIPMENT_PACKED').subscribe((res) => {
      expect(res).toEqual({ statusId: 'SHIPMENT_PACKED' });
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/shipments/SHP001/status', { statusId: 'SHIPMENT_PACKED' });
    });

    service.shipShipment('SHP001').subscribe((res) => {
      expect(res).toEqual({ statusId: 'SHIPMENT_SHIPPED' });
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/shipments/SHP001/ship', {});
    });

    service.generateCarrierLabels('SHP001', { packageIds: ['0001'] }).subscribe((res) => {
      expect(res).toEqual({ ok: true });
      expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/shipments/SHP001/carrier/labels', { packageIds: ['0001'] });
    });

    service.getShipmentBoxTypes().subscribe((res) => {
      expect(res).toEqual(['BOX']);
      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/shipment-box-types');
      done();
    });
  });

  it('covers delete and pdf endpoints', (done) => {
    const blob = new Blob(['pdf']);
    const response = new HttpResponse({ body: blob });
    const htmlContent = '<html>packing</html>';
    apiServiceSpy.delete.and.returnValue(of({ ok: true }));
    apiServiceSpy.get.and.returnValue(of({ data: { htmlContent } }));
    apiServiceSpy.getOmsBlobResponse.and.returnValue(of(response));

    service.deleteShipmentPackage('SHP001', '0001').subscribe((res) => {
      expect(res).toEqual({ ok: true });
      expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/shipments/SHP001/packages/0001');
    });

    service.getPackingSlipPdf('SHP001').subscribe((res) => {
      expect(res).toBe(htmlContent);
      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/shipments/SHP001/packing-slip/pdf');
    });

    service.getShippingLabelPdf('SHP001').subscribe((res) => {
      expect(res).toBe(htmlContent);
      expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/shipments/SHP001/shipping-label/pdf');
    });

    service.printShippingLabel('SHP001').subscribe((res) => {
      expect(res).toBe(response);
      expect(apiServiceSpy.getOmsBlobResponse).toHaveBeenCalledWith('/common/shipments/SHP001/shipping-label/print');
      done();
    });
  });
});

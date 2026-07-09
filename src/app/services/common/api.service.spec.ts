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
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpResponse, HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { ApiConfigService } from './api-config.service';
import { environment } from 'src/environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),ApiService, ApiConfigService]
    });
    service = TestBed.inject(ApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should perform GET request', () => {
    const testData = { name: 'Test Data' };

    service.get('/test-endpoint').subscribe(data => {
      expect(data).toEqual(testData);
    });

    const req = httpTestingController.expectOne(environment.apiUrl + '/test-endpoint');
    expect(req.request.method).toEqual('GET');
    req.flush(testData);
  });

  it('should leave authorization and tenant headers to the HTTP interceptor', () => {
    service.get('/test-endpoint').subscribe();

    const req = httpTestingController.expectOne(environment.apiUrl + '/test-endpoint');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    expect(req.request.headers.has('X-Tenant-Id')).toBeFalse();
    req.flush({});
  });

  it('should handle error', () => {
    const errorMessage = 'test 404 error';

    service.get('/test-endpoint').subscribe({
      next: () => fail('expected an error, not data'),
      error: (error) => expect(error.message).toContain('404'),
    });

    const req = httpTestingController.expectOne(environment.apiUrl + '/test-endpoint');

    req.flush(errorMessage, { status: 404, statusText: 'Not Found' });
  });

  it('should support blob, response, mutation, and scoped helper methods', () => {
    service.getBlob('/blob-endpoint').subscribe((blob) => {
      expect(blob).toEqual(jasmine.any(Blob));
    });
    service.getBlobResponse('/blob-response-endpoint').subscribe((response) => {
      expect(response).toEqual(jasmine.any(HttpResponse));
      expect(response.body).toEqual(jasmine.any(Blob));
    });
    service.customGet('/custom-endpoint').subscribe((response) => {
      expect(response.status).toBe(200);
    });
    service.post('/post-endpoint', { id: 1 }).subscribe();
    service.put('/put-endpoint', { id: 2 }).subscribe();
    service.patch('/patch-endpoint', { id: 3 }).subscribe();
    service.delete('/delete-endpoint').subscribe();
    service.postFormData('/upload-endpoint', new FormData()).subscribe();

    service.getWms('/shipments').subscribe();
    service.getWmsBlob('/shipments/file').subscribe();
    service.getWmsBlobResponse('/shipments/file-response').subscribe();
    service.customGetWms('/shipments/custom').subscribe();
    service.postWms('/shipments', { shipmentId: 'S1' }).subscribe();
    service.putWms('/shipments/S1', { statusId: 'SHIPMENT_INPUT' }).subscribe();
    service.patchWms('/shipments/S1', { statusId: 'SHIPMENT_PACKED' }).subscribe();
    service.deleteWms('/shipments/S1').subscribe();
    service.postWmsFormData('/shipments/upload', new FormData()).subscribe();

    service.getOms('/orders').subscribe();
    service.getOmsBlob('/orders/file').subscribe();
    service.getOmsBlobResponse('/orders/file-response').subscribe();
    service.customGetOms('/orders/custom').subscribe();
    service.postOms('/orders', { orderId: 'O1' }).subscribe();
    service.putOms('/orders/O1', { statusId: 'ORDER_CREATED' }).subscribe();
    service.patchOms('/orders/O1', { statusId: 'ORDER_APPROVED' }).subscribe();
    service.deleteOms('/orders/O1').subscribe();
    service.postOmsFormData('/orders/upload', new FormData()).subscribe();

    const reqs = httpTestingController.match(() => true);
    const urls = reqs.map((req) => req.request.url);
    expect(urls).toContain(`${environment.apiUrl}/blob-endpoint`);
    expect(urls).toContain(`${environment.apiUrl}/wms/api/shipments`);
    expect(urls).toContain(`${environment.apiUrl}/oms/api/orders`);
    expect(reqs.find((req) => req.request.url.endsWith('/post-endpoint'))?.request.method).toBe('POST');
    expect(reqs.find((req) => req.request.url.endsWith('/put-endpoint'))?.request.method).toBe('PUT');
    expect(reqs.find((req) => req.request.url.endsWith('/patch-endpoint'))?.request.method).toBe('PATCH');
    expect(reqs.find((req) => req.request.url.endsWith('/delete-endpoint'))?.request.method).toBe('DELETE');

    reqs.forEach((req) => {
      const request = req.request as any;
      if (request.responseType === 'blob' && request.observe === 'response') {
        req.flush(new Blob(['file']), { status: 200, statusText: 'OK' });
      } else if (request.responseType === 'blob') {
        req.flush(new Blob(['file']));
      } else if (request.observe === 'response') {
        req.flush({}, { status: 200, statusText: 'OK' });
      } else {
        req.flush({});
      }
    });
  });

  describe('extractErrorMessage', () => {
    it('should return fallback if error is null or undefined', () => {
      expect(ApiService.extractErrorMessage(null)).toBe('An unexpected error occurred');
      expect(ApiService.extractErrorMessage(undefined, 'Fallback')).toBe('Fallback');
    });

    it('should extract error message from HttpErrorResponse string body', () => {
      const err = new HttpErrorResponse({
        error: 'Plain string error',
        status: 400,
        statusText: 'Bad Request',
      });
      expect(ApiService.extractErrorMessage(err)).toBe('Plain string error');
    });

    it('should extract error message from HttpErrorResponse object body containing errorMessage', () => {
      const err = new HttpErrorResponse({
        error: { errorMessage: 'OFBiz Error Message' },
        status: 500,
      });
      expect(ApiService.extractErrorMessage(err)).toBe('OFBiz Error Message');
    });

    it('should extract error message from HttpErrorResponse object body containing data._ERROR_MESSAGE_', () => {
      const err = new HttpErrorResponse({
        error: { data: { _ERROR_MESSAGE_: 'Nested Error message' } },
        status: 500,
      });
      expect(ApiService.extractErrorMessage(err)).toBe('Nested Error message');
    });

    it('should extract error message from HttpErrorResponse object body containing _ERROR_MESSAGE_', () => {
      const err = new HttpErrorResponse({
        error: { _ERROR_MESSAGE_: 'Flat Error message' },
        status: 500,
      });
      expect(ApiService.extractErrorMessage(err)).toBe('Flat Error message');
    });

    it('should extract error message from HttpErrorResponse object body containing message', () => {
      const err = new HttpErrorResponse({
        error: { message: 'Simple message' },
        status: 500,
      });
      expect(ApiService.extractErrorMessage(err)).toBe('Simple message');
    });

    it('should fall back to error.message if body does not match any known field', () => {
      const err = new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
      });
      expect(ApiService.extractErrorMessage(err)).toContain('404 Not Found');
    });

    it('should return message from Error objects', () => {
      const err = new Error('Standard JS Error');
      expect(ApiService.extractErrorMessage(err)).toBe('Standard JS Error');
    });

    it('should return fallback for unknown error types', () => {
      expect(ApiService.extractErrorMessage({ random: 'object' })).toBe('An unexpected error occurred');
    });
  });

  describe('normalizeScopedEndpoint', () => {
    it('should return scopePrefix if endpoint is falsy', () => {
      expect((service as any).normalizeScopedEndpoint('', '/wms/api')).toBe('/wms/api');
      expect((service as any).normalizeScopedEndpoint(null, '/oms/api')).toBe('/oms/api');
    });

    it('should return endpoint as-is if it already starts with common, wms, oms, or api prefixes', () => {
      expect((service as any).normalizeScopedEndpoint('/common/status', '/wms/api')).toBe('/common/status');
      expect((service as any).normalizeScopedEndpoint('/oms/api/orders', '/wms/api')).toBe('/oms/api/orders');
      expect((service as any).normalizeScopedEndpoint('/wms/api/shipments', '/wms/api')).toBe('/wms/api/shipments');
      expect((service as any).normalizeScopedEndpoint('/api/v1/users', '/wms/api')).toBe('/api/v1/users');
    });

    it('should prefix endpoint with scopePrefix if it is a simple relative path', () => {
      expect((service as any).normalizeScopedEndpoint('/status', '/wms/api')).toBe('/wms/api/status');
    });
  });
});

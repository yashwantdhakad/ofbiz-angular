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
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private static readonly OMS_API_PREFIX = '/oms/api';
  private static readonly WMS_API_PREFIX = '/wms/api';

  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfigService
  ) {}

  getLookup<T>(lookupName: string, typeId?: string): Observable<T[]> {
    const query = typeId ? `?typeId=${encodeURIComponent(typeId)}` : '';
    return this.get<{ data?: { values?: T[] } }>(
      `/common/lookups/${encodeURIComponent(lookupName)}${query}`
    ).pipe(map((response) => response?.data?.values ?? []));
  }

  private getHeaders(contentType?: string): HttpHeaders {
    let headers = new HttpHeaders();

    if (contentType) {
      headers = headers.set('Content-Type', contentType);
    }

    return headers;
  }


  /**
   * Extracts a human-readable message from an OFBiz error response.
   * OFBiz returns service errors as HTTP 500 with body: { errorMessage: "..." }
   * or nested as: { data: { _ERROR_MESSAGE_: "..." } }
   */
  static extractErrorMessage(error: HttpErrorResponse | unknown, fallback = 'An unexpected error occurred'): string {
    if (!error) return fallback;
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (typeof body === 'string') return body || fallback;
      if (body?.errorMessage) return body.errorMessage;
      if (body?.data?._ERROR_MESSAGE_) return body.data._ERROR_MESSAGE_;
      if (body?._ERROR_MESSAGE_) return body._ERROR_MESSAGE_;
      if (body?.message) return body.message;
      if (error.message) return error.message;
    }
    if (error instanceof Error) return error.message;
    return fallback;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }

  private normalizeScopedEndpoint(endpoint: string, scopePrefix: string): string {
    if (!endpoint) {
      return scopePrefix;
    }

    if (
      endpoint.startsWith('/common/') ||
      endpoint.startsWith(ApiService.OMS_API_PREFIX) ||
      endpoint.startsWith(ApiService.WMS_API_PREFIX) ||
      endpoint.startsWith('/api/')
    ) {
      return endpoint;
    }

    return endpoint.startsWith('/')
      ? `${scopePrefix}${endpoint}`
      : `${scopePrefix}/${endpoint}`;
  }

  get<T>(endpoint: string, baseUrl?: string): Observable<T> {
    const url = this.apiConfig.buildUrl(endpoint, baseUrl);
    return this.http.get<T>(url, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getBlob(endpoint: string, baseUrl?: string): Observable<Blob> {
    const url = this.apiConfig.buildUrl(endpoint, baseUrl);
    return this.http.get(url, { headers: this.getHeaders(), responseType: 'blob' }).pipe(
      catchError(this.handleError)
    );
  }

  getBlobResponse(endpoint: string, baseUrl?: string): Observable<HttpResponse<Blob>> {
    const url = this.apiConfig.buildUrl(endpoint, baseUrl);
    return this.http.get(url, {
      headers: this.getHeaders(),
      responseType: 'blob',
      observe: 'response',
    }).pipe(
      catchError(this.handleError)
    );
  }

  customGet<T>(endpoint: string, baseUrl?: string): Observable<HttpResponse<T>> {
    const url = this.apiConfig.buildUrl(endpoint, baseUrl);
    return this.http.get<T>(url, { headers: this.getHeaders(), observe: 'response' }).pipe(
      catchError(this.handleError)
    );
  }

  post<T>(endpoint: string, body: any, baseUrl?: string): Observable<T> {
    const url = this.apiConfig.buildUrl(endpoint, baseUrl);
    const normalizedBody = this.normalizePayload(body);
    return this.http.post<T>(url, normalizedBody, { headers: this.getHeaders('application/json') }).pipe(
      catchError(this.handleError)
    );
  }

  put<T>(endpoint: string, body: any, baseUrl?: string): Observable<T> {
    const url = this.apiConfig.buildUrl(endpoint, baseUrl);
    const normalizedBody = this.normalizePayload(body);
    return this.http.put<T>(url, normalizedBody, { headers: this.getHeaders('application/json') }).pipe(
      catchError(this.handleError)
    );
  }

  delete<T>(endpoint: string, baseUrl?: string): Observable<T> {
    const url = this.apiConfig.buildUrl(endpoint, baseUrl);
    return this.http.delete<T>(url, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  patch<T>(endpoint: string, data: any, baseUrl?: string): Observable<T> {
    const url = this.apiConfig.buildUrl(endpoint, baseUrl);
    const normalizedData = this.normalizePayload(data);
    return this.http.patch<T>(url, normalizedData, { headers: this.getHeaders('application/json') }).pipe(
      catchError(this.handleError)
    );
  }

  private static readonly ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;

  private normalizePayload(body: any): any {
    if (body === null || body === undefined) {
      return body;
    }
    if (body instanceof Date) {
      return this.formatTimestamp(body);
    }
    if (Array.isArray(body)) {
      return body.map((item) => this.normalizePayload(item));
    }
    if (typeof body === 'object') {
      const copy: any = {};
      for (const key of Object.keys(body)) {
        copy[key] = this.normalizeValue(body[key]);
      }
      return copy;
    }
    return body;
  }

  private normalizeValue(val: any): any {
    if (typeof val === 'string' && ApiService.ISO_TIMESTAMP_PATTERN.test(val)) {
      return this.normalizeTimestampString(val);
    }
    return this.normalizePayload(val);
  }

  private normalizeTimestampString(val: string): string {
    try {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        return this.formatTimestamp(date);
      }
    } catch {
      // Keep the original value when it cannot be parsed as a timestamp.
    }
    return val;
  }

  private formatTimestamp(date: Date): string {
    const pad = (n: number, width: number = 2) => String(n).padStart(width, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  }

  postFormData<T>(endpoint: string, formData: FormData, baseUrl?: string): Observable<T> {
    const url = this.apiConfig.buildUrl(endpoint, baseUrl);
    return this.http.post<T>(url, formData, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getWms<T>(endpoint: string): Observable<T> {
    return this.get<T>(
      this.normalizeScopedEndpoint(endpoint, ApiService.WMS_API_PREFIX),
      this.apiConfig.baseUrl
    );
  }

  getWmsBlob(endpoint: string): Observable<Blob> {
    return this.getBlob(
      this.normalizeScopedEndpoint(endpoint, ApiService.WMS_API_PREFIX),
      this.apiConfig.baseUrl
    );
  }

  getWmsBlobResponse(endpoint: string): Observable<HttpResponse<Blob>> {
    return this.getBlobResponse(
      this.normalizeScopedEndpoint(endpoint, ApiService.WMS_API_PREFIX),
      this.apiConfig.baseUrl
    );
  }

  customGetWms<T>(endpoint: string): Observable<HttpResponse<T>> {
    return this.customGet<T>(
      this.normalizeScopedEndpoint(endpoint, ApiService.WMS_API_PREFIX),
      this.apiConfig.baseUrl
    );
  }

  postWms<T>(endpoint: string, body: any): Observable<T> {
    return this.post<T>(
      this.normalizeScopedEndpoint(endpoint, ApiService.WMS_API_PREFIX),
      body,
      this.apiConfig.baseUrl
    );
  }

  putWms<T>(endpoint: string, body: any): Observable<T> {
    return this.put<T>(
      this.normalizeScopedEndpoint(endpoint, ApiService.WMS_API_PREFIX),
      body,
      this.apiConfig.baseUrl
    );
  }

  deleteWms<T>(endpoint: string): Observable<T> {
    return this.delete<T>(
      this.normalizeScopedEndpoint(endpoint, ApiService.WMS_API_PREFIX),
      this.apiConfig.baseUrl
    );
  }

  patchWms<T>(endpoint: string, data: any): Observable<T> {
    return this.patch<T>(
      this.normalizeScopedEndpoint(endpoint, ApiService.WMS_API_PREFIX),
      data,
      this.apiConfig.baseUrl
    );
  }

  postWmsFormData<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.postFormData<T>(
      this.normalizeScopedEndpoint(endpoint, ApiService.WMS_API_PREFIX),
      formData,
      this.apiConfig.baseUrl
    );
  }

  getOms<T>(endpoint: string): Observable<T> {
    return this.get<T>(
      this.normalizeScopedEndpoint(endpoint, ApiService.OMS_API_PREFIX),
      this.apiConfig.baseUrl
    );
  }

  getOmsBlob(endpoint: string): Observable<Blob> {
    return this.getBlob(
      this.normalizeScopedEndpoint(endpoint, ApiService.OMS_API_PREFIX),
      this.apiConfig.baseUrl
    );
  }

  getOmsBlobResponse(endpoint: string): Observable<HttpResponse<Blob>> {
    return this.getBlobResponse(
      this.normalizeScopedEndpoint(endpoint, ApiService.OMS_API_PREFIX),
      this.apiConfig.baseUrl
    );
  }

  customGetOms<T>(endpoint: string): Observable<HttpResponse<T>> {
    return this.customGet<T>(
      this.normalizeScopedEndpoint(endpoint, ApiService.OMS_API_PREFIX),
      this.apiConfig.baseUrl
    );
  }

  postOms<T>(endpoint: string, body: any): Observable<T> {
    return this.post<T>(
      this.normalizeScopedEndpoint(endpoint, ApiService.OMS_API_PREFIX),
      body,
      this.apiConfig.baseUrl
    );
  }

  putOms<T>(endpoint: string, body: any): Observable<T> {
    return this.put<T>(
      this.normalizeScopedEndpoint(endpoint, ApiService.OMS_API_PREFIX),
      body,
      this.apiConfig.baseUrl
    );
  }

  deleteOms<T>(endpoint: string): Observable<T> {
    return this.delete<T>(
      this.normalizeScopedEndpoint(endpoint, ApiService.OMS_API_PREFIX),
      this.apiConfig.baseUrl
    );
  }

  patchOms<T>(endpoint: string, data: any): Observable<T> {
    return this.patch<T>(
      this.normalizeScopedEndpoint(endpoint, ApiService.OMS_API_PREFIX),
      data,
      this.apiConfig.baseUrl
    );
  }

  postOmsFormData<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.postFormData<T>(
      this.normalizeScopedEndpoint(endpoint, ApiService.OMS_API_PREFIX),
      formData,
      this.apiConfig.baseUrl
    );
  }
}

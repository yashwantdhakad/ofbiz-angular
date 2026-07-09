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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../common/api.service';

@Injectable({
    providedIn: 'root',
})
export class ProductFacilityService {
    private readonly facilitiesPath = '/common/product-facilities';
    private readonly locationsPath = '/common/product-facility-locations';

    constructor(private apiService: ApiService) { }

    // Product Facility Methods
    getProductFacilities(productId: string): Observable<any> {
        return this.apiService.get<any>(`${this.facilitiesPath}?productId=${encodeURIComponent(productId)}`).pipe(
            map((response: any) => Array.isArray(response?.data?.resultList) ? response.data.resultList : [])
        );
    }

    createProductFacility(data: any): Observable<any> {
        return this.apiService.post<any>(this.facilitiesPath, data).pipe(
            map((response: any) => response?.data ?? response)
        );
    }

    updateProductFacility(id: number | string, data: any): Observable<any> {
        return this.apiService.put<any>(`${this.facilitiesPath}/${id}`, data).pipe(
            map((response: any) => response?.data ?? response)
        );
    }

    deleteProductFacility(id: number | string): Observable<any> {
        return this.apiService.delete<any>(`${this.facilitiesPath}/${id}`).pipe(
            map((response: any) => response?.data ?? response)
        );
    }

    // Product Facility Location Methods
    getProductFacilityLocations(
        productId: string,
        facilityId?: string
    ): Observable<any> {
        let url = `${this.locationsPath}?productId=${encodeURIComponent(productId)}`;
        if (facilityId) {
            url += `&facilityId=${encodeURIComponent(facilityId)}`;
        }
        return this.apiService.get<any>(url).pipe(
            map((response: any) => Array.isArray(response?.data?.resultList) ? response.data.resultList : [])
        );
    }

    createProductFacilityLocation(data: any): Observable<any> {
        return this.apiService.post<any>(this.locationsPath, data).pipe(
            map((response: any) => response?.data ?? response)
        );
    }

    updateProductFacilityLocation(id: number | string, data: any): Observable<any> {
        return this.apiService.put<any>(`${this.locationsPath}/${id}`, data).pipe(
            map((response: any) => response?.data ?? response)
        );
    }

    deleteProductFacilityLocation(id: number | string): Observable<any> {
        return this.apiService.delete<any>(`${this.locationsPath}/${id}`).pipe(
            map((response: any) => response?.data ?? response)
        );
    }
}

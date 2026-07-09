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
import { ProductFacilityService } from './product-facility.service';

describe('ProductFacilityService', () => {
    let apiService: jasmine.SpyObj<ApiService>;
    let service: ProductFacilityService;

    beforeEach(() => {
        apiService = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'put', 'delete']);
        service = new ProductFacilityService(apiService);
    });

    it('builds product facility collection endpoints', () => {
        apiService.get.and.returnValue(of([] as any));
        apiService.post.and.returnValue(of({} as any));
        apiService.put.and.returnValue(of({} as any));
        apiService.delete.and.returnValue(of({} as any));

        service.getProductFacilities('PROD-1').subscribe();
        service.createProductFacility({ productId: 'PROD-1', facilityId: 'FAC-1' }).subscribe();
        service.updateProductFacility(42, { facilityId: 'FAC-2' }).subscribe();
        service.deleteProductFacility(42).subscribe();

        expect(apiService.get).toHaveBeenCalledWith('/common/product-facilities?productId=PROD-1');
        expect(apiService.post).toHaveBeenCalledWith('/common/product-facilities', {
            productId: 'PROD-1',
            facilityId: 'FAC-1',
        });
        expect(apiService.put).toHaveBeenCalledWith('/common/product-facilities/42', { facilityId: 'FAC-2' });
        expect(apiService.delete).toHaveBeenCalledWith('/common/product-facilities/42');
    });

    it('builds facility location endpoints with and without facility filters', () => {
        apiService.get.and.returnValue(of([] as any));
        apiService.post.and.returnValue(of({} as any));
        apiService.put.and.returnValue(of({} as any));
        apiService.delete.and.returnValue(of({} as any));

        service.getProductFacilityLocations('PROD-1').subscribe();
        service.getProductFacilityLocations('PROD-1', 'FAC-1').subscribe();
        service.createProductFacilityLocation({ productId: 'PROD-1', facilityId: 'FAC-1', locationSeqId: 'A1' }).subscribe();
        service.updateProductFacilityLocation(9, { locationSeqId: 'B1' }).subscribe();
        service.deleteProductFacilityLocation(9).subscribe();

        expect(apiService.get).toHaveBeenCalledWith('/common/product-facility-locations?productId=PROD-1');
        expect(apiService.get).toHaveBeenCalledWith('/common/product-facility-locations?productId=PROD-1&facilityId=FAC-1');
        expect(apiService.post).toHaveBeenCalledWith('/common/product-facility-locations', {
            productId: 'PROD-1',
            facilityId: 'FAC-1',
            locationSeqId: 'A1',
        });
        expect(apiService.put).toHaveBeenCalledWith('/common/product-facility-locations/9', { locationSeqId: 'B1' });
        expect(apiService.delete).toHaveBeenCalledWith('/common/product-facility-locations/9');
    });
});

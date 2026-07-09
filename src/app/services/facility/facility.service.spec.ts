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
import { FacilityService } from './facility.service';
import { ApiService } from '../common/api.service';
import { of } from 'rxjs';
import { PreferredFacilityService } from '../common/preferred-facility.service';

describe('FacilityService', () => {
  let service: FacilityService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let preferredFacilityServiceSpy: jasmine.SpyObj<PreferredFacilityService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put']);
    preferredFacilityServiceSpy = jasmine.createSpyObj<PreferredFacilityService>('PreferredFacilityService', ['sortFacilities']);
    preferredFacilityServiceSpy.sortFacilities.and.callFake((items: any) => items);

    TestBed.configureTestingModule({
      providers: [
        FacilityService,
        { provide: ApiService, useValue: spy },
        { provide: PreferredFacilityService, useValue: preferredFacilityServiceSpy },
      ],
    });

    service = TestBed.inject(FacilityService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call getFacilities with correct URL', () => {
    const mockResponse = [{ facilityId: 'FAC01' }];
    apiServiceSpy.get.and.returnValue(of(mockResponse));

    service.getFacilities().subscribe(res => {
      expect(res).toEqual([
        { facilityId: 'FAC01', label: 'FAC01' }
      ]);
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/facilities');
    expect(preferredFacilityServiceSpy.sortFacilities).toHaveBeenCalledWith([
      { facilityId: 'FAC01', label: 'FAC01' }
    ]);
  });

  it('should call getFacility with correct URL', () => {
    const mockDetail = { facility: { facilityId: 'FAC01' } };
    apiServiceSpy.get.and.returnValue(of(mockDetail));

    service.getFacility('FAC01').subscribe(res => {
      expect(res).toEqual(mockDetail);
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/facilities/FAC01?includeLocations=true');
  });

  it('should call getFacilityTypes with correct URL', () => {
    const mockTypes = [{ facilityTypeId: 'PLANT' }];
    apiServiceSpy.get.and.returnValue(of({ data: { resultList: mockTypes } }));

    service.getFacilityTypes().subscribe(res => {
      expect(res).toEqual(mockTypes);
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/facility-types');
  });

  it('should call createFacility with correct URL', () => {
    const payload = { facilityId: 'FAC02', facilityName: 'Test' };
    apiServiceSpy.post.and.returnValue(of(payload));

    service.createFacility(payload).subscribe(res => {
      expect(res).toEqual(payload);
    });

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/facilities', payload);
  });

  it('should call createFacilityLocation with correct URL', () => {
    const payload = { facilityId: 'FAC02', locationSeqId: '00001' };
    apiServiceSpy.post.and.returnValue(of(payload));

    service.createFacilityLocation(payload).subscribe(res => {
      expect(res).toEqual(payload);
    });

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/facility-locations', payload);
  });

  it('should call updateFacilityLocation with correct URL', () => {
    const payload = { id: 1, facilityId: 'FAC02', locationSeqId: '00001' };
    apiServiceSpy.put.and.returnValue(of(payload));

    service.updateFacilityLocation(1, payload).subscribe(res => {
      expect(res).toEqual(payload);
    });

    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/facility-locations/1', payload);
  });

  it('should call updateFacility with encoded id', () => {
    const payload = { facilityId: 'FAC 02', facilityName: 'Updated' };
    apiServiceSpy.put.and.returnValue(of(payload));

    service.updateFacility('FAC 02', payload).subscribe((res) => {
      expect(res).toEqual(payload);
    });

    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/facilities/FAC%2002', payload);
  });

  it('should build facility location queries with optional filters', () => {
    apiServiceSpy.get.and.returnValue(of({ data: { resultList: [{ locationSeqId: '00001' }], totalCount: 1 } }));

    service.getFacilityLocations('FAC 02', 1, 25, '00001', 'Dock A').subscribe((res) => {
      expect(res.content?.length).toBe(1);
      expect(res.totalElements).toBe(1);
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith(
      '/common/facility-locations/by-facility/FAC%2002?page=1&size=25&locationSeqId=00001&locationName=Dock+A'
    );
  });

  it('should build facility location queries without optional filters', () => {
    apiServiceSpy.get.and.returnValue(of({ data: { resultList: [], totalCount: 0 } }));

    service.getFacilityLocations('FAC01', 0, 10).subscribe((res) => {
      expect(res.content ?? []).toEqual([]);
      expect(res.totalElements).toBe(0);
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/facility-locations/by-facility/FAC01?page=0&size=10');
  });

  it('should load facility contact mechanisms and purposes with encoded ids', () => {
    apiServiceSpy.get.and.returnValues(of([{ id: 1 }]), of([{ id: 2 }]));

    service.getFacilityContactMechs('FAC 02').subscribe((res) => {
      expect(res).toEqual([{ id: 1 }]);
    });
    service.getFacilityContactMechPurposes('FAC 02').subscribe((res) => {
      expect(res).toEqual([{ id: 2 }]);
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/facility-contact-mechs/by-facility/FAC%2002');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/facility-contact-mech-purposes/by-facility/FAC%2002');
  });

  it('should update the facility address with encoded id', () => {
    const payload = { address1: 'Line 1', city: 'Kolkata' };
    apiServiceSpy.put.and.returnValue(of(payload));

    service.updateFacilityAddress('FAC 02', payload).subscribe((res) => {
      expect(res).toEqual(payload);
    });

    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/facilities/FAC%2002/address', payload);
  });

  it('should extract facilities using different response formats', () => {
    // data.resultList format
    apiServiceSpy.get.and.returnValue(of({ data: { resultList: [{ facilityId: 'F2' }] } }));
    service.getFacilities().subscribe(res => {
      expect(res[0].facilityId).toBe('F2');
    });

    // data.documentList format
    apiServiceSpy.get.and.returnValue(of({ data: { documentList: [{ facilityId: 'F3' }] } }));
    service.getFacilities().subscribe(res => {
      expect(res[0].facilityId).toBe('F3');
    });

    // resultList format
    apiServiceSpy.get.and.returnValue(of({ resultList: [{ facilityId: 'F4' }] }));
    service.getFacilities().subscribe(res => {
      expect(res[0].facilityId).toBe('F4');
    });

    // documentList format
    apiServiceSpy.get.and.returnValue(of({ documentList: [{ facilityId: 'F5' }] }));
    service.getFacilities().subscribe(res => {
      expect(res[0].facilityId).toBe('F5');
    });

    // data format as array
    apiServiceSpy.get.and.returnValue(of({ data: [{ facilityId: 'F6' }] }));
    service.getFacilities().subscribe(res => {
      expect(res[0].facilityId).toBe('F6');
    });

    // single object format
    apiServiceSpy.get.and.returnValue(of({ facilityId: 'F7' }));
    service.getFacilities().subscribe(res => {
      expect(res[0].facilityId).toBe('F7');
    });

    // single object in data format
    apiServiceSpy.get.and.returnValue(of({ data: { facilityId: 'F8' } }));
    service.getFacilities().subscribe(res => {
      expect(res[0].facilityId).toBe('F8');
    });

    // empty/fallback formats
    apiServiceSpy.get.and.returnValue(of({ invalidFormat: true }));
    service.getFacilities().subscribe(res => {
      expect(res).toEqual([]);
    });
  });
});

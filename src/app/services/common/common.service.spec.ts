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
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { CommonService } from './common.service';
import { ApiService } from './api.service';
import { Store } from '@ngrx/store';

describe('CommonService', () => {
  let service: CommonService;
  let httpMock: HttpTestingController;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        CommonService,
        ApiService,
        provideMockStore({})
      ]
    });
    service = TestBed.inject(CommonService);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(Store) as MockStore;
    spyOn(store, 'dispatch');
  });

  afterEach(() => {
    httpMock.verify();
  });

  const expectOneByPath = (pathWithQuery: string) => {
    const req = httpMock.expectOne((r) => r.urlWithParams.endsWith(pathWithQuery));
    const originalFlush = req.flush.bind(req);
    req.flush = (body: any, opts?: any) => {
      if (req.request.url.includes('/common/lookups/')) {
        originalFlush({ data: { values: body } }, opts);
      } else {
        originalFlush(body, opts);
      }
    };
    return req;
  };

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch enum types', async () => {
    const enumTypeId = 'TEST_ENUM_TYPE';
    const mockResponse = [
      { enumId: 'TEST_ENUM', enumTypeId: 'TEST_ENUM_TYPE', description: 'Test Enum' },
      { enumId: 'OTHER', enumTypeId: 'OTHER_TYPE', description: 'Other' },
    ];

    service.getEnumTypes(enumTypeId).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = expectOneByPath('/common/lookups/enumerations?typeId=TEST_ENUM_TYPE');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch status items', async () => {
    const statusTypeId = 'TEST_STATUS_TYPE';
    const mockResponse = [
      { statusId: 'TEST_STATUS', statusTypeId: 'TEST_STATUS_TYPE', description: 'Test Status' },
      { statusId: 'OTHER', statusTypeId: 'OTHER_TYPE', description: 'Other' },
    ];

    service.getStatusItems(statusTypeId).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = expectOneByPath('/common/lookups/status-items?typeId=TEST_STATUS_TYPE');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should reset status item cache after error and allow retry', () => {
    const mockError = new ProgressEvent('error');

    service.getStatusItems('STATUS_TYPE').subscribe({
      next: () => fail('expected an error'),
      error: (error) => expect(error).toBeTruthy(),
    });

    const firstReq = expectOneByPath('/common/lookups/status-items?typeId=STATUS_TYPE');
    firstReq.error(mockError);

    service.getStatusItems('STATUS_TYPE').subscribe((response) => {
      expect(response).toEqual([{ statusId: 'OK' }]);
    });

    const secondReq = expectOneByPath('/common/lookups/status-items?typeId=STATUS_TYPE');
    secondReq.flush([{ statusId: 'OK' }]);
  });

  it('should fetch parent enum types', async () => {
    const parentEnumId = 'PARENT_ENUM_ID';
    const mockResponse = [
      { enumTypeId: 'PARENT_ENUM', parentTypeId: 'PARENT_ENUM_ID', description: 'Parent Enum' },
      { enumTypeId: 'OTHER', parentTypeId: 'OTHER', description: 'Other' },
    ];

    service.getParentEnumTypes(parentEnumId).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = expectOneByPath('/common/lookups/enumeration-types?typeId=PARENT_ENUM_ID');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should reset parent enum and uom caches after error and allow retry', () => {
    const mockError = new ProgressEvent('error');

    service.getParentEnumTypes('PARENT_ENUM_ID').subscribe({
      next: () => fail('expected an error'),
      error: (error) => expect(error).toBeTruthy(),
    });
    expectOneByPath('/common/lookups/enumeration-types?typeId=PARENT_ENUM_ID').error(mockError);

    service.getParentEnumTypes('PARENT_ENUM_ID').subscribe((response) => {
      expect(response).toEqual([{ enumTypeId: 'PARENT_ENUM' }]);
    });
    expectOneByPath('/common/lookups/enumeration-types?typeId=PARENT_ENUM_ID').flush([{ enumTypeId: 'PARENT_ENUM' }]);

    service.getUoms('UOM_TYPE_ENUM_ID').subscribe({
      next: () => fail('expected an error'),
      error: (error) => expect(error).toBeTruthy(),
    });
    expectOneByPath('/common/lookups/uoms?typeId=UOM_TYPE_ENUM_ID').error(mockError);

    service.getUoms('UOM_TYPE_ENUM_ID').subscribe((response) => {
      expect(response).toEqual([{ uomId: 'UOM' }]);
    });
    expectOneByPath('/common/lookups/uoms?typeId=UOM_TYPE_ENUM_ID').flush([{ uomId: 'UOM' }]);
  });

  it('should fetch UOMs', async () => {
    const uomTypeEnumId = 'UOM_TYPE_ENUM_ID';
    const mockResponse = [
      { uomId: 'UOM', uomTypeId: 'UOM_TYPE_ENUM_ID', description: 'Unit of Measure' },
      { uomId: 'OTHER', uomTypeId: 'OTHER', description: 'Other' },
    ];

    service.getUoms(uomTypeEnumId).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = expectOneByPath('/common/lookups/uoms?typeId=UOM_TYPE_ENUM_ID');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch geo list', async () => {
    const geoTypeEnumId = 'TEST_GEO_TYPE';
    const mockResponse = [
      { geoId: 'GEO', geoTypeId: 'TEST_GEO_TYPE', description: 'Geography' },
      { geoId: 'OTHER', geoTypeId: 'OTHER', description: 'Other' },
    ];
    const mockAssocs: any[] = [];

    service.getGeoList(geoTypeEnumId).subscribe(response => {
      expect(response).toHaveSize(2);
      expect(response[0].geoId).toBe('GEO');
    });

    const geoReq = expectOneByPath('/common/lookups/geos?typeId=TEST_GEO_TYPE');
    const assocReq = expectOneByPath('/common/lookups/geo-assocs');
    expect(geoReq.request.method).toBe('GET');
    expect(assocReq.request.method).toBe('GET');
    geoReq.flush(mockResponse);
    assocReq.flush(mockAssocs);
  });

  it('should handle getGeos error', () => {
    const mockError = new ProgressEvent('error');

    service.getGeos().subscribe({
      next: () => fail('expected an error, not geos'),
      error: (error) => {
        expect(error.message).toContain('Http failure response');
        expect(store.dispatch).toHaveBeenCalled();
      },
    });

    const geoReq = expectOneByPath('/common/lookups/geos');
    const assocReq = expectOneByPath('/common/lookups/geo-assocs');
    assocReq.flush([]);
    geoReq.error(mockError);
  });

  it('should fetch facilities', async () => {
    const mockResponse = [{ facilityId: 'FACILITY', description: 'Facility' }];

    service.getFacilities().subscribe(response => {
      expect(response).toHaveSize(1);
      expect(response[0].facilityId).toBe('FACILITY');
      expect(response[0].label).toBe('FACILITY');
    });

    const req = expectOneByPath('/common/facilities');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch facility locations', async () => {
    const mockResponse = [{ locationId: 'LOCATION', description: 'Location' }];

    service.getFacilityLocations().subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = expectOneByPath('/facility-locations');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch facilities from a single object response and preserve id fallback label', async () => {
    service.getFacilities().subscribe(response => {
      expect(response).toHaveSize(1);
      expect(response[0].facilityId).toBe('FACILITY');
      expect(response[0].label).toBe('FACILITY');
    });

    const req = expectOneByPath('/common/facilities');
    req.flush({ facilityId: 'FACILITY' });
  });

  it('should fetch facilities from OFBiz wrapped resultList responses', async () => {
    service.getFacilities().subscribe(response => {
      expect(response).toHaveSize(2);
      expect(response.map((item: any) => item.facilityId)).toEqual(['FAC_1', 'FAC_2']);
      expect(response.map((item: any) => item.label)).toEqual(['First', 'Second']);
    });

    const req = expectOneByPath('/common/facilities');
    req.flush({
      resultList: [
        { facilityId: 'FAC_1', facilityName: 'First' },
        { facilityId: 'FAC_2', facilityName: 'Second' },
      ],
    });
  });

  it('should handle getEnumTypes error', async () => {
    const enumTypeId = 'TEST_ENUM_TYPE';
    const mockError = new ProgressEvent('error');

    service.getEnumTypes(enumTypeId).subscribe({
      next: () => fail("Expected an error, not data"),
      error: (error) => {
        expect(error).toBeTruthy();
      }
    });

    const req = expectOneByPath('/common/lookups/enumerations?typeId=TEST_ENUM_TYPE');
    req.error(mockError);
  });

  it('should fetch role types', async () => {
    const enumTypeId = 'ROLE_ENUM_ID';
    const mockResponse = [
      { roleTypeId: 'ROLE_TYPE', parentTypeId: 'ROLE_ENUM_ID', description: 'Role Type' },
      { roleTypeId: 'OTHER', parentTypeId: 'OTHER', description: 'Other' },
    ];

    service.getRoleTypes(enumTypeId).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = expectOneByPath('/common/lookups/role-types?typeId=ROLE_ENUM_ID');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch root role types and retry after error', () => {
    const mockError = new ProgressEvent('error');

    service.getRoleTypes('').subscribe({
      next: () => fail('expected an error'),
      error: (error) => expect(error).toBeTruthy(),
    });
    expectOneByPath('/common/lookups/role-types').error(mockError);

    service.getRoleTypes('').subscribe((response) => {
      expect(response).toEqual([{ roleTypeId: 'ROLE_ROOT' }]);
    });
    expectOneByPath('/common/lookups/role-types').flush([{ roleTypeId: 'ROLE_ROOT' }]);
  });

  it('should fetch lookup results', async () => {
    const mockResponse = [
      { geoId: 'USA', geoTypeId: 'COUNTRY' },
      { geoId: 'CA', geoTypeId: 'STATE' },
    ];
    const params = { field: 'geo_type_id', value: 'COUNTRY' };
    const lookupFor = 'geo';
    const mockAssocs = [{ geoId: 'USA', geoIdTo: 'CA', geoAssocTypeId: 'REGIONS' }];

    service.getLookupResults(params, lookupFor).subscribe(response => {
      expect(response).toHaveSize(1);
      expect(response[0].geoId).toBe('USA');
    });

    const geoReq = expectOneByPath('/common/lookups/geos');
    const assocReq = expectOneByPath('/common/lookups/geo-assocs');
    expect(geoReq.request.method).toBe('GET');
    expect(assocReq.request.method).toBe('GET');
    geoReq.flush(mockResponse);
    assocReq.flush(mockAssocs);
  });

  it('should filter lookup results with raw fields, array values, and empty filters', () => {
    service.getLookupResults({ field: 'code', value: ['A'] }, 'product_type').subscribe((response) => {
      expect(response).toEqual([{ code: 'A' }]);
    });
    expectOneByPath('/common/lookups/product-types').flush([{ code: 'A' }, { code: 'B' }]);

    service.getLookupResults({ field: 'code' }, 'product_type').subscribe((response) => {
      expect(response).toEqual([{ code: 'A' }, { code: 'B' }]);
    });
    expectOneByPath('/common/lookups/product-types').flush([{ code: 'A' }, { code: 'B' }]);

    service.getLookupResults({ field: 'parentTypeId', value: ['ROLE_PARENT'] }, 'roletypes').subscribe((response) => {
      expect(response).toEqual([{ roleTypeId: 'ROLE_A', parentTypeId: 'ROLE_PARENT' }]);
    });
    expectOneByPath('/common/lookups/role-types?typeId=ROLE_PARENT').flush([
      { roleTypeId: 'ROLE_A', parentTypeId: 'ROLE_PARENT' },
    ]);
  });

  it('should cache all-status and shipment-type lookups and dedupe shipment types', () => {
    const statuses = [
      { statusId: 'STATUS_A', description: 'A' },
      { statusId: 'STATUS_B', description: 'B' },
    ];
    const shipmentTypes = [
      { shipmentTypeId: 'AIR', description: 'Air' },
      { shipmentTypeId: 'AIR', description: 'Duplicate' },
      { shipmentTypeId: 'SEA', description: 'Sea' },
      { shipmentTypeId: '', description: 'Ignore' },
    ];

    service.getAllStatusItems().subscribe((response) => {
      expect(response).toEqual(statuses);
    });
    service.getAllStatusItems().subscribe((response) => {
      expect(response).toEqual(statuses);
    });

    const statusReq = expectOneByPath('/common/lookups/status-items');
    expect(statusReq.request.method).toBe('GET');
    statusReq.flush(statuses);

    service.getShipmentTypes().subscribe((response) => {
      expect(response).toEqual([
        { shipmentTypeId: 'AIR', description: 'Air' },
        { shipmentTypeId: 'SEA', description: 'Sea' },
      ]);
    });
    service.getShipmentTypes().subscribe((response) => {
      expect(response).toEqual([
        { shipmentTypeId: 'AIR', description: 'Air' },
        { shipmentTypeId: 'SEA', description: 'Sea' },
      ]);
    });

    const shipmentReq = expectOneByPath('/common/lookups/shipment-types');
    expect(shipmentReq.request.method).toBe('GET');
    shipmentReq.flush(shipmentTypes);
  });

  it('should reset shipment type cache after error and allow retry', () => {
    const mockError = new ProgressEvent('error');
    const mockResponse = [{ shipmentTypeId: 'AIR', description: 'Air' }];

    service.getShipmentTypes().subscribe({
      next: () => fail('expected an error'),
      error: (error) => expect(error).toBeTruthy(),
    });

    const firstReq = expectOneByPath('/common/lookups/shipment-types');
    firstReq.error(mockError);

    service.getShipmentTypes().subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const secondReq = expectOneByPath('/common/lookups/shipment-types');
    secondReq.flush(mockResponse);
  });

  it('should route lookup results across supported tables and static fallbacks', () => {
    service.getLookupResults({ field: 'code', value: 'A' }, 'product_type').subscribe((response) => {
      expect(response).toEqual([{ code: 'A' }]);
    });
    expectOneByPath('/common/lookups/product-types').flush([{ code: 'A' }, { code: 'B' }]);

    service.getLookupResults({ field: 'code', value: 'A' }, 'product_category_type').subscribe((response) => {
      expect(response).toEqual([{ code: 'A' }]);
    });
    expectOneByPath('/common/lookups/product-category-types').flush([{ code: 'A' }, { code: 'B' }]);

    service.getLookupResults({ field: 'code', value: 'A' }, 'productpricetype').subscribe((response) => {
      expect(response).toEqual([{ code: 'A' }]);
    });
    expectOneByPath('/common/lookups/product-price-types').flush([{ code: 'A' }, { code: 'B' }]);

    service.getLookupResults({ field: 'code', value: 'A' }, 'product_feature_appl_type').subscribe((response) => {
      expect(response).toEqual([{ code: 'A' }]);
    });
    expectOneByPath('/product-feature-appl-types').flush([{ code: 'A' }, { code: 'B' }]);

    service.getLookupResults({ field: 'varianceReasonId', value: 'VAR_LOST' }, 'variance_reason').subscribe((response) => {
      expect(response).toEqual([{ varianceReasonId: 'VAR_LOST', description: 'Lost' }]);
    });
    expectOneByPath('/variance-reasons').flush([
      { varianceReasonId: 'VAR_LOST', description: 'Lost' },
      { varianceReasonId: 'VAR_STOLEN', description: 'Stolen' },
    ]);

    service.getLookupResults({ field: 'parentTypeId', value: 'ROLE_PARENT' }, 'roletypes').subscribe((response) => {
      expect(response).toEqual([{ roleTypeId: 'ROLE_A', parentTypeId: 'ROLE_PARENT' }]);
    });
    expectOneByPath('/common/lookups/role-types?typeId=ROLE_PARENT').flush([
      { roleTypeId: 'ROLE_A', parentTypeId: 'ROLE_PARENT' },
    ]);

    service.getLookupResults({}, 'roletypes').subscribe((response) => {
      expect(response).toEqual([{ roleTypeId: 'ROLE_ROOT' }]);
    });
    expectOneByPath('/common/lookups/role-types').flush([{ roleTypeId: 'ROLE_ROOT' }]);

    service.getLookupResults({ field: 'productPricePurposeId', value: 'PURCHASE' }, 'productpricepurpose').subscribe((response) => {
      expect(response).toEqual([{ productPricePurposeId: 'PURCHASE', description: 'Purchase/Initial' }]);
    });

    service.getLookupResults({}, 'does_not_exist').subscribe((response) => {
      expect(response).toEqual([]);
    });
  });

  it('should load status-change lookup and reuse getEnumTypes cache entries', () => {
    const enumResponse = [{ enumId: 'E1' }];
    service.getEnumTypes('ENUM_1').subscribe((response) => {
      expect(response).toEqual(enumResponse);
    });
    service.getEnumTypes('ENUM_1').subscribe((response) => {
      expect(response).toEqual(enumResponse);
    });
    expectOneByPath('/common/lookups/enumerations?typeId=ENUM_1').flush(enumResponse);

    const validChanges = [{ statusIdTo: 'APPROVED' }];
    service.getValidStatusChanges('PENDING').subscribe((response) => {
      expect(response).toEqual(validChanges);
    });
    expectOneByPath('/common/status-valid-changes/by-status/PENDING').flush(validChanges);
  });

  it('should cache shipment method types and retry after an error', () => {
    const mockError = new ProgressEvent('error');

    service.getShipmentMethodTypes().subscribe({
      next: () => fail('expected an error'),
      error: (error) => expect(error).toBeTruthy(),
    });

    const firstReq = expectOneByPath('/common/lookups/shipment-method-types');
    firstReq.error(mockError);

    service.getShipmentMethodTypes().subscribe((response) => {
      expect(response).toEqual([{ shipmentMethodTypeId: 'GROUND' }]);
    });

    const secondReq = expectOneByPath('/common/lookups/shipment-method-types');
    secondReq.flush([{ shipmentMethodTypeId: 'GROUND' }]);
  });

  it('should load order item types from OMS and retry after an error', () => {
    const mockError = new ProgressEvent('error');

    service.getOrderItemTypes().subscribe({
      next: () => fail('expected an error'),
      error: (error) => expect(error).toBeTruthy(),
    });

    const firstReq = expectOneByPath('/common/lookups/order-item-types');
    expect(firstReq.request.method).toBe('GET');
    firstReq.error(mockError);

    service.getOrderItemTypes().subscribe((response) => {
      expect(response).toEqual([{ orderItemTypeId: 'PRODUCT_ORDER_ITEM', description: 'Product Item' }]);
    });
    service.getOrderItemTypes().subscribe((response) => {
      expect(response).toEqual([{ orderItemTypeId: 'PRODUCT_ORDER_ITEM', description: 'Product Item' }]);
    });

    const secondReq = expectOneByPath('/common/lookups/order-item-types');
    secondReq.flush([{ orderItemTypeId: 'PRODUCT_ORDER_ITEM', description: 'Product Item' }]);
  });

  it('should normalize geos from geoId prefixes and explicit country associations', () => {
    service.getGeos().subscribe((response) => {
      expect(response).toEqual([
        jasmine.objectContaining({ geoId: 'USA_CA', country_geo_id: 'USA', geoName: 'California' }),
        jasmine.objectContaining({ geoId: 'TX', country_geo_id: 'USA', geoName: 'Texas' }),
      ]);
    });

    const geoReq = expectOneByPath('/common/lookups/geos');
    const assocReq = expectOneByPath('/common/lookups/geo-assocs');
    geoReq.flush([
      { geo_id: 'USA_CA', geo_type_id: 'STATE', geo_name: 'California' },
      { geoId: 'TX', geoTypeId: 'STATE', geoName: 'Texas', country_geo_id: 'USA' },
    ]);
    assocReq.flush([]);
  });

  it('should normalize geos from helper maps and snake-case associations', () => {
    const assocMap = (service as any).buildGeoCountryMap([
      { geo_assoc_type_id: 'REGIONS', geo_id: 'USA', geo_id_to: 'CA' },
      { geoAssocTypeId: 'REGIONS', geoId: 'CAN', geoIdTo: 'ON' },
      { geoAssocTypeId: 'NOT_REGIONS', geoId: 'BAD', geoIdTo: 'XX' },
    ]);

    expect(assocMap.get('CA')).toBe('USA');
    expect(assocMap.get('ON')).toBe('CAN');
    expect(assocMap.has('XX')).toBeFalse();

    const normalized = (service as any).normalizeGeos([
      { geo_id: 'CA', geo_name: 'California', geo_type_id: 'STATE', geo_code: 'CA', geo_sec_code: '001' },
      { geoId: 'ON', geoName: 'Ontario', geoTypeId: 'STATE', geoCode: 'ON', geoSecCode: '002', country_geo_id: 'CAN' },
      { geoId: 'MX', geoName: 'Mexico', geoTypeId: 'COUNTRY' },
    ], assocMap);

    expect(normalized[0]).toEqual(jasmine.objectContaining({
      geoId: 'CA',
      geoTypeId: 'STATE',
      geoName: 'California',
      geoCode: 'CA',
      geoSecCode: '001',
      geo_id: 'CA',
      geo_type_id: 'STATE',
      geo_name: 'California',
      geo_code: 'CA',
      geo_sec_code: '001',
      country_geo_id: 'USA',
    }));
    expect(normalized[1]).toEqual(jasmine.objectContaining({ country_geo_id: 'CAN' }));
    expect(normalized[2]).toEqual(jasmine.objectContaining({ country_geo_id: undefined }));
  });

  it('should fetch facilities with explicit ids and preserve labels', () => {
    service.getFacilities(['FAC_2', 'FAC_1']).subscribe((response) => {
      expect(response.map((item: any) => item.label)).toEqual(['First', 'Second']);
    });

    const req = expectOneByPath('/common/facilities?facilityIds=FAC_2%2CFAC_1');
    req.flush([
      { facilityId: 'FAC_2', facilityName: 'Second' },
      { facilityId: 'FAC_1', facilityName: 'First' },
    ]);
  });
});

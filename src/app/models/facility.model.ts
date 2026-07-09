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
export interface FacilityDetail {
  facilityId?: string;
  facilityTypeId?: string;
  facilityName?: string;
  requireInspection?: string | boolean;
  label?: string;
  ownerPartyId?: string;
}

export interface FacilityAddress {
  toName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  stateProvinceGeoId?: string;
  stateProvinceGeoName?: string;
  postalCode?: string;
  countryGeoId?: string;
  countryGeoName?: string;
}

export interface FacilityLocation {
  [key: string]: unknown;
  id?: number | string;
  facilityId?: string;
  locationSeqId?: string;
  locationName?: string;
  locationTypeEnumId?: string;
  areaId?: string;
  aisleId?: string;
  sectionId?: string;
  levelId?: string;
  positionId?: string;
}

export interface FacilityDetailResponse {
  facility?: FacilityDetail | null;
  facilityTypeLabel?: string;
  geoMap?: Record<string, string>;
  locationTypeMap?: Record<string, string>;
  addresses?: FacilityAddress[];
  locations?: FacilityLocation[];
  locationTotal?: number;
}

export interface FacilityLocationPageResponse {
  content?: FacilityLocation[];
  resultList?: FacilityLocation[];
  totalElements?: number;
  page?: {
    totalElements?: number;
  };
}

export interface FacilityTypeLookupItem {
  facilityTypeId?: string;
  description?: string;
}

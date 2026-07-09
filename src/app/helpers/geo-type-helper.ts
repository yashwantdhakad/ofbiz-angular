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
// geo-type-helper.ts

export interface GeoRecord {
  geo_type_id?: string;
  geoTypeId?: string;
  [key: string]: unknown;
}

export interface GeoListObject {
  geoList: GeoRecord[];
}

export function filterGeoRecords(
  geoListObject: GeoListObject | null | undefined,
  geo_type_id: string
): GeoRecord[] {
  const geoRecords = [(geoListObject as any)?.geoList, geoListObject as any]
    .find((candidate) => Array.isArray(candidate)) ?? null;

  if (!Array.isArray(geoRecords)) {
    console.warn('filterGeoRecords: Provided geoListObject is not an array.');
    return [];
  }

  return geoRecords.filter(
    (record) => !geo_type_id || (record.geo_type_id ?? record.geoTypeId) === geo_type_id
  );
}

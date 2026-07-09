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
// geo-type-helper.spec.ts
import { filterGeoRecords } from './geo-type-helper';

describe('filterGeoRecords', () => {
  const geoListObject = {
    geoList: [
      { geo_type_id: 'type1', value: 'value1' },
      { geo_type_id: 'type2', value: 'value2' },
      { geo_type_id: 'type1', value: 'value3' },
      { geoTypeId: 'type1', value: 'value4' },
      { geo_type_id: 'type3', value: 'value4' },
    ],
  };

  it('should filter records by geo_type_id', () => {
    const result = filterGeoRecords(geoListObject, 'type1');
    expect(result).toEqual([
      { geo_type_id: 'type1', value: 'value1' },
      { geo_type_id: 'type1', value: 'value3' },
      { geoTypeId: 'type1', value: 'value4' },
    ]);
  });

  it('should return all records when geo_type_id is an empty string', () => {
    const result = filterGeoRecords(geoListObject, '');
    expect(result).toEqual(geoListObject.geoList);
  });

  it('should return an empty array when geoListObject is not provided', () => {
    spyOn(console, 'warn');
    const result = filterGeoRecords(null, 'type1');
    expect(result).toEqual([]);
  });

  it('should return an empty array when no records match the geo_type_id', () => {
    const result = filterGeoRecords(geoListObject, 'type4');
    expect(result).toEqual([]);
  });

  it('should return an empty array when geoListObject.geoList is an empty array', () => {
    const result = filterGeoRecords({ geoList: [] }, 'type1');
    expect(result).toEqual([]);
  });

  it('should log a warning when geoListObject.geoList is not an array', () => {
    spyOn(console, 'warn');
    filterGeoRecords({ geoList: null as any }, 'type1');
    expect(console.warn).toHaveBeenCalledWith(
      'filterGeoRecords: Provided geoListObject is not an array.'
    );
  });
});

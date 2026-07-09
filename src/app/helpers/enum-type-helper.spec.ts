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
// enum-type-helper.spec.ts
import { filterEnumRecords } from './enum-type-helper';

interface EnumRecord {
  enumTypeId: string;
  [key: string]: any;
}

describe('filterEnumRecords', () => {
  const enumList: EnumRecord[] = [
    { enumTypeId: 'type1', value: 'value1' },
    { enumTypeId: 'type2', value: 'value2' },
    { enumTypeId: 'type1', value: 'value3' },
    { enumTypeId: 'type3', value: 'value4' },
  ];

  it('should filter records by enumTypeId', () => {
    const result = filterEnumRecords(enumList, 'type1');
    expect(result).toEqual([
      { enumTypeId: 'type1', value: 'value1' },
      { enumTypeId: 'type1', value: 'value3' },
    ]);
  });

  it('should return all records when enumTypeId is an empty string', () => {
    const result = filterEnumRecords(enumList, '');
    expect(result).toEqual(enumList);
  });

  it('should return an empty array when enumListObject is not an array', () => {
    spyOn(console, 'warn');
    const result = filterEnumRecords(null as any, 'type1');
    expect(result).toEqual([]);
  });

  it('should return an empty array when no records match the enumTypeId', () => {
    const result = filterEnumRecords(enumList, 'type4');
    expect(result).toEqual([]);
  });

  it('should return an empty array when enumListObject is an empty array', () => {
    const result = filterEnumRecords([], 'type1');
    expect(result).toEqual([]);
  });

  it('should log a warning when enumListObject is not an array', () => {
    spyOn(console, 'warn');
    filterEnumRecords(null as any, 'type1');
    expect(console.warn).toHaveBeenCalledWith(
      'filterEnumRecords: Provided enumListObject is not an array.'
    );
  });
});

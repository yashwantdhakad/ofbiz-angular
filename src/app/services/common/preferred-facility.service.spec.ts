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
import { FormControl } from '@angular/forms';
import { PreferredFacilityService } from './preferred-facility.service';

describe('PreferredFacilityService', () => {
  let service: PreferredFacilityService;

  beforeEach(() => {
    service = new PreferredFacilityService();
  });

  it('stores the preferred facility id trimmed', () => {
    service.setPreferredFacilityId('  FAC_1  ');

    expect(service.preferredFacilityId()).toBe('FAC_1');
  });

  it('resolves the current facility id first when present', () => {
    service.setPreferredFacilityId('FAC_2');

    expect(service.resolveInitialFacilityId([{ facilityId: 'FAC_1' }, { facilityId: 'FAC_2' }], ' FAC_9 ')).toBe('FAC_9');
  });

  it('falls back to the preferred or first facility when current is missing', () => {
    service.setPreferredFacilityId('FAC_2');

    expect(service.resolveInitialFacilityId([{ facilityId: 'FAC_1' }, { facilityId: 'FAC_2' }])).toBe('FAC_2');
    expect(service.resolveInitialFacilityId([{ facilityId: 'FAC_1' }])).toBe('FAC_1');
    expect(service.resolveInitialFacilityId([])).toBe('');
  });

  it('applies the preferred facility to an empty control only', () => {
    const emptyControl = new FormControl('');
    const filledControl = new FormControl('FAC_9');
    service.setPreferredFacilityId('FAC_2');

    service.applyPreferredFacilityIfMissing(emptyControl, [{ facilityId: 'FAC_1' }, { facilityId: 'FAC_2' }]);
    service.applyPreferredFacilityIfMissing(filledControl, [{ facilityId: 'FAC_1' }, { facilityId: 'FAC_2' }]);
    service.applyPreferredFacilityIfMissing(null, [{ facilityId: 'FAC_1' }]);

    expect(emptyControl.value).toBe('FAC_2');
    expect(filledControl.value).toBe('FAC_9');
  });

  it('sorts facilities with the preferred one first and then by label', () => {
    service.setPreferredFacilityId('FAC_2');

    const sorted = service.sortFacilities([
      { facilityId: 'FAC_3', facilityName: 'Zulu' },
      { facilityId: 'FAC_1', description: 'Alpha' },
      { facilityId: 'FAC_2', label: 'Bravo' },
    ]);

    expect(sorted.map((item) => item.facilityId)).toEqual(['FAC_2', 'FAC_1', 'FAC_3']);
  });

  it('builds a facility label defensively', () => {
    expect(service.getFacilityLabel({ label: 'Label first' })).toBe('Label first');
    expect(service.getFacilityLabel({ facilityName: 'Named' })).toBe('Named');
    expect(service.getFacilityLabel({ description: 'Described' })).toBe('Described');
    expect(service.getFacilityLabel({ facilityId: 'FAC_1' })).toBe('FAC_1');
    expect(service.getFacilityLabel(null)).toBe('');
  });
});

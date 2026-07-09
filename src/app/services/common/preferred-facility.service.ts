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
import { Injectable, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Injectable({
  providedIn: 'root',
})
export class PreferredFacilityService {
  readonly preferredFacilityId = signal('');

  setPreferredFacilityId(facilityId?: string | null): void {
    this.preferredFacilityId.set((facilityId || '').trim());
  }

  resolveInitialFacilityId(facilities: any[], currentFacilityId?: string | null): string {
    const current = (currentFacilityId || '').trim();
    if (current) {
      return current;
    }

    const preferred = this.preferredFacilityId();
    if (preferred && (facilities || []).some((facility: any) => facility?.facilityId === preferred)) {
      return preferred;
    }

    return ((facilities || [])[0]?.facilityId || '').toString().trim();
  }

  applyPreferredFacilityIfMissing(control: AbstractControl | null | undefined, facilities: any[]): void {
    if (!control) {
      return;
    }
    const current = (control.value || '').toString().trim();
    if (current) {
      return;
    }
    const facilityId = this.resolveInitialFacilityId(facilities);
    if (facilityId) {
      control.setValue(facilityId);
    }
  }

  sortFacilities<T extends { facilityId?: string; facilityName?: string; description?: string; label?: string }>(
    facilities: T[] | null | undefined
  ): T[] {
    const preferred = this.preferredFacilityId();
    const list = Array.isArray(facilities) ? [...facilities] : [];

    return list.sort((left: T, right: T) => {
      const leftId = String(left?.facilityId || '').trim();
      const rightId = String(right?.facilityId || '').trim();
      const leftPreferred = preferred && leftId === preferred ? 1 : 0;
      const rightPreferred = preferred && rightId === preferred ? 1 : 0;
      if (leftPreferred !== rightPreferred) {
        return rightPreferred - leftPreferred;
      }

      const leftLabel = this.getFacilityLabel(left).toLowerCase();
      const rightLabel = this.getFacilityLabel(right).toLowerCase();
      return leftLabel.localeCompare(rightLabel);
    });
  }

  getFacilityLabel(facility: any): string {
    if (!facility) {
      return '';
    }
    return String(
      facility?.label
      || facility?.facilityName
      || facility?.description
      || facility?.facilityId
      || ''
    ).trim();
  }
}

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
import { Component, Inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { map, startWith } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-asset-location-dialog',
  templateUrl: './asset-location-dialog.component.html',
  styleUrls: ['./asset-location-dialog.component.css'],
})
export class AssetLocationDialogComponent {
  locationControl: FormControl;
  filteredLocations$;

  constructor(
    private dialogRef: MatDialogRef<AssetLocationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { locationSeqId?: string; locations?: any[] }
  ) {
    const selected = (data?.locations || []).find((item) => item?.locationSeqId === data?.locationSeqId);
    this.locationControl = new FormControl(selected || data?.locationSeqId || '');
    this.filteredLocations$ = this.locationControl.valueChanges.pipe(
      startWith(this.locationControl.value),
      map((value) => this.filterLocations(typeof value === 'string' ? value : value?.locationSeqId))
    );
  }

  displayLocation(option: any): string {
    if (!option) {
      return '';
    }
    return typeof option === 'string' ? option : (option.locationSeqId || '');
  }

  onSave(): void {
    const raw = this.locationControl.value;
    const locationSeqId = typeof raw === 'string' ? raw.trim() : (raw?.locationSeqId || '');
    this.dialogRef.close(locationSeqId || null);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private filterLocations(searchValue: string): any[] {
    const needle = (searchValue || '').toLowerCase().trim();
    const locations = this.data?.locations || [];
    if (!needle) {
      return locations;
    }
    return locations.filter((item) => String(item?.locationSeqId || '').toLowerCase().includes(needle));
  }
}

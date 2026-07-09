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

@Component({
  standalone: false,
  selector: 'app-asset-status-dialog',
  templateUrl: './asset-status-dialog.component.html',
  styleUrls: ['./asset-status-dialog.component.css'],
})
export class AssetStatusDialogComponent {
  statusControl: FormControl;
  statuses = [
    { statusId: 'INV_AVAILABLE', label: 'Available' },
    { statusId: 'INV_PENDING_INSP', label: 'Inspection Pending' },
    { statusId: 'INV_NS_DEFECTIVE', label: 'Defective' },
    { statusId: 'INV_IN_REPAIR', label: 'In Repair' },
    { statusId: 'INV_READY_INSTALL', label: 'Ready to Install' }
  ];

  constructor(
    private dialogRef: MatDialogRef<AssetStatusDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { statusId?: string; statusMap?: Map<string, string> }
  ) {
    this.statusControl = new FormControl(data?.statusId || 'INV_AVAILABLE');
    if (data?.statusMap) {
      this.statuses = this.statuses.map(item => ({
        ...item,
        label: data.statusMap?.get(item.statusId) || item.label
      }));
    }
  }

  onSave(): void {
    this.dialogRef.close(this.statusControl.value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

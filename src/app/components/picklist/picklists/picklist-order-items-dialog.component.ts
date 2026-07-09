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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  standalone: false,
  selector: 'app-picklist-order-items-dialog',
  templateUrl: './picklist-order-items-dialog.component.html',
  styleUrls: ['./picklist-order-items-dialog.component.css'],
})
export class PicklistOrderItemsDialogComponent {
  displayedColumns = ['product', 'quantity', 'location', 'lotId'];

  constructor(
    private dialogRef: MatDialogRef<PicklistOrderItemsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { orderId: string; items: any[] }
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  getProductLabel(item: any): string {
    return item?.productName || item?.productId || item?.inventoryItemId || '';
  }
}

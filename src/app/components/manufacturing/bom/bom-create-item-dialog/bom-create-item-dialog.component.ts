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
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  standalone: false,
  selector: 'app-bom-create-item-dialog',
  templateUrl: './bom-create-item-dialog.component.html',
  styleUrls: ['./bom-create-item-dialog.component.css'],
})
export class BomCreateItemDialogComponent {
  componentProductId = '';
  quantity = 1;
  fromDate = new Date().toISOString();

  constructor(private dialogRef: MatDialogRef<BomCreateItemDialogComponent>) {}

  save(): void {
    if (!this.componentProductId) {
      return;
    }
    this.dialogRef.close({
      componentProductId: this.componentProductId,
      quantity: this.quantity,
      fromDate: this.fromDate,
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}

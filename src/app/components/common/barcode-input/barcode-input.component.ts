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
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { BarcodeFormat } from '@zxing/library';
import { ZXingScannerModule } from '@zxing/ngx-scanner';

@Component({
  selector: 'app-barcode-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslateModule,
    ZXingScannerModule,
  ],
  templateUrl: './barcode-input.component.html',
  styleUrls: ['./barcode-input.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodeInputComponent {
  @Input() labelKey = 'BARCODE.VALUE_LABEL';
  @Input() placeholderKey = 'BARCODE.VALUE_PLACEHOLDER';
  @Output() readonly valueScanned = new EventEmitter<string>();

  readonly scannerOpen = signal(false);
  readonly cameraAvailable = signal(true);
  readonly permissionDenied = signal(false);
  readonly selectedDevice = signal<MediaDeviceInfo | undefined>(undefined);
  readonly formats = [
    BarcodeFormat.CODE_128,
    BarcodeFormat.EAN_13,
    BarcodeFormat.QR_CODE,
  ];
  manualValue = '';

  openScanner(): void {
    this.cameraAvailable.set(true);
    this.permissionDenied.set(false);
    this.scannerOpen.set(true);
  }

  closeScanner(): void {
    this.scannerOpen.set(false);
    this.selectedDevice.set(undefined);
  }

  submitManualValue(): void {
    this.emitValue(this.manualValue);
  }

  onScanSuccess(value: string): void {
    this.emitValue(value);
    this.closeScanner();
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.cameraAvailable.set(devices.length > 0);
    const rearCamera = devices.find((device) =>
      /back|rear|environment/i.test(device.label)
    );
    this.selectedDevice.set(rearCamera || devices.at(-1));
  }

  onCamerasNotFound(): void {
    this.cameraAvailable.set(false);
  }

  onPermissionResponse(granted: boolean): void {
    this.permissionDenied.set(!granted);
  }

  onScanError(): void {
    this.cameraAvailable.set(false);
  }

  private emitValue(value: string): void {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return;
    }

    this.manualValue = normalizedValue;
    this.valueScanned.emit(normalizedValue);
  }
}

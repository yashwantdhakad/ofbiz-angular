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
import { BarcodeInputComponent } from './barcode-input.component';

describe('BarcodeInputComponent', () => {
  let component: BarcodeInputComponent;

  beforeEach(() => {
    component = new BarcodeInputComponent();
  });

  it('emits a trimmed manual value', () => {
    const emittedValues: string[] = [];
    component.valueScanned.subscribe((value) => emittedValues.push(value));
    component.manualValue = '  SKU-100  ';

    component.submitManualValue();

    expect(emittedValues).toEqual(['SKU-100']);
    expect(component.manualValue).toBe('SKU-100');
  });

  it('emits a camera scan and closes the scanner', () => {
    const emittedValues: string[] = [];
    component.valueScanned.subscribe((value) => emittedValues.push(value));
    component.openScanner();

    component.onScanSuccess('EAN-123');

    expect(emittedValues).toEqual(['EAN-123']);
    expect(component.scannerOpen()).toBeFalse();
  });

  it('prefers an environment-facing camera', () => {
    const frontCamera = { label: 'Front Camera' } as MediaDeviceInfo;
    const rearCamera = { label: 'Back Camera' } as MediaDeviceInfo;

    component.onCamerasFound([frontCamera, rearCamera]);

    expect(component.selectedDevice()).toBe(rearCamera);
    expect(component.cameraAvailable()).toBeTrue();
  });
});

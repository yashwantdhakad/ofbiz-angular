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
import { FixedDecimalPipe } from './fixed-decimal.pipe';

describe('FixedDecimalPipe', () => {
  let pipe: FixedDecimalPipe;

  beforeEach(() => {
    pipe = new FixedDecimalPipe();
  });

  it('formats numbers with two decimal places by default', () => {
    expect(pipe.transform(57.5)).toBe('57.50');
  });

  it('falls back to zero for invalid values', () => {
    expect(pipe.transform(undefined)).toBe('0.00');
  });

  it('supports custom precision', () => {
    expect(pipe.transform(12.3456, 3)).toBe('12.346');
  });
});

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
import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { TraceabilityTree } from '@ofbiz/models/lot.model';

@Component({
  standalone: false,
  selector: 'app-lot-traceability-tree',
  templateUrl: './lot-traceability-tree.component.html',
  styleUrls: ['./lot-traceability-tree.component.css'],
})
export class LotTraceabilityTreeComponent implements OnChanges {
  @Input() treeData: TraceabilityTree | null = null;

  readonly hasData = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['treeData']) {
      const data = changes['treeData'].currentValue;
      this.hasData.set(!!(data && (data.lot || (data.parentPlates && data.parentPlates.length))));
    }
  }

  isScrap(nodeType?: string): boolean {
    return nodeType === 'SCRAP';
  }
}

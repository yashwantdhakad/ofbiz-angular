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
import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { finalize, forkJoin } from 'rxjs';
import { CrmService, SalesOpportunity, SalesOpportunityStage } from '../../../services/crm/crm.service';

interface PipelineColumn {
  id: string;
  label: string;
  opportunities: SalesOpportunity[];
}

@Component({
  selector: 'app-crm-pipeline',
  templateUrl: './pipeline.component.html',
  styleUrls: ['./pipeline.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PipelineComponent implements OnInit {
  private readonly fallbackStages: SalesOpportunityStage[] = [
    { opportunityStageId: 'LEAD', description: 'Lead', sequenceNum: 10 },
    { opportunityStageId: 'QUALIFIED', description: 'Qualified', sequenceNum: 20 },
    { opportunityStageId: 'PROPOSAL', description: 'Proposal', sequenceNum: 30 },
    { opportunityStageId: 'NEGOTIATION', description: 'Negotiation', sequenceNum: 40 },
    { opportunityStageId: 'WON', description: 'Won', sequenceNum: 50 },
    { opportunityStageId: 'LOST', description: 'Lost', sequenceNum: 60 },
  ];

  readonly isLoading = signal(false);
  readonly errorKey = signal<string | null>(null);
  readonly columns = signal<PipelineColumn[]>([]);
  readonly connectedDropLists = computed(() => this.columns().map((column) => this.dropListId(column.id)));
  readonly totalPipelineValue = computed(() =>
    this.columns()
      .flatMap((column) => column.opportunities)
      .reduce((total, opportunity) => total + Number(opportunity.estimatedAmount || 0), 0)
  );
  readonly opportunityCount = computed(() =>
    this.columns().reduce((total, column) => total + column.opportunities.length, 0)
  );

  constructor(private crmService: CrmService) {}

  ngOnInit(): void {
    this.loadPipeline();
  }

  loadPipeline(): void {
    this.isLoading.set(true);
    this.errorKey.set(null);
    forkJoin({
      stages: this.crmService.getStages(),
      opportunities: this.crmService.getOpportunities(),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ stages, opportunities }) => {
          this.columns.set(this.buildColumns(stages.length ? stages : this.fallbackStages, opportunities));
        },
        error: () => {
          this.columns.set([]);
          this.errorKey.set('CRM.LOAD_PIPELINE_ERROR');
        },
      });
  }

  drop(event: CdkDragDrop<SalesOpportunity[]>, targetStageId: string): void {
    const previousColumns = this.cloneColumns(this.columns());
    const columns = this.cloneColumns(this.columns());
    const targetColumn = columns.find((column) => this.dropListId(column.id) === event.container.id);
    const sourceColumn = columns.find((column) => this.dropListId(column.id) === event.previousContainer.id);

    if (!targetColumn || !sourceColumn) {
      return;
    }

    if (event.previousContainer === event.container) {
      moveItemInArray(targetColumn.opportunities, event.previousIndex, event.currentIndex);
      this.columns.set(columns);
      return;
    }

    transferArrayItem(sourceColumn.opportunities, targetColumn.opportunities, event.previousIndex, event.currentIndex);
    const movedOpportunity = targetColumn.opportunities[event.currentIndex];
    this.columns.set(columns);
    this.crmService.updateOpportunityStage(movedOpportunity.id, targetStageId).subscribe({
      next: (updated) => {
        movedOpportunity.opportunityStageId = updated.opportunityStageId || targetStageId;
      },
      error: () => {
        this.columns.set(previousColumns);
        this.errorKey.set('CRM.UPDATE_STAGE_ERROR');
      },
    });
  }

  dropListId(stageId: string): string {
    return `crm-stage-${stageId}`;
  }

  trackColumn(_: number, column: PipelineColumn): string {
    return column.id;
  }

  trackOpportunity(_: number, opportunity: SalesOpportunity): number {
    return opportunity.id;
  }

  private buildColumns(stages: SalesOpportunityStage[], opportunities: SalesOpportunity[]): PipelineColumn[] {
    const sortedStages = [...stages].sort((a, b) => Number(a.sequenceNum || 0) - Number(b.sequenceNum || 0));
    const stageIds = new Set(sortedStages.map((stage) => stage.opportunityStageId));
    const columns = sortedStages.map((stage) => ({
      id: stage.opportunityStageId,
      label: stage.description || stage.opportunityStageId,
      opportunities: [] as SalesOpportunity[],
    }));

    opportunities.forEach((opportunity) => {
      const stageId = opportunity.opportunityStageId && stageIds.has(opportunity.opportunityStageId)
        ? opportunity.opportunityStageId
        : columns[0]?.id;
      const column = columns.find((item) => item.id === stageId);
      if (column) {
        column.opportunities.push(opportunity);
      }
    });

    return columns;
  }

  private cloneColumns(columns: PipelineColumn[]): PipelineColumn[] {
    return columns.map((column) => ({
      ...column,
      opportunities: column.opportunities.map((opportunity) => ({ ...opportunity })),
    }));
  }
}

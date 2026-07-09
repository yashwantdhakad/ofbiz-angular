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
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, switchMap } from 'rxjs';
import { CommunicationEvent, CrmService, SalesOpportunity, SalesOpportunityStage } from '../../../services/crm/crm.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { OpportunityEditDialogComponent } from '../opportunity-edit-dialog/opportunity-edit-dialog.component';

@Component({
  selector: 'app-opportunity-detail',
  templateUrl: './opportunity-detail.component.html',
  styleUrls: ['./opportunity-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class OpportunityDetailComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly errorKey = signal<string | null>(null);
  readonly opportunity = signal<SalesOpportunity | null>(null);
  readonly timeline = signal<CommunicationEvent[]>([]);
  readonly stages = signal<SalesOpportunityStage[]>([]);
  readonly displayName = computed(() => {
    const opportunity = this.opportunity();
    return opportunity?.opportunityName || opportunity?.salesOpportunityId || '';
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private crmService: CrmService,
    private dialog: MatDialog,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.crmService.getStages().subscribe({
      next: (stages) => this.stages.set(Array.isArray(stages) ? stages : []),
      error: () => this.stages.set([]),
    });

    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = Number(params.get('id'));
        this.isLoading.set(true);
        this.errorKey.set(null);
        return forkJoin({
          opportunity: this.crmService.getOpportunity(id),
          timeline: this.crmService.getOpportunityTimeline(String(id)),
        }).pipe(finalize(() => this.isLoading.set(false)));
      })
    ).subscribe({
      next: ({ opportunity, timeline }) => {
        this.opportunity.set(opportunity);
        this.timeline.set(timeline);
      },
      error: () => {
        this.opportunity.set(null);
        this.timeline.set([]);
        this.errorKey.set('CRM.LOAD_OPPORTUNITY_ERROR');
      },
    });
  }

  trackEvent(_: number, event: CommunicationEvent): number {
    return event.id;
  }

  editOpportunity(): void {
    const opportunity = this.opportunity();
    if (!opportunity) {
      return;
    }

    this.dialog.open(OpportunityEditDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      data: {
        opportunity,
        stages: this.stages(),
      },
    }).afterClosed().subscribe((updated?: SalesOpportunity) => {
      if (!updated) {
        return;
      }
      this.opportunity.set(updated);
      this.snackbarService.showSuccess(this.translate.instant('CRM.UPDATE_SUCCESS'));
    });
  }

  deleteOpportunity(): void {
    const opportunityId = this.opportunity()?.id;
    if (!opportunityId) {
      return;
    }

    this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('CRM.DELETE_TITLE'),
        message: this.translate.instant('CRM.DELETE_CONFIRM'),
      },
    }).afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.crmService.deleteOpportunity(opportunityId).subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('CRM.DELETE_SUCCESS'));
          this.router.navigate(['/crm/pipeline']);
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('CRM.DELETE_ERROR'));
        },
      });
    });
  }
}

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
import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { finalize } from 'rxjs/operators';
import { AuthService } from '@ofbiz/services/common/auth.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-party-note',
  templateUrl: './party-note.component.html',
  styleUrls: ['./party-note.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartyNoteComponent {
  addUpdateNoteForm: FormGroup;
  readonly isLoading = signal(false);

  constructor(
    public dialogRef: MatDialogRef<PartyNoteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { noteData: any },
    private fb: FormBuilder,
    private partyService: PartyService,
    private snackbarService: SnackbarService,
    private authService: AuthService,
    private translate: TranslateService
  ) {
    const { partyId, noteId, noteDate, noteText } = this.data?.noteData ?? {};
    const userLoginId = this.authService.getUserLoginId();

    this.addUpdateNoteForm = this.fb.group({
      partyId: [partyId],
      noteId: [noteId],
      noteDate: [noteDate],
      noteText: [noteText, Validators.required],
      createdBy: [noteId ? null : userLoginId],
    });
  }


  addUpdateNote(): void {
    if (this.addUpdateNoteForm.valid) {
      this.isLoading.set(true);
      const values = this.addUpdateNoteForm.value;

      const noteObservable = values.noteId
        ? this.partyService.updatePartyNote(values)
        : this.partyService.createPartyNote(values);

      noteObservable.pipe(
        finalize(() => this.isLoading.set(false))
      ).subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('PARTY.NOTE_SAVE_SUCCESS'));
          this.addUpdateNoteForm.reset();
          this.dialogRef.close(values);
        },
        error: (_error) => {
          this.snackbarService.showError(this.translate.instant('PARTY.NOTE_SAVE_ERROR'));
        }
      });
    }
  }
}

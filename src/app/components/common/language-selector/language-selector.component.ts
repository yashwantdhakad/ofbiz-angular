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
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { AppShellMaterialModule } from '../material/app-shell-material.module';

interface LanguageOption {
  code: string;
  labelKey: string;
}

@Component({
  standalone: true,
  selector: 'app-language-selector',
  imports: [CommonModule, FormsModule, TranslateModule, AppShellMaterialModule],
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSelectorComponent {
  selectedLanguage: string;
  languages: LanguageOption[];

  constructor(
    public dialogRef: MatDialogRef<LanguageSelectorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { current: string; languages: LanguageOption[] }
  ) {
    this.languages = data?.languages || [];
    this.selectedLanguage = data?.current || (this.languages[0]?.code ?? 'en');
  }

  apply(): void {
    this.dialogRef.close(this.selectedLanguage);
  }
}

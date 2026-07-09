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
// shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PartyAddressListComponent } from '../../party/party-address/party-address-list.component';
import { ShippingInstructionDialogComponent } from '../../order/shipping-instruction-dialog/shipping-instruction-dialog.component';
import { AddEditAddressComponent } from '../../party/add-edit-address/add-edit-address.component';
import { AddEditEmailComponent } from '../../party/add-edit-email/add-edit-email.component';
import { AddEditPhoneComponent } from '../../party/add-edit-phone/add-edit-phone.component';
import { AddRoleComponent } from '../../party/add-role/add-role.component';
import { AddClassificationComponent } from '../../party/add-classification/add-classification.component';
import { AddIdentificationComponent } from '../../party/add-identification/add-identification.component';
import { AddEditCreditCardComponent } from '../../party/add-edit-credit-card/add-edit-credit-card.component';
import { AddEditBankAccountComponent } from '../../party/add-edit-bank-account/add-edit-bank-account.component';
import { PartyNoteComponent } from '../../party/party-note/party-note.component';
import { PartyContentComponent } from '../../party/party-content/party-content.component';
import { SharedPartyMaterialModule } from '../../common/material/shared-party-material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { AppCanApproveDirective, AppCanManageDirective, HasPermissionDirective } from './has-permission.directive';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    PartyAddressListComponent,
    AddEditEmailComponent,
    AddRoleComponent,
    AddClassificationComponent,
    AddIdentificationComponent,
    AddEditCreditCardComponent,
    AddEditBankAccountComponent,
    PartyNoteComponent,
    PartyContentComponent,
    HasPermissionDirective,
    AppCanManageDirective,
    AppCanApproveDirective,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedPartyMaterialModule,
    ShippingInstructionDialogComponent,
    AddEditAddressComponent,
    AddEditPhoneComponent,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ],
  exports: [
    PartyAddressListComponent,
    ShippingInstructionDialogComponent,
    AddEditAddressComponent,
    AddEditEmailComponent,
    AddEditPhoneComponent,
    AddRoleComponent,
    AddClassificationComponent,
    AddIdentificationComponent,
    AddEditCreditCardComponent,
    AddEditBankAccountComponent,
    PartyNoteComponent,
    PartyContentComponent,
    HasPermissionDirective,
    AppCanManageDirective,
    AppCanApproveDirective,
  ] // So other modules can use it
})
export class SharedModule { }

import { Component, ViewChild, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { OrderRequest } from '../order-window/order-request';
import { Router } from '@angular/router';
import { AdminService } from '../admin/admin.service';
import { Ng2SmartTableModule, LocalDataSource } from 'ng2-smart-table';

/**
 * This class represents the lazy loaded ModalComponent.
 */
@Component({
    moduleId: module.id,
    selector: 'mm-edit-modal',
    templateUrl: 'edit-modal.component.html',
    styleUrls: ['create-modal.component.css'],
})
export class EditModalComponent implements OnInit {

    //orderRequests: OrderRequest[] = [];
    userDetails: FormGroup;
    source: LocalDataSource;
    //@Input() orderRequest: OrderRequest;

    @ViewChild('modal')
    modal: EditModalComponent;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private adminService: AdminService
    ) {
     }

    /**
     * initialising form group
     * @memberOf OrderWindowComponent
     */
    ngOnInit(): void {
        //console.log(this.orderRequest);
        //console.log('From edit modal component: ' + JSON.stringify(this.orderRequest));
        this.userDetails = this.fb.group({
            tel: [''],
            location: [''],
            fullname: [''],
            watel: [''],
            mail: [''],
            uFile: [''],
            manual: [''],
            termsAccepted: [''],
            confirmationId: ['']
        });
    }

    /**
     * function to open the modal window
     * @memberOf OrderWindowComponent
     */
    open(size: string) {
        let data = this.adminService.getDetails();
        this.userDetails = this.fb.group({
            id:[data.id],
            tel: [data.tel],
            location: [data.location],
            fullname: [data.fullname],
            watel: [data.watel],
            mail: [data.mail],
            uFile: [data.uFile],
            manual: [data.manual],
            termsAccepted: [data.termsAccepted],
            confirmationId: [data.confirmationId]
        });
        this.modal.open(size);
    }

    /**
     * sends a request to the service to create a new entry.
     * @param {{ value: OrderRequest, valid: boolean }} { value, valid }
     * @memberOf OrderWindowComponent
     */
    onSubmit({ value, valid }: { value: OrderRequest, valid: boolean }) {
        this.edit({ value, valid });
        this.modal.close();
    }

    /**
     * function to close the modal window
     * @memberOf OrderWindowComponent
     */
    close() {
        this.modal.close();
    }

    /**
     * adds a new entry into the table
     * @param {{ value: OrderRequest, valid: boolean }} { value, valid }
     * @returns {void}
     * @memberOf OrderWindowComponent
     */
    edit({ value, valid }: { value: OrderRequest, valid: boolean }): void {
        //console.log('This is in edit function: ' + value + 'and: ' + JSON.stringify(value));
        let result = JSON.stringify(value);
        if (!result) {
            return;
        }
        this.adminService.update(value)
            .then(() => null);
    }
}

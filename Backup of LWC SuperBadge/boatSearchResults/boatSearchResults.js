// import { api, LightningElement, track, wire } from 'lwc';
// import { publish, MessageContext } from 'lightning/messageService';
// import { ShowToastEvent } from 'lightning/platformShowToastEvent';
// import { refreshApex } from '@salesforce/apex';

// import getBoats from '@salesforce/apex/BoatDataService.getBoats';
// import updateBoatList from '@salesforce/apex/BoatDataService.updateBoatList';
// import BOATMC from '@salesforce/messageChannel/BoatMessageChannel__c';

// const SUCCESS_TITLE = 'Success';
// const MESSAGE_SHIP_IT = 'Ship it!';
// const SUCCESS_VARIANT = 'success';
// const ERROR_TITLE = 'Error';
// const ERROR_VARIANT = 'error';

// export default class BoatSearchResults extends LightningElement {
//     debugger;
//     @api
//     selectedBoatId;
//     columns = [
//         { label: 'Name', fieldName: 'Name', editable: true },
//         { label: 'Length', fieldName: 'Length__c', type: 'number'},
//         { label: 'Price', fieldName: 'Price__c', type: 'currency'},
//         { label: 'Description', fieldName: 'Description__c'},        
//     ];
//     boatTypeId = '';
//     @track
//     boats;
//     isLoading = false;
//     @track
//     draftValues = [];
  
//     // wired message context
//     @wire(MessageContext)
//     messageContext;

//     // @wire(getBoats, {boatTypeId: '$boatTypeId'})
//     // wiredBoats({data, error}) {
//     //     if (data) {
//     //         this.boats = data;
//     //     } else if (error) {
//     //         console.log('data.error')
//     //         console.log(error)
//     //     }
//     // }
//     @wire(getBoats, {boatTypeId: '$boatTypeId'})
//     boats;

//     @api
//     searchBoats(boatTypeId) {
//         debugger;
//         this.isLoading = true;
//         this.notifyLoading(this.isLoading);
//         this.boatTypeId = boatTypeId;
//     }
  
//     // this public function must refresh the boats asynchronously
//     // uses notifyLoading
//     @api
//     async refresh() {
//         this.isLoading = true;
//         this.notifyLoading(this.isLoading);      
//         await refreshApex(this.boats);
//         this.isLoading = false;
//         this.notifyLoading(this.isLoading);
//     }
  
//     // this function must update selectedBoatId and call sendMessageService
//     updateSelectedTile(event) {
//         this.selectedBoatId = event.detail.boatId;
//         this.sendMessageService(this.selectedBoatId);
//     }
  
//     // Publishes the selected boat Id on the BoatMC.
//     sendMessageService(boatId) { 
//         // explicitly pass boatId to the parameter recordId
//         publish(this.messageContext, BOATMC, { recordId: boatId });
//     }
  
//     // The handleSave method must save the changes in the Boat Editor
//     // passing the updated fields from draftValues to the 
//     // Apex method updateBoatList(Object data).
//     // Show a toast message with the title
//     // clear lightning-datatable draft values
//     handleSave(event) {
//         // notify loading
//         const updatedFields = event.detail.draftValues;
//         // Update the records via Apex
//         updateBoatList({data: updatedFields})
//         .then(result => {
//             const toast = new ShowToastEvent({
//                 title: SUCCESS_TITLE,
//                 message: MESSAGE_SHIP_IT,
//                 variant: SUCCESS_VARIANT,
//             });
//             this.dispatchEvent(toast);
//             this.draftValues = [];
//             return this.refresh();
//         })
//         .catch(error => {
//             const toast = new ShowToastEvent({
//                 title: ERROR_TITLE,
//                 message: error.message,
//                 variant: ERROR_VARIANT,
//             });
//             this.dispatchEvent(toast);
//         })
//         .finally(() => {
            
//         });
//     }
//     // Check the current value of isLoading before dispatching the doneloading or loading custom event
//     notifyLoading(isLoading) {
//         if (isLoading) {
//             this.dispatchEvent(new CustomEvent('loading'));
//         } else {
//             this.dispatchEvent(CustomEvent('doneloading'));
//         }        
//     }
// }

import { LightningElement, wire, api, track } from 'lwc';
import getBoats from '@salesforce/apex/BoatDataService.getBoats';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { publish, MessageContext } from 'lightning/messageService';
import BoatMC from '@salesforce/messageChannel/BoatMessageChannel__c';

export default class boatSearchResults extends LightningElement {
    boatTypeId = '';
    @track boats;
    @track draftValues = [];
    selectedBoatId = '';
    isLoading = false;
    error = undefined;
    wiredBoatsResult;

    @wire(MessageContext) messageContext;

    columns = [
        { label: 'Name', fieldName: 'Name', type: 'text', editable: 'true'  },
        { label: 'Length', fieldName: 'Length__c', type: 'number', editable: 'true' },
        { label: 'Price', fieldName: 'Price__c', type: 'currency', editable: 'true' },
        { label: 'Description', fieldName: 'Description__c', type: 'text', editable: 'true' }
    ];

    @api
    searchBoats(boatTypeId) {
        this.isLoading = true;
        this.notifyLoading(this.isLoading);
        this.boatTypeId = boatTypeId;
    }

    @wire(getBoats, { boatTypeId: '$boatTypeId' })
    wiredBoats(result) {
        this.boats = result;
        if (result.error) {
            this.error = result.error;
            this.boats = undefined;
        }
        this.isLoading = false;
        this.notifyLoading(this.isLoading);
    }

    updateSelectedTile(event) {
        this.selectedBoatId = event.detail.boatId;
        this.sendMessageService(this.selectedBoatId);
    }

    handleSave(event) {
        this.notifyLoading(true);
       const recordInputs = event.detail.draftValues.slice().map(draft=>{
           const fields = Object.assign({}, draft);
           return {fields};
       });

       console.log(recordInputs);
       const promises = recordInputs.map(recordInput => updateRecord(recordInput));
       Promise.all(promises).then(res => {
           this.dispatchEvent(
               new ShowToastEvent({
                   title: SUCCESS_TITLE,
                   message: MESSAGE_SHIP_IT,
                   variant: SUCCESS_VARIANT
               })
           );
           this.draftValues = [];
           return this.refresh();
       }).catch(error => {
           this.error = error;
           this.dispatchEvent(
                new ShowToastEvent({
                    title: ERROR_TITLE,
                    message: CONST_ERROR,
                    variant: ERROR_VARIANT
                })
            );
            this.notifyLoading(false);
       }).finally(() => {
            this.draftValues = [];
        });
    }

    @api
    async refresh() {
        this.isLoading = true;
        this.notifyLoading(this.isLoading);
        await refreshApex(this.boats);
        this.isLoading = false;
        this.notifyLoading(this.isLoading);
    }


    notifyLoading(isLoading) {
        if (isLoading) {
            this.dispatchEvent(new CustomEvent('loading'));
        } else {
            this.dispatchEvent(CustomEvent('doneloading'));
        }
    }

     sendMessageService(boatId) {
        publish(this.messageContext, BoatMC, { recordId : boatId });
    }
}
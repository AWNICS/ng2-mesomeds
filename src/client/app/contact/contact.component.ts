import { Component, ViewChild, HostListener, OnInit } from '@angular/core';
import { NavbarComponent } from '../shared/navbar/navbar.component';

@Component({
    moduleId: module.id,
    selector: 'mm-contact',
    templateUrl: 'contact.component.html',
    styleUrls: ['contact.component.css']
})

export class ContactComponent implements OnInit {

    navIsFixed: boolean = false;

    @ViewChild(NavbarComponent) navbarComponent: NavbarComponent;

    ngOnInit() {
        window.scrollTo(0,0);
    }

    @HostListener('window:scroll', [])
    onWindowScroll() {
        let number = window.scrollY;
        if (number > 500) {
            this.navIsFixed = true;
            document.getElementById('myBtn').style.display = 'block';
        } else if (this.navIsFixed && number < 1000) {
            this.navIsFixed = false;
            document.getElementById('myBtn').style.display = 'none';
        }

        //for moving to next section and to show navbar
        if (number > 100) {
            this.navbarComponent.navbarColor(number, '#6960FF');
        } else {
            this.navbarComponent.navbarColor(number, 'transparent');
        }
    }

    sendMail() {
        console.log('Yet to write services');
    }

}

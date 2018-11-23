import { Component, ViewChild, ChangeDetectorRef, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { SharedService } from '../shared/services/shared.service';
import { SecurityService } from '../shared/services/security.service';
import { UserDetails } from '../shared/database/user-details';
import { DoctorProfiles } from '../shared/database/doctor-profiles';
import { ChatService } from '../chat/chat.service';
import { SocketService } from '../chat/socket.service';
const Chart = require('chart.js/dist/Chart.bundle.js');
import { Subject } from 'rxjs/Subject';

@Component({
    moduleId: module.id,
    selector: 'mm-doctor-dashboard',
    templateUrl: 'doctor-dashboard.component.html',
    styleUrls: ['doctor-dashboard.component.css']
})

export class DoctorDashboardComponent implements OnInit, OnDestroy {

    userId: number;
    @ViewChild(NavbarComponent) navbarComponent: NavbarComponent;
    @ViewChild('barChart') barChart: ElementRef;
    status: Array<Object> = ['online', 'offline', 'away', 'invisible'];
    selectedStatus: string;
    selectedUser: UserDetails;
    doctor: DoctorProfiles;
    doctorStore: any;
    doctorSchedule: any;
    qualifications: string = '';
    languages: string = '';
    consultationModes: string = '';
    locations: string = '';
    doctorId: number;
    picUrl: SafeResourceUrl;
    consultations: any[];
    patients: number;
    hideConsultations = false;
    earning: number;
    private unsubscribeObservables:any = new Subject();

    constructor(
        private ref: ChangeDetectorRef,
        private route: ActivatedRoute,
        private domSanitizer: DomSanitizer,
        private sharedService: SharedService,
        private securityService: SecurityService,
        private chatService: ChatService,
        private socketService: SocketService,
        private router: Router
    ) { }

    ngOnInit() {
        this.navbarComponent.navbarColor(0, '#6960FF');
        if (this.securityService.getCookie('userDetails')) {
            this.selectedUser = JSON.parse(this.securityService.getCookie('userDetails'));
        }
        this.doctorId = +this.route.snapshot.paramMap.get('id');// this is will give doctorId
        this.getConsultations(this.doctorId);
        if (!this.selectedUser) {
            this.router.navigate([`/login`]);
        } else {
            this.userId = this.selectedUser.id;
            if(window.localStorage.getItem('pageReloaded')) {
                console.log('Page Reloaded');
                this.socketService.connection(this.userId);
              }
            if (this.selectedUser.picUrl) {
                this.downloadPic(this.selectedUser.picUrl);
            } else {
                this.downloadAltPic(this.selectedUser.role);
            }
            this.getDoctorById(this.doctorId);
            this.getDoctorStore(this.doctorId);
            this.receiveDoctorStatus();
        }
        this.doctorSchedule = { 'status': 'online' };
        this.getConsutationDetails('today');
    }

    ngOnDestroy() {
        this.unsubscribeObservables.next();
        this.unsubscribeObservables.complete();
      }

    downloadPic(filename: string) {
        this.chatService.downloadFile(filename)
            .subscribe((res: any) => {
                res.onloadend = () => {
                    this.picUrl = this.domSanitizer.bypassSecurityTrustUrl(res.result);
                    this.ref.detectChanges();
                };
            });
    }

    downloadAltPic(role: string) {
        let fileName: string;
        if (role === 'bot') {
            fileName = 'bot.jpg';
        } else if (role === 'doctor') {
            fileName = 'doc.png';
        } else {
            fileName = 'user.png';
        }
        this.chatService.downloadFile(fileName)
            .subscribe((res: any) => {
                res.onloadend = () => {
                    this.picUrl = this.domSanitizer.bypassSecurityTrustUrl(res.result);
                    this.ref.detectChanges();
                };
            });
    }

    chart(chartDetails: any) {
        var ctx = this.barChart.nativeElement.getContext('2d');
        var horizontalBarChartData = {
            labels: ['9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm'],
            datasets: [{
                label: 'Follow Ups',
                backgroundColor: '#9690FD',
                data: chartDetails.followUps
            }, {
                label: 'New Patients',
                backgroundColor: '#C4C1FF',
                data: chartDetails.newConsultations
            }]
        };
        var barChart = new Chart(ctx, {
            type: 'horizontalBar',
            data: horizontalBarChartData,
            options: {
                elements: {
                    rectangle: {
                        borderWidth: 1,
                    }
                },
                responsive: true,
                legend: {
                    position: 'right',
                },
                title: {
                    display: false,
                    text: 'Chart.js Horizontal Bar Chart'
                }
            }
        });
    }

    getDoctorById(doctorId: number) {
        this.sharedService.getDoctorById(doctorId)
            .subscribe(doctor => {
                this.doctor = doctor.doctorDetails;
            });
    }

    getDoctorStore(doctorId: number) {
        this.sharedService.getDoctorStore(doctorId)
            .subscribe(doctorStore => {
                this.getStores(doctorStore, doctorId);
            });
    }

    //update status in doctor schedule
    updateStatus(status: string) {
        // this.sharedService.updateStatus(status, this.doctorId)
        //     .subscribe(res => {
        //         this.doctorSchedule.status = status;
        //     });
        this.socketService.doctorStatusUpdate(this.selectedUser.id,status);
    }
    receiveDoctorStatus() {
        this.socketService.receiveDoctorStatus()
        .takeUntil(this.unsubscribeObservables)
        .subscribe((status)=> {
            this.doctorSchedule.status = status;
        });
    }

    getStores(stores: any, doctorId: number) {
        this.qualifications = '';
        this.languages = '';
        this.consultationModes = '';
        this.locations = '';
        for (let i = 0; i < stores.length; i++) {
            if (stores[i].type === 'Qualification' && stores[i].userId === doctorId) {
                this.qualifications += stores[i].value;
            }
            if (stores[i].type === 'Language' && stores[i].userId === doctorId) {
                this.languages += stores[i].value;
            }
            if (stores[i].type === 'Consultation mode' && stores[i].userId === doctorId) {
                this.consultationModes += stores[i].value;
            }
            if (stores[i].type === 'Location' && stores[i].userId === doctorId) {
                this.locations += stores[i].value;
            }
        }
    }

    getConsultations(doctorId: number) {
        let page = 1;
        let size = 20;
        this.sharedService.getConsultationsByDoctorId(doctorId, page, size)
            .subscribe((res) => {
                if (res.visitorAppointments.length === 0) {
                    this.hideConsultations = true;
                } else {
                    this.chart(res.chartDetails);
                    this.consultations = res.visitorAppointments;
                }
            });
    }

    //for getting the consultation history
    getConsutationDetails(str: string) {
        this.sharedService.getConsutationDetails(this.doctorId)
            .subscribe((res) => {
                if (str === 'today') {
                    this.patients = res.noOfPatients.today;
                    this.earning = res.earning.today;
                } else if (str === 'week') {
                    this.patients = res.noOfPatients.week;
                    this.earning = res.earning.week;
                } else if (str === 'month') {
                    this.patients = res.noOfPatients.month;
                    this.earning = res.earning.month;
                } else {
                    this.patients = 0;
                    this.earning = 0;
                }
            });
    }

    //redirect to particular consultation details
    consultationDetail(consultation: any) {
        this.router.navigate([`/consultation/${consultation.doctorId}?consultationId=${consultation.id}`]);
    }
}

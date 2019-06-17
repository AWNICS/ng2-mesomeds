import { Component, OnInit, ChangeDetectorRef, AfterViewInit, AfterViewChecked, ViewChild, ElementRef,
     OnChanges, OnDestroy, Input } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../chat/socket.service';
import { SecurityService } from '../services/security.service';
import { ChatService } from '../../chat/chat.service';
import { UserDetails } from '../database/user-details';
import { SharedService } from '../services/shared.service';
import { Notification } from '../database/notification';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-navbar',
    templateUrl: 'navbar.component.html',
    styleUrls: ['navbar.component.css']
})

export class NavbarComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
    loggedIn = false;
    user: UserDetails;
    picUrl: string;
    notifications: Notification[] = [];
    notify = false;
    page: any = 1;
    notificationQuerying: Boolean = false;
    emptyNotifications: Boolean = false;
    @ViewChild('navbar') navbar: ElementRef;
    @ViewChild('notificationDropdown') notificationDropdown: ElementRef;
    @ViewChild('bell') bell: ElementRef;
    unreadNotifications = 0;
    unreadMessageCount = 0;
    @Input() set unreadCount(count: number) {
        this.unreadMessageCount = count;
        console.log('unreadcount from navbar' + this.unreadMessageCount);
    }
    private unsubscribeObservables: any = new Subject();

    constructor(
        private ref: ChangeDetectorRef,
        private socketService: SocketService,
        private securityService: SecurityService,
        private sharedService: SharedService,
        private chatService: ChatService,
        private router: Router) {
    }

    ngOnInit() {
        this.loggedIn = this.securityService.getLoginStatus();
        if (this.loggedIn === true) {
            this.user = JSON.parse(this.securityService.getCookie('userDetails'));
            if (this.user && this.user.role !== 'admin') {
                this.getNotifications(this.user);
                this.getLatestNotification();
                const initialLoad = this.sharedService.getNavbarLoad();
                this.receiveMessageFromSocket();
                this.receiveSyncCount();
                if (initialLoad) {
                    this.getUnreadMessages();
                } else {
                    this.unreadMessageCount = this.sharedService.getUnreadCount();
                }
                if (this.user.role === 'doctor') {
                    this.consultationStatus();
                }
                if (this.user.picUrl) {
                    this.downloadPic(this.user.picUrl);
                } else {
                    this.downloadAltPic(this.user.role);
                }
            }
        }
    }

    ngAfterViewInit() {
        this.checkWindowVisibility();
        window.addEventListener('unload', () => {
            window.localStorage.setItem('pageReloaded', 'true');
        });
        //     if ( !this.billById ) {
        //     if (Math.max(event.target.documentElement.scrollTop / (event.target.documentElement.scrollHeight - window.innerHeight) 
        //     * 100) > 94 && !this.emptyBills && this.notquerying) {
        //     this.page = this.page + 1;
        //     this.getBills(this.page);
        //     }
        // }
    }

    ngAfterViewChecked() {
        this.loggedIn = this.securityService.getLoginStatus();
    }

    ngOnDestroy() {
        this.unsubscribeObservables.next();
        this.unsubscribeObservables.complete();
        this.sharedService.setUnreadCount(this.unreadMessageCount);
    }
    trackScroll(event) {
        if (Math.max(event.target.scrollTop / (event.target.scrollHeight - event.target.offsetHeight) * 100) > 94
        && !this.notificationQuerying && !this.emptyNotifications) {
            this.page += 1;
            this.getNotifications(this.user);
        }
    }
  receiveMessageFromSocket() {
    this.socketService.receiveMessages()
    .pipe(takeUntil(this.unsubscribeObservables))
      .subscribe((msg: any) => {
        if (msg.senderId !== this.user.id && !this.router.url.match(/chat/)) {
            this.unreadMessageCount++;
        }
      });
  }

    getUnreadMessages() {
        this.chatService.getGroups(this.user.id)
        .pipe(takeUntil(this.unsubscribeObservables))
          .subscribe((groups) => {
              if(groups){
              groups.activeGroups.map((activeGroup: any) => {
                this.unreadMessageCount += activeGroup.unreadCount;
              });
              groups.inactiveGroups.map((inactiveGroup: any) => {
                this.unreadMessageCount += inactiveGroup.unreadCount;
              });
              this.sharedService.setUnreadCount(this.unreadMessageCount);
            }
          });
    }

    checkWindowVisibility() {
        window.addEventListener('focus', () => {
            this.sharedService.setWindowVisibility(false);
        });
        window.addEventListener('blur', () => {
            this.sharedService.setWindowVisibility(true);
        });
    }

    downloadPic(filename: string) {
        console.log(filename);
        this.chatService.downloadFile(filename)
        .pipe(takeUntil(this.unsubscribeObservables))
            .subscribe((res: any) => {
                res.onloadend = () => {
                    this.picUrl = res.result;
                    this.ref.markForCheck();
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
        .pipe(takeUntil(this.unsubscribeObservables))
            .subscribe((res: any) => {
                res.onloadend = () => {
                    this.picUrl = res.result;
                    this.ref.markForCheck();
                };
            });
    }

    logout() {
        this.securityService.setLoginStatus(false);
        this.socketService.logout(this.user.id);
        this.securityService.deleteCookie('userDetails');
        this.securityService.deleteCookie('token');
        this.sharedService.setToken();
        this.router.navigateByUrl('/login');
        this.socketService.setSocketStatus(false);
        this.sharedService.setNavbarLoad(true);
        console.log('Made socketConnected as false');
    }
    navbarColor(number: number, color: string) {
        if (number > 800) {
            this.navbar.nativeElement.style.backgroundColor = color;
        } else {
            this.navbar.nativeElement.style.backgroundColor = color;
        }
    }
    receiveSyncCount() {
        this.socketService.receiveCountSync()
        .pipe(takeUntil(this.unsubscribeObservables))
        .subscribe((data: any) => {
            this.unreadMessageCount = data.count;
            this.ref.detectChanges();
            console.log('received sync count' + data.count);
            console.log(this.unreadMessageCount);
        });
    }

    getNotifications(user: UserDetails) {
        const size = 10;
        this.notificationQuerying = true;
        this.sharedService.getNotificationsByUserId(user.id, this.page, size)
        .pipe(takeUntil(this.unsubscribeObservables))
            .subscribe((notifications) => {
                this.notificationQuerying = false;
                console.log('Notifications received all');
                console.log(notifications);
                if (notifications.length >= 1) {
                    this.notify = true;
                    // reverse to show the items from latest to last later will have to change the logic in db itself
                    notifications.map((notification: any) => {
                        this.notifications.push(notification);
                        if (notification.status !== 'read') {
                            this.unreadNotifications++;
                        }
                    });
                    console.log(this.unreadNotifications);
                    this.ref.detectChanges();
                }
                if (notifications.length < 10) {
                    this.emptyNotifications = true;
                }
            });
    }

    startConsultation(notification: Notification) {
        if (notification.status === 'created') {
            this.unreadNotifications--;
        }
        this.socketService.userAdded(this.user, notification);
        this.bell.nativeElement.classList.remove('animated');
    }

    getLatestNotification() {
        this.socketService.consultNotification()
        .pipe(takeUntil(this.unsubscribeObservables))
            .subscribe((data) => {
                if (data) {
                    // unshift to add the item to start of array
                    this.notifications.unshift(data.notification);
                    this.unreadNotifications++;
                    this.notify = true;
                    this.bell.nativeElement.classList.add('animated');
                    this.sharedService.playsound();
                    this.ref.markForCheck();
                }
            });
    }

    consultationStatus() {
        this.socketService.receiveUserAdded()
        .pipe(takeUntil(this.unsubscribeObservables))
            .subscribe((response) => {
                console.log('Received user added in navbar');
                this.sharedService.doctorAddedToGroup(response);
                response.group.phase = 'active';
                this.sharedService.setGroup(response.group);
                // this.getNotifications(this.user);
                /// thisis to reload the page if it is chat component
                if (this.router.url.match(/chat/)) {
                    this.router.navigateByUrl('/', {skipLocationChange: true}).then((a) => {
                        this.router.navigate([`/chat/${response.doctorId}`]);
                });
                } else {
                    this.router.navigate([`/chat/${response.doctorId}`]);
                }
            });
    }
    clearNotifications() {
        this.sharedService.clearNotifications(this.user.id).subscribe((res) => {
            if (res.status === 'success') {
                this.notifications = [];
                this.unreadNotifications = 0;
                this.notify = false;
            }
        })
    }
}

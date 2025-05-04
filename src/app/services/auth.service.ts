import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { User } from '../models/user.model';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();
  private isBrowser: boolean;
  private storageKey = 'youtubeEditor_currentUser'; // Use a unique key for storage
  
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { 
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Load user from storage immediately on service initialization
    this.loadUserFromStorage();
    
    // Set up event listener for storage changes (for multi-tab support)
    if (this.isBrowser) {
      window.addEventListener('storage', (event) => {
        if (event.key === this.storageKey) {
          this.loadUserFromStorage();
        }
      });
    }
  }

  // Load user from storage
  private loadUserFromStorage(): void {
    if (this.isBrowser) {
      try {
        const storedUser = localStorage.getItem(this.storageKey);
        if (storedUser) {
          const user = JSON.parse(storedUser);
          this.currentUserSubject.next(user);
          console.log('User loaded from storage:', user.username);
        }
      } catch (error) {
        console.error('Error loading user from storage:', error);
        localStorage.removeItem(this.storageKey);
      }
    }
  }

  public get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string): Observable<User> {
    // In a real app, this would be an API call
    // For demo purposes, create a mock user
    const user: User = {
      id: '1',
      username: username,
      email: `${username}@example.com`,
      token: 'mock-jwt-token'
    };

    // Store user details in localStorage to keep user logged in (only in browser)
    if (this.isBrowser) {
      localStorage.setItem(this.storageKey, JSON.stringify(user));
    }
    this.currentUserSubject.next(user);
    
    return of(user);
  }

  logout(): void {
    // Remove user from local storage (only in browser)
    if (this.isBrowser) {
      localStorage.removeItem(this.storageKey);
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    // First check the subject
    if (this.currentUserSubject.value) {
      return true;
    }
    
    // If not in subject, try loading from storage
    if (this.isBrowser) {
      const storedUser = localStorage.getItem(this.storageKey);
      if (storedUser) {
        try {
          this.currentUserSubject.next(JSON.parse(storedUser));
          return true;
        } catch (e) {
          console.error('Error parsing stored user:', e);
          localStorage.removeItem(this.storageKey);
        }
      }
    }
    
    return false;
  }
}

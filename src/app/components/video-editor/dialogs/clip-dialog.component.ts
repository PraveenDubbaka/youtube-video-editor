import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-clip-dialog',
  template: `
    <h2 mat-dialog-title>Create Clip</h2>
    <div mat-dialog-content>
      <form [formGroup]="clipForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Clip Title</mat-label>
          <input matInput formControlName="title" placeholder="My Clip">
        </mat-form-field>
        
        <div class="time-inputs">
          <mat-form-field appearance="outline">
            <mat-label>Start Time (seconds)</mat-label>
            <input matInput formControlName="startTime" type="number" min="0">
            <mat-hint>{{formatTime(clipForm.get('startTime')?.value)}}</mat-hint>
          </mat-form-field>
          
          <mat-form-field appearance="outline">
            <mat-label>End Time (seconds)</mat-label>
            <input matInput formControlName="endTime" type="number" min="0">
            <mat-hint>{{formatTime(clipForm.get('endTime')?.value)}}</mat-hint>
          </mat-form-field>
        </div>
        
        <div *ngIf="clipForm.errors?.['endTimeBeforeStart']" class="error-message">
          End time must be after start time
        </div>
      </form>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" [disabled]="clipForm.invalid" (click)="onSave()">
        Create Clip
      </button>
    </div>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 15px;
    }
    .time-inputs {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
    }
    .time-inputs mat-form-field {
      flex: 1;
    }
    .error-message {
      color: #f44336;
      font-size: 0.75rem;
      margin-top: -10px;
      margin-bottom: 15px;
    }
  `],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class ClipDialogComponent {
  clipForm: FormGroup;
  
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ClipDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {startTime: number, endTime: number, title: string}
  ) {
    console.log('ClipDialogComponent initialized with data:', data);
    this.clipForm = this.fb.group({
      title: [data.title, Validators.required],
      startTime: [data.startTime, [Validators.required, Validators.min(0)]],
      endTime: [data.endTime, [Validators.required, Validators.min(0)]]
    }, { validators: this.validateTimes });
  }
  
  validateTimes(formGroup: FormGroup) {
    const startTime = formGroup.get('startTime')?.value;
    const endTime = formGroup.get('endTime')?.value;
    
    if (startTime >= endTime) {
      return { endTimeBeforeStart: true };
    }
    
    return null;
  }
  
  onCancel(): void {
    console.log('ClipDialog: Cancel clicked');
    this.dialogRef.close();
  }
  
  onSave(): void {
    console.log('ClipDialog: Save clicked with form value:', this.clipForm.value);
    if (this.clipForm.valid) {
      this.dialogRef.close(this.clipForm.value);
    }
  }
  
  formatTime(seconds: number): string {
    if (!seconds && seconds !== 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
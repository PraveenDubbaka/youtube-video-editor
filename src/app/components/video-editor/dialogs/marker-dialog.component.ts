import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-marker-dialog',
  template: `
    <h2 mat-dialog-title>Add Marker</h2>
    <div mat-dialog-content>
      <form [formGroup]="markerForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Marker Label</mat-label>
          <input matInput formControlName="label" placeholder="Marker name">
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Time (seconds)</mat-label>
          <input matInput formControlName="time" type="number" min="0">
          <mat-hint>Current position: {{formatTime(data.time)}}</mat-hint>
        </mat-form-field>
      </form>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" [disabled]="markerForm.invalid" (click)="onSave()">
        Save
      </button>
    </div>
  `,
  styles: [`
    .full-width {
      width: 100%;
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
export class MarkerDialogComponent {
  markerForm: FormGroup;
  
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<MarkerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {time: number, label: string}
  ) {
    console.log('MarkerDialogComponent constructor called', data);
    this.markerForm = this.fb.group({
      label: [data.label, Validators.required],
      time: [data.time, [Validators.required, Validators.min(0)]]
    });
  }
  
  onCancel(): void {
    console.log('MarkerDialog: Cancel clicked');
    this.dialogRef.close();
  }
  
  onSave(): void {
    console.log('MarkerDialog: Save clicked with form value:', this.markerForm.value);
    if (this.markerForm.valid) {
      this.dialogRef.close(this.markerForm.value);
    }
  }
  
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { VideoClip } from '../../../models/video.model';

@Component({
  selector: 'app-effect-dialog',
  template: `
    <h2 mat-dialog-title>Add Effect</h2>
    <div mat-dialog-content>
      <form [formGroup]="effectForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Select Clip</mat-label>
          <mat-select formControlName="clipId">
            <mat-option *ngFor="let clip of data.clips" [value]="clip.id">
              {{clip.title}} ({{formatTime(clip.startTime)}} - {{formatTime(clip.endTime)}})
            </mat-option>
          </mat-select>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Effect Type</mat-label>
          <mat-select formControlName="type" (selectionChange)="onEffectTypeChange()">
            <mat-option value="filter">Filter</mat-option>
            <mat-option value="transition">Transition</mat-option>
            <mat-option value="text">Text</mat-option>
            <mat-option value="audio">Audio</mat-option>
          </mat-select>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width" *ngIf="effectForm.get('type')?.value">
          <mat-label>Effect</mat-label>
          <mat-select formControlName="name">
            <mat-option *ngFor="let effect of availableEffects" [value]="effect.name">
              {{effect.name}}
            </mat-option>
          </mat-select>
        </mat-form-field>
        
        <div class="time-inputs" *ngIf="effectForm.get('clipId')?.value">
          <mat-form-field appearance="outline">
            <mat-label>Start Time (seconds)</mat-label>
            <input matInput formControlName="startTime" type="number" min="0">
            <mat-hint>{{formatTime(effectForm.get('startTime')?.value)}}</mat-hint>
          </mat-form-field>
          
          <mat-form-field appearance="outline">
            <mat-label>End Time (seconds)</mat-label>
            <input matInput formControlName="endTime" type="number" min="0">
            <mat-hint>{{formatTime(effectForm.get('endTime')?.value)}}</mat-hint>
          </mat-form-field>
        </div>
        
        <div *ngIf="effectForm.errors?.['endTimeBeforeStart']" class="error-message">
          End time must be after start time
        </div>
      </form>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" [disabled]="effectForm.invalid" (click)="onSave()">
        Add Effect
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
    MatInputModule,
    MatSelectModule
  ]
})
export class EffectDialogComponent {
  effectForm: FormGroup;
  availableEffects: any[] = [];
  selectedClip: VideoClip | null = null;
  
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EffectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {clips: VideoClip[], effectTypes: {[key: string]: any[]}}
  ) {
    console.log('EffectDialogComponent initialized with data:', data);
    this.effectForm = this.fb.group({
      clipId: ['', Validators.required],
      type: ['', Validators.required],
      name: ['', Validators.required],
      startTime: [0, [Validators.required, Validators.min(0)]],
      endTime: [0, [Validators.required, Validators.min(0)]],
      settings: [{}, Validators.required]
    }, { validators: this.validateTimes });
    
    // Watch for clip selection to update time range
    this.effectForm.get('clipId')?.valueChanges.subscribe(clipId => {
      console.log('Clip selection changed to:', clipId);
      this.selectedClip = this.data.clips.find(clip => clip.id === clipId) || null;
      
      if (this.selectedClip) {
        console.log('Selected clip details:', this.selectedClip);
        this.effectForm.patchValue({
          startTime: this.selectedClip.startTime,
          endTime: this.selectedClip.endTime
        });
      }
    });
  }
  
  onEffectTypeChange(): void {
    const type = this.effectForm.get('type')?.value;
    console.log('Effect type changed to:', type);
    this.availableEffects = this.data.effectTypes[type] || [];
    console.log('Available effects updated:', this.availableEffects);
    this.effectForm.patchValue({ name: '' });
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
    console.log('EffectDialog: Cancel clicked');
    this.dialogRef.close();
  }
  
  onSave(): void {
    console.log('EffectDialog: Save clicked with form value:', this.effectForm.value);
    if (this.effectForm.valid) {
      this.dialogRef.close({
        clipId: this.effectForm.get('clipId')?.value,
        type: this.effectForm.get('type')?.value,
        name: this.effectForm.get('name')?.value,
        startTime: this.effectForm.get('startTime')?.value,
        endTime: this.effectForm.get('endTime')?.value,
        settings: this.effectForm.get('settings')?.value
      });
    }
  }
  
  formatTime(seconds: number): string {
    if (!seconds && seconds !== 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
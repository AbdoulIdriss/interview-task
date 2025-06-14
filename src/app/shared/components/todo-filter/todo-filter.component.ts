import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ButtonModule } from 'primeng/button';
import { OverlayPanelModule } from 'primeng/overlaypanel'; 
import { Priority } from '../../../models/todo';

export interface TodoFilter {
  selectedPriorities: Priority[];
  showCompleted: boolean;
  showInProgress: boolean;
}

@Component({
  selector: 'app-todo-filter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MultiSelectModule,
    InputSwitchModule,
    ButtonModule,
    OverlayPanelModule, 
  ],
  templateUrl: './todo-filter.component.html',
  styles: [`
    .filter-dropdown-container {

    }
    .filter-panel-content {
      padding: 1rem; 
    }
    .filter-panel-content .field {
      margin-bottom: 1rem; 
    }
    .filter-panel-content label {
      font-weight: bold;
      color: var(--text-color-secondary);
      display: block; /* Ensure label takes full width */
    }
    .filter-panel-content .p-multiselect,
    .filter-panel-content .p-inputswitch {
        width: 100%;
    }
    .filter-panel-content .p-button {
        margin-top: 1rem;
    }
  `]
})
export class TodoFilterComponent implements OnInit {
  @Input() allPriorities: { label: string; value: Priority }[] = [];

  @Output() filterChange = new EventEmitter<TodoFilter>();

  selectedPriorities: Priority[] = [];
  showCompletedTasks: boolean = false;
  showInProgressTasks: boolean = false;

  constructor() { }

  ngOnInit(): void {
    this.emitFilterChange();
  }

  onFilterValueChange(): void {
    this.emitFilterChange();
  }

  emitFilterChange(): void {
    const filters: TodoFilter = {
      selectedPriorities: this.selectedPriorities,
      showCompleted: this.showCompletedTasks,
      showInProgress: this.showInProgressTasks,
    };
    this.filterChange.emit(filters);
  }

  clearFilters(): void {
    this.selectedPriorities = [];
    this.showCompletedTasks = false;
    this.showInProgressTasks = false;
    this.emitFilterChange();
  }
}
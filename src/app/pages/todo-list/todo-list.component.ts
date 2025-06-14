import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Todo, Priority, Label } from '../../models/todo';
import { Person } from '../../models/person';
import { TodoService } from '../../services/todo.service';
import { PersonService } from '../../services/person.service';

import { TableModule, Table } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { CalendarModule } from 'primeng/calendar';
import { MultiSelectModule } from 'primeng/multiselect';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { CheckboxModule } from 'primeng/checkbox';
import { InputSwitchModule } from 'primeng/inputswitch';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { TodoFilter, TodoFilterComponent } from '../../shared/components/todo-filter/todo-filter.component';

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

interface AutoTableHookData {
    pageNumber: number;
    pageCount: number;
    settings: {
        margin: {
            left: number;
            right: number;
            top: number;
            bottom: number;
        };

    };
    table: any; 
    cursor: { x: number, y: number };

}

interface Column {
    field: string;
    header: string;
    customExportHeader?: string;
}

interface ExportColumn {
    title: string;
    dataKey: string;
}

@Component({
    selector: 'app-todo-list',
    templateUrl: './todo-list.component.html',
    standalone: true,
    imports: [
        TableModule,
        DialogModule,
        RippleModule,
        ButtonModule,
        ToastModule,
        ToolbarModule,
        ConfirmDialogModule,
        InputTextModule,
        CommonModule,
        DropdownModule,
        TagModule,
        FormsModule,
        IconFieldModule,
        InputIconModule,
        CalendarModule,
        MultiSelectModule,
        AutoCompleteModule,
        CheckboxModule,
        TodoFilterComponent,
        InputSwitchModule,
    ],
    providers: [MessageService, ConfirmationService, TodoService, PersonService],
    styles: [
        `:host ::ng-deep .p-dialog .todo-details {
            width: 100%;
            margin: 0 auto 2rem auto;
            display: block;
        }
        :host ::ng-deep .p-error {
            color: var(--red-500);
        }
        `,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoListComponent implements OnInit {

    todoDialog: boolean = false;

    allTodos: Todo[] = []; // Stores all fetched todos
    filteredTodos: Todo[] = [];

    todo: Todo = this.newTodo();

    selectedTodos: Todo[] | null = null;

    submitted: boolean = false;

    allPrioritiesForFilter: { label: string; value: Priority }[];
    
    availableLabels: { label: string; value: Label }[];
    persons: Person[] = [];
    filteredPersons: Person[] = [];

    currentFilters: TodoFilter = {
        selectedPriorities: [],
        showCompleted: false,
        showInProgress: false,
    };

    @ViewChild('dt') dt!: Table;

    cols!: Column[];

    exportColumns!: ExportColumn[];

    constructor(
        private todoService: TodoService,
        private personService: PersonService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cd: ChangeDetectorRef
    ) {
        // Initialize allPrioritiesForFilter here
        this.allPrioritiesForFilter = Object.values(Priority).map(p => ({ label: p, value: p }));
        this.availableLabels = Object.values(Label).map(l => ({ label: l, value: l }));
    }

    exportCSV() {
        this.dt.exportCSV();
    }

    ngOnInit() {
        this.loadTodos();
        this.loadPersons();

        this.cols = [
            { field: 'id', header: 'ID' },
            { field: 'title', header: 'Title' },
            { field: 'person.name', header: 'Assigned To' },
            { field: 'startDate', header: 'Start Date' },
            { field: 'endDate', header: 'End Date' },
            { field: 'priority', header: 'Priority' },
            { field: 'labels', header: 'Labels' },
            { field: 'status', header: 'Status' },
        ];

        this.exportColumns = this.cols.map((col) => ({ title: col.header, dataKey: col.field }));
    }

    exportExcel() {
      import('xlsx').then(xlsx => {
          const dataToExport = this.filteredTodos.map(todo => { // Export filtered todos
              return {
                  ID: todo.id,
                  Title: todo.title,
                  'Assigned To': todo.person?.name || '',
                  'Start Date': todo.startDate,
                  'End Date': todo.endDate || '',
                  Priority: todo.priority,
                  Labels: todo.labels.join(', '),
                  Status: this.getTaskStatus(todo)
              };
          });

          const worksheet = xlsx.utils.json_to_sheet(dataToExport);
          const workbook = { Sheets: { 'Todos': worksheet }, SheetNames: ['Todos'] };
          const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
          this.saveAsExcelFile(excelBuffer, 'todo_list');
      });
    }

    saveAsExcelFile(buffer: any, fileName: string): void {
      import('file-saver').then(FileSaver => {
          const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
          const EXCEL_EXTENSION = '.xlsx';
          const data: Blob = new Blob([buffer], {
              type: EXCEL_TYPE
          });
          FileSaver.saveAs(data, fileName + '_excel_' + new Date().getTime() + EXCEL_EXTENSION);
      });
    }

    async exportPdf() {
        const data = document.getElementById('pdfContent');
        if (data) {
            html2canvas(data, {
                scale: 2,
                useCORS: true
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgWidth = 208;
                const pageHeight = 295;
                const imgHeight = canvas.height * imgWidth / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;
                pdf.addImage(imgData, 'PNG', 1, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 1, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                pdf.save('todo_list.pdf');
            });
        } else {
            console.error("Element with ID 'pdfContent' not found for PDF export.");
            this.messageService.add({
                severity: 'error',
                summary: 'Export Error',
                detail: 'PDF content not found. Please ensure the #pdfContent div is present.',
                life: 5000,
            });
        }
    }

    exportPdfWithAutoTable() {
        console.log('--- PDF export function was called! ---');
        const getProperty = (obj: any, path: string) => {
            if (path === 'status') {
                return this.getTaskStatus(obj);
            }
            return path.split('.').reduce((p, c) => p && p[c], obj);
        }
    
        const doc = new jsPDF();
    
        const head = [this.cols.map(col => col.header)];
        const body = this.filteredTodos.map(todo => { // Export filtered todos
            return this.cols.map(col => {
                if (col.field === 'labels') {
                    return (todo.labels || []).join(', ');
                }
                const value = getProperty(todo, col.field);
                return value !== null && value !== undefined ? value : '';
            });
        });
    
        autoTable(doc, {
          head: head,
          body: body,
          startY: 20,
          theme: 'striped',
          headStyles: { fillColor: [50, 100, 200], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
          columnStyles: {
              0: { cellWidth: 15 },
              1: { cellWidth: 40 },
              2: { cellWidth: 30 },
              3: { cellWidth: 25 },
              4: { cellWidth: 25 },
              5: { cellWidth: 20 },
              6: { cellWidth: 'auto' },
              7: { cellWidth: 25 },
          },
          didDrawPage: (data: any) => {
              doc.setFontSize(16);
              doc.text('Todo List Report', data.settings.margin.left, 10);
              doc.setFontSize(10);
              doc.text(`Date: ${new Date().toLocaleDateString('en-CA')}`, data.settings.margin.left, 16);
          }
      });
    
        doc.save('todo_list_report.pdf');
    }

    loadTodos() {
        this.todoService.getAllTodo().subscribe({
            next: (data) => {
                this.allTodos = data; 
                this.applyFilters();
                this.cd.markForCheck();
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load todos.',
                    life: 3000,
                });
                console.error('Error loading todos:', err);
            },
        });
    }

    loadPersons() {
        this.personService.getAllPerson().subscribe({
            next: (data) => {
                this.persons = data;
                this.cd.markForCheck();
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load persons.',
                    life: 3000,
                });
                console.error('Error loading persons:', err);
            },
        });
    }

    newTodo(): Todo {
        return {
            id: 0,
            title: '',
            person: { id: 0, name: '', email: '', phone: '' },
            startDate: new Date().toISOString().split('T')[0],
            endDate: undefined,
            priority: Priority.Facile,
            labels: [],
            description: '',
            completed: false,
        };
    }

    openNew() {
        this.todo = this.newTodo();
        this.submitted = false;
        this.todoDialog = true;
    }

    editTodo(todo: Todo) {
        this.todo = {
            ...todo,
            person: todo.person ? { ...todo.person } : { id: 0, name: '', email: '', phone: '' },
            startDate: todo.startDate ? new Date(todo.startDate).toISOString().split('T')[0] : '',
            endDate: todo.endDate ? new Date(todo.endDate).toISOString().split('T')[0] : undefined,
            completed: todo.completed ?? false,
        };
        this.todoDialog = true;
    }

    deleteSelectedTodos() {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete the selected todos?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                const idsToDelete = this.selectedTodos?.map(t => t.id) || [];

                Promise.all(idsToDelete.map(id => this.todoService.deleteTodo(id).toPromise()))
                    .then(() => {
                        this.allTodos = this.allTodos.filter((val) => !this.selectedTodos?.includes(val)); // Update allTodos
                        this.selectedTodos = null;
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Successful',
                            detail: 'Todos Deleted',
                            life: 3000,
                        });
                        this.applyFilters();
                        this.cd.markForCheck();
                    })
                    .catch((err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to delete selected todos.',
                            life: 3000,
                        });
                        console.error('Error deleting selected todos:', err);
                    });
            },
        });
    }

    hideDialog() {
        this.todoDialog = false;
        this.submitted = false;
    }

    deleteTodo(todo: Todo) {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete "' + todo.title + '"?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.todoService.deleteTodo(todo.id).subscribe({
                    next: () => {
                        this.allTodos = this.allTodos.filter((val) => val.id !== todo.id); // Update allTodos
                        this.todo = this.newTodo();
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Successful',
                            detail: 'Todo Deleted',
                            life: 3000,
                        });
                        this.applyFilters(); 
                        this.cd.markForCheck();
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to delete todo.',
                            life: 3000,
                        });
                        console.error('Error deleting todo:', err);
                    },
                });
            },
        });
    }

    findIndexById(id: number): number {
        let index = -1;
        for (let i = 0; i < this.allTodos.length; i++) { // Search in allTodos
            if (this.allTodos[i].id === id) {
                index = i;
                break;
            }
        }
        return index;
    }

    getPrioritySeverity(priority: Priority) {
        switch (priority) {
            case Priority.Facile:
                return 'success';
            case Priority.Moyen:
                return 'warning';
            case Priority.Difficile:
                return 'danger';
            default:
                return 'info';
        }
    }

    isTitleValid(): boolean {
        return this.todo.title?.trim().length >= 3;
    }

    searchPerson(event: { query: string }) {
        let filtered: Person[] = [];
        let query = event.query;

        for (let i = 0; i < this.persons.length; i++) {
            let person = this.persons[i];
            if (person.name.toLowerCase().indexOf(query.toLowerCase()) == 0) {
                filtered.push(person);
            }
        }
        this.filteredPersons = filtered;
    }

    onCompletedChange(event: any) {
        if (event.checked) {
            if (!this.todo.endDate) {
                this.todo.endDate = new Date().toISOString().split('T')[0];
            }
        }
    }

    getTaskStatus(todo: Todo): string {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startDate = todo.startDate ? new Date(todo.startDate) : null;
        if (startDate) startDate.setHours(0, 0, 0, 0);

        const endDate = todo.endDate ? new Date(todo.endDate) : null;
        if (endDate) endDate.setHours(0, 0, 0, 0);

        if (todo.completed) {
            return 'Finished';
        }

        if (endDate && endDate < today) {
            return 'Finished';
        }

        if (startDate && startDate <= today && (!endDate || endDate >= today)) {
            return 'In Progress';
        }

        if (startDate && startDate > today) {
            return 'Upcoming';
        }

        return 'N/A';
    }

    getTaskStatusSeverity(todo: Todo): string {
        const status = this.getTaskStatus(todo);
        switch (status) {
            case 'Finished':
                return 'success';
            case 'In Progress':
                return 'info';
            case 'Upcoming':
                return 'secondary';
            case 'Overdue':
                return 'danger';
            default:
                return 'info';
        }
    }

    /**
     * Handles the filter change event emitted by the TodoFilterComponent.
     * @param filters
     */
    onFilterChange(filters: TodoFilter): void {
        this.currentFilters = filters;
        this.applyFilters();
    }

    applyFilters(): void {
        let tempTodos = [...this.allTodos]; // Start with a fresh copy of all todos

        // Filter by Priority
        if (this.currentFilters.selectedPriorities && this.currentFilters.selectedPriorities.length > 0) {
            tempTodos = tempTodos.filter(todo =>
                this.currentFilters.selectedPriorities.includes(todo.priority)
            );
        }

        // Filter by Completed/In Progress Status
        if (this.currentFilters.showCompleted) {
            tempTodos = tempTodos.filter(todo => !!todo.completed);
        } else if (this.currentFilters.showInProgress) {
            tempTodos = tempTodos.filter(todo => this.getTaskStatus(todo) === 'In Progress');
        }

        this.filteredTodos = tempTodos;
        this.cd.markForCheck(); // Trigger change detection
    }

    saveTodo() {
        this.submitted = true;

        const isFormValid = 
            this.isTitleValid() &&
            this.todo.person?.id !== 0 &&
            !!this.todo.startDate &&
            !!this.todo.priority;

        if (isFormValid) {
            const todoToSave: Todo = {
                ...this.todo,
                startDate: String(this.todo.startDate || ''),
                endDate: this.todo.endDate ? String(this.todo.endDate) : undefined,
            };

            if (todoToSave.id) {
                this.todoService.updateTodo(todoToSave).subscribe({
                    next: (updatedTodo) => {
                        const index = this.findIndexById(updatedTodo.id);
                        if (index > -1) {
                            this.allTodos[index] = updatedTodo; // Update allTodos
                        }
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Successful',
                            detail: 'Todo Updated',
                            life: 3000,
                        });
                        this.applyFilters(); // Re-apply filters after update
                        this.cd.markForCheck();
                        this.hideDialog();
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to update todo.',
                            life: 3000,
                        });
                        console.error('Error updating todo:', err);
                    },
                });
            } else {
                this.todoService.createTodo(todoToSave).subscribe({
                    next: (newTodo) => {
                        this.allTodos.push(newTodo); // Add to allTodos
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Successful',
                            detail: 'Todo Created',
                            life: 3000,
                        });
                        this.applyFilters(); 
                        this.cd.markForCheck();
                        this.hideDialog();
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to create todo.',
                            life: 3000,
                        });
                        console.error('Error creating todo:', err);
                    },
                });
            }
        } else {
            this.messageService.add({
                severity: 'error',
                summary: 'Validation Error',
                detail: 'Please correct the errors in the form.',
                life: 3000,
            });
        }
    }
}
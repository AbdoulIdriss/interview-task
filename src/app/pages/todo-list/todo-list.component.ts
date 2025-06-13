import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Todo, Priority, Label } from '../../models/todo';
import { Person } from '../../models/person';
import { TodoService } from '../../services/todo.service'; // Adjust path for TodoService
import { PersonService } from '../../services/person.service'; // Import your PersonService

import { TableModule, Table } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import { FileUploadModule } from 'primeng/fileupload';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { CalendarModule } from 'primeng/calendar';
import { MultiSelectModule } from 'primeng/multiselect';


import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

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
        InputTextModule,
        CommonModule,
        DropdownModule,
        TagModule,
        FormsModule,
        IconFieldModule,
        InputIconModule,
        CalendarModule,
        MultiSelectModule,
    ],
    providers: [MessageService, ConfirmationService, TodoService, PersonService], // Add PersonService here
    styles: [
        `:host ::ng-deep .p-dialog .todo-details {
            width: 100%;
            margin: 0 auto 2rem auto;
            display: block;
        }`,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoListComponent implements OnInit {

    todoDialog: boolean = false;

    todos: Todo[] = [];

    todo: Todo = this.newTodo(); // Initialize with a new blank todo

    selectedTodos: Todo[] | null = null;

    submitted: boolean = false;

    priorities: { label: string; value: Priority }[];
    availableLabels: { label: string; value: Label }[];
    persons: Person[] = []; // Array to hold fetched persons

    @ViewChild('dt') dt!: Table;

    cols!: Column[];

    exportColumns!: ExportColumn[];

    constructor(
        private todoService: TodoService,
        private personService: PersonService, // Inject PersonService
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cd: ChangeDetectorRef
    ) {
        this.priorities = Object.values(Priority).map(p => ({ label: p, value: p }));
        this.availableLabels = Object.values(Label).map(l => ({ label: l, value: l }));
    }

    exportCSV() {
        this.dt.exportCSV();
    }

    ngOnInit() {
        this.loadTodos();
        this.loadPersons(); // Load persons when the component initializes

        this.cols = [
            { field: 'id', header: 'ID' },
            { field: 'title', header: 'Title' },
            { field: 'person.name', header: 'Assigned To' },
            { field: 'startDate', header: 'Start Date' },
            { field: 'endDate', header: 'End Date' },
            { field: 'priority', header: 'Priority' },
            { field: 'labels', header: 'Labels' },
        ];

        this.exportColumns = this.cols.map((col) => ({ title: col.header, dataKey: col.field }));
    }

    exportExcel() {
      import('xlsx').then(xlsx => {
          // Flatten the data for Excel export, especially for nested properties like 'person.name' and 'labels'
          const dataToExport = this.todos.map(todo => {
              return {
                  ID: todo.id,
                  Title: todo.title,
                  'Assigned To': todo.person?.name || '', // Handle potentially null person
                  'Start Date': todo.startDate,
                  'End Date': todo.endDate || '', // Handle potentially undefined endDate
                  Priority: todo.priority,
                  Labels: todo.labels.join(', ') // Convert array of labels to a single string
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

        // --- PDF EXPORT (Using html2canvas for general HTML content) ---
        async exportPdf() {
          // Option 1: Using html2canvas to capture the hidden p-table structure
          const data = document.getElementById('pdfContent'); // Get the HTML element by its ID
  
          if (data) {
              html2canvas(data, {
                  scale: 2, // Increase scale for better resolution in PDF
                  useCORS: true // Important if images are served from a different origin
              }).then(canvas => {
                  const imgData = canvas.toDataURL('image/png');
                  const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for millimeters, 'a4' size
                  const imgWidth = 208; // A4 width in mm (210mm total, with 1mm margin on each side)
                  const pageHeight = 295; // A4 height in mm (297mm total)
                  const imgHeight = canvas.height * imgWidth / canvas.width;
                  let heightLeft = imgHeight;
  
                  let position = 0;
  
                  pdf.addImage(imgData, 'PNG', 1, position, imgWidth, imgHeight); // Add image to PDF
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
  
      // --- RECOMMENDED PDF EXPORT FOR TABLES (Using jsPDF-AutoTable) ---
      exportPdfWithAutoTable() {
        console.log('--- PDF export function was called! ---');
        // This helper function can safely get nested properties like 'person.name'
        const getProperty = (obj: any, path: string) => {
            return path.split('.').reduce((p, c) => p && p[c], obj);
        }
    
        const doc = new jsPDF();
    
        // Prepare header and body data
        const head = [this.cols.map(col => col.header)];
        const body = this.todos.map(todo => {
            return this.cols.map(col => {
                if (col.field === 'labels') {
                    // Handle the 'labels' array specifically
                    return (todo.labels || []).join(', ');
                }
                // Use the helper to get data for all other fields, including 'person.name'
                const value = getProperty(todo, col.field);
                return value !== null && value !== undefined ? value : '';
            });
        });
    
        // Use the autoTable method without casting to 'any'
        autoTable(doc, { // Pass the 'doc' instance to the autoTable function
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
          },
          didDrawPage: (data: any) => { // Use 'any' or define a more specific type if you prefer
              // Header
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
                this.todos = data;
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
        // Initialize person with a default or empty Person object
        return {
            id: 0,
            title: '',
            person: { id: 0, name: '', email: '', phone: '' }, // Initialize with an empty Person object
            startDate: new Date().toISOString().split('T')[0],
            endDate: undefined,
            priority: Priority.Facile,
            labels: [],
            description: '',
        };
    }

    openNew() {
        this.todo = this.newTodo();
        this.submitted = false;
        this.todoDialog = true;
    }

    editTodo(todo: Todo) {
        //  copy the todo object for editing
        this.todo = {
            ...todo,
            person: { ...todo.person }, // Deep copy the person object
            startDate: todo.startDate ? new Date(todo.startDate).toISOString().split('T')[0] : '',
            endDate: todo.endDate ? new Date(todo.endDate).toISOString().split('T')[0] : undefined,
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
                        this.todos = this.todos.filter((val) => !this.selectedTodos?.includes(val));
                        this.selectedTodos = null;
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Successful',
                            detail: 'Todos Deleted',
                            life: 3000,
                        });
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
                        this.todos = this.todos.filter((val) => val.id !== todo.id);
                        this.todo = this.newTodo();
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Successful',
                            detail: 'Todo Deleted',
                            life: 3000,
                        });
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
        for (let i = 0; i < this.todos.length; i++) {
            if (this.todos[i].id === id) {
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

    saveTodo() {
      this.submitted = true;

      if (this.todo.title?.trim() && this.todo.person?.id && this.todo.startDate && this.todo.priority) {

          const todoToSave: Todo = {
              ...this.todo,
              startDate: String(this.todo.startDate || ''),
              endDate: this.todo.endDate ? String(this.todo.endDate) : undefined,
          };

          if (todoToSave.id) {
              // Update existing todo
              this.todoService.updateTodo(todoToSave).subscribe({
                  next: (updatedTodo) => {
                      const index = this.findIndexById(updatedTodo.id);
                      if (index > -1) {
                          // Replace the item with the updated one from the db.json,
                          // ensuring `todos` array immutability for change detection
                          this.todos[index] = updatedTodo;
                      }
                      this.messageService.add({
                          severity: 'success',
                          summary: 'Successful',
                          detail: 'Todo Updated',
                          life: 3000,
                      });
                      this.todos = [...this.todos]; // Trigger change detection for array mutation
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
              // Create new todo
              this.todoService.createTodo(todoToSave).subscribe({
                  next: (newTodo) => {
                      this.todos.push(newTodo);
                      this.messageService.add({
                          severity: 'success',
                          summary: 'Successful',
                          detail: 'Todo Created',
                          life: 3000,
                      });
                      this.todos = [...this.todos]; // Trigger change detection for array mutation
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
      }
  }
}
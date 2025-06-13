import { Routes } from '@angular/router';
import { TodoListComponent } from './pages/todo-list/todo-list.component';

export const routes: Routes = [
    { path: '', redirectTo: 'todos', pathMatch: 'full' },
    
    {
        path: 'todos',
        loadComponent: () => import('./pages/todo-list/todo-list.component').then(m => m.TodoListComponent),
    }
];

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TodoListComponent } from "./pages/todo-list/todo-list.component";

@Component({
  selector: 'app-root',
  imports: [TodoListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'interview-todo';
}

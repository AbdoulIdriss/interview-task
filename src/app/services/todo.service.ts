import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Todo } from '../models/todo';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TodoService {

  constructor( private http: HttpClient ) { }

  private api = 'http://localhost:3000/todos';
  
  getAllPerson():Observable<Todo[]> {
    return this.http.get<Todo[]>(this.api); //function to get all Todos
  }

  createTodo( t : Todo):Observable<Todo> {
    return this.http.post<Todo>(this.api , t); //function to create a Todo
  }

  updateTodo( t: Todo ):Observable<Todo> {
    return this.http.put<Todo>(`${this.api}/${t.id}` , t); //function to modify Todo info 
  }

  deleteTodo( id :number ):Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`); //function to delete Todo
  }
}

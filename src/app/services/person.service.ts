import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Person } from '../models/person';

@Injectable({
  providedIn: 'root'
})
export class PersonService {

  constructor( private http: HttpClient ) { }

  private api = 'http://localhost:3000/persons';
  
  getAllPerson():Observable<Person[]> {
    return this.http.get<Person[]>(this.api); //function to get all persons
  }

  createPerson( p : Person):Observable<Person> {
    return this.http.post<Person>(this.api , p); //function to create a person
  }

  updatePerson( p: Person ):Observable<Person> {
    return this.http.put<Person>(`${this.api}/${p.id}` , p); //function to modify person info 
  }

  deletePerson( id :number ):Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`); //function to delete person
  }

}

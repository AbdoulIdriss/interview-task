import { Person } from "./person";

export enum Priority { Facile = "Facile", Moyen = "Moyen", Difficile = "Difficile" }
export enum Label { HTML = "HTML", CSS = "CSS", NodeJS = "NODE JS", JQUERY = "JQUERY" }

export interface Todo {
    id: number;
    title: string;
    person: Person;
    startDate: string;
    endDate?: string;
    priority: Priority;
    labels: Label[];
    description: string;
    completed?: false; 
}
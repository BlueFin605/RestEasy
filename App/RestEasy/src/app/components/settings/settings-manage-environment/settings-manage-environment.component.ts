import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CreateEmptyEnvironment, Environment } from 'src/app/services/action-repository/action-repository.service'

@Component({
  selector: 'app-settings-manage-environment',
  templateUrl: './settings-manage-environment.component.html',
  styleUrls: ['./settings-manage-environment.component.css']
})
export class SettingsManageEnvironmentComponent implements OnInit {

  @Input()
  environment: Environment = { name: 'noname', id: '', variables: [] }//CreateEmptyEnvironment();

  @Output()
  environmentChange = new EventEmitter<Environment>();

  constructor() { }

  ngOnInit(): void {
  }

  modelChange(name: string) {
    console.log(`modelChange[${name}]`);
    this.environmentChange.emit(this.environment);
  }
}

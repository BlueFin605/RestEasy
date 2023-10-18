import { Component, Input, Output, OnInit, EventEmitter, ViewChild } from '@angular/core';
import { RestAction } from 'src/app/services/action-repository/action-repository.service';
import { ExecuteRestAction } from 'src/app/services/execute-rest-calls/execute-rest-calls.service';
import { EditRequestHeadersComponent } from '../edit-request-headers/edit-request-headers.component';

@Component({
  selector: 'app-edit-request',
  templateUrl: './edit-request.component.html',
  styleUrls: ['./edit-request.component.css']
})
export class EditRequestComponent implements OnInit {
  
  @Input()
  action: RestAction = {verb: 'GET', protocol:'HTTPS', url: '', headers: {}};
  
  @Output()
  execute = new EventEmitter<ExecuteRestAction>();
  
  @ViewChild('headerChild') headerChild: EditRequestHeadersComponent | undefined;
  
  constructor() { }

  ngOnInit(): void {
  }

  async test() {
    var action: ExecuteRestAction = {
      verb: this.action.verb,
      protocol: this.action.protocol,
      url: this.action.url,
      headers: this.headerChild?.headers ?? {}
    };

    console.log(`emit[${action}]`)
    this.execute.emit(action);
  }
}

import { Component, Input, Output, OnInit, EventEmitter, ViewChild } from '@angular/core';
import { UrlTree, UrlSegmentGroup, DefaultUrlSerializer, UrlSegment, Params } from "@angular/router";
import { RestAction, RestActionRun, HeaderTable, ParamTable, AuthenticationDetails, CreateEmptyAction, CreateEmptyRestActionRun, Solution, CreateEmptySolution, SecretTable, VariableTable } from 'src/app/services/action-repository/action-repository.service';
import { ExecuteRestAction } from 'src/app/services/execute-rest-calls/execute-rest-calls.service';
import { EditRequestHeadersComponent } from '../edit-request-headers/edit-request-headers.component';
import { CustomUrlSerializer } from 'src/app/services/CustomUrlSerializer';

@Component({
  selector: 'app-edit-request-run',
  templateUrl: './edit-request-run.component.html',
  styleUrls: ['./edit-request-run.component.css']
})
export class EditRequestRunComponent implements OnInit {
  _run: RestActionRun = CreateEmptyRestActionRun();

  @Input()
  action: RestAction = CreateEmptyAction();

  @Input()
  set run(run: RestActionRun) {
    console.log(`set action[${JSON.stringify(run)}]`)
    this._run = run;
    this.onParamChange(this._run.parameters);
  }

  @Output()
  runChange = new EventEmitter<RestActionRun>();

  @Output()
  nameChange = new EventEmitter<string>();

  @Output()
  execute = new EventEmitter<ExecuteRestAction>();

  @Input()
  solution: Solution = CreateEmptySolution();

  displayUrl: string = ''

  constructor() { }

  ngOnInit(): void {
  }

  onParamChange(params: ParamTable[]) {
    const urlTree = new UrlTree();
    urlTree.root = new UrlSegmentGroup([new UrlSegment(this.action.url, {})], {});
    var combined = this.combineAllParamaters(this._run.parameters, this.action.parameters);
    console.log(combined);
    urlTree.queryParams = this.convertParamsArraysAsValues(combined);
    const urlSerializer = new CustomUrlSerializer();
    var url = urlSerializer.serialize(urlTree);
    if (url.startsWith('/'))
      url = url.substring(1);
    console.log(`onParamChange:[${JSON.stringify(url)}]`);
    console.log(`onParamChange:[${JSON.stringify(this.action.parameters)}]`);
    this.displayUrl = url;
    this.runChange.emit(this._run);
  }

  onAuthChange(auth: AuthenticationDetails) {
    console.log(auth);
    console.log(this.action);
    this.runChange.emit(this._run);
  }

  onHeadersChange(event: HeaderTable[]) {
    console.log(event);    
    this.runChange.emit(this._run);
  }

  onSecretsChange(event: SecretTable[]) {
    // console.log(event);    
    this.runChange.emit(this._run);
  }

  onVariablesChange(event: VariableTable[]) {
    // console.log(event);    
    this.runChange.emit(this._run);
  }

  onNameChange(value: string) {
    this._run.name = value;
    console.log(this.action);
    this.runChange.emit(this._run);
    this.nameChange.emit(value);
  }

  combineAllParamaters(run: ParamTable[], action: ParamTable[]) {
    console.log(run);
    console.log(action);
    return action.concat(run);
  }

  convertParamsArraysAsValues(params: ParamTable[]): { [params: string]: string } {
    var reverse = params.reverse();
    params = reverse.filter((item, index) => reverse.findIndex(i => i.key == item.key) === index).reverse();
    var converted: { [params: string]: string } = {};
    params.filter(f => f.active == true && f.key != '' && f.value != '').forEach(v => converted[v.key] = v.value);
    return converted;
  }

  combineAllHeaders(run: HeaderTable[], action: HeaderTable[]) {
    console.log(run);
    console.log(action);
    return action.concat(run);
  }

  convertHeaderArraysAsValues(headers: HeaderTable[]): { [header: string]: string } {
    var reverse = headers.reverse();
    headers = reverse.filter((item, index) => reverse.findIndex(i => i.key == item.key) === index).reverse();
    var converted: { [headers: string]: string } = {};
    headers.filter(f => f.active == true && f.key != '' && f.value != '').forEach(v => converted[v.key] = v.value);
    return converted;
  }

  findAuthentication(): AuthenticationDetails
  {
    if (!this._run.authentication || this._run.authentication.authentication == 'inherit')
       return this.action.authentication;

    return this._run.authentication;
  }

  async test() {
    console.log(this.action.body);

    var combined = this.combineAllHeaders(this._run.headers, this.action.headers);
    var headers = this.convertHeaderArraysAsValues(combined ?? []);

    var action: ExecuteRestAction = {
      verb: this.action.verb,
      protocol: this.action.protocol,
      url: this.displayUrl,
      headers: headers,
      body: this.action.body,
      authentication: this.findAuthentication(),
      secrets: this._run.secrets,
      variables: this._run.variables,
      validation: this._run.validation
    };

    console.log(`emit[${action.url}]`);
    console.log(action);
    this.execute.emit(action);
  }
}

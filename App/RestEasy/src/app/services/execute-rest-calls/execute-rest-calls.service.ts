import { Injectable } from '@angular/core';
import { RestActionComponent } from 'src/app/components/rest-action/rest-action/rest-action.component';
import { Solution, AuthenticationDetails, Environment, SecretTable, VariableTable, RestActionValidation } from '../action-repository/action-repository.service';
import { ResponseValidation } from '../validate-response/validate-response.service';

export interface ExecuteRestAction {
  verb: string;
  protocol: string;
  url: string;
  headers: { [header: string]: string };
  body: any;
  authentication: AuthenticationDetails | undefined;
  secrets: SecretTable[] | undefined;
  variables: VariableTable[] | undefined;
  validation: RestActionValidation | undefined;
};

export interface RestActionResult {
  status: number | string;
  statusText: string | undefined;
  headers: { [header: string]: string };
  headersSent: { [header: string]: string };
  body: RestActionResultBody | undefined;
  validated: ResponseValidation | undefined;
}

export interface RestActionResultBody {
  contentType: string;
  body: ArrayBuffer;
}

//export const EmptyActionResultBody: RestActionResultBody = {contentType: undefined, body: undefined };
export const EmptyActionResult: RestActionResult = { status: "", statusText: undefined, headers: {}, headersSent: {}, body: undefined, validated: undefined };

// const re = \[(.*?)\];

const regexp = /\{\{(\$?[0-9a-zA-Z]*?)\}\}/g;

@Injectable({
  providedIn: 'root'
})
export class ExecuteRestCallsService {

  constructor() { }

  getIpcRenderer() {
    return (<any>window).ipc;
  }

  async executeTest(action: ExecuteRestAction, solution: Solution | undefined): Promise<RestActionResult> {
    this.AddAuthentication(action, solution);
    var actionText = JSON.stringify(action);
    actionText = this.replaceVariables(actionText, solution, action.variables, action.secrets);
    action = JSON.parse(actionText);
    console.log(actionText);
    console.log(action);

    if (this.getIpcRenderer() == undefined)
      return this.BuildMockData(action);

    var response = await this.getIpcRenderer().invoke('testRest', action);
    console.log(response);
    return response;
  }

  AddAuthentication(action: ExecuteRestAction, solution: Solution | undefined) {
    var auth: AuthenticationDetails | undefined;
    auth = solution?.config.solutionEnvironment.auth;

    var env:Environment | undefined = solution?.config.environments.find( e => e.id == solution.config.selectedEnvironmentId);
    if (auth == undefined || (env != undefined && env.auth.authentication != 'inherit'))
       auth = env?.auth;

    if (action.authentication == undefined || action.authentication.authentication == 'inherit') {
      action.authentication = auth;
    }
    console.log(action.authentication);
  }

  replaceVariables(text: string, solution: Solution | undefined, overrideVariables: VariableTable[] | undefined, overrideSecrets: SecretTable[] | undefined): string {
    console.log(`replaceVariables[${text}]`);
    var matches = [...text.matchAll(regexp)];

    var combinedSecrets = this.combineAllSecrets(
      overrideSecrets ?? [], 
      solution?.config.solutionEnvironment.secrets ?? [], 
      solution?.config?.environments?.find( e => e.id == solution.config.selectedEnvironmentId)?.secrets ?? []
    );
    var secrets = this.convertSecretArraysAsValues(combinedSecrets ?? []);


    var combinedVariables = this.combineAllVariables(
      overrideVariables ?? [], 
      solution?.config.solutionEnvironment.variables ?? [], 
      solution?.config?.environments?.find( e => e.id == solution.config.selectedEnvironmentId)?.variables ?? []
    );
    var variables = this.convertVariableArraysAsValues(combinedVariables ?? []);

    console.log(secrets);
    console.log(variables);

    console.log(matches);
    matches.forEach(m => {
      text = this.substituteValue(text, m[0],m[1], solution, variables, secrets);
    });

    return text;
  }

  substituteValue(text: string, search: string, valueKey: string, solution: Solution | undefined, overrideVariables: VariableTable[] | undefined, overrideSecrets: SecretTable[] | undefined):  string {
    var replaced = text.replace(search,this.findVariable(valueKey, solution, overrideVariables, overrideSecrets));
    return replaced;
  }

  combineAllSecrets(override: SecretTable[], environment: SecretTable[], solution: SecretTable[]): SecretTable[] {
    return solution.concat(environment, override);
  }

  convertSecretArraysAsValues(headers: SecretTable[]): SecretTable[] {
    var reverse = headers.reverse();
    headers = reverse.filter((item, index) => reverse.findIndex(i => i.$secret == item.$secret) === index).reverse();
    var converted: SecretTable[] = [];
    return headers.filter(f => f.active == true && f.$secret != '' && f.$value != '');
  }

  combineAllVariables(override: VariableTable[], environment: VariableTable[], solution: VariableTable[]): VariableTable[] {
    return  environment.concat(solution, override);
  }

  convertVariableArraysAsValues(headers: VariableTable[]): VariableTable[] {
    var reverse = headers.reverse();
    headers = reverse.filter((item, index) => reverse.findIndex(i => i.variable == item.variable) === index).reverse();
    var converted: { [variable: string]: string } = {};
    return headers.filter(f => f.active == true && f.variable != '' && f.variable != '');
  }

  findVariable(value: string, solution: Solution | undefined, overrideVariables: VariableTable[] | undefined, secrets: SecretTable[] | undefined): string {
    console.log(`findVariable(${value})`)
    console.log(solution?.config.solutionEnvironment.variables)
    console.log(solution?.config.solutionEnvironment.secrets)
    if (solution == undefined)
       return "";

    var overrideVar: string | undefined;
    var solVar: string | undefined;
    var envVar: string | undefined;
    if (value.startsWith('$')) {
      value = value.substring(1);
      return secrets?.find(v => v.$secret == value)?.$value ?? "";
    } else {
      return overrideVariables?.find(v => v.variable == value)?.value ?? "";
    }

    return overrideVar ?? envVar ?? solVar ?? "";
  }

  BuildMockData(action: ExecuteRestAction): RestActionResult | PromiseLike<RestActionResult> {
    var enc = new TextEncoder();

    var mockjson: RestActionResult = {
      status: 200,
      statusText: "OK",
      headers: {
        "date": "Tue, 17 Oct 2023 00:21:40 GMT",
        "content-type": "text/html",
        // "content-type": "application/json; charset=utf-8",
        // "content-length": "83",
        // "content-type": "image/png",
        // "content-length": "1949",
        "connection": "close",
        "x-powered-by": "Express",
        "x-ratelimit-limit": "1000",
        "x-ratelimit-remaining": "999",
        "x-ratelimit-reset": "1697036682",
        "vary": "Origin, Accept-Encoding",
        "access-control-allow-credentials": "true",
        "cache-control": "max-age=43200",
        "pragma": "no-cache",
        "expires": "-1",
        "x-content-type-options": "nosniff",
        "etag": "W/\"53-hfEnumeNh6YirfjyjaujcOPPT+s\"",
        "via": "1.1 vegur",
        "cf-cache-status": "HIT",
        "age": "1765",
        "accept-ranges": "bytes",
        "report-to": "{\"endpoints\":[{\"url\":\"https:\\/\\/a.nel.cloudflare.com\\/report\\/v3?s=2Bj4eRjfDAGFuXRhuIuQSyCb2FkiZJ4ktsgs631%2Fav1bU5l%2Bx8R9KH4UWy%2FIVzCdPccLxaxc5oYQLqLnZ59Mescjx16Ad4uy8CMs2Sb8ZVVJAlBCp4UtQN2YQaNw4KBqlqe0JpTBtMh628F00TK1\"}],\"group\":\"cf-nel\",\"max_age\":604800}",
        "nel": "{\"success_fraction\":0,\"report_to\":\"cf-nel\",\"max_age\":604800}",
        "server": "cloudflare",
        "cf-ray": "817461fe1d8da86e-SYD",
        "alt-svc": "h3=\":443\"; ma=86400"
      },
      headersSent: action.headers,
      // body: {contentType: 'image/png', body: new Uint16Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,1,82,0,0,0,54,8,3,0,0,0,162,25,225,37,0,0,0,183,80,76,84,69,0,0,0,20,143,226,20,143,226,20,143,226,20,143,226,20,143,226,20,143,226,20,143,226,20,143,226,20,143,226,20,143,226,20,143,226,20,143,226,20,143,226,20,143,226,20,143,226,20,143,226,93,178,235,138,199,241,240,248,253,255,255,255,226,241,251,64,164,231,242,242,242,230,230,230,58,148,196,249,175,44,35,150,228,115,115,115,51,51,51,77,77,77,191,191,191,92,153,169,249,175,44,249,175,44,249,175,44,249,175,44,249,175,44,249,175,44,249,175,44,249,175,44,249,175,44,249,175,44,249,175,44,153,153,153,217,217,217,204,204,204,34,145,215,249,175,44,249,175,44,249,175,44,102,102,102,128,128,128,249,175,44,140,140,140,224,171,64,179,179,179,196,227,248,79,171,233,123,192,239,108,185,237,19,76,200,23,0,0,0,56,116,82,78,83,0,48,64,16,207,255,96,175,32,223,159,239,112,128,191,143,80,255,255,255,255,255,255,255,255,191,64,255,255,255,255,255,255,255,191,159,128,96,16,80,175,48,112,143,255,255,255,255,239,32,223,255,255,207,255,143,52,0,128,1,0,0,6,93,73,68,65,84,120,1,237,154,135,186,218,58,18,128,71,146,199,93,178,211,19,82,49,198,167,237,238,5,114,211,243,254,207,181,54,56,50,99,25,185,64,186,255,84,64,71,200,255,167,50,35,9,122,153,153,153,153,153,97,156,115,56,32,96,230,2,56,88,225,184,80,226,57,12,102,206,198,175,254,184,1,6,149,205,48,18,240,19,225,223,240,225,15,32,142,208,5,16,65,8,63,17,252,134,132,95,29,206,165,148,170,38,145,210,229,12,218,176,8,25,128,139,98,86,106,71,164,82,69,216,69,160,164,75,196,114,12,0,4,242,89,169,5,63,118,208,78,164,100,163,213,195,20,160,235,105,24,175,97,127,185,82,215,193,65,68,161,11,123,82,76,32,197,20,12,20,214,168,191,90,105,28,225,112,162,248,48,242,21,40,244,103,165,157,48,7,199,161,68,165,212,9,209,131,89,105,23,49,142,198,17,144,28,254,153,149,118,16,226,112,238,221,191,127,15,43,60,8,16,61,1,179,210,243,140,222,123,240,176,228,209,99,44,225,169,100,208,197,172,212,29,97,180,18,250,228,233,195,7,149,211,103,139,5,116,49,43,245,35,28,202,243,7,165,208,23,47,95,189,126,248,8,17,223,44,15,100,217,42,95,47,138,73,74,73,228,42,220,42,99,243,100,42,224,52,44,14,171,140,46,102,54,165,190,43,189,178,148,116,125,56,77,113,149,95,103,217,117,190,128,134,155,124,149,101,89,126,85,64,23,55,183,119,89,245,180,230,199,20,53,174,147,254,231,229,203,255,62,252,223,195,178,155,254,179,36,108,202,150,108,91,85,70,170,6,246,36,170,198,221,203,9,131,99,233,220,67,77,232,131,171,106,146,99,233,50,208,101,130,88,24,74,205,0,219,113,225,136,187,172,230,14,138,213,70,183,60,63,40,42,242,29,125,139,176,45,63,213,172,22,112,26,142,195,185,95,42,125,251,242,229,191,175,95,61,172,150,168,165,201,110,85,212,74,41,45,213,18,64,120,164,31,151,47,9,137,236,232,233,41,29,80,1,239,82,202,3,108,149,2,77,182,172,201,174,54,164,217,55,0,176,216,145,30,210,146,150,47,41,215,196,57,193,27,173,180,130,40,37,228,195,148,178,128,184,96,17,26,24,74,19,60,137,180,21,74,76,165,149,80,34,240,6,214,203,22,107,104,184,121,183,164,80,231,4,31,113,220,192,127,93,25,125,95,13,124,252,144,231,249,237,58,175,200,178,119,163,148,106,133,178,207,40,170,33,129,137,180,78,99,161,161,212,20,116,107,190,117,211,24,221,44,59,88,79,91,238,41,143,74,167,255,123,241,246,227,195,79,141,39,77,177,88,231,217,176,129,159,56,196,133,31,97,191,82,137,22,164,93,123,66,149,14,36,131,154,45,49,74,157,155,132,56,134,207,15,247,28,130,40,15,58,25,162,52,162,46,20,246,43,101,104,67,246,100,129,124,160,82,202,21,28,120,183,236,102,87,64,7,14,142,115,250,168,50,250,233,16,234,79,87,74,93,184,56,64,169,234,87,106,153,197,130,73,74,175,233,202,100,146,67,7,56,150,207,95,190,238,133,162,7,253,74,3,89,115,82,75,12,0,1,217,56,228,105,18,153,74,249,177,31,201,121,236,117,40,13,155,122,164,15,224,203,166,34,215,84,186,201,50,99,64,191,203,72,143,132,138,162,41,181,91,23,0,55,171,166,10,218,77,125,46,136,210,145,56,98,128,82,213,27,2,115,98,203,19,80,33,18,67,169,71,54,22,43,152,211,86,42,154,198,49,216,227,235,50,78,91,233,102,13,37,183,180,87,110,1,96,113,36,117,65,203,172,224,64,19,28,220,194,17,9,98,228,78,87,170,4,156,173,52,242,164,244,143,251,86,216,181,106,42,106,11,25,212,8,167,165,52,214,21,51,128,246,12,236,183,148,222,104,59,109,99,197,142,42,213,138,51,51,72,125,215,94,233,35,49,81,105,224,2,156,171,212,73,225,64,160,107,21,160,241,168,210,206,160,222,111,41,245,104,25,58,23,196,84,233,10,106,222,153,163,120,77,230,202,66,191,218,66,5,157,11,138,118,147,57,68,56,18,157,95,79,84,106,246,72,50,175,154,186,20,141,160,4,52,132,84,169,126,22,71,105,2,242,125,25,237,164,116,88,223,105,97,68,233,66,191,202,26,180,210,69,251,233,56,40,28,78,144,164,62,16,166,43,245,58,50,98,82,185,67,234,8,205,159,51,251,46,218,80,52,123,130,3,218,24,177,179,57,86,154,47,109,220,154,74,147,225,62,77,157,211,149,70,162,195,11,28,147,144,58,20,113,167,33,74,217,8,165,89,91,41,25,215,217,112,165,121,187,49,2,210,41,147,231,249,74,19,232,83,42,71,43,229,104,165,87,41,156,167,84,96,69,164,39,32,59,145,4,184,172,82,6,223,161,151,254,92,165,92,183,54,193,94,148,15,23,86,26,1,124,135,185,244,231,42,149,122,137,245,177,15,9,112,190,82,243,253,105,43,126,36,140,158,108,174,248,12,58,152,170,84,23,216,129,21,167,249,106,137,86,162,20,70,227,97,141,99,87,58,60,46,77,59,227,210,232,68,92,26,94,82,105,97,132,4,150,93,210,192,72,66,76,34,6,227,145,116,44,155,74,19,208,92,60,123,162,221,148,243,243,148,118,103,79,112,117,3,45,98,186,163,62,41,147,183,32,91,63,239,74,243,160,164,33,53,114,124,144,182,28,63,61,149,227,251,102,179,121,245,34,140,217,57,74,205,28,31,86,250,168,77,19,144,46,148,246,27,101,92,238,225,12,122,161,21,42,85,137,20,22,165,116,39,42,229,60,9,240,8,101,84,233,196,156,187,61,59,81,238,222,113,243,134,55,81,41,221,137,202,22,80,114,213,100,12,107,58,172,66,114,76,102,160,75,176,196,161,79,216,139,143,109,82,139,210,97,251,165,206,216,253,82,165,34,82,96,178,82,200,233,142,224,242,136,109,187,147,106,88,112,170,157,190,12,76,59,125,152,207,31,90,148,14,219,213,231,253,74,45,75,173,3,103,40,133,119,189,33,148,52,151,8,33,205,86,48,50,114,52,238,148,11,44,129,69,233,37,207,158,60,203,34,59,89,169,113,154,103,212,194,140,136,165,194,15,35,34,212,53,205,152,129,225,240,163,18,102,81,122,153,19,82,91,248,146,194,84,165,54,167,239,138,246,142,137,65,154,168,131,109,47,246,205,41,209,241,100,73,245,73,63,230,163,73,139,210,222,115,252,126,167,210,86,40,98,48,89,41,61,199,39,100,5,205,86,228,168,91,167,65,194,97,28,66,33,33,180,43,5,95,33,33,73,166,222,54,73,3,164,120,2,206,86,10,197,157,113,240,223,26,148,225,152,88,40,228,48,1,55,64,141,199,161,75,41,129,31,73,13,25,221,137,234,188,19,37,135,220,137,138,66,118,94,168,175,217,222,29,141,254,29,189,51,197,60,39,20,48,4,167,190,242,53,17,22,39,125,55,241,8,254,160,155,123,82,223,220,235,171,73,37,146,195,37,89,228,119,89,73,190,222,194,84,68,162,66,14,51,51,51,51,51,51,127,0,255,7,222,16,117,145,199,189,17,209,0,0,0,0,73,69,78,68,174,66,96,130])}

      body: {
        contentType: 'application/json; charset=utf-8', body: enc.encode(JSON.stringify({
          "userId": 1,
          "id": 1,
          "title": "delectus aut autem",
          "completed": false,
          "information": {
            "summary": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. In magna neque, ultrices sit amet mattis tristique, fermentum vitae ipsum. In eu lorem mauris. Aliquam ut nulla consectetur, commodo erat id, malesuada sem. Morbi posuere eget augue eget eleifend. Mauris magna arcu, sodales at euismod et, mollis quis lectus. Phasellus varius id risus ut pharetra. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Quisque elementum metus velit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Ut non vestibulum elit. Suspendisse potenti. Aliquam posuere diam sed enim viverra vulputate. Praesent cursus sem sit amet turpis rhoncus bibendum.",
            "details": "Quisque at quam sit amet tortor porta tempor. Cras in est in nibh facilisis sodales nec ac nisl. In tincidunt interdum mauris vitae mollis. Pellentesque sed molestie nulla, sed fringilla mauris. Integer egestas velit at massa gravida, ac consequat ante convallis. Sed lacinia ante non dui commodo vulputate. Quisque sit amet pharetra nisl. Aenean hendrerit venenatis erat eu tristique. Suspendisse molestie feugiat tristique. Quisque vitae semper massa. Proin id enim elementum, posuere arcu eget, finibus eros. Cras malesuada velit sed pellentesque finibus. Curabitur ac lorem eget risus tincidunt ullamcorper. Nunc luctus congue urna, at hendrerit quam sollicitudin in. Aenean eget tincidunt ligula, nec rutrum leo.  Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Vivamus pharetra augue vel orci pharetra maximus. Fusce vitae mi eu sem lacinia ornare. Morbi molestie dolor sit amet tempor consectetur. Morbi in dui at augue consectetur bibendum. Suspendisse a aliquet ex. Maecenas mi nulla, lacinia viverra suscipit at, porta et metus. Nullam lobortis sapien vitae risus laoreet mollis. Proin sit amet justo eget sapien mattis eleifend. Cras volutpat feugiat viverra. Maecenas ut diam sit amet metus laoreet vehicula. Quisque tortor felis, congue vel metus ac, pharetra consectetur felis. Duis porttitor, arcu ut luctus posuere, tellus quam convallis quam, ac condimentum nibh nibh iaculis ante. Aliquam ornare lobortis euismod. Integer diam ligula, rutrum ac tellus vel, commodo tempor ante. Sed vulputate aliquet lectus, ac sollicitudin justo placerat at. Sed rutrum auctor odio, sit amet imperdiet augue pretium et. Praesent at metus ut felis mattis dignissim ut eu lectus. Donec euismod mi sed enim pulvinar, nec consectetur ligula semper. Etiam blandit tortor sed orci fermentum, eget tincidunt massa tincidunt. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Duis vulputate odio non ipsum porttitor tristique. Proin vitae fringilla nulla, nec consequat nisi. Fusce vel ipsum sit amet sem luctus pellentesque. Aliquam iaculis est ac augue euismod, ac dapibus enim aliquam.",
            "contributers": {
              "author": "Marike Oissíne",
              "editor": "Fabian Ieronim",
              "factchecker": "Dov Seleucus"
            }
          }
        }))
      },

      // body: {
      //   contentType: 'application/json; charset=utf-8', body: enc.encode(`<!doctype html><html itemscope="" itemtype="http://schema.org/WebPage" lang="en-NZ"><head><meta content="text/html; charset=UTF-8" http-equiv="Content-Type"><meta content="/images/branding/googleg/1x/googleg_standard_color_128dp.png" itemprop="image"><title>Google</title><script nonce="Vvv-KBatFgbX-rAoX6oDUw">(function(){var _g={kEI:'XAY8Zfq_NYbh-AbKrpewAg',kEXPI:'0,1365467,207,4804,2316,383,246,5,1129120,1827,1195887,680,380096,16115,28684,22430,1362,12318,4747,12834,4998,17075,35735,5581,2891,3926,8434,63304,13491,230,1014,1,16916,2652,4,59617,27017,6657,7596,1,42154,2,16737,3533,19491,5679,1021,31121,4568,6256,23420,1253,33064,2,2,1,10957,15675,8155,23350,874,19633,9,1920,9779,42459,20199,20136,14,82,14707,5499,8377,8239,10721,281,2025,3097,782,2248,11151,4665,1804,7734,19360,8175,960,7869,2984,1634,13494,950,3691,5227,3338,7768,146,9395,234,12117,5203198,5926,1015,2,712,5994253,2806525,141,795,29513,25,3,41,22,23,21,2,3,22,44,23940848,397,182,2773241,1270287,14298,2374,42665,1222,3,1558,5,542,3,1170,4,337,179,746,25150776,8163,4636,8409,2878,1595,3554,5494,1020,157,1966,11129,3279,3042,875,2,3,6580,3117,1520,2479,1879,2048,1490,9965,2736,755,3030,825,1131,946,461,6805,2,435,4540,393,1504,2744,2,3,1688,2052,27,6,5,15,311,2116,503,2866,4,872,972,134,760,1006,2043,7,1,8,409,351,4082,758,77,187,416,349,2236,3,47,598,14,201,269,47,259,444,896,3,1192,1002,702,447,1122,319,612,305,119,38,664,320,237,94,673,171,713,17,342,78,78,975,175,250,255,330,62,163,1,124,219,634,153,47,1940,390,658,168,467,4,519,641,114,1899,1216,2,1327,3,4,267,231,1182,641,313,131,152,2854,749,410,296,1694,2392,122,641',kBL:'lmiY',kOPI:89978449};(function(){var a;(null==(a=window.google)?0:a.stvsc)?google.kEI=_g.kEI:window.google=_g;}).call(this);})();(function(){google.sn='webhp';google.kHL='en-NZ';})();(function(){
      //   var h=this||self;function l(){return void 0!==window.google&&void 0!==window.google.kOPI&&0!==window.google.kOPI?window.google.kOPI:null};var m,n=[];function p(a){for(var b;a&&(!a.getAttribute||!(b=a.getAttribute("eid")));)a=a.parentNode;return b||m}function q(a){for(var b=null;a&&(!a.getAttribute||!(b=a.getAttribute("leid")));)a=a.parentNode;return b}function r(a){/^http:/i.test(a)&&"https:"===window.location.protocol&&(google.ml&&google.ml(Error("a"),!1,{src:a,glmm:1}),a="");return a}
      //   function t(a,b,c,d,k){var e="";-1===b.search("&ei=")&&(e="&ei="+p(d),-1===b.search("&lei=")&&(d=q(d))&&(e+="&lei="+d));d="";var g=-1===b.search("&cshid=")&&"slh"!==a,f=[];f.push(["zx",Date.now().toString()]);h._cshid&&g&&f.push(["cshid",h._cshid]);c=c();null!=c&&f.push(["opi",c.toString()]);for(c=0;c<f.length;c++){if(0===c||0<c)d+="&";d+=f[c][0]+"="+f[c][1]}return"/"+(k||"gen_204")+"?atyp=i&ct="+String(a)+"&cad="+(b+e+d)};m=google.kEI;google.getEI=p;google.getLEI=q;google.ml=function(){return null};google.log=function(a,b,c,d,k,e){e=void 0===e?l:e;c||(c=t(a,b,e,d,k));if(c=r(c)){a=new Image;var g=n.length;n[g]=a;a.onerror=a.onload=a.onabort=function(){delete n[g]};a.src=c}};google.logUrl=function(a,b){b=void 0===b?l:b;return t("",a,b)};}).call(this);(function(){google.y={};google.sy=[];google.x=function(a,b){if(a)var c=a.id;else{do c=Math.random();while(google.y[c])}google.y[c]=[a,b];return!1};google.sx=function(a){google.sy.push(a)};google.lm=[];google.plm=function(a){google.lm.push.apply(google.lm,a)};google.lq=[];google.load=function(a,b,c){google.lq.push([[a],b,c])};google.loadAll=function(a,b){google.lq.push([a,b])};google.bx=!1;google.lx=function(){};var d=[];google.fce=function(a,b,c,e){d.push([a,b,c,e])};google.qce=d;}).call(this);google.f={};(function(){
      //   document.documentElement.addEventListener("submit",function(b){var a;if(a=b.target){var c=a.getAttribute("data-submitfalse");a="1"===c||"q"===c&&!a.elements.q.value?!0:!1}else a=!1;a&&(b.preventDefault(),b.stopPropagation())},!0);document.documentElement.addEventListener("click",function(b){var a;a:{for(a=b.target;a&&a!==document.documentElement;a=a.parentElement)if("A"===a.tagName){a="1"===a.getAttribute("data-nohref");break a}a=!1}a&&b.preventDefault()},!0);}).call(this);</script><style>#gbar,#guser{font-size:13px;padding-top:1px !important;}#gbar{height:22px}#guser{padding-bottom:7px !important;text-align:right}.gbh,.gbd{border-top:1px solid #c9d7f1;font-size:1px}.gbh{height:0;position:absolute;top:24px;width:100%}@media all{.gb1{height:22px;margin-right:.5em;vertical-align:top}#gbar{float:left}}a.gb1,a.gb4{text-decoration:underline !important}a.gb1,a.gb4{color:#00c !important}.gbi .gb4{color:#dd8e27 !important}.gbf .gb4{color:#900 !important}
      //   </style><style>body,td,a,p,.h{font-family:arial,sans-serif}body{margin:0;overflow-y:scroll}#gog{padding:3px 8px 0}td{line-height:.8em}.gac_m td{line-height:17px}form{margin-bottom:20px}.h{color:#1967d2}em{font-weight:bold;font-style:normal}.lst{height:25px;width:496px}.gsfi,.lst{font:18px arial,sans-serif}.gsfs{font:17px arial,sans-serif}.ds{display:inline-box;display:inline-block;margin:3px 0 4px;margin-left:4px}input{font-family:inherit}body{background:#fff;color:#000}a{color:#681da8;text-decoration:none}a:hover,a:active{text-decoration:underline}.fl a{color:#1967d2}a:visited{color:#681da8}.sblc{padding-top:5px}.sblc a{display:block;margin:2px 0;margin-left:13px;font-size:11px}.lsbb{background:#f8f9fa;border:solid 1px;border-color:#dadce0 #70757a #70757a #dadce0;height:30px}.lsbb{display:block}#WqQANb a{display:inline-block;margin:0 12px}.lsb{background:url(/images/nav_logo229.png) 0 -261px repeat-x;color:#000;border:none;cursor:pointer;height:30px;margin:0;outline:0;font:15px arial,sans-serif;vertical-align:top}.lsb:active{background:#dadce0}.lst:focus{outline:none}</style><script nonce="Vvv-KBatFgbX-rAoX6oDUw">(function(){window.google.erd={jsr:1,bv:1892,de:true};
      //   var h=this||self;var k,l=null!=(k=h.mei)?k:1,n,p=null!=(n=h.sdo)?n:!0,q=0,r,t=google.erd,v=t.jsr;google.ml=function(a,b,d,m,e){e=void 0===e?2:e;b&&(r=a&&a.message);void 0===d&&(d={});d.cad="ple_"+google.ple+".aple_"+google.aple;if(google.dl)return google.dl(a,e,d),null;if(0>v){window.console&&console.error(a,d);if(-2===v)throw a;b=!1}else b=!a||!a.message||"Error loading script"===a.message||q>=l&&!m?!1:!0;if(!b)return null;q++;d=d||{};b=encodeURIComponent;var c="/gen_204?atyp=i&ei="+b(google.kEI);google.kEXPI&&(c+="&jexpid="+b(google.kEXPI));c+="&srcpg="+b(google.sn)+"&jsr="+b(t.jsr)+"&bver="+
      //   b(t.bv);var f=a.lineNumber;void 0!==f&&(c+="&line="+f);var g=a.fileName;g&&(0<g.indexOf("-extension:/")&&(e=3),c+="&script="+b(g),f&&g===window.location.href&&(f=document.documentElement.outerHTML.split("\n")[f],c+="&cad="+b(f?f.substring(0,300):"No script found.")));google.ple&&1===google.ple&&(e=2);c+="&jsel="+e;for(var u in d)c+="&",c+=b(u),c+="=",c+=b(d[u]);c=c+"&emsg="+b(a.name+": "+a.message);c=c+"&jsst="+b(a.stack||"N/A");12288<=c.length&&(c=c.substr(0,12288));a=c;m||google.log(0,"",a);return a};window.onerror=function(a,b,d,m,e){r!==a&&(a=e instanceof Error?e:Error(a),void 0===d||"lineNumber"in a||(a.lineNumber=d),void 0===b||"fileName"in a||(a.fileName=b),google.ml(a,!1,void 0,!1,"SyntaxError"===a.name||"SyntaxError"===a.message.substring(0,11)||-1!==a.message.indexOf("Script error")?3:0));r=null;p&&q>=l&&(window.onerror=null)};})();</script></head><body bgcolor="#fff"><script nonce="Vvv-KBatFgbX-rAoX6oDUw">(function(){var src='/images/nav_logo229.png';var iesg=false;document.body.onload = function(){window.n && window.n();if (document.images){new Image().src=src;}
      //   if (!iesg){document.f&&document.f.q.focus();document.gbqf&&document.gbqf.q.focus();}
      //   }
      //   })();</script><div id="mngb"><div id=gbar><nobr><b class=gb1>Search</b> <a class=gb1 href="https://www.google.com/imghp?hl=en&tab=wi">Images</a> <a class=gb1 href="https://maps.google.co.nz/maps?hl=en&tab=wl">Maps</a> <a class=gb1 href="https://play.google.com/?hl=en&tab=w8">Play</a> <a class=gb1 href="https://www.youtube.com/?tab=w1">YouTube</a> <a class=gb1 href="https://news.google.com/?tab=wn">News</a> <a class=gb1 href="https://mail.google.com/mail/?tab=wm">Gmail</a> <a class=gb1 href="https://drive.google.com/?tab=wo">Drive</a> <a class=gb1 style="text-decoration:none" href="https://www.google.co.nz/intl/en/about/products?tab=wh"><u>More</u> &raquo;</a></nobr></div><div id=guser width=100%><nobr><span id=gbn class=gbi></span><span id=gbf class=gbf></span><span id=gbe></span><a href="http://www.google.co.nz/history/optout?hl=en" class=gb4>Web History</a> | <a  href="/preferences?hl=en" class=gb4>Settings</a> | <a target=_top id=gb_70 href="https://accounts.google.com/ServiceLogin?hl=en&passive=true&continue=https://www.google.com/&ec=GAZAAQ" class=gb4>Sign in</a></nobr></div><div class=gbh style=left:0></div><div class=gbh style=right:0></div></div><center><br clear="all" id="lgpd"><div id="lga"><img alt="Google" height="92" src="/images/branding/googlelogo/1x/googlelogo_white_background_color_272x92dp.png" style="padding:28px 0 14px" width="272" id="hplogo"><br><br></div><form action="/search" name="f"><table cellpadding="0" cellspacing="0"><tr valign="top"><td width="25%">&nbsp;</td><td align="center" nowrap=""><input name="ie" value="ISO-8859-1" type="hidden"><input value="en-NZ" name="hl" type="hidden"><input name="source" type="hidden" value="hp"><input name="biw" type="hidden"><input name="bih" type="hidden"><div class="ds" style="height:32px;margin:4px 0"><input class="lst" style="margin:0;padding:5px 8px 0 6px;vertical-align:top;color:#000" autocomplete="off" value="" title="Google Search" maxlength="2048" name="q" size="57"></div><br style="line-height:0"><span class="ds"><span class="lsbb"><input class="lsb" value="Google Search" name="btnG" type="submit"></span></span><span class="ds"><span class="lsbb"><input class="lsb" id="tsuid_1" value="I'm Feeling Lucky" name="btnI" type="submit"><script nonce="Vvv-KBatFgbX-rAoX6oDUw">(function(){var id='tsuid_1';document.getElementById(id).onclick = function(){if (this.form.q.value){this.checked = 1;if (this.form.iflsig)this.form.iflsig.disabled = false;}
      //   else top.location='/doodles/';};})();</script><input value="AO6bgOgAAAAAZTwUbJ5gsWeezrqQ_RSHQIFCcqRDZi4s" name="iflsig" type="hidden"></span></span></td><td class="fl sblc" align="left" nowrap="" width="25%"><a href="/advanced_search?hl=en-NZ&amp;authuser=0">Advanced search</a></td></tr></table><input id="gbv" name="gbv" type="hidden" value="1"><script nonce="Vvv-KBatFgbX-rAoX6oDUw">(function(){var a,b="1";if(document&&document.getElementById)if("undefined"!=typeof XMLHttpRequest)b="2";else if("undefined"!=typeof ActiveXObject){var c,d,e=["MSXML2.XMLHTTP.6.0","MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"];for(c=0;d=e[c++];)try{new ActiveXObject(d),b="2"}catch(h){}}a=b;if("2"==a&&-1==location.search.indexOf("&gbv=2")){var f=google.gbvu,g=document.getElementById("gbv");g&&(g.value=a);f&&window.setTimeout(function(){location.href=f},0)};}).call(this);</script></form><div id="gac_scont"></div><div style="font-size:83%;min-height:3.5em"><br><div id="gws-output-pages-elements-homepage_additional_languages__als"><style>#gws-output-pages-elements-homepage_additional_languages__als{font-size:small;margin-bottom:24px}#SIvCob{color:#3c4043;display:inline-block;line-height:28px;}#SIvCob a{padding:0 3px;}.H6sW5{display:inline-block;margin:0 2px;white-space:nowrap}.z4hgWe{display:inline-block;margin:0 2px}</style><div id="SIvCob">Google offered in:  <a href="https://www.google.com/setprefs?sig=0_GfnH0Rqd_lS8n_VNACDeIwfx5D8%3D&amp;hl=mi&amp;source=homepage&amp;sa=X&amp;ved=0ahUKEwj63drA8paCAxWGMN4KHUrXBSYQ2ZgBCAU">M&#257;ori</a>  </div></div></div><span id="footer"><div style="font-size:10pt"><div style="margin:19px auto;text-align:center" id="WqQANb"><a href="/intl/en/ads/">Advertising</a><a href="/services/">Business Solutions</a><a href="/intl/en/about.html">About Google</a><a href="https://www.google.com/setprefdomain?prefdom=NZ&amp;prev=https://www.google.co.nz/&amp;sig=K_5e2OdO4tSNpRGJ_A95qFENtI5DM%3D">Google.co.nz</a></div></div><p style="font-size:8pt;color:#70757a">&copy; 2023 - <a href="/intl/en/policies/privacy/">Privacy</a> - <a href="/intl/en/policies/terms/">Terms</a></p></span></center><script nonce="Vvv-KBatFgbX-rAoX6oDUw">(function(){window.google.cdo={height:757,width:1440};(function(){var a=window.innerWidth,b=window.innerHeight;if(!a||!b){var c=window.document,d="CSS1Compat"==c.compatMode?c.documentElement:c.body;a=d.clientWidth;b=d.clientHeight}
      //   if(a&&b&&(a!=google.cdo.width||b!=google.cdo.height)){var e=google,f=e.log,g="/client_204?&atyp=i&biw="+a+"&bih="+b+"&ei="+google.kEI,h="",k=[],l=void 0!==window.google&&void 0!==window.google.kOPI&&0!==window.google.kOPI?window.google.kOPI:null;null!=l&&k.push(["opi",l.toString()]);for(var m=0;m<k.length;m++){if(0===m||0<m)h+="&";h+=k[m][0]+"="+k[m][1]}f.call(e,"","",g+h)};}).call(this);})();</script> <script nonce="Vvv-KBatFgbX-rAoX6oDUw">(function(){google.xjs={ck:'xjs.hp.RjVk13E_tLI.L.X.O',cs:'ACT90oHvv-pXhbAH6CntSK12dpZQCIYhEg',cssopt:false,csss:'ACT90oHtMUtAVxL5aOHZEcTIZedBbJYGWA',excm:[],sepam:false,sepcss:false};})();</script>     <script nonce="Vvv-KBatFgbX-rAoX6oDUw">(function(){var u='/xjs/_/js/k\x3dxjs.hp.en.g4vfRkpdHDU.O/am\x3dAAAAAAAAAAAAAAAAAAAAAAgAAAAAAA4ACBAAAAAAAAAAAAEA6AgAgAUAuA/d\x3d1/ed\x3d1/rs\x3dACT90oGR_eBJECjnwLf-b8e4lWSKGC-sog/m\x3dsb_he,d,cEt90b,SNUn3,qddgKe,sTsDMc,dtl0hd,eHDfl';var amd=0;
      //   var e=this||self,f=function(a){return a};var g;var h=function(a){this.g=a};h.prototype.toString=function(){return this.g+""};var k={};var l=function(){var a=document;var b="SCRIPT";"application/xhtml+xml"===a.contentType&&(b=b.toLowerCase());return a.createElement(b)};
      //   function m(a,b){a.src=b instanceof h&&b.constructor===h?b.g:"type_error:TrustedResourceUrl";var c,d;(c=(b=null==(d=(c=(a.ownerDocument&&a.ownerDocument.defaultView||window).document).querySelector)?void 0:d.call(c,"script[nonce]"))?b.nonce||b.getAttribute("nonce")||"":"")&&a.setAttribute("nonce",c)};function n(a){a=null===a?"null":void 0===a?"undefined":a;if(void 0===g){var b=null;var c=e.trustedTypes;if(c&&c.createPolicy){try{b=c.createPolicy("goog#html",{createHTML:f,createScript:f,createScriptURL:f})}catch(d){e.console&&e.console.error(d.message)}g=b}else g=b}a=(b=g)?b.createScriptURL(a):a;return new h(a,k)};void 0===google.ps&&(google.ps=[]);function p(){var a=u,b=function(){};google.lx=google.stvsc?b:function(){q(a);google.lx=b};google.bx||google.lx()}function r(a,b){b&&m(a,n(b));var c=a.onload;a.onload=function(d){c&&c(d);google.ps=google.ps.filter(function(t){return a!==t})};google.ps.push(a);document.body.appendChild(a)}google.as=r;function q(a){google.timers&&google.timers.load&&google.tick&&google.tick("load","xjsls");var b=l();b.onerror=function(){google.ple=1};b.onload=function(){google.ple=0};google.xjsus=void 0;r(b,a);google.aple=-1;google.psa=!0};google.xjsu=u;e._F_jsUrl=u;setTimeout(function(){0<amd?google.caft(function(){return p()},amd):p()},0);})();window._ = window._ || {};window._DumpException = _._DumpException = function(e){throw e;};window._s = window._s || {};_s._DumpException = _._DumpException;window._qs = window._qs || {};_qs._DumpException = _._DumpException;(function(){var t=[1,0,0,0,2048,939524352,16809984,0,2048,597688324,5767168,11776];window._F_toggles = window._xjs_toggles = t;})();function _F_installCss(c){}
      //   (function(){google.jl={blt:'none',chnk:0,dw:false,dwu:true,emtn:0,end:0,ico:false,ikb:0,ine:false,injs:'none',injt:0,injth:0,injv2:false,lls:'default',pdt:0,rep:0,snet:true,strt:0,ubm:false,uwp:true};})();(function(){var pmc='{\x22d\x22:{},\x22sb_he\x22:{\x22agen\x22:true,\x22cgen\x22:true,\x22client\x22:\x22heirloom-hp\x22,\x22dh\x22:true,\x22ds\x22:\x22\x22,\x22fl\x22:true,\x22host\x22:\x22google.com\x22,\x22jsonp\x22:true,\x22msgs\x22:{\x22cibl\x22:\x22Clear Search\x22,\x22dym\x22:\x22Did you mean:\x22,\x22lcky\x22:\x22I\\u0026#39;m Feeling Lucky\x22,\x22lml\x22:\x22Learn more\x22,\x22psrc\x22:\x22This search was removed from your \\u003Ca href\x3d\\\x22/history\\\x22\\u003EWeb History\\u003C/a\\u003E\x22,\x22psrl\x22:\x22Remove\x22,\x22sbit\x22:\x22Search by image\x22,\x22srch\x22:\x22Google Search\x22},\x22ovr\x22:{},\x22pq\x22:\x22\x22,\x22rfs\x22:[],\x22sbas\x22:\x220 3px 8px 0 rgba(0,0,0,0.2),0 0 0 1px rgba(0,0,0,0.08)\x22,\x22stok\x22:\x22YkoP_iy5VPvQ9IORY_QW5axrYj0\x22}}';google.pmc=JSON.parse(pmc);})();(function(){var b=function(a){var c=0;return function(){return c<a.length?{done:!1,value:a[c++]}:{done:!0}}};
      //   var e=this||self;var g,h;a:{for(var k=["CLOSURE_FLAGS"],l=e,n=0;n<k.length;n++)if(l=l[k[n]],null==l){h=null;break a}h=l}var p=h&&h[610401301];g=null!=p?p:!1;var q,r=e.navigator;q=r?r.userAgentData||null:null;function t(a){return g?q?q.brands.some(function(c){return(c=c.brand)&&-1!=c.indexOf(a)}):!1:!1}function u(a){var c;a:{if(c=e.navigator)if(c=c.userAgent)break a;c=""}return-1!=c.indexOf(a)};function v(){return g?!!q&&0<q.brands.length:!1}function w(){return u("Safari")&&!(x()||(v()?0:u("Coast"))||(v()?0:u("Opera"))||(v()?0:u("Edge"))||(v()?t("Microsoft Edge"):u("Edg/"))||(v()?t("Opera"):u("OPR"))||u("Firefox")||u("FxiOS")||u("Silk")||u("Android"))}function x(){return v()?t("Chromium"):(u("Chrome")||u("CriOS"))&&!(v()?0:u("Edge"))||u("Silk")}function y(){return u("Android")&&!(x()||u("Firefox")||u("FxiOS")||(v()?0:u("Opera"))||u("Silk"))};var z=v()?!1:u("Trident")||u("MSIE");y();x();w();Object.freeze({});var A=!z&&!w(),D=function(a){if(/-[a-z]/.test("ved"))return null;if(A&&a.dataset){if(y()&&!("ved"in a.dataset))return null;a=a.dataset.ved;return void 0===a?null:a}return a.getAttribute("data-"+"ved".replace(/([A-Z])/g,"-$1").toLowerCase())};var E=[],F=null;function G(a){a=a.target;var c=performance.now(),f=[],H=f.concat,d=E;if(!(d instanceof Array)){var m="undefined"!=typeof Symbol&&Symbol.iterator&&d[Symbol.iterator];if(m)d=m.call(d);else if("number"==typeof d.length)d={next:b(d)};else throw Error("a\`"+String(d));for(var B=[];!(m=d.next()).done;)B.push(m.value);d=B}E=H.call(f,d,[c]);if(a&&a instanceof HTMLElement)if(a===F){if(c=4<=E.length)c=5>(E[E.length-1]-E[E.length-4])/1E3;if(c){c=google.getEI(a);a.hasAttribute("data-ved")?f=a?D(a)||"":"":f=(f=
      //   a.closest("[data-ved]"))?D(f)||"":"";f=f||"";if(a.hasAttribute("jsname"))a=a.getAttribute("jsname");else{var C;a=null==(C=a.closest("[jsname]"))?void 0:C.getAttribute("jsname")}google.log("rcm","&ei="+c+"&ved="+f+"&jsname="+(a||""))}}else F=a,E=[c]}window.document.addEventListener("DOMContentLoaded",function(){document.body.addEventListener("click",G)});}).call(this);</script></body></html>`)
      // },

      validated: {information: [], errors: [], valid: true}
    };

    return new Promise((resolve, reject) => { resolve(mockjson); });
  }
}
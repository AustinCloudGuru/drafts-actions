/*
  Create an issue in JIRA
  Supports multiple Jira instances, projects, and issue types.
  Adapted from Padraic Renaghan's Action
  Reference: https://actions.getdrafts.com/a/1Xi
  Mark Honomichl 10/15/2020
*/

/*
This script uses front matter in the draft, currently in the following format:

---
uid: 20201014175424
title: <The Summary for Jira>
project: <Project Key>
issuetype: <Issue Type>
jira: <JIRA Instance>
app: <Application> 
---

 */

// Creates the constants from the draft
const myTitle = draft.processTemplate("[[line|3]]").replace("title: ", "");
const myProject = draft.processTemplate("[[line|4]]").replace("project: ", "");
const myIssueType = draft.processTemplate("[[line|5]]").replace("issuetype: ", "");
const myJira = draft.processTemplate("[[line|6]]").replace("jira: ", "");
const myApp = draft.processTemplate("[[line|7]]").replace("app: ", "");
const myBody = draft.processTemplate("[[line|9..]]");

// First run will prompt for host, user, password to JIRA server
var credential = Credential.createWithHostUsernamePassword(myJira, "JIRA credential");
credential.addTextField("host", "JIRA Domain");
credential.addTextField("username", "JIRA Username");
credential.addPasswordField("password", "JIRA Password");

// make sure we have credential info
credential.authorize();

// app array
var apps = {
    ghe: {epic: "CM-3449", tool_id: "19411"},
    jenkins: {epic: "CM-3502", tool_id: "19408"},
    vault: {epic: "CM-4755", tool_id: "21500"},
    sonarqube: {epic: "CM-3503", tool_id: "19414"},
    jfrog: {epic: "CM-3491", tool_id: "22002"},
    aws: {epic: "CM-3678", tool_id: "20337"},
    terraform: {epic: "CM-3425", tool_id: "19429"}, 
}



// build up common Jira issue properties
var fields = {
    "project": { "key": myProject },
    "issuetype": { "name": myIssueType },
    "summary": myTitle,
    "description": myBody
};

// Work Jira needs additional fields
if ( myJira == "fp" ) {
    fields["assignee"] = { "name": credential.getValue("username") };
    fields["customfield_16600"] = { "id": apps[myApp]['tool_id'] };
    fields["customfield_11300"] = apps[myApp]['epic']
    draft.setTemplateTag("project", "/task/m54czT8zI4Y");
}

if (myJira == "acg" ) {
    draft.setTemplateTag("project", "omnifocus:///task/m54czT8zI4Y");
}

// Create the API URL
var api = "https://" + credential.getValue("host")
    + "/rest/api/latest/issue";

// Create the Connection and send the request
var http = HTTP.create();
var response = http.request({
    "url": api,
    "username": credential.getValue("username"),
    "password": credential.getValue("password"),
    "method": "POST",
    "data": { fields },
    "encoding": "json",
    "headers": {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
});

// Get the Repsonse
console.log("JIRA API Response: " + response.statusCode + " -- " + response.responseText);

let NL = "\n";
let LOG_MARK = "-------";

// Log the response to the draft and display a message
if (response.success || response.statusCode == 201) {
    let r = JSON.parse(response.responseText);
    let t = "[" + r.key + "]" + " " + fields.summary;
    draft.content += "\n\n Created Issue: " + r ;
    app.displaySuccessMessage("Created " + t);
    
     draft.setTemplateTag("ofContent", t);
     draft.setTemplateTag("note", "https://" + credential.getValue("host") + "/browse/" + r.key);
} else {
    draft.content += NL + LOG_MARK + NL;
    context.fail("ERROR " + response.statusCode + " "
        + response.responseText);
    draft.content += "ERROR " + response.statusCode + NL
        + response.responseText + NL
        + "Request Fields: " + JSON.stringify(fields, null, 2) + NL;
}
draft.update();


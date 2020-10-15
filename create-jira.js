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
jira <Jira Instance Label>
---

 */

// Creates the constants from the draft
const myTitle = draft.processTemplate("[[line|3]]").replace("title: ", "");
const myProject = draft.processTemplate("[[line|4]]").replace("project: ", "");
const myIssueType = draft.processTemplate("[[line|5]]").replace("issuetype: ", "");
const myJira = draft.processTemplate("[[line|6]]").replace("jira: ", "");
const myBody = draft.processTemplate("[[line|8..]]");

// First run will prompt for host, user, password to JIRA server stored as <JIRA Instance Label>
var credential = Credential.createWithHostUsernamePassword(myJira, "JIRA credential");
credential.addTextField("host", "JIRA Domain");
credential.addTextField("username", "JIRA Username");
credential.addPasswordField("password", "JIRA Password");

// make sure we have credential info
credential.authorize();

// build up common Jira issue properties
var fields = {
    "project": { "key": myProject },
    "issuetype": { "name": myIssueType },
    "summary": myTitle,
    "description": myBody
};

// Work Jira needs additional fields
if ( myJira == "work" ) {
    fields["assignee"] = { "name": credential.getValue("username") };
    fields["reporter"] = { "name": credential.getValue("username") };
    fields["customfield_16600"] = { "id": "19429" };
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
    let t = r.key + " " + fields.summary;
    draft.content += "\n\n Created Issue: " + r ;
    app.displaySuccessMessage("Created " + t);
} else {
    draft.content += NL + LOG_MARK + NL;
    context.fail("ERROR " + response.statusCode + " "
        + response.responseText);
    draft.content += "ERROR " + response.statusCode + NL
        + response.responseText + NL
        + "Request Fields: " + JSON.stringify(fields, null, 2) + NL;
}
draft.update();


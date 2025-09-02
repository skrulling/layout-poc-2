# Layout Engine

## Context

The goal is to build a layout engine/builder POC in pure typescript.
We will make prototypes or pocs that can be tested on users, and we will use feedback to decided which look, feel and features to go for.

## Task

### Replace the third demo with one that uses highsoft dashboards.
The js code for this is in dash.js, we just need to include the it in the html on the third tab.
The html to include it normally looks like this 
'''
<script src="https://code.highcharts.com/highcharts.js"></script>
<script src="https://code.highcharts.com/modules/accessibility.js"></script>
<script src="https://code.highcharts.com/dashboards/dashboards.js"></script>
<script src="https://code.highcharts.com/dashboards/modules/layout.js"></script>

<div id="container"></div>
'''
Make it work for this project. It should be seamless, and we still want to display the tasks and so forth